"use client";

import React, { useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AlertTriangle, LoaderCircle, LogIn, RefreshCw, ShieldX } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import { hasDashboardToken } from "@/lib/dashboardApi";

type RouteRule = { prefix: string; anyOf: string[] };

const routeRules: RouteRule[] = [
  { prefix: "/configurator", anyOf: ["settings.view"] },
  { prefix: "/operations", anyOf: ["attendance.review_excuse", "operations.leave_review", "operations.summons_manage", "operations.substitution_manage"] },
  { prefix: "/students", anyOf: ["people.view"] },
  { prefix: "/teachers", anyOf: ["people.view"] },
  { prefix: "/academic", anyOf: ["academic.view"] },
  { prefix: "/schedule", anyOf: ["schedule.view"] },
  { prefix: "/behavior", anyOf: ["behavior.view"] },
  { prefix: "/attendance", anyOf: ["attendance.view"] },
  { prefix: "/grades", anyOf: ["grade.view"] },
  { prefix: "/finance", anyOf: ["finance.view"] },
  { prefix: "/transport", anyOf: ["transport.view"] },
  { prefix: "/messages", anyOf: ["broadcasts.view", "schedule.view", "message.view"] },
  { prefix: "/analytics", anyOf: ["report.view"] },
  { prefix: "/settings", anyOf: ["settings.view", "integrations.view", "rbac.view", "audit.view"] },
];

function Screen({ icon, title, message, action }: { icon: React.ReactNode; title: string; message: string; action?: React.ReactNode }) {
  return (
    <div dir="rtl" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "var(--bg-page, #f5f7f9)", fontFamily: "Cairo, sans-serif" }}>
      <div style={{ width: "min(520px,100%)", background: "white", border: "1px solid #e5e7eb", borderRadius: 20, padding: 28, textAlign: "center", boxShadow: "0 16px 50px rgba(15,23,42,.08)" }}>
        <div style={{ width: 52, height: 52, borderRadius: 16, margin: "0 auto 14px", display: "grid", placeItems: "center", background: "#EFF6FF", color: "#176B9A" }}>{icon}</div>
        <div style={{ fontWeight: 900, fontSize: 19, color: "#162633", marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 13, lineHeight: 1.8, color: "#6b7280", marginBottom: action ? 18 : 0 }}>{message}</div>
        {action}
      </div>
    </div>
  );
}

export default function DashboardAuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { apiStatus, apiError, isAuthenticated, backendPermissions, refreshDashboardData } = useDashboard();
  const isLogin = pathname === "/login";

  const requiredPermissions = useMemo(() => {
    const rule = routeRules.find((item) => pathname === item.prefix || pathname.startsWith(`${item.prefix}/`));
    return rule?.anyOf ?? [];
  }, [pathname]);

  const allowed = requiredPermissions.length === 0 || requiredPermissions.some((permission) => backendPermissions.includes(permission));

  useEffect(() => {
    if (isLogin) return;
    if (apiStatus !== "loading" && (!hasDashboardToken() || !isAuthenticated)) {
      router.replace("/login");
    }
  }, [apiStatus, isAuthenticated, isLogin, router]);

  if (isLogin) return <>{children}</>;

  if (apiStatus === "loading") {
    return <Screen icon={<LoaderCircle size={27} />} title="جاري تحميل بيانات المدرسة" message="يتم التحقق من الجلسة والصلاحيات ومزامنة وحدات لوحة التحكم." />;
  }

  if (!hasDashboardToken() || !isAuthenticated) {
    return <Screen icon={<LogIn size={27} />} title="يلزم تسجيل الدخول" message="يتم توجيهك إلى بوابة الدخول الآمنة..." />;
  }

  if (apiStatus === "error") {
    return (
      <Screen
        icon={<AlertTriangle size={27} />}
        title="تعذر مزامنة لوحة التحكم"
        message={apiError || "تعذر الوصول إلى بيانات لوحة التحكم. حاول إعادة الاتصال."}
        action={
          <button className="btn btn-primary" onClick={() => void refreshDashboardData()}>
            <RefreshCw size={15} /> إعادة المحاولة
          </button>
        }
      />
    );
  }

  if (!allowed) {
    return (
      <Screen
        icon={<ShieldX size={27} />}
        title="لا تملك صلاحية فتح هذه الصفحة"
        message="الدور الحالي مصرح له بالدخول إلى لوحة الإدارة، لكن هذه الوحدة تتطلب صلاحية إضافية من الخادم."
        action={<button className="btn btn-primary" onClick={() => router.replace("/")}>العودة للرئيسية</button>}
      />
    );
  }

  return <>{children}</>;
}
