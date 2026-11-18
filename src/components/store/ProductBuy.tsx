"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Minus, Plus, ShoppingBag } from "lucide-react";
import { brl } from "@/lib/money";
import type { CatalogVariant } from "@/lib/types";
import { useCart } from "./CartProvider";

export function ProductBuy({
  product,
  variants,
}: {
  product: { slug: string; name: string; cover: string | null };
  variants: CatalogVariant[];
}) {
  const { add, items } = useCart();
  const firstAvailable = variants.find((v) => v.available > 0) ?? variants[0];
  const [selectedId, setSelectedId] = useState(firstAvailable.id);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const v = variants.find((x) => x.id === selectedId) ?? firstAvailable;
  const inCart = items.find((i) => i.variantId === v.id)?.quantity ?? 0;
  const max = Math.max(0, Math.min(v.available, 20) - inCart);
  const single = variants.length === 1;
  const hasSwatches = variants.some((x) => x.color_hex);

  const onAdd = () => {
    if (max <= 0) return;
    add(
      {
        variantId: v.id,
        slug: product.slug,
        productName: product.name,
        variantName: v.name,
        priceCents: v.final_price_cents,
        colorHex: v.color_hex,
        image: product.cover,
        max: v.available,
      },
      Math.min(qty, max),
    );
    setQty(1);
    setAdded(true);
    setTimeout(() => setAdded(false), 2200);
  };

  return (
    <div className="mt-5">
      <div className="flex items-baseline gap-3">
        <span className="font-serif text-4xl text-granat-700">{brl(v.final_price_cents)}</span>
        {v.promo_price_cents && <span className="text-muted line-through">{brl(v.price_cents)}</span>}
        {v.promo_price_cents && (
          <span className="rounded-full bg-granat-50 px-2.5 py-0.5 text-xs font-medium text-granat-700">
            -{Math.round(((v.price_cents - v.promo_price_cents) / v.price_cents) * 100)}%
          </span>
        )}
      </div>

      {!single && (
        <div className="mt-7">
          <p className="label">
            {hasSwatches ? "Tom" : "Opção"}: <span className="normal-case tracking-normal text-granat-950">{v.name}</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-2.5">
            {variants.map((x) => {
              const active = x.id === v.id;
              const out = x.available <= 0;
              return hasSwatches ? (
                <button
                  key={x.id}
                  type="button"
                  title={`${x.name}${out ? " (esgotado)" : ""}`}
                  aria-label={`${x.name}${out ? ", esgotado" : ""}`}
                  aria-pressed={active}
                  onClick={() => {
                    setSelectedId(x.id);
                    setQty(1);
                  }}
                  className={`relative h-11 w-11 overflow-hidden rounded-full transition ${
                    active ? "scale-105 ring-2 ring-granat-700 ring-offset-[3px]" : "ring-1 ring-line hover:ring-granat-200"
                  } ${out ? "opacity-40" : ""}`}
                  style={{ background: x.color_hex ?? "#fce3e8" }}
                >
                  {out && <span className="absolute left-1/2 top-1/2 h-[2px] w-12 -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-white" />}
                </button>
              ) : (
                <button
                  key={x.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setSelectedId(x.id);
                    setQty(1);
                  }}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    active ? "border-granat-700 bg-granat-700 text-white" : "border-line hover:border-granat-400"
                  } ${out ? "text-muted line-through" : ""}`}
                >
                  {x.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <p className="mt-6 text-sm">
        {v.available <= 0 ? (
          <span className="text-muted">Esgotado no momento</span>
        ) : v.available <= 3 ? (
          <span className="text-granat-600">Últimas {v.available} unidades</span>
        ) : (
          <span className="text-emerald-700">Disponível</span>
        )}
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <div className="flex h-12 items-center justify-between rounded-full border border-line px-2 sm:w-36">
          <button
            type="button"
            aria-label="Diminuir"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="rounded-full p-2 hover:bg-granat-50 disabled:opacity-30"
            disabled={qty <= 1}
          >
            <Minus size={16} />
          </button>
          <span className="w-8 text-center tabular-nums" aria-live="polite">
            {qty}
          </span>
          <button
            type="button"
            aria-label="Aumentar"
            onClick={() => setQty((q) => Math.min(max || 1, q + 1))}
            className="rounded-full p-2 hover:bg-granat-50 disabled:opacity-30"
            disabled={qty >= max}
          >
            <Plus size={16} />
          </button>
        </div>
        <button type="button" onClick={onAdd} disabled={max <= 0} className="btn-primary h-12 flex-1">
          {added ? <Check size={18} /> : <ShoppingBag size={18} strokeWidth={1.6} />}
          {v.available <= 0 ? "Esgotado" : max <= 0 ? "Você já tem tudo no carrinho" : added ? "Adicionado!" : "Adicionar ao carrinho"}
        </button>
      </div>
      {(added || inCart > 0) && (
        <Link href="/carrinho" className="btn-outline mt-3 h-12 w-full animate-fade-up">
          Ver carrinho e finalizar
        </Link>
      )}
    </div>
  );
}
