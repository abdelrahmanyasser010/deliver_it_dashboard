import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ClipboardCheck, Eye, XCircle } from 'lucide-react';
import { ErrorState, PageSkeleton } from '../components/AsyncState';
import { api } from '../infrastructure/api/client';
import { friendlyApiMessage } from '../infrastructure/api/errors';
import './AdminOperations.css';

type ApplicationStatus = 'submitted' | 'otp_verified' | 'under_review' | 'approved' | 'rejected';
type MerchantApplicationDto = {
  id: string; brand_name: string; contact_name: string; phone: string; email?: string | null;
  status: ApplicationStatus; submitted_at: string; review_note?: string | null; version: number;
  activity?: string | null; city?: string | null; address?: string | null; average_orders?: number;
};

const statusLabel = (status: ApplicationStatus) => ({ submitted:'مقدم', otp_verified:'تم التحقق', under_review:'تحت المراجعة', approved:'مقبول', rejected:'مرفوض' }[status]);
const statusTone = (status: ApplicationStatus) => status === 'approved' ? 'success' : status === 'rejected' ? 'danger' : 'warning';
const actionId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

export function ApplicationsPage() {
  const [applications, setApplications] = useState<MerchantApplicationDto[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<MerchantApplicationDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const result = await api.get<MerchantApplicationDto[]>('/api/v1/merchant-applications', { query: { page: 1, per_page: 100 } });
      setApplications(result.data ?? []);
    } catch (raw) { setError(friendlyApiMessage(raw)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const decideApplication = async (application: MerchantApplicationDto, decision: 'approve' | 'reject') => {
    if (busyId) return;
    setBusyId(application.id); setMessage(null);
    try {
      const clientActionId = actionId(`web-merchant-${decision}`);
      await api.post(`/api/v1/merchant-applications/${application.id}/${decision}`, {
        resource_version: application.version,
        reason_code: decision === 'reject' ? 'manual_review_rejected' : 'manual_review_approved',
        note: decision === 'reject' ? 'تم رفض الطلب بعد مراجعة بيانات الانضمام من لوحة الإدارة.' : 'تم اعتماد الطلب بعد مراجعة بيانات الانضمام من لوحة الإدارة.',
        client_action_id: clientActionId,
      }, { idempotencyKey: clientActionId, retries: 1 });
      setMessage(decision === 'approve' ? 'تم اعتماد طلب التاجر. يتولى الخادم إنشاء/تفعيل مسار حساب التاجر.' : 'تم رفض الطلب وتسجيل قرار المراجعة.');
      setSelectedApplication(null); await load();
    } catch (raw) { setMessage(friendlyApiMessage(raw)); }
    finally { setBusyId(null); }
  };

  if (loading && !applications.length) return <PageSkeleton rows={3}/>;
  if (error && !applications.length) return <ErrorState message={error} onRetry={() => void load()}/>;

  return <div className="admin-page"><section className="glass-card">
    <div className="section-title-row"><div><h3>طلبات التجار</h3><p className="section-subtitle">طلبات الانضمام وحالتها تأتي مباشرة من الخادم. قرارات القبول والرفض مسجلة بإصدار المورد لمنع تضارب المراجعات.</p></div><button className="outline-btn" onClick={() => setMessage('راجع النشاط والعنوان وبيانات التواصل ومتوسط الطلبات قبل اتخاذ القرار. يمنع الخادم اعتماد نسخة قديمة من الطلب إذا سبقتك مراجعة أخرى.')}><ClipboardCheck size={16}/> قواعد المراجعة</button></div>
    {message && <div className="management-feedback">{message}</div>}
    {error && <div className="management-feedback">{error}</div>}
    {applications.length === 0 ? <div className="management-feedback">لا توجد طلبات تجار حاليًا.</div> : applications.map((application) => <div key={application.id} className="request-card">
      <div><p className="request-title">{application.brand_name}</p><p className="request-meta">{application.activity || 'نشاط غير محدد'} - {application.city || 'مدينة غير محددة'}</p><p className="request-meta">{application.address || 'لا يوجد عنوان إضافي'}</p></div>
      <div><p className="request-meta">المسؤول: {application.contact_name}</p><p className="request-meta" dir="ltr">{application.phone}</p><p className="request-meta">متوسط الطلبات: {(application.average_orders ?? 0).toLocaleString('ar-EG')} طلب / شهر</p></div>
      <div className="toolbar-actions"><span className={`tone-badge ${statusTone(application.status)}`}>{statusLabel(application.status)}</span><button className="btn-icon sm" title="عرض الطلب" onClick={() => setSelectedApplication(application)}><Eye size={14}/></button>{!['approved','rejected'].includes(application.status) && <><button className="btn-icon sm" disabled={busyId===application.id} title="قبول" onClick={() => void decideApplication(application,'approve')}><CheckCircle2 size={14}/></button><button className="btn-icon sm" disabled={busyId===application.id} title="رفض" onClick={() => void decideApplication(application,'reject')}><XCircle size={14}/></button></>}</div>
    </div>)}
  </section>

  {selectedApplication && <div className="admin-dialog-overlay" onClick={() => { if(!busyId) setSelectedApplication(null); }}><div className="admin-dialog glass-panel" onClick={(event)=>event.stopPropagation()}><div className="section-title-row"><div><h3>{selectedApplication.brand_name}</h3><p className="section-subtitle">{selectedApplication.id}</p></div><button className="btn-icon sm" disabled={Boolean(busyId)} onClick={()=>setSelectedApplication(null)}><XCircle size={14}/></button></div><div className="admin-detail-list">
    <Detail label="الحالة" value={statusLabel(selectedApplication.status)}/><Detail label="النشاط" value={selectedApplication.activity || '—'}/><Detail label="المسؤول" value={selectedApplication.contact_name}/><Detail label="الهاتف" value={selectedApplication.phone}/><Detail label="الإيميل" value={selectedApplication.email || '—'}/><Detail label="المدينة" value={selectedApplication.city || '—'}/><Detail label="العنوان" value={selectedApplication.address || '—'}/><Detail label="متوسط الطلبات" value={`${(selectedApplication.average_orders ?? 0).toLocaleString('ar-EG')} طلب / شهر`}/><Detail label="تاريخ التقديم" value={new Date(selectedApplication.submitted_at).toLocaleString('ar-EG')}/>{selectedApplication.review_note && <Detail label="ملاحظة المراجعة" value={selectedApplication.review_note}/>} 
  </div><div className="toolbar-actions dialog-actions"><button className="outline-btn" disabled={Boolean(busyId)} onClick={()=>setSelectedApplication(null)}>إغلاق</button>{!['approved','rejected'].includes(selectedApplication.status) && <><button className="outline-btn danger-link" disabled={Boolean(busyId)} onClick={()=>void decideApplication(selectedApplication,'reject')}>رفض الطلب</button><button className="btn-primary" disabled={Boolean(busyId)} onClick={()=>void decideApplication(selectedApplication,'approve')}>{busyId?'جارٍ التنفيذ...':'قبول الطلب'}</button></>}</div></div></div>}
  </div>;
}

function Detail({ label, value }: { label: string; value: string }) { return <div className="admin-detail-row"><span>{label}</span><strong>{value}</strong></div>; }
