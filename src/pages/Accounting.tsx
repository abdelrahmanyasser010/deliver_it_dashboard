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
const tabs: Array<{ id: AccountingTab; label: string }> = [{ id: 'overview', label: 'الملخص' }, { id: 'statements', label: 'حسابات التجار والمناديب' }, { id: 'ledger', label: 'مراجعة الحسابات' }, { id: 'close', label: 'تقفيل الفترة' }];
const fmt = (value: number) => value.toLocaleString('ar-EG');

function buildStatementRows(shipments: Shipment[]): StatementRow[] {
  return shipments.flatMap((shipment) => {
    const rows: StatementRow[] = [];
    if (['delivered', 'partiallyDelivered', 'returned'].includes(shipment.status)) rows.push({ id: `MER-${shipment.id}`, date: shipment.statusChangedAt, partyType: 'merchant', partyName: shipment.merchantName, shipmentId: shipment.id, description: shipment.status === 'returned' ? 'رسوم مرتجع ورسوم تشغيل' : 'صافي مستحق شحنة مسلمة', debit: shipment.status === 'returned' ? Math.round(shipment.deliveryFee * .6) : 0, credit: ['delivered', 'partiallyDelivered'].includes(shipment.status) ? Math.max(0, shipment.collectedCash - shipment.deliveryFee - shipment.discount) : 0 });
    if (shipment.driverId && shipment.collectedCash > 0) rows.push({ id: `DRV-${shipment.id}`, date: shipment.lastUpdatedAt, partyType: 'driver', partyName: shipment.driverName ?? shipment.driverId, shipmentId: shipment.id, description: 'تحصيل مع المندوب مطلوب توريده', debit: shipment.collectedCash, credit: shipment.remittedCash });
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

  const [batchRemittanceDriver, setBatchRemittanceDriver] = useState<string | null>(null);

  const driversList = useMemo(() => {
    const fromShipments = shipments.map((s) => s.driverName).filter(Boolean) as string[];
    const fromState = (state?.drivers ?? []).map((d) => d.name);
    return [...new Set([...fromShipments, ...fromState])];
  }, [shipments, state?.drivers]);

  const handleBatchRemit = async (items: Array<{ id: string; cash: number }>, note: string) => {
    for (const item of items) {
      await run({ type: 'finance/reconcileShipment', shipmentId: item.id, remittedCash: item.cash, note });
    }
    showToast(`تم توريد ومطابقة ${items.length} شحنة وتقفيل تحصيلها بنجاح.`);
    setBatchRemittanceDriver(null);
  };

  const run = async (command: Parameters<typeof execute>[0]) => { const result = await execute(command); showToast(result.message, result.ok ? 'success' : 'danger'); return result; };
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
      filename: `accounting-review-${periodKey}.xlsx`,
      sheetName: 'مراجعة الحسابات',
      rows: ledger.map((entry) => ({
        الحركة: entry.id,
        التاريخ: new Date(entry.date),
        الحساب: entry.account,
        البيان: entry.description,
        عليه: entry.debit,
        له: entry.credit,
        الحالة: entry.status === 'posted' ? 'معتمد' : entry.status === 'pending' ? 'معلق' : 'ملغي',
        نوع_المصدر: entry.sourceType,
        المصدر: entry.sourceId,
      })),
    });
    showToast('تم تجهيز ملف مراجعة الحسابات بصيغة Excel.');
  };

  if (isLoading) return <div className="reports-page"><section className="glass-card">جاري تحميل البيانات المالية…</section></div>;
  return <div className="reports-page">
    <header className="reports-hero glass-card">
      <div>
        <h2>المحاسبة والتحصيل</h2>
        <p>تابع تحصيل المناديب، كشوف حسابات التجار، التسويات، وتقفيل الفترة من مكان واحد.</p>
      </div>
      <div className="toolbar-actions">
        <button className="btn-primary" onClick={() => setBatchRemittanceDriver(driversList[0] || '')}>
          <Wallet size={15}/> استلام تحصيل مندوب
        </button>
        <button className="outline-btn" onClick={() => navigate('/settlements')}><ReceiptText size={15}/> تسويات التجار</button>
      </div>
    </header>
    <div className="reports-tabs accounting-tabs glass-card">{tabs.map((tab) => <button key={tab.id} className={`reports-tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>)}</div>

    {activeTab === 'overview' && <><div className="report-kpi-grid"><FinanceCard label="إجمالي المحصل" value={formatCurrency(totalCollected)} icon={<Banknote/>}/><FinanceCard label="تم توريده" value={formatCurrency(totalRemitted)} icon={<Landmark/>}/><FinanceCard label="تحصيل لم يورد" value={formatCurrency(cashWithDrivers)} icon={<Wallet/>}/><FinanceCard label="مستحقات التجار" value={formatCurrency(merchantPayables)} icon={<ReceiptText/>}/></div><div className="accounting-alert-grid"><button className="accounting-action-card glass-card" onClick={() => setBatchRemittanceDriver(driversList[0] || '')}><Wallet/><span><strong>استلام تحصيل مندوب</strong><small>{formatCurrency(cashWithDrivers)} جاهزة للتوريد والتقفيل الآن</small></span></button><button className="accounting-action-card glass-card" onClick={() => navigate('/exceptions?category=financial')}><AlertTriangle/><span><strong>فروقات التحصيل</strong><small>{fmt(discrepancies.length)} شحنة تحتاج مطابقة</small></span></button><button className="accounting-action-card glass-card" onClick={() => navigate('/settlements')}><ReceiptText/><span><strong>تسويات مفتوحة</strong><small>{fmt(settlements.filter((item) => !['paid','reconciled','cancelled'].includes(item.status)).length)} تسوية</small></span></button><button className="accounting-action-card glass-card" onClick={() => setActiveTab('ledger')}><Landmark/><span><strong>حركات حسابات معلقة</strong><small>{fmt(pendingLedger)} حركة تحتاج اعتماد</small></span></button></div></>}

    {activeTab === 'statements' && <section className="glass-card"><div className="statement-toolbar"><label><span>نوع الحساب</span><select className="input-glass" value={partyType} onChange={(event) => { setPartyType(event.target.value as typeof partyType); setPartyName('all'); }}><option value="all">الكل</option><option value="merchant">التجار</option><option value="driver">المناديب</option></select></label><label><span>الحساب</span><select className="input-glass" value={partyName} onChange={(event) => setPartyName(event.target.value)}><option value="all">كل الحسابات</option>{partyOptions.map((name) => <option key={name}>{name}</option>)}</select></label><label className="statement-search"><span>بحث</span><div className="search-field"><Search size={15}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="الشحنة أو الحساب أو البيان"/></div></label><div className="toolbar-actions">{partyType === 'driver' && partyName !== 'all' && <button className="btn-primary" onClick={() => setBatchRemittanceDriver(partyName)}><Wallet size={15}/> تقفيل تحصيل {partyName}</button>}<button className="outline-btn" onClick={exportStatements}><Download size={15}/> تحميل كشف الحساب</button></div></div><div className="statement-summary"><FinanceCard label="عليه" value={formatCurrency(filteredStatements.reduce((sum, row) => sum + row.debit, 0))} icon={<Wallet/>}/><FinanceCard label="له" value={formatCurrency(filteredStatements.reduce((sum, row) => sum + row.credit, 0))} icon={<Banknote/>}/><FinanceCard label="صافي الرصيد" value={formatCurrency(filteredStatements.reduce((sum, row) => sum + row.debit - row.credit, 0))} icon={<ReceiptText/>}/></div><div className="table-wrapper"><table className="data-table"><thead><tr><th>التاريخ</th><th>الحساب</th><th>الشحنة</th><th>البيان</th><th>عليه</th><th>له</th><th>إجراء</th></tr></thead><tbody>{filteredStatements.map((row) => { const shipment = shipments.find((item) => item.id === row.shipmentId); return <tr key={row.id}><td>{formatDateTime(row.date)}</td><td><div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}><strong style={{ color: '#F8FAFC', fontSize: '0.86rem' }}>{row.partyName}</strong><span style={{ fontSize: '0.7rem', color: row.partyType === 'merchant' ? '#38BDF8' : '#818CF8' }}>{row.partyType === 'merchant' ? 'تاجر' : 'مندوب'}</span></div></td><td><button className="tracking-link" onClick={() => navigate(`/shipments?shipment=${row.shipmentId}`)}>{row.shipmentId}</button></td><td>{row.description}</td><td>{formatCurrency(row.debit)}</td><td>{formatCurrency(row.credit)}</td><td>{row.partyType === 'driver' && shipment && shipment.collectedCash > shipment.remittedCash && <button className="outline-btn" onClick={() => setBatchRemittanceDriver(row.partyName)}>استلام التوريد</button>}</td></tr>; })}</tbody></table></div></section>}

    {activeTab === 'ledger' && <section className="glass-card"><div className="report-section-title"><div><h3>مراجعة حركات الحسابات</h3><span className="report-muted">كل صف حركة مالية مرتبطة بشحنة أو تسوية. اعتمد الحركات المعلقة بعد المراجعة.</span></div><div className="toolbar-actions"><select className="input-glass" value={ledgerFilter} onChange={(event) => setLedgerFilter(event.target.value as typeof ledgerFilter)}><option value="all">كل الحالات</option><option value="pending">معلق</option><option value="posted">معتمد</option><option value="reversed">ملغي</option></select><button className="outline-btn" onClick={exportLedger}><Download size={15}/> تحميل ملف المراجعة</button><button className="btn-primary" onClick={() => setPostPreviewOpen(true)} disabled={pendingLedger === 0}><CheckCircle2 size={15}/> اعتماد الحركات المعلقة</button></div></div><div className="table-wrapper"><table className="data-table"><thead><tr><th>الحركة</th><th>التاريخ</th><th>الحساب</th><th>البيان</th><th>عليه</th><th>له</th><th>الحالة</th><th>المصدر</th></tr></thead><tbody>{ledger.map((entry) => <tr key={entry.id}><td>{entry.id}</td><td>{formatDateTime(entry.date)}</td><td>{entry.account}</td><td>{entry.description}</td><td>{formatCurrency(entry.debit)}</td><td>{formatCurrency(entry.credit)}</td><td><StatusBadge label={entry.status === 'posted' ? 'معتمد' : entry.status === 'pending' ? 'معلق' : 'ملغي'} tone={entry.status === 'posted' ? 'success' : entry.status === 'pending' ? 'warning' : 'danger'}/></td><td><button className="tracking-link" onClick={() => entry.sourceType === 'settlement' ? navigate(`/settlements?settlement=${entry.sourceId}`) : navigate(`/shipments?shipment=${entry.sourceId}`)}>{entry.sourceId}</button></td></tr>)}</tbody></table></div></section>}

    {activeTab === 'close' && <section className="report-grid-2"><div className="glass-card"><div className="report-section-title"><h3>شروط إغلاق {periodKey}</h3></div><p className="report-muted">هذه الحالات مشتقة من البيانات ولا يمكن تعليمها يدويًا كمكتملة.</p><div className="funnel-list"><CheckItem label="لا توجد تحديثات مناديب معلقة ذات أثر تشغيلي" count={pendingUpdates}/><CheckItem label="تمت مطابقة فروقات التحصيل" count={discrepancies.length}/><CheckItem label="تم اعتماد حركات الحسابات المطلوبة" count={pendingLedger}/><CheckItem label="مرتجعات تحتاج متابعة مالية" count={pendingReturns} warningOnly/><CheckItem label="التزامات/تسويات مفتوحة مثبتة" count={openSettlements} warningOnly/></div></div><div className="glass-card"><LockKeyhole size={30}/><h3>تقفيل الفترة</h3><p className="report-muted">يمنع التقفيل عند وجود فروقات مالية أو حركات حسابات أو تحديثات معلقة. التسويات المفتوحة قد تبقى التزامًا مثبتًا ولا تشترط الدفع قبل الإغلاق.</p><button className="btn-primary full-width" disabled={isClosed} onClick={() => setClosePreviewOpen(true)}>{isClosed ? 'الفترة مغلقة' : 'مراجعة وتقفيل الفترة'}</button></div></section>}

    {postPreviewOpen && <Modal title="مراجعة اعتماد الحركات المعلقة" description={`سيتم اعتماد ${fmt(pendingLedger)} حركة مالية بعد التأكيد.`} onClose={() => setPostPreviewOpen(false)} footer={<><button className="outline-btn" onClick={() => setPostPreviewOpen(false)}>إلغاء</button><button className="btn-primary" disabled={pendingLedger === 0} onClick={async () => { const response = await run({ type: 'ledger/postAll' }); if (response.ok) setPostPreviewOpen(false); }}><CheckCircle2 size={15}/> تأكيد الاعتماد</button></>}><div className="funnel-list"><CheckItem label="حركات معلقة" count={pendingLedger}/><p className="report-muted">في النسخة الإنتاجية يجب التأكد من صحة كل حركة قبل اعتمادها، وأي تعديل لاحق يتم بحركة تصحيح منفصلة.</p></div></Modal>}

    {closePreviewOpen && <Modal title={`مراجعة تقفيل الفترة ${periodKey}`} description="تقفيل الفترة يمنع التعديل المباشر؛ أي تصحيح لاحق يتم كتسوية أو حركة تصحيح في فترة مفتوحة." onClose={() => setClosePreviewOpen(false)} footer={<><button className="outline-btn" onClick={() => setClosePreviewOpen(false)}>إلغاء</button><button className="btn-primary" disabled={!canClose} onClick={async () => { const response = await run({ type: 'period/close', period: periodKey }); if (response.ok) setClosePreviewOpen(false); }}><LockKeyhole size={15}/> تأكيد تقفيل الفترة</button></>}><div className="funnel-list"><CheckItem label="تحديثات مناديب معلقة" count={pendingUpdates}/><CheckItem label="فروقات تحصيل غير محسومة" count={discrepancies.length}/><CheckItem label="حركات حسابات غير معتمدة" count={pendingLedger}/><CheckItem label="مرتجعات تحتاج متابعة (تنبيه)" count={pendingReturns} warningOnly/><CheckItem label="تسويات/التزامات مفتوحة (تنبيه)" count={openSettlements} warningOnly/></div>{!canClose && <p className="management-feedback warning-feedback">لا يمكن تقفيل الفترة قبل إنهاء البنود الحمراء أعلاه.</p>}</Modal>}


    {batchRemittanceDriver !== null && (
      <DriverRemittanceDialog
        driverName={batchRemittanceDriver}
        drivers={driversList}
        shipments={shipments}
        onClose={() => setBatchRemittanceDriver(null)}
        onSubmit={handleBatchRemit}
      />
    )}
  </div>;
}

function DriverRemittanceDialog({
  driverName,
  drivers,
  shipments,
  onClose,
  onSubmit,
}: {
  driverName: string;
  drivers: string[];
  shipments: Shipment[];
  onClose: () => void;
  onSubmit: (shipmentsToRemit: Array<{ id: string; cash: number }>, note: string) => Promise<void>;
}) {
  const [selectedDriver, setSelectedDriver] = useState(driverName || drivers[0] || '');
  const unremittedShipments = useMemo(() => {
    return shipments.filter(
      (s) =>
        (s.driverName === selectedDriver || s.driverId === selectedDriver) &&
        s.collectedCash > s.remittedCash &&
        ['delivered', 'partiallyDelivered', 'inTransit', 'receivedAtOffice'].includes(s.status)
    );
  }, [shipments, selectedDriver]);

  const [selectedIds, setSelectedIds] = useState<string[]>(() => unremittedShipments.map((s) => s.id));
  const [note, setNote] = useState('استلام ومطابقة تحصيل المندوب وتقفيل حسابه');
  const [submitting, setSubmitting] = useState(false);

  const toggle = (id: string) =>
    setSelectedIds((items) => (items.includes(id) ? items.filter((x) => x !== id) : [...items, id]));
  const selectAll = () => setSelectedIds(unremittedShipments.map((s) => s.id));
  const deselectAll = () => setSelectedIds([]);

  const selectedRows = unremittedShipments.filter((s) => selectedIds.includes(s.id));
  const totalDue = selectedRows.reduce((sum, s) => sum + (s.collectedCash - s.remittedCash), 0);
  const totalAllUnremitted = unremittedShipments.reduce((sum, s) => sum + (s.collectedCash - s.remittedCash), 0);

  const handleConfirm = async () => {
    if (!selectedRows.length) return;
    setSubmitting(true);
    try {
      await onSubmit(
        selectedRows.map((s) => ({ id: s.id, cash: s.collectedCash })),
        note
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      wide
      title="استلام ومطابقة تحصيل المندوب"
      description="تصفية ومطابقة تحصيل الشحنات المسلمة مع المندوب في أي وقت (شحنة واحدة، مجموعة شحنات، أو كل الشحنات دفعة واحدة)."
      onClose={onClose}
      footer={<>
        <button className="outline-btn" onClick={onClose} disabled={submitting}>إلغاء</button>
        <button className="btn-primary" disabled={!selectedIds.length || submitting} onClick={handleConfirm}>
          <CheckCircle2 size={15}/> {submitting ? 'جارٍ الحفظ…' : `تأكيد استلام التوريد (${selectedIds.length} شحنة — ${formatCurrency(totalDue)})`}
        </button>
      </>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) 1fr', gap: '0.8rem', alignItems: 'flex-end' }}>
          <label className="form-field">
            <span>اختر المندوب</span>
            <select
              className="input-glass"
              value={selectedDriver}
              onChange={(e) => {
                setSelectedDriver(e.target.value);
                const nextUnremitted = shipments.filter(
                  (s) =>
                    (s.driverName === e.target.value || s.driverId === e.target.value) &&
                    s.collectedCash > s.remittedCash &&
                    ['delivered', 'partiallyDelivered', 'inTransit', 'receivedAtOffice'].includes(s.status)
                );
                setSelectedIds(nextUnremitted.map((s) => s.id));
              }}
            >
              {drivers.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>البيان / إيصال الخزينة</span>
            <input
              className="input-glass"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="مثال: توريد نقدي لخزينة الفرع"
            />
          </label>
        </div>

        <div className="report-kpi-grid">
          <div className="report-kpi glass-card">
            <div>
              <p className="report-kpi-label">شحنات معلقة للتحصيل</p>
              <p className="report-kpi-value">{unremittedShipments.length.toLocaleString('ar-EG')}</p>
            </div>
          </div>
          <div className="report-kpi glass-card" style={{ borderColor: 'rgba(14,165,233,0.4)' }}>
            <div>
              <p className="report-kpi-label">شحنات محددة للتوريد الآن</p>
              <p className="report-kpi-value" style={{ color: '#38BDF8' }}>{selectedIds.length.toLocaleString('ar-EG')}</p>
            </div>
          </div>
          <div className="report-kpi glass-card">
            <div>
              <p className="report-kpi-label">إجمالي التحصيل المتبقي</p>
              <p className="report-kpi-value">{formatCurrency(totalAllUnremitted)}</p>
            </div>
          </div>
          <div className="report-kpi glass-card" style={{ borderColor: 'rgba(16,185,129,0.4)' }}>
            <div>
              <p className="report-kpi-label">المبلغ المستلم للتوريد</p>
              <p className="report-kpi-value" style={{ color: '#34D399' }}>{formatCurrency(totalDue)}</p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.2rem' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            حدد الشحنات التي سلّم المندوب أموالها فعلياً للخزينة:
          </span>
          <button
            type="button"
            className="outline-btn"
            style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
            onClick={selectedIds.length === unremittedShipments.length ? deselectAll : selectAll}
          >
            {selectedIds.length === unremittedShipments.length ? 'إلغاء تحديد الكل' : 'تحديد كل الشحنات'}
          </button>
        </div>

        <div className="table-wrapper" style={{ maxHeight: '280px', overflowY: 'auto' }}>
          <table className="data-table compact-table">
            <thead>
              <tr>
                <th style={{ width: '36px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.length === unremittedShipments.length && unremittedShipments.length > 0}
                    onChange={() => selectedIds.length === unremittedShipments.length ? deselectAll() : selectAll()}
                  />
                </th>
                <th>رقم الشحنة</th>
                <th>المستلم</th>
                <th>التاجر</th>
                <th>المحافظة</th>
                <th>المحصل</th>
                <th>المتبقي للتوريد</th>
              </tr>
            </thead>
            <tbody>
              {unremittedShipments.length ? unremittedShipments.map((s) => {
                const isChecked = selectedIds.includes(s.id);
                const due = s.collectedCash - s.remittedCash;
                return (
                  <tr
                    key={s.id}
                    onClick={() => toggle(s.id)}
                    style={{ cursor: 'pointer', background: isChecked ? 'rgba(14, 165, 233, 0.08)' : undefined }}
                  >
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                      />
                    </td>
                    <td className="tracking-num">{s.id}</td>
                    <td>{s.customerName || 'عميل'}</td>
                    <td>{s.merchantName || '—'}</td>
                    <td>{s.governorate || '—'}</td>
                    <td>{formatCurrency(s.collectedCash)}</td>
                    <td className="amount" style={{ color: '#10B981', fontWeight: 700 }}>{formatCurrency(due)}</td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                    لا يوجد تحصيل معلق لهذا المندوب حالياً.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}

function FinanceCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) { return <article className="report-kpi glass-card"><div className="report-kpi-icon" style={{ background: 'linear-gradient(135deg,#0EA5E9,#4F46E5)' }}>{icon}</div><div><p className="report-kpi-label">{label}</p><p className="report-kpi-value">{value}</p></div></article>; }
function CheckItem({ label, count, warningOnly = false }: { label: string; count: number; warningOnly?: boolean }) { const done = count === 0; return <div className="funnel-row checklist-row"><span>{label}</span><StatusBadge label={done ? 'مكتمل' : `${fmt(count)} معلقة`} tone={done ? 'success' : warningOnly ? 'warning' : 'danger'}/></div>; }


