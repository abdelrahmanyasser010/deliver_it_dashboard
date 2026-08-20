import type { Metadata } from "next";
import "./globals.css";
import { DashboardProvider } from "@/context/DashboardContext";
import ToastContainer from "@/components/ToastContainer";
import DashboardAuthGate from "@/components/DashboardAuthGate";

export const metadata: Metadata = {
  title: {
    template: "%s | EduBridge Pro",
    default: "EduBridge — لوحة تحكم الإدارة المدرسية والربط العائلي الذكي",
  },
  description: "نظام إدارة مدرسي يربط الإدارة بالمعلمين وأولياء الأمور ويدعم التشغيل الأكاديمي والإداري من منصة موحدة.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <DashboardProvider>
          <DashboardAuthGate>{children}</DashboardAuthGate>
          <ToastContainer />
        </DashboardProvider>
      </body>
    </html>
  );
}
