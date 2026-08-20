"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, AlertCircle, LayoutDashboard, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "radial-gradient(circle at 50% 30%, #EFF6FF 0%, #F8FAFC 70%, #F1F5F9 100%)",
      padding: "24px", fontFamily: "Cairo, sans-serif", direction: "rtl",
    }}>
      <div style={{
        maxWidth: 500, width: "100%", background: "white", borderRadius: "var(--radius-xl)",
        padding: "40px 32px", textAlign: "center", boxShadow: "0 20px 40px rgba(0,0,0,0.06)",
        border: "1px solid var(--border)", position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 6,
          background: "linear-gradient(90deg, var(--primary) 0%, #3B82F6 50%, #60A5FA 100%)",
        }} />

        <div style={{
          width: 80, height: 80, borderRadius: "50%", background: "#FEF2F2", color: "#DC2626",
          display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px",
          boxShadow: "0 8px 16px rgba(220, 38, 38, 0.12)",
        }}>
          <AlertCircle size={40} />
        </div>

        <div style={{ fontSize: 32, fontWeight: 900, color: "var(--text-dark)", letterSpacing: -1, marginBottom: 8 }}>
          404 — الصفحة غير موجودة
        </div>
        <div style={{ fontSize: 14, color: "var(--text-light)", lineHeight: 1.7, marginBottom: 28 }}>
          عذراً، الرابط الذي تحاول الوصول إليه غير صحيح أو تم نقل الصفحة إلى مسار آخر في نظام <strong>EduBridge</strong> للإدارة المدرسية.
        </div>

        <div style={{ background: "var(--bg-page)", padding: "14px 18px", borderRadius: "var(--radius)", marginBottom: 28, fontSize: 12.5, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}>
          <span>💡 تأكد من صحة الرابط أو استخدم زر العودة للوحة القيادة</span>
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <Link href="/" className="btn btn-primary" style={{ padding: "0 24px", height: 44 }}>
            <LayoutDashboard size={18} /> العودة إلى الرئيسية
          </Link>
          <button onClick={() => window.history.back()} className="btn btn-outline" style={{ padding: "0 20px", height: 44 }}>
            <ArrowRight size={18} /> الصفحة السابقة
          </button>
        </div>

        <div style={{ marginTop: 32, paddingTop: 20, borderTop: "1px solid var(--border-light)", fontSize: 11.5, color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Image src="/logo_new.png" alt="Logo" width={18} height={18} style={{ borderRadius: 4 }} />
          <span>© 2026 EduBridge — نظام الإدارة المدرسية الذكي (v1.0)</span>
        </div>
      </div>
    </div>
  );
}
