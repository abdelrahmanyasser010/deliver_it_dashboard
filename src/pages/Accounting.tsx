import { useMemo, useState } from 'react';
import { AlertTriangle, Banknote, CheckCircle2, Download, Landmark, LockKeyhole, Plus, ReceiptText, Search, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Modal, StatusBadge } from '../components/ui/Ui';
import { useDeliveryData } from '../context/DeliveryDataContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { approvedDriverAdjustmentCost, approvedOperationalExpenses, deliveryCost, driverDeliveryCost, merchantShippingFee, shippingRevenue } from '../domain/finance/calculations';
import type { DriverAdjustmentType, DriverFinancialAdjustment, OperationalExpense, OperationalExpenseCategory } from '../domain/finance/entities';
import type { Shipment } from '../domain/logistics/entities';
import { downloadXlsx } from '../utils/exportSpreadsheet';
import { formatCurrency, formatDateTime } from '../utils/helpers';
import './Reports.css';

type AccountingTab = 'overview' | 'statements' | 'expenses' | 'ledger' | 'close';
type PartyType = 'merchant' | 'driver';
type DatePreset = 'all' | 'today' | 'this_week' | 'this_month';
type AccountingDetailKind = 'revenue' | 'courierCost' | 'grossProfit' | 'netOperatingProfit' | 'totalCollected' | 'totalRemitted' | 'cashWithDrivers' | 'merchantPayables';

interface StatementRow {
  id: string;
  date: string;
  partyType: PartyType;
  partyName: string;
  shipmentId: string;
  description: string;
  debit: number;
  credit: number;
}

const tabs: Array<{ id: AccountingTab; label: string }> = [
  { id: 'overview', label: 'الملخص' },
  { id: 'statements', label: 'كشوف الحساب' },
  { id: 'expenses', label: 'المصاريف والمدفوعات' },
  { id: 'ledger', label: 'مراجعة الحسابات' },
  { id: 'close', label: 'تقفيل الفترة' },
];

const fmt = (value: number) => value.toLocaleString('ar-EG');
const today = () => new Date().toISOString().slice(0, 10);

const expenseLabels: Record<OperationalExpenseCategory, string> = {
  rent: 'إيجار',
  utilities: 'كهرباء ومياه',
  salaries: 'رواتب',
  fuel: 'بنزين ومشاوير',
  maintenance: 'صيانة',
  packaging: 'تغليف ومطبوعات',
  marketing: 'تسويق',
  software: 'أنظمة وبرامج',
  other: 'أخرى',
};

const adjustmentLabels: Record<DriverAdjustmentType, string> = {
  bonus: 'إضافة / مكافأة',
  deduction: 'خصم',
  reimbursement: 'تعويض مصروف',
  advance: 'سلفة',
};

function inDatePreset(date: string, preset: DatePreset) {
  if (preset === 'all') return true;
  const target = new Date(date).getTime();
  const now = new Date();
  if (preset === 'today') return target >= new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (preset === 'this_week') {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    return target >= start.getTime();
  }
  return target >= new Date(now.getFullYear(), now.getMonth(), 1).getTime();
}

