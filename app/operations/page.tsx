"use client";

import Link from "next/link";
import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useDashboard } from "@/context/DashboardContext";
import { CheckCircle, FileCheck, Phone, UserCheck, XCircle, CalendarClock } from "lucide-react";

export default function OperationsPage() {
  const {
    medicalExcuses,
    leavePermits,
    parentSummons,
    substitutes,
    approveMedicalExcuse,
    rejectMedicalExcuse,
    approveLeavePermit,
    hasApiPermission,
  } = useDashboard();

  const canReviewLeave = hasApiPermission("operations.leave_review");
  const canReviewExcuse = hasApiPermission("attendance.review_excuse");

  const [activeTab, setActiveTab] = useState<"permits" | "excuses" | "summons" | "substitutes">("permits");
  const pendingExcusesCount = medicalExcuses.filter((item) => item.status === "pending").length;
  const pendingPermitsCount = leavePermits.filter((item) => item.status === "waiting_gate").length;
  const activeSummonsCount = parentSummons.filter((item) => item.status === "pending").length;

  const tabs = [
    { id: "permits" as const, label: "أذونات الخروج", count: pendingPermitsCount },
    { id: "excuses" as const, label: "الأعذار الطبية", count: pendingExcusesCount },
    { id: "summons" as const, label: "استدعاءات أولياء الأمور", count: activeSummonsCount },
    { id: "substitutes" as const, label: "التكليفات البديلة", count: substitutes.length },
  ];

  return (
    <div className="dashboard-shell">
      <Sidebar />
      <div className="main-content">
        <Header
          title="الطلبات والإجراءات اليومية"
          subtitle="مراجعة أذونات الخروج والأعذار الطبية والاستدعاءات ومتابعة التكليفات البديلة"
        />
        <main className="page-body">
          <div className="kpi-grid" style={{ marginBottom: 18 }}>
            <button type="button" className="kpi-card" onClick={() => setActiveTab("permits")} style={{ textAlign: "right", cursor: "pointer" }}>
              <div className="kpi-icon"><UserCheck size={21} /></div><div className="kpi-content"><div className="kpi-value">{pendingPermitsCount}</div><div className="kpi-label">أذونات خروج بانتظار المراجعة</div></div>
            </button>
            <button type="button" className="kpi-card" onClick={() => setActiveTab("excuses")} style={{ textAlign: "right", cursor: "pointer" }}>
              <div className="kpi-icon"><FileCheck size={21} /></div><div className="kpi-content"><div className="kpi-value">{pendingExcusesCount}</div><div className="kpi-label">أعذار طبية بانتظار المراجعة</div></div>
            </button>
            <button type="button" className="kpi-card" onClick={() => setActiveTab("summons")} style={{ textAlign: "right", cursor: "pointer" }}>
              <div className="kpi-icon"><Phone size={21} /></div><div className="kpi-content"><div className="kpi-value">{activeSummonsCount}</div><div className="kpi-label">استدعاءات مجدولة</div></div>
            </button>
            <button type="button" className="kpi-card" onClick={() => setActiveTab("substitutes")} style={{ textAlign: "right", cursor: "pointer" }}>
              <div className="kpi-icon"><CalendarClock size={21} /></div><div className="kpi-content"><div className="kpi-value">{substitutes.length}</div><div className="kpi-label">تكليفات بديلة مسجلة</div></div>
            </button>
          </div>

          <div className="segmented-control" style={{ marginBottom: 16, overflowX: "auto" }}>
            {tabs.map((tab) => (
              <button key={tab.id} type="button" className={activeTab === tab.id ? "active" : ""} onClick={() => setActiveTab(tab.id)}>
                {tab.label} <span className="badge badge-gray">{tab.count}</span>
              </button>
            ))}
          </div>

          {activeTab === "permits" && (
            <section className="card">
              <div className="card-header"><div><div className="card-title">أذونات الخروج</div><div className="card-subtitle">طلبات أولياء الأمور للمغادرة المبكرة، مع مراجعة الإدارة قبل إصدار الإذن.</div></div></div>
              <div className="card-body" style={{ padding: 0 }}>
                {leavePermits.map((permit) => (
                  <div key={permit.id} className="feed-item">
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><strong>{permit.studentName}</strong><span className="badge badge-gray">{permit.sectionName}</span><span className={`badge ${permit.status === "waiting_gate" ? "badge-orange" : permit.status === "rejected" ? "badge-red" : "badge-green"}`}>{permit.status === "waiting_gate" ? "بانتظار المراجعة" : permit.status === "rejected" ? "مرفوض" : "تمت الموافقة"}</span></div>
                      <div className="meta-text">السبب: {permit.reason}</div>
                      <div className="meta-text">مقدم الطلب: {permit.parentName} • وقت الطلب: {permit.requestTime}</div>
                    </div>
                    {permit.status === "waiting_gate" && canReviewLeave && <button type="button" className="btn btn-green btn-sm" onClick={() => approveLeavePermit(permit.id)}><CheckCircle size={14}/> موافقة</button>}
                  </div>
                ))}
                {leavePermits.length === 0 && <div style={{ padding: 24 }}>لا توجد طلبات أذونات خروج.</div>}
              </div>
            </section>
          )}

          {activeTab === "excuses" && (
            <section className="card">
              <div className="card-header"><div><div className="card-title">مراجعة الأعذار الطبية</div><div className="card-subtitle">مراجعة المستند المرفوع واعتماد العذر أو رفضه. لا يتم ادعاء تحقق خارجي تلقائي.</div></div></div>
              <div className="card-body" style={{ padding: 0 }}>
                {medicalExcuses.map((excuse) => (
                  <div key={excuse.id} className="feed-item">
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><strong>{excuse.studentName}</strong><span className="badge badge-gray">{excuse.sectionName}</span><span className={`badge ${excuse.status === "pending" ? "badge-orange" : excuse.status === "approved" ? "badge-green" : "badge-red"}`}>{excuse.status === "pending" ? "قيد المراجعة" : excuse.status === "approved" ? "عذر معتمد" : "مرفوض"}</span></div>
                      <div className="meta-text">تاريخ الغياب: {excuse.absenceDate} • الجهة: {excuse.hospitalName || "غير محددة"}</div>
                      <div className="meta-text">السبب: {excuse.reason}</div>
                    </div>
                    {excuse.status === "pending" && canReviewExcuse && <div style={{ display: "flex", gap: 8 }}><button type="button" className="btn btn-green btn-sm" onClick={() => approveMedicalExcuse(excuse.id)}><CheckCircle size={14}/> اعتماد</button><button type="button" className="btn btn-outline btn-sm" onClick={() => rejectMedicalExcuse(excuse.id)}><XCircle size={14}/> رفض</button></div>}
                  </div>
                ))}
                {medicalExcuses.length === 0 && <div style={{ padding: 24 }}>لا توجد أعذار طبية.</div>}
              </div>
            </section>
          )}

          {activeTab === "summons" && (
            <section className="card">
              <div className="card-header"><div><div className="card-title">استدعاءات أولياء الأمور</div><div className="card-subtitle">سجل الاستدعاءات الرسمية وحالتها. الإنشاء يتم من الطالب/التحليلات وفق الصلاحيات ويصل داخل التطبيق مع Push.</div></div></div>
              <div className="card-body" style={{ padding: 0 }}>
                {parentSummons.map((summons) => (
                  <div key={summons.id} className="feed-item">
                    <div style={{ flex: 1 }}><div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><strong>{summons.studentName}</strong><span className="badge badge-gray">{summons.sectionName}</span><span className="badge badge-blue">{summons.status === "pending" ? "بانتظار الرد" : summons.status === "accepted" ? "تم تأكيد الحضور" : summons.status === "declined" ? "اعتذر عن الحضور" : "ملغى"}</span></div><div className="meta-text">ولي الأمر: {summons.parentName} • الموعد: {summons.meetingDate} {summons.meetingTime}</div><div className="meta-text">السبب: {summons.reason}</div>{summons.responseNote && <div className="meta-text">ملاحظة ولي الأمر: {summons.responseNote}</div>}</div>
                  </div>
                ))}
                {parentSummons.length === 0 && <div style={{ padding: 24 }}>لا توجد استدعاءات مسجلة.</div>}
              </div>
            </section>
          )}

          {activeTab === "substitutes" && (
            <section className="card">
              <div className="card-header"><div><div className="card-title">التكليفات البديلة</div><div className="card-subtitle">التكليف الجديد يبدأ من الحصة الفعلية في صفحة الجداول، مع اختيار معلم بديل متاح.</div></div><Link href="/schedule" className="btn btn-primary btn-sm">فتح الجداول</Link></div>
              <div className="card-body" style={{ padding: 0 }}>
                {substitutes.map((substitute) => (
                  <div key={substitute.id} className="feed-item"><div style={{ flex: 1 }}><div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><strong>{substitute.substituteTeacherName}</strong><span className="badge badge-blue">معلم بديل</span><span className={`badge ${substitute.status === "accepted" ? "badge-green" : substitute.status === "declined" || substitute.status === "cancelled" ? "badge-red" : "badge-orange"}`}>{substitute.status === "accepted" ? "مقبول" : substitute.status === "declined" ? "مرفوض" : substitute.status === "cancelled" ? "ملغى" : "بانتظار الرد"}</span></div><div className="meta-text">بدلًا من: {substitute.absentTeacherName} • {substitute.sectionName}{substitute.period > 0 ? ` • الحصة ${substitute.period}` : ""}</div><div className="meta-text">{substitute.date ? `التاريخ: ${substitute.date} • ` : ""}المادة: {substitute.subjectName || "غير محددة"}</div></div></div>
                ))}
                {substitutes.length === 0 && <div style={{ padding: 24 }}>لا توجد تكليفات بديلة مسجلة.</div>}
              </div>
            </section>
          )}
        </main>
        <Footer />
      </div>
    </div>
  );
}
