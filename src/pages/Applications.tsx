import { useState } from 'react';
import { CheckCircle2, ClipboardCheck, Eye, XCircle } from 'lucide-react';
import { useMerchantApplications } from '../application/admin/useAdminData';
import type { MerchantApplication } from '../domain/admin/entities';
import { applicationStatusLabels, statusTone } from '../domain/admin/presentation';
import './AdminOperations.css';

export function ApplicationsPage() {
  const seedApplications = useMerchantApplications();
  const [applications, setApplications] = useState<MerchantApplication[]>(seedApplications);
  const [selectedApplication, setSelectedApplication] = useState<MerchantApplication | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const decideApplication = (applicationId: string, status: MerchantApplication['status']) => {
    setApplications((rows) => rows.map((application) => (
      application.id === applicationId ? { ...application, status } : application
    )));
    setMessage(status === 'approved' ? 'تم قبول طلب التاجر وتفعيل مسار إنشاء الحساب.' : 'تم رفض الطلب وإرساله لقائمة المراجعة.');
  };

  return (
    <div className="admin-page">
      <section className="glass-card">
        <div className="section-title-row">
          <div>
            <h3>طلبات التجار</h3>
            <p className="section-subtitle">مراجعة طلبات انضمام التجار: تحقق من البيانات، قبول أو رفض، ثم تفعيل حساب التاجر.</p>
          </div>
          <button className="outline-btn" onClick={() => setMessage('قواعد المراجعة: تحقق من النشاط، العنوان، رقم الهاتف، ومتوسط الطلبات قبل القبول.')}>
            <ClipboardCheck size={16} />
            قواعد المراجعة
          </button>
        </div>

        {message && <div className="management-feedback">{message}</div>}

        {applications.map((application) => (
          <div key={application.id} className="request-card">
            <div>
              <p className="request-title">{application.brandName}</p>
              <p className="request-meta">{application.activity} - {application.city}</p>
              <p className="request-meta">{application.address}</p>
            </div>
            <div>
              <p className="request-meta">المسؤول: {application.contactName}</p>
              <p className="request-meta" dir="ltr">{application.phone}</p>
              <p className="request-meta">متوسط الطلبات: {application.averageOrders} طلب / شهر</p>
            </div>
            <div className="toolbar-actions">
              <span className={`tone-badge ${statusTone[application.status]}`}>{applicationStatusLabels[application.status]}</span>
              <button className="btn-icon sm" title="عرض الطلب" aria-label="عرض الطلب" onClick={() => setSelectedApplication(application)}><Eye size={14} /></button>
              <button className="btn-icon sm" title="قبول" aria-label="قبول الطلب" onClick={() => decideApplication(application.id, 'approved')}><CheckCircle2 size={14} /></button>
              <button className="btn-icon sm" title="رفض" aria-label="رفض الطلب" onClick={() => decideApplication(application.id, 'rejected')}><XCircle size={14} /></button>
            </div>
          </div>
        ))}
      </section>

      {selectedApplication && (
        <div className="admin-dialog-overlay" onClick={() => setSelectedApplication(null)}>
          <div className="admin-dialog glass-panel" onClick={(event) => event.stopPropagation()}>
            <div className="section-title-row">
              <div>
                <h3>{selectedApplication.brandName}</h3>
                <p className="section-subtitle">{selectedApplication.id}</p>
              </div>
              <button className="btn-icon sm" onClick={() => setSelectedApplication(null)} title="إغلاق" aria-label="إغلاق"><XCircle size={14} /></button>
            </div>
            <div className="admin-detail-list">
              <Detail label="النشاط" value={selectedApplication.activity} />
              <Detail label="المسؤول" value={selectedApplication.contactName} />
              <Detail label="الهاتف" value={selectedApplication.phone} />
              <Detail label="الإيميل" value={selectedApplication.email} />
              <Detail label="المدينة" value={selectedApplication.city} />
              <Detail label="العنوان" value={selectedApplication.address} />
              <Detail label="متوسط الطلبات" value={`${selectedApplication.averageOrders} طلب / شهر`} />
            </div>
            <div className="toolbar-actions dialog-actions">
              <button className="outline-btn" onClick={() => setSelectedApplication(null)}>إغلاق</button>
              <button className="btn-primary" onClick={() => {
                decideApplication(selectedApplication.id, 'approved');
                setSelectedApplication(null);
              }}>قبول الطلب</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="admin-detail-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

