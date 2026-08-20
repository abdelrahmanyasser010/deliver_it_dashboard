import { useMemo, useState } from 'react';
import { AlertTriangle, Banknote, CheckCircle2, Download, Landmark, LockKeyhole, ReceiptText, Search, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Modal, StatusBadge } from '../components/ui/Ui';
import { useDeliveryData } from '../context/DeliveryDataContext';
import { useWorkspace } from '../context/WorkspaceContext';
import type { Shipment } from '../domain/logistics/entities';
import { downloadXlsx } from '../utils/exportSpreadsheet';
import { formatCurrency, formatDateTime } from '../utils/helpers';
import './Reports.css';

type AccountingTab = 'overview' | 'statements' | 'ledger' | 'close';
type PartyType = 'merchant' | 'driver';
interface StatementRow { id: string; date: string; partyType: PartyType; partyName: string; shipmentId: string; description: string; debit: number; credit: number; }
const tabs: Array<{ id: AccountingTab; label: string }> = [{ id: 'overview', label: 'الملخص' }, { id: 'statements', label: 'حسابات التجار والمناديب' }, { id: 'ledger', label: 'دفتر القيود' }, { id: 'close', label: 'تقفيل الفترة' }];
const fmt = (value: number) => value.toLocaleString('ar-EG');

function buildStatementRows(shipments: Shipment[]): StatementRow[] {
  return shipments.flatMap((shipment) => {
    const rows: StatementRow[] = [];
    if (['delivered', 'partiallyDelivered', 'returned'].includes(shipment.status)) rows.push({ id: `MER-${shipment.id}`, date: shipment.statusChangedAt, partyType: 'merchant', partyName: shipment.merchantName, shipmentId: shipment.id, description: shipment.status === 'returned' ? 'رسوم مرتجع ورسوم تشغيل' : 'صافي مستحق شحنة مسلمة', debit: shipment.status === 'returned' ? Math.round(shipment.deliveryFee * .6) : 0, credit: ['delivered', 'partiallyDelivered'].includes(shipment.status) ? Math.max(0, shipment.collectedCash - shipment.deliveryFee - shipment.discount) : 0 });
    if (shipment.driverId && shipment.collectedCash > 0) rows.push({ id: `DRV-${shipment.id}`, date: shipment.lastUpdatedAt, partyType: 'driver', partyName: shipment.driverName ?? shipment.driverId, shipmentId: shipment.id, description: 'عهدة تحصيل مطلوب توريدها', debit: shipment.collectedCash, credit: shipment.remittedCash });
    return rows;
  });
}

