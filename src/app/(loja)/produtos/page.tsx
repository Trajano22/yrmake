import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { ProductCard } from "@/components/store/ProductCard";
import { getCategories, getProducts } from "@/lib/catalog";

type SP = Promise<{ categoria?: string; q?: string; promo?: string }>;

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const sp = await searchParams;
  const cats = await getCategories();
  const cat = cats.find((c) => c.slug === sp.categoria);
  return { title: cat?.name ?? (sp.promo ? "Promoções" : "Produtos") };
}

export default async function ProductsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").slice(0, 60);
  const promo = sp.promo === "1";
  const [categories, products] = await Promise.all([
    getCategories(),
    getProducts({ category: sp.categoria, q, promo }),
  ]);
  const current = categories.find((c) => c.slug === sp.categoria);
  const title = current?.name ?? (promo ? "Promoções" : q ? `Busca: “${q}”` : "Todos os produtos");

  const chip = (active: boolean) =>
    `shrink-0 rounded-full px-4 py-2 text-sm transition ${
      active ? "bg-granat-700 text-white" : "border border-line bg-surface text-ink hover:border-granat-400"
    }`;

  return (
    <div className="container-x pt-10">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Catálogo</p>
          <h1 className="mt-2 font-serif text-4xl text-ink sm:text-5xl">{title}</h1>
          <p className="mt-1 text-sm text-muted">
            {products.length} {products.length === 1 ? "produto" : "produtos"}
          </p>
        </div>
        <form action="/produtos" className="relative w-full sm:w-80">
          {sp.categoria && <input type="hidden" name="categoria" value={sp.categoria} />}
          <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={q} placeholder="Buscar produto" className="input rounded-full pl-11" aria-label="Buscar produto" />
        </form>
      </div>

      <div className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
        <Link href="/produtos" className={chip(!current && !promo)}>
          Todos
        </Link>
        <Link href="/produtos?promo=1" className={chip(promo)}>
          Promoções
        </Link>
        {categories.map((c) => (
          <Link key={c.id} href={`/produtos?categoria=${c.slug}`} className={chip(current?.id === c.id)}>
            {c.name}
          </Link>
        ))}
      </div>

      {products.length ? (
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
          {products.map((p, i) => (
            <ProductCard key={p.id} p={p} priority={i < 4} />
          ))}
        </div>
      ) : (
        <div className="mt-10 rounded-[28px] bg-blush px-6 py-16 text-center">
          <p className="font-script text-4xl text-granat-600">Ops…</p>
          <p className="mt-2 text-sm text-muted">Nada encontrado por aqui. Tente outra busca ou categoria.</p>
          <Link href="/produtos" className="btn-outline mt-6">
            Ver todos
          </Link>
        </div>
      )}
    </div>
  );
}
