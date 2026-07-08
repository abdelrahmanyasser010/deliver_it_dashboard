import { Activity, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useAuditLogs } from '../application/admin/useAdminData';
import { roleLabels, severityLabels, statusTone } from '../domain/admin/presentation';
import './AdminOperations.css';

export function AuditLogPage() {
  const logs = useAuditLogs();

  return (
    <div className="admin-page">
      <section className="glass-card">
        <div className="section-title-row">
          <div>
            <h3>سجل العمليات</h3>
            <p className="section-subtitle">أي تغيير مهم في الشحنات، المستخدمين، أو التسويات لازم يظهر هنا.</p>
          </div>
          <div className="toolbar-actions">
            <button className="outline-btn"><Activity size={16} /> كل الأحداث</button>
            <button className="outline-btn"><AlertTriangle size={16} /> حرجة فقط</button>
          </div>
        </div>

        <div className="audit-list">
          {logs.map((log) => (
            <div key={log.id} className="audit-item">
              <div>
                <p className="audit-action">{log.action}</p>
                <p className="audit-meta">
                  {log.actorName} - {roleLabels[log.actorRole]} - الهدف: {log.target}
                </p>
                <p className="audit-meta">IP: {log.ipAddress} - {log.createdAt}</p>
              </div>
              <div className="toolbar-actions">
                <span className={`tone-badge ${statusTone[log.severity]}`}>{severityLabels[log.severity]}</span>
                <button className="btn-icon sm" title="تحقق"><ShieldCheck size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
