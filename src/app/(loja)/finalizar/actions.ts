"use server";

import { z } from "zod";
import { isConfigured } from "@/lib/env";
import { publicClient } from "@/lib/supabase/public";
import type { OrderSummary } from "@/lib/types";

const schema = z.object({
  idempotency_key: z.uuid(),
  customer_name: z.string().trim().min(2, "Informe seu nome.").max(80),
  customer_phone: z
    .string()
    .transform((s) => s.replace(/\D/g, ""))
    .refine((s) => s.length >= 10 && s.length <= 13, "Informe um WhatsApp válido com DDD."),
  delivery_method: z.enum(["entrega", "retirada"]),
  address: z.string().trim().max(200).optional().default(""),
  neighborhood: z.string().trim().max(80).optional().default(""),
  address_ref: z.string().trim().max(120).optional().default(""),
  payment_method: z.enum(["pix", "dinheiro", "cartao"]),
  notes: z.string().trim().max(500).optional().default(""),
  items: z
    .array(z.object({ variant_id: z.uuid(), quantity: z.number().int().min(1).max(20) }))
    .min(1, "Seu carrinho está vazio.")
    .max(30),
});

export type CreateOrderResult = { ok: true; order: OrderSummary; whatsapp: string } | { ok: false; error: string };

/**
 * Cria o pedido. Só mandamos ao banco "qual variação e quantas";
 * preço, frete e estoque são calculados dentro do banco (função create_order).
 */
export async function createOrder(input: unknown): Promise<CreateOrderResult> {
  if (!isConfigured) return { ok: false, error: "Loja ainda não configurada." };
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Confira os dados do pedido." };
  }
  const data = parsed.data;
  if (data.delivery_method === "entrega" && (data.address.length < 5 || data.neighborhood.length < 2)) {
    return { ok: false, error: "Informe endereço e bairro para a entrega." };
  }

  const db = publicClient();
  const { data: order, error } = await db.rpc("create_order", { payload: data });
  if (error) {
    // Mensagens do banco já vêm em português e sem detalhes internos (raise exception).
    const msg = error.code === "P0001" ? error.message : "Não foi possível registrar o pedido. Tente de novo.";
    if (error.code !== "P0001") console.error("create_order", error);
    return { ok: false, error: msg };
  }
  const { data: s } = await db.from("public_settings").select("whatsapp").maybeSingle();
  return { ok: true, order: order as OrderSummary, whatsapp: s?.whatsapp ?? "" };
}
