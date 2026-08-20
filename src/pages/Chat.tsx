import { CheckCircle2, MapPin, MessageCircle, PackageSearch, Paperclip, Pin, Search, Send, StickyNote, UserRoundCheck, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { EmptyState } from '../components/AsyncState';
import { Modal, StatusBadge } from '../components/ui/Ui';
import { useDeliveryData } from '../context/DeliveryDataContext';
import { useWorkspace } from '../context/WorkspaceContext';
import type { ChatAttachmentRecord } from '../application/delivery/types';
import { formatCurrency, statusConfig } from '../utils/helpers';
import './Chat.css';

type RoomCategory = 'merchant' | 'driver' | 'internal';
type RoomFilter = 'all' | RoomCategory | 'unread';
const filterLabels: Record<RoomFilter, string> = { all: 'الكل', merchant: 'التجار', driver: 'المناديب', internal: 'داخلي', unread: 'غير مقروء' };
const assignees = ['سارة — خدمة العملاء', 'نور — العمليات', 'سلمى — المحاسبة', 'أحمد — مدير التشغيل'];

export function ChatPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { state, execute } = useDeliveryData();
  const { showToast } = useWorkspace();
  const rooms = useMemo(() => state?.chatRooms ?? [], [state?.chatRooms]);
  const shipments = useMemo(() => state?.shipments ?? [], [state?.shipments]);
  const requestedRoomId = searchParams.get('room');
  const activeRoomId = requestedRoomId && rooms.some((room) => room.id === requestedRoomId) ? requestedRoomId : rooms[0]?.id ?? '';
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<RoomFilter>('all');
  const [noteMode, setNoteMode] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferTo, setTransferTo] = useState(assignees[0]);
  const [attachments, setAttachments] = useState<ChatAttachmentRecord[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeRoom = rooms.find((room) => room.id === activeRoomId) ?? rooms[0] ?? null;
  const linkedShipment = activeRoom ? shipments.find((item) => item.id === activeRoom.linkedShipmentId) ?? null : null;
  const unreadCount = rooms.reduce((sum, room) => sum + room.unread, 0);
  const filteredRooms = useMemo(() => {
    const value = query.trim().toLocaleLowerCase('ar-EG');
    return [...rooms]
      .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)))
      .filter((room) => (filter === 'all' || filter === 'unread' ? filter !== 'unread' || room.unread > 0 : room.category === filter)
        && (!value || `${room.name} ${room.role} ${room.lastMessage} ${room.linkedShipmentId ?? ''}`.toLocaleLowerCase('ar-EG').includes(value)));
  }, [rooms, query, filter]);

  const openRoom = async (id: string) => {
    setNoteMode(false);
    const next = new URLSearchParams(searchParams);
    next.set('room', id);
    setSearchParams(next, { replace: true });
    await execute({ type: 'chat/read', roomId: id, actor: 'موظف خدمة العملاء' });
  };

  const sendMessage = async () => {
    if (!activeRoom) return;
    const text = draft.trim();
    if (!text && attachments.length === 0) return;
    const result = await execute({ type: 'chat/send', roomId: activeRoom.id, text, note: noteMode, attachments, actor: 'موظف خدمة العملاء' });
    showToast(result.message, result.ok ? 'success' : 'danger');
    if (result.ok) { setDraft(''); setAttachments([]); setNoteMode(false); }
  };

  const addAttachments = (files: FileList | null) => {
    if (!files) return;
    const allowed = new Set(['image/jpeg','image/png','image/webp','application/pdf','text/csv','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
    const next: ChatAttachmentRecord[] = [];
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) { showToast(`الملف ${file.name} أكبر من 10MB.`, 'warning'); continue; }
      if (!allowed.has(file.type) && !/\.(jpg|jpeg|png|webp|pdf|csv|xls|xlsx|doc|docx)$/i.test(file.name)) { showToast(`نوع الملف ${file.name} غير مدعوم.`, 'warning'); continue; }
      next.push({ id: `ATT-${Date.now()}-${Math.random().toString(16).slice(2)}`, name: file.name, mimeType: file.type || 'application/octet-stream', size: file.size, url: URL.createObjectURL(file) });
    }
    setAttachments((current) => [...current, ...next].slice(0, 5));
    if (next.length) showToast(`تم تجهيز ${next.length.toLocaleString('ar-EG')} مرفق للإرسال.`, 'info');
  };

  const toggleClosed = async () => {
    if (!activeRoom) return;
    const result = await execute({ type: 'chat/toggle', roomId: activeRoom.id, actor: 'موظف خدمة العملاء' });
    showToast(result.message, result.ok ? 'info' : 'danger');
  };

  const transfer = async () => {
    if (!activeRoom) return;
    const result = await execute({ type: 'chat/transfer', roomId: activeRoom.id, assignedTo: transferTo, actor: 'مشرف خدمة العملاء' });
    showToast(result.message, result.ok ? 'success' : 'danger');
    if (result.ok) setTransferOpen(false);
  };

  if (!activeRoom) return <EmptyState title="لا توجد محادثات" description="ستظهر المحادثات المرتبطة بالشحنات والاستثناءات هنا." />;

  return <div className="chat-page chat-v2">
    <aside className="chat-list glass-card">
      <div className="chat-list-header"><div><h3>المحادثات</h3><span>{unreadCount.toLocaleString('ar-EG')} غير مقروءة</span></div><MessageCircle size={19} color="var(--secondary)"/></div>
      <div className="chat-search"><Search size={15}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="بحث في المحادثات..." aria-label="بحث في المحادثات"/>{query && <button onClick={() => setQuery('')} aria-label="مسح البحث"><X size={13}/></button>}</div>
      <div className="chat-filters">{(Object.keys(filterLabels) as RoomFilter[]).map((item) => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{filterLabels[item]}</button>)}</div>
      <div className="chat-room-list">{filteredRooms.length ? filteredRooms.map((room) => <button key={room.id} className={`chat-room ${activeRoom.id === room.id ? 'active' : ''}`} onClick={() => void openRoom(room.id)}><span className="chat-avatar">{room.name.charAt(0)}</span><span className="chat-room-meta"><span className="chat-room-name">{room.pinned && <Pin size={11}/>} {room.name}</span><span className="chat-room-last">{room.lastMessage}</span><small>{room.role}{room.linkedShipmentId ? ` · ${room.linkedShipmentId}` : ''}</small></span><span className="chat-unread-slot">{room.unread > 0 && <span className="chat-unread">{room.unread.toLocaleString('ar-EG')}</span>}</span></button>) : <EmptyState title="لا توجد نتائج" description="غيّر البحث أو الفلتر الحالي." />}</div>
    </aside>

    <section className="chat-window glass-card">
      <div className="chat-window-header"><div><h3>{activeRoom.name}</h3><p className="chat-subtitle">{activeRoom.role} · المسؤول: {activeRoom.assignedTo}</p></div><div className="chat-head-actions"><StatusBadge label={activeRoom.status === 'open' ? 'مفتوحة' : 'مغلقة'} tone={activeRoom.status === 'open' ? 'success' : 'neutral'}/><button className="outline-btn" onClick={() => void toggleClosed()}><CheckCircle2 size={14}/>{activeRoom.status === 'open' ? 'إغلاق' : 'إعادة فتح'}</button></div></div>
      <div className="chat-messages" aria-live="polite">{activeRoom.messages.map((message) => <div key={message.id} className={`chat-message ${message.type}`}><span>{message.type === 'note' && <StickyNote size={13}/>} {message.text || (message.attachments?.length ? 'مرفقات' : '')}</span>{message.attachments?.length ? <div className="message-attachments">{message.attachments.map((attachment) => attachment.mimeType.startsWith('image/') && attachment.url ? <a key={attachment.id} href={attachment.url} target="_blank" rel="noreferrer" className="image-attachment"><img src={attachment.url} alt={attachment.name}/><small>{attachment.name}</small></a> : <a key={attachment.id} href={attachment.url} download={attachment.name} className="file-attachment"><Paperclip size={14}/><span>{attachment.name}</span><small>{Math.max(1, Math.round(attachment.size / 1024)).toLocaleString('ar-EG')} KB</small></a>)}</div> : null}<small>{message.time}{message.type === 'note' ? ' · ملاحظة داخلية' : ' · تم الإرسال'}</small></div>)}</div>
      {attachments.length > 0 && <div className="pending-attachments">{attachments.map((attachment) => <div key={attachment.id}><Paperclip size={14}/><span>{attachment.name}</span><button onClick={() => setAttachments((items) => items.filter((item) => item.id !== attachment.id))} aria-label={`إزالة ${attachment.name}`}><X size={13}/></button></div>)}</div>}
      <input ref={fileInputRef} type="file" hidden multiple accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx,.csv" onChange={(event) => { addAttachments(event.target.files); event.currentTarget.value = ''; }} />
      <div className={`chat-compose ${noteMode ? 'note-mode' : ''}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); addAttachments(event.dataTransfer.files); }}><div className="chat-tools"><button aria-label="إرفاق صورة أو ملف" onClick={() => fileInputRef.current?.click()}><Paperclip size={16}/></button><button aria-label="إضافة الموقع" onClick={() => setDraft((value) => `${value}${value ? ' ' : ''}📍 رابط الموقع`)}><MapPin size={16}/></button><button className={noteMode ? 'active' : ''} aria-label="ملاحظة داخلية" onClick={() => setNoteMode((value) => !value)}><StickyNote size={16}/></button></div><input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) void sendMessage(); }} placeholder={noteMode ? 'اكتب ملاحظة داخلية لا يراها الطرف الآخر...' : 'اكتب ردًا أو اسحب ملفًا هنا...'} aria-label={noteMode ? 'ملاحظة داخلية' : 'رسالة'} disabled={activeRoom.status === 'closed'} /><button className="btn-primary" onClick={() => void sendMessage()} disabled={(!draft.trim() && attachments.length === 0) || activeRoom.status === 'closed'}><Send size={16}/> إرسال</button></div>
    </section>

    <aside className="chat-context glass-card"><h3>السياق المرتبط</h3>{linkedShipment ? <><div className="chat-shipment-card"><div><span>الشحنة</span><strong>{linkedShipment.id}</strong></div><StatusBadge label={statusConfig[linkedShipment.status].label} tone={['delivered', 'partiallyDelivered'].includes(linkedShipment.status) ? 'success' : linkedShipment.status === 'returned' ? 'danger' : 'info'}/><p>{linkedShipment.customerName}</p><p dir="ltr">{linkedShipment.customerPhone}</p><dl><div><dt>التاجر</dt><dd>{linkedShipment.merchantName}</dd></div><div><dt>المندوب</dt><dd>{linkedShipment.driverName ?? 'غير معين'}</dd></div><div><dt>التحصيل</dt><dd>{formatCurrency(linkedShipment.expectedCollection)}</dd></div><div><dt>المحاولات</dt><dd>{linkedShipment.attemptCount.toLocaleString('ar-EG')}</dd></div></dl><button className="btn-primary" onClick={() => navigate(`/shipments?shipment=${linkedShipment.id}`)}><PackageSearch size={15}/> فتح الشحنة</button></div><div className="chat-assignment"><UserRoundCheck size={17}/><section><strong>المسؤول الحالي</strong><small>{activeRoom.assignedTo}</small></section><button onClick={() => { setTransferTo(activeRoom.assignedTo); setTransferOpen(true); }}>تحويل</button></div></> : <EmptyState title="لا يوجد كيان مرتبط" description="يمكن للـBackend لاحقًا ربط المحادثة بشحنة أو تاجر أو تذكرة."/>}</aside>

    {transferOpen && <Modal title="تحويل المحادثة" description="غيّر الموظف المسؤول مع الاحتفاظ بسجل المحادثة." onClose={() => setTransferOpen(false)} footer={<><button className="outline-btn" onClick={() => setTransferOpen(false)}>إلغاء</button><button className="btn-primary" onClick={() => void transfer()}>تأكيد التحويل</button></>}><label className="form-field"><span>المسؤول الجديد</span><select className="input-glass" value={transferTo} onChange={(event) => setTransferTo(event.target.value)}>{assignees.map((assignee) => <option key={assignee}>{assignee}</option>)}</select></label></Modal>}
  </div>;
}
