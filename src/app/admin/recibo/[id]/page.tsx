import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { ReceiptActions } from "@/components/admin/ReceiptActions";
import { requireStaff } from "@/lib/auth";
import { brl } from "@/lib/money";
import { PAYMENT_LABEL } from "@/lib/types";

export const metadata: Metadata = { title: "Recibo", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

function fmt(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Manaus",
  }).format(new Date(iso));
}

function phone(p: string) {
  const d = p.replace(/^55/, "");
  return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : p;
}

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { db } = await requireStaff();
  const [{ data: o }, { data: items }, { data: s }] = await Promise.all([
    db.from("orders").select("*").eq("id", id).maybeSingle(),
    db.from("order_items").select("product_name, variant_name, quantity, unit_price_cents, total_cents").eq("order_id", id).order("product_name"),
    db.from("store_settings").select("store_name, whatsapp, instagram, address, city").eq("id", 1).single(),
  ]);
  if (!o) notFound();
  const cancelled = o.status === "cancelado";
  const paid = Boolean(o.paid_at) && !cancelled;

  const text = [
    `*${s?.store_name ?? "YR Make e Variedades"}*`,
    `Comprovante de venda — Pedido ${o.code}`,
    `Data: ${fmt(o.created_at)}`,
    `Cliente: ${o.customer_name}`,
    "",
    ...(items ?? []).map(
      (i) => `• ${i.quantity}x ${i.product_name}${/^únic/i.test(i.variant_name) ? "" : ` (${i.variant_name})`} — ${brl(i.total_cents)}`,
    ),
    "",
    `Subtotal: ${brl(o.subtotal_cents)}`,
    ...(o.delivery_method === "entrega" ? [`Entrega: ${o.delivery_fee_cents ? brl(o.delivery_fee_cents) : "grátis"}`] : []),
    ...(o.discount_cents ? [`Desconto: -${brl(o.discount_cents)}`] : []),
    `*Total: ${brl(o.total_cents)}*`,
    `Pagamento: ${PAYMENT_LABEL[o.payment_method] ?? o.payment_method}${paid ? ` — PAGO em ${fmt(o.paid_at)}` : " — aguardando pagamento"}`,
    "",
    "Obrigada pela compra! 💕",
    "_Documento sem valor fiscal._",
  ].join("\n");

  return (
    <div className="min-h-dvh bg-page-soft px-4 py-6 text-ink print:bg-[#fff] print:p-0">
      <div className="mx-auto max-w-xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link href={`/admin/pedidos/${o.id}`} className="inline-flex items-center gap-1 text-sm text-muted hover:text-granat-700">
            <ChevronLeft size={16} /> Voltar ao pedido
          </Link>
          {!cancelled && <ReceiptActions phone={o.customer_phone} text={text} />}
        </div>

        {cancelled && (
          <p className="mb-4 rounded-2xl bg-tint p-3 text-sm text-granat-800 print:hidden">
            Este pedido foi cancelado. O recibo fica só para consulta.
          </p>
        )}

        <article className="relative overflow-hidden rounded-[28px] border border-line bg-surface p-7 shadow-[0_30px_80px_-50px_rgba(146,23,51,0.5)] print:rounded-none print:border-0 print:shadow-none">
          <header className="flex items-start justify-between gap-4 border-b border-line pb-5">
            <div>
              <p className="font-serif text-4xl font-semibold leading-none tracking-[-0.06em] text-ink">YR</p>
              <p className="mt-1 font-serif text-[10px] uppercase tracking-[0.28em] text-ink">Make e Variedades</p>
              <div className="mt-3 space-y-0.5 text-[11px] text-muted">
                {(s?.address || s?.city) && <p>{[s?.address, s?.city].filter(Boolean).join(" · ")}</p>}
                {s?.whatsapp && <p>WhatsApp {phone(s.whatsapp)}</p>}
                {s?.instagram && <p>@{s.instagram.replace(/^@/, "")}</p>}
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted">Comprovante de venda</p>
              <p className="mt-1 font-serif text-2xl text-granat-700">{o.code}</p>
              <p className="text-xs text-muted">{fmt(o.created_at)}</p>
            </div>
          </header>

          <section className="grid grid-cols-2 gap-4 border-b border-line py-4 text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Cliente</p>
              <p className="mt-1 font-medium">{o.customer_name}</p>
              <p className="text-xs text-muted">{phone(o.customer_phone)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Recebimento</p>
              <p className="mt-1">{o.delivery_method === "entrega" ? "Entrega" : "Retirada na loja"}</p>
              {o.delivery_method === "entrega" && (
                <p className="text-xs text-muted">
                  {o.address}
                  {o.neighborhood ? ` — ${o.neighborhood}` : ""}
                </p>
              )}
            </div>
          </section>

          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-[0.18em] text-muted">
                <th className="pb-2 font-normal">Produto</th>
                <th className="pb-2 text-center font-normal">Qtd</th>
                <th className="pb-2 text-right font-normal">Unit.</th>
                <th className="pb-2 text-right font-normal">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items?.map((i, idx) => (
                <tr key={idx}>
                  <td className="py-2 pr-2">
                    {i.product_name}
                    {!/^únic/i.test(i.variant_name) && <span className="block text-xs text-muted">{i.variant_name}</span>}
                  </td>
                  <td className="py-2 text-center tabular-nums">{i.quantity}</td>
                  <td className="py-2 text-right tabular-nums">{brl(i.unit_price_cents)}</td>
                  <td className="py-2 text-right tabular-nums">{brl(i.total_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <dl className="mt-4 ml-auto w-full max-w-60 space-y-1 border-t border-line pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal</dt>
              <dd className="tabular-nums">{brl(o.subtotal_cents)}</dd>
            </div>
            {o.delivery_method === "entrega" && (
              <div className="flex justify-between">
                <dt className="text-muted">Entrega</dt>
                <dd className="tabular-nums">{o.delivery_fee_cents ? brl(o.delivery_fee_cents) : "Grátis"}</dd>
              </div>
            )}
            {o.discount_cents > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted">Desconto</dt>
                <dd className="tabular-nums">-{brl(o.discount_cents)}</dd>
              </div>
            )}
            <div className="flex justify-between pt-1 text-base">
              <dt className="font-medium">Total</dt>
              <dd className="font-serif text-2xl text-granat-700 tabular-nums">{brl(o.total_cents)}</dd>
            </div>
          </dl>

          <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl bg-blush px-4 py-3 text-sm print:border print:border-line print:bg-surface">
            <span>
              Pagamento: <strong>{PAYMENT_LABEL[o.payment_method] ?? o.payment_method}</strong>
              {paid && <span className="block text-xs text-muted">em {fmt(o.paid_at)}</span>}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
                cancelled ? "bg-zinc-200 text-zinc-600" : paid ? "bg-emerald-600 text-white" : "bg-amber-100 text-amber-800"
              }`}
            >
              {cancelled ? "Cancelado" : paid ? "Pago" : "A pagar"}
            </span>
          </div>

          <footer className="mt-6 text-center">
            <p className="font-script text-3xl text-granat-600">Obrigada pela compra!</p>
            <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-muted">Documento sem valor fiscal</p>
          </footer>
        </article>
      </div>
    </div>
  );
}
