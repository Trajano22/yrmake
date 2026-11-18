import Link from "next/link";
import { Search } from "lucide-react";
import { StockRow } from "@/components/admin/StockRow";
import { Card, Empty, PageHeader, formatDate } from "@/components/admin/ui";
import { requireStaff } from "@/lib/auth";

export const metadata = { title: "Estoque" };

type V = {
  id: string;
  name: string;
  sku: string;
  stock: number;
  reserved: number;
  min_stock: number;
  color_hex: string | null;
  products: { id: string; name: string; status: string };
};

const FILTERS = { todos: "Todos", baixo: "Estoque baixo", esgotado: "Esgotados" } as const;
const TYPE_LABEL: Record<string, string> = {
  entrada: "Entrada",
  saida: "Saída",
  ajuste: "Ajuste",
  venda: "Venda",
  devolucao: "Devolução",
};

export default async function StockPage({ searchParams }: { searchParams: Promise<{ filtro?: string; q?: string }> }) {
  const sp = await searchParams;
  const filtro = (sp.filtro && sp.filtro in FILTERS ? sp.filtro : "todos") as keyof typeof FILTERS;
  const { db } = await requireStaff();
  const q = (sp.q ?? "").replace(/[%_,()*\\]/g, " ").trim().slice(0, 60);

  let query = db
    .from("product_variants")
    .select("id, name, sku, stock, reserved, min_stock, color_hex, products!inner(id, name, status)")
    .eq("active", true)
    .neq("products.status", "archived")
    .order("name", { referencedTable: "products" })
    .limit(500);
  if (q) query = query.or(`sku.ilike.%${q}%,name.ilike.%${q}%`);
  const [{ data }, { data: moves }] = await Promise.all([
    query,
    db
      .from("stock_movements")
      .select("id, type, quantity, stock_after, reason, created_at, product_variants(name, sku, products(name))")
      .order("created_at", { ascending: false })
      .limit(25),
  ]);
  let rows = ((data ?? []) as unknown as V[]).sort(
    (a, b) => a.products.name.localeCompare(b.products.name, "pt-BR") || a.name.localeCompare(b.name, "pt-BR"),
  );
  if (filtro === "baixo") rows = rows.filter((v) => v.stock - v.reserved <= v.min_stock && v.stock - v.reserved > 0);
  if (filtro === "esgotado") rows = rows.filter((v) => v.stock - v.reserved <= 0);

  type Move = {
    id: string;
    type: string;
    quantity: number;
    stock_after: number;
    reason: string | null;
    created_at: string;
    product_variants: { name: string; sku: string; products: { name: string } } | null;
  };

  return (
    <>
      <PageHeader title="Estoque" subtitle="Entradas, saídas e contagem. Vendas baixam sozinhas quando o pedido é confirmado." />
      <div className="mb-4 flex flex-wrap gap-2">
        {(Object.keys(FILTERS) as (keyof typeof FILTERS)[]).map((f) => (
          <Link
            key={f}
            href={`/admin/estoque?filtro=${f}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`rounded-full px-4 py-1.5 text-sm ${
              f === filtro ? "bg-granat-950 text-white" : "border border-line bg-white hover:border-granat-400"
            }`}
          >
            {FILTERS[f]}
          </Link>
        ))}
      </div>
      <form className="mb-5 flex gap-3">
        <input type="hidden" name="filtro" value={filtro} />
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={q} placeholder="SKU ou nome do tom" className="input py-2.5 pl-10" />
        </div>
        <button className="btn-outline py-2.5">Buscar</button>
      </form>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        {rows.length ? (
          <div className="overflow-hidden rounded-[24px] border border-line bg-white">
            <div className="hidden grid-cols-[1fr_70px_70px_70px_auto] gap-3 border-b border-line px-4 py-2 text-[11px] uppercase tracking-wider text-muted sm:grid">
              <span>Produto</span>
              <span className="text-right">Estoque</span>
              <span className="text-right">Reserv.</span>
              <span className="text-right">Disp.</span>
              <span className="w-[92px]" />
            </div>
            <ul className="divide-y divide-line">
              {rows.map((v) => (
                <StockRow key={v.id} v={v} />
              ))}
            </ul>
          </div>
        ) : (
          <Empty>Nada por aqui.</Empty>
        )}
        <Card className="h-fit">
          <h2 className="font-serif text-2xl">Últimas movimentações</h2>
          <ul className="mt-3 divide-y divide-line text-sm">
            {((moves ?? []) as unknown as Move[]).map((m) => (
              <li key={m.id} className="py-2.5">
                <div className="flex justify-between gap-3">
                  <span className="min-w-0 truncate">
                    {m.product_variants?.products.name} <span className="text-muted">· {m.product_variants?.name}</span>
                  </span>
                  <span className={`shrink-0 font-medium ${m.quantity > 0 ? "text-emerald-700" : "text-granat-700"}`}>
                    {m.quantity > 0 ? "+" : ""}
                    {m.quantity}
                  </span>
                </div>
                <p className="text-xs text-muted">
                  {TYPE_LABEL[m.type]} · {formatDate(m.created_at)} · ficou {m.stock_after}
                  {m.reason && ` · ${m.reason}`}
                </p>
              </li>
            ))}
            {!moves?.length && <li className="py-3 text-muted">Nenhuma movimentação ainda.</li>}
          </ul>
        </Card>
      </div>
    </>
  );
}