export function AccountingPage() {
  const navigate = useNavigate();
  const { state, isLoading, execute } = useDeliveryData();
  const { showToast } = useWorkspace();
  const [activeTab, setActiveTab] = useState<AccountingTab>('overview');
  const [partyType, setPartyType] = useState<'all' | PartyType>('all');
  const [partyName, setPartyName] = useState('all');
  const [search, setSearch] = useState('');
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'pending' | 'posted' | 'reversed'>('all');
  const [reconcileId, setReconcileId] = useState<string | null>(null);
  const [remittedCash, setRemittedCash] = useState('0');
  const [reconcileNote, setReconcileNote] = useState('توريد عهدة المندوب ومطابقة الشحنة');
  const [closePreviewOpen, setClosePreviewOpen] = useState(false);
  const [postPreviewOpen, setPostPreviewOpen] = useState(false);

  const shipments = useMemo(() => state?.shipments ?? [], [state?.shipments]);
  const statements = useMemo(() => buildStatementRows(shipments), [shipments]);
  const partyOptions = useMemo(() => [...new Set(statements.filter((row) => partyType === 'all' || row.partyType === partyType).map((row) => row.partyName))], [statements, partyType]);
  const filteredStatements = statements.filter((row) => (partyType === 'all' || row.partyType === partyType) && (partyName === 'all' || row.partyName === partyName) && (!search || `${row.id} ${row.shipmentId} ${row.partyName} ${row.description}`.toLocaleLowerCase('ar-EG').includes(search.toLocaleLowerCase('ar-EG'))));
  const ledger = (state?.ledgerEntries ?? []).filter((entry) => ledgerFilter === 'all' || entry.status === ledgerFilter);
  const settlements = state?.settlements ?? [];
  const totalCollected = shipments.reduce((sum, shipment) => sum + shipment.collectedCash, 0);
  const totalRemitted = shipments.reduce((sum, shipment) => sum + shipment.remittedCash, 0);
  const cashWithDrivers = Math.max(0, totalCollected - totalRemitted);
  const merchantPayables = shipments.filter((shipment) => ['remitted', 'inSettlement'].includes(shipment.financialStatus) && shipment.settlementStatus === 'unsettled').reduce((sum, shipment) => sum + Math.max(0, shipment.collectedCash - shipment.deliveryFee - shipment.discount), 0);
  const discrepancies = shipments.filter((shipment) => shipment.financialStatus === 'discrepancy');
  const pendingLedger = state?.ledgerEntries.filter((entry) => entry.status === 'pending').length ?? 0;
  const pendingUpdates = state?.driverUpdates.filter((update) => update.status === 'pendingAdminApproval').length ?? 0;
  const pendingReturns = shipments.filter((shipment) => shipment.taskStatus === 'needsReturnProcessing').length;
  const periodKey = new Date().toISOString().slice(0, 7);
  const isClosed = state?.closedPeriods.includes(periodKey) ?? false;
  const openSettlements = settlements.filter((item) => !['paid','reconciled','cancelled'].includes(item.status)).length;
  const canClose = pendingLedger === 0 && discrepancies.length === 0 && pendingUpdates === 0;
  const reconcileShipment = shipments.find((shipment) => shipment.id === reconcileId) ?? null;

  const run = async (command: Parameters<typeof execute>[0]) => { const result = await execute(command); showToast(result.message, result.ok ? 'success' : 'danger'); return result; };
  const openReconcile = (shipment: Shipment) => { setReconcileId(shipment.id); setRemittedCash(String(shipment.collectedCash)); setReconcileNote(`توريد ومطابقة الشحنة ${shipment.id}`); };
  const exportStatements = () => {
    downloadXlsx({
      filename: `account-statements-${periodKey}.xlsx`,
      sheetName: 'كشف الحسابات',
      rows: filteredStatements.map((row) => ({
        الحركة: row.id,
        التاريخ: new Date(row.date),
        النوع: row.partyType === 'merchant' ? 'تاجر' : 'مندوب',
        الحساب: row.partyName,
        الشحنة: row.shipmentId,
        البيان: row.description,
        عليه: row.debit,
        له: row.credit,
      })),
    });
    showToast('تم تجهيز كشف الحساب بصيغة Excel.');
  };
  const exportLedger = () => {
    downloadXlsx({
      filename: `general-ledger-${periodKey}.xlsx`,
      sheetName: 'سطور القيود',
      rows: ledger.map((entry) => ({
        القيد: entry.id,
        التاريخ: new Date(entry.date),
        الحساب: entry.account,
        البيان: entry.description,
        مدين: entry.debit,
        دائن: entry.credit,
        الحالة: entry.status === 'posted' ? 'مرحّل' : entry.status === 'pending' ? 'معلق' : 'معكوس',
        نوع_المصدر: entry.sourceType,
        المصدر: entry.sourceId,
      })),
    });
    showToast('تم تجهيز دفتر القيود بصيغة Excel.');
  };

  if (isLoading) return <div className="reports-page"><section className="glass-card">جاري تحميل البيانات المالية…</section></div>;
  return <div className="reports-page">
    <header className="reports-hero glass-card"><div><h2>المحاسبة والتحصيل</h2><p>الأرقام مشتقة مباشرة من الشحنات والتوريدات والتسويات في الـStore الموحد.</p></div><div className="toolbar-actions"><StatusBadge label={isClosed ? 'الفترة مغلقة' : canClose ? 'جاهزة للإغلاق' : 'توجد بنود معلقة'} tone={isClosed || canClose ? 'success' : 'warning'}/><button className="outline-btn" onClick={() => navigate('/settlements')}><ReceiptText size={15}/> التسويات</button></div></header>
    <div className="reports-tabs accounting-tabs glass-card">{tabs.map((tab) => <button key={tab.id} className={`reports-tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>)}</div>

    {activeTab === 'overview' && <><div className="report-kpi-grid"><FinanceCard label="إجمالي المحصل" value={formatCurrency(totalCollected)} icon={<Banknote/>}/><FinanceCard label="تم توريده" value={formatCurrency(totalRemitted)} icon={<Landmark/>}/><FinanceCard label="مع المناديب" value={formatCurrency(cashWithDrivers)} icon={<Wallet/>}/><FinanceCard label="مستحقات التجار" value={formatCurrency(merchantPayables)} icon={<ReceiptText/>}/></div><div className="accounting-alert-grid"><button className="accounting-action-card glass-card" onClick={() => { setPartyType('driver'); setActiveTab('statements'); }}><Wallet/><span><strong>عهد المناديب</strong><small>{formatCurrency(cashWithDrivers)} تحتاج متابعة حسب الشحنات</small></span></button><button className="accounting-action-card glass-card" onClick={() => navigate('/exceptions?category=financial')}><AlertTriangle/><span><strong>فروقات التحصيل</strong><small>{fmt(discrepancies.length)} شحنة تحتاج مطابقة</small></span></button><button className="accounting-action-card glass-card" onClick={() => navigate('/settlements')}><ReceiptText/><span><strong>تسويات مفتوحة</strong><small>{fmt(settlements.filter((item) => !['paid','reconciled','cancelled'].includes(item.status)).length)} تسوية</small></span></button><button className="accounting-action-card glass-card" onClick={() => setActiveTab('ledger')}><Landmark/><span><strong>قيود معلقة</strong><small>{fmt(pendingLedger)} قيد غير مرحّل</small></span></button></div></>}

    {activeTab === 'statements' && <section className="glass-card"><div className="statement-toolbar"><label><span>نوع الحساب</span><select className="input-glass" value={partyType} onChange={(event) => { setPartyType(event.target.value as typeof partyType); setPartyName('all'); }}><option value="all">الكل</option><option value="merchant">التجار</option><option value="driver">المناديب</option></select></label><label><span>الحساب</span><select className="input-glass" value={partyName} onChange={(event) => setPartyName(event.target.value)}><option value="all">كل الحسابات</option>{partyOptions.map((name) => <option key={name}>{name}</option>)}</select></label><label className="statement-search"><span>بحث</span><div className="search-field"><Search size={15}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="الشحنة أو الحساب أو البيان"/></div></label><div className="toolbar-actions"><button className="outline-btn" onClick={exportStatements}><Download size={15}/> تصدير Excel</button></div></div><div className="statement-summary"><FinanceCard label="عليه" value={formatCurrency(filteredStatements.reduce((sum, row) => sum + row.debit, 0))} icon={<Wallet/>}/><FinanceCard label="له" value={formatCurrency(filteredStatements.reduce((sum, row) => sum + row.credit, 0))} icon={<Banknote/>}/><FinanceCard label="صافي الرصيد" value={formatCurrency(filteredStatements.reduce((sum, row) => sum + row.debit - row.credit, 0))} icon={<ReceiptText/>}/></div><div className="table-wrapper"><table className="data-table"><thead><tr><th>التاريخ</th><th>الحساب</th><th>الشحنة</th><th>البيان</th><th>عليه</th><th>له</th><th>إجراء</th></tr></thead><tbody>{filteredStatements.map((row) => { const shipment = shipments.find((item) => item.id === row.shipmentId); return <tr key={row.id}><td>{formatDateTime(row.date)}</td><td>{row.partyName}<small className="muted-cell">{row.partyType === 'merchant' ? 'تاجر' : 'مندوب'}</small></td><td><button className="tracking-link" onClick={() => navigate(`/shipments?shipment=${row.shipmentId}`)}>{row.shipmentId}</button></td><td>{row.description}</td><td>{formatCurrency(row.debit)}</td><td>{formatCurrency(row.credit)}</td><td>{row.partyType === 'driver' && shipment && shipment.collectedCash > shipment.remittedCash && <button className="outline-btn" onClick={() => openReconcile(shipment)}>تسجيل توريد</button>}</td></tr>; })}</tbody></table></div></section>}

    {activeTab === 'ledger' && <section className="glass-card"><div className="report-section-title"><div><h3>سطور دفتر الأستاذ</h3><span className="report-muted">كل صف يمثل سطرًا ماليًا مرتبطًا بمصدره؛ الترحيل يتم بعد مراجعة البنود المعلقة.</span></div><div className="toolbar-actions"><select className="input-glass" value={ledgerFilter} onChange={(event) => setLedgerFilter(event.target.value as typeof ledgerFilter)}><option value="all">كل الحالات</option><option value="pending">معلق</option><option value="posted">مرحّل</option><option value="reversed">معكوس</option></select><button className="outline-btn" onClick={exportLedger}><Download size={15}/> تصدير Excel</button><button className="btn-primary" onClick={() => setPostPreviewOpen(true)} disabled={pendingLedger === 0}><CheckCircle2 size={15}/> مراجعة وترحيل المعلق</button></div></div><div className="table-wrapper"><table className="data-table"><thead><tr><th>القيد</th><th>التاريخ</th><th>الحساب</th><th>البيان</th><th>مدين</th><th>دائن</th><th>الحالة</th><th>المصدر</th></tr></thead><tbody>{ledger.map((entry) => <tr key={entry.id}><td>{entry.id}</td><td>{formatDateTime(entry.date)}</td><td>{entry.account}</td><td>{entry.description}</td><td>{formatCurrency(entry.debit)}</td><td>{formatCurrency(entry.credit)}</td><td><StatusBadge label={entry.status === 'posted' ? 'مرحّل' : entry.status === 'pending' ? 'معلق' : 'معكوس'} tone={entry.status === 'posted' ? 'success' : entry.status === 'pending' ? 'warning' : 'danger'}/></td><td><button className="tracking-link" onClick={() => entry.sourceType === 'settlement' ? navigate(`/settlements?settlement=${entry.sourceId}`) : navigate(`/shipments?shipment=${entry.sourceId}`)}>{entry.sourceId}</button></td></tr>)}</tbody></table></div></section>}

    {activeTab === 'close' && <section className="report-grid-2"><div className="glass-card"><div className="report-section-title"><h3>شروط إغلاق {periodKey}</h3></div><p className="report-muted">هذه الحالات مشتقة من البيانات ولا يمكن تعليمها يدويًا كمكتملة.</p><div className="funnel-list"><CheckItem label="لا توجد تحديثات مناديب معلقة ذات أثر تشغيلي" count={pendingUpdates}/><CheckItem label="تمت مطابقة فروقات التحصيل" count={discrepancies.length}/><CheckItem label="تم ترحيل سطور القيود المطلوبة" count={pendingLedger}/><CheckItem label="مرتجعات تحتاج متابعة مالية" count={pendingReturns} warningOnly/><CheckItem label="التزامات/تسويات مفتوحة مثبتة" count={openSettlements} warningOnly/></div></div><div className="glass-card"><LockKeyhole size={30}/><h3>إغلاق الفترة المحاسبية</h3><p className="report-muted">يمنع الإغلاق عند وجود فروقات مالية أو قيود أو تحديثات معلقة. التسويات المفتوحة قد تبقى التزامًا مثبتًا ولا تشترط الدفع قبل الإغلاق.</p><button className="btn-primary full-width" disabled={isClosed} onClick={() => setClosePreviewOpen(true)}>{isClosed ? 'الفترة مغلقة' : 'مراجعة وإغلاق الفترة'}</button></div></section>}

    {postPreviewOpen && <Modal title="مراجعة ترحيل السطور المعلقة" description={`سيتم ترحيل ${fmt(pendingLedger)} سطرًا ماليًا بعد التأكيد.`} onClose={() => setPostPreviewOpen(false)} footer={<><button className="outline-btn" onClick={() => setPostPreviewOpen(false)}>إلغاء</button><button className="btn-primary" disabled={pendingLedger === 0} onClick={async () => { const response = await run({ type: 'ledger/postAll' }); if (response.ok) setPostPreviewOpen(false); }}><CheckCircle2 size={15}/> تأكيد الترحيل</button></>}><div className="funnel-list"><CheckItem label="سطور معلقة" count={pendingLedger}/><p className="report-muted">في الـBackend الإنتاجي يجب التحقق من توازن كل Journal Entry قبل الترحيل، ولا تعدل القيود المرحلة مباشرة.</p></div></Modal>}

    {closePreviewOpen && <Modal title={`مراجعة إغلاق الفترة ${periodKey}`} description="الإغلاق يقفل الفترة أمام التعديل المباشر؛ أي تصحيح لاحق يتم كتسوية عكسية/تعديل في فترة مفتوحة." onClose={() => setClosePreviewOpen(false)} footer={<><button className="outline-btn" onClick={() => setClosePreviewOpen(false)}>إلغاء</button><button className="btn-primary" disabled={!canClose} onClick={async () => { const response = await run({ type: 'period/close', period: periodKey }); if (response.ok) setClosePreviewOpen(false); }}><LockKeyhole size={15}/> تأكيد إغلاق الفترة</button></>}><div className="funnel-list"><CheckItem label="تحديثات مناديب معلقة" count={pendingUpdates}/><CheckItem label="فروقات تحصيل غير محسومة" count={discrepancies.length}/><CheckItem label="سطور قيود غير مرحلة" count={pendingLedger}/><CheckItem label="مرتجعات تحتاج متابعة (تنبيه)" count={pendingReturns} warningOnly/><CheckItem label="تسويات/التزامات مفتوحة (تنبيه)" count={openSettlements} warningOnly/></div>{!canClose && <p className="management-feedback warning-feedback">لا يمكن إغلاق الفترة قبل إنهاء البنود الحمراء أعلاه.</p>}</Modal>}

    {reconcileShipment && <Modal title={`مطابقة ${reconcileShipment.id}`} description={`المحصل ${formatCurrency(reconcileShipment.collectedCash)} — المورد ${formatCurrency(reconcileShipment.remittedCash)}`} onClose={() => setReconcileId(null)} footer={<><button className="outline-btn" onClick={() => setReconcileId(null)}>إلغاء</button><button className="btn-primary" onClick={async () => { const response = await run({ type: 'finance/reconcileShipment', shipmentId: reconcileShipment.id, remittedCash: Number(remittedCash), note: reconcileNote }); if (response.ok) setReconcileId(null); }}>حفظ المطابقة</button></>}><label className="form-field"><span>المبلغ المورد</span><input className="input-glass" type="number" min="0" max={reconcileShipment.collectedCash} value={remittedCash} onChange={(event) => setRemittedCash(event.target.value)}/></label><label className="form-field"><span>البيان</span><textarea className="input-glass" value={reconcileNote} onChange={(event) => setReconcileNote(event.target.value)}/></label></Modal>}
  </div>;
}
function FinanceCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) { return <article className="report-kpi glass-card"><div className="report-kpi-icon" style={{ background: 'linear-gradient(135deg,#0EA5E9,#4F46E5)' }}>{icon}</div><div><p className="report-kpi-label">{label}</p><p className="report-kpi-value">{value}</p></div></article>; }
function CheckItem({ label, count, warningOnly = false }: { label: string; count: number; warningOnly?: boolean }) { const done = count === 0; return <div className="funnel-row checklist-row"><span>{label}</span><StatusBadge label={done ? 'مكتمل' : `${fmt(count)} معلقة`} tone={done ? 'success' : warningOnly ? 'warning' : 'danger'}/></div>; }
