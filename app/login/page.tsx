"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, CheckCircle2, Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import { dashboardErrorMessage } from "@/lib/dashboardApi";

export default function LoginPage() {
  const router = useRouter();
  const { loginDashboard, isAuthenticated, apiStatus, apiError, currentSchool } = useDashboard();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && apiStatus === "live") {
      router.replace("/");
    }
  }, [apiStatus, isAuthenticated, router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setLoginError(null);

    try {
      await loginDashboard(email.trim(), password);
      router.replace("/");
    } catch (error) {
      setLoginError(dashboardErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 15% 20%, rgba(23,107,154,.18), transparent 42%), radial-gradient(circle at 85% 80%, rgba(124,195,65,.13), transparent 44%), #0c1a26",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "Cairo, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 940,
          display: "grid",
          gridTemplateColumns: "minmax(300px,.9fr) minmax(360px,1.1fr)",
          borderRadius: 28,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,.1)",
          boxShadow: "0 32px 80px rgba(0,0,0,.5)",
          background: "rgba(18,38,54,.86)",
        }}
      >
        <section
          style={{
            padding: "48px 38px",
            color: "white",
            background: "linear-gradient(145deg,#176B9A 0%,#12567d 62%,#12324b 100%)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 36,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 34 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, display: "grid", placeItems: "center", background: "rgba(255,255,255,.14)" }}>
                <Building2 size={27} color="#9ad75d" />
              </div>
              <div>
                <div style={{ fontWeight: 900, fontSize: 21 }}>EduBridge Pro</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.72)" }}>لوحة الإدارة المدرسية</div>
              </div>
            </div>

            <h1 style={{ fontSize: 28, lineHeight: 1.45, margin: "0 0 14px", fontWeight: 900 }}>
              دخول حقيقي متصل ببيانات المدرسة وصلاحيات الخادم
            </h1>
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.9, color: "rgba(255,255,255,.78)" }}>
              يتم تحديد المدرسة من نطاقها، وتحديد صلاحية المستخدم من حسابه في EduBridge. لا يوجد اختيار يدوي للدور أو دخول تجريبي يتجاوز الخادم.
            </p>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {["Bearer session مرتبطة بالجهاز", "الصلاحيات يتم تحميلها من /auth/me", "انتهاء الجلسة يعيدك تلقائياً لشاشة الدخول"].map((item) => (
              <div key={item} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 12.5, color: "rgba(255,255,255,.86)" }}>
                <CheckCircle2 size={16} color="#9ad75d" /> {item}
              </div>
            ))}
          </div>
        </section>

        <section style={{ padding: "48px 42px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "#9ad75d", fontSize: 12, fontWeight: 800, marginBottom: 12 }}>
            <ShieldCheck size={16} /> بوابة الدخول الآمنة
          </div>
          <h2 style={{ color: "white", margin: "0 0 8px", fontSize: 25, fontWeight: 900 }}>تسجيل الدخول</h2>
          <p style={{ color: "#8EABBE", fontSize: 13, lineHeight: 1.7, margin: "0 0 26px" }}>
            أدخل البريد وكلمة المرور فقط. معرف تثبيت المتصفح يتم إنشاؤه وإرساله تلقائياً في الخلفية.
          </p>

          {currentSchool?.name && (
            <div style={{ marginBottom: 18, padding: "10px 13px", borderRadius: 12, background: "rgba(23,107,154,.16)", color: "#B9DFF5", fontSize: 12.5 }}>
              المدرسة الحالية: <strong>{currentSchool.name}</strong>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 18 }}>
            <label style={{ display: "grid", gap: 8, color: "#9CB3C2", fontSize: 13, fontWeight: 700 }}>
              البريد الإلكتروني
              <div style={{ position: "relative" }}>
                <Mail size={18} color="#7C98AA" style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)" }} />
                <input
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@school.com"
                  style={{ width: "100%", boxSizing: "border-box", padding: "13px 44px 13px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,.14)", background: "rgba(10,24,36,.78)", color: "white", fontFamily: "Cairo, sans-serif", outline: "none" }}
                />
              </div>
            </label>

            <label style={{ display: "grid", gap: 8, color: "#9CB3C2", fontSize: 13, fontWeight: 700 }}>
              كلمة المرور
              <div style={{ position: "relative" }}>
                <Lock size={18} color="#7C98AA" style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)" }} />
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: "100%", boxSizing: "border-box", padding: "13px 44px", borderRadius: 12, border: "1px solid rgba(255,255,255,.14)", background: "rgba(10,24,36,.78)", color: "white", fontFamily: "Cairo, sans-serif", outline: "none" }}
                />
                <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", border: 0, background: "transparent", color: "#7C98AA", cursor: "pointer", display: "grid", placeItems: "center" }}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            {(loginError || apiError) && (
              <div role="alert" style={{ padding: "11px 13px", borderRadius: 12, border: "1px solid rgba(248,113,113,.32)", background: "rgba(127,29,29,.2)", color: "#FCA5A5", fontSize: 12.5, lineHeight: 1.7 }}>
                {loginError || apiError}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !email.trim() || !password}
              style={{ width: "100%", padding: 14, borderRadius: 14, border: 0, background: "linear-gradient(135deg,#176B9A,#1E86C0)", color: "white", fontFamily: "Cairo, sans-serif", fontWeight: 900, fontSize: 15, cursor: isLoading ? "wait" : "pointer", opacity: isLoading || !email.trim() || !password ? .72 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 9 }}
            >
              {isLoading ? "جاري التحقق من الحساب..." : "دخول لوحة التحكم"}
              {!isLoading && <ArrowRight size={18} />}
            </button>
          </form>

          <div style={{ marginTop: 22, color: "#6F8C9E", fontSize: 11.5, lineHeight: 1.8 }}>
            يتم تحديد المدرسة من عنوان النطاق الحالي، ولا يتم إرسال <code>school_code</code> أو <code>app_type</code> داخل طلب تسجيل الدخول.
          </div>
        </section>
      </div>
    </div>
  );
}
