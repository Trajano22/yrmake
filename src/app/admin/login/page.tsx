import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "./LoginForm";
import { getStaff } from "@/lib/auth";
import { isConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Entrar", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  if (isConfigured) {
    const { staff } = await getStaff();
    if (staff) redirect("/admin");
  }
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[linear-gradient(180deg,#fce3e8_0%,#ffffff_70%)] px-4">
      <div className="w-full max-w-sm rounded-[32px] bg-white p-8 shadow-[0_30px_80px_-40px_rgba(146,23,51,0.45)]">
        <div className="text-center">
          <p className="font-serif text-5xl font-semibold tracking-[-0.06em] text-granat-950">YR</p>
          <p className="font-script text-2xl text-granat-600">painel</p>
        </div>
        {!isConfigured && (
          <p className="mt-6 rounded-2xl bg-amber-50 p-3 text-xs text-amber-900">
            Configure as variáveis do Supabase antes de entrar (veja o README).
          </p>
        )}
        {e === "perfil" && (
          <p className="mt-6 rounded-2xl bg-granat-50 p-3 text-xs text-granat-800">
            Esse usuário não tem acesso ao painel.
          </p>
        )}
        <LoginForm />
      </div>
    </div>
  );
}
