"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useDashboard } from "@/context/DashboardContext";
import {
  DashboardDailyAttendance,
  DashboardDailyAttendanceStudent,
  DashboardAttendanceRiskResult,
  dashboardErrorMessage,
  fetchDashboardAttendanceAtRisk,
  fetchDashboardDailyAttendance,
} from "@/lib/dashboardApi";
import { AlertTriangle, CheckCircle2, Clock3, FileCheck2, X } from "lucide-react";

const statusLabel: Record<string, string> = {
  has_absence: "لديه غياب",
  full_day_absence: "غياب كامل اليوم",
  excused: "غياب بعذر",
  late: "لديه تأخر",
  complete: "مكتمل الحضور",
  incomplete: "الرصد غير مكتمل",
};

const periodLabel: Record<string, string> = {
  present: "حاضر",
  absent: "غائب",
  late: "متأخر",
  excused: "بعذر",
  not_recorded: "لم يتم الرصد",
};

export default function AttendancePage() {
  const { sections, selectedAcademicTermId, sendParentWarning, medicalExcuses, showToast, apiStatus } = useDashboard();
  const [sectionId, setSectionId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [filterStatus, setFilterStatus] = useState("");
  const [query, setQuery] = useState("");
  const [daily, setDaily] = useState<DashboardDailyAttendance | null>(null);
  const [risk, setRisk] = useState<DashboardAttendanceRiskResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<DashboardDailyAttendanceStudent | null>(null);
  const pendingExcuses = medicalExcuses.filter((item) => item.status === "pending").length;

  useEffect(() => {
    if (apiStatus !== "live") return;
    let cancelled = false;
    setLoading(true);
    void fetchDashboardDailyAttendance({
      date,
      ...(sectionId ? { section_id: sectionId } : {}),
      ...(filterStatus ? { status: filterStatus } : {}),
      ...(query.trim() ? { q: query.trim() } : {}),
    })
      .then((value) => { if (!cancelled) setDaily(value); })
      .catch((error) => { if (!cancelled) showToast("الحضور والغياب", dashboardErrorMessage(error), "error"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [apiStatus, date, sectionId, filterStatus, query, showToast]);

  useEffect(() => {
    if (apiStatus !== "live" || !selectedAcademicTermId) return;
    let cancelled = false;
    void fetchDashboardAttendanceAtRisk({
      academic_term_id: selectedAcademicTermId,
      ...(sectionId ? { section_id: sectionId } : {}),
      ...(query.trim() ? { q: query.trim() } : {}),
    })
      .then((value) => { if (!cancelled) setRisk(value); })
      .catch(() => { if (!cancelled) setRisk(null); });
    return () => { cancelled = true; };
  }, [apiStatus, selectedAcademicTermId, sectionId, query]);

  const summary = daily?.summary;
  const cards = useMemo(() => [
    { label: "الحصص المكتملة الرصد", value: `${summary?.fully_recorded_sessions ?? 0} من ${summary?.scheduled_sessions ?? 0}`, icon: <CheckCircle2 size={22} />, cls: "badge-green" },
    { label: "طلاب لديهم غياب اليوم", value: String(summary?.students_with_absence ?? 0), icon: <AlertTriangle size={22} />, cls: "badge-red" },
    { label: "طلاب لديهم تأخر", value: String(summary?.students_with_late ?? 0), icon: <Clock3 size={22} />, cls: "badge-orange" },
    { label: "أعذار طبية بانتظار المراجعة", value: String(pendingExcuses), icon: <FileCheck2 size={22} />, cls: "badge-blue" },
  ], [pendingExcuses, summary]);

  const sendWarning = (studentId: string, studentName?: string | null) => {
    if (!window.confirm(`إرسال تنبيه غياب لولي أمر ${studentName ?? "الطالب"} بعد مراجعة السجل والأعذار؟`)) return;
    sendParentWarning(studentId, "تنبيه متابعة بسبب تجاوز حد الغياب غير المبرر المعتمد بالمدرسة");
  };

  return (
    <div className="dashboard-shell">
      <Sidebar />
      <div className="main-content">
        <Header title="الحضور والغياب" subtitle="ملخص إداري مبني على رصد الحضور لكل حصة فعلية" />
        <main className="page-body">
          <div className="filter-toolbar" style={{ marginBottom: 16 }}>
            <input className="form-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <select className="form-select" value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
              <option value="">كل الشعب</option>
              {sections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}
            </select>
            <select className="form-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">كل الحالات</option>
              <option value="has_absence">لديه غياب</option>
              <option value="full_day_absence">غياب كامل اليوم</option>
              <option value="excused">غياب بعذر</option>
              <option value="late">لديه تأخر</option>
              <option value="complete">مكتمل الحضور</option>
              <option value="incomplete">الرصد غير مكتمل</option>
            </select>
            <input className="form-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث باسم أو رقم الطالب" />
          </div>

          <div className="kpi-grid" style={{ marginBottom: 18 }}>
            {cards.map((card) => (
              <div className="kpi-card" key={card.label}>
                <div className={`kpi-icon ${card.cls}`}>{card.icon}</div>
                <div className="kpi-content"><div className="kpi-value">{card.value}</div><div className="kpi-label">{card.label}</div></div>
              </div>
            ))}
          </div>

          {apiStatus !== "live" && <div className="card" style={{ padding: 18, marginBottom: 18 }}>سجّل الدخول لعرض بيانات الحضور والغياب.</div>}

          <div className="grid-2">
            <section className="card">
              <div className="card-header">
                <div><div className="card-title">ملخص حضور اليوم</div><div className="card-subtitle">أي غياب ولو في حصة واحدة يظهر «لديه غياب»، والتفاصيل تعرض الحصة نفسها.</div></div>
                {loading && <span className="badge badge-blue">جاري التحديث…</span>}
              </div>
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead><tr><th>الطالب</th><th>الحالة</th><th>الرصد</th><th>التفاصيل</th></tr></thead>
                  <tbody>
                    {(daily?.students ?? []).map((item) => (
                      <tr key={item.student.id}>
                        <td><strong>{item.student.full_name}</strong><div className="meta-text">{item.section.name}</div></td>
                        <td><span className={`badge ${item.summary_status.includes("absence") ? "badge-red" : item.summary_status === "late" ? "badge-orange" : item.summary_status === "incomplete" ? "badge-gray" : "badge-green"}`}>{statusLabel[item.summary_status] ?? item.summary_status}</span></td>
                        <td>{item.recorded_periods} من {item.expected_periods} حصة</td>
                        <td><button className="btn btn-outline btn-sm" onClick={() => setDetails(item)}>عرض الحصص</button></td>
                      </tr>
                    ))}
                    {apiStatus === "live" && !loading && (daily?.students.length ?? 0) === 0 && <tr><td colSpan={4} style={{ textAlign: "center", padding: 24 }}>لا توجد نتائج مطابقة.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="card">
              <div className="card-header">
                <div><div className="card-title">طلاب يحتاجون متابعة بسبب الغياب</div><div className="card-subtitle">الترشيح حسب سياسة المدرسة وبعدد حصص الغياب غير المبرر، والإرسال بعد مراجعة المسؤول.</div></div>
                {risk && <span className="badge badge-orange">الحد الحالي: {risk.policy.absence_warning_threshold} حصص</span>}
              </div>
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead><tr><th>الطالب</th><th>حصص الغياب</th><th>الحضور</th><th>إجراء</th></tr></thead>
                  <tbody>
                    {(risk?.students ?? []).map((item) => (
                      <tr key={item.student.id}>
                        <td><strong>{item.student.full_name}</strong><div className="meta-text">{item.section.name}</div></td>
                        <td>{item.unexcused_absent_periods} حصة غير مبررة</td>
                        <td>{item.attendance_percentage == null ? "—" : `${item.attendance_percentage}%`}</td>
                        <td><button className="btn btn-outline btn-sm" onClick={() => sendWarning(item.student.id, item.student.full_name)}>مراجعة وإرسال تنبيه</button></td>
                      </tr>
                    ))}
                    {selectedAcademicTermId && (risk?.students.length ?? 0) === 0 && <tr><td colSpan={4} style={{ textAlign: "center", padding: 24 }}>لا توجد حالات تجاوزت حد المتابعة الحالي.</td></tr>}
                    {!selectedAcademicTermId && <tr><td colSpan={4} style={{ textAlign: "center", padding: 24 }}>اختر فصلًا دراسيًا من أعلى اللوحة لاحتساب المتابعة.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </main>
        <Footer />
      </div>

      {details && (
        <div className="modal-overlay" onClick={() => setDetails(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 620 }}>
            <div className="modal-header"><div><div className="card-title">تفاصيل حضور {details.student.full_name}</div><div className="card-subtitle">{details.section.name} — {date}</div></div><button className="btn btn-ghost btn-sm" onClick={() => setDetails(null)}><X size={18} /></button></div>
            <div className="modal-body">
              {details.periods.map((period, index) => (
                <div key={period.teaching_session_id} className="feed-item">
                  <div><strong>الحصة {index + 1} — {period.subject_name ?? "مادة"}</strong><div className="meta-text">{period.starts_at} - {period.ends_at}</div></div>
                  <span className={`badge ${period.status === "absent" ? "badge-red" : period.status === "late" ? "badge-orange" : period.status === "not_recorded" ? "badge-gray" : "badge-green"}`}>{periodLabel[period.status] ?? period.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
