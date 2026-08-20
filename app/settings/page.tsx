"use client";

import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useDashboard, systemRoles } from "@/context/DashboardContext";
import type { Role } from "@/context/DashboardContext";
import { dashboardErrorMessage, updateRbacMatrix } from "@/lib/dashboardApi";
import { CheckCircle, Edit3, Lock, Save, Shield, UserPlus, Users, X } from "lucide-react";

type AccessLevel = "none" | "view" | "manage";
type Tab = "permissions" | "accounts";

interface PermissionModule {
  key: string;
  label: string;
  description: string;
  view: string[];
  manage: string[];
}

const permissionModules: PermissionModule[] = [
  { key: "people", label: "الطلاب وأولياء الأمور", description: "عرض ملفات الطلاب والعلاقات الأسرية وإدارتها.", view: ["people.view"], manage: ["people.manage"] },
  { key: "academic", label: "الهيكل الأكاديمي", description: "المستويات والشعب والمواد والتوزيعات الأكاديمية.", view: ["academic.view"], manage: ["academic.manage", "academic.publish"] },
  { key: "schedule", label: "الجداول وتغطية الحصص", description: "عرض الجداول وتعديلها وتكليف المعلم البديل.", view: ["schedule.view"], manage: ["schedule.manage", "schedule.publish", "operations.substitution_manage"] },
  { key: "attendance", label: "الحضور والغياب", description: "عرض حضور الحصص ومراجعة الأعذار والتعديلات الإدارية.", view: ["attendance.view"], manage: ["attendance.amend", "attendance.review_excuse"] },
  { key: "behavior", label: "السلوك والمتابعة", description: "عرض الملاحظات السلوكية ومراجعتها ونشرها وإغلاقها.", view: ["behavior.view"], manage: ["behavior.review", "behavior.publish", "behavior.resolve"] },
  { key: "grades", label: "التقييمات والدرجات", description: "عرض التقييمات واعتمادها ونشرها وقفلها ومراجعة الاعتراضات.", view: ["grade.view"], manage: ["grade.approve", "grade.publish", "grade.lock", "grade.appeal_review"] },
  { key: "operations", label: "شؤون الطلاب والطلبات", description: "تصاريح الخروج واستدعاءات أولياء الأمور والإجراءات اليومية.", view: ["operations.view"], manage: ["operations.leave_review", "operations.summons_manage"] },
  { key: "communication", label: "التعاميم والإشعارات", description: "عرض التعاميم وإرسال الإشعارات وجدولتها.", view: ["broadcasts.view", "message.view"], manage: ["broadcasts.send", "broadcasts.schedule", "broadcasts.cancel"] },
  { key: "transport", label: "إدارة النقل المدرسي", description: "المسارات والحافلات والطلاب والتنبيهات اليدوية.", view: ["transport.view"], manage: ["transport.manage", "transport.alerts.send"] },
  { key: "finance", label: "المالية والمدفوعات", description: "الفواتير والمدفوعات والاستردادات والتقارير المالية.", view: ["finance.view", "wallet.view", "payment.view"], manage: ["finance.manage", "finance.payments.record", "payment.collect", "payment.refund", "payment.reconcile"] },
  { key: "reports", label: "التقارير والتحليلات", description: "عرض التقارير وتصديرها حسب الصلاحية.", view: ["report.view"], manage: ["report.export"] },
  { key: "system", label: "إدارة النظام والصلاحيات", description: "الحسابات الإدارية وإعدادات المدرسة وسجل التدقيق.", view: ["rbac.view", "settings.view", "audit.view"], manage: ["rbac.manage", "settings.manage"] },
];

function roleLabel(key: string) {
  return systemRoles.find((role) => role.key === key)?.label ?? key;
}

