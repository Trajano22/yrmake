"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, Search, ShoppingBag, X } from "lucide-react";
import type { CatalogCategory } from "@/lib/types";
import { useCart } from "./CartProvider";
import { Logo } from "./Logo";

export function Header({ categories }: { categories: CatalogCategory[] }) {
  const { count, ready, lastAdded } = useCart();
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState("");
  const [bump, setBump] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
    setSearching(false);
  }, [pathname]);

  useEffect(() => {
    if (!lastAdded) return;
    setBump(true);
    const t = setTimeout(() => setBump(false), 450);
    return () => clearTimeout(t);
  }, [lastAdded]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    router.push(term ? `/produtos?q=${encodeURIComponent(term)}` : "/produtos");
  };

  const main = categories.slice(0, 6);

  return (
    <header className="sticky top-0 z-40">
      <div className="border-b border-line bg-white/90 backdrop-blur-md">
        <div className="container-x grid h-20 grid-cols-[1fr_auto_1fr] items-center">
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Abrir menu"
              onClick={() => setOpen(true)}
              className="-ml-2 rounded-full p-2 text-granat-950 hover:bg-granat-50 lg:hidden"
            >
              <Menu size={22} strokeWidth={1.5} />
            </button>
            <nav className="hidden items-center gap-6 lg:flex">
              <Link href="/produtos" className="text-[13px] tracking-wide text-granat-950 hover:text-granat-700">
                Todos
              </Link>
              {main.slice(0, 4).map((c) => (
                <Link
                  key={c.id}
                  href={`/produtos?categoria=${c.slug}`}
                  className="text-[13px] tracking-wide text-granat-950 hover:text-granat-700"
                >
                  {c.name}
                </Link>
              ))}
            </nav>
          </div>
          <Logo size="sm" />
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              aria-label="Buscar"
              onClick={() => setSearching((s) => !s)}
              className="rounded-full p-2 text-granat-950 hover:bg-granat-50"
            >
              <Search size={20} strokeWidth={1.5} />
            </button>
            <Link
              href="/carrinho"
              aria-label={`Carrinho, ${count} itens`}
              className={`relative rounded-full p-2 text-granat-950 transition hover:bg-granat-50 ${bump ? "scale-125" : ""}`}
            >
              <ShoppingBag size={21} strokeWidth={1.5} />
              {ready && count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-granat-700 px-1 text-[10px] font-medium text-white">
                  {count}
                </span>
              )}
            </Link>
          </div>
        </div>
        {searching && (
          <form onSubmit={submit} className="container-x pb-4 animate-fade-up">
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="O que você procura? batom, base, máscara…"
                className="input rounded-full pl-11"
                aria-label="Buscar produtos"
              />
            </div>
          </form>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal>
          <button aria-label="Fechar menu" className="absolute inset-0 bg-granat-950/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[82%] max-w-sm flex-col bg-white p-6 shadow-2xl animate-fade-up">
            <div className="flex items-center justify-between">
              <Logo size="sm" />
              <button aria-label="Fechar" onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-granat-50">
                <X size={22} strokeWidth={1.5} />
              </button>
            </div>
            <nav className="mt-8 flex flex-col">
              <Link href="/produtos" className="border-b border-line py-3.5 font-serif text-2xl">
                Todos os produtos
              </Link>
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/produtos?categoria=${c.slug}`}
                  className="border-b border-line py-3 font-serif text-xl text-granat-950"
                >
                  {c.name}
                </Link>
              ))}
              <Link href="/contato" className="py-3 font-serif text-xl text-granat-700">
                Contato
              </Link>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
