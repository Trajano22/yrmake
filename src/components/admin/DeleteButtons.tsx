"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { deleteProduct, removeVariant } from "@/app/admin/actions/products";

function useDelete(fn: () => Promise<{ ok: boolean; error?: string; message?: string }>, after?: () => void) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const router = useRouter();
  const run = (question: string) => {
    if (!window.confirm(question)) return;
    setMsg(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setMsg({ ok: false, text: r.error ?? "Erro" });
      else {
        if (r.message) window.alert(r.message);
        after ? after() : router.refresh();
      }
    });
  };
  return { pending, msg, run };
}

/** Excluir produto (lista ou página do produto). Na página do produto, volta para a lista. */
export function DeleteProductButton({
  id,
  name,
  goToList = false,
  compact = false,
}: {
  id: string;
  name: string;
  goToList?: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const { pending, msg, run } = useDelete(
    () => deleteProduct(id),
    goToList ? () => router.push("/admin/produtos") : undefined,
  );
  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          run(`Excluir "${name}"?\n\nSe ele já teve vendas, será arquivado (some da loja, mas os pedidos antigos ficam). Se não teve, é apagado de vez com fotos e tons.`)
        }
        className={
          compact
            ? "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-granat-700 hover:bg-granat-50"
            : "btn py-2.5 text-granat-700 hover:bg-granat-50"
        }
      >
        {pending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Excluir
      </button>
      {msg && <span className="mt-1 max-w-56 text-xs text-granat-700">{msg.text}</span>}
    </span>
  );
}

/** Excluir um tom (tela de Estoque). */
export function DeleteVariantButton({ id, label }: { id: string; label: string }) {
  const { pending, msg, run } = useDelete(() => removeVariant(id));
  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        disabled={pending}
        title="Excluir este tom"
        aria-label={`Excluir ${label}`}
        onClick={() => run(`Excluir o tom "${label}"?\n\nSe ele já teve vendas, será arquivado (some da loja). Se não teve, é apagado de vez.`)}
        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs text-granat-700 hover:bg-granat-50"
      >
        {pending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
        <span className="hidden sm:inline">Excluir</span>
      </button>
      {msg && <span className="mt-1 max-w-48 text-xs text-granat-700">{msg.text}</span>}
    </span>
  );
}
