"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Minus, Plus, Trash2 } from "lucide-react";
import { isConfigured } from "@/lib/env";
import { brl } from "@/lib/money";
import { browserClient } from "@/lib/supabase/browser";
import { useCart } from "./CartProvider";
import { ProductImage } from "./ProductImage";

/** Confere preço e estoque atuais no banco (só a vitrine pública). */
export function useCartSync() {
  const { items, ready, sync } = useCart();
  const [warnings, setWarnings] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const done = useRef(false);

  useEffect(() => {
    if (!ready || done.current) return;
    done.current = true;
    if (!items.length || !isConfigured) {
      setChecked(true);
      return;
    }
    browserClient()
      .from("catalog_variants")
      .select("id, final_price_cents, available")
      .in(
        "id",
        items.map((i) => i.variantId),
      )
      .then(({ data, error }) => {
        if (!error && data) setWarnings(sync(data));
        setChecked(true);
      });
  }, [ready, items, sync]);

  return { warnings, checked };
}

export function CartView({ freeDeliveryMin, minOrder }: { freeDeliveryMin: number | null; minOrder: number }) {
  const { items, ready, subtotalCents, setQty, remove } = useCart();
  const { warnings } = useCartSync();

  if (!ready) return <div className="mt-10 h-40 animate-pulse rounded-3xl bg-blush" />;

  if (!items.length) {
    return (
      <div className="mt-8 rounded-[28px] bg-blush px-6 py-16 text-center">
        <p className="font-script text-4xl text-granat-600">Vazio por aqui</p>
        <p className="mt-2 text-sm text-muted">Que tal escolher um batom novo?</p>
        <Link href="/produtos" className="btn-primary mt-6">
          Ver produtos
        </Link>
      </div>
    );
  }

  const missingFree = freeDeliveryMin ? freeDeliveryMin - subtotalCents : 0;
  const belowMin = subtotalCents < minOrder;

  return (
    <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
      <div>
        {warnings.length > 0 && (
          <div className="mb-5 rounded-2xl border border-granat-200 bg-tint px-4 py-3 text-sm text-granat-800">
            {warnings.map((w) => (
              <p key={w}>{w}</p>
            ))}
          </div>
        )}
        <ul className="divide-y divide-line border-y border-line">
          {items.map((i) => (
            <li key={i.variantId} className="flex gap-4 py-5">
              <Link href={`/produto/${i.slug}`} className="h-24 w-20 shrink-0 overflow-hidden rounded-2xl bg-blush">
                <ProductImage path={i.image} name={i.productName} />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/produto/${i.slug}`} className="font-serif text-xl leading-tight text-ink hover:text-granat-700">
                      {i.productName}
                    </Link>
                    {!/^únic/i.test(i.variantName) && (
                      <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
                        {i.colorHex && <span className="h-3 w-3 rounded-full" style={{ background: i.colorHex }} />}
                        {i.variantName}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(i.variantId)}
                    aria-label={`Remover ${i.productName}`}
                    className="rounded-full p-2 text-muted hover:bg-tint hover:text-granat-700"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="mt-auto flex items-center justify-between pt-3">
                  <div className="flex h-9 items-center rounded-full border border-line px-1">
                    <button
                      type="button"
                      aria-label="Diminuir"
                      onClick={() => setQty(i.variantId, i.quantity - 1)}
                      disabled={i.quantity <= 1}
                      className="rounded-full p-1.5 hover:bg-tint disabled:opacity-30"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-7 text-center text-sm tabular-nums">{i.quantity}</span>
                    <button
                      type="button"
                      aria-label="Aumentar"
                      onClick={() => setQty(i.variantId, i.quantity + 1)}
                      disabled={i.quantity >= Math.min(i.max, 20)}
                      className="rounded-full p-1.5 hover:bg-tint disabled:opacity-30"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <span className="font-medium text-ink">{brl(i.priceCents * i.quantity)}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <Link href="/produtos" className="mt-5 inline-block text-sm text-granat-700 hover:underline">
          ← Continuar comprando
        </Link>
      </div>

      <aside className="h-fit rounded-[28px] bg-blush p-6 lg:sticky lg:top-32">
        <h2 className="font-serif text-2xl text-ink">Resumo</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd>{brl(subtotalCents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Entrega</dt>
            <dd className="text-muted">calculada no próximo passo</dd>
          </div>
        </dl>
        {freeDeliveryMin && missingFree > 0 && (
          <p className="mt-4 rounded-2xl bg-surface px-4 py-3 text-xs text-granat-800">
            Faltam <strong>{brl(missingFree)}</strong> para a entrega grátis 💕
          </p>
        )}
        {belowMin && (
          <p className="mt-4 rounded-2xl bg-surface px-4 py-3 text-xs text-granat-800">
            O pedido mínimo é {brl(minOrder)}.
          </p>
        )}
        {belowMin ? (
          <button disabled className="btn-primary mt-6 w-full">
            Finalizar pedido
          </button>
        ) : (
          <Link href="/finalizar" className="btn-primary mt-6 w-full">
            Finalizar pedido <ArrowRight size={16} />
          </Link>
        )}
      </aside>
    </div>
  );
}
