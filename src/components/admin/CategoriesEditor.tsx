"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus } from "lucide-react";
import { moveCategory, saveCategory } from "@/app/admin/actions/settings";

type Cat = { id: string; name: string; slug: string; active: boolean; count: number };

export function CategoriesEditor({ categories }: { categories: Cat[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    start(async () => {
      setError("");
      const r = await fn();
      if (!r.ok) setError(r.error ?? "Erro");
      else {
        after?.();
        router.refresh();
      }
    });

  return (
    <div className="max-w-2xl">
      <form
        className="mb-5 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => saveCategory(null, name), () => setName(""));
        }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Nova categoria" className="input" required />
        <button disabled={pending} className="btn-primary shrink-0">
          <Plus size={16} /> Adicionar
        </button>
      </form>
      {error && <p className="mb-3 text-sm text-granat-700">{error}</p>}
      <ul className="divide-y divide-line overflow-hidden rounded-[24px] border border-line bg-surface">
        {categories.map((c, i) => (
          <Row key={c.id} c={c} first={i === 0} last={i === categories.length - 1} run={run} pending={pending} />
        ))}
      </ul>
    </div>
  );
}

function Row({
  c,
  first,
  last,
  run,
  pending,
}: {
  c: Cat;
  first: boolean;
  last: boolean;
  run: (fn: () => Promise<{ ok: boolean; error?: string }>) => void;
  pending: boolean;
}) {
  const [name, setName] = useState(c.name);
  return (
    <li className={`flex items-center gap-2 px-4 py-2.5 ${c.active ? "" : "opacity-60"}`}>
      <input
        value={name}
        maxLength={60}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => name.trim() !== c.name && run(() => saveCategory(c.id, name, c.active))}
        className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1.5 hover:border-line focus:border-granat-400 focus:outline-none"
        aria-label="Nome da categoria"
      />
      <span className="hidden text-xs text-muted sm:inline">{c.count} produtos</span>
      <button
        type="button"
        disabled={pending}
        title={c.active ? "Esconder da loja" : "Mostrar na loja"}
        onClick={() => run(() => saveCategory(c.id, c.name, !c.active))}
        className="rounded-full p-2 text-muted hover:bg-tint"
      >
        {c.active ? <Eye size={16} /> : <EyeOff size={16} />}
      </button>
      <button type="button" disabled={pending || first} onClick={() => run(() => moveCategory(c.id, -1))} className="rounded-full p-2 text-muted hover:bg-tint disabled:opacity-30" aria-label="Subir">
        <ArrowUp size={16} />
      </button>
      <button type="button" disabled={pending || last} onClick={() => run(() => moveCategory(c.id, 1))} className="rounded-full p-2 text-muted hover:bg-tint disabled:opacity-30" aria-label="Descer">
        <ArrowDown size={16} />
      </button>
    </li>
  );
}