function buildStatementRows(shipments: Shipment[]): StatementRow[] {
  return shipments.flatMap((shipment) => {
    const rows: StatementRow[] = [];
    if (['delivered', 'partiallyDelivered', 'returned'].includes(shipment.status)) {
      rows.push({
        id: `MER-${shipment.id}`,
        date: shipment.statusChangedAt,
        partyType: 'merchant',
        partyName: shipment.merchantName,
        shipmentId: shipment.id,
        description: shipment.status === 'returned' ? 'رسوم مرتجع وتشغيل' : 'صافي مستحق شحنة مسلمة',
        debit: shipment.status === 'returned' ? Math.round(shipment.deliveryFee * 0.6) : 0,
        credit: ['delivered', 'partiallyDelivered'].includes(shipment.status) ? Math.max(0, shipment.collectedCash - shipment.deliveryFee - shipment.discount) : 0,
      });
    }
    if (shipment.driverId && shipment.collectedCash > 0) {
      rows.push({
        id: `DRV-${shipment.id}`,
        date: shipment.lastUpdatedAt,
        partyType: 'driver',
        partyName: shipment.driverName ?? shipment.driverId,
        shipmentId: shipment.id,
        description: 'تحصيل مع المندوب مطلوب توريده',
        debit: shipment.collectedCash,
        credit: shipment.remittedCash,
      });
    }
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
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [search, setSearch] = useState('');
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'pending' | 'posted' | 'reversed'>('all');
  const [batchRemittanceDriver, setBatchRemittanceDriver] = useState<string | null>(null);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [driverAdjustmentOpen, setDriverAdjustmentOpen] = useState(false);
  const [postPreviewOpen, setPostPreviewOpen] = useState(false);
  const [closePreviewOpen, setClosePreviewOpen] = useState(false);
  const [detailKind, setDetailKind] = useState<AccountingDetailKind | null>(null);

  const shipments = useMemo(() => state?.shipments ?? [], [state?.shipments]);
  const pricing = state?.settings.pricing;
  const expenses = state?.operationalExpenses ?? [];
  const driverAdjustments = state?.driverAdjustments ?? [];
  const statements = useMemo(() => buildStatementRows(shipments), [shipments]);
  const settlements = state?.settlements ?? [];
  const ledgerRows = state?.ledgerEntries ?? [];
  const drivers = state?.drivers ?? [];

  const periodKey = new Date().toISOString().slice(0, 7);
  const partyOptions = useMemo(() => [...new Set(statements.filter((row) => partyType === 'all' || row.partyType === partyType).map((row) => row.partyName))], [statements, partyType]);
  const filteredStatements = statements.filter((row) =>
    (partyType === 'all' || row.partyType === partyType) &&
    (partyName === 'all' || row.partyName === partyName) &&
    inDatePreset(row.date, datePreset) &&
    (!search || `${row.id} ${row.shipmentId} ${row.partyName} ${row.description}`.toLocaleLowerCase('ar-EG').includes(search.toLocaleLowerCase('ar-EG')))
  );
  const ledger = ledgerRows.filter((entry) => (ledgerFilter === 'all' || entry.status === ledgerFilter) && inDatePreset(entry.date, datePreset));

  const totalCollected = shipments.reduce((sum, shipment) => sum + shipment.collectedCash, 0);
  const totalRemitted = shipments.reduce((sum, shipment) => sum + shipment.remittedCash, 0);
  const cashWithDrivers = Math.max(0, totalCollected - totalRemitted);
  const merchantPayables = shipments.filter((shipment) => ['remitted', 'inSettlement'].includes(shipment.financialStatus) && shipment.settlementStatus === 'unsettled').reduce((sum, shipment) => sum + Math.max(0, shipment.collectedCash - shipment.deliveryFee - shipment.discount), 0);
  const revenue = pricing ? shippingRevenue(shipments, pricing) : 0;
  const courierCost = pricing ? deliveryCost(shipments, pricing) : 0;
  const expenseCost = approvedOperationalExpenses(expenses);
  const driverExtraCost = approvedDriverAdjustmentCost(driverAdjustments);
  const grossProfit = revenue - courierCost;
  const netOperatingProfit = grossProfit - expenseCost - driverExtraCost;
  const discrepancies = shipments.filter((shipment) => shipment.financialStatus === 'discrepancy');
  const pendingLedger = ledgerRows.filter((entry) => entry.status === 'pending').length;
  const pendingUpdates = state?.driverUpdates.filter((update) => update.status === 'pendingAdminApproval').length ?? 0;
  const pendingReturns = shipments.filter((shipment) => shipment.taskStatus === 'needsReturnProcessing').length;
  const openSettlements = settlements.filter((item) => !['paid', 'reconciled', 'cancelled'].includes(item.status)).length;
  const isClosed = state?.closedPeriods.includes(periodKey) ?? false;
  const canClose = pendingLedger === 0 && discrepancies.length === 0 && pendingUpdates === 0;
  const driversList = useMemo(() => [...new Set([...shipments.map((shipment) => shipment.driverName).filter(Boolean) as string[], ...drivers.map((driver) => driver.name)])], [shipments, drivers]);

  const run = async (command: Parameters<typeof execute>[0]) => {
    const result = await execute(command);
    showToast(result.message, result.ok ? 'success' : 'danger');
    return result;
  };

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
    showToast('تم تجهيز كشف الحساب.');
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
        المصدر: entry.sourceId,
      })),
    });
    showToast('تم تجهيز ملف مراجعة الحسابات.');
  };

  if (isLoading || !pricing) return <div className="reports-page"><section className="glass-card">جاري تحميل البيانات المالية...</section></div>;

  return (
    <div className="reports-page">
      <header className="reports-hero glass-card">
        <div>
          <h2>المحاسبة والتحصيل</h2>
          <p>تابع تحصيل المناديب، ربح الشحن، المصاريف التشغيلية، وتسويات التجار من مكان واحد.</p>
        </div>
        <div className="toolbar-actions">
          <button className="btn-primary" onClick={() => setBatchRemittanceDriver(driversList[0] || '')}><Wallet size={15} /> استلام تحصيل مندوب</button>
          <button className="outline-btn" onClick={() => setExpenseOpen(true)}><Plus size={15} /> مصروف تشغيلي</button>
          <button className="outline-btn" onClick={() => setDriverAdjustmentOpen(true)}><Banknote size={15} /> حركة مندوب</button>
        </div>
      </header>

      <div className="reports-tabs accounting-tabs glass-card">
        {tabs.map((tab) => <button key={tab.id} className={`reports-tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>)}
      </div>

      {activeTab === 'overview' && (
        <>
          <div className="report-kpi-grid">
            <FinanceCard label="إيراد الشحن من التجار" value={formatCurrency(revenue)} icon={<ReceiptText />} onClick={() => navigate('/reports')} />
            <FinanceCard label="تكلفة توصيل المناديب" value={formatCurrency(courierCost)} icon={<Wallet />} onClick={() => navigate('/reports')} />
            <FinanceCard label="ربح الشحن قبل المصاريف" value={formatCurrency(grossProfit)} icon={<Banknote />} onClick={() => navigate('/reports')} />
            <FinanceCard label="صافي التشغيل" value={formatCurrency(netOperatingProfit)} icon={<Landmark />} onClick={() => navigate('/reports')} />
          </div>
          <div className="report-kpi-grid">
            <FinanceCard label="إجمالي المحصل" value={formatCurrency(totalCollected)} icon={<Banknote />} onClick={() => setActiveTab('statements')} />
            <FinanceCard label="تم توريده" value={formatCurrency(totalRemitted)} icon={<Landmark />} onClick={() => setActiveTab('statements')} />
            <FinanceCard label="تحصيل لم يورد" value={formatCurrency(cashWithDrivers)} icon={<Wallet />} onClick={() => setBatchRemittanceDriver(driversList[0] || '')} />
            <FinanceCard label="مستحقات التجار" value={formatCurrency(merchantPayables)} icon={<ReceiptText />} onClick={() => navigate('/settlements')} />
          </div>
          <div className="accounting-alert-grid">
            <button className="accounting-action-card glass-card" onClick={() => setBatchRemittanceDriver(driversList[0] || '')}><Wallet /><span><strong>استلام تحصيل مندوب</strong><small>{formatCurrency(cashWithDrivers)} جاهزة للتوريد والتقفيل</small></span></button>
            <button className="accounting-action-card glass-card" onClick={() => setExpenseOpen(true)}><Plus /><span><strong>تسجيل مصروف</strong><small>كهرباء، مياه، صيانة، وقود أو أي بند تشغيل</small></span></button>
            <button className="accounting-action-card glass-card" onClick={() => setDriverAdjustmentOpen(true)}><Banknote /><span><strong>إضافة أو خصم مندوب</strong><small>مكافأة، سلفة، تعويض، أو خصم فرق</small></span></button>
            <button className="accounting-action-card glass-card" onClick={() => setActiveTab('ledger')}><Landmark /><span><strong>حركات معلقة</strong><small>{fmt(pendingLedger)} حركة تحتاج اعتماد</small></span></button>
          </div>
        </>
      )}

      {activeTab === 'statements' && (
        <section className="glass-card">
          <Toolbar partyType={partyType} partyName={partyName} partyOptions={partyOptions} datePreset={datePreset} search={search} onPartyType={(value) => { setPartyType(value); setPartyName('all'); }} onPartyName={setPartyName} onDatePreset={setDatePreset} onSearch={setSearch} action={<button className="outline-btn" onClick={exportStatements}><Download size={15} /> تحميل كشف الحساب</button>} />
          <div className="statement-summary">
            <FinanceCard label="عليه" value={formatCurrency(filteredStatements.reduce((sum, row) => sum + row.debit, 0))} icon={<Wallet />} />
            <FinanceCard label="له" value={formatCurrency(filteredStatements.reduce((sum, row) => sum + row.credit, 0))} icon={<Banknote />} />
            <FinanceCard label="صافي الرصيد" value={formatCurrency(filteredStatements.reduce((sum, row) => sum + row.debit - row.credit, 0))} icon={<ReceiptText />} />
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead><tr><th>التاريخ</th><th>الحساب</th><th>الشحنة</th><th>البيان</th><th>عليه</th><th>له</th><th>إجراء</th></tr></thead>
              <tbody>
                {filteredStatements.map((row) => <tr key={row.id}><td>{formatDateTime(row.date)}</td><td><strong>{row.partyName}</strong><small className="muted-cell">{row.partyType === 'merchant' ? 'تاجر' : 'مندوب'}</small></td><td><button className="tracking-link" onClick={() => navigate(`/shipments?shipment=${row.shipmentId}`)}>{row.shipmentId}</button></td><td>{row.description}</td><td>{formatCurrency(row.debit)}</td><td>{formatCurrency(row.credit)}</td><td>{row.partyType === 'driver' && <button className="outline-btn" onClick={() => setBatchRemittanceDriver(row.partyName)}>استلام التوريد</button>}</td></tr>)}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'expenses' && (
        <section className="glass-card">
          <div className="report-section-title">
            <div><h3>المصاريف والمدفوعات</h3><span className="report-muted">أي بند هنا يدخل في صافي التشغيل ويظهر في مراجعة الحسابات.</span></div>
            <div className="toolbar-actions"><button className="outline-btn" onClick={() => setExpenseOpen(true)}><Plus size={15} /> مصروف تشغيلي</button><button className="btn-primary" onClick={() => setDriverAdjustmentOpen(true)}><Plus size={15} /> حركة مندوب</button></div>
          </div>
          <div className="report-kpi-grid">
            <FinanceCard label="مصاريف تشغيلية معتمدة" value={formatCurrency(expenseCost)} icon={<ReceiptText />} />
            <FinanceCard label="مدفوعات إضافية للمناديب" value={formatCurrency(driverExtraCost)} icon={<Wallet />} />
            <FinanceCard label="مصاريف معلقة" value={formatCurrency(expenses.filter((item) => item.status === 'pending').reduce((sum, item) => sum + item.amount, 0))} icon={<AlertTriangle />} />
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead><tr><th>التاريخ</th><th>النوع</th><th>البند</th><th>المبلغ</th><th>الدفع</th><th>الحالة</th></tr></thead>
              <tbody>
                {expenses.map((expense) => <tr key={expense.id}><td>{formatDateTime(expense.date)}</td><td>{expenseLabels[expense.category]}</td><td>{expense.description}</td><td>{formatCurrency(expense.amount)}</td><td>{expense.paymentMethod === 'cash' ? 'خزينة' : expense.paymentMethod === 'bank' ? 'بنك' : 'محفظة'}</td><td><StatusBadge label={expense.status === 'approved' ? 'معتمد' : 'معلق'} tone={expense.status === 'approved' ? 'success' : 'warning'} /></td></tr>)}
                {driverAdjustments.map((item) => <tr key={item.id}><td>{formatDateTime(item.date)}</td><td>{adjustmentLabels[item.type]}</td><td>{item.driverName} - {item.description}</td><td>{formatCurrency(item.amount)}</td><td>حساب مندوب</td><td><StatusBadge label={item.status === 'approved' ? 'معتمد' : 'معلق'} tone={item.status === 'approved' ? 'success' : 'warning'} /></td></tr>)}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'ledger' && (
        <section className="glass-card">
          <div className="report-section-title">
            <div><h3>مراجعة حركات الحسابات</h3><span className="report-muted">حركات التحصيل والتسويات والمصاريف والمدفوعات.</span></div>
            <div className="toolbar-actions"><select className="input-glass" value={ledgerFilter} onChange={(event) => setLedgerFilter(event.target.value as typeof ledgerFilter)}><option value="all">كل الحالات</option><option value="pending">معلق</option><option value="posted">معتمد</option><option value="reversed">ملغي</option></select><button className="outline-btn" onClick={exportLedger}><Download size={15} /> تحميل المراجعة</button><button className="btn-primary" onClick={() => setPostPreviewOpen(true)} disabled={pendingLedger === 0}><CheckCircle2 size={15} /> اعتماد المعلق</button></div>
          </div>
          <div className="table-wrapper"><table className="data-table"><thead><tr><th>الحركة</th><th>التاريخ</th><th>الحساب</th><th>البيان</th><th>عليه</th><th>له</th><th>الحالة</th><th>المصدر</th></tr></thead><tbody>{ledger.map((entry) => <tr key={entry.id}><td>{entry.id}</td><td>{formatDateTime(entry.date)}</td><td>{entry.account}</td><td>{entry.description}</td><td>{formatCurrency(entry.debit)}</td><td>{formatCurrency(entry.credit)}</td><td><StatusBadge label={entry.status === 'posted' ? 'معتمد' : entry.status === 'pending' ? 'معلق' : 'ملغي'} tone={entry.status === 'posted' ? 'success' : entry.status === 'pending' ? 'warning' : 'danger'} /></td><td>{entry.sourceId}</td></tr>)}</tbody></table></div>
        </section>
      )}

      {activeTab === 'close' && (
        <section className="report-grid-2">
          <div className="glass-card"><div className="report-section-title"><h3>شروط تقفيل {periodKey}</h3></div><div className="funnel-list"><CheckItem label="تحديثات مناديب معلقة" count={pendingUpdates} /><CheckItem label="فروقات تحصيل غير محسومة" count={discrepancies.length} /><CheckItem label="حركات حسابات غير معتمدة" count={pendingLedger} /><CheckItem label="مرتجعات تحتاج متابعة" count={pendingReturns} warningOnly /><CheckItem label="تسويات مفتوحة" count={openSettlements} warningOnly /></div></div>
          <div className="glass-card"><LockKeyhole size={30} /><h3>تقفيل الفترة</h3><p className="report-muted">التقفيل يمنع التعديل المباشر على الفترة. أي تصحيح لاحق يدخل كحركة تصحيح في فترة مفتوحة.</p><button className="btn-primary full-width" disabled={isClosed} onClick={() => setClosePreviewOpen(true)}>{isClosed ? 'الفترة مغلقة' : 'مراجعة وتقفيل الفترة'}</button></div>
        </section>
      )}

      {expenseOpen && <ExpenseDialog onClose={() => setExpenseOpen(false)} onSubmit={async (expense) => { const response = await run({ type: 'finance/addOperationalExpense', expense }); if (response.ok) setExpenseOpen(false); }} />}
      {driverAdjustmentOpen && <DriverAdjustmentDialog drivers={drivers} onClose={() => setDriverAdjustmentOpen(false)} onSubmit={async (adjustment) => { const response = await run({ type: 'finance/addDriverAdjustment', adjustment }); if (response.ok) setDriverAdjustmentOpen(false); }} />}
      {batchRemittanceDriver !== null && <DriverRemittanceDialog driverName={batchRemittanceDriver} drivers={driversList} shipments={shipments} pricing={pricing} onClose={() => setBatchRemittanceDriver(null)} onSubmit={async (items, note) => { for (const item of items) await run({ type: 'finance/reconcileShipment', shipmentId: item.id, remittedCash: item.cash, note }); setBatchRemittanceDriver(null); }} />}
      {detailKind && <AccountingDetailModal kind={detailKind} shipments={shipments} pricing={pricing} expenses={expenses} driverAdjustments={driverAdjustments} onClose={() => setDetailKind(null)} onOpenShipment={(id) => navigate(`/shipments?shipment=${id}`)} />}
      {postPreviewOpen && <Modal title="اعتماد الحركات المعلقة" description={`سيتم اعتماد ${fmt(pendingLedger)} حركة بعد التأكيد.`} onClose={() => setPostPreviewOpen(false)} footer={<><button className="outline-btn" onClick={() => setPostPreviewOpen(false)}>إلغاء</button><button className="btn-primary" disabled={pendingLedger === 0} onClick={async () => { const response = await run({ type: 'ledger/postAll' }); if (response.ok) setPostPreviewOpen(false); }}><CheckCircle2 size={15} /> تأكيد الاعتماد</button></>}><p className="report-muted">راجع الحركات قبل الاعتماد. أي تعديل لاحق يتم بحركة تصحيح منفصلة.</p></Modal>}
      {closePreviewOpen && <Modal title={`تقفيل الفترة ${periodKey}`} description="تأكد من البنود المعلقة قبل التقفيل." onClose={() => setClosePreviewOpen(false)} footer={<><button className="outline-btn" onClick={() => setClosePreviewOpen(false)}>إلغاء</button><button className="btn-primary" disabled={!canClose} onClick={async () => { const response = await run({ type: 'period/close', period: periodKey }); if (response.ok) setClosePreviewOpen(false); }}><LockKeyhole size={15} /> تأكيد التقفيل</button></>}><div className="funnel-list"><CheckItem label="تحديثات معلقة" count={pendingUpdates} /><CheckItem label="فروقات تحصيل" count={discrepancies.length} /><CheckItem label="حركات معلقة" count={pendingLedger} /></div></Modal>}
    </div>
  );
}

function Toolbar({ partyType, partyName, partyOptions, datePreset, search, onPartyType, onPartyName, onDatePreset, onSearch, action }: { partyType: 'all' | PartyType; partyName: string; partyOptions: string[]; datePreset: DatePreset; search: string; onPartyType: (value: 'all' | PartyType) => void; onPartyName: (value: string) => void; onDatePreset: (value: DatePreset) => void; onSearch: (value: string) => void; action: React.ReactNode }) {
  return <div className="statement-toolbar"><label><span>نوع الحساب</span><select className="input-glass" value={partyType} onChange={(event) => onPartyType(event.target.value as 'all' | PartyType)}><option value="all">الكل</option><option value="merchant">التجار</option><option value="driver">المناديب</option></select></label><label><span>الحساب</span><select className="input-glass" value={partyName} onChange={(event) => onPartyName(event.target.value)}><option value="all">كل الحسابات</option>{partyOptions.map((name) => <option key={name}>{name}</option>)}</select></label><label><span>الفترة</span><select className="input-glass" value={datePreset} onChange={(event) => onDatePreset(event.target.value as DatePreset)}><option value="all">كل الفترة</option><option value="today">اليوم</option><option value="this_week">الأسبوع الحالي</option><option value="this_month">الشهر الحالي</option></select></label><label className="statement-search"><span>بحث</span><div className="search-field"><Search size={15} /><input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="الشحنة أو الحساب أو البيان" /></div></label><div className="toolbar-actions">{action}</div></div>;
}

function ExpenseDialog({ onClose, onSubmit }: { onClose: () => void; onSubmit: (expense: OperationalExpense) => Promise<void> }) {
  const [category, setCategory] = useState<OperationalExpenseCategory>('utilities');
  const [amount, setAmount] = useState(500);
  const [description, setDescription] = useState('كهرباء ومياه الفرع');
  const [paymentMethod, setPaymentMethod] = useState<OperationalExpense['paymentMethod']>('cash');
  return (
    <Modal
      title="تسجيل مصروف تشغيلي"
      description="سجل أي مصروف شركة ليظهر في صافي التشغيل والتقارير."
      onClose={onClose}
      footer={<>
        <button className="outline-btn" onClick={onClose}>إلغاء</button>
        <button className="btn-primary" onClick={() => onSubmit({ id: `EXP-${Date.now()}`, date: today(), category, description, amount, paymentMethod, status: 'approved', createdBy: 'لوحة التحكم' })}>حفظ المصروف</button>
      </>}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.9rem 1.1rem', padding: '0.4rem 0' }}>
        <label className="form-field">
          <span>البند</span>
          <select className="input-glass" value={category} onChange={(event) => setCategory(event.target.value as OperationalExpenseCategory)}>
            {Object.entries(expenseLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
        <label className="form-field">
          <span>المبلغ</span>
          <input className="input-glass" type="number" min="0" value={amount} onChange={(event) => setAmount(Number(event.target.value))} />
        </label>
        <label className="form-field">
          <span>طريقة الدفع</span>
          <select className="input-glass" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as OperationalExpense['paymentMethod'])}>
            <option value="cash">💵 خزينة</option>
            <option value="bank">🏦 بنك</option>
            <option value="wallet">📱 محفظة</option>
          </select>
        </label>
        <label className="form-field" style={{ gridColumn: '1 / -1' }}>
          <span>الوصف / البيان</span>
          <input className="input-glass" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="مثال: فاتورة كهرباء وصيانة الفرع..." />
        </label>
      </div>
    </Modal>
  );
}

function DriverAdjustmentDialog({ drivers, onClose, onSubmit }: { drivers: Array<{ id: string; name: string }>; onClose: () => void; onSubmit: (adjustment: DriverFinancialAdjustment) => Promise<void> }) {
  const first = drivers[0];
  const [driverId, setDriverId] = useState(first?.id ?? '');
  const [type, setType] = useState<DriverAdjustmentType>('bonus');
  const [amount, setAmount] = useState(150);
  const [description, setDescription] = useState('مكافأة تسليمات إضافية');
  const driver = drivers.find((item) => item.id === driverId) ?? first;
  return (
    <Modal
      title="تسجيل حركة مندوب"
      description="إضافة أو خصم أو تعويض يظهر في حساب المندوب والتقارير."
      onClose={onClose}
      footer={<>
        <button className="outline-btn" onClick={onClose}>إلغاء</button>
        <button className="btn-primary" disabled={!driver} onClick={() => driver && onSubmit({ id: `DADJ-${Date.now()}`, driverId: driver.id, driverName: driver.name, date: today(), type, amount, description, status: 'approved', createdBy: 'لوحة التحكم' })}>حفظ الحركة</button>
      </>}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.9rem 1.1rem', padding: '0.4rem 0' }}>
        <label className="form-field">
          <span>المندوب</span>
          <select className="input-glass" value={driverId} onChange={(event) => setDriverId(event.target.value)}>
            {drivers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label className="form-field">
          <span>نوع الحركة</span>
          <select className="input-glass" value={type} onChange={(event) => setType(event.target.value as DriverAdjustmentType)}>
            {Object.entries(adjustmentLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
        <label className="form-field">
          <span>المبلغ</span>
          <input className="input-glass" type="number" min="0" value={amount} onChange={(event) => setAmount(Number(event.target.value))} />
        </label>
        <label className="form-field" style={{ gridColumn: '1 / -1' }}>
          <span>الوصف / البيان</span>
          <input className="input-glass" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="مثال: مكافأة تسليمات إضافية..." />
        </label>
      </div>
    </Modal>
  );
}

function DriverRemittanceDialog({ driverName, drivers, shipments, pricing, onClose, onSubmit }: { driverName: string; drivers: string[]; shipments: Shipment[]; pricing: NonNullable<ReturnType<typeof useDeliveryData>['state']>['settings']['pricing']; onClose: () => void; onSubmit: (shipmentsToRemit: Array<{ id: string; cash: number }>, note: string) => Promise<void> }) {
  const [selectedDriver, setSelectedDriver] = useState(driverName || drivers[0] || '');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [note, setNote] = useState('استلام وتوريد تحصيل المندوب');
  const unremittedShipments = shipments.filter((shipment) => (shipment.driverName === selectedDriver || shipment.driverId === selectedDriver) && shipment.collectedCash > shipment.remittedCash);
  const effectiveSelected = selectedIds.length ? selectedIds : unremittedShipments.map((shipment) => shipment.id);
  const selectedRows = unremittedShipments.filter((shipment) => effectiveSelected.includes(shipment.id));
  const totalDue = selectedRows.reduce((sum, shipment) => sum + shipment.collectedCash - shipment.remittedCash, 0);
  const totalDriverCost = selectedRows.reduce((sum, shipment) => sum + driverDeliveryCost(shipment, pricing), 0);
  const totalMerchantFee = selectedRows.reduce((sum, shipment) => sum + merchantShippingFee(shipment, pricing), 0);
  const toggle = (id: string) => setSelectedIds(() => effectiveSelected.includes(id) ? effectiveSelected.filter((item) => item !== id) : [...effectiveSelected, id]);
  return (
    <Modal
      wide
      title="استلام وتوريد تحصيل المندوب"
      description="راجع الشحنات والمبلغ وتكلفة المندوب قبل تقفيل التحصيل."
      onClose={onClose}
      footer={<>
        <button className="outline-btn" onClick={onClose}>إلغاء</button>
        <button className="btn-primary" disabled={!selectedRows.length} onClick={() => onSubmit(selectedRows.map((shipment) => ({ id: shipment.id, cash: shipment.collectedCash })), note)}>
          <CheckCircle2 size={15} /> تأكيد التوريد {formatCurrency(totalDue)}
        </button>
      </>}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.9rem 1.1rem', marginBottom: '1rem' }}>
        <label className="form-field">
          <span>المندوب</span>
          <select className="input-glass" value={selectedDriver} onChange={(event) => { setSelectedDriver(event.target.value); setSelectedIds([]); }}>
            {drivers.map((driver) => <option key={driver}>{driver}</option>)}
          </select>
        </label>
        <label className="form-field">
          <span>البيان / ملاحظات التوريد</span>
          <input className="input-glass" value={note} onChange={(event) => setNote(event.target.value)} placeholder="مثال: استلام وتوريد تحصيل المندوب..." />
        </label>
      </div>
      <div className="report-kpi-grid">
        <FinanceCard label="المبلغ مع المندوب" value={formatCurrency(totalDue)} icon={<Wallet />} />
        <FinanceCard label="سعر الشحن للتاجر" value={formatCurrency(totalMerchantFee)} icon={<ReceiptText />} />
        <FinanceCard label="تكلفة توصيل المندوب" value={formatCurrency(totalDriverCost)} icon={<Banknote />} />
      </div>
      <div className="table-wrapper" style={{ maxHeight: 280, overflowY: 'auto' }}>
        <table className="data-table compact-table">
          <thead>
            <tr>
              <th>تحديد</th>
              <th>الشحنة</th>
              <th>التاجر</th>
              <th>المحافظة</th>
              <th>المحصل</th>
              <th>تكلفة المندوب</th>
            </tr>
          </thead>
          <tbody>
            {unremittedShipments.map((shipment) => (
              <tr key={shipment.id} onClick={() => toggle(shipment.id)} style={{ cursor: 'pointer' }}>
                <td><input type="checkbox" checked={effectiveSelected.includes(shipment.id)} onChange={() => toggle(shipment.id)} /></td>
                <td>{shipment.id}</td>
                <td>{shipment.merchantName}</td>
                <td>{shipment.governorate}</td>
                <td>{formatCurrency(shipment.collectedCash - shipment.remittedCash)}</td>
                <td>{formatCurrency(driverDeliveryCost(shipment, pricing))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

function AccountingDetailModal({ kind, shipments, pricing, expenses, driverAdjustments, onClose, onOpenShipment }: { kind: AccountingDetailKind; shipments: Shipment[]; pricing: NonNullable<ReturnType<typeof useDeliveryData>['state']>['settings']['pricing']; expenses: OperationalExpense[]; driverAdjustments: DriverFinancialAdjustment[]; onClose: () => void; onOpenShipment: (id: string) => void }) {
  const titles: Record<AccountingDetailKind, string> = {
    revenue: 'تفاصيل إيراد الشحن',
    courierCost: 'تفاصيل تكلفة المناديب',
    grossProfit: 'تفاصيل ربح الشحن قبل المصاريف',
    netOperatingProfit: 'تفاصيل صافي التشغيل',
    totalCollected: 'تفاصيل إجمالي المحصل',
    totalRemitted: 'تفاصيل المبالغ الموردة',
    cashWithDrivers: 'تفاصيل التحصيل غير المورد',
    merchantPayables: 'تفاصيل مستحقات التجار',
  };
  const shipmentRows = shipments.map((shipment) => {
    const merchantFee = merchantShippingFee(shipment, pricing);
    const driverCost = driverDeliveryCost(shipment, pricing);
    return { shipment, merchantFee, driverCost, profit: merchantFee - driverCost, unremitted: Math.max(0, shipment.collectedCash - shipment.remittedCash), merchantPayable: Math.max(0, shipment.collectedCash - shipment.deliveryFee - shipment.discount) };
  });
  const visibleRows = shipmentRows.filter((row) => {
    if (kind === 'cashWithDrivers') return row.unremitted > 0;
    if (kind === 'merchantPayables') return ['remitted', 'inSettlement'].includes(row.shipment.financialStatus) && row.shipment.settlementStatus === 'unsettled';
    if (kind === 'totalCollected') return row.shipment.collectedCash > 0;
    if (kind === 'totalRemitted') return row.shipment.remittedCash > 0;
    return true;
  });
  const expenseTotal = approvedOperationalExpenses(expenses);
  const driverExtraCost = approvedDriverAdjustmentCost(driverAdjustments);
  const total = kind === 'revenue' ? shippingRevenue(shipments, pricing)
    : kind === 'courierCost' ? deliveryCost(shipments, pricing)
    : kind === 'grossProfit' ? shippingRevenue(shipments, pricing) - deliveryCost(shipments, pricing)
    : kind === 'netOperatingProfit' ? shippingRevenue(shipments, pricing) - deliveryCost(shipments, pricing) - expenseTotal - driverExtraCost
    : kind === 'totalCollected' ? shipments.reduce((sum, shipment) => sum + shipment.collectedCash, 0)
    : kind === 'totalRemitted' ? shipments.reduce((sum, shipment) => sum + shipment.remittedCash, 0)
    : kind === 'cashWithDrivers' ? visibleRows.reduce((sum, row) => sum + row.unremitted, 0)
    : visibleRows.reduce((sum, row) => sum + row.merchantPayable, 0);
  const rowsForExport: Array<Record<string, string | number>> = kind === 'netOperatingProfit'
    ? [
        ...shipmentRows.map((row) => ({ النوع: 'شحنة', المرجع: row.shipment.id, الحساب: row.shipment.merchantName, سعر_التاجر: row.merchantFee, تكلفة_المندوب: row.driverCost, الأثر: row.profit })),
        ...expenses.map((item) => ({ النوع: 'مصروف تشغيلي', المرجع: item.id, الحساب: item.category, سعر_التاجر: 0, تكلفة_المندوب: item.amount, الأثر: -item.amount })),
        ...driverAdjustments.map((item) => ({ النوع: 'حركة مندوب', المرجع: item.id, الحساب: item.driverName, سعر_التاجر: 0, تكلفة_المندوب: item.amount, الأثر: -item.amount })),
      ]
    : visibleRows.map((row) => ({ الشحنة: row.shipment.id, التاجر: row.shipment.merchantName, المندوب: row.shipment.driverName ?? 'غير معين', المحافظة: row.shipment.governorate, المحصل: row.shipment.collectedCash, المورد: row.shipment.remittedCash, سعر_التاجر: row.merchantFee, تكلفة_المندوب: row.driverCost, ربح_الشحن: row.profit, مستحق_التاجر: row.merchantPayable }));

  return (
    <Modal wide title={titles[kind]} description={`إجمالي الرقم: ${formatCurrency(total)}`} onClose={onClose} footer={<><button className="outline-btn" onClick={onClose}>إغلاق</button><button className="btn-primary" onClick={() => downloadXlsx({ filename: `accounting-details-${kind}.xlsx`, sheetName: titles[kind], rows: rowsForExport })}><Download size={15} /> تحميل التفاصيل</button></>}>
      {kind === 'netOperatingProfit' && <div className="report-kpi-grid"><FinanceCard label="إيراد الشحن" value={formatCurrency(shippingRevenue(shipments, pricing))} icon={<ReceiptText />} /><FinanceCard label="تكلفة المناديب" value={formatCurrency(deliveryCost(shipments, pricing))} icon={<Wallet />} /><FinanceCard label="مصاريف تشغيلية" value={formatCurrency(expenseTotal)} icon={<AlertTriangle />} /><FinanceCard label="حركات مناديب" value={formatCurrency(driverExtraCost)} icon={<Banknote />} /></div>}
      <div className="table-wrapper" style={{ maxHeight: 420, overflowY: 'auto' }}><table className="data-table compact-table"><thead><tr><th>الشحنة</th><th>التاجر</th><th>المندوب</th><th>المحافظة</th><th>المحصل</th><th>المورد</th><th>سعر التاجر</th><th>تكلفة المندوب</th><th>ربح الشحن</th><th>إجراء</th></tr></thead><tbody>{visibleRows.map((row) => <tr key={row.shipment.id}><td>{row.shipment.id}</td><td>{row.shipment.merchantName}</td><td>{row.shipment.driverName ?? 'غير معين'}</td><td>{row.shipment.governorate}</td><td>{formatCurrency(row.shipment.collectedCash)}</td><td>{formatCurrency(row.shipment.remittedCash)}</td><td>{formatCurrency(row.merchantFee)}</td><td>{formatCurrency(row.driverCost)}</td><td>{formatCurrency(row.profit)}</td><td><button className="outline-btn" onClick={() => onOpenShipment(row.shipment.id)}>فتح</button></td></tr>)}</tbody></table></div>
    </Modal>
  );
}

function FinanceCard({ label, value, icon, onClick }: { label: string; value: string; icon: React.ReactNode; onClick?: () => void }) {
  const Tag = onClick ? 'button' : 'article';
  return (
    <Tag className={`report-kpi glass-card ${onClick ? 'clickable' : ''}`} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default', textAlign: 'right', border: 0 }}>
      <div className="report-kpi-icon" style={{ background: 'linear-gradient(135deg,#0EA5E9,#4F46E5)' }}>{icon}</div>
      <div>
        <p className="report-kpi-label">{label}</p>
        <p className="report-kpi-value">{value}</p>
      </div>
    </Tag>
  );
}

function CheckItem({ label, count, warningOnly = false }: { label: string; count: number; warningOnly?: boolean }) {
  const done = count === 0;
  return <div className="funnel-row checklist-row"><span>{label}</span><StatusBadge label={done ? 'مكتمل' : `${fmt(count)} معلقة`} tone={done ? 'success' : warningOnly ? 'warning' : 'danger'} /></div>;
}
