"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionStaff, fail, type ActionResult } from "@/lib/auth";
import { parseCents } from "@/lib/money";

function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const optMoney = z
  .string()
  .optional()
  .transform((v, ctx) => {
    const c = parseCents(v ?? "");
    if (c === null) return null;
    if (Number.isNaN(c) || c < 0) {
      ctx.addIssue({ code: "custom", message: "Valor em reais inválido." });
      return null;
    }
    return c;
  });

const settingsSchema = z.object({
  store_name: z.string().trim().min(2).max(80),
  whatsapp: z
    .string()
    .transform((s) => s.replace(/\D/g, ""))
    .transform((s) => (s.length === 10 || s.length === 11 ? `55${s}` : s))
    .refine((s) => s === "" || /^[0-9]{12,13}$/.test(s), "WhatsApp inválido. Use DDD + número."),
  instagram: z.string().trim().max(60).transform((s) => s.replace(/^@/, "")),
  city: z.string().trim().max(80),
  address: z.string().trim().max(200),
  pickup_address: z.string().trim().max(200),
  pickup_hours: z.string().trim().max(120),
  about: z.string().trim().max(600),
  delivery_fee: optMoney,
  free_delivery_min: optMoney,
  min_order: optMoney,
  reservation_hours: z.coerce.number().int().min(1, "Reserva: mínimo 1 hora.").max(168, "Reserva: máximo 168 horas."),
  accepting_orders: z.boolean(),
});

export async function saveSettings(input: z.input<typeof settingsSchema>): Promise<ActionResult> {
  try {
    const p = settingsSchema.safeParse(input);
    if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Confira os campos." };
    const { delivery_fee, free_delivery_min, min_order, ...rest } = p.data;
    const { db } = await actionStaff("manager");
    const { error } = await db
      .from("store_settings")
      .update({
        ...rest,
        delivery_fee_cents: delivery_fee ?? 0,
        free_delivery_min_cents: free_delivery_min || null,
        min_order_cents: min_order ?? 0,
      })
      .eq("id", 1);
    if (error) throw error;
    revalidatePath("/", "layout");
    return { ok: true, message: "Configurações salvas ✓" };
  } catch (e) {
    return fail(e);
  }
}

export async function saveCategory(id: string | null, name: string, active = true): Promise<ActionResult> {
  try {
    const n = z.string().trim().min(2, "Nome muito curto.").max(60).parse(name);
    const { db } = await actionStaff("manager");
    if (id) {
      z.uuid().parse(id);
      const { error } = await db.from("categories").update({ name: n, active }).eq("id", id);
      if (error) throw error;
    } else {
      const { count } = await db.from("categories").select("id", { count: "exact", head: true });
      const { error } = await db.from("categories").insert({ name: n, slug: slugify(n) || `categoria-${Date.now()}`, position: (count ?? 0) + 1 });
      if (error) throw error;
    }
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function moveCategory(id: string, dir: -1 | 1): Promise<ActionResult> {
  try {
    z.uuid().parse(id);
    const { db } = await actionStaff("manager");
    const { data: cats } = await db.from("categories").select("id").order("position").order("name");
    const list = (cats ?? []).map((c) => c.id);
    const i = list.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return { ok: true };
    [list[i], list[j]] = [list[j], list[i]];
    for (let k = 0; k < list.length; k++) {
      const { error } = await db.from("categories").update({ position: k + 1 }).eq("id", list[k]);
      if (error) throw error;
    }
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
