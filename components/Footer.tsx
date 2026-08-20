"use client";

import React from "react";
import Image from "next/image";
import { ShieldCheck, Heart } from "lucide-react";

export default function Footer() {
  return (
    <footer className="app-footer">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Image src="/logo_new.png" alt="EduBridge Logo" width={22} height={22} style={{ borderRadius: 6 }} />
        <span style={{ fontWeight: 800, color: "var(--text-dark)" }}>EduBridge</span>
        <span>— نظام الإدارة المدرسية والربط العائلي الذكي</span>
        <span className="badge badge-blue" style={{ fontSize: 10, padding: "2px 8px" }}>v1.0 Pro</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <ShieldCheck size={14} color="var(--primary)" /> مصمم لاحتياجات الإدارة المدرسية السعودية
        </span>
        <span>
          صُنع بـ <Heart size={12} color="#DC2626" style={{ display: "inline", verticalAlign: "middle" }} /> لخدمة الإدارات المدرسية السعودية
        </span>
        <span style={{ fontWeight: 700 }}>© 2026 جميع الحقوق محفوظة</span>
      </div>
    </footer>
  );
}
