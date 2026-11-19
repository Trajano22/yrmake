"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Boxes, ExternalLink, LayoutDashboard, LogOut, Menu, Package, Settings, ShoppingBag, Tags, X } from "lucide-react";
import { signOut } from "@/app/admin/actions/auth";

const ROLE = { owner: "Proprietária", manager: "Gerente", staff: "Funcionária" } as const;

import { BrandLogo } from "@/components/store/Logo";

export function AdminNav({ name, role }: { name: string; role: keyof typeof ROLE }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);

  const links = [
    { href: "/admin", label: "Resumo", icon: LayoutDashboard, exact: true },
    { href: "/admin/pedidos", label: "Pedidos", icon: ShoppingBag },
    { href: "/admin/produtos", label: "Produtos", icon: Package },
    { href: "/admin/estoque", label: "Estoque", icon: Boxes },
    ...(role !== "staff"
      ? [
          { href: "/admin/categorias", label: "Categorias", icon: Tags },
          { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
        ]
      : []),
  ];

  const nav = (
    <nav className="flex flex-1 flex-col gap-1">
      {links.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? path === href : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm transition ${
              active ? "bg-granat-700 text-white" : "text-ink hover:bg-tint"
            }`}
          >
            <Icon size={18} strokeWidth={1.6} /> {label}
          </Link>
        );
      })}
      <a
        href="/"
        target="_blank"
        className="mt-2 flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm text-muted hover:bg-tint"
      >
        <ExternalLink size={18} strokeWidth={1.6} /> Ver loja
      </a>
    </nav>
  );

  const footer = (
    <div className="border-t border-line pt-4">
      <p className="truncate text-sm font-medium text-ink">{name}</p>
      <p className="text-xs text-muted">{ROLE[role]}</p>
      <form action={signOut}>
        <button className="mt-3 inline-flex items-center gap-2 text-sm text-granat-700 hover:underline">
          <LogOut size={15} /> Sair
        </button>
      </form>
    </div>
  );

  return (
    <>
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface px-4 lg:hidden">
        <button aria-label="Menu" onClick={() => setOpen(true)} className="-ml-2 rounded-full p-2 hover:bg-tint">
          <Menu size={22} />
        </button>
        <span className="font-serif text-2xl font-semibold tracking-[-0.05em]">
          <BrandLogo className="inline h-9" />
        </span>
        <span className="w-8" />
      </div>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button aria-label="Fechar" className="absolute inset-0 bg-deep/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col gap-6 bg-surface p-5">
            <div className="flex items-center justify-between">
              <BrandLogo className="h-12" />
              <button aria-label="Fechar" onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-tint">
                <X size={20} />
              </button>
            </div>
            {nav}
            {footer}
          </aside>
        </div>
      )}
      <aside className="sticky top-0 hidden h-dvh flex-col gap-8 border-r border-line bg-surface p-5 lg:flex">
        <div className="px-2 pt-2">
          <BrandLogo className="h-16" />
          <p className="mt-1 text-[10px] uppercase tracking-[0.28em] text-muted">Painel</p>
        </div>
        {nav}
        {footer}
      </aside>
    </>
  );
}
