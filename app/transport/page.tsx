"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useDashboard } from "@/context/DashboardContext";
import { BusFront, Phone, Users, BellRing, X, Plus, Edit3 } from "lucide-react";

interface RouteFormState {
  name: string;
  code: string;
  capacity: string;
  driverName: string;
  driverPhone: string;
  plateNumber: string;
  supervisorName: string;
  estimatedArrival: string;
}

const emptyForm: RouteFormState = { name: "", code: "", capacity: "40", driverName: "", driverPhone: "", plateNumber: "", supervisorName: "", estimatedArrival: "" };

export default function TransportPage(){
 const {
  busRoutes,transportSummary,transportPassengers,refreshTransportRouteDetails,
  sendTransportDelayAlert,logTransportDriverContact,createDashboardTransportRoute,
  updateDashboardTransportRoute,apiStatus,showToast,hasApiPermission,
 }=useDashboard();
 const [selectedId,setSelectedId]=useState<string|null>(null);
 const [delayModal,setDelayModal]=useState(false);
 const [delayMinutes,setDelayMinutes]=useState("15");
 const [delayMessage,setDelayMessage]=useState("");
 const [routeModal,setRouteModal]=useState<"create"|"edit"|null>(null);
 const [form,setForm]=useState<RouteFormState>(emptyForm);
 const selected=busRoutes.find(r=>r.id===selectedId)??null;
 const canManage=hasApiPermission("transport.manage");

 async function openRoute(id:string){setSelectedId(id);await refreshTransportRouteDetails(id)}
 async function contact(){if(!selected)return;await logTransportDriverContact(selected.id,"called","تم تسجيل محاولة اتصال من لوحة الإدارة");showToast("التواصل مع السائق","تم تسجيل محاولة الاتصال في سجل المسار.","info")}
 async function sendDelay(){if(!selected)return;await sendTransportDelayAlert(selected.id,Number(delayMinutes)||0,delayMessage.trim()||`تأخر متوقع ${delayMinutes} دقيقة`);setDelayModal(false);setDelayMessage("")}
 function openCreate(){setForm(emptyForm);setRouteModal("create")}
 function openEdit(routeId:string){const route=busRoutes.find(item=>item.id===routeId);if(!route)return;setSelectedId(routeId);setForm({name:route.routeName,code:"",capacity:String(route.capacity??40),driverName:route.driverName==="غير محدد"?"":route.driverName,driverPhone:route.driverPhone??"",plateNumber:route.plateNumber==="-"?"":route.plateNumber,supervisorName:route.supervisorName==="غير محدد"?"":route.supervisorName,estimatedArrival:route.estimatedArrival??""});setRouteModal("edit")}
 async function saveRoute(){
  const payload={name:form.name,code:form.code||undefined,capacity:Number(form.capacity)||40,driver_name:form.driverName||null,driver_phone:form.driverPhone||null,plate_number:form.plateNumber||null,supervisor_name:form.supervisorName||null,estimated_arrival_time:form.estimatedArrival||null};
  if(!form.name.trim()){showToast("بيانات المسار","اسم المسار مطلوب.","warning");return}
  if(routeModal==="edit"&&selectedId) await updateDashboardTransportRoute(selectedId,payload);
  else await createDashboardTransportRoute(payload);
  setRouteModal(null);setForm(emptyForm);
 }
 return <div className="dashboard-shell"><Sidebar/><div className="main-content"><Header title="إدارة النقل المدرسي" subtitle="إدارة المسارات والحافلات والسائقين والطلاب والتنبيهات التشغيلية"/><main className="page-body">
  <div className="kpi-grid" style={{marginBottom:16}}><div className="kpi-card"><div className="kpi-icon badge-blue"><BusFront size={20}/></div><div className="kpi-content"><div className="kpi-value">{transportSummary?.routes??busRoutes.length}</div><div className="kpi-label">مسارات النقل</div></div></div><div className="kpi-card"><div className="kpi-icon badge-green"><Users size={20}/></div><div className="kpi-content"><div className="kpi-value">{transportSummary?.assigned_students??"—"}</div><div className="kpi-label">طلاب مرتبطون بالمسارات</div></div></div></div>
  {apiStatus!=="live"?<div className="card" style={{padding:24}}>سجّل الدخول لعرض وإدارة مسارات النقل.</div>:<section className="card"><div className="card-header"><div><div className="card-title">المسارات والحافلات</div><div className="card-subtitle">بيانات السائق والحافلة والمسار تُدخلها الإدارة ويمكن تعديلها من هنا.</div></div>{canManage&&<button className="btn btn-primary btn-sm" onClick={openCreate}><Plus size={15}/> إضافة مسار</button>}</div><div className="data-table-wrap"><table className="data-table"><thead><tr><th>المسار</th><th>الحافلة</th><th>السائق</th><th>الطلاب/السعة</th><th>الإجراءات</th></tr></thead><tbody>{busRoutes.map(route=><tr key={route.id}><td><strong>{route.routeName}</strong><div className="meta-text">{route.estimatedArrival ? `موعد وصول مجدول: ${route.estimatedArrival}` : ""}</div></td><td>{route.plateNumber??"—"}</td><td>{route.driverName??"—"}<div className="meta-text">{route.driverPhone??""}</div></td><td>{route.assignedStudentsCount??0}{route.capacity?` من ${route.capacity}`:""}</td><td><div style={{display:"flex",gap:6,flexWrap:"wrap"}}><button className="btn btn-outline btn-sm" onClick={()=>void openRoute(route.id)}>التفاصيل والطلاب</button>{canManage&&<button className="btn btn-ghost btn-sm" onClick={()=>openEdit(route.id)}><Edit3 size={13}/> تعديل</button>}<button className="btn btn-ghost btn-sm" onClick={()=>{setSelectedId(route.id);setDelayModal(true)}}><BellRing size={14}/> تنبيه تأخير</button></div></td></tr>)}{busRoutes.length===0&&<tr><td colSpan={5} style={{textAlign:"center",padding:24}}>لا توجد مسارات نقل مسجلة.</td></tr>}</tbody></table></div></section>}
  {selected&&<section className="card" style={{marginTop:16}}><div className="card-header"><div><div className="card-title">{selected.routeName}</div><div className="card-subtitle">السائق: {selected.driverName??"غير محدد"} • {selected.driverPhone??"بدون رقم"}</div></div><button className="btn btn-outline btn-sm" onClick={()=>void contact()}><Phone size={15}/> تسجيل اتصال بالسائق</button></div><div className="data-table-wrap"><table className="data-table"><thead><tr><th>الطالب</th><th>حالة الارتباط</th></tr></thead><tbody>{(transportPassengers[selected.id]??[]).map(p=><tr key={p.assignment_id}><td><strong>{p.student_name}</strong><div className="meta-text">{p.section_name}</div></td><td><span className="badge badge-green">مرتبط</span></td></tr>)}{(transportPassengers[selected.id]??[]).length===0&&<tr><td colSpan={2} style={{textAlign:"center",padding:20}}>لا يوجد طلاب مرتبطون بالمسار.</td></tr>}</tbody></table></div></section>}
 </main><Footer/></div>
 {delayModal&&selected&&<div className="modal-overlay" onClick={()=>setDelayModal(false)}><div className="modal" onClick={(e)=>e.stopPropagation()} style={{maxWidth:500}}><div className="modal-header"><div><div className="card-title">إرسال تنبيه تأخير</div><div className="card-subtitle">{selected.routeName} — تنبيه يدوي للمستهدفين المرتبطين بالمسار.</div></div><button className="btn btn-ghost btn-sm" onClick={()=>setDelayModal(false)}><X size={18}/></button></div><div className="modal-body" style={{display:"grid",gap:10}}><input className="form-input" type="number" min="0" value={delayMinutes} onChange={(e)=>setDelayMinutes(e.target.value)} placeholder="عدد دقائق التأخير"/><textarea className="form-input" rows={4} value={delayMessage} onChange={(e)=>setDelayMessage(e.target.value)} placeholder="نص التنبيه"/></div><div className="modal-footer"><button className="btn btn-ghost" onClick={()=>setDelayModal(false)}>إلغاء</button><button className="btn btn-primary" onClick={()=>void sendDelay()}>إرسال التنبيه</button></div></div></div>}
 {routeModal&&<div className="modal-overlay" onClick={()=>setRouteModal(null)}><div className="modal" onClick={(e)=>e.stopPropagation()} style={{maxWidth:620}}><div className="modal-header"><div><div className="card-title">{routeModal==="create"?"إضافة مسار نقل":"تعديل بيانات المسار"}</div><div className="card-subtitle">بيانات تشغيلية تُدخلها إدارة المدرسة.</div></div><button className="btn btn-ghost btn-sm" onClick={()=>setRouteModal(null)}><X size={18}/></button></div><div className="modal-body" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><input className="form-input" value={form.name} onChange={(e)=>setForm(v=>({...v,name:e.target.value}))} placeholder="اسم المسار"/><input className="form-input" value={form.code} onChange={(e)=>setForm(v=>({...v,code:e.target.value}))} placeholder="كود المسار (اختياري)"/><input className="form-input" type="number" min="1" value={form.capacity} onChange={(e)=>setForm(v=>({...v,capacity:e.target.value}))} placeholder="السعة"/><input className="form-input" value={form.plateNumber} onChange={(e)=>setForm(v=>({...v,plateNumber:e.target.value}))} placeholder="رقم اللوحة"/><input className="form-input" value={form.driverName} onChange={(e)=>setForm(v=>({...v,driverName:e.target.value}))} placeholder="اسم السائق"/><input className="form-input" value={form.driverPhone} onChange={(e)=>setForm(v=>({...v,driverPhone:e.target.value}))} placeholder="جوال السائق"/><input className="form-input" value={form.supervisorName} onChange={(e)=>setForm(v=>({...v,supervisorName:e.target.value}))} placeholder="مشرف النقل (اختياري)"/><input className="form-input" type="time" value={form.estimatedArrival} onChange={(e)=>setForm(v=>({...v,estimatedArrival:e.target.value}))}/></div><div className="modal-footer"><button className="btn btn-ghost" onClick={()=>setRouteModal(null)}>إلغاء</button><button className="btn btn-primary" onClick={()=>void saveRoute()}>حفظ</button></div></div></div>}
 </div>
}
