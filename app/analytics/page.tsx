"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useDashboard } from "@/context/DashboardContext";
import { DashboardEarlyWarningResult, dashboardErrorMessage, fetchDashboardEarlyWarnings } from "@/lib/dashboardApi";
import { AlertTriangle, BarChart3, CalendarCheck, Users, X } from "lucide-react";

const reasonLabel: Record<string,string> = {
  attendance_absences_ge_3: "غياب متكرر تجاوز قاعدة الإنذار المبكر",
  published_grade_below_50_percent: "يوجد تقييم منشور أقل من 50%",
  high_behavior_note: "توجد ملاحظة سلوكية منشورة بدرجة مرتفعة/حرجة",
};

export default function AnalyticsPage() {
  const { sections, teachers, dashboardSchedules, dashboardSummary, issueParentSummons, showToast, apiStatus, hasApiPermission } = useDashboard();
  const canSummon = hasApiPermission("operations.summons_manage");
  const [tab,setTab]=useState<"risk"|"sections"|"teachers">("risk");
  const [sectionId,setSectionId]=useState("");
  const [query,setQuery]=useState("");
  const [data,setData]=useState<DashboardEarlyWarningResult|null>(null);
  const [summonsStudent,setSummonsStudent]=useState<{id:string,name:string}|null>(null);
  const [summonsDate,setSummonsDate]=useState("");
  const [summonsTime,setSummonsTime]=useState("09:00");
  const [summonsReason,setSummonsReason]=useState("");

  useEffect(()=>{
    if(apiStatus!=="live") return;
    let cancelled=false;
    void fetchDashboardEarlyWarnings({...(sectionId?{section_id:sectionId}:{}),...(query.trim()?{q:query.trim()}:{}),min_score:30})
      .then((value)=>{if(!cancelled)setData(value)})
      .catch((error)=>{if(!cancelled)showToast("الإنذار المبكر",dashboardErrorMessage(error),"error")});
    return()=>{cancelled=true};
  },[apiStatus,query,sectionId,showToast]);

  const scheduleCounts=useMemo(()=>{
    const map=new Map<string,number>();
    dashboardSchedules.forEach((slot)=>{if(slot.teacher_id)map.set(slot.teacher_id,(map.get(slot.teacher_id)??0)+1)});
    return map;
  },[dashboardSchedules]);

  function openSummons(id:string,name?:string|null){
    const d=new Date(); d.setDate(d.getDate()+1);
    setSummonsStudent({id,name:name??"الطالب"}); setSummonsDate(d.toISOString().slice(0,10)); setSummonsReason("متابعة الحالة الدراسية والحضور والسلوك");
  }
  function submitSummons(){ if(!summonsStudent||!summonsDate||!summonsReason.trim())return; issueParentSummons(summonsStudent.id,summonsReason.trim(),summonsDate,summonsTime); setSummonsStudent(null); }

  return <div className="dashboard-shell"><Sidebar/><div className="main-content"><Header title="التحليلات والإنذار المبكر" subtitle="تحليل مفسَّر قائم على الحضور والدرجات المنشورة والسلوك المؤكد — بدون تنبؤات غامضة"/><main className="page-body">
    <div className="kpi-grid" style={{marginBottom:16}}>
      <div className="kpi-card"><div className="kpi-icon badge-red"><AlertTriangle size={20}/></div><div className="kpi-content"><div className="kpi-value">{data?.students.length??0}</div><div className="kpi-label">طلاب يحتاجون متابعة</div></div></div>
      <div className="kpi-card"><div className="kpi-icon badge-green"><CalendarCheck size={20}/></div><div className="kpi-content"><div className="kpi-value">{dashboardSummary?.attendance_today?.rate == null?"—":`${dashboardSummary.attendance_today.rate}%`}</div><div className="kpi-label">مؤشر الحضور المتاح اليوم</div></div></div>
      <div className="kpi-card"><div className="kpi-icon badge-blue"><Users size={20}/></div><div className="kpi-content"><div className="kpi-value">{teachers.length}</div><div className="kpi-label">معلم نشط/مسجل</div></div></div>
      <div className="kpi-card"><div className="kpi-icon badge-gray"><BarChart3 size={20}/></div><div className="kpi-content"><div className="kpi-value">{data?.calculation_version??"—"}</div><div className="kpi-label">نسخة قاعدة الإنذار</div></div></div>
    </div>

    <div className="segmented-control" style={{marginBottom:16}}><button className={tab==="risk"?"active":""} onClick={()=>setTab("risk")}>الإنذار المبكر والمتابعة</button><button className={tab==="sections"?"active":""} onClick={()=>setTab("sections")}>مقارنة الشعب</button><button className={tab==="teachers"?"active":""} onClick={()=>setTab("teachers")}>مؤشرات تشغيل المعلمين</button></div>

    {tab==="risk"&&<section className="card"><div className="card-header"><div><div className="card-title">الطلاب المحتاجون للمتابعة</div><div className="card-subtitle">النظام يوضح عوامل الإدراج فقط؛ قرار المتابعة أو الاستدعاء يظل إجراءً إداريًا.</div></div><div className="filter-toolbar"><select className="form-select" value={sectionId} onChange={(e)=>setSectionId(e.target.value)}><option value="">كل الشعب</option>{sections.map((s)=><option key={s.id} value={s.id}>{s.name}</option>)}</select><input className="form-input" placeholder="بحث عن طالب" value={query} onChange={(e)=>setQuery(e.target.value)}/></div></div>{apiStatus!=="live"?<div style={{padding:24}}>سجّل الدخول لعرض نتائج الإنذار المبكر.</div>:(data?.students??[]).map((item)=><div className="feed-item" key={item.student.id} style={{alignItems:"flex-start"}}><div style={{flex:1}}><div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}><strong>{item.student.full_name}</strong><span className={`badge ${item.level==="high"?"badge-red":"badge-orange"}`}>{item.level==="high"?"خطورة مرتفعة":"متابعة مطلوبة"}</span><span className="badge badge-gray">{item.section.name}</span></div><div className="meta-text" style={{marginTop:6}}>أسباب الإدراج:</div><ul style={{margin:"6px 0 0",paddingInlineStart:20}}>{item.reasons.map((reason)=><li key={reason} className="small-readable">{reasonLabel[reason]??reason}</li>)}</ul></div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}><button className="btn btn-outline btn-sm" onClick={()=>showToast("متابعة الطالب","تُعرض عوامل الخطر للمراجعة داخل شؤون الطلاب. لا يتم إنشاء خطة متابعة غير مدعومة من الخلفية.","info")}>عرض عوامل المتابعة</button>{canSummon&&<button className="btn btn-primary btn-sm" onClick={()=>openSummons(item.student.id,item.student.full_name)}>استدعاء ولي الأمر</button>}</div></div>)}{apiStatus==="live"&&(data?.students.length??0)===0&&<div style={{padding:24,textAlign:"center"}}>لا توجد حالات مطابقة لقواعد الإنذار الحالية.</div>}</section>}

    {tab==="sections"&&<section className="card"><div className="card-header"><div><div className="card-title">مقارنة الشعب</div><div className="card-subtitle">تعرض المقارنة مؤشرات موثوقة للحضور والدرجات المنشورة والسلوك عند توفر بياناتها المجمعة.</div></div></div><div style={{padding:24}}>لا تتوفر حاليًا بيانات مجمعة كافية لإجراء مقارنة موثوقة بين الشعب.</div></section>}

    {tab==="teachers"&&<section className="card"><div className="card-header"><div><div className="card-title">مؤشرات تشغيل المعلمين</div><div className="card-subtitle">بيانات تشغيلية فقط، وليست تقييم كفاءة أو حكم وظيفي.</div></div></div><div className="data-table-wrap"><table className="data-table"><thead><tr><th>المعلم</th><th>التخصص</th><th>حصص الجدول الأسبوعي المرئية</th><th>اكتمال رصد الحضور</th></tr></thead><tbody>{teachers.map((teacher)=><tr key={teacher.id}><td><strong>{teacher.name}</strong></td><td>{teacher.specialization}</td><td>{scheduleCounts.get(teacher.id)??0}</td><td><span className="badge badge-gray">يحتاج Reporting metric حقيقي</span></td></tr>)}</tbody></table></div></section>}
  </main><Footer/></div>
  {canSummon&&summonsStudent&&<div className="modal-overlay" onClick={()=>setSummonsStudent(null)}><div className="modal" onClick={(e)=>e.stopPropagation()} style={{maxWidth:520}}><div className="modal-header"><div><div className="card-title">إنشاء استدعاء ولي أمر</div><div className="card-subtitle">{summonsStudent.name} — سيصل داخل التطبيق مع Push وتأكيد قبول/رفض.</div></div><button className="btn btn-ghost btn-sm" onClick={()=>setSummonsStudent(null)}><X size={18}/></button></div><div className="modal-body" style={{display:"grid",gap:12}}><input className="form-input" type="date" value={summonsDate} onChange={(e)=>setSummonsDate(e.target.value)}/><input className="form-input" type="time" value={summonsTime} onChange={(e)=>setSummonsTime(e.target.value)}/><textarea className="form-input" rows={4} value={summonsReason} onChange={(e)=>setSummonsReason(e.target.value)} placeholder="سبب الاستدعاء"/><div className="small-readable">معاينة: تدعوكم إدارة المدرسة للحضور في الموعد المحدد لمناقشة: {summonsReason}</div></div><div className="modal-footer"><button className="btn btn-ghost" onClick={()=>setSummonsStudent(null)}>إلغاء</button><button className="btn btn-primary" onClick={submitSummons}>إرسال الاستدعاء</button></div></div></div>}
  </div>;
}
