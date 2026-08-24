import {
  Banknote,
  CheckCircle2,
  Download,
  Eye,
  FileCheck,
  FileWarning,
  FilterX,
  Plus,
  Search,
  Send,
  WalletCards,
  Zap,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Modal, SectionHeader, StatusBadge } from '../components/ui/Ui';
import { useDeliveryData } from '../context/DeliveryDataContext';
import { useWorkspace } from '../context/WorkspaceContext';
import type { MerchantSettlementStatus } from '../domain/finance/entities';
import type { Shipment } from '../domain/logistics/entities';
import { downloadXlsx } from '../utils/exportSpreadsheet';
import { formatCurrency } from '../utils/helpers';
import './AdminOperations.css';

const statusLabels: Record<MerchantSettlementStatus, string> = {
  draft: 'مسودة',
  underReview: 'تحت المراجعة',
  approved: 'معتمدة',
  paid: 'مدفوعة',
  reconciled: 'مطابقة',
  disputed: 'عليها اعتراض',
  cancelled: 'ملغاة',
};

const statusTone = (status: MerchantSettlementStatus): 'success' | 'warning' | 'danger' | 'info' | 'neutral' =>
  ['paid', 'reconciled'].includes(status)
    ? 'success'
    : status === 'approved'
      ? 'info'
      : ['disputed', 'cancelled'].includes(status)
        ? 'danger'
        : 'warning';

