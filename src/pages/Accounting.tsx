import { useMemo, useState } from 'react';
import { AlertTriangle, Banknote, CheckCircle2, Download, FileCheck2, Landmark, LockKeyhole, ReceiptText, Wallet, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAccountingData } from '../application/reports/useReportsData';
import type { LedgerEntry } from '../domain/reports/entities';
import { downloadCsv } from '../utils/exportCsv';
import { formatCurrency } from '../utils/helpers';
import './Reports.css';

export function AccountingPage() {
  const navigate = useNavigate();
  const accounting = useAccountingData();
  const [checklist, setChecklist] = useState(accounting.checklist);
  const [ledger, setLedger] = useState<LedgerEntry[]>(accounting.ledger);
  const [closeMessage, setCloseMessage] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [monthClosed, setMonthClosed] = useState(false);
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'pending' | 'posted'>('all');
  const allDone = checklist.every((item) => item.done);
  const pendingLedger = ledger.filter((entry) => entry.status === 'pending').length;
  const filteredLedger = ledger.filter((entry) => ledgerFilter === 'all' || entry.status === ledgerFilter);
  const ledgerTotals = useMemo(() => ({
    debit: filteredLedger.reduce((sum, entry) => sum + entry.debit, 0),
    credit: filteredLedger.reduce((sum, entry) => sum + entry.credit, 0),
  }), [filteredLedger]);

  const toggleItem = (id: string) => {
    setChecklist((items) => items.map((item) => (
      item.id === id ? { ...item, done: !item.done } : item
    )));
  };

  const requestCloseMonth = () => {
    if (monthClosed) {
      setCloseMessage('الشهر مقفل بالفعل.');
      return;
    }

    if (!allDone || pendingLedger > 0) {
      setCloseMessage('لا يمكن تقفيل الشهر قبل إكمال قائمة المراجعة وترحيل كل القيود.');
      return;
    }

    setConfirmClose(true);
  };

  const closeMonth = () => {
    setMonthClosed(true);
    setConfirmClose(false);
    setCloseMessage('تم تقفيل الشهر وترحيل القيود بنجاح.');
  };

  const exportLedger = () => {
    downloadCsv('قيود-الأستاذ-العام.csv', filteredLedger.map((entry) => ({
      القيد: entry.id,
      التاريخ: entry.date,
      الحساب: entry.account,
      الوصف: entry.description,
      مدين: entry.debit,
      دائن: entry.credit,
      الحالة: entry.status === 'posted' ? 'مرحل' : 'معلق',
    })));
    setCloseMessage('تم تجهيز ملف قيود الأستاذ العام للتصدير.');
  };

  const postPendingLedger = () => {
    const count = ledger.filter((entry) => entry.status === 'pending').length;
    setLedger((rows) => rows.map((entry) => ({ ...entry, status: 'posted' })));
    setChecklist((items) => items.map((item) => (
      item.id === 'CLS-5' ? { ...item, done: true } : item
    )));
    setCloseMessage(`تم ترحيل ${count.toLocaleString('ar-EG')} قيود معلقة.`);
  };

  const reviewCashVariance = () => {
    setChecklist((items) => items.map((item) => (
      item.id === 'CLS-2' ? { ...item, done: true } : item
    )));
    setCloseMessage(`تمت مراجعة فرق الكاش: ${formatCurrency(accounting.closeSummary.cashVariance)}.`);
  };

  return (
    <div className="reports-page">
      <header className="reports-hero glass-card">
        <div>
          <h2>المحاسبة وتقفيلة الشهر</h2>
          <p>تسويات التجار، توريد المناديب، إيراد الشحن، المصروفات، الميزانية، وقيود الشهر.</p>
        </div>
        <div className="toolbar-actions">
          <span className={`tone-badge ${monthClosed ? 'success' : allDone && pendingLedger === 0 ? 'success' : 'warning'}`}>
            {monthClosed ? 'الشهر مقفل' : allDone && pendingLedger === 0 ? 'جاهز للتقفيل' : 'ناقص مراجعة'}
          </span>
          <button className="outline-btn" onClick={() => navigate('/settlements')}><ReceiptText size={16} /> التسويات</button>
          <button className="outline-btn" onClick={exportLedger}><Download size={16} /> تصدير القيود</button>
          <button className="btn-primary" onClick={requestCloseMonth} disabled={monthClosed}><LockKeyhole size={16} /> تقفيل الشهر</button>
        </div>
      </header>

      {closeMessage && <div className="ops-feedback">{closeMessage}</div>}

      <div className="report-kpi-grid">
        <Kpi label="قيمة أوردرات البراندات" value={formatCurrency(accounting.closeSummary.grossOrderValue)} icon={<Banknote size={20} />} gradient="linear-gradient(135deg,#10B981,#059669)" />
        <Kpi label="تحصيل COD" value={formatCurrency(accounting.closeSummary.codCollected)} icon={<Wallet size={20} />} gradient="linear-gradient(135deg,#0EA5E9,#0284C7)" />
        <Kpi label="مستحقات التجار" value={formatCurrency(accounting.closeSummary.merchantPayouts)} icon={<Landmark size={20} />} gradient="linear-gradient(135deg,#F59E0B,#D97706)" />
        <Kpi label="صافي الشركة" value={formatCurrency(accounting.closeSummary.netCompanyRevenue)} icon={<FileCheck2 size={20} />} gradient="linear-gradient(135deg,#4F46E5,#7C3AED)" />
      </div>

      <div className="accounting-alert-grid">
        <button className="accounting-action-card glass-card" onClick={reviewCashVariance}>
          <AlertTriangle size={19} />
          <span>
            <strong>فرق الكاش</strong>
            <small>{formatCurrency(accounting.closeSummary.cashVariance)} يحتاج مراجعة</small>
          </span>
        </button>
        <button className="accounting-action-card glass-card" onClick={postPendingLedger} disabled={pendingLedger === 0}>
          <CheckCircle2 size={19} />
          <span>
            <strong>ترحيل القيود</strong>
            <small>{pendingLedger.toLocaleString('ar-EG')} قيود معلقة</small>
          </span>
        </button>
      </div>

      <div className="report-grid-2">
        <section className="glass-card">
          <div className="report-section-title">
            <h3>ميزانية الشهر: فعلي مقابل مستهدف</h3>
            <span className="report-muted">{accounting.closeSummary.month}</span>
          </div>
          <div className="budget-list">
            {accounting.budget.map((line) => {
              const diff = line.actual - line.budget;
              const ratio = Math.min(100, (line.actual / line.budget) * 100);

              return (
                <div key={line.label} className="budget-row">
                  <div className="budget-row-top">
                    <span>{line.label}</span>
                    <span>{formatCurrency(line.actual)} / {formatCurrency(line.budget)}</span>
                  </div>
                  <div className="progress-track">
                    <div className={`progress-fill ${diff > 0 ? 'over-budget' : ''}`} style={{ width: `${ratio}%` }} />
                  </div>
                  <p className={`budget-diff ${diff >= 0 ? 'positive' : 'negative'}`}>
                    الفرق: {formatCurrency(Math.abs(diff))} {diff >= 0 ? 'أعلى من المستهدف' : 'أقل من المستهدف'}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="glass-card">
          <div className="report-section-title">
            <h3>قائمة مراجعة التقفيل</h3>
            <span className={`tone-badge ${allDone ? 'success' : 'warning'}`}>{allDone ? 'مكتملة' : 'ناقصة'}</span>
          </div>
          <div className="budget-list">
            {checklist.map((item) => (
              <button key={item.id} className="outline-btn checklist-row" onClick={() => toggleItem(item.id)}>
                <span>{item.label}</span>
                <CheckCircle2 size={16} color={item.done ? '#34D399' : '#64748B'} />
              </button>
            ))}
          </div>
        </section>
      </div>

      <section className="glass-card">
        <div className="report-section-title">
          <div>
            <h3>قيود الأستاذ العام</h3>
            <span className="report-muted">إجمالي مدين: {formatCurrency(ledgerTotals.debit)} - إجمالي دائن: {formatCurrency(ledgerTotals.credit)}</span>
          </div>
          <div className="period-control">
            {[
              { id: 'all', label: 'الكل' },
              { id: 'pending', label: 'معلق' },
              { id: 'posted', label: 'مرحل' },
            ].map((item) => (
              <button key={item.id} className={ledgerFilter === item.id ? 'active' : ''} onClick={() => setLedgerFilter(item.id as typeof ledgerFilter)}>
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>القيد</th>
                <th>التاريخ</th>
                <th>الحساب</th>
                <th>الوصف</th>
                <th>مدين</th>
                <th>دائن</th>
                <th>الحالة</th>
                <th>إجراء</th>
              </tr>
            </thead>
            <tbody>
              {filteredLedger.map((entry) => (
                <tr key={entry.id} className="table-row">
                  <td className="tracking-num">{entry.id}</td>
                  <td>{entry.date}</td>
                  <td>{entry.account}</td>
                  <td>{entry.description}</td>
                  <td className="amount">{entry.debit ? formatCurrency(entry.debit) : '-'}</td>
                  <td>{entry.credit ? formatCurrency(entry.credit) : '-'}</td>
                  <td><span className={`tone-badge ${entry.status === 'posted' ? 'success' : 'warning'}`}>{entry.status === 'posted' ? 'مرحل' : 'معلق'}</span></td>
                  <td>
                    <button
                      className="btn-icon sm"
                      title="اعتماد القيد"
                      disabled={entry.status === 'posted'}
                      onClick={() => {
                        setLedger((rows) => rows.map((row) => row.id === entry.id ? { ...row, status: 'posted' } : row));
                        setCloseMessage(`تم ترحيل القيد ${entry.id}.`);
                      }}
                    >
                      <CheckCircle2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {confirmClose && (
        <div className="accounting-modal-overlay" onClick={() => setConfirmClose(false)}>
          <div className="accounting-modal glass-panel" onClick={(event) => event.stopPropagation()}>
            <div className="report-section-title">
              <div>
                <h3>تأكيد تقفيل الشهر</h3>
                <span className="report-muted">بعد التقفيل سيتم تعطيل التعديل على قيود الشهر الحالي.</span>
              </div>
              <button className="btn-icon sm" onClick={() => setConfirmClose(false)} title="إغلاق"><X size={14} /></button>
            </div>
            <div className="toolbar-actions dialog-actions">
              <button className="outline-btn" onClick={() => setConfirmClose(false)}>إلغاء</button>
              <button className="btn-primary" onClick={closeMonth}>تأكيد التقفيل</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, icon, gradient }: { label: string; value: string; icon: React.ReactNode; gradient: string }) {
  return (
    <div className="report-kpi glass-card">
      <div className="report-kpi-icon" style={{ background: gradient }}>{icon}</div>
      <div>
        <p className="report-kpi-label">{label}</p>
        <p className="report-kpi-value">{value}</p>
      </div>
    </div>
  );
}
