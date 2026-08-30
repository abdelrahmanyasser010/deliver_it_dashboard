import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  CheckSquare,
  Columns3,
  BookmarkPlus,
  FileSpreadsheet,
  FilterX,
  Search,
  Square,
  Upload,
  X,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { ALL_STATUS, type FilterStatus, useDrivers, useShipments } from '../application/logistics/useLogisticsData';
import { EmptyState, ErrorState, PageSkeleton } from '../components/AsyncState';
import { FilterChip as UiFilterChip, Modal } from '../components/ui/Ui';
import { useDeliveryData } from '../context/DeliveryDataContext';
import type {
  Shipment,
  ShipmentStatus,
} from '../domain/logistics/entities';
import { buildServerImportFile, parseCsv, serverImportColumnMapping, validateImportRow, type CsvPreview } from '../features/shipments/csvImport';
import { BulkActionDialog, BulkStatusDialog, CsvPreviewDialog, SelectionBar, ShipmentDrawer, ShipmentRow, type BulkAction, type ShipmentAction, type ShipmentColumn } from '../features/shipments/ShipmentPresentation';
import { ShipmentLabelsPreview } from '../features/printing/ShipmentLabelsPreview';
import { downloadXlsx } from '../utils/exportSpreadsheet';
import { uploadApiFile } from '../infrastructure/api/files';
import { api } from '../infrastructure/api/client';
import { asRecord } from '../infrastructure/api/mappers';
import { friendlyApiMessage } from '../infrastructure/api/errors';
import {
  financialStatusConfig,
  priorityConfig,
  statusConfig,
  taskStatusConfig,
} from '../utils/helpers';
import './Shipments.css';

const statusOptions: { value: FilterStatus; label: string }[] = [
  { value: ALL_STATUS, label: 'كل الحالات' },
  { value: 'readyToShip', label: 'بانتظار الاستلام' },
  { value: 'receivedAtOffice', label: 'وصلت المكتب' },
  { value: 'deliveredToDriver', label: 'مع المندوب' },
  { value: 'inTransit', label: 'في الطريق' },
  { value: 'delivered', label: 'تم التسليم' },
  { value: 'postponed', label: 'مؤجلة' },
  { value: 'failedToDeliver', label: 'فشل التسليم' },
  { value: 'returned', label: 'مرتجع' },
];

const formatNumber = (value: number) => value.toLocaleString('ar-EG');

type ViewFilter = 'all' | 'unassigned' | 'delayed' | 'financial-review';

interface SavedShipmentView {
  id: string;
  name: string;
  query: string;
  statusFilter: FilterStatus;
  viewFilter: ViewFilter;
  governorateFilter: string;
  driverFilter: string;
  merchantFilter: string;
  priorityFilter: string;
  columns: ShipmentColumn[];
}
const shipmentColumns: Array<{ id: ShipmentColumn; label: string }> = [
  { id: 'customer', label: 'المستلم' }, { id: 'merchant', label: 'التاجر' }, { id: 'area', label: 'المنطقة' }, { id: 'driver', label: 'المندوب' },
  { id: 'status', label: 'الحالة' }, { id: 'task', label: 'المطلوب' }, { id: 'collection', label: 'التحصيل' }, { id: 'updated', label: 'آخر تحديث' },
];
const defaultColumns = shipmentColumns.map((item) => item.id);
function readSavedViews(): SavedShipmentView[] {
  try { return JSON.parse(localStorage.getItem('deliver-it-shipment-views') ?? '[]') as SavedShipmentView[]; } catch { return []; }
}
function readVisibleColumns(): ShipmentColumn[] {
  try { const stored = JSON.parse(localStorage.getItem('deliver-it-shipment-columns') ?? '[]') as ShipmentColumn[]; return stored.length ? stored : defaultColumns; } catch { return defaultColumns; }
}

