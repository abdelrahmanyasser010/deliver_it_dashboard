"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useDashboard } from "@/context/DashboardContext";
import {
  DashboardMessageTemplate,
  createBroadcast,
  createDashboardMessageTemplate,
  dashboardErrorMessage,
  deleteDashboardMessageTemplate,
  fetchBroadcastDeliveries,
  fetchDashboardMessageTemplates,
  sendBroadcastNow,
  updateDashboardMessageTemplate,
} from "@/lib/dashboardApi";
import { Bell, CalendarDays, FileText, Plus, Send, X } from "lucide-react";

export default function MessagesPage() {
  const { broadcasts, calendarEvents, sections, showToast, apiStatus, hasApiPermission, refreshDashboardData } = useDashboard();
  const [tab, setTab] = useState<"broadcasts" | "calendar">("broadcasts");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<"announcement" | "alert" | "reminder">("announcement");
  const [targetType, setTargetType] = useState("parents");
  const [targetId, setTargetId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [templates, setTemplates] = useState<DashboardMessageTemplate[]>([]);
  const [templateModal, setTemplateModal] = useState(false);
  const [editTemplate, setEditTemplate] = useState<DashboardMessageTemplate | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateBody, setTemplateBody] = useState("");
  const [deliveryText, setDeliveryText] = useState<Record<string, string>>({});
  const canSend = hasApiPermission("broadcasts.send");
  const canSchedule = hasApiPermission("broadcasts.schedule");
  const canManageTemplates = canSend;

  useEffect(() => {
    if (apiStatus !== "live" || !hasApiPermission("broadcasts.view")) return;
    void fetchDashboardMessageTemplates({ active_only: true }).then(setTemplates).catch(() => setTemplates([]));
  }, [apiStatus, hasApiPermission]);

  const events = useMemo(() => {
    const now = new Date();
    return [...calendarEvents].sort((a,b)=>new Date(a.starts_at ?? 0).getTime()-new Date(b.starts_at ?? 0).getTime()).map((event) => {
      const start = new Date(event.starts_at ?? 0); const end = new Date(event.ends_at ?? event.starts_at ?? 0);
      const state = end.getTime() < now.getTime() ? "past" : start.toDateString() === now.toDateString() ? "today" : "upcoming";
      return { event, state };
    });
  }, [calendarEvents]);

  const gradeTargets = useMemo(() => Array.from(new Map(sections.filter((section) => section.gradeLevelId).map((section) => [section.gradeLevelId, section.gradeLevel])).entries()), [sections]);

  function useTemplate(template: DashboardMessageTemplate) {
    setTitle(template.title); setBody(template.body); setType(template.type as typeof type); setTargetType(template.default_target_type || "parents"); setTargetId(""); setTemplateModal(false);
  }

  async function submitBroadcast() {
    if (!title.trim() || !body.trim()) return;
    try {
      if ((targetType === "section" || targetType === "grade_level") && !targetId) {
        showToast("المستهدفون", targetType === "section" ? "اختر الشعبة المستهدفة." : "اختر المستوى الدراسي المستهدف.", "warning");
        return;
      }
      const created = await createBroadcast({
        title: title.trim(), body: body.trim(), type,
        target: { type: targetType, ...((targetType === "section" || targetType === "grade_level") ? { ids: [targetId] } : {}) }, channels: ["database", "push"],
        ...(scheduledAt ? { scheduled_at: new Date(scheduledAt).toISOString() } : {}),
        priority: type === "alert" ? "high" : "normal",
      });
      if (!scheduledAt) await sendBroadcastNow(created.id);
      showToast(scheduledAt ? "تمت جدولة الإشعار" : "تم إرسال الإشعار", "سيظهر داخل التطبيق مع إشعار على الهاتف عند تفعيل الإشعارات على جهاز المستلم.", "success");
      setTitle(""); setBody(""); setScheduledAt(""); await refreshDashboardData();
    } catch (error) { showToast("التعاميم والإشعارات", dashboardErrorMessage(error), "error"); }
  }

  function openTemplateEditor(template?: DashboardMessageTemplate) {
    setEditTemplate(template ?? null); setTemplateName(template?.name ?? ""); setTemplateTitle(template?.title ?? ""); setTemplateBody(template?.body ?? ""); setTemplateModal(true);
  }

  async function saveTemplate() {
    if (!templateName.trim() || !templateTitle.trim() || !templateBody.trim()) return;
    try {
      const payload = { name: templateName.trim(), title: templateTitle.trim(), body: templateBody.trim(), type, default_target_type: targetType, is_active: true };
      if (editTemplate) await updateDashboardMessageTemplate(editTemplate.id, payload); else await createDashboardMessageTemplate(payload);
      setTemplates(await fetchDashboardMessageTemplates({ active_only: true })); setTemplateModal(false);
    } catch (error) { showToast("قوالب المدرسة", dashboardErrorMessage(error), "error"); }
  }

  async function removeTemplate(template: DashboardMessageTemplate) {
    if (!window.confirm(`حذف قالب «${template.name}»؟`)) return;
    try { await deleteDashboardMessageTemplate(template.id); setTemplates((prev)=>prev.filter((item)=>item.id!==template.id)); } catch (error) { showToast("القوالب", dashboardErrorMessage(error), "error"); }
  }

  async function loadDelivery(id: string) {
    try { const d=await fetchBroadcastDeliveries(id); setDeliveryText((prev)=>({...prev,[id]:`مستهدف/قيد الإرسال ${d.queued+d.sent+d.failed} • تم الإرسال ${d.sent} • مقروء ${d.read} • فشل ${d.failed}`})); } catch { setDeliveryText((prev)=>({...prev,[id]:"تعذر تحميل إحصاءات التسليم"})); }
  }

  return <div className="dashboard-shell"><Sidebar/><div className="main-content"><Header title="التواصل والتقويم المدرسي" subtitle="تعاميم وإشعارات داخل التطبيق وعلى الهاتف، وتقويم فعاليات المدرسة"/><main className="page-body">
    <div className="segmented-control" style={{marginBottom:16}}><button className={tab==="broadcasts"?"active":""} onClick={()=>setTab("broadcasts")}><Bell size={16}/> التعاميم والإشعارات</button><button className={tab==="calendar"?"active":""} onClick={()=>setTab("calendar")}><CalendarDays size={16}/> التقويم والفعاليات</button></div>
    {tab==="broadcasts" ? <>
      {(canSend||canSchedule)&&<section className="card" style={{marginBottom:16}}><div className="card-header"><div><div className="card-title">إنشاء تعميم أو إشعار</div><div className="card-subtitle">القنوات الحالية: داخل التطبيق + إشعار الهاتف. المحادثات الفردية مسار مستقل.</div></div>{canManageTemplates&&<button className="btn btn-outline btn-sm" onClick={()=>openTemplateEditor()}><Plus size={15}/> إدارة/إضافة قالب</button>}</div>
      <div style={{padding:16,display:"grid",gap:12}}><div className="filter-toolbar"><select className="form-select" value={type} onChange={(e)=>setType(e.target.value as typeof type)}><option value="announcement">تعميم</option><option value="alert">تنبيه</option><option value="reminder">تذكير</option></select><select className="form-select" value={targetType} onChange={(e)=>{setTargetType(e.target.value);setTargetId("")}}><option value="parents">أولياء الأمور</option><option value="teachers">المعلمون</option><option value="all">الجميع</option><option value="section">شعبة محددة</option><option value="grade_level">مستوى دراسي</option></select>{targetType==="section"&&<select className="form-select" value={targetId} onChange={(e)=>setTargetId(e.target.value)}><option value="">اختر الشعبة</option>{sections.map((section)=><option key={section.id} value={section.id}>{section.name}</option>)}</select>}{targetType==="grade_level"&&<select className="form-select" value={targetId} onChange={(e)=>setTargetId(e.target.value)}><option value="">اختر المستوى</option>{gradeTargets.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select>}<input className="form-input" type="datetime-local" value={scheduledAt} onChange={(e)=>setScheduledAt(e.target.value)}/></div><input className="form-input" placeholder="عنوان الإشعار" value={title} onChange={(e)=>setTitle(e.target.value)}/><textarea className="form-input" rows={5} placeholder="نص الإشعار" value={body} onChange={(e)=>setBody(e.target.value)}/><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button className="btn btn-primary" onClick={()=>void submitBroadcast()} disabled={!title.trim()||!body.trim()||(scheduledAt?!canSchedule:!canSend)}><Send size={16}/> {scheduledAt?"جدولة الإرسال":"إرسال الآن"}</button>{(canSend||canSchedule)&&<button className="btn btn-outline" onClick={()=>setTemplateModal(true)}><FileText size={16}/> استخدام قالب</button>}<span className="badge badge-green">داخل التطبيق</span><span className="badge badge-blue">إشعار الهاتف</span></div></div></section>}
      <section className="card"><div className="card-header"><div><div className="card-title">سجل التعاميم</div><div className="card-subtitle">إحصاءات التسليم منفصلة عن القراءة ولا نستخدم تعبير «وصل إلى الهاتف».</div></div></div>{broadcasts.map((item)=><div className="feed-item" key={item.id}><div><strong>{item.title}</strong><div className="meta-text">{item.target_label ?? item.target?.type} • {item.status} • {item.sent_at ? new Date(item.sent_at).toLocaleString("ar-SA") : item.scheduled_at ? `مجدول ${new Date(item.scheduled_at).toLocaleString("ar-SA")}`:""}</div><div className="small-readable">{item.body}</div>{deliveryText[item.id]&&<div className="meta-text">{deliveryText[item.id]}</div>}</div><button className="btn btn-outline btn-sm" onClick={()=>void loadDelivery(item.id)}>إحصاءات التسليم</button></div>)}{broadcasts.length===0&&<div style={{padding:24,textAlign:"center"}}>لا توجد تعاميم بعد.</div>}</section>
    </> : <section className="card"><div className="card-header"><div><div className="card-title">الفعاليات المدرسية</div><div className="card-subtitle">الفعاليات القادمة أولًا، والمنتهية تظهر كأرشيف ولا تحمل زر تذكير.</div></div></div>{events.map(({event,state})=><div className="feed-item" key={event.id}><div><strong>{event.title}</strong><div className="meta-text">{event.starts_at ? new Date(event.starts_at).toLocaleString("ar-SA"):""} • {event.location ?? "بدون مكان"} • المستهدف: {event.audience_type}</div><div className="small-readable">{event.description}</div></div><span className={`badge ${state==="past"?"badge-gray":state==="today"?"badge-orange":"badge-green"}`}>{state==="past"?"منتهية":state==="today"?"اليوم":"قادمة"}</span></div>)}{events.length===0&&<div style={{padding:24,textAlign:"center"}}>لا توجد فعاليات.</div>}</section>}
  </main><Footer/></div>
  {templateModal&&<div className="modal-overlay" onClick={()=>setTemplateModal(false)}><div className="modal" onClick={(e)=>e.stopPropagation()} style={{maxWidth:700}}><div className="modal-header"><div><div className="card-title">قوالب المدرسة</div><div className="card-subtitle">القوالب خاصة بالمدرسة وقابلة للتعديل قبل كل إرسال.</div></div><button className="btn btn-ghost btn-sm" onClick={()=>setTemplateModal(false)}><X size={18}/></button></div><div className="modal-body">{canManageTemplates&&<div style={{display:"grid",gap:10,marginBottom:16}}><input className="form-input" placeholder="اسم القالب" value={templateName} onChange={(e)=>setTemplateName(e.target.value)}/><input className="form-input" placeholder="عنوان افتراضي" value={templateTitle} onChange={(e)=>setTemplateTitle(e.target.value)}/><textarea className="form-input" rows={4} placeholder="نص القالب" value={templateBody} onChange={(e)=>setTemplateBody(e.target.value)}/><button className="btn btn-primary" onClick={()=>void saveTemplate()}>{editTemplate?"حفظ تعديل القالب":"إضافة القالب"}</button></div>}{templates.map((template)=><div className="feed-item" key={template.id}><div><strong>{template.name}</strong><div className="meta-text">{template.title}</div></div><div style={{display:"flex",gap:6}}><button className="btn btn-outline btn-sm" onClick={()=>useTemplate(template)}>استخدام</button>{canManageTemplates&&<><button className="btn btn-ghost btn-sm" onClick={()=>openTemplateEditor(template)}>تعديل</button><button className="btn btn-ghost btn-sm" onClick={()=>void removeTemplate(template)}>حذف</button></>}</div></div>)}</div></div></div>}
  </div>;
}
