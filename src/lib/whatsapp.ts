import { brl } from "./money";
import { PAYMENT_LABEL, type OrderSummary } from "./types";

export function whatsappLink(phone: string, text: string) {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/** Mensagem pronta que a cliente envia para a loja depois de criar o pedido. */
export function orderMessage(o: OrderSummary, opts: { pixPaid?: boolean } = {}) {
  const lines = [
    opts.pixPaid
      ? `Olá! Fiz o pedido *${o.code}* pelo site e já paguei no PIX 💕 Segue o comprovante.`
      : `Olá! Acabei de fazer o pedido *${o.code}* pelo site 💕`,
    "",
    ...o.items.map(
      (i) =>
        `• ${i.quantity}x ${i.product_name}${i.variant_name && !/^únic/i.test(i.variant_name) ? ` (${i.variant_name})` : ""} — ${brl(i.total_cents)}`,
    ),
    "",
    `Subtotal: ${brl(o.subtotal_cents)}`,
  ];
  if (o.delivery_method === "entrega") {
    lines.push(`Entrega: ${o.delivery_fee_cents ? brl(o.delivery_fee_cents) : "grátis"}`);
  }
  lines.push(`*Total: ${brl(o.total_cents)}*`, "");
  lines.push(`Nome: ${o.customer_name}`);
  if (o.delivery_method === "entrega") {
    lines.push(`📍 Entrega: ${o.address}${o.neighborhood ? ` — ${o.neighborhood}` : ""}`);
    if (o.address_ref) lines.push(`Referência: ${o.address_ref}`);
  } else {
    lines.push("🛍️ Vou retirar na loja");
  }
  lines.push(`Pagamento: ${PAYMENT_LABEL[o.payment_method] ?? o.payment_method}`);
  if (o.notes) lines.push(`Obs.: ${o.notes}`);
  return lines.join("\n");
}