export function ShipmentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = searchParams.get('status');
  const [query, setQuery] = useState(searchParams.get('merchant') ?? '');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>(isShipmentStatus(initialStatus) ? initialStatus : ALL_STATUS);
  const [viewFilter, setViewFilter] = useState<ViewFilter>(isViewFilter(searchParams.get('view')) ? searchParams.get('view') as ViewFilter : 'all');
  const [governorateFilter, setGovernorateFilter] = useState(searchParams.get('governorate') ?? 'all');
  const [driverFilter, setDriverFilter] = useState(searchParams.get('driver') ?? 'all');
  const [merchantFilter, setMerchantFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const fromDate = searchParams.get('from');
  const toDate = searchParams.get('to');
  const selectedId = searchParams.get('shipment');
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [activeAction, setActiveAction] = useState<ShipmentAction | null>(null);
  const [bulkAction, setBulkAction] = useState<BulkAction | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [printTargets, setPrintTargets] = useState<Shipment[]>([]);
  const [csvPreview, setCsvPreview] = useState<CsvPreview | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [now] = useState(() => Date.now());
  const [visibleColumns, setVisibleColumns] = useState<ShipmentColumn[]>(readVisibleColumns);
  const [savedViews, setSavedViews] = useState<SavedShipmentView[]>(readSavedViews);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [saveViewOpen, setSaveViewOpen] = useState(false);
  const [viewName, setViewName] = useState('');

  const shipmentQuery = useShipments(query, statusFilter);
  const driversQuery = useDrivers();
  const delivery = useDeliveryData();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allShipments = shipmentQuery.shipments;

  const filterOptions = useMemo(() => ({
    governorates: [...new Set(allShipments.map((shipment) => shipment.governorate))].sort((a, b) => a.localeCompare(b, 'ar')),
    merchants: [...new Set(allShipments.map((shipment) => shipment.merchantName))].sort((a, b) => a.localeCompare(b, 'ar')),
    shipmentDrivers: [...new Set(allShipments.map((shipment) => shipment.driverName).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'ar')),
  }), [allShipments]);

  const filtered = useMemo(() => allShipments.filter((shipment) => {
    const matchesGovernorate = governorateFilter === 'all' || shipment.governorate === governorateFilter;
    const matchesDriver = driverFilter === 'all' || (driverFilter === 'unassigned' && !shipment.driverName) || shipment.driverName === driverFilter;
    const matchesMerchant = merchantFilter === 'all' || shipment.merchantName === merchantFilter;
    const matchesPriority = priorityFilter === 'all' || shipment.priority === priorityFilter;
    const createdTime = new Date(shipment.createdAt).getTime();
    const matchesDate = (!fromDate || createdTime >= new Date(`${fromDate}T00:00:00`).getTime()) && (!toDate || createdTime <= new Date(`${toDate}T23:59:59.999`).getTime());
    const isDelayed = Boolean(shipment.expectedDeliveryAt) && new Date(shipment.expectedDeliveryAt as string).getTime() < now && !['delivered', 'partiallyDelivered', 'returned'].includes(shipment.status);
    const matchesView = viewFilter === 'all'
      || (viewFilter === 'unassigned' && shipment.taskStatus === 'needsDriverAssignment')
      || (viewFilter === 'delayed' && isDelayed)
      || (viewFilter === 'financial-review' && shipment.taskStatus === 'needsFinancialReview');
    return matchesGovernorate && matchesDriver && matchesMerchant && matchesPriority && matchesView && matchesDate;
  }), [allShipments, governorateFilter, driverFilter, merchantFilter, priorityFilter, viewFilter, now, fromDate, toDate]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const statusParam = searchParams.get('status');
      if (isShipmentStatus(statusParam) && statusParam !== statusFilter) setStatusFilter(statusParam);
      const merchantParam = searchParams.get('merchant');
      if (merchantParam !== null && merchantParam !== query) setQuery(merchantParam);
      const driverParam = searchParams.get('driver');
      if (driverParam && driverParam !== driverFilter) setDriverFilter(driverParam);
      const governorateParam = searchParams.get('governorate');
      if (governorateParam && governorateParam !== governorateFilter) setGovernorateFilter(governorateParam);
    });
    return () => { cancelled = true; };
  }, [searchParams, statusFilter, query, driverFilter, governorateFilter]);

  const selected = allShipments.find((shipment) => shipment.id === selectedId) ?? null;
  const checkedShipments = filtered.filter((shipment) => checkedIds.includes(shipment.id));
  const allVisibleSelected = filtered.length > 0 && filtered.every((shipment) => checkedIds.includes(shipment.id));
  const activeFilterCount = [statusFilter !== ALL_STATUS, viewFilter !== 'all', governorateFilter !== 'all', driverFilter !== 'all', merchantFilter !== 'all', priorityFilter !== 'all', Boolean(query), Boolean(fromDate), Boolean(toDate)].filter(Boolean).length;

  const openDrawer = (shipmentId: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('shipment', shipmentId);
    setSearchParams(next, { replace: true });
  };

  const closeDrawer = () => {
    setActiveAction(null);
    const next = new URLSearchParams(searchParams);
    next.delete('shipment');
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (csvPreview) setCsvPreview(null);
      else if (bulkAction) setBulkAction(null);
      else if (activeAction) setActiveAction(null);
      else if (selectedId) {
            const next = new URLSearchParams(searchParams);
        next.delete('shipment');
        setSearchParams(next, { replace: true });
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [activeAction, bulkAction, csvPreview, searchParams, selectedId, setSearchParams]);


  const handlePrint = (targets: Shipment[]) => {
    if (!targets.length) return;
    setPrintTargets(targets);
  };

  const exportFilteredShipments = () => {
    downloadXlsx({ filename: `shipments-${new Date().toISOString().slice(0, 10)}.xlsx`, sheetName: 'الشحنات', rows: filtered.map((shipment) => ({
      'رقم البوليصة': shipment.id,
      'كود التتبع': shipment.trackingNumber,
      'المستلم': shipment.customerName,
      'الهاتف': shipment.customerPhone,
      'المحافظة': shipment.governorate,
      'المدينة': shipment.city,
      'العنوان': shipment.address,
      'التاجر': shipment.merchantName,
      'المندوب': shipment.driverName ?? 'غير معين',
      'الحالة التشغيلية': statusConfig[shipment.status].label,
      'الإجراء المطلوب': taskStatusConfig[shipment.taskStatus].label,
      'الحالة المالية': financialStatusConfig[shipment.financialStatus].label,
      'المبلغ': shipment.total,
      'آخر تحديث': new Date(shipment.lastUpdatedAt),
    })) });
    setToast(`تم تجهيز ملف Excel حقيقي لـ ${formatNumber(filtered.length)} شحنة مطابقة للفلاتر الحالية.`);
  };

  const readShipmentSheet = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCsv(String(reader.result ?? ''));
      const existingCodes = new Set(allShipments.flatMap((shipment) => [shipment.id, shipment.trackingNumber]));
      const previewRows = rows.map((data, index) => validateImportRow(data, index + 2, existingCodes));
      setCsvPreview({ fileName: file.name, rows: previewRows });
    };
    reader.onerror = () => setToast('تعذر قراءة الملف. تأكد أنه CSV محفوظ بترميز UTF-8.');
    reader.readAsText(file, 'utf-8');
  };

  const confirmImport = async () => {
    if (!csvPreview || importBusy) return;
    const validRows = csvPreview.rows.filter((row) => row.errors.length === 0 && !row.duplicate);
    if (!validRows.length) { setToast('لا توجد صفوف صالحة للإرسال إلى الخادم.'); return; }
    setImportBusy(true);
    try {
      const normalized = buildServerImportFile(csvPreview);
      const uploaded = await uploadApiFile(normalized, 'shipment_import');
      const action = `web-shipment-import-${crypto.randomUUID()}`;
      const created = await api.post<unknown>('/api/v1/shipment-imports', {
        file_id: uploaded.id,
        column_mapping: serverImportColumnMapping,
        duplicate_strategy: 'reject',
        validate_only: false,
        client_action_id: action,
      }, { idempotencyKey: action, retries: 1 });
      const importId = String(asRecord(created.data).id ?? '');
      setCsvPreview(null);
      setToast(`تم رفع ${formatNumber(validRows.length)} صفًا وبدأت المعالجة على الخادم.`);

      if (importId) {
        for (let attempt = 0; attempt < 20; attempt += 1) {
          await new Promise((resolve) => window.setTimeout(resolve, 1000));
          const status = asRecord((await api.get<unknown>(`/api/v1/shipment-imports/${importId}`, { retries: 1 })).data);
          if (status.status === 'completed') {
            await delivery.refetch();
            setToast(`اكتمل الاستيراد: ${formatNumber(Number(status.accepted_rows ?? 0))} مقبول، ${formatNumber(Number(status.rejected_rows ?? 0))} مرفوض.`);
            break;
          }
          if (status.status === 'failed') { setToast('فشلت معالجة ملف الاستيراد على الخادم. راجع سجل الاستيراد وملف الأخطاء.'); break; }
        }
      }
    } catch (cause) {
      setToast(friendlyApiMessage(cause));
    } finally {
      setImportBusy(false);
    }
  };

  const toggleAllVisible = () => {
    if (allVisibleSelected) setCheckedIds((current) => current.filter((id) => !filtered.some((shipment) => shipment.id === id)));
    else setCheckedIds((current) => [...new Set([...current, ...filtered.map((shipment) => shipment.id)])]);
  };

  const clearFilters = () => {
    setQuery('');
    setStatusFilter(ALL_STATUS);
    setViewFilter('all');
    setGovernorateFilter('all');
    setDriverFilter('all');
    setMerchantFilter('all');
    setPriorityFilter('all');
    setCheckedIds([]);
    const next = new URLSearchParams(searchParams);
    next.delete('view');
    next.delete('status');
    next.delete('merchant');
    next.delete('from');
    next.delete('to');
    next.delete('driver');
    next.delete('governorate');
    setSearchParams(next, { replace: true });
  };

  const submitShipmentAction = async (payload: Record<string, string>) => {
    if (!selected || !activeAction) return;
    let commandResult;
    if (activeAction === 'assign') {
      commandResult = await delivery.execute({ type: 'shipment/assignDriver', shipmentIds: [selected.id], driverId: payload.driverId });
    } else if (activeAction === 'editFee') {
      commandResult = await delivery.execute({
        type: 'shipment/overrideFee',
        shipmentId: selected.id,
        deliveryFee: Number(payload.deliveryFee),
        reason: payload.reason || 'تعديل رسوم الشحن',
      });
    } else if (activeAction === 'settlement') {
      commandResult = await delivery.execute({ type: 'shipment/requestSettlement', shipmentIds: [selected.id] });
    }
    if (commandResult) setToast(commandResult.message);
    setActiveAction(null);
  };

  const persistColumns = (columns: ShipmentColumn[]) => {
    const next: ShipmentColumn[] = columns.length ? columns : ['customer'];
    setVisibleColumns(next);
    localStorage.setItem('deliver-it-shipment-columns', JSON.stringify(next));
  };

  const saveCurrentView = () => {
    const name = viewName.trim();
    if (!name) { setToast('اكتب اسمًا للفلتر أولًا.'); return; }
    const nextView: SavedShipmentView = { id: `view-${Date.now()}`, name, query, statusFilter, viewFilter, governorateFilter, driverFilter, merchantFilter, priorityFilter, columns: visibleColumns };
    const next = [nextView, ...savedViews].slice(0, 10);
    setSavedViews(next);
    localStorage.setItem('deliver-it-shipment-views', JSON.stringify(next));
    setViewName(''); setSaveViewOpen(false); setToast(`تم حفظ الفلتر: ${name}`);
  };

  const applySavedView = (id: string) => {
    const view = savedViews.find((item) => item.id === id);
    if (!view) return;
    setQuery(view.query); setStatusFilter(view.statusFilter); setViewFilter(view.viewFilter); setGovernorateFilter(view.governorateFilter); setDriverFilter(view.driverFilter); setMerchantFilter(view.merchantFilter); setPriorityFilter(view.priorityFilter); persistColumns(view.columns);
    setToast(`تم تطبيق الفلتر: ${view.name}`);
  };

  const deleteSavedView = (id: string) => {
    const next = savedViews.filter((item) => item.id !== id);
    setSavedViews(next); localStorage.setItem('deliver-it-shipment-views', JSON.stringify(next));
  };

  const submitBulkAction = async (payload: Record<string, string>) => {
    if (!bulkAction) return;
    let commandResult;
    if (bulkAction === 'print') handlePrint(checkedShipments);
    else if (bulkAction === 'assign') commandResult = await delivery.execute({ type: 'shipment/assignDriver', shipmentIds: checkedShipments.map((shipment) => shipment.id), driverId: payload.driverId });
    if (commandResult) setToast(commandResult.message);
    setBulkAction(null);
    setCheckedIds([]);
  };

  const submitBulkStatusChange = async (nextStatus: ShipmentStatus, reason: string) => {
    const result = await delivery.execute({ type: 'shipment/transition', shipmentIds: checkedShipments.map((s) => s.id), nextStatus, reason: reason || `تغيير يدوي جماعي من اللوحة — ${checkedShipments.length} شحنة` });
    setToast(result.message);
    setBulkAction(null);
    setCheckedIds([]);
  };

  if (shipmentQuery.isLoading) return <PageSkeleton rows={4} />;
  if (shipmentQuery.error) return <ErrorState message={shipmentQuery.error} onRetry={shipmentQuery.refetch} />;

  return (
    <div className="shipments-page">
      <header className="shipments-heading">
        <div>
          <p className="page-kicker">إدارة ومتابعة دورة الشحنة</p>
          <h2>الشحنات</h2>
          <p>بحث، فلاتر، إجراءات جماعية، ومراجعة تشغيلية ومالية من شاشة واحدة.</p>
        </div>
        <div className="heading-actions">
          <button className="outline-btn" onClick={() => setColumnsOpen(true)}><Columns3 size={15} /> الأعمدة</button>
          <button className="outline-btn" onClick={() => setSaveViewOpen(true)}><BookmarkPlus size={15} /> حفظ الفلتر الحالي</button>
          <button className="outline-btn" onClick={exportFilteredShipments}><FileSpreadsheet size={15} /> تحميل Excel</button>
          <button className="btn-primary" disabled={importBusy} onClick={() => fileInputRef.current?.click()}><Upload size={15} />{importBusy ? 'جارٍ الاستيراد…' : 'استيراد CSV'}</button>
          <input ref={fileInputRef} className="visually-hidden" type="file" accept=".csv,text/csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) readShipmentSheet(file); event.currentTarget.value = ''; }} />
        </div>
      </header>

      <section className="shipment-toolbar glass-card">
        <div className="search-row">
          <div className="search-field">
            <Search size={17} />
            <input type="search" placeholder="رقم الشحنة، المستلم، الهاتف، العنوان، التاجر أو المندوب" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="البحث في الشحنات" />
            {query && <button className="icon-plain" onClick={() => setQuery('')} aria-label="مسح البحث"><X size={15} /></button>}
          </div>
          <div className="results-count">
            <strong>{formatNumber(filtered.length)}</strong>
            <span>من {formatNumber(allShipments.length)} شحنة</span>
          </div>
        </div>
        <div className="shipment-status-filters">
          {statusOptions.map((option) => <button key={option.value} className={`filter-pill ${statusFilter === option.value ? 'active' : ''}`} onClick={() => setStatusFilter(option.value)}>{option.label}</button>)}
        </div>
      </section>

      <section className="advanced-filters glass-card">
        <select className="input-glass" value={governorateFilter} onChange={(event) => setGovernorateFilter(event.target.value)} aria-label="فلتر المحافظة"><option value="all">كل المحافظات</option>{filterOptions.governorates.map((item) => <option key={item}>{item}</option>)}</select>
        <select className="input-glass" value={driverFilter} onChange={(event) => setDriverFilter(event.target.value)} aria-label="فلتر المندوب"><option value="all">كل المناديب</option><option value="unassigned">غير معين</option>{filterOptions.shipmentDrivers.map((item) => <option key={item}>{item}</option>)}</select>
        <select className="input-glass" value={merchantFilter} onChange={(event) => setMerchantFilter(event.target.value)} aria-label="فلتر التاجر"><option value="all">كل التجار</option>{filterOptions.merchants.map((item) => <option key={item}>{item}</option>)}</select>
        <select className="input-glass saved-view-select" defaultValue="" onChange={(event) => { applySavedView(event.target.value); event.currentTarget.value = ''; }} aria-label="تطبيق فلتر محفوظ"><option value="">الفلاتر المحفوظة ({formatNumber(savedViews.length)})</option>{savedViews.map((view) => <option key={view.id} value={view.id}>{view.name}</option>)}</select>
        <select className="input-glass" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} aria-label="فلتر الأولوية"><option value="all">كل الأولويات</option><option value="urgent">عاجل</option><option value="high">مهم</option><option value="normal">طبيعي</option></select>
        <button className="outline-btn compact-btn" onClick={clearFilters} disabled={activeFilterCount === 0}><FilterX size={15} /> مسح الفلاتر ({formatNumber(activeFilterCount)})</button>
      </section>

      {activeFilterCount > 0 && (
        <div className="active-filter-chips" aria-label="الفلاتر النشطة">
          {query && <UiFilterChip label={`البحث: ${query}`} onRemove={() => setQuery('')} />}
          {statusFilter !== ALL_STATUS && <UiFilterChip label={`الحالة: ${statusConfig[statusFilter].label}`} onRemove={() => setStatusFilter(ALL_STATUS)} />}
          {viewFilter !== 'all' && <UiFilterChip label={viewFilterLabels[viewFilter]} onRemove={() => setViewFilter('all')} />}
          {governorateFilter !== 'all' && <UiFilterChip label={`المحافظة: ${governorateFilter}`} onRemove={() => setGovernorateFilter('all')} />}
          {driverFilter !== 'all' && <UiFilterChip label={`المندوب: ${driverFilter === 'unassigned' ? 'غير معين' : driverFilter}`} onRemove={() => setDriverFilter('all')} />}
          {merchantFilter !== 'all' && <UiFilterChip label={`التاجر: ${merchantFilter}`} onRemove={() => setMerchantFilter('all')} />}
          {priorityFilter !== 'all' && <UiFilterChip label={`الأولوية: ${priorityConfig[priorityFilter as keyof typeof priorityConfig].label}`} onRemove={() => setPriorityFilter('all')} />}
          {fromDate && <UiFilterChip label={`من: ${fromDate}`} onRemove={() => { const next = new URLSearchParams(searchParams); next.delete('from'); setSearchParams(next, { replace: true }); }} />}
          {toDate && <UiFilterChip label={`إلى: ${toDate}`} onRemove={() => { const next = new URLSearchParams(searchParams); next.delete('to'); setSearchParams(next, { replace: true }); }} />}
        </div>
      )}

      {checkedShipments.length > 0 && (
        <SelectionBar
          count={checkedShipments.length}
          total={filtered.length}
          totalCod={checkedShipments.reduce((sum, shipment) => sum + shipment.expectedCollection, 0)}
          onAssign={() => setBulkAction('assign')}
          onPrint={() => setBulkAction('print')}
          onStatusChange={() => setBulkAction('status')}
          onClear={() => setCheckedIds([])}
        />
      )}

      {filtered.length === 0 ? (
        <EmptyState title="لا توجد شحنات مطابقة" description="جرّب مسح بعض الفلاتر أو استخدام كلمة بحث مختلفة." actionLabel="مسح كل الفلاتر" onAction={clearFilters} />
      ) : (
        <section className="table-container glass-card">
          <div className="table-wrapper">
            <table className="data-table shipments-table">
              <thead><tr><th><button className="table-check" onClick={toggleAllVisible} aria-label="تحديد كل النتائج الظاهرة">{allVisibleSelected ? <CheckSquare size={17} /> : <Square size={17} />}</button></th><th>رقم الشحنة</th>{visibleColumns.includes('customer') && <th>المستلم</th>}{visibleColumns.includes('merchant') && <th>التاجر</th>}{visibleColumns.includes('area') && <th>المنطقة</th>}{visibleColumns.includes('driver') && <th>المندوب</th>}{visibleColumns.includes('status') && <th>الحالة</th>}{visibleColumns.includes('task') && <th>المطلوب</th>}{visibleColumns.includes('collection') && <th>التحصيل</th>}{visibleColumns.includes('updated') && <th>آخر تحديث</th>}<th>إجراءات</th></tr></thead>
              <tbody>
                {filtered.map((shipment) => (
                  <ShipmentRow
                    key={shipment.id}
                    shipment={shipment}
                    checked={checkedIds.includes(shipment.id)}
                    onToggle={() => setCheckedIds((current) => current.includes(shipment.id) ? current.filter((id) => id !== shipment.id) : [...current, shipment.id])}
                    onOpen={() => openDrawer(shipment.id)}
                    onPrint={() => handlePrint([shipment])}
                    now={now}
                    visibleColumns={visibleColumns}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {selected && (
        <ShipmentDrawer
          shipment={selected}
          relatedShipments={allShipments.filter((item) => item.parentShipmentId === selected.id || (selected.parentShipmentId && item.id === selected.parentShipmentId))}
          attempts={(selected.attempts ?? []).map((attempt) => attempt.note)}
          activeAction={activeAction}
          drivers={driversQuery.drivers}
          onClose={closeDrawer}
          onAction={setActiveAction}
          onCancelAction={() => setActiveAction(null)}
          onSubmitAction={submitShipmentAction}
          onPrint={() => handlePrint([selected])}
        />
      )}

      {bulkAction === 'status' && (
        <BulkStatusDialog
          shipments={checkedShipments}
          onCancel={() => setBulkAction(null)}
          onSubmit={submitBulkStatusChange}
        />
      )}

      {bulkAction && bulkAction !== 'status' && (
        <BulkActionDialog
          action={bulkAction}
          shipments={checkedShipments}
          drivers={driversQuery.drivers}
          onCancel={() => setBulkAction(null)}
          onSubmit={submitBulkAction}
        />
      )}

      {csvPreview && <CsvPreviewDialog preview={csvPreview} onCancel={() => setCsvPreview(null)} onConfirm={confirmImport} />}

      {columnsOpen && <Modal title="تخصيص أعمدة الجدول" description="اختر المعلومات التي تظهر في جدول الشحنات. يتم حفظ الاختيار على هذا الجهاز." onClose={() => setColumnsOpen(false)} footer={<><button className="outline-btn" onClick={() => persistColumns(defaultColumns)}>إظهار الكل</button><button className="btn-primary" onClick={() => setColumnsOpen(false)}>تم</button></>}><div className="column-picker">{shipmentColumns.map((column) => <label key={column.id}><input type="checkbox" checked={visibleColumns.includes(column.id)} onChange={() => persistColumns(visibleColumns.includes(column.id) ? visibleColumns.filter((item) => item !== column.id) : [...visibleColumns, column.id])}/><span>{column.label}</span></label>)}</div></Modal>}
      {saveViewOpen && <Modal title="حفظ الفلترة الحالية كاختصار" description="سيتم حفظ الفلاتر والبحث والأعمدة المحددة حالياً لتطبيقها بضغطة زر واحدة في أي وقت." onClose={() => setSaveViewOpen(false)} footer={<><button className="outline-btn" onClick={() => setSaveViewOpen(false)}>إلغاء</button><button className="btn-primary" onClick={saveCurrentView}>حفظ الاختصار</button></>}><label className="dialog-field"><span>اسم الفلتر المحفوظ</span><input className="input-glass" autoFocus value={viewName} onChange={(event) => setViewName(event.target.value)} placeholder="مثال: شحنات الجيزة المتأخرة" /></label>{savedViews.length > 0 && <div className="saved-views-manager"><strong>الفلاتر المحفوظة مسبقاً</strong>{savedViews.map((view) => <div key={view.id}><button onClick={() => { applySavedView(view.id); setSaveViewOpen(false); }}>{view.name}</button><button className="danger-link" onClick={() => deleteSavedView(view.id)}>حذف</button></div>)}</div>}</Modal>}


      {printTargets.length > 0 && <ShipmentLabelsPreview shipments={printTargets} settings={delivery.state?.settings.printing} onClose={() => { setPrintTargets([]); setToast('تم تجهيز البوالص للطباعة.'); }} />}
      {toast && <div className="shipment-toast" role="status"><CheckCircle2 size={16} /><span>{toast}</span><button onClick={() => setToast(null)} aria-label="إغلاق الرسالة"><X size={14} /></button></div>}
    </div>
  );
}

function isShipmentStatus(value: string | null): value is ShipmentStatus {
  return value !== null && statusOptions.some((item) => item.value === value && value !== ALL_STATUS);
}

function isViewFilter(value: string | null): value is ViewFilter {
  return value === 'all' || value === 'unassigned' || value === 'delayed' || value === 'financial-review';
}

const viewFilterLabels: Record<ViewFilter, string> = {
  all: 'كل المشاهدات',
  unassigned: 'شحنات بلا مندوب',
  delayed: 'الشحنات المتأخرة',
  'financial-review': 'تحتاج مراجعة مالية',
};
