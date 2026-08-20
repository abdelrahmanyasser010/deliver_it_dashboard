"use client";

import React, { useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useDashboard } from "@/context/DashboardContext";
import { CreditCard, FileText, Percent, Plus, RefreshCw, RotateCcw, TrendingUp, Wallet } from "lucide-react";

function money(value: number | undefined, currency = "SAR") {
  return `${(value ?? 0).toLocaleString("ar-SA")} ${currency}`;
}

function StatusBadge({ status }: { status?: string | null }) {
  const cls =
    status === "paid"
      ? "badge-green"
      : status === "partial"
        ? "badge-orange"
        : status === "cancelled"
          ? "badge-gray"
          : "badge-red";

  const label = status === "paid" ? "مدفوعة" : status === "partial" ? "مدفوعة جزئيًا" : status === "cancelled" ? "ملغاة" : "غير مدفوعة";
  return <span className={`badge ${cls}`}>{label}</span>;
}

export default function FinancePage() {
  const {
    financeSummary,
    financeInvoices,
    financePayments,
    financeDiscounts,
    financeRefunds,
    students,
    refreshDashboardData,
    createFinanceInvoiceForStudent,
    recordFinancePayment,
    createFinanceDiscountForStudent,
    cancelFinanceInvoice,
    archiveFinanceDiscount,
    createFinanceRefundForPayment,
  } = useDashboard();
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [financeAmount, setFinanceAmount] = useState("500");
  const [financeTitle, setFinanceTitle] = useState("رسوم دراسية");

  const backendStudents = useMemo(() => students.filter((student) => /^\d+$/.test(student.id)), [students]);
  const effectiveStudentId = selectedStudentId || backendStudents[0]?.id || students[0]?.id || "";
  const payableInvoice = financeInvoices.find((invoice) => /^\d+$/.test(invoice.id) && (invoice.remaining ?? invoice.total ?? 0) > 0);
  const refundablePayment = financePayments.find((payment) => /^\d+$/.test(payment.id) && (payment.amount ?? 0) > 0);
  const amountValue = Number(financeAmount);

  const currency = financeSummary?.currency ?? financeInvoices[0]?.currency ?? "SAR";
  const totalDue = financeSummary?.total_due ?? financeInvoices.reduce((sum, item) => sum + (item.total ?? 0), 0);
  const totalPaid = financeSummary?.total_paid ?? financeInvoices.reduce((sum, item) => sum + (item.paid ?? 0), 0);
  const overdueAmount = financeSummary?.overdue_amount ?? financeInvoices.reduce((sum, item) => sum + (item.remaining ?? 0), 0);

  const handleRefundPayment = (paymentId: string, maxAmount: number | undefined) => {
    const amountText = window.prompt("قيمة المبلغ المسترد", String(maxAmount ?? amountValue));
    if (!amountText) return;
    const refundAmount = Number(amountText);
    if (!Number.isFinite(refundAmount) || refundAmount <= 0) return;
    const reason = window.prompt("سبب الاسترداد", "طلب استرداد");
    if (!reason) return;
    void createFinanceRefundForPayment(paymentId, refundAmount, reason);
  };

  return (
    <div className="dashboard-shell">
      <Sidebar />
      <div className="main-content">
        <Header
          title="المالية والفواتير"
          subtitle="إدارة الفواتير والتحصيل والخصومات والاستردادات"
        />
        <main className="page-body">
          <div className="kpi-grid" style={{ marginBottom: 24 }}>
            {[
              { label: "إجمالي المستحق", value: money(totalDue, currency), icon: <Wallet size={22} />, bg: "#EFF6FF", color: "#176B9A" },
              { label: "إجمالي المحصل", value: money(totalPaid, currency), icon: <CreditCard size={22} />, bg: "#F0FDF4", color: "#16A34A" },
              { label: "متأخرات", value: money(overdueAmount, currency), icon: <TrendingUp size={22} />, bg: "#FFF7ED", color: "#F59E0B" },
              { label: "نسبة التحصيل", value: `${financeSummary?.collection_rate ?? 0}%`, icon: <Percent size={22} />, bg: "#F8F4FF", color: "#8B5CF6" },
            ].map((stat) => (
              <div key={stat.label} className="kpi-card">
                <div className="kpi-icon" style={{ background: stat.bg, color: stat.color }}>{stat.icon}</div>
                <div className="kpi-content">
                  <div className="kpi-value" style={{ fontSize: 19 }}>{stat.value}</div>
                  <div className="kpi-label">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <div>
                <div className="card-title">إجراءات مالية</div>
                <div className="card-subtitle">إنشاء الفواتير وتسجيل المدفوعات والخصومات</div>
              </div>

            </div>
            <div className="card-body">
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 0.8fr", gap: 10, marginBottom: 12 }}>
                <select className="form-select" value={effectiveStudentId} onChange={(event) => setSelectedStudentId(event.target.value)}>
                  {(backendStudents.length ? backendStudents : students).slice(0, 30).map((student) => (
                    <option key={student.id} value={student.id}>{student.name} - {student.studentCode}</option>
                  ))}
                </select>
                <input className="form-input" value={financeTitle} onChange={(event) => setFinanceTitle(event.target.value)} placeholder="عنوان الفاتورة أو الخصم" />
                <input className="form-input" type="number" min="1" value={financeAmount} onChange={(event) => setFinanceAmount(event.target.value)} placeholder="المبلغ" />
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn btn-primary btn-sm" onClick={() => void createFinanceInvoiceForStudent(effectiveStudentId, financeTitle, amountValue)}>
                  <Plus size={14} /> إنشاء فاتورة
                </button>
                <button
                  className="btn btn-green btn-sm"
                  disabled={!payableInvoice}
                  onClick={() => payableInvoice && void recordFinancePayment(payableInvoice.id, Math.min(amountValue, payableInvoice.remaining ?? payableInvoice.total ?? amountValue))}
                >
                  <CreditCard size={14} /> تسجيل دفعة لأول فاتورة مفتوحة
                </button>
                <button className="btn btn-outline btn-sm" onClick={() => void createFinanceDiscountForStudent(effectiveStudentId, financeTitle, amountValue)}>
                  <Percent size={14} /> إضافة خصم
                </button>
              </div>
            </div>
          </div>

          {refundablePayment && (
            <div className="card" style={{ marginBottom: 20, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 13 }}>استرداد دفعة</div>
                <div style={{ fontSize: 12, color: "var(--text-light)" }}>يمكن تسجيل استرداد على دفعة محفوظة مع توضيح السبب.</div>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => handleRefundPayment(refundablePayment.id, Math.min(amountValue, refundablePayment.amount ?? amountValue))}>
                <RotateCcw size={14} /> تسجيل استرداد
              </button>
            </div>
          )}

          <div className="grid-2" style={{ marginBottom: 20 }}>
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">الفواتير</div>
                  <div className="card-subtitle">الفواتير المسجلة وحالة التحصيل</div>
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => void refreshDashboardData()}>
                  <RefreshCw size={14} /> تحديث
                </button>
              </div>
              <div>
                {financeInvoices.slice(0, 8).map((invoice, index) => (
                  <div key={invoice.id} className="feed-item" style={{ borderBottom: index < Math.min(financeInvoices.length, 8) - 1 ? "1px solid var(--border-light)" : "none" }}>
                    <div style={{ width: 40, height: 40, borderRadius: "var(--radius-sm)", background: "var(--primary-50)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)" }}>
                      <FileText size={18} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 4 }}>
                        <strong>{invoice.invoice_number ?? invoice.id}</strong>
                        <StatusBadge status={invoice.status} />
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-light)" }}>{invoice.student_name ?? "طالب غير محدد"} - {invoice.parent_name ?? "ولي أمر غير محدد"}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 5 }}>
                        الإجمالي: {money(invoice.total, invoice.currency ?? currency)} - المتبقي: {money(invoice.remaining, invoice.currency ?? currency)}
                      </div>
                      {invoice.status !== "cancelled" && (
                        <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => void cancelFinanceInvoice(invoice.id)}>
                          إلغاء الفاتورة
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {financeInvoices.length === 0 && <div style={{ padding: 18, color: "var(--text-light)", fontSize: 13 }}>لا توجد فواتير مسجلة بعد.</div>}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">المدفوعات والخصومات</div>
                  <div className="card-subtitle">آخر المدفوعات والخصومات والاستردادات</div>
                </div>
              </div>
              <div style={{ display: "grid", gap: 14 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 8 }}>آخر المدفوعات</div>
                  {financePayments.slice(0, 5).map((payment) => (
                    <div key={payment.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border-light)", fontSize: 12.5 }}>
                      <span>{payment.invoice_number ?? payment.invoice_id}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <strong>{money(payment.amount, currency)}</strong>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleRefundPayment(payment.id, payment.amount)}>
                          <RotateCcw size={12} /> استرداد
                        </button>
                      </div>
                    </div>
                  ))}
                  {financePayments.length === 0 && <div style={{ color: "var(--text-light)", fontSize: 12 }}>لا توجد مدفوعات محملة.</div>}
                </div>

                <div>
                  <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 8 }}>الخصومات النشطة</div>
                  {financeDiscounts.slice(0, 5).map((discount) => (
                    <div key={discount.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border-light)", fontSize: 12.5 }}>
                      <span>{discount.title ?? discount.student_name ?? discount.id}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <strong>{money(discount.amount, currency)}</strong>
                        {discount.status !== "archived" && (
                          <button className="btn btn-ghost btn-sm" onClick={() => void archiveFinanceDiscount(discount.id)}>
                            أرشفة
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {financeDiscounts.length === 0 && <div style={{ color: "var(--text-light)", fontSize: 12 }}>لا توجد خصومات محملة.</div>}
                </div>

                <div>
                  <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 8 }}>الاستردادات</div>
                  {financeRefunds.slice(0, 5).map((refund) => (
                    <div key={refund.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border-light)", fontSize: 12.5 }}>
                      <span>{refund.reason ?? refund.reference ?? refund.id}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="badge badge-blue">{refund.status === "completed" ? "مكتمل" : refund.status === "failed" ? "فشل" : "مسجل"}</span>
                        <strong>{money(refund.amount, refund.currency ?? currency)}</strong>
                      </div>
                    </div>
                  ))}
                  {financeRefunds.length === 0 && <div style={{ color: "var(--text-light)", fontSize: 12 }}>لا توجد استردادات مسجلة بعد.</div>}
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
