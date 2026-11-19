import Link from "next/link";
import { Pencil, Plus, Search } from "lucide-react";
import { DeleteProductButton } from "@/components/admin/DeleteButtons";
import { ProductImage } from "@/components/store/ProductImage";
import { Empty, PageHeader } from "@/components/admin/ui";
import { requireStaff } from "@/lib/auth";
import { brl } from "@/lib/money";

export const metadata = { title: "Produtos" };

const STATUS = { active: "Na loja", draft: "Rascunho", archived: "Arquivado" } as const;

type Row = {
  id: string;
  name: string;
  status: keyof typeof STATUS;
  featured: boolean;
  categories: { name: string } | null;
  product_variants: { price_cents: number; promo_price_cents: number | null; cost_cents: number; stock: number; reserved: number; active: boolean }[];
  product_images: { path: string; position: number }[];
};

export default async function ProductsAdmin({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const sp = await searchParams;
  const { staff, db } = await requireStaff();
  const isManager = staff.role !== "staff";
  const status = sp.status && sp.status in STATUS ? sp.status : "";
  let query = db
    .from("products")
    .select("id, name, status, featured, categories(name), product_variants(price_cents, promo_price_cents, cost_cents, stock, reserved, active), product_images(path, position)")
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  else query = query.neq("status", "archived");
  const q = (sp.q ?? "").replace(/[%_,()*\\]/g, " ").trim().slice(0, 60);
  if (q) query = query.ilike("name", `%${q}%`);
  const { data } = await query;
  const products = (data ?? []) as unknown as Row[];

  return (
    <>
      <PageHeader
        title="Produtos"
        subtitle={`${products.length} ${products.length === 1 ? "produto" : "produtos"}`}
        action={
          isManager && (
            <Link href="/admin/produtos/novo" className="btn-primary">
              <Plus size={16} /> Novo produto
            </Link>
          )
        }
      />
      <form className="mb-5 flex flex-wrap gap-3">
        <div className="relative min-w-56 flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={q} placeholder="Buscar pelo nome" className="input py-2.5 pl-10" />
        </div>
        <select name="status" defaultValue={status} className="input w-auto py-2.5">
          <option value="">Ativos e rascunhos</option>
          <option value="active">Na loja</option>
          <option value="draft">Rascunhos</option>
          <option value="archived">Arquivados</option>
        </select>
        <button className="btn-outline py-2.5">Filtrar</button>
      </form>

      {products.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((p) => {
            const vs = p.product_variants.filter((v) => v.active);
            const prices = vs.map((v) => v.promo_price_cents ?? v.price_cents);
            const stock = vs.reduce((s, v) => s + v.stock, 0);
            const available = vs.reduce((s, v) => s + Math.max(v.stock - v.reserved, 0), 0);
            const cover = [...p.product_images].sort((a, b) => a.position - b.position)[0]?.path ?? null;
            const margin =
              isManager && vs.length
                ? Math.round(
                    (vs.reduce((s, v) => s + ((v.promo_price_cents ?? v.price_cents) - v.cost_cents) / (v.promo_price_cents ?? v.price_cents), 0) /
                      vs.length) *
                      100,
                  )
                : null;
            return (
              <div key={p.id} className="flex flex-col rounded-[22px] border border-line bg-white transition hover:border-granat-400">
              <Link href={`/admin/produtos/${p.id}`} className="flex gap-4 p-3">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl">
                  <ProductImage path={cover} name={p.name} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="text-xs text-muted">
                    {p.categories?.name ?? "Sem categoria"} · {vs.length} {vs.length === 1 ? "variação" : "variações"}
                  </p>
                  <p className="mt-1 text-sm">
                    {prices.length ? brl(Math.min(...prices)) : "—"}
                    {margin !== null && <span className="text-xs text-muted"> · margem ~{margin}%</span>}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span
                      className={`rounded-full px-2 py-0.5 ${
                        p.status === "active" ? "bg-emerald-50 text-emerald-800" : p.status === "draft" ? "bg-amber-50 text-amber-800" : "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {STATUS[p.status]}
                    </span>
                    {p.featured && <span className="rounded-full bg-granat-50 px-2 py-0.5 text-granat-800">Destaque</span>}
                    <span className={`rounded-full px-2 py-0.5 ${available ? "bg-blush text-granat-950" : "bg-granat-700 text-white"}`}>
                      {available ? `${available} disp.` : "Esgotado"}
                      {stock !== available && ` (${stock - available} reserv.)`}
                    </span>
                  </div>
                </div>
              </Link>
              <div className="mt-auto flex items-center justify-end gap-1 border-t border-line px-2 py-1.5">
                <Link
                  href={`/admin/produtos/${p.id}`}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-granat-950 hover:bg-granat-50"
                >
                  <Pencil size={14} /> {isManager ? "Editar" : "Ver"}
                </Link>
                {isManager && <DeleteProductButton id={p.id} name={p.name} compact />}
              </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Empty>
          Nenhum produto ainda.{" "}
          {isManager && (
            <Link href="/admin/produtos/novo" className="text-granat-700 underline">
              Cadastre o primeiro
            </Link>
          )}
        </Empty>
      )}
    </>
  );
}
