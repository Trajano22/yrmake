import Link from "next/link";
import { Search } from "lucide-react";
import { Empty, PageHeader, StatusBadge, formatDate } from "@/components/admin/ui";
import { requireStaff } from "@/lib/auth";
import { brl } from "@/lib/money";
import { PAYMENT_LABEL, STATUS_LABEL, type OrderStatus } from "@/lib/types";

export const metadata = { title: "Pedidos" };

const GROUPS: Record<string, { label: string; statuses?: OrderStatus[] }> = {
  abertos: { label: "Em aberto", statuses: ["pendente", "aguardando_pagamento"] },
  andamento: { label: "Em andamento", statuses: ["pago", "em_preparacao", "saiu_para_entrega", "pronto_para_retirada"] },
  concluido: { label: "Concluídos", statuses: ["concluido"] },
  cancelado: { label: "Cancelados", statuses: ["cancelado"] },
  todos: { label: "Todos" },
};

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; de?: string; ate?: string }>;
}) {
  const sp = await searchParams;
  const group = sp.status && sp.status in GROUPS ? sp.status : "abertos";
  const { db } = await requireStaff();

  let query = db
    .from("orders")
    .select("id, code, customer_name, customer_phone, total_cents, status, created_at, delivery_method, payment_method, paid_at, neighborhood")
    .order("created_at", { ascending: false })
    .limit(200);
  const statuses = GROUPS[group].statuses;
  if (statuses) query = query.in("status", statuses);
  const q = (sp.q ?? "").replace(/[%_,()*\\]/g, " ").trim().slice(0, 40);
  if (q) {
    const digits = q.replace(/\D/g, "");
    const parts = [`code.ilike.%${q}%`, `customer_name.ilike.%${q}%`];
    if (digits.length >= 4) parts.push(`customer_phone.ilike.%${digits}%`);
    query = query.or(parts.join(","));
  }
  if (sp.de && /^\d{4}-\d{2}-\d{2}$/.test(sp.de)) query = query.gte("created_at", `${sp.de}T00:00:00-03:00`);
  if (sp.ate && /^\d{4}-\d{2}-\d{2}$/.test(sp.ate)) query = query.lte("created_at", `${sp.ate}T23:59:59-03:00`);
  const { data: orders } = await query;

  const qs = (g: string) => {
    const p = new URLSearchParams();
    p.set("status", g);
    if (q) p.set("q", q);
    if (sp.de) p.set("de", sp.de);
    if (sp.ate) p.set("ate", sp.ate);
    return `/admin/pedidos?${p}`;
  };

  return (
    <>
      <PageHeader title="Pedidos" subtitle="Pedidos do site. Confirme pelo WhatsApp e avance as etapas." />
      <div className="mb-4 flex flex-wrap gap-2">
        {Object.entries(GROUPS).map(([k, g]) => (
          <Link
            key={k}
            href={qs(k)}
            className={`rounded-full px-4 py-1.5 text-sm ${
              k === group ? "bg-deep text-white" : "border border-line bg-surface hover:border-granat-400"
            }`}
          >
            {g.label}
          </Link>
        ))}
      </div>
      <form className="mb-5 flex flex-wrap items-end gap-3">
        <input type="hidden" name="status" value={group} />
        <div className="relative min-w-56 flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={q} placeholder="Código, nome ou telefone" className="input py-2.5 pl-10" />
        </div>
        <label className="text-xs text-muted">
          De
          <input type="date" name="de" defaultValue={sp.de} className="input mt-1 py-2" />
        </label>
        <label className="text-xs text-muted">
          Até
          <input type="date" name="ate" defaultValue={sp.ate} className="input mt-1 py-2" />
        </label>
        <button className="btn-primary py-2.5">Filtrar</button>
      </form>

      {orders?.length ? (
        <div className="overflow-hidden rounded-[24px] border border-line bg-surface">
          <ul className="divide-y divide-line">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/admin/pedidos/${o.id}`} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-3.5 hover:bg-blush/60 sm:grid-cols-[110px_1fr_auto_100px]">
                  <span className="font-medium">{o.code}</span>
                  <span className="order-3 col-span-2 min-w-0 text-sm sm:order-none sm:col-span-1">
                    <span className="block truncate">{o.customer_name}</span>
                    <span className="text-xs text-muted">
                      {formatDate(o.created_at)} · {o.delivery_method === "entrega" ? `Entrega${o.neighborhood ? ` (${o.neighborhood})` : ""}` : "Retirada"} ·{" "}
                      {PAYMENT_LABEL[o.payment_method]}
                      {o.paid_at && <span className="text-emerald-700"> · pago</span>}
                    </span>
                  </span>
                  <span className="justify-self-end">
                    <StatusBadge status={o.status as OrderStatus} />
                  </span>
                  <span className="hidden text-right font-medium sm:block">{brl(o.total_cents)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <Empty>Nenhum pedido {GROUPS[group].statuses ? `“${GROUPS[group].label.toLowerCase()}”` : ""} encontrado.</Empty>
      )}
      <p className="mt-3 text-xs text-muted">Status possíveis: {Object.values(STATUS_LABEL).join(" → ")}</p>
    </>
  );
}
