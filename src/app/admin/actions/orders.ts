"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionStaff, fail, type ActionResult } from "@/lib/auth";
import type { OrderStatus } from "@/lib/types";

const STATUSES = [
  "pendente",
  "aguardando_pagamento",
  "pago",
  "em_preparacao",
  "saiu_para_entrega",
  "pronto_para_retirada",
  "concluido",
  "cancelado",
] as const satisfies readonly OrderStatus[];

export async function setOrderStatus(orderId: string, status: OrderStatus, note?: string): Promise<ActionResult> {
  try {
    const id = z.uuid().parse(orderId);
    const st = z.enum(STATUSES).parse(status);
    const { db } = await actionStaff();
    const { error } = await db.rpc("set_order_status", {
      p_order_id: id,
      p_status: st,
      p_note: note?.slice(0, 300) ?? null,
    });
    if (error) throw error;
    revalidatePath("/admin/pedidos");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function markOrderPaid(orderId: string): Promise<ActionResult> {
  try {
    const id = z.uuid().parse(orderId);
    const { db } = await actionStaff();
    const { error } = await db.rpc("mark_order_paid", { p_order_id: id });
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function saveInternalNotes(orderId: string, notes: string): Promise<ActionResult> {
  try {
    const id = z.uuid().parse(orderId);
    const { db } = await actionStaff();
    const { error } = await db
      .from("orders")
      .update({ internal_notes: notes.trim().slice(0, 2000) || null })
      .eq("id", id);
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
