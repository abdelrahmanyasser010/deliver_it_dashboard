"use client";

import React, { useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import OperationsModal from "@/components/OperationsModal";
import { useDashboard } from "@/context/DashboardContext";
import { Filter, Mail, Phone, Plus, Search, Users } from "lucide-react";

export default function TeachersPage() {
  const { teachers, hasApiPermission } = useDashboard();
  const canManage = hasApiPermission("people.manage");
  const [searchTerm, setSearchTerm] = useState("");
  const [specFilter, setSpecFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);

  const specializations = useMemo(
    () => Array.from(new Set(teachers.map((teacher) => teacher.specialization).filter(Boolean))).sort(),
    [teachers],
  );

  const filteredTeachers = teachers.filter((teacher) => {
    const q = searchTerm.trim();
    const matchesSearch = !q || teacher.name.includes(q) || teacher.email.includes(q) || teacher.specialization.includes(q);
    const matchesSpec = specFilter === "all" || teacher.specialization === specFilter;
    const status = teacher.activeStatus === "inactive" ? "inactive" : "active";
    const matchesStatus = statusFilter === "all" || statusFilter === status;
    return matchesSearch && matchesSpec && matchesStatus;
  });

  return (
    <div className="dashboard-shell">
      <Sidebar />
      <div className="main-content">
        <Header title="المعلمين والتوزيع الأكاديمي" subtitle="إدارة بيانات المعلمين وتخصصاتهم والتوزيعات المرتبطة بهم" />
        <main className="page-body">
          <div className="card" style={{ marginBottom: 18, padding: "14px 18px" }}>
            <div className="filter-toolbar" style={{ margin: 0 }}>
              <div style={{ position: "relative", flex: "1 1 280px" }}>
                <Search size={16} color="var(--text-muted)" style={{ position: "absolute", right: 12, top: 12 }} />
                <input
                  className="form-input"
                  style={{ paddingRight: 36 }}
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="ابحث باسم المعلم أو البريد أو التخصص..."
                />
              </div>
              <select className="form-input" style={{ width: 190 }} value={specFilter} onChange={(event) => setSpecFilter(event.target.value)}>
                <option value="all">جميع التخصصات</option>
                {specializations.map((specialization) => <option key={specialization}>{specialization}</option>)}
              </select>
              <select className="form-input" style={{ width: 150 }} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">كل الحالات</option>
                <option value="active">نشط</option>
                <option value="inactive">مؤرشف / غير نشط</option>
              </select>
              {canManage && <button className="btn btn-primary" onClick={() => setModalOpen(true)}><Plus size={15} /> إضافة معلم</button>}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">دليل المعلمين</div>
                <div className="card-subtitle">{filteredTeachers.length} معلم — التغطية بالمعلم البديل تبدأ من الحصة الفعلية في صفحة الجداول، وليست من حالة ملف المعلم.</div>
              </div>
              <span className="badge badge-blue"><Users size={12} /> {filteredTeachers.length}</span>
            </div>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>المعلم</th>
                    <th>التخصص</th>
                    <th>بيانات الاتصال</th>
                    <th>الحالة</th>
                    <th>التوزيعات الحالية</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeachers.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: "center", padding: 28, color: "var(--text-muted)" }}>لا توجد نتائج مطابقة للفلاتر الحالية.</td></tr>
                  ) : filteredTeachers.map((teacher) => {
                    const active = teacher.activeStatus !== "inactive";
                    return (
                      <tr key={teacher.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${teacher.avatarColor}20`, color: teacher.avatarColor, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>{teacher.avatarInitials}</div>
                            <div>
                              <div style={{ fontWeight: 800 }}>{teacher.name}</div>
                              <div className="small-readable">معلم</div>
                            </div>
                          </div>
                        </td>
                        <td><span className="badge badge-gray">{teacher.specialization || "غير محدد"}</span></td>
                        <td>
                          <div className="small-readable" style={{ display: "grid", gap: 3 }}>
                            <span><Mail size={12} style={{ verticalAlign: "middle" }} /> {teacher.email || "—"}</span>
                            <span><Phone size={12} style={{ verticalAlign: "middle" }} /> {teacher.phone || "—"}</span>
                          </div>
                        </td>
                        <td><span className={`badge ${active ? "badge-green" : "badge-gray"}`}>{active ? "نشط" : "مؤرشف / غير نشط"}</span></td>
                        <td className="small-readable">
                          {teacher.assignedSections?.length || teacher.assignedSubjects?.length
                            ? `${teacher.assignedSections?.length ?? 0} شُعب • ${teacher.assignedSubjects?.length ?? 0} مواد`
                            : "لا توجد توزيعات محملة"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card" style={{ marginTop: 16, padding: 14, borderRight: "4px solid var(--primary)" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}><Filter size={16} color="var(--primary)" /><strong>ملاحظة تشغيلية</strong></div>
            <div className="small-readable">حالة الملف هنا تعكس حالة حساب المعلم، بينما تكليف البديل يتم من الحصة الفعلية في صفحة الجداول.</div>
          </div>
        </main>
        <Footer />
      </div>

      <OperationsModal type={canManage && modalOpen ? "add_teacher" : null} onClose={() => setModalOpen(false)} />
    </div>
  );
}
