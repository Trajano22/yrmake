import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, MessageCircle, ReceiptText } from "lucide-react";
import { ActionButton } from "@/components/admin/ActionButton";
import { NotesForm } from "@/components/admin/NotesForm";
import { Card, PageHeader, StatusBadge, formatDate } from "@/components/admin/ui";
import { markOrderPaid, setOrderStatus } from "@/app/admin/actions/orders";
import { requireStaff } from "@/lib/auth";
import { brl } from "@/lib/money";
import { PAYMENT_LABEL, STATUS_LABEL, type OrderStatus } from "@/lib/types";
import { whatsappLink } from "@/lib/whatsapp";

export const metadata = { title: "Pedido" };

function nextSteps(status: OrderStatus, method: "entrega" | "retirada"): OrderStatus[] {
  const final: OrderStatus = method === "entrega" ? "saiu_para_entrega" : "pronto_para_retirada";
  switch (status) {
    case "pendente":
      return ["aguardando_pagamento", "pago", "em_preparacao"];
    case "aguardando_pagamento":
      return ["pago", "em_preparacao"];
    case "pago":
      return ["em_preparacao", final];
    case "em_preparacao":
      return [final, "concluido"];
    case "saiu_para_entrega":
    case "pronto_para_retirada":
      return ["concluido"];
    default:
      return [];
  }
}

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { staff, db } = await requireStaff();
  const [{ data: o }, { data: items }, { data: history }] = await Promise.all([
    db.from("orders").select("*").eq("id", id).maybeSingle(),
    db.from("order_items").select("*").eq("order_id", id).order("product_name"),
    db.from("order_status_history").select("*").eq("order_id", id).order("created_at"),
  ]);
  if (!o) notFound();

  const isManager = staff.role !== "staff";
  const status = o.status as OrderStatus;
  const steps = nextSteps(status, o.delivery_method);
  const closed = status === "concluido" || status === "cancelado";
  const cost = (items ?? []).reduce((s, i) => s + i.unit_cost_cents * i.quantity, 0);
  const firstName = String(o.customer_name).split(" ")[0];
  const reservationInfo = o.stock_committed
    ? "Estoque já baixado"
    : o.reservation_active
      ? `Estoque reservado até ${formatDate(o.reserved_until)}`
      : status === "cancelado"
        ? "Reserva liberada"
        : "Reserva expirou — o estoque será conferido de novo ao confirmar";

  return (
    <>
      <Link href="/admin/pedidos" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-granat-700">
        <ChevronLeft size={16} /> Pedidos
      </Link>
      <PageHeader
        title={`Pedido ${o.code}`}
        subtitle={`Feito em ${formatDate(o.created_at)} pelo site`}
        action={
          <div className="flex items-center gap-2">
            <StatusBadge status={status} />
            <Link href={`/admin/recibo/${o.id}`} className="btn-outline py-2">
              <ReceiptText size={15} /> Recibo
            </Link>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <h2 className="font-serif text-2xl">Itens</h2>
            <ul className="mt-3 divide-y divide-line text-sm">
              {items?.map((i) => (
                <li key={i.id} className="flex justify-between gap-3 py-2.5">
                  <span>
                    {i.quantity}× {i.product_name}
                    <span className="block text-xs text-muted">
                      {i.variant_name} · {i.sku} · {brl(i.unit_price_cents)} un.
                    </span>
                  </span>
                  <span className="font-medium">{brl(i.total_cents)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-sm">
              <Row k="Subtotal" v={brl(o.subtotal_cents)} />
              {o.delivery_method === "entrega" && <Row k="Entrega" v={o.delivery_fee_cents ? brl(o.delivery_fee_cents) : "Grátis"} />}
              <Row k="Total" v={<strong className="text-lg text-granat-700">{brl(o.total_cents)}</strong>} />
              {isManager && (
                <Row
                  k="Custo dos produtos / lucro bruto"
                  v={`${brl(cost)} / ${brl(o.subtotal_cents - cost)}`}
                  muted
                />
              )}
            </dl>
          </Card>

          <Card>
            <h2 className="font-serif text-2xl">Andamento</h2>
            <p className="mt-1 text-xs text-muted">{reservationInfo}</p>
            {!closed && (
              <div className="mt-4 flex flex-wrap gap-2">
                {steps.map((s, idx) => (
                  <ActionButton
                    key={s}
                    action={setOrderStatus.bind(null, o.id, s, undefined)}
                    className={idx === 0 ? "btn-primary py-2.5" : "btn-outline py-2.5"}
                  >
                    {STATUS_LABEL[s]}
                  </ActionButton>
                ))}
                {!o.paid_at && !["pendente", "aguardando_pagamento"].includes(status) && (
                  <ActionButton action={markOrderPaid.bind(null, o.id)} className="btn-outline py-2.5">
                    Marcar como pago
                  </ActionButton>
                )}
                <ActionButton
                  action={setOrderStatus.bind(null, o.id, "cancelado", undefined)}
                  className="btn py-2.5 text-granat-700 hover:bg-tint"
                  confirm={`Cancelar o pedido ${o.code}? ${o.stock_committed ? "Os produtos voltam para o estoque." : "A reserva será liberada."}`}
                >
                  Cancelar pedido
                </ActionButton>
              </div>
            )}
            <ol className="mt-5 space-y-3 border-l-2 border-tint pl-4 text-sm">
              {history?.map((h) => (
                <li key={h.id}>
                  <p>
                    <strong>{h.from_status === h.to_status ? h.note : STATUS_LABEL[h.to_status as OrderStatus]}</strong>
                    {h.note && h.from_status !== h.to_status && <span className="text-muted"> — {h.note}</span>}
                  </p>
                  <p className="text-xs text-muted">{formatDate(h.created_at)}</p>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="font-serif text-2xl">Cliente</h2>
            <p className="mt-2 font-medium">{o.customer_name}</p>
            <p className="text-sm text-muted">+{o.customer_phone}</p>
            <a
              href={whatsappLink(o.customer_phone, `Oi, ${firstName}! Aqui é da YR Make 💕 Sobre o seu pedido ${o.code}:`)}
              target="_blank"
              rel="noopener"
              className="btn-whatsapp mt-4 w-full py-2.5"
            >
              <MessageCircle size={16} /> Conversar no WhatsApp
            </a>
            <dl className="mt-5 space-y-2 text-sm">
              <Row k="Recebimento" v={o.delivery_method === "entrega" ? "Entrega" : "Retirada na loja"} />
              {o.delivery_method === "entrega" && (
                <>
                  <Row k="Endereço" v={o.address} />
                  <Row k="Bairro" v={o.neighborhood} />
                  {o.address_ref && <Row k="Referência" v={o.address_ref} />}
                </>
              )}
              <Row k="Pagamento" v={PAYMENT_LABEL[o.payment_method]} />
              <Row k="Pago em" v={o.paid_at ? formatDate(o.paid_at) : "Ainda não"} />
            </dl>
            {o.notes && (
              <p className="mt-4 rounded-2xl bg-blush p-3 text-sm">
                <span className="label">Observação da cliente</span>
                {o.notes}
              </p>
            )}
          </Card>
          <Card>
            <h2 className="font-serif text-xl">Anotações internas</h2>
            <p className="text-xs text-muted">Só a equipe vê.</p>
            <NotesForm orderId={o.id} initial={o.internal_notes ?? ""} />
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({ k, v, muted }: { k: string; v: React.ReactNode; muted?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${muted ? "text-xs text-muted" : ""}`}>
      <dt className="text-muted">{k}</dt>
      <dd className="text-right">{v}</dd>
    </div>
  );
}
