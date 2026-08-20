"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useDashboard } from "@/context/DashboardContext";
import {
  DashboardAvailableSubstitute,
  DashboardGlobalScheduleConflictResult,
  DashboardScheduleSession,
  DashboardScheduleSlot,
  checkGlobalScheduleConflicts,
  createTeacherSubstitution,
  dashboardErrorMessage,
  fetchAvailableSubstitutes,
  fetchDashboardSchedules,
} from "@/lib/dashboardApi";
import { AlertTriangle, CheckCircle2, RefreshCw, UserRoundCheck, X } from "lucide-react";

const days: Array<[number,string]> = [[0,"الأحد"],[1,"الاثنين"],[2,"الثلاثاء"],[3,"الأربعاء"],[4,"الخميس"]];

export default function SchedulePage(){
  const { sections,selectedAcademicTermId,showToast,apiStatus,hasApiPermission }=useDashboard();
  const canSubstitute=hasApiPermission("operations.substitution_manage");
  const [sectionId,setSectionId]=useState("");
  const [slots,setSlots]=useState<DashboardScheduleSlot[]>([]);
  const [loading,setLoading]=useState(false);
  const [conflicts,setConflicts]=useState<DashboardGlobalScheduleConflictResult|null>(null);
  const [selectedSlot,setSelectedSlot]=useState<DashboardScheduleSlot|null>(null);
  const [selectedSession,setSelectedSession]=useState<DashboardScheduleSession|null>(null);
  const [candidates,setCandidates]=useState<DashboardAvailableSubstitute[]>([]);
  const [substituteId,setSubstituteId]=useState("");
  const [reason,setReason]=useState("");

  const load=useCallback(async()=>{
    if(apiStatus!=="live")return;
    setLoading(true);
    try{setSlots(await fetchDashboardSchedules({...(selectedAcademicTermId?{academic_term_id:selectedAcademicTermId}:{}),...(sectionId?{section_id:sectionId}:{}),per_page:100}));}
    catch(error){showToast("الجداول",dashboardErrorMessage(error),"error");}
    finally{setLoading(false)}
  },[apiStatus,sectionId,selectedAcademicTermId,showToast]);
  useEffect(()=>{void load()},[load]);

  const times=useMemo(()=>Array.from(new Set(slots.map(s=>s.starts_at).filter(Boolean) as string[])).sort(),[slots]);
  const quota=useMemo(()=>{
    const items=new Map<string,{id:string;name:string;required:number;count:number}>();
    slots.forEach((slot)=>{
      if(!slot.subject_id||!slot.subject_name)return;
      const current=items.get(slot.subject_id)??{id:slot.subject_id,name:slot.subject_name,required:Number(slot.weekly_periods??0),count:0};
      current.count+=1;
      if(Number(slot.weekly_periods??0)>0)current.required=Number(slot.weekly_periods);
      items.set(slot.subject_id,current);
    });
    return Array.from(items.values());
  },[slots]);

  async function runConflicts(){
    if(!selectedAcademicTermId){showToast("فحص التعارضات","اختر الفصل الدراسي أولًا.","warning");return}
    try{const result=await checkGlobalScheduleConflicts(selectedAcademicTermId);setConflicts(result);showToast("فحص تعارضات الجدول",result.has_conflict?`وجد ${result.count} تعارض يحتاج مراجعة.`:"لا توجد تعارضات في جدول الفصل الدراسي.",result.has_conflict?"warning":"success");}
    catch(error){showToast("فحص التعارضات",dashboardErrorMessage(error),"error")}
  }

  async function chooseSession(session:DashboardScheduleSession){
    setSelectedSession(session);setSubstituteId("");setCandidates([]);
    try{setCandidates(await fetchAvailableSubstitutes(session.id));}catch(error){showToast("المعلم البديل",dashboardErrorMessage(error),"error")}
  }
  async function assign(){
    if(!selectedSession||!substituteId)return;
    try{await createTeacherSubstitution({teaching_session_id:selectedSession.id,substitute_teacher_id:substituteId,reason:reason.trim()||undefined});showToast("تكليف معلم بديل","تم إرسال التكليف للمعلم البديل ويمكنه القبول أو الرفض من تطبيق المعلم.","success");setSelectedSlot(null);setSelectedSession(null);setCandidates([]);setReason("");}
    catch(error){showToast("تكليف معلم بديل",dashboardErrorMessage(error),"error")}
  }

  return <div className="dashboard-shell"><Sidebar/><div className="main-content"><Header title="الجداول وتغطية الحصص" subtitle="الجدول الأسبوعي للشُعب، فحص التعارضات، وتكليف بديل من حصة فعلية محددة"/><main className="page-body">
    <div className="filter-toolbar" style={{marginBottom:14}}><select className="form-select" value={sectionId} onChange={(e)=>setSectionId(e.target.value)}><option value="">كل الشعب</option>{sections.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select><button className="btn btn-outline" onClick={()=>void load()}><RefreshCw size={16}/> تحديث</button><button className="btn btn-primary" onClick={()=>void runConflicts()}><AlertTriangle size={16}/> فحص تعارضات الجدول</button>{conflicts&&<span className={`badge ${conflicts.has_conflict?"badge-red":"badge-green"}`}>{conflicts.has_conflict?`${conflicts.count} تعارض`:`لا توجد تعارضات`}</span>}</div>

    {quota.length>0&&<div className="card" style={{marginBottom:14,padding:14}}><div className="card-title" style={{marginBottom:8}}>تغطية الحصص الأسبوعية للشعبة المحددة</div><div className="filter-chip-row">{quota.map((item)=><span className={`badge ${item.required<=0?"badge-blue":item.count===item.required?"badge-green":item.count<item.required?"badge-orange":"badge-red"}`} key={item.id}>{item.name}: {item.required>0?`${item.count} من ${item.required}`:`${item.count} موزعة`}</span>)}</div></div>}

    {apiStatus!=="live"?<div className="card" style={{padding:24}}>سجّل الدخول لعرض الجدول الدراسي.</div>:<section className="card"><div className="card-header"><div><div className="card-title">الجدول الأسبوعي</div><div className="card-subtitle">اضغط أي حصة لعرض تفاصيلها. تكليف المعلم البديل يبدأ من الحصة الفعلية المحددة.</div></div>{loading&&<span className="badge badge-blue">جاري التحميل…</span>}</div><div style={{overflowX:"auto"}}><table className="data-table" style={{minWidth:900}}><thead><tr><th>الوقت</th>{days.map(([n,name])=><th key={n}>{name}</th>)}</tr></thead><tbody>{times.map(time=><tr key={time}><td><strong>{time}</strong></td>{days.map(([day])=>{const slot=slots.find(s=>s.weekday===day&&s.starts_at===time);return <td key={day}>{slot?<button onClick={()=>setSelectedSlot(slot)} style={{width:"100%",border:"1px solid var(--border)",borderRadius:12,padding:10,background:"var(--surface)",textAlign:"right",cursor:"pointer"}}><strong>{slot.subject_name}</strong><div className="meta-text">{slot.teacher_name}</div><div className="meta-text">{slot.section_name} • {slot.room??"بدون قاعة"}</div></button>:<span className="meta-text">—</span>}</td>})}</tr>)}{times.length===0&&!loading&&<tr><td colSpan={6} style={{textAlign:"center",padding:30}}>لا توجد حصص مطابقة للفلاتر.</td></tr>}</tbody></table></div></section>}

    {conflicts?.has_conflict&&<section className="card" style={{marginTop:14}}><div className="card-header"><div><div className="card-title">تفاصيل التعارضات</div><div className="card-subtitle">الفحص يتم على كل جدول الفصل الدراسي، وليس الشعبة الظاهرة فقط.</div></div></div>{conflicts.conflicts.slice(0,20).map((c,i)=><div className="feed-item" key={i}><div><strong>{c.types.includes("teacher_overlap")?"تعارض معلم":"تعارض شعبة"}</strong><div className="meta-text">اليوم {c.weekday+1}</div></div><span className="badge badge-red">يحتاج معالجة</span></div>)}</section>}
  </main><Footer/></div>

  {selectedSlot&&<div className="modal-overlay" onClick={()=>{setSelectedSlot(null);setSelectedSession(null)}}><div className="modal" onClick={(e)=>e.stopPropagation()} style={{maxWidth:680}}><div className="modal-header"><div><div className="card-title">{selectedSlot.subject_name} — {selectedSlot.section_name}</div><div className="card-subtitle">{selectedSlot.teacher_name} • {selectedSlot.starts_at} - {selectedSlot.ends_at} • {selectedSlot.room??"بدون قاعة"}</div></div><button className="btn btn-ghost btn-sm" onClick={()=>{setSelectedSlot(null);setSelectedSession(null)}}><X size={18}/></button></div><div className="modal-body">
    <div className="card-title" style={{marginBottom:8}}>الحصص الفعلية المولدة من الجدول</div>{(selectedSlot.sessions??[]).map(session=><div className="feed-item" key={session.id}><div><strong>{session.session_date}</strong><div className="meta-text">{session.starts_at} - {session.ends_at} • {session.status}</div></div>{canSubstitute&&<button className="btn btn-outline btn-sm" onClick={()=>void chooseSession(session)}><UserRoundCheck size={15}/> تكليف معلم بديل</button>}</div>)}{(selectedSlot.sessions?.length??0)===0&&<div style={{padding:18}}>لا توجد Teaching Sessions مولدة لهذه الحصة بعد. لا يمكن إنشاء تكليف بديل بدون حصة فعلية.</div>}
    {canSubstitute&&selectedSession&&<div style={{marginTop:16,padding:14,border:"1px solid var(--border)",borderRadius:12}}><div className="card-title">تكليف بديل — {selectedSession.session_date}</div><div className="card-subtitle" style={{marginBottom:10}}>المعروضون هنا معلمون نشطون لا يوجد لديهم تعارض زمني مع الحصة.</div><select className="form-select" value={substituteId} onChange={(e)=>setSubstituteId(e.target.value)}><option value="">اختر المعلم البديل</option>{candidates.map(c=><option key={c.id} value={c.id}>{c.full_name}{c.specialization?` — ${c.specialization}`:""}</option>)}</select><textarea className="form-input" style={{marginTop:8}} rows={3} value={reason} onChange={(e)=>setReason(e.target.value)} placeholder="سبب التغطية (اختياري)"/><button className="btn btn-primary" style={{marginTop:8}} disabled={!substituteId} onClick={()=>void assign()}>إرسال التكليف للمعلم البديل</button>{candidates.length===0&&<div className="meta-text" style={{marginTop:8}}>لا يوجد معلم متاح بدون تعارض لهذه الحصة.</div>}</div>}
  </div></div></div>}
  </div>;
}
