import Link from "next/link";
import { brl } from "@/lib/money";
import type { CatalogProduct } from "@/lib/types";
import { ProductImage } from "./ProductImage";

export function ProductCard({ p, priority = false }: { p: CatalogProduct; priority?: boolean }) {
  return (
    <Link href={`/produto/${p.slug}`} className="group block animate-fade-up">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[28px] bg-blush">
        <ProductImage
          path={p.cover_path}
          name={p.name}
          priority={priority}
          className="transition duration-700 group-hover:scale-[1.04]"
        />
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {p.on_sale && p.available && (
            <span className="rounded-full bg-granat-700 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-white">
              Promo
            </span>
          )}
          {!p.available && (
            <span className="rounded-full bg-surface/90 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted">
              Esgotado
            </span>
          )}
        </div>
      </div>
      <div className="px-1 pt-3">
        {p.category_name && <p className="text-[10px] uppercase tracking-[0.22em] text-muted">{p.category_name}</p>}
        <h3 className="mt-1 text-[13px] font-medium uppercase leading-snug tracking-[0.08em] text-ink transition group-hover:text-granat-700">
          {p.name}
        </h3>
        <div className="mt-1.5 flex items-baseline gap-2">
          {p.variant_count > 1 && <span className="text-xs text-muted">a partir de</span>}
          <span className="text-[15px] text-ink">{brl(p.min_price_cents)}</span>
          {p.on_sale && p.min_regular_cents > p.min_price_cents && (
            <span className="text-xs text-muted line-through">{brl(p.min_regular_cents)}</span>
          )}
        </div>
        {p.variant_count > 1 && <p className="mt-0.5 text-xs text-muted">{p.variant_count} tons</p>}
      </div>
    </Link>
  );
}
