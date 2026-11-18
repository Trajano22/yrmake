"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/**
 * Carrinho fica só no navegador da cliente (é rascunho, não é dado comercial).
 * Preço e estoque de verdade são conferidos pelo banco na hora de finalizar.
 */
export type CartItem = {
  variantId: string;
  slug: string;
  productName: string;
  variantName: string;
  priceCents: number;
  colorHex: string | null;
  image: string | null;
  quantity: number;
  max: number;
};

type CartCtx = {
  items: CartItem[];
  ready: boolean;
  count: number;
  subtotalCents: number;
  add: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  setQty: (variantId: string, qty: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
  sync: (fresh: { id: string; final_price_cents: number; available: number }[]) => string[];
  lastAdded: number;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "yr-cart-v1";
const MAX_PER_ITEM = 20;

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [lastAdded, setLastAdded] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed.filter((i) => i && typeof i.variantId === "string"));
      }
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {}
  }, [items, ready]);

  const add = useCallback<CartCtx["add"]>((item, qty = 1) => {
    setItems((prev) => {
      const limit = Math.min(item.max, MAX_PER_ITEM);
      const found = prev.find((i) => i.variantId === item.variantId);
      if (found) {
        return prev.map((i) =>
          i.variantId === item.variantId ? { ...i, ...item, quantity: Math.min(i.quantity + qty, limit) } : i,
        );
      }
      return [...prev, { ...item, quantity: Math.min(qty, limit) }];
    });
    setLastAdded(Date.now());
  }, []);

  const setQty = useCallback((variantId: string, qty: number) => {
    setItems((prev) =>
      prev.map((i) =>
        i.variantId === variantId ? { ...i, quantity: Math.max(1, Math.min(qty, i.max, MAX_PER_ITEM)) } : i,
      ),
    );
  }, []);

  const remove = useCallback((variantId: string) => {
    setItems((prev) => prev.filter((i) => i.variantId !== variantId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  /** Atualiza preço/estoque com o que veio do banco. Devolve avisos para a cliente. */
  const sync = useCallback<CartCtx["sync"]>((fresh) => {
    const warnings: string[] = [];
    setItems((prev) =>
      prev.flatMap((i) => {
        const f = fresh.find((x) => x.id === i.variantId);
        if (!f || f.available <= 0) {
          warnings.push(`${i.productName} (${i.variantName}) esgotou e saiu do carrinho.`);
          return [];
        }
        const quantity = Math.min(i.quantity, f.available);
        if (quantity < i.quantity) warnings.push(`${i.productName} (${i.variantName}): só restam ${f.available}.`);
        if (f.final_price_cents !== i.priceCents) warnings.push(`O preço de ${i.productName} foi atualizado.`);
        return [{ ...i, priceCents: f.final_price_cents, max: f.available, quantity }];
      }),
    );
    return warnings;
  }, []);

  const value = useMemo<CartCtx>(
    () => ({
      items,
      ready,
      count: items.reduce((s, i) => s + i.quantity, 0),
      subtotalCents: items.reduce((s, i) => s + i.priceCents * i.quantity, 0),
      add,
      setQty,
      remove,
      clear,
      sync,
      lastAdded,
    }),
    [items, ready, add, setQty, remove, clear, sync, lastAdded],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart fora do CartProvider");
  return ctx;
}
