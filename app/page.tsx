"use client";

import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useDashboard } from "@/context/DashboardContext";
import { AlertTriangle, BookOpen, BusFront, GraduationCap, ShieldCheck, Users } from "lucide-react";

export default function HomePage(){
 const {dashboardSummary,teachers,busRoutes,dashboardBehaviorNotes,apiStatus}=useDashboard();
 const pendingBehavior=dashboardSummary?.pending?.behavior_notes??dashboardBehaviorNotes.filter(n=>n.status==="pending_review").length;
 const cards=[
  {label:"الطلاب",value:dashboardSummary?.students??"—",icon:<GraduationCap size={22}/>,href:"/students"},
  {label:"المعلمون",value:dashboardSummary?.teachers??"—",icon:<Users size={22}/>,href:"/teachers"},
  {label:"الشُعب",value:dashboardSummary?.sections??"—",icon:<BookOpen size={22}/>,href:"/academic"},
  {label:"نسبة الحضور اليوم",value:dashboardSummary?.attendance_today?.rate==null?"—":`${dashboardSummary.attendance_today.rate}%`,icon:<ShieldCheck size={22}/>,href:"/attendance"},
 ];
 return <div className="dashboard-shell"><Sidebar/><div className="main-content"><Header title="لوحة القيادة المدرسية" subtitle="ملخص تشغيلي مباشر من بيانات المدرسة بدون مؤشرات تجريبية أو ادعاءات غير مدعومة"/><main className="page-body">
  {apiStatus!=="live"&&<div className="card" style={{padding:16,marginBottom:16}}>سجّل الدخول لعرض بيانات المدرسة.</div>}
  <div className="kpi-grid" style={{marginBottom:18}}>{cards.map(card=><Link href={card.href} key={card.label} className="kpi-card" style={{textDecoration:"none"}}><div className="kpi-icon badge-blue">{card.icon}</div><div className="kpi-content"><div className="kpi-value">{card.value}</div><div className="kpi-label">{card.label}</div></div></Link>)}</div>
  <div className="grid-2">
   <section className="card"><div className="card-header"><div><div className="card-title">ما يحتاج تدخل الإدارة</div><div className="card-subtitle">عدادات تشغيلية حقيقية من الخادم.</div></div></div>
    <Link className="feed-item" href="/behavior"><div><strong>ملاحظات سلوكية بانتظار المراجعة</strong><div className="meta-text">مراجعة شؤون الطلاب قبل النشر لولي الأمر</div></div><span className={`badge ${pendingBehavior?"badge-red":"badge-green"}`}>{pendingBehavior}</span></Link>
    <Link className="feed-item" href="/operations"><div><strong>أعذار طبية بانتظار المراجعة</strong><div className="meta-text">مراجعة المستندات الطبية المرفوعة من ولي الأمر</div></div><span className="badge badge-orange">{dashboardSummary?.pending?.medical_excuses??0}</span></Link>
    <Link className="feed-item" href="/grades"><div><strong>اعتراضات درجات</strong><div className="meta-text">تحتاج مراجعة أكاديمية</div></div><span className="badge badge-orange">{dashboardSummary?.pending?.grade_appeals??0}</span></Link>
    <Link className="feed-item" href="/operations"><div><strong>طلبات خروج معلقة</strong></div><span className="badge badge-orange">{dashboardSummary?.pending?.leave_permits??0}</span></Link>
   </section>
   <section className="card"><div className="card-header"><div><div className="card-title">تشغيل المعلمين</div><div className="card-subtitle">حالة المعلمين والبيانات التشغيلية الأساسية.</div></div></div>{teachers.slice(0,6).map(t=><div className="feed-item" key={t.id}><div><strong>{t.name}</strong><div className="meta-text">{t.specialization}</div></div><span className={`badge ${t.activeStatus==="active"?"badge-green":"badge-gray"}`}>{t.activeStatus==="active"?"نشط":"غير نشط"}</span></div>)}</section>
  </div>
  <section className="card" style={{marginTop:18}}><div className="card-header"><div><div className="card-title">إدارة النقل المدرسي</div><div className="card-subtitle">إدارة المسارات والسائقين والطلاب والتنبيهات التشغيلية.</div></div><Link className="btn btn-outline btn-sm" href="/transport"><BusFront size={15}/> إدارة النقل</Link></div>{busRoutes.slice(0,4).map(route=><div className="feed-item" key={route.id}><div><strong>{route.routeName}</strong><div className="meta-text">السائق: {route.driverName} • اللوحة: {route.plateNumber}</div></div><span className="badge badge-blue">{route.assignedStudentsCount} طالب</span></div>)}{busRoutes.length===0&&<div style={{padding:20}}>لا توجد مسارات نقل مسجلة.</div>}</section>
  {pendingBehavior>0&&<div style={{marginTop:16,padding:12,borderRadius:12,background:"#FFF7ED",display:"flex",gap:8,alignItems:"center"}}><AlertTriangle size={17}/><span>يوجد {pendingBehavior} ملاحظات سلوكية تحتاج مراجعة شؤون الطلاب.</span></div>}
 </main><Footer/></div></div>
}
