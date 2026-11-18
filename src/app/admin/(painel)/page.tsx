import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Card, Empty, PageHeader, StatusBadge, formatDate } from "@/components/admin/ui";
import { requireStaff } from "@/lib/auth";
import { brl } from "@/lib/money";
import type { OrderStatus } from "@/lib/types";

export const metadata = { title: "Resumo" };

const PERIODS = {
  hoje: "Hoje",
  "7d": "7 dias",
  mes: "Este mês",
  "mes-passado": "Mês passado",
} as const;
type Period = keyof typeof PERIODS;

/** Limites do período no fuso de São Paulo (UTC-3, sem horário de verão). */
function range(p: Period) {
  const offset = 3 * 3600_000;
  const nowSp = new Date(Date.now() - offset);
  const y = nowSp.getUTCFullYear();
  const m = nowSp.getUTCMonth();
  const d = nowSp.getUTCDate();
  const sp = (yy: number, mm: number, dd: number) => new Date(Date.UTC(yy, mm, dd) + offset);
  switch (p) {
    case "hoje":
      return [sp(y, m, d), sp(y, m, d + 1)];
    case "7d":
      return [sp(y, m, d - 6), sp(y, m, d + 1)];
    case "mes-passado":
      return [sp(y, m - 1, 1), sp(y, m, 1)];
    default:
      return [sp(y, m, 1), sp(y, m + 1, 1)];
  }
}

type Summary = {
  revenue_cents: number;
  paid_orders: number;
  cogs_cents: number;
  open_orders: number;
  in_progress: number;
  active_products: number;
  low_stock: number;
  out_of_stock: number;
  stock_value_cents: number | null;
};

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ p?: string; e?: string }> }) {
  const sp = await searchParams;
  const period: Period = sp.p && sp.p in PERIODS ? (sp.p as Period) : "mes";
  const { staff, db } = await requireStaff();
  const isManager = staff.role !== "staff";
  const [from, to] = range(period);

  const [{ data: summary }, { data: recent }, { data: low }] = await Promise.all([
    db.rpc("dashboard_summary", { p_from: from.toISOString(), p_to: to.toISOString() }),
    db
      .from("orders")
      .select("id, code, customer_name, total_cents, status, created_at, delivery_method")
      .order("created_at", { ascending: false })
      .limit(8),
    db
      .from("product_variants")
      .select("id, name, sku, stock, reserved, min_stock, products!inner(name, status)")
      .eq("active", true)
      .neq("products.status", "archived")
      .order("stock")
      .limit(60),
  ]);
  const s = (summary ?? {}) as Summary;
  const lowList = (low ?? [])
    .filter((v) => v.stock - v.reserved <= v.min_stock)
    .slice(0, 8) as unknown as {
    id: string;
    name: string;
    sku: string;
    stock: number;
    reserved: number;
    products: { name: string };
  }[];
  const ticket = s.paid_orders ? Math.round(s.revenue_cents / s.paid_orders) : 0;
  const gross = s.revenue_cents - s.cogs_cents;
  const margin = s.revenue_cents ? Math.round((gross / s.revenue_cents) * 1000) / 10 : 0;

  return (
    <>
      <PageHeader title={`Olá, ${staff.full_name.split(" ")[0] || "bem-vinda"}`} subtitle="Como está a loja" />
      {sp.e === "permissao" && (
        <p className="mb-4 rounded-2xl bg-granat-50 px-4 py-3 text-sm text-granat-800">Você não tem permissão para aquela área.</p>
      )}

      <div className="mb-5 flex flex-wrap gap-2">
        {(Object.keys(PERIODS) as Period[]).map((p) => (
          <Link
            key={p}
            href={`/admin?p=${p}`}
            className={`rounded-full px-4 py-1.5 text-sm ${
              p === period ? "bg-granat-950 text-white" : "border border-line bg-white hover:border-granat-400"
            }`}
          >
            {PERIODS[p]}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Vendas recebidas" value={brl(s.revenue_cents)} hint="produtos, sem taxa de entrega" strong />
        <Stat label="Pedidos pagos" value={String(s.paid_orders ?? 0)} />
        <Stat label="Ticket médio" value={brl(ticket)} />
        {isManager ? (
          <Stat label="Lucro bruto" value={brl(gross)} hint={`margem ${margin.toLocaleString("pt-BR")}%`} />
        ) : (
          <Stat label="Produtos ativos" value={String(s.active_products ?? 0)} />
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Pedidos em aberto" value={String(s.open_orders ?? 0)} href="/admin/pedidos?status=abertos" alert={s.open_orders > 0} />
        <Stat label="Em andamento" value={String(s.in_progress ?? 0)} href="/admin/pedidos?status=andamento" />
        <Stat label="Estoque baixo" value={String(s.low_stock ?? 0)} href="/admin/estoque?filtro=baixo" alert={s.low_stock > 0} />
        <Stat label="Esgotados" value={String(s.out_of_stock ?? 0)} href="/admin/estoque?filtro=esgotado" alert={s.out_of_stock > 0} />
      </div>
      {isManager && s.stock_value_cents != null && (
        <p className="mt-3 text-sm text-muted">
          Valor investido em estoque (pelo custo): <strong className="text-granat-950">{brl(s.stock_value_cents)}</strong>
        </p>
      )}

      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-serif text-2xl">Últimos pedidos</h2>
            <Link href="/admin/pedidos" className="inline-flex items-center gap-1 text-sm text-granat-700 hover:underline">
              Todos <ArrowRight size={14} />
            </Link>
          </div>
          {recent?.length ? (
            <ul className="divide-y divide-line">
              {recent.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/pedidos/${o.id}`} className="flex items-center gap-3 py-3 hover:bg-blush/60">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {o.code} · <span className="font-normal">{o.customer_name}</span>
                      </p>
                      <p className="text-xs text-muted">
                        {formatDate(o.created_at)} · {o.delivery_method === "entrega" ? "Entrega" : "Retirada"}
                      </p>
                    </div>
                    <StatusBadge status={o.status as OrderStatus} />
                    <span className="w-24 text-right text-sm font-medium">{brl(o.total_cents)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Nenhum pedido ainda.</Empty>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 flex items-center gap-2 font-serif text-2xl">
            <AlertTriangle size={18} className="text-granat-600" /> Repor estoque
          </h2>
          {lowList.length ? (
            <ul className="divide-y divide-line text-sm">
              {lowList.map((v) => (
                <li key={v.id} className="flex justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate">{v.products.name}</span>
                    <span className="text-xs text-muted">
                      {v.name} · {v.sku}
                    </span>
                  </span>
                  <span className={`shrink-0 font-medium ${v.stock - v.reserved <= 0 ? "text-granat-700" : "text-amber-700"}`}>
                    {Math.max(v.stock - v.reserved, 0)} disp.
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Tudo certo com o estoque 💕</p>
          )}
        </Card>
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  hint,
  href,
  strong,
  alert,
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
  strong?: boolean;
  alert?: boolean;
}) {
  const body = (
    <div
      className={`h-full rounded-[22px] p-4 transition ${
        strong ? "bg-granat-700 text-white" : "border border-line bg-white"
      } ${href ? "hover:border-granat-400" : ""}`}
    >
      <p className={`text-xs ${strong ? "text-granat-50" : "text-muted"}`}>{label}</p>
      <p className={`mt-1 font-serif text-3xl ${alert && !strong ? "text-granat-700" : ""}`}>{value}</p>
      {hint && <p className={`text-[11px] ${strong ? "text-granat-200" : "text-muted"}`}>{hint}</p>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
