import { useState } from 'react';
import { Banknote, CheckCircle2, Download, ReceiptText } from 'lucide-react';
import { useSettlements } from '../application/admin/useAdminData';
import type { SettlementRecord } from '../domain/admin/entities';
import { settlementStatusLabels, settlementTypeLabels, statusTone } from '../domain/admin/presentation';
import { downloadCsv } from '../utils/exportCsv';
import { formatCurrency } from '../utils/helpers';
import './AdminOperations.css';

export function SettlementsPage() {
  const seedSettlements = useSettlements();
  const [settlements, setSettlements] = useState<SettlementRecord[]>(seedSettlements);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const totalPending = settlements
    .filter((settlement) => settlement.status === 'pending')
    .reduce((sum, settlement) => sum + settlement.amount, 0);
  const totalPaid = settlements
    .filter((settlement) => settlement.status === 'paid')
    .reduce((sum, settlement) => sum + settlement.amount, 0);

  const toggleSelected = (settlementId: string) => {
    setSelectedIds((ids) => (
      ids.includes(settlementId) ? ids.filter((id) => id !== settlementId) : [...ids, settlementId]
    ));
  };

  const approveSelected = () => {
    setSettlements((rows) => rows.map((settlement) => (
      selectedIds.includes(settlement.id)
        ? { ...settlement, status: 'approved', approvedBy: 'مدير الحسابات' }
        : settlement
    )));
    setMessage(`تم اعتماد ${selectedIds.length} تسويات.`);
    setSelectedIds([]);
  };

  const exportSettlements = () => {
    downloadCsv('settlements.csv', settlements);
    setMessage('تم تجهيز ملف التسويات للتصدير.');
  };

  return (
    <div className="admin-page">
      <div className="admin-summary-grid">
        <SummaryCard label="تسويات معلقة" value={formatCurrency(totalPending)} icon={<Banknote size={20} />} gradient="linear-gradient(135deg,#F59E0B,#D97706)" />
        <SummaryCard label="مدفوع بالفعل" value={formatCurrency(totalPaid)} icon={<CheckCircle2 size={20} />} gradient="linear-gradient(135deg,#10B981,#059669)" />
        <SummaryCard label="عدد العمليات" value={`${settlements.length}`} icon={<ReceiptText size={20} />} gradient="linear-gradient(135deg,#0EA5E9,#0284C7)" />
        <SummaryCard label="جاهز للتصدير" value="CSV" icon={<Download size={20} />} gradient="linear-gradient(135deg,#8B5CF6,#6D28D9)" />
      </div>

      <section className="glass-card">
        <div className="section-title-row">
          <div>
            <h3>التسويات والمحافظ</h3>
            <p className="section-subtitle">تغطي Brand payout و Driver remittance من الـ ledger الموجود في التطبيق.</p>
          </div>
          <div className="toolbar-actions">
            <button className="outline-btn" onClick={exportSettlements}><Download size={16} /> تصدير CSV</button>
            <button className="btn-primary" onClick={approveSelected} disabled={selectedIds.length === 0}><CheckCircle2 size={16} /> اعتماد المحدد</button>
          </div>
        </div>

        {message && <div className="management-feedback">{message}</div>}

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>تحديد</th>
                <th>رقم العملية</th>
                <th>النوع</th>
                <th>صاحب الحساب</th>
                <th>المبلغ</th>
                <th>الطريقة</th>
                <th>الحالة</th>
                <th>الطلب</th>
                <th>اعتمد بواسطة</th>
              </tr>
            </thead>
            <tbody>
              {settlements.map((settlement) => (
                <tr key={settlement.id} className="table-row">
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(settlement.id)}
                      onChange={() => toggleSelected(settlement.id)}
                      disabled={settlement.status === 'paid'}
                    />
                  </td>
                  <td className="tracking-num">{settlement.id}</td>
                  <td>{settlementTypeLabels[settlement.type]}</td>
                  <td>
                    <strong>{settlement.ownerName}</strong>
                    <p className="muted-cell">{settlement.ownerId}</p>
                  </td>
                  <td className="amount">{formatCurrency(settlement.amount)}</td>
                  <td>{settlement.method}</td>
                  <td><span className={`tone-badge ${statusTone[settlement.status]}`}>{settlementStatusLabels[settlement.status]}</span></td>
                  <td className="date">{settlement.requestedAt}</td>
                  <td>{settlement.approvedBy ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ label, value, icon, gradient }: { label: string; value: string; icon: React.ReactNode; gradient: string }) {
  return (
    <div className="admin-summary-card glass-card">
      <div className="admin-summary-icon" style={{ background: gradient }}>{icon}</div>
      <div>
        <p className="admin-summary-label">{label}</p>
        <p className="admin-summary-value">{value}</p>
      </div>
    </div>
  );
}
