"use client";

import React from "react";
import { useDashboard } from "@/context/DashboardContext";
import { CheckCircle, AlertTriangle, XCircle, Info, X } from "lucide-react";

export default function ToastContainer() {
  const { toasts, removeToast } = useDashboard();

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: 24,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        maxWidth: 420,
        width: "calc(100% - 48px)",
      }}
    >
      {toasts.map((t) => {
        const bgMap = {
          success: "#F0FDF4",
          warning: "#FFF7ED",
          error: "#FEF2F2",
          info: "#EFF6FF",
        };
        const borderMap = {
          success: "#BBF7D0",
          warning: "#FED7AA",
          error: "#FECACA",
          info: "#BFDBFE",
        };
        const iconMap = {
          success: <CheckCircle size={20} color="#16A34A" />,
          warning: <AlertTriangle size={20} color="#EA580C" />,
          error: <XCircle size={20} color="#DC2626" />,
          info: <Info size={20} color="#2563EB" />,
        };

        return (
          <div
            key={t.id}
            style={{
              background: bgMap[t.type],
              border: `1px solid ${borderMap[t.type]}`,
              borderRadius: "var(--radius-lg)",
              padding: "16px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              direction: "rtl",
              animation: "slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            <div style={{ flexShrink: 0, marginTop: 2 }}>{iconMap[t.type]}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--text-dark)", marginBottom: 4 }}>
                {t.title}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-light)", lineHeight: 1.6 }}>
                {t.message}
              </div>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--text-muted)",
                padding: 4,
              }}
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
      <style jsx global>{`
        @keyframes slideIn {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
