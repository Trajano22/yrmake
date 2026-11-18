"use server";

import { redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";

export async function signIn(_: { error: string }, form: FormData): Promise<{ error: string }> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Preencha e-mail e senha." };

  const db = await serverClient();
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    // Registra só o motivo técnico (nunca a senha) para diagnóstico.
    console.warn("[login] falhou:", error?.code ?? "sem_usuario", error?.status ?? "", error?.message ?? "");
    if (error?.code === "email_not_confirmed") return { error: "Confirme o e-mail antes de entrar." };
    if (error?.status === 429) return { error: "Muitas tentativas. Espere alguns minutos e tente de novo." };
    if (error && error.code !== "invalid_credentials") return { error: "Não foi possível entrar agora. Tente de novo." };
    return { error: "E-mail ou senha incorretos." };
  }

  const { data: profile } = await db.from("profiles").select("active").eq("id", data.user.id).maybeSingle();
  if (!profile?.active) {
    await db.auth.signOut();
    return { error: "Esse usuário não tem acesso ao painel." };
  }
  redirect("/admin");
}

export async function signOut() {
  const db = await serverClient();
  await db.auth.signOut();
  redirect("/admin/login");
}
