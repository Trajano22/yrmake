import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/AdminNav";
import { requireStaff } from "@/lib/auth";

export const metadata: Metadata = {
  title: { default: "Painel", template: "%s · Painel YR" },
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { staff } = await requireStaff();
  return (
    <div className="min-h-dvh bg-page-soft lg:grid lg:grid-cols-[240px_1fr]">
      <AdminNav name={staff.full_name || staff.email} role={staff.role} />
      <div className="min-w-0 px-4 pb-24 pt-6 sm:px-8 lg:pt-10">{children}</div>
    </div>
  );
}
