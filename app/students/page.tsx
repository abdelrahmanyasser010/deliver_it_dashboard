"use client";

import React, { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import OperationsModal from "@/components/OperationsModal";
import StudentProfileModal from "@/components/StudentProfileModal";
import { useDashboard } from "@/context/DashboardContext";
import { Student } from "@/data/mockData";
import { Plus, Search, Users, Eye, Bus } from "lucide-react";

export default function StudentsPage() {
  const { students, busRoutes, apiStatus, hasApiPermission } = useDashboard();
  const canManage = hasApiPermission("people.manage");
  const [searchTerm, setSearchTerm] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [profileStudent, setProfileStudent] = useState<Student | null>(null);

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.includes(searchTerm) ||
      s.studentCode.includes(searchTerm) ||
      s.parentName.includes(searchTerm);
    const matchesRisk = apiStatus === "live" || riskFilter === "all" || s.riskLevel === riskFilter;
    return matchesSearch && matchesRisk;
  });

  // Family groups: parentId → students[]
  const familyMap: Record<string, Student[]> = {};
  students.forEach(s => {
    if (!familyMap[s.parentId]) familyMap[s.parentId] = [];
    familyMap[s.parentId].push(s);
  });
  const familiesWithMultiple = Object.values(familyMap).filter(g => g.length > 1);

  return (
    <div className="dashboard-shell">
      <Sidebar />
      <div className="main-content">
        <Header
          title="شؤون الطلاب وأولياء الأمور"
          subtitle="إدارة سجلات الطلاب، الربط العائلي، وتفعيل التواصل الفوري مع تطبيق ولي الأمر"
        />
        <main className="page-body">

          {/* Controls Bar */}
          <div className="card" style={{ marginBottom: 20, padding: "16px 20px" }}>
            <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: 10, flex: 1, minWidth: 280 }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <input
                    type="text"
                    placeholder="ابحث باسم الطالب، الرقم المدرسي، أو ولي الأمر..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: "100%", height: 40, border: "1px solid var(--border)",
                      borderRadius: "var(--radius)", padding: "0 12px 0 36px",
                      fontFamily: "Cairo, sans-serif", fontSize: 13, outline: "none",
                      background: "var(--bg-page)", color: "var(--text-dark)",
                    }}
                  />
                  <Search size={16} color="var(--text-muted)" style={{ position: "absolute", left: 12, top: 12 }} />
                </div>
                {apiStatus !== "live" && <select
                  value={riskFilter}
                  onChange={(e) => setRiskFilter(e.target.value)}
                  style={{
                    height: 40, border: "1px solid var(--border)", borderRadius: "var(--radius)",
                    padding: "0 12px", fontFamily: "Cairo, sans-serif", fontSize: 13, outline: "none",
                    background: "var(--bg-page)", color: "var(--text-dark)", cursor: "pointer",
                  }}
                >
                  <option value="all">جميع الطلاب</option>
                  <option value="high">خطر عالي</option>
                  <option value="medium">تحت المتابعة</option>
                  <option value="low">مستقر</option>
                </select>}
              </div>
              {canManage && <button onClick={() => setAddModalOpen(true)} className="btn btn-primary">
                <Plus size={16} /> تسجيل طالب جديد
              </button>}
            </div>
          </div>

          {apiStatus === "live" && (
            <div className="card" style={{ marginBottom: 20, padding: "12px 16px", borderRight: "4px solid var(--primary)" }}>
              <div style={{ fontSize: 12.5, color: "var(--text-light)", lineHeight: 1.7 }}>تُعرض بيانات الطالب الأساسية والروابط العائلية المحفوظة. المؤشرات غير المتاحة لا يتم تقديرها أو توليدها تلقائيًا.</div>
            </div>
          )}

          {/* Family Linking Panel — only show families with 2+ students */}
          {familiesWithMultiple.length > 0 && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header">
                <div>
                  <div className="card-title">الربط العائلي — عائلات بأكثر من طالب</div>
                  <div className="card-subtitle">أولياء أمور لديهم أكثر من طالب مسجّل في المدرسة — ظاهرون في تطبيق ولي الأمر كبطاقات منفصلة</div>
                </div>
                <span className="badge badge-blue">{familiesWithMultiple.length} عائلة</span>
              </div>
              <div style={{ padding: "4px 0" }}>
                {familiesWithMultiple.map((group, gi) => (
                  <div
                    key={gi}
                    style={{
                      display: "flex", alignItems: "center", gap: 16,
                      padding: "12px 20px",
                      borderBottom: gi < familiesWithMultiple.length - 1 ? "1px solid var(--border-light)" : "none",
                    }}
                  >
                    {/* Parent Avatar */}
                    <div style={{
                      width: 40, height: 40, borderRadius: "50%",
                      background: "var(--primary-50)", color: "var(--primary)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 16, fontWeight: 800, flexShrink: 0,
                    }}>
                      👨‍👩‍👦
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 13.5, color: "var(--text-dark)", marginBottom: 4 }}>
                        {group[0].parentName}
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {group.map(s => (
                          <div
                            key={s.id}
                            onClick={() => setProfileStudent(s)}
                            style={{
                              display: "flex", alignItems: "center", gap: 6,
                              padding: "4px 10px", borderRadius: 20,
                              background: s.avatarColor + "15",
                              border: `1px solid ${s.avatarColor}30`,
                              cursor: "pointer",
                            }}
                          >
                            <div style={{
                              width: 20, height: 20, borderRadius: "50%",
                              background: s.avatarColor + "30", color: s.avatarColor,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 8, fontWeight: 800,
                            }}>{s.avatarInitials}</div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: s.avatarColor }}>{s.name}</span>
                            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{s.sectionName.split(" / ")[1] || ""}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <span className="badge badge-green" style={{ marginRight: "auto", flexShrink: 0 }}>
                      <span className="dot" /> {group.length} أبناء مرتبطون
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Students Table */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">سجل الطلاب الكامل</div>
                <div className="card-subtitle">اضغط على اسم أي طالب لعرض ملفه الكامل — {filteredStudents.length} طالب</div>
              </div>
            </div>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>الطالب والرقم المدرسي</th>
                    <th>الفصل الدراسي</th>
                    <th>ولي الأمر</th>
                    <th>المعدل</th>
                    <th>الحضور</th>
                    <th>الحافلة</th>
                    <th>المستوى</th>
                    <th>إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((stu) => {
                    const studentBus = busRoutes.find(b => b.id === stu.busRouteId);
                    return (
                      <tr key={stu.id} style={{ cursor: "pointer" }} onClick={() => setProfileStudent(stu)}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: "50%",
                              background: stu.avatarColor + "20", color: stu.avatarColor,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 13, fontWeight: 800, flexShrink: 0,
                            }}>{stu.avatarInitials}</div>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: 13.5, color: "var(--primary)", textDecoration: "underline dotted" }}>
                                {stu.name}
                              </div>
                              <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>{stu.studentCode}</div>
                            </div>
                          </div>
                        </td>
                        <td><span className="badge badge-gray" style={{ fontSize: 11 }}>{stu.sectionName}</span></td>
                        <td>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{stu.parentName}</div>
                          <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700 }}>{stu.parentName !== "—" ? "ولي أمر مرتبط بالسجل" : "لا يوجد ولي أمر مرتبط"}</div>
                        </td>
                        <td>
                          {apiStatus === "live" ? <span style={{ color: "var(--text-muted)" }}>—</span> : (
                            <span style={{ fontWeight: 800, color: stu.academicScore >= 85 ? "var(--green)" : stu.academicScore >= 70 ? "var(--warning)" : "var(--danger)" }}>{stu.academicScore}%</span>
                          )}
                        </td>
                        <td>
                          {apiStatus === "live" ? <span style={{ color: "var(--text-muted)" }}>—</span> : (
                            <span style={{ fontWeight: 800, color: stu.attendanceRate >= 90 ? "var(--green)" : "var(--danger)" }}>{stu.attendanceRate}%</span>
                          )}
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          {studentBus ? (
                            <span style={{ fontSize: 11.5, color: "var(--primary)", fontWeight: 700 }}>
                              🚌 {studentBus.routeName.replace("مسار ", "")}
                            </span>
                          ) : (
                            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>مع ولي الأمر</span>
                          )}
                        </td>
                        <td>
                          {apiStatus === "live" ? (
                            <span className="badge badge-gray">غير متاح</span>
                          ) : (
                            <span className={`badge ${stu.riskLevel === "high" ? "badge-red" : stu.riskLevel === "medium" ? "badge-orange" : "badge-green"}`}>
                              <span className="dot" />
                              {stu.riskLevel === "high" ? "خطر عالي" : stu.riskLevel === "medium" ? "متابعة" : "مستقر"}
                            </span>
                          )}
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              onClick={() => setProfileStudent(stu)}
                              className="btn btn-ghost btn-sm"
                              title="عرض الملف الكامل"
                            >
                              <Eye size={14} />
                            </button>

                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </main>
        <Footer />
      </div>

      <OperationsModal
        type={canManage && addModalOpen ? "add_student" : null}
        onClose={() => setAddModalOpen(false)}
      />

      <StudentProfileModal
        student={profileStudent}
        onClose={() => setProfileStudent(null)}
      />
    </div>
  );
}
