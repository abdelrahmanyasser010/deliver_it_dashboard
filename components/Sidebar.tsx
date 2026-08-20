"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard, Users, GraduationCap, Calendar, Shield,
  ClipboardCheck, BookOpen, Bus, MessageSquare, BarChart3,
  ChevronLeft, ChevronRight, LogOut, FileCheck, Settings, Sparkles, X, Network, Wallet,
} from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";

const STORAGE_KEY = "edubridge.sidebar.collapsed";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    behaviorNotes,
    medicalExcuses,
    leavePermits,
    currentRole,
    currentUser,
    logoutDashboard,
    hasApiPermission,
    dashboardSummary,
    mobileMenuOpen,
    setMobileMenuOpen,
  } = useDashboard();

  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    setCollapsed(stored === "1");
  }, []);

  useEffect(() => {
    document.body.classList.toggle("sidebar-collapsed", collapsed);
    window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    return () => document.body.classList.remove("sidebar-collapsed");
  }, [collapsed]);

  const pendingNotes = behaviorNotes.filter(n => n.statusLabel === "مفتوحة").length;
  const pendingExcuses = medicalExcuses.filter(e => e.status === "pending").length;
  const pendingPermits = leavePermits.filter(p => p.status === "waiting_gate").length;

  const navItems = useMemo(() => [
    { label: "الرئيسية", href: "/", icon: LayoutDashboard, permissions: [] as string[] },
    { label: "مُنشئ هيكل المدرسة", href: "/configurator", icon: Network, special: true, permissions: ["academic.view", "academic.manage"] },
    { label: "الطلبات والأعذار اليومية", href: "/operations", icon: FileCheck, badge: pendingExcuses + pendingPermits, permissions: ["operations.view"] },
    { label: "شؤون الطلاب وأولياء الأمور", href: "/students", icon: GraduationCap, permissions: ["people.view"] },
    { label: "شؤون المعلمين وتوزيع الحصص", href: "/teachers", icon: Users, permissions: ["people.view"] },
    { label: "الفصول والمواد الدراسية", href: "/academic", icon: BookOpen, permissions: ["academic.view"] },
    { label: "الجداول وتغطية الحصص", href: "/schedule", icon: Calendar, permissions: ["schedule.view"] },
    { label: "السلوك والمتابعة", href: "/behavior", icon: Shield, badge: pendingNotes, permissions: ["behavior.view"] },
    { label: "الحضور والغياب", href: "/attendance", icon: ClipboardCheck, permissions: ["attendance.view"] },
    { label: "التقييمات والدرجات", href: "/grades", icon: BarChart3, permissions: ["grade.view"] },
    { label: "المالية والفواتير", href: "/finance", icon: Wallet, permissions: ["finance.view", "wallet.view", "payment.view"] },
    { label: "إدارة النقل المدرسي", href: "/transport", icon: Bus, badge: dashboardSummary?.transport?.delayed ?? 0, permissions: ["transport.view"] },
    { label: "التواصل والتقويم المدرسي", href: "/messages", icon: MessageSquare, permissions: ["broadcasts.view", "message.view", "schedule.view"] },
    { label: "التحليلات والتقارير", href: "/analytics", icon: Sparkles, permissions: ["report.view"] },
    { label: "الإعدادات والصلاحيات", href: "/settings", icon: Settings, permissions: ["rbac.view", "settings.view", "audit.view"] },
  ].filter((item) => item.permissions.length === 0 || item.permissions.some((permission) => hasApiPermission(permission))), [
    dashboardSummary?.transport?.delayed,
    hasApiPermission,
    pendingExcuses,
    pendingNotes,
    pendingPermits,
  ]);

  const handleLogout = async () => {
    await logoutDashboard();
    router.replace("/login");
  };

  return (
    <>
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="sidebar-backdrop"
        />
      )}

      <aside className={`sidebar ${collapsed ? "collapsed" : ""} ${mobileMenuOpen ? "open" : ""}`}>
        <div className="sidebar-logo">
          <div className="sidebar-brand">
            <Image
              src="/logo_new.png"
              alt="EduBridge Logo"
              width={40}
              height={40}
              className="sidebar-brand-logo"
            />
            {!collapsed && (
              <div className="sidebar-logo-text">
                <span>EduBridge</span>
                <span>لوحة الإدارة المدرسية</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="mobile-close-btn"
            title="إغلاق القائمة"
            aria-label="إغلاق القائمة"
          >
            <X size={20} />
          </button>
        </div>

        <button
          type="button"
          className="sidebar-collapse-btn"
          onClick={() => setCollapsed((value) => !value)}
          title={collapsed ? "توسيع القائمة" : "تصغير القائمة"}
          aria-label={collapsed ? "توسيع القائمة" : "تصغير القائمة"}
        >
          {collapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>

        <nav className="sidebar-nav">
          {!collapsed && <div className="nav-section-label">القوائم الإدارية والخدمات</div>}
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            const isSpecial = (item as { special?: boolean }).special;
            const badge = (item as { badge?: number }).badge ?? 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`nav-item${isActive ? " active" : ""}${isSpecial ? " special" : ""}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon />
                {!collapsed && <span className="nav-item-label">{item.label}</span>}
                {badge > 0 && <span className="nav-badge">{badge}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-role-badge" title={collapsed ? `${currentUser?.name || "مستخدم EduBridge"} — ${currentRole.label}` : undefined}>
            <div className="role-avatar">{currentRole.label.charAt(0)}</div>
            {!collapsed && (
              <div className="role-info">
                <div className="role-name">{currentUser?.name || "مستخدم EduBridge"}</div>
                <div className="role-title">{currentRole.label}</div>
              </div>
            )}
          </div>
          <button
            onClick={() => void handleLogout()}
            className="btn btn-ghost btn-sm sidebar-logout"
            title={collapsed ? "تسجيل الخروج" : undefined}
          >
            <LogOut size={14} />
            {!collapsed && "تسجيل الخروج"}
          </button>
        </div>
      </aside>
    </>
  );
}
