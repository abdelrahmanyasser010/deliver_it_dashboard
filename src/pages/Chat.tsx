import { useMemo, useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import './Chat.css';

interface ChatRoom {
  id: string;
  name: string;
  role: string;
  lastMessage: string;
  unread: number;
}

const rooms: ChatRoom[] = [
  { id: 'chat-1', name: 'متجر الأزياء', role: 'تاجر', lastMessage: 'محتاج أعرف سبب تأخير SHP-2003', unread: 2 },
  { id: 'chat-2', name: 'محمد علي', role: 'مندوب', lastMessage: 'تم تسليم 4 أوردرات وباقي 2', unread: 1 },
  { id: 'chat-3', name: 'هوم ديكور', role: 'تاجر', lastMessage: 'هل تم استلام باكدج اليوم؟', unread: 0 },
];

const messagesByRoom: Record<string, { text: string; outgoing?: boolean }[]> = {
  'chat-1': [
    { text: 'محتاج أعرف سبب تأخير SHP-2003' },
    { text: 'الشحنة مع المندوب ونراجع آخر تحديث قبل ظهوره عندك.', outgoing: true },
    { text: 'تمام، منتظر التحديث.' },
  ],
  'chat-2': [
    { text: 'تم تسليم 4 أوردرات وباقي 2' },
    { text: 'ارفع تحديث الحالة وسيتم اعتماده من العمليات.', outgoing: true },
  ],
  'chat-3': [
    { text: 'هل تم استلام باكدج اليوم؟' },
    { text: 'تم تكليف مندوب للاستلام، وسنؤكد بعد مراجعة البوليصات.', outgoing: true },
  ],
};

export function ChatPage() {
  const [activeRoomId, setActiveRoomId] = useState(rooms[0].id);
  const [draft, setDraft] = useState('');
  const activeRoom = rooms.find((room) => room.id === activeRoomId) ?? rooms[0];
  const messages = useMemo(() => messagesByRoom[activeRoom.id] ?? [], [activeRoom.id]);
  const unreadCount = rooms.reduce((sum, room) => sum + room.unread, 0);

  return (
    <div className="chat-page">
      <aside className="chat-list glass-card">
        <div className="chat-list-header">
          <h3>الشات</h3>
          <span className="tone-badge info">{unreadCount.toLocaleString('ar-EG')} جديد</span>
        </div>
        {rooms.map((room) => (
          <button
            key={room.id}
            className={`chat-room ${activeRoom.id === room.id ? 'active' : ''}`}
            onClick={() => setActiveRoomId(room.id)}
          >
            <span className="chat-avatar">{room.name.charAt(0)}</span>
            <span className="chat-room-meta">
              <span className="chat-room-name">{room.name}</span>
              <span className="chat-room-last">{room.role} - {room.lastMessage}</span>
            </span>
            <span className="chat-unread-slot">
              {room.unread > 0 && <span className="chat-unread">{room.unread.toLocaleString('ar-EG')}</span>}
            </span>
          </button>
        ))}
      </aside>

      <section className="chat-window glass-card">
        <div className="chat-window-header">
          <div>
            <h3>{activeRoom.name}</h3>
            <p className="chat-subtitle">{activeRoom.role}</p>
          </div>
          <MessageCircle size={20} color="var(--secondary)" />
        </div>

        <div className="chat-messages">
          {messages.map((message, index) => (
            <div key={`${activeRoom.id}-${index}`} className={`chat-message ${message.outgoing ? 'outgoing' : 'incoming'}`}>
              {message.text}
            </div>
          ))}
        </div>

        <div className="chat-input-row">
          <input
            className="input-glass"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="اكتب رد..."
          />
          <button className="btn-primary" onClick={() => setDraft('')}>
            <Send size={16} />
            إرسال
          </button>
        </div>
      </section>
    </div>
  );
}