export default function SettingsPage() {
  const {
    currentRole,
    currentUser,
    rbacMatrix,
    rbacPermissions,
    adminAccounts,
    addAdminAccount,
    updateAdminRole,
    updateAdminStatus,
    showToast,
    apiStatus,
    hasApiPermission,
    refreshDashboardData,
  } = useDashboard();

  const [activeTab, setActiveTab] = useState<Tab>("permissions");
  const [selectedRoleKey, setSelectedRoleKey] = useState<Role["key"]>("school_admin");
  const [draftPermissions, setDraftPermissions] = useState<Record<string, Set<string>> | null>(null);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<Role["key"]>("student_affairs");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<Role["key"]>("student_affairs");

  const availablePermissionKeys = useMemo(() => new Set(rbacPermissions.map((item) => item.key)), [rbacPermissions]);
  const canManage = hasApiPermission("rbac.manage");

  const basePermissions = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    for (const role of rbacMatrix?.roles ?? []) {
      map[role.key] = new Set(Object.entries(role.permissions).filter(([, enabled]) => enabled).map(([permission]) => permission));
    }
    return map;
  }, [rbacMatrix]);

  const workingPermissions = draftPermissions ?? basePermissions;
  const dirty = draftPermissions !== null;

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  const accessLevel = (roleKey: string, module: PermissionModule): AccessLevel => {
    const permissions = workingPermissions[roleKey] ?? new Set<string>();
    if (module.manage.some((permission) => permissions.has(permission))) return "manage";
    if (module.view.some((permission) => permissions.has(permission))) return "view";
    return "none";
  };

  const setLevel = (roleKey: string, module: PermissionModule, level: AccessLevel) => {
    if (!canManage || roleKey === "school_admin") return;

    const next: Record<string, Set<string>> = {};
    for (const role of rbacMatrix?.roles ?? []) {
      next[role.key] = new Set(workingPermissions[role.key] ?? []);
    }
    const permissions = next[roleKey] ?? new Set<string>();

    [...module.view, ...module.manage].forEach((permission) => permissions.delete(permission));
    if (level === "view" || level === "manage") {
      module.view.filter((permission) => availablePermissionKeys.has(permission)).forEach((permission) => permissions.add(permission));
    }
    if (level === "manage") {
      module.manage.filter((permission) => availablePermissionKeys.has(permission)).forEach((permission) => permissions.add(permission));
    }
    next[roleKey] = permissions;
    setDraftPermissions(next);
  };

  const savePermissionDraft = async () => {
    if (!rbacMatrix || !draftPermissions) return;
    setSavingPermissions(true);
    try {
      await updateRbacMatrix({
        roles: rbacMatrix.roles.map((role) => ({
          key: role.key,
          permissions: Array.from(draftPermissions[role.key] ?? basePermissions[role.key] ?? []).sort(),
        })),
      });
      setDraftPermissions(null);
      await refreshDashboardData();
      showToast("تم حفظ الصلاحيات", "تم تطبيق تغييرات الأدوار دفعة واحدة وتحديث الصلاحيات من الخادم.", "success");
    } catch (error) {
      showToast("تعذر حفظ الصلاحيات", dashboardErrorMessage(error), "error");
    } finally {
      setSavingPermissions(false);
    }
  };

  const createAccount = (event: React.FormEvent) => {
    event.preventDefault();
    addAdminAccount({
      name: newName.trim(),
      email: newEmail.trim(),
      phone: "",
      roleKey: newRole,
      roleLabel: roleLabel(newRole),
      status: "active",
    });
    setNewName("");
    setNewEmail("");
    setNewRole("student_affairs");
    setShowAddAccount(false);
  };

  const startEditRole = (accountId: string, roleKey: Role["key"]) => {
    setEditingAccountId(accountId);
    setEditingRole(roleKey);
  };

  const saveAccountRole = () => {
    if (!editingAccountId) return;
    const account = adminAccounts.find((item) => item.id === editingAccountId);
    if (!account || account.roleKey === editingRole) {
      setEditingAccountId(null);
      return;
    }
    if (account.roleKey === "school_admin" && !window.confirm("أنت على وشك خفض صلاحيات حساب مدير مدرسة. تأكد من وجود مدير مدرسة آخر قبل المتابعة.")) return;
    if (editingRole === "school_admin" && !window.confirm("سيحصل هذا الحساب على أعلى صلاحيات المدرسة. هل تريد المتابعة؟")) return;
    updateAdminRole(editingAccountId, editingRole);
    setEditingAccountId(null);
  };

  const selectedRole = systemRoles.find((role) => role.key === selectedRoleKey) ?? systemRoles[0];

  return (
    <div className="dashboard-shell">
      <Sidebar />
      <div className="main-content">
        <Header title="الإعدادات والصلاحيات" subtitle="إدارة الأدوار والحسابات الإدارية المسموح لها بالدخول إلى لوحة المدرسة" />
        <main className="page-body">
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header" style={{ gap: 14, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Shield size={22} color="var(--primary)" />
                <div>
                  <div className="card-title">حوكمة الوصول للوحة المدرسة</div>
                  <div className="card-subtitle">الدور الحقيقي يأتي من الخادم. لا يمكن للمستخدم تبديل دوره من الواجهة.</div>
                </div>
              </div>
              <span className="badge badge-blue">الدور الحالي: {currentRole.label}</span>
            </div>
          </div>

          <div className="segmented-control" style={{ marginBottom: 18 }}>
            <button className={activeTab === "permissions" ? "active" : ""} onClick={() => setActiveTab("permissions")}>الأدوار والصلاحيات</button>
            <button className={activeTab === "accounts" ? "active" : ""} onClick={() => setActiveTab("accounts")}>الحسابات الإدارية</button>
          </div>

          {activeTab === "permissions" && (
            <>
              <div className="card">
                <div className="card-header" style={{ gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div className="card-title">صلاحيات الأدوار</div>
                    <div className="card-subtitle">لكل قسم ثلاث حالات واضحة: لا وصول، عرض فقط، إدارة. مدير المدرسة محمي من التخفيض داخل هذه الشاشة.</div>
                  </div>
                  <div className="filter-toolbar" style={{ margin: 0 }}>
                    {systemRoles.map((role) => (
                      <button key={role.key} className={`btn ${selectedRoleKey === role.key ? "btn-primary" : "btn-ghost"} btn-sm`} onClick={() => setSelectedRoleKey(role.key)}>
                        {role.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ padding: "14px 18px", background: "var(--bg-page)", borderBottom: "1px solid var(--border-light)" }}>
                  <strong>{selectedRole.label}</strong>
                  <div className="small-readable">{selectedRole.description}</div>
                </div>

                <div style={{ display: "grid" }}>
                  {permissionModules.map((module) => {
                    const level = accessLevel(selectedRoleKey, module);
                    return (
                      <div key={module.key} className="feed-item" style={{ justifyContent: "space-between", gap: 16, borderBottom: "1px solid var(--border-light)" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 800, color: "var(--text-dark)" }}>{module.label}</div>
                          <div className="small-readable">{module.description}</div>
                        </div>
                        <div className="segmented-control" aria-label={`صلاحيات ${module.label}`}>
                          {(["none", "view", "manage"] as AccessLevel[]).map((value) => (
                            <button
                              key={value}
                              type="button"
                              className={level === value ? "active" : ""}
                              disabled={!canManage || selectedRoleKey === "school_admin"}
                              onClick={() => setLevel(selectedRoleKey, module, value)}
                            >
                              {value === "none" ? "لا وصول" : value === "view" ? "عرض فقط" : "إدارة"}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {dirty && (
                <div className="unsaved-bar">
                  <Lock size={16} color="var(--primary)" />
                  <strong style={{ flex: 1 }}>لديك تغييرات غير محفوظة في الصلاحيات</strong>
                  <button className="btn btn-ghost btn-sm" onClick={() => setDraftPermissions(null)}>إلغاء التغييرات</button>
                  <button className="btn btn-primary btn-sm" disabled={savingPermissions} onClick={() => void savePermissionDraft()}>
                    <Save size={14} /> {savingPermissions ? "جاري الحفظ..." : "حفظ التغييرات"}
                  </button>
                </div>
              )}
            </>
          )}

          {activeTab === "accounts" && (
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">الحسابات الإدارية</div>
                  <div className="card-subtitle">حسابات موظفي الإدارة فقط. المعلمون والطلاب وأولياء الأمور تدار من صفحاتهم المخصصة.</div>
                </div>
                {canManage && (
                  <button className="btn btn-primary btn-sm" onClick={() => setShowAddAccount(true)}><UserPlus size={14} /> إضافة حساب إداري</button>
                )}
              </div>
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr><th>المستخدم</th><th>الدور</th><th>الحالة</th><th>آخر نشاط</th><th>الإجراءات</th></tr>
                  </thead>
                  <tbody>
                    {adminAccounts.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: "center", padding: 30, color: "var(--text-muted)" }}>لا توجد حسابات إدارية محملة.</td></tr>
                    ) : adminAccounts.map((account) => (
                      <tr key={account.id}>
                        <td>
                          <div style={{ fontWeight: 800 }}>{account.name}</div>
                          <div className="small-readable">{account.email}</div>
                        </td>
                        <td><span className="badge badge-blue">{roleLabel(account.roleKey)}</span></td>
                        <td><span className={`badge ${account.status === "active" ? "badge-green" : "badge-gray"}`}>{account.status === "active" ? "نشط" : "موقوف"}</span></td>
                        <td className="small-readable">{account.lastLogin}</td>
                        <td>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {canManage && <button className="btn btn-ghost btn-sm" onClick={() => startEditRole(account.id, account.roleKey)}><Edit3 size={13} /> تعديل الدور</button>}
                            {canManage && account.email !== currentUser?.email && (
                              <button className="btn btn-ghost btn-sm" onClick={() => void updateAdminStatus(account.id, account.status === "active" ? "suspended" : "active")}>
                                {account.status === "active" ? "إيقاف" : "تفعيل"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {apiStatus !== "live" && (
            <div className="card" style={{ marginTop: 16, padding: 14, borderRight: "4px solid var(--warning)" }}>
              <div style={{ fontWeight: 800 }}>تنبيه بيئة التشغيل</div>
              <div className="small-readable">يجب تسجيل الدخول لتعديل الأدوار والحسابات.</div>
            </div>
          )}
        </main>
        <Footer />
      </div>

      {showAddAccount && (
        <Modal title="إضافة حساب إداري" onClose={() => setShowAddAccount(false)}>
          <form onSubmit={createAccount} style={{ display: "grid", gap: 14 }}>
            <Field label="اسم الموظف"><input className="form-input" required value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="الاسم الكامل" /></Field>
            <Field label="البريد الإلكتروني"><input className="form-input" required type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="name@school.sa" /></Field>
            <Field label="الدور الإداري">
              <select className="form-input" value={newRole} onChange={(e) => setNewRole(e.target.value as Role["key"])}>
                {systemRoles.map((role) => <option key={role.key} value={role.key}>{role.label}</option>)}
              </select>
            </Field>
            <div className="small-readable">الصلاحيات ستأتي من الدور المختار ويمكن تعديلها من تبويب الأدوار والصلاحيات.</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-primary" type="submit"><CheckCircle size={15} /> إنشاء الحساب</button>
              <button className="btn btn-ghost" type="button" onClick={() => setShowAddAccount(false)}>إلغاء</button>
            </div>
          </form>
        </Modal>
      )}

      {editingAccountId && (
        <Modal title="تعديل دور الحساب" onClose={() => setEditingAccountId(null)}>
          <div style={{ display: "grid", gap: 14 }}>
            <div className="small-readable">تغيير الدور يغير نطاق الصفحات والعمليات المسموح بها. لن يتم الحفظ حتى تضغط زر الحفظ.</div>
            <select className="form-input" value={editingRole} onChange={(e) => setEditingRole(e.target.value as Role["key"])}>
              {systemRoles.map((role) => <option key={role.key} value={role.key}>{role.label}</option>)}
            </select>
            <div style={{ padding: 12, borderRadius: 10, background: "var(--bg-page)" }}>
              <strong>تأثير الدور الجديد</strong>
              <div className="small-readable">{systemRoles.find((role) => role.key === editingRole)?.description}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-primary" onClick={saveAccountRole}><Save size={14} /> حفظ التغيير</button>
              <button className="btn btn-ghost" onClick={() => setEditingAccountId(null)}>إلغاء</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ display: "grid", gap: 6 }}><span style={{ fontSize: 12, fontWeight: 800 }}>{label}</span>{children}</label>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(18,60,86,.42)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="card" style={{ width: "100%", maxWidth: 520, boxShadow: "var(--shadow-lg)" }}>
        <div className="card-header">
          <div className="card-title">{title}</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="إغلاق"><X size={16} /></button>
        </div>
        <div style={{ padding: 18 }}>{children}</div>
      </div>
    </div>
  );
}
