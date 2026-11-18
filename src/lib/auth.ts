import "server-only";
import { redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";

export type Staff = { id: string; email: string; full_name: string; role: "owner" | "manager" | "staff" };

/** Confere no servidor se quem está chamando é da equipe (perfil ativo). */
export async function getStaff(): Promise<{ staff: Staff | null; db: Awaited<ReturnType<typeof serverClient>> }> {
  const db = await serverClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return { staff: null, db };
  const { data: profile } = await db
    .from("profiles")
    .select("full_name, role, active")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || !profile.active) return { staff: null, db };
  return { staff: { id: user.id, email: user.email ?? "", full_name: profile.full_name, role: profile.role }, db };
}

export async function requireStaff() {
  const { staff, db } = await getStaff();
  if (!staff) redirect("/admin/login?e=perfil");
  return { staff, db };
}

export async function requireManager() {
  const r = await requireStaff();
  if (r.staff.role === "staff") redirect("/admin?e=permissao");
  return r;
}

/** Para Server Actions: devolve erro em vez de redirecionar. */
export async function actionStaff(level: "staff" | "manager" = "staff") {
  const { staff, db } = await getStaff();
  if (!staff) throw new Error("Sessão expirada. Entre de novo.");
  if (level === "manager" && staff.role === "staff") throw new Error("Sem permissão.");
  return { staff, db };
}

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

export function fail(e: unknown): ActionResult {
  const msg =
    e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string"
      ? (e as { message: string }).message
      : "Algo deu errado.";
  return { ok: false, error: translate(msg) };
}

function translate(msg: string) {
  if (msg.includes("duplicate key") && msg.includes("sku")) return "Já existe uma variação com esse SKU.";
  if (msg.includes("duplicate key") && msg.includes("slug")) return "Já existe um item com esse endereço (slug).";
  if (msg.includes("violates foreign key") || msg.includes("restrict"))
    return "Não dá para excluir: já tem vendas ou movimentações. Arquive em vez de excluir.";
  if (msg.includes("promo_price_cents")) return "O preço promocional precisa ser menor que o preço normal.";
  if (msg.includes("row-level security") || msg.includes("permission denied")) return "Sem permissão para isso.";
  return msg;
}
