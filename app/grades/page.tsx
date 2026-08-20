"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useDashboard } from "@/context/DashboardContext";
import {
  DashboardAssessment,
  DashboardGradeAppeal,
  DashboardReportExport,
  approveAssessment,
  approveDashboardGradeAppeal,
  correctDashboardGradeAppeal,
  dashboardErrorMessage,
  fetchDashboardAssessment,
  fetchDashboardAssessments,
  fetchDashboardGradeAppeals,
  fetchReportExport,
  lockAssessment,
  publishAssessment,
  rejectDashboardGradeAppeal,
  requestAssessmentGradeExport,
} from "@/lib/dashboardApi";
import { AlertTriangle, CheckCircle2, Download, Lock, Send, X } from "lucide-react";

const statusLabels: Record<string, string> = {
  draft: "مسودة عند المعلم",
  pending_approval: "بانتظار الاعتماد",
  approved: "معتمد ينتظر النشر",
  published: "منشور لأولياء الأمور",
  locked: "مقفل",
};

export default function GradesPage() {
  const { selectedAcademicTermId, sections, subjects, teachers, showToast, apiStatus, hasApiPermission } = useDashboard();
  const [status, setStatus] = useState("pending_approval");
  const [sectionId, setSectionId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [type, setType] = useState("");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<DashboardAssessment[]>([]);
  const [selected, setSelected] = useState<DashboardAssessment | null>(null);
  const [appeals, setAppeals] = useState<DashboardGradeAppeal[]>([]);
  const [tab, setTab] = useState<"assessments" | "appeals">("assessments");
  const [loading, setLoading] = useState(false);
  const [exportState, setExportState] = useState<DashboardReportExport | null>(null);
  const [appealModal, setAppealModal] = useState<DashboardGradeAppeal | null>(null);
  const [correctedScore, setCorrectedScore] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");

  const load = useCallback(async () => {
    if (apiStatus !== "live") return;
    setLoading(true);
    try {
      const list = await fetchDashboardAssessments({
        ...(status ? { status } : {}),
        ...(selectedAcademicTermId ? { academic_term_id: selectedAcademicTermId } : {}),
        ...(sectionId ? { section_id: sectionId } : {}),
        ...(subjectId ? { subject_id: subjectId } : {}),
        ...(teacherId ? { teacher_id: teacherId } : {}),
        ...(type ? { type } : {}),
        per_page: 100,
      });
      const filtered = query.trim() ? list.filter((item) => (item.title ?? "").includes(query.trim())) : list;
      setItems(filtered);
      if (selected && filtered.some((item) => item.id === selected.id)) {
        const detail = await fetchDashboardAssessment(selected.id);
        setSelected(detail);
      } else if (filtered[0]) {
        setSelected(await fetchDashboardAssessment(filtered[0].id));
      } else {
        setSelected(null);
      }
    } catch (error) {
      showToast("إدارة التقييمات والدرجات", dashboardErrorMessage(error), "error");
    } finally {
      setLoading(false);
    }
  }, [apiStatus, query, sectionId, selected?.id, selectedAcademicTermId, showToast, status, subjectId, teacherId, type]);

  const loadAppeals = useCallback(async () => {
    if (apiStatus !== "live" || !hasApiPermission("grade.appeal_review")) return;
    try { setAppeals(await fetchDashboardGradeAppeals({ per_page: 100 })); } catch { setAppeals([]); }
  }, [apiStatus, hasApiPermission]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (tab === "appeals") void loadAppeals(); }, [tab, loadAppeals]);

  const counters = useMemo(() => ({
    total: items.length,
    missing: items.filter((item) => (item.grade_summary?.missing_scores ?? 0) > 0).length,
  }), [items]);

  async function selectAssessment(item: DashboardAssessment) {
    try { setSelected(await fetchDashboardAssessment(item.id)); } catch (error) { showToast("التقييم", dashboardErrorMessage(error), "error"); }
  }

  async function runAction(action: "approve" | "publish" | "lock") {
    if (!selected) return;
    if (action === "publish" && (selected.grade_summary?.missing_scores ?? 0) > 0) {
      showToast("لا يمكن النشر", `يوجد ${selected.grade_summary?.missing_scores} طالب بدون درجة.`, "warning");
      return;
    }
    if (!window.confirm(action === "approve" ? "اعتماد التقييم بعد مراجعة الدرجات؟" : action === "publish" ? "نشر الدرجات لأولياء الأمور؟" : "قفل الدرجات ومنع التعديل العادي؟")) return;
    try {
      if (action === "approve") await approveAssessment(selected.id);
      if (action === "publish") await publishAssessment(selected.id);
      if (action === "lock") await lockAssessment(selected.id);
      showToast("تم تنفيذ الإجراء", "تم تحديث حالة التقييم بنجاح.", "success");
      await load();
    } catch (error) { showToast("تعذر تنفيذ الإجراء", dashboardErrorMessage(error), "error"); }
  }

  async function startExport() {
    if (!selected) return;
    try {
      const exp = await requestAssessmentGradeExport(selected.id);
      setExportState(exp);
      showToast("تصدير كشف الدرجات", "تم إرسال طلب التصدير وجاري تجهيز الملف.", "info");
    } catch (error) { showToast("التصدير", dashboardErrorMessage(error), "error"); }
  }

  async function refreshExport() {
    if (!exportState?.export_id) return;
    try { setExportState(await fetchReportExport(exportState.export_id)); } catch (error) { showToast("التصدير", dashboardErrorMessage(error), "error"); }
  }

  async function reviewAppeal(appeal: DashboardGradeAppeal, action: "approve" | "reject") {
    const note = window.prompt(action === "approve" ? "ملاحظة المراجعة (اختياري)" : "سبب رفض الاعتراض", "") ?? null;
    if (action === "reject" && note === null) return;
    try {
      if (action === "approve") await approveDashboardGradeAppeal(appeal.id, note);
      else await rejectDashboardGradeAppeal(appeal.id, note);
      await loadAppeals();
    } catch (error) { showToast("اعتراض الدرجة", dashboardErrorMessage(error), "error"); }
  }

  async function correctAppeal() {
    if (!appealModal || !correctionReason.trim() || correctedScore === "") return;
    try {
      await correctDashboardGradeAppeal(appealModal.id, {
        score: Number(correctedScore),
        correction_reason: correctionReason.trim(),
        revision: appealModal.grade_revision ?? 1,
        feedback: appealModal.current_feedback ?? null,
      });
      showToast("تصحيح الدرجة", "تم تصحيح الدرجة وتسجيل العملية وإشعار ولي الأمر.", "success");
      setAppealModal(null); setCorrectionReason(""); setCorrectedScore("");
      await loadAppeals(); await load();
    } catch (error) { showToast("تصحيح الدرجة", dashboardErrorMessage(error), "error"); }
  }

  return (
    <div className="dashboard-shell">
      <Sidebar />
      <div className="main-content">
        <Header title="إدارة التقييمات والدرجات" subtitle="مراجعة تقييمات المعلمين واعتمادها ونشرها ومتابعة الاعتراضات" />
        <main className="page-body">
          <div className="segmented-control" style={{ marginBottom: 14 }}>
            <button className={tab === "assessments" ? "active" : ""} onClick={() => setTab("assessments")}>التقييمات والدرجات</button>
            {hasApiPermission("grade.appeal_review") && <button className={tab === "appeals" ? "active" : ""} onClick={() => setTab("appeals")}>اعتراضات الدرجات</button>}
          </div>

          {tab === "assessments" ? <>
            <div className="filter-toolbar" style={{ marginBottom: 12 }}>
              <input className="form-input" placeholder="ابحث باسم التقييم" value={query} onChange={(e) => setQuery(e.target.value)} />
              <select className="form-select" value={sectionId} onChange={(e) => setSectionId(e.target.value)}><option value="">كل الشعب</option>{sections.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
              <select className="form-select" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}><option value="">كل المواد</option>{subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
              <select className="form-select" value={teacherId} onChange={(e) => setTeacherId(e.target.value)}><option value="">كل المعلمين</option>{teachers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
              <select className="form-select" value={type} onChange={(e) => setType(e.target.value)}><option value="">كل الأنواع</option><option value="quiz">اختبار قصير</option><option value="exam">اختبار</option><option value="assignment">واجب</option><option value="project">مشروع</option><option value="participation">مشاركة</option></select>
            </div>
            <div className="segmented-control" style={{ marginBottom: 16 }}>
              {[['', 'الكل'], ['pending_approval','بانتظار الاعتماد'], ['approved','معتمد'], ['published','منشور'], ['locked','مقفل']].map(([key,label]) => <button key={key} className={status===key?'active':''} onClick={() => setStatus(key)}>{label}</button>)}
            </div>

            <div className="kpi-grid" style={{ marginBottom: 16 }}>
              <div className="kpi-card"><div className="kpi-icon badge-blue"><CheckCircle2 size={20}/></div><div className="kpi-content"><div className="kpi-value">{counters.total}</div><div className="kpi-label">تقييم مطابق للفلاتر</div></div></div>
              <div className="kpi-card"><div className="kpi-icon badge-orange"><AlertTriangle size={20}/></div><div className="kpi-content"><div className="kpi-value">{counters.missing}</div><div className="kpi-label">تقييمات بها درجات ناقصة</div></div></div>
            </div>

            {apiStatus !== "live" ? <div className="card" style={{ padding: 20 }}>سجّل الدخول لعرض التقييمات والدرجات.</div> :
            <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 340px) minmax(0, 1fr)", gap: 16 }}>
              <section className="card" style={{ maxHeight: "68vh", overflow: "auto" }}>
                <div className="card-header"><div><div className="card-title">التقييمات</div><div className="card-subtitle">كل تقييم مرتبط بمادة وشعبة واحدة</div></div>{loading && <span className="badge badge-blue">تحميل…</span>}</div>
                {(items ?? []).map((item) => <button key={item.id} onClick={() => void selectAssessment(item)} className="feed-item" style={{ width: "100%", textAlign: "right", background: selected?.id === item.id ? "var(--primary-50)" : "transparent", border: 0, cursor: "pointer" }}>
                  <div><strong>{item.title}</strong><div className="meta-text">{item.subject?.name} • {item.section?.name}</div><div className="meta-text">{item.teacher?.full_name}</div></div>
                  <div style={{ display: "grid", gap: 6, justifyItems: "end" }}><span className="badge badge-blue">{statusLabels[item.status ?? ""] ?? item.status}</span><span className={(item.grade_summary?.missing_scores ?? 0)>0?"badge badge-orange":"badge badge-green"}>{item.grade_summary?.scored_entries ?? 0}/{item.grade_summary?.expected_students ?? 0}</span></div>
                </button>)}
                {!loading && items.length===0 && <div style={{ padding: 24, textAlign: "center" }}>لا توجد تقييمات مطابقة.</div>}
              </section>

              <section className="card">
                {!selected ? <div style={{ padding: 30, textAlign: "center" }}>اختر تقييمًا لعرض كشف الدرجات.</div> : <>
                  <div className="card-header">
                    <div><div className="card-title">{selected.title}</div><div className="card-subtitle">{selected.subject?.name} • {selected.section?.name} • {selected.teacher?.full_name}</div></div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><span className="badge badge-blue">الدرجة {selected.max_score}</span><span className="badge badge-gray">الوزن {selected.weight ?? 0}%</span><span className="badge badge-green">{statusLabels[selected.status ?? ""] ?? selected.status}</span></div>
                  </div>
                  {(selected.grade_summary?.missing_scores ?? 0)>0 && <div style={{ margin: "0 16px 14px", padding: 12, borderRadius: 12, background: "#FFF7ED" }}><AlertTriangle size={16} style={{ verticalAlign:"middle" }}/> يوجد {selected.grade_summary?.missing_scores} طالب بدون درجة. لن يسمح بالنشر قبل استكمال الرصد.</div>}
                  <div className="data-table-wrap"><table className="data-table"><thead><tr><th>الطالب</th><th>الدرجة</th><th>النسبة</th><th>ملاحظة المعلم</th></tr></thead><tbody>
                    {(selected.entries ?? []).map((row) => { const score=row.entry?.score; const pct=score==null||!selected.max_score?null:Math.round((score/selected.max_score)*100); return <tr key={row.student?.id}><td><strong>{row.student?.full_name}</strong><div className="meta-text">{row.student?.admission_number}</div></td><td>{score==null?<span className="badge badge-orange">غير مرصودة</span>:`${score} / ${selected.max_score}`}</td><td>{pct==null?'—':`${pct}%`}</td><td>{row.entry?.feedback ?? '—'}</td></tr>; })}
                  </tbody></table></div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: 16, borderTop: "1px solid var(--border)" }}>
                    {hasApiPermission("grade.approve") && selected.available_actions?.includes("approve") && <button className="btn btn-primary" onClick={() => void runAction("approve")}><CheckCircle2 size={16}/> اعتماد التقييم</button>}
                    {hasApiPermission("grade.publish") && selected.available_actions?.includes("publish") && <button className="btn btn-primary" onClick={() => void runAction("publish")}><Send size={16}/> نشر الدرجات لأولياء الأمور</button>}
                    {hasApiPermission("grade.lock") && selected.available_actions?.includes("lock") && <button className="btn btn-outline" onClick={() => void runAction("lock")}><Lock size={16}/> قفل الدرجات</button>}
                    {hasApiPermission("grade.view") && <button className="btn btn-outline" onClick={() => void startExport()}><Download size={16}/> تصدير كشف الدرجات</button>}
                    {exportState && <><span className="badge badge-gray">التصدير: {exportState.status}</span>{exportState.status !== "completed" && <button className="btn btn-ghost btn-sm" onClick={() => void refreshExport()}>تحديث الحالة</button>}{exportState.download_url && <a className="btn btn-primary btn-sm" href={exportState.download_url}>تحميل الملف</a>}</>}
                  </div>
                </>}
              </section>
            </div>}
          </> :
          <section className="card">
            <div className="card-header"><div><div className="card-title">اعتراضات الدرجات</div><div className="card-subtitle">الاعتراض على درجة منشورة يراجع هنا، وتصحيح الدرجة إجراء رسمي مستقل ومسجل.</div></div></div>
            <div className="data-table-wrap"><table className="data-table"><thead><tr><th>الطالب</th><th>التقييم</th><th>الدرجة</th><th>سبب الاعتراض</th><th>الحالة</th><th>الإجراء</th></tr></thead><tbody>
              {appeals.map((appeal) => <tr key={appeal.id}><td><strong>{appeal.student?.full_name}</strong><div className="meta-text">{appeal.section?.name}</div></td><td>{appeal.assessment_title}<div className="meta-text">{appeal.subject?.name}</div></td><td>{appeal.current_score} / {appeal.max_score}</td><td>{appeal.reason}</td><td><span className="badge badge-blue">{appeal.status}</span></td><td><div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>{appeal.status === "open" && <><button className="btn btn-outline btn-sm" onClick={() => void reviewAppeal(appeal,"approve")}>قبول الاعتراض</button><button className="btn btn-ghost btn-sm" onClick={() => void reviewAppeal(appeal,"reject")}>رفض</button></>}{appeal.status === "approved" && <button className="btn btn-primary btn-sm" onClick={() => { setAppealModal(appeal); setCorrectedScore(String(appeal.current_score ?? "")); }}>تصحيح الدرجة</button>}</div></td></tr>)}
              {appeals.length===0 && <tr><td colSpan={6} style={{ textAlign:"center",padding:24 }}>لا توجد اعتراضات.</td></tr>}
            </tbody></table></div>
          </section>}
        </main>
        <Footer />
      </div>

      {appealModal && <div className="modal-overlay" onClick={() => setAppealModal(null)}><div className="modal" onClick={(e)=>e.stopPropagation()} style={{maxWidth:520}}><div className="modal-header"><div><div className="card-title">تصحيح درجة بعد قبول الاعتراض</div><div className="card-subtitle">{appealModal.student?.full_name} — {appealModal.assessment_title}</div></div><button className="btn btn-ghost btn-sm" onClick={()=>setAppealModal(null)}><X size={18}/></button></div><div className="modal-body" style={{display:"grid",gap:12}}><label>الدرجة الجديدة<input className="form-input" type="number" min="0" max={appealModal.max_score ?? undefined} value={correctedScore} onChange={(e)=>setCorrectedScore(e.target.value)}/></label><label>سبب التصحيح<textarea className="form-input" rows={4} value={correctionReason} onChange={(e)=>setCorrectionReason(e.target.value)} /></label></div><div className="modal-footer"><button className="btn btn-ghost" onClick={()=>setAppealModal(null)}>إلغاء</button><button className="btn btn-primary" disabled={!correctionReason.trim()||correctedScore===""} onClick={()=>void correctAppeal()}>حفظ التصحيح وإشعار ولي الأمر</button></div></div></div>}
    </div>
  );
}
