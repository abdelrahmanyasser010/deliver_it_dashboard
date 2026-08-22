import { Banknote, CheckCircle2, Download, Eye, FileWarning, FilterX, Search, Send, WalletCards } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Modal, SectionHeader, StatusBadge } from '../components/ui/Ui';
import { useDeliveryData } from '../context/DeliveryDataContext';
import { useWorkspace } from '../context/WorkspaceContext';
import type { MerchantSettlementStatus } from '../domain/finance/entities';
import { downloadXlsx } from '../utils/exportSpreadsheet';
import { formatCurrency } from '../utils/helpers';
import './AdminOperations.css';

const statusLabels: Record<MerchantSettlementStatus, string> = { draft: 'مسودة', underReview: 'تحت المراجعة', approved: 'معتمدة', paid: 'مدفوعة', reconciled: 'مطابقة', disputed: 'عليها اعتراض', cancelled: 'ملغاة' };
const statusTone = (status: MerchantSettlementStatus): 'success' | 'warning' | 'danger' | 'info' | 'neutral' => ['paid','reconciled'].includes(status) ? 'success' : status === 'approved' ? 'info' : ['disputed','cancelled'].includes(status) ? 'danger' : 'warning';

export function SettlementsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { state, execute } = useDeliveryData();
  const { showToast } = useWorkspace();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | MerchantSettlementStatus>('all');
  const detailsId = searchParams.get('settlement');
  const [paymentReference, setPaymentReference] = useState('BANK-TRANSFER-001');
  const [bulkApproveOpen, setBulkApproveOpen] = useState(false);
  const settlements = useMemo(() => state?.settlements ?? [], [state?.settlements]);
  const shipments = useMemo(() => state?.shipments ?? [], [state?.shipments]);
  const details = settlements.find((item) => item.id === detailsId) ?? null;
  const openDetails = (id: string | null) => { const next = new URLSearchParams(searchParams); if (id) next.set('settlement', id); else next.delete('settlement'); setSearchParams(next, { replace: true }); };
  const filtered = useMemo(() => settlements.filter((item) => (status === 'all' || item.status === status) && (!query || `${item.id} ${item.merchantName} ${item.paymentReference ?? ''}`.toLocaleLowerCase('ar-EG').includes(query.toLocaleLowerCase('ar-EG')))), [settlements, query, status]);
  const pending = settlements.filter((item) => ['draft','underReview','approved'].includes(item.status)).reduce((sum, item) => sum + item.netPayable, 0);
  const paid = settlements.filter((item) => ['paid','reconciled'].includes(item.status)).reduce((sum, item) => sum + item.netPayable, 0);
  const discrepancies = settlements.filter((item) => item.adjustments !== 0 || item.status === 'disputed').reduce((sum, item) => sum + Math.abs(item.adjustments), 0);
  const run = async (command: Parameters<typeof execute>[0]) => { const result = await execute(command); showToast(result.message, result.ok ? 'success' : 'danger'); return result; };
  const approveSelected = async () => {
    for (const id of selectedIds) await run({ type: 'settlement/approve', settlementId: id });
    setSelectedIds([]);
    setBulkApproveOpen(false);
  };
  const selectedSettlements = settlements.filter((item) => selectedIds.includes(item.id));
  const selectedTotal = selectedSettlements.reduce((sum, item) => sum + item.netPayable, 0);
  const exportRows = () => {
    downloadXlsx({
      filename: `merchant-settlements-${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: 'تسويات التجار',
      rows: filtered.map((item) => ({
        رقم_التسوية: item.id,
        التاجر: item.merchantName,
        من: new Date(item.periodStart),
        إلى: new Date(item.periodEnd),
        عدد_الشحنات: item.shipmentIds.length,
        إجمالي_COD: item.grossCollection,
        رسوم_الشحن: item.shippingFees,
        رسوم_المرتجع: item.returnFees,
        الخصومات: item.discounts,
        التعديلات: item.adjustments,
        صافي_المستحق: item.netPayable,
        الحالة: statusLabels[item.status],
        مرجع_الدفع: item.paymentReference ?? '',
      })),
    });
    showToast('تم تجهيز ملف Excel للتسويات المعروضة.');
  };

  return <div className="admin-page settlements-v2"><SectionHeader title="التسويات والتحصيلات" description="كل تسوية مرتبطة فعليًا بقائمة شحنات وبنود مالية وقيود دفع." actions={<button className="outline-btn" onClick={exportRows}><Download size={16}/> تصدير Excel</button>}/><div className="admin-summary-grid"><SummaryCard label="قيد المراجعة أو الدفع" value={formatCurrency(pending)} icon={<Banknote size={20}/>} gradient="linear-gradient(135deg,#F59E0B,#D97706)"/><SummaryCard label="تم دفعه" value={formatCurrency(paid)} icon={<CheckCircle2 size={20}/>} gradient="linear-gradient(135deg,#10B981,#059669)"/><SummaryCard label="فروقات" value={formatCurrency(discrepancies)} icon={<FileWarning size={20}/>} gradient="linear-gradient(135deg,#EF4444,#B91C1C)"/><SummaryCard label="عدد التسويات" value={settlements.length.toLocaleString('ar-EG')} icon={<WalletCards size={20}/>} gradient="linear-gradient(135deg,#0EA5E9,#4F46E5)"/></div><section className="glass-card"><div className="toolbar-filters settlement-toolbar"><div className="search-field-glass"><Search size={16}/><input className="input-glass" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="رقم التسوية أو التاجر أو المرجع"/></div><select className="input-glass" style={{flex:1}} value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="all">كل الحالات</option>{Object.entries(statusLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select><button className="outline-btn" onClick={() => { setQuery(''); setStatus('all'); }}><FilterX size={15}/> مسح</button><button className="btn-primary" disabled={!selectedIds.length} onClick={() => setBulkApproveOpen(true)}><CheckCircle2 size={16}/> مراجعة واعتماد المحدد</button></div><div className="table-wrapper"><table className="data-table"><thead><tr><th>تحديد</th><th>الرقم</th><th>التاجر</th><th>الفترة</th><th>الشحنات</th><th>التحصيل</th><th>الرسوم</th><th>الصافي</th><th>الحالة</th><th>إجراء</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td><input type="checkbox" disabled={!['draft','underReview'].includes(item.status)} checked={selectedIds.includes(item.id)} onChange={() => setSelectedIds((ids) => ids.includes(item.id) ? ids.filter((id) => id !== item.id) : [...ids,item.id])}/></td><td className="tracking-num">{item.id}</td><td>{item.merchantName}</td><td>{new Date(item.periodStart).toLocaleDateString('ar-EG')} — {new Date(item.periodEnd).toLocaleDateString('ar-EG')}</td><td>{item.shipmentIds.length.toLocaleString('ar-EG')}</td><td>{formatCurrency(item.grossCollection)}</td><td>{formatCurrency(item.shippingFees + item.returnFees + item.discounts)}</td><td className="amount">{formatCurrency(item.netPayable)}</td><td><StatusBadge label={statusLabels[item.status]} tone={statusTone(item.status)}/></td><td><button className="btn-icon sm" onClick={() => openDetails(item.id)} aria-label={`تفاصيل ${item.id}`}><Eye size={14}/></button></td></tr>)}</tbody></table></div></section>
  {bulkApproveOpen && <Modal title="مراجعة اعتماد تسويات التجار" description={`سيتم اعتماد ${selectedIds.length.toLocaleString('ar-EG')} تسوية بإجمالي ${formatCurrency(selectedTotal)}. الاعتماد لا يعني الدفع.`} onClose={() => setBulkApproveOpen(false)} footer={<><button className="outline-btn" onClick={() => setBulkApproveOpen(false)}>إلغاء</button><button className="btn-primary" disabled={!selectedIds.length} onClick={() => void approveSelected()}><CheckCircle2 size={15}/> تأكيد الاعتماد</button></>}><div className="settlement-detail-grid">{selectedSettlements.slice(0, 8).map((item) => <div key={item.id}><span>{item.id} · {item.merchantName}</span><strong>{formatCurrency(item.netPayable)}</strong></div>)}</div><p className="report-muted">يجب أن يعيد الـBackend احتساب الأهلية والإجماليات والصلاحيات وقت الاعتماد، ولا يعتمد على الأرقام المرسلة من الواجهة.</p></Modal>}
  {details && <Modal wide title={`التسوية ${details.id}`} description={`${details.merchantName} — ${details.shipmentIds.length.toLocaleString('ar-EG')} شحنة`} onClose={() => openDetails(null)} footer={<><button className="outline-btn" onClick={() => openDetails(null)}>إغلاق</button>{['draft','underReview'].includes(details.status) && <button className="btn-primary" onClick={async () => { const result = await run({ type: 'settlement/approve', settlementId: details.id }); if (result.ok) openDetails(null); }}><CheckCircle2 size={15}/> اعتماد</button>}{details.status === 'approved' && <button className="btn-primary" disabled={!paymentReference.trim()} onClick={async () => { const result = await run({ type: 'settlement/pay', settlementId: details.id, paymentReference: paymentReference.trim() }); if (result.ok) openDetails(null); }}><Send size={15}/> تسجيل الدفع</button>}</>}><div className="settlement-detail-grid"><div><span>إجمالي التحصيل</span><strong>{formatCurrency(details.grossCollection)}</strong></div><div><span>رسوم الشحن والمرتجع</span><strong>{formatCurrency(details.shippingFees + details.returnFees)}</strong></div><div><span>الخصومات والتعديلات</span><strong>{formatCurrency(details.discounts + details.adjustments)}</strong></div><div><span>صافي المستحق</span><strong>{formatCurrency(details.netPayable)}</strong></div></div>{details.status === 'approved' && <label className="form-field"><span>مرجع التحويل</span><input className="input-glass" value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)}/></label>}<div className="table-wrapper"><table className="data-table"><thead><tr><th>الشحنة</th><th>التحصيل</th><th>الشحن</th><th>مرتجع</th><th>خصم</th><th>الصافي</th></tr></thead><tbody>{details.lines.map((line) => <tr key={line.shipmentId}><td><button className="tracking-link" onClick={() => navigate(`/shipments?shipment=${line.shipmentId}`)}>{line.shipmentId}</button></td><td>{formatCurrency(line.grossCollection)}</td><td>{formatCurrency(line.shippingFee)}</td><td>{formatCurrency(line.returnFee)}</td><td>{formatCurrency(line.discount)}</td><td>{formatCurrency(line.netPayable)}</td></tr>)}</tbody></table></div><p className="report-muted">حالة الشحنات: {details.shipmentIds.filter((id) => shipments.some((shipment) => shipment.id === id && shipment.financialStatus === 'settled')).length.toLocaleString('ar-EG')} مسوّاة.</p></Modal>}</div>;
}
function SummaryCard({ label, value, icon, gradient }: { label: string; value: string; icon: React.ReactNode; gradient: string }) { return <div className="admin-summary-card glass-card"><div className="admin-summary-icon" style={{ background: gradient }}>{icon}</div><div><p className="admin-summary-label">{label}</p><p className="admin-summary-value">{value}</p></div></div>; }
