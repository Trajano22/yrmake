"use server";

import { z } from "zod";
import { actionStaff, fail, type ActionResult } from "@/lib/auth";

const schema = z.object({
  variantId: z.uuid(),
  type: z.enum(["entrada", "saida", "ajuste"]),
  quantity: z.coerce.number().int("Use números inteiros.").min(0).max(100000),
  reason: z.string().trim().max(200).optional(),
});

export async function moveStock(input: z.input<typeof schema>): Promise<ActionResult> {
  try {
    const parsed = schema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const d = parsed.data;
    if (d.type !== "ajuste" && d.quantity === 0) return { ok: false, error: "Informe a quantidade." };
    const { db } = await actionStaff();
    const { data, error } = await db.rpc("adjust_stock", {
      p_variant_id: d.variantId,
      p_type: d.type,
      p_quantity: d.quantity,
      p_reason: d.reason ?? null,
    });
    if (error) throw error;
    return { ok: true, message: `Estoque agora: ${data}` };
  } catch (e) {
    return fail(e);
  }
}