export function SettlementsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { state, execute } = useDeliveryData();
  const { showToast } = useWorkspace();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | MerchantSettlementStatus>('all');
  const detailsId = searchParams.get('settlement');
  const [paymentReference, setPaymentReference] = useState('INSTAPAY-TXN-001');
  const [bulkApproveOpen, setBulkApproveOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const settlements = useMemo(() => state?.settlements ?? [], [state?.settlements]);
  const shipments = useMemo(() => state?.shipments ?? [], [state?.shipments]);
  const merchants = useMemo(() => state?.merchants ?? [], [state?.merchants]);

  const details = settlements.find((item) => item.id === detailsId) ?? null;

  const openDetails = (id: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (id) next.set('settlement', id);
    else next.delete('settlement');
    setSearchParams(next, { replace: true });
  };

  const filtered = useMemo(
    () =>
      settlements.filter(
        (item) =>
          (status === 'all' || item.status === status) &&
          (!query ||
            `${item.id} ${item.merchantName} ${item.paymentReference ?? ''}`
              .toLocaleLowerCase('ar-EG')
              .includes(query.toLocaleLowerCase('ar-EG')))
      ),
    [settlements, query, status]
  );

  const pending = settlements
    .filter((item) => ['draft', 'underReview', 'approved'].includes(item.status))
    .reduce((sum, item) => sum + item.netPayable, 0);
  const paid = settlements
    .filter((item) => ['paid', 'reconciled'].includes(item.status))
    .reduce((sum, item) => sum + item.netPayable, 0);
  const discrepancies = settlements
    .filter((item) => item.adjustments !== 0 || item.status === 'disputed')
    .reduce((sum, item) => sum + Math.abs(item.adjustments), 0);

  const run = async (command: Parameters<typeof execute>[0]) => {
    const result = await execute(command);
    showToast(result.message, result.ok ? 'success' : 'danger');
    return result;
  };

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

  const handleCreateSettlement = async (shipmentIds: string[], instantPayRef?: string) => {
    const res = await run({ type: 'settlement/create', shipmentIds });
    if (res.ok) {
      if (instantPayRef && res.createdId) {
        const settlementId = res.createdId;
        await run({ type: 'settlement/approve', settlementId });
        await run({ type: 'settlement/pay', settlementId, paymentReference: instantPayRef });
      }
      setCreateOpen(false);
    }
  };

  return (
    <div className="admin-page settlements-v2">
      <SectionHeader
        title="التسويات والتحصيلات"
        description="تسويات التاجر، اعتماد مستحقات الشحن، والصرف المباشر الفوري أو المرحلي."
        actions={
          <>
            <button className="btn-primary" onClick={() => setCreateOpen(true)}>
              <Plus size={16} /> إنشاء تسوية تاجر
            </button>
            <button className="outline-btn" onClick={exportRows}>
              <Download size={16} /> تصدير Excel
            </button>
          </>
        }
      />

      <div className="admin-summary-grid">
        <SummaryCard
          label="قيد المراجعة أو الدفع"
          value={formatCurrency(pending)}
          icon={<Banknote size={20} />}
          gradient="linear-gradient(135deg,#F59E0B,#D97706)"
        />
        <SummaryCard
          label="تم صرفه ودفعه"
          value={formatCurrency(paid)}
          icon={<CheckCircle2 size={20} />}
          gradient="linear-gradient(135deg,#10B981,#059669)"
        />
        <SummaryCard
          label="فروقات"
          value={formatCurrency(discrepancies)}
          icon={<FileWarning size={20} />}
          gradient="linear-gradient(135deg,#EF4444,#B91C1C)"
        />
        <SummaryCard
          label="عدد التسويات"
          value={settlements.length.toLocaleString('ar-EG')}
          icon={<WalletCards size={20} />}
          gradient="linear-gradient(135deg,#0EA5E9,#4F46E5)"
        />
      </div>

      <section className="glass-card">
        <div className="settlement-toolbar">
          <div className="management-search">
            <Search size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="رقم التسوية أو التاجر أو المرجع"
            />
          </div>
          <select
            className="input-glass"
            value={status}
            onChange={(event) => setStatus(event.target.value as typeof status)}
          >
            <option value="all">كل الحالات</option>
            {Object.entries(statusLabels).map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>
          <button
            className="outline-btn"
            onClick={() => {
              setQuery('');
              setStatus('all');
            }}
          >
            <FilterX size={15} /> مسح
          </button>
          <button
            className="btn-primary"
            disabled={!selectedIds.length}
            onClick={() => setBulkApproveOpen(true)}
          >
            <CheckCircle2 size={16} /> مراجعة واعتماد المحدد ({selectedIds.length})
          </button>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>تحديد</th>
                <th>الرقم</th>
                <th>التاجر</th>
                <th>الفترة</th>
                <th>الشحنات</th>
                <th>التحصيل</th>
                <th>الرسوم</th>
                <th>الصافي</th>
                <th>الحالة</th>
                <th>مرجع الدفع</th>
                <th style={{ textAlign: 'center' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td>
                    <input
                      type="checkbox"
                      disabled={!['draft', 'underReview'].includes(item.status)}
                      checked={selectedIds.includes(item.id)}
                      onChange={() =>
                        setSelectedIds((ids) =>
                          ids.includes(item.id) ? ids.filter((id) => id !== item.id) : [...ids, item.id]
                        )
                      }
                    />
                  </td>
                  <td className="tracking-num">{item.id}</td>
                  <td>{item.merchantName}</td>
                  <td>
                    {new Date(item.periodStart).toLocaleDateString('ar-EG')} —{' '}
                    {new Date(item.periodEnd).toLocaleDateString('ar-EG')}
                  </td>
                  <td>{item.shipmentIds.length.toLocaleString('ar-EG')}</td>
                  <td>{formatCurrency(item.grossCollection)}</td>
                  <td>{formatCurrency(item.shippingFees + item.returnFees + item.discounts)}</td>
                  <td className="amount">{formatCurrency(item.netPayable)}</td>
                  <td>
                    <StatusBadge label={statusLabels[item.status]} tone={statusTone(item.status)} />
                  </td>
                  <td style={{ fontSize: '0.78rem', color: item.paymentReference ? '#38BDF8' : 'var(--text-muted)' }}>
                    {item.paymentReference || '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', alignItems: 'center' }}>
                      <button
                        className="btn-icon sm"
                        onClick={() => openDetails(item.id)}
                        aria-label={`تفاصيل ${item.id}`}
                        title="عرض التفاصيل"
                      >
                        <Eye size={14} />
                      </button>

                      {['draft', 'underReview'].includes(item.status) && (
                        <button
                          className="outline-btn sm"
                          style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem', borderColor: '#38BDF8', color: '#38BDF8' }}
                          onClick={() => void run({ type: 'settlement/approve', settlementId: item.id })}
                          title="اعتماد مباشر"
                        >
                          <CheckCircle2 size={13} /> اعتماد
                        </button>
                      )}

                      {item.status === 'approved' && (
                        <button
                          className="btn-primary sm"
                          style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem', background: 'linear-gradient(135deg, #10B981, #059669)' }}
                          onClick={() => openDetails(item.id)}
                          title="صرف وتسجيل الدفع"
                        >
                          <Send size={13} /> صرف
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Bulk Approve Modal */}
      {bulkApproveOpen && (
        <Modal
          title="مراجعة اعتماد تسويات التجار"
          description={`سيتم اعتماد ${selectedIds.length.toLocaleString('ar-EG')} تسوية بإجمالي ${formatCurrency(selectedTotal)}.`}
          onClose={() => setBulkApproveOpen(false)}
          footer={
            <>
              <button className="outline-btn" onClick={() => setBulkApproveOpen(false)}>
                إلغاء
              </button>
              <button
                className="btn-primary"
                disabled={!selectedIds.length}
                onClick={() => void approveSelected()}
              >
                <CheckCircle2 size={15} /> تأكيد الاعتماد
              </button>
            </>
          }
        >
          <div className="settlement-detail-grid">
            {selectedSettlements.slice(0, 8).map((item) => (
              <div key={item.id}>
                <span>
                  {item.id} · {item.merchantName}
                </span>
                <strong>{formatCurrency(item.netPayable)}</strong>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* Settlement Details Modal */}
      {details && (
        <Modal
          wide
          title={`التسوية ${details.id}`}
          description={`${details.merchantName} — ${details.shipmentIds.length.toLocaleString('ar-EG')} شحنة`}
          onClose={() => openDetails(null)}
          footer={
            <>
              <button className="outline-btn" onClick={() => openDetails(null)}>
                إغلاق
              </button>
              {['draft', 'underReview'].includes(details.status) && (
                <button
                  className="btn-primary"
                  onClick={async () => {
                    const result = await run({ type: 'settlement/approve', settlementId: details.id });
                    if (result.ok) openDetails(null);
                  }}
                >
                  <CheckCircle2 size={15} /> اعتماد التسوية
                </button>
              )}
              {details.status === 'approved' && (
                <button
                  className="btn-primary"
                  style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
                  disabled={!paymentReference.trim()}
                  onClick={async () => {
                    const result = await run({
                      type: 'settlement/pay',
                      settlementId: details.id,
                      paymentReference: paymentReference.trim(),
                    });
                    if (result.ok) openDetails(null);
                  }}
                >
                  <Send size={15} /> تأكيد وصرف الدفعة للتاجر
                </button>
              )}
            </>
          }
        >
          <div className="settlement-detail-grid">
            <div>
              <span>إجمالي التحصيل</span>
              <strong>{formatCurrency(details.grossCollection)}</strong>
            </div>
            <div>
              <span>رسوم الشحن والمرتجع</span>
              <strong>{formatCurrency(details.shippingFees + details.returnFees)}</strong>
            </div>
            <div>
              <span>الخصومات والتعديلات</span>
              <strong>{formatCurrency(details.discounts + details.adjustments)}</strong>
            </div>
            <div>
              <span>صافي المستحق للتاجر</span>
              <strong style={{ color: '#34D399' }}>{formatCurrency(details.netPayable)}</strong>
            </div>
          </div>

          {details.status === 'approved' && (
            <label className="form-field" style={{ marginTop: '1rem' }}>
              <span>مرجع التحويل البنكي / المحفظة / الخزينة (Payment Reference)</span>
              <input
                className="input-glass"
                value={paymentReference}
                onChange={(event) => setPaymentReference(event.target.value)}
                placeholder="مثال: INSTAPAY-98421 أو CIB-TR-01"
              />
            </label>
          )}

          {details.status === 'paid' && details.paymentReference && (
            <div
              style={{
                marginTop: '1rem',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                color: '#6EE7B7',
                fontSize: '0.82rem',
              }}
            >
              ✅ تم الصرف والتحويل للتاجر بالمرجع: <strong>{details.paymentReference}</strong>
            </div>
          )}

          <div className="table-wrapper" style={{ marginTop: '1rem', maxHeight: '250px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>الشحنة</th>
                  <th>التحصيل</th>
                  <th>الشحن</th>
                  <th>مرتجع</th>
                  <th>خصم</th>
                  <th>الصافي</th>
                </tr>
              </thead>
              <tbody>
                {details.lines.map((line) => (
                  <tr key={line.shipmentId}>
                    <td>
                      <button
                        className="tracking-link"
                        onClick={() => navigate(`/shipments?shipment=${line.shipmentId}`)}
                      >
                        {line.shipmentId}
                      </button>
                    </td>
                    <td>{formatCurrency(line.grossCollection)}</td>
                    <td>{formatCurrency(line.shippingFee)}</td>
                    <td>{formatCurrency(line.returnFee)}</td>
                    <td>{formatCurrency(line.discount)}</td>
                    <td>{formatCurrency(line.netPayable)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}

      {/* Create Settlement Dialog */}
      {createOpen && (
        <CreateMerchantSettlementDialog
          merchants={merchants.map((m) => ({ id: m.id, name: m.name }))}
          shipments={shipments}
          onClose={() => setCreateOpen(false)}
          onSubmit={handleCreateSettlement}
        />
      )}
    </div>
  );
}

function CreateMerchantSettlementDialog({
  merchants,
  shipments,
  onClose,
  onSubmit,
}: {
  merchants: Array<{ id: string; name: string }>;
  shipments: Shipment[];
  onClose: () => void;
  onSubmit: (shipmentIds: string[], instantPayRef?: string) => Promise<void>;
}) {
  const [selectedMerchantId, setSelectedMerchantId] = useState(merchants[0]?.id ?? '');
  const [payoutMode, setPayoutMode] = useState<'instant' | 'review'>('instant');
  const [paymentRef, setPaymentRef] = useState('INSTAPAY-001');
  const [submitting, setSubmitting] = useState(false);

  const eligibleShipments = useMemo(() => {
    return shipments.filter(
      (s) =>
        (s.merchantId === selectedMerchantId ||
          s.merchantName === merchants.find((m) => m.id === selectedMerchantId)?.name) &&
        ['delivered', 'partiallyDelivered', 'returned'].includes(s.status) &&
        s.settlementStatus === 'unsettled'
    );
  }, [shipments, selectedMerchantId, merchants]);

  const [selectedIds, setSelectedIds] = useState<string[]>(() => eligibleShipments.map((s) => s.id));

  const toggle = (id: string) =>
    setSelectedIds((items) => (items.includes(id) ? items.filter((x) => x !== id) : [...items, id]));
  const selectAll = () => setSelectedIds(eligibleShipments.map((s) => s.id));
  const deselectAll = () => setSelectedIds([]);

  const selectedRows = eligibleShipments.filter((s) => selectedIds.includes(s.id));
  const totalCod = selectedRows.reduce((sum, s) => sum + s.collectedCash, 0);
  const totalNet = selectedRows.reduce(
    (sum, s) =>
      sum +
      (s.status === 'returned'
        ? -Math.round(s.deliveryFee * 0.6)
        : Math.max(0, s.collectedCash - s.deliveryFee - s.discount)),
    0
  );

  const handleConfirm = async () => {
    if (!selectedIds.length) return;
    setSubmitting(true);
    try {
      if (payoutMode === 'instant') {
        await onSubmit(selectedIds, paymentRef.trim() || 'CASH-PAYOUT');
      } else {
        await onSubmit(selectedIds);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      wide
      title="إنشاء تسوية تاجر جديدة"
      description="إنشاء تسوية وصرف مستحقات التاجر الفورية بناءً على الشحنات المسلمة أو المرتجعة."
      onClose={onClose}
      footer={
        <>
          <button className="outline-btn" onClick={onClose} disabled={submitting}>
            إلغاء
          </button>
          <button
            className="btn-primary"
            style={
              payoutMode === 'instant'
                ? { background: 'linear-gradient(135deg, #10B981, #059669)' }
                : undefined
            }
            disabled={!selectedIds.length || submitting}
            onClick={handleConfirm}
          >
            {payoutMode === 'instant' ? <Zap size={15} /> : <CheckCircle2 size={15} />}
            {submitting
              ? 'جارٍ التنفيذ…'
              : payoutMode === 'instant'
                ? `⚡ إنشاء وصرف فوري للتاجر (${selectedIds.length} شحنة — ${formatCurrency(totalNet)})`
                : `إنشاء كمسودة للمراجعة (${selectedIds.length} شحنة)`}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
        {/* Merchant Selector */}
        <label className="form-field">
          <span>اختر التاجر</span>
          <select
            className="input-glass"
            value={selectedMerchantId}
            onChange={(e) => {
              setSelectedMerchantId(e.target.value);
              const mName = merchants.find((m) => m.id === e.target.value)?.name;
              const nextEligible = shipments.filter(
                (s) =>
                  (s.merchantId === e.target.value || s.merchantName === mName) &&
                  ['delivered', 'partiallyDelivered', 'returned'].includes(s.status) &&
                  s.settlementStatus === 'unsettled'
              );
              setSelectedIds(nextEligible.map((s) => s.id));
            }}
          >
            {merchants.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>

        {/* Workflow Mode Selector */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
          <div
            onClick={() => setPayoutMode('instant')}
            style={{
              padding: '0.85rem 1rem',
              borderRadius: '14px',
              cursor: 'pointer',
              border: payoutMode === 'instant' ? '1.5px solid #10B981' : '1px solid rgba(255,255,255,0.08)',
              background: payoutMode === 'instant' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255,255,255,0.02)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.65rem',
            }}
          >
            <Zap size={20} color={payoutMode === 'instant' ? '#10B981' : '#94A3B8'} />
            <div>
              <strong style={{ color: payoutMode === 'instant' ? '#34D399' : '#FFFFFF', fontSize: '0.88rem' }}>
                ⚡ إنشاء وصرف فوري (للمدير)
              </strong>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.74rem', color: '#94A3B8' }}>
                إنشاء التسوية واعتمادها وصرفها فوراً وتحديث محفظة التاجر بضغطة زر واحدة.
              </p>
            </div>
          </div>

          <div
            onClick={() => setPayoutMode('review')}
            style={{
              padding: '0.85rem 1rem',
              borderRadius: '14px',
              cursor: 'pointer',
              border: payoutMode === 'review' ? '1.5px solid #38BDF8' : '1px solid rgba(255,255,255,0.08)',
              background: payoutMode === 'review' ? 'rgba(14, 165, 233, 0.12)' : 'rgba(255,255,255,0.02)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.65rem',
            }}
          >
            <FileCheck size={20} color={payoutMode === 'review' ? '#38BDF8' : '#94A3B8'} />
            <div>
              <strong style={{ color: payoutMode === 'review' ? '#38BDF8' : '#FFFFFF', fontSize: '0.88rem' }}>
                📋 مسودة للمراجعة المحاسبية
              </strong>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.74rem', color: '#94A3B8' }}>
                إنشاء التسوية كمسودة ليقوم المحاسب بمراجعتها واعتمادها لاحقاً.
              </p>
            </div>
          </div>
        </div>

        {/* Payment Reference if Instant Payout */}
        {payoutMode === 'instant' && (
          <label className="form-field" style={{ animation: 'fadeIn 0.2s ease' }}>
            <span>مرجع التحويل / كود الحوالة (Payment Reference)</span>
            <input
              className="input-glass"
              value={paymentRef}
              onChange={(e) => setPaymentRef(e.target.value)}
              placeholder="مثال: INSTAPAY-98421 أو تحويل بنكي CIB أو نقداً بالخزينة"
            />
          </label>
        )}

        {/* KPIs */}
        <div className="report-kpi-grid">
          <div className="report-kpi glass-card">
            <div>
              <p className="report-kpi-label">الشحنات المؤهلة</p>
              <p className="report-kpi-value">{eligibleShipments.length.toLocaleString('ar-EG')}</p>
            </div>
          </div>
          <div className="report-kpi glass-card" style={{ borderColor: 'rgba(14,165,233,0.4)' }}>
            <div>
              <p className="report-kpi-label">المحدد للتسوية</p>
              <p className="report-kpi-value" style={{ color: '#38BDF8' }}>
                {selectedIds.length.toLocaleString('ar-EG')}
              </p>
            </div>
          </div>
          <div className="report-kpi glass-card">
            <div>
              <p className="report-kpi-label">إجمالي التحصيل COD</p>
              <p className="report-kpi-value">{formatCurrency(totalCod)}</p>
            </div>
          </div>
          <div className="report-kpi glass-card" style={{ borderColor: 'rgba(16,185,129,0.4)' }}>
            <div>
              <p className="report-kpi-label">صافي المستحق للتاجر</p>
              <p className="report-kpi-value" style={{ color: '#34D399' }}>
                {formatCurrency(totalNet)}
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.2rem' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            حدد الشحنات المراد تضمينها في هذه التسوية:
          </span>
          <button
            type="button"
            className="outline-btn"
            style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
            onClick={selectedIds.length === eligibleShipments.length ? deselectAll : selectAll}
          >
            {selectedIds.length === eligibleShipments.length ? 'إلغاء تحديد الكل' : 'تحديد كل الشحنات'}
          </button>
        </div>

        {/* Shipments Checklist Table */}
        <div className="table-wrapper" style={{ maxHeight: '240px', overflowY: 'auto' }}>
          <table className="data-table compact-table">
            <thead>
              <tr>
                <th style={{ width: '36px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.length === eligibleShipments.length && eligibleShipments.length > 0}
                    onChange={() => (selectedIds.length === eligibleShipments.length ? deselectAll() : selectAll())}
                  />
                </th>
                <th>رقم الشحنة</th>
                <th>المستلم</th>
                <th>المحافظة</th>
                <th>الحالة</th>
                <th>تحصيل COD</th>
                <th>رسوم الشحن</th>
                <th>الصافي</th>
              </tr>
            </thead>
            <tbody>
              {eligibleShipments.length ? (
                eligibleShipments.map((s) => {
                  const isChecked = selectedIds.includes(s.id);
                  const net =
                    s.status === 'returned'
                      ? -Math.round(s.deliveryFee * 0.6)
                      : Math.max(0, s.collectedCash - s.deliveryFee - s.discount);
                  return (
                    <tr
                      key={s.id}
                      onClick={() => toggle(s.id)}
                      style={{ cursor: 'pointer', background: isChecked ? 'rgba(14, 165, 233, 0.08)' : undefined }}
                    >
                      <td style={{ textAlign: 'center' }}>
                        <input type="checkbox" checked={isChecked} onChange={() => {}} />
                      </td>
                      <td className="tracking-num">{s.id}</td>
                      <td>{s.customerName || 'عميل'}</td>
                      <td>{s.governorate || '—'}</td>
                      <td>{s.status === 'returned' ? 'مرتجع' : 'تم التسليم'}</td>
                      <td>{formatCurrency(s.collectedCash)}</td>
                      <td>{formatCurrency(s.deliveryFee)}</td>
                      <td className="amount" style={{ color: net >= 0 ? '#10B981' : '#EF4444', fontWeight: 700 }}>
                        {formatCurrency(net)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                    لا توجد شحنات غير مسوّاة لهذا التاجر حالياً.
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

function SummaryCard({
  label,
  value,
  icon,
  gradient,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  gradient: string;
}) {
  return (
    <div className="admin-summary-card glass-card">
      <div className="admin-summary-icon" style={{ background: gradient }}>
        {icon}
      </div>
      <div>
        <p className="admin-summary-label">{label}</p>
        <p className="admin-summary-value">{value}</p>
      </div>
    </div>
  );
}
