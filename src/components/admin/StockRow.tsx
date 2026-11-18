"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { moveStock } from "@/app/admin/actions/stock";

type V = {
  id: string;
  name: string;
  sku: string;
  stock: number;
  reserved: number;
  min_stock: number;
  color_hex: string | null;
  products: { id: string; name: string };
};

export function StockRow({ v }: { v: V }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"entrada" | "saida" | "ajuste">("entrada");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const available = Math.max(v.stock - v.reserved, 0);
  const tone = available <= 0 ? "text-granat-700 font-semibold" : available <= v.min_stock ? "text-amber-700 font-medium" : "";

  return (
    <li className="px-4 py-3">
      <div className="grid grid-cols-[1fr_auto] items-center gap-3 sm:grid-cols-[1fr_70px_70px_70px_auto]">
        <div className="flex min-w-0 items-center gap-2.5">
          {v.color_hex && <span className="h-4 w-4 shrink-0 rounded-full border border-line" style={{ background: v.color_hex }} />}
          <div className="min-w-0">
            <Link href={`/admin/produtos/${v.products.id}`} className="block truncate text-sm hover:text-granat-700">
              {v.products.name}
            </Link>
            <p className="truncate text-xs text-muted">
              {v.name} · {v.sku}
              <span className="sm:hidden">
                {" "}
                · <span className={tone}>{available} disp.</span>
                {v.reserved > 0 && ` (${v.reserved} reserv.)`}
              </span>
            </p>
          </div>
        </div>
        <span className="hidden text-right text-sm tabular-nums sm:block">{v.stock}</span>
        <span className="hidden text-right text-sm tabular-nums text-muted sm:block">{v.reserved || "—"}</span>
        <span className={`hidden text-right text-sm tabular-nums sm:block ${tone}`}>{available}</span>
        <button type="button" onClick={() => setOpen((o) => !o)} className="btn-outline px-4 py-1.5 text-xs">
          Movimentar
        </button>
      </div>
      {open && (
        <form
          className="mt-3 flex flex-wrap items-end gap-2 rounded-2xl bg-blush p-3"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await moveStock({ variantId: v.id, type, quantity: qty, reason });
              setMsg(r.ok ? { ok: true, text: r.message ?? "Feito" } : { ok: false, text: r.error });
              if (r.ok) {
                setQty("");
                setReason("");
                router.refresh();
              }
            });
          }}
        >
          <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className="input w-auto py-2 text-sm">
            <option value="entrada">Entrada (+)</option>
            <option value="saida">Saída (−)</option>
            <option value="ajuste">Contagem (fica =)</option>
          </select>
          <input
            required
            inputMode="numeric"
            value={qty}
            onChange={(e) => setQty(e.target.value.replace(/\D/g, ""))}
            placeholder={type === "ajuste" ? "Total contado" : "Qtd."}
            className="input w-28 py-2 text-sm"
          />
          <input
            value={reason}
            maxLength={200}
            onChange={(e) => setReason(e.target.value)}
            placeholder={type === "entrada" ? "Ex.: compra fornecedor X" : type === "saida" ? "Ex.: avaria, brinde" : "Ex.: contagem mensal"}
            className="input min-w-40 flex-1 py-2 text-sm"
          />
          <button disabled={pending} className="btn-primary py-2">
            {pending && <Loader2 size={14} className="animate-spin" />} Confirmar
          </button>
          {msg && <span className={`w-full text-xs ${msg.ok ? "text-emerald-700" : "text-granat-700"}`}>{msg.text}</span>}
        </form>
      )}
    </li>
  );
}
