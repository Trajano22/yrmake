"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import {
  createProduct,
  removeVariant,
  saveVariant,
  updateProduct,
  type ProductInput,
  type VariantInput,
} from "@/app/admin/actions/products";
import { brl, centsToInput, parseCents } from "@/lib/money";

type Category = { id: string; name: string };
type Product = { name: string; category_id: string; description: string; status: "draft" | "active" | "archived"; featured: boolean };

function Feedback({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return <span className={`text-sm ${msg.ok ? "text-emerald-700" : "text-granat-700"}`}>{msg.text}</span>;
}

function ProductFields({
  value,
  onChange,
  categories,
  disabled,
}: {
  value: Product;
  onChange: (v: Product) => void;
  categories: Category[];
  disabled?: boolean;
}) {
  const set = <K extends keyof Product>(k: K, v: Product[K]) => onChange({ ...value, [k]: v });
  return (
    <fieldset disabled={disabled} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="label">Nome do produto</label>
        <input required maxLength={120} value={value.name} onChange={(e) => set("name", e.target.value)} className="input" />
      </div>
      <div>
        <label className="label">Categoria</label>
        <select value={value.category_id} onChange={(e) => set("category_id", e.target.value)} className="input">
          <option value="">Sem categoria</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Situação</label>
        <select value={value.status} onChange={(e) => set("status", e.target.value as Product["status"])} className="input">
          <option value="active">Na loja (visível)</option>
          <option value="draft">Rascunho (escondido)</option>
          <option value="archived">Arquivado</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="label">Descrição</label>
        <textarea rows={5} maxLength={5000} value={value.description} onChange={(e) => set("description", e.target.value)} className="input resize-y" />
      </div>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" checked={value.featured} onChange={(e) => set("featured", e.target.checked)} className="h-4 w-4 accent-granat-700" />
        Mostrar nos destaques da página inicial
      </label>
    </fieldset>
  );
}

type VariantDraft = {
  name: string;
  sku: string;
  color_hex: string;
  price: string;
  promo: string;
  cost: string;
  min_stock: string;
  active: boolean;
  position: string;
};

const emptyVariant = (n = 0): VariantDraft => ({
  name: n === 0 ? "Único" : "",
  sku: `YR-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
  color_hex: "",
  price: "",
  promo: "",
  cost: "",
  min_stock: "2",
  active: true,
  position: String(n),
});

const toInput = (v: VariantDraft): VariantInput => ({
  name: v.name,
  sku: v.sku,
  color_hex: v.color_hex,
  price: v.price,
  promo: v.promo,
  cost: v.cost,
  min_stock: Number(v.min_stock) || 0,
  active: v.active,
  position: Number(v.position) || 0,
});

function Margin({ v }: { v: VariantDraft }) {
  const price = parseCents(v.promo) || parseCents(v.price);
  const cost = parseCents(v.cost) ?? 0;
  if (!price || Number.isNaN(price) || Number.isNaN(cost)) return <span className="text-xs text-muted">—</span>;
  const profit = price - cost;
  const pct = Math.round((profit / price) * 1000) / 10;
  return (
    <span className={`text-xs ${profit <= 0 ? "text-granat-700" : "text-emerald-700"}`}>
      Lucro {brl(profit)} · {pct.toLocaleString("pt-BR")}%
    </span>
  );
}

function VariantFields({ v, onChange, showColor = true }: { v: VariantDraft; onChange: (v: VariantDraft) => void; showColor?: boolean }) {
  const set = <K extends keyof VariantDraft>(k: K, val: VariantDraft[K]) => onChange({ ...v, [k]: val });
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="col-span-2">
        <label className="label">Tom / variação</label>
        <div className="flex gap-2">
          {showColor && (
            <input
              type="color"
              aria-label="Cor do tom"
              value={v.color_hex || "#fce3e8"}
              onChange={(e) => set("color_hex", e.target.value)}
              className="h-[46px] w-12 shrink-0 cursor-pointer rounded-xl border border-line bg-white p-1"
            />
          )}
          <input required maxLength={60} value={v.name} onChange={(e) => set("name", e.target.value)} className="input" placeholder="Ex.: Rosa Granada" />
        </div>
        {showColor && v.color_hex && (
          <button type="button" onClick={() => set("color_hex", "")} className="mt-1 text-[11px] text-muted underline">
            sem bolinha de cor
          </button>
        )}
      </div>
      <div className="col-span-2">
        <label className="label">SKU (código)</label>
        <input required maxLength={40} value={v.sku} onChange={(e) => set("sku", e.target.value.toUpperCase())} className="input font-mono text-sm" />
      </div>
      <div>
        <label className="label">Preço</label>
        <input required inputMode="decimal" placeholder="0,00" value={v.price} onChange={(e) => set("price", e.target.value)} className="input" />
      </div>
      <div>
        <label className="label">Promoção</label>
        <input inputMode="decimal" placeholder="opcional" value={v.promo} onChange={(e) => set("promo", e.target.value)} className="input" />
      </div>
      <div>
        <label className="label">Custo</label>
        <input inputMode="decimal" placeholder="0,00" value={v.cost} onChange={(e) => set("cost", e.target.value)} className="input" />
      </div>
      <div>
        <label className="label">Estoque mín.</label>
        <input inputMode="numeric" value={v.min_stock} onChange={(e) => set("min_stock", e.target.value.replace(/\D/g, ""))} className="input" />
      </div>
      <div className="col-span-2 sm:col-span-4">
        <Margin v={v} />
      </div>
    </div>
  );
}

export function NewProductForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [product, setProduct] = useState<Product>({ name: "", category_id: "", description: "", status: "active", featured: false });
  const [variant, setVariant] = useState<VariantDraft>(emptyVariant(0));
  const [stock, setStock] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        start(async () => {
          const r = await createProduct(product as ProductInput, toInput(variant), Number(stock) || 0);
          if (!r.ok) setMsg({ ok: false, text: r.error });
          else router.push(`/admin/produtos/${r.id}`);
        });
      }}
      className="max-w-3xl space-y-6"
    >
      <div className="rounded-[24px] border border-line bg-white p-5">
        <ProductFields value={product} onChange={setProduct} categories={categories} />
      </div>
      <div className="rounded-[24px] border border-line bg-white p-5">
        <h2 className="font-serif text-2xl">Primeiro tom / variação</h2>
        <p className="mb-4 text-xs text-muted">Produto sem tons? Deixe “Único”.</p>
        <VariantFields v={variant} onChange={setVariant} />
        <div className="mt-4 max-w-48">
          <label className="label">Estoque inicial</label>
          <input inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value.replace(/\D/g, ""))} className="input" placeholder="0" />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button disabled={pending} className="btn-primary">
          {pending && <Loader2 size={16} className="animate-spin" />} Criar produto
        </button>
        <Feedback msg={msg} />
      </div>
    </form>
  );
}

export function ProductDetailsForm({
  id,
  initial,
  categories,
  canEdit,
}: {
  id: string;
  initial: Product;
  categories: Category[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [product, setProduct] = useState<Product>(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await updateProduct(id, product as ProductInput);
          setMsg(r.ok ? { ok: true, text: "Salvo ✓" } : { ok: false, text: r.error });
          if (r.ok) router.refresh();
        });
      }}
    >
      <ProductFields value={product} onChange={(v) => { setProduct(v); setMsg(null); }} categories={categories} disabled={!canEdit} />
      {canEdit && (
        <div className="mt-5 flex items-center gap-4">
          <button disabled={pending} className="btn-primary">
            {pending && <Loader2 size={16} className="animate-spin" />} Salvar dados
          </button>
          <Feedback msg={msg} />
        </div>
      )}
    </form>
  );
}

type VariantRow = {
  id: string;
  name: string;
  sku: string;
  color_hex: string | null;
  price_cents: number;
  promo_price_cents: number | null;
  cost_cents: number;
  stock: number;
  reserved: number;
  min_stock: number;
  active: boolean;
  position: number;
};

const fromRow = (r: VariantRow): VariantDraft => ({
  name: r.name,
  sku: r.sku,
  color_hex: r.color_hex ?? "",
  price: centsToInput(r.price_cents),
  promo: centsToInput(r.promo_price_cents),
  cost: centsToInput(r.cost_cents),
  min_stock: String(r.min_stock),
  active: r.active,
  position: String(r.position),
});

export function VariantsEditor({ productId, variants, canEdit }: { productId: string; variants: VariantRow[]; canEdit: boolean }) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="space-y-3">
      {variants.map((v) => (
        <VariantCard key={v.id} productId={productId} row={v} canEdit={canEdit} />
      ))}
      {canEdit &&
        (adding ? (
          <NewVariantCard productId={productId} position={variants.length} onDone={() => setAdding(false)} />
        ) : (
          <button type="button" onClick={() => setAdding(true)} className="btn-outline w-full py-2.5">
            <Plus size={16} /> Adicionar tom
          </button>
        ))}
    </div>
  );
}

function VariantCard({ productId, row, canEdit }: { productId: string; row: VariantRow; canEdit: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(fromRow(row));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const available = Math.max(row.stock - row.reserved, 0);
  return (
    <div className={`rounded-2xl border ${row.active ? "border-line" : "border-dashed border-zinc-300 opacity-70"} p-4`}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 text-left">
        <span className="h-7 w-7 shrink-0 rounded-full border border-line" style={{ background: row.color_hex ?? "#fff" }} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">
            {row.name} {!row.active && <span className="text-xs text-muted">(desativado)</span>}
          </span>
          <span className="text-xs text-muted">
            {row.sku} · {brl(row.promo_price_cents ?? row.price_cents)}
            {row.promo_price_cents && <span className="line-through"> {brl(row.price_cents)}</span>}
          </span>
        </span>
        <span className={`text-right text-sm ${available <= row.min_stock ? "text-granat-700" : ""}`}>
          {available} disp.
          {row.reserved > 0 && <span className="block text-[11px] text-muted">{row.reserved} reservado</span>}
        </span>
        {canEdit && (
          <span className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1 text-xs text-granat-950">
            <Pencil size={12} /> {open ? "Fechar" : "Editar"}
          </span>
        )}
      </button>
      {open && canEdit && (
        <form
          className="mt-4 border-t border-line pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await saveVariant(productId, row.id, toInput(v));
              setMsg(r.ok ? { ok: true, text: "Salvo ✓" } : { ok: false, text: r.error });
              if (r.ok) router.refresh();
            });
          }}
        >
          <VariantFields v={v} onChange={(x) => { setV(x); setMsg(null); }} />
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={v.active} onChange={(e) => setV({ ...v, active: e.target.checked })} className="h-4 w-4 accent-granat-700" />
            Ativo (aparece na loja)
          </label>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button disabled={pending} className="btn-primary py-2.5">
              {pending && <Loader2 size={15} className="animate-spin" />} Salvar tom
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (!confirm(`Remover o tom "${row.name}"?`)) return;
                start(async () => {
                  const r = await removeVariant(row.id);
                  setMsg(r.ok ? { ok: true, text: r.message ?? "Removido" } : { ok: false, text: r.error });
                  if (r.ok) router.refresh();
                });
              }}
              className="btn py-2.5 text-granat-700 hover:bg-granat-50"
            >
              <Trash2 size={15} /> Excluir tom
            </button>
            <Feedback msg={msg} />
          </div>
        </form>
      )}
    </div>
  );
}

function NewVariantCard({ productId, position, onDone }: { productId: string; position: number; onDone: () => void }) {
  const router = useRouter();
  const [v, setV] = useState<VariantDraft>(emptyVariant(position));
  const [stock, setStock] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="rounded-2xl border border-granat-200 bg-blush/50 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveVariant(productId, null, toInput(v), Number(stock) || 0);
          if (!r.ok) setMsg({ ok: false, text: r.error });
          else {
            router.refresh();
            onDone();
          }
        });
      }}
    >
      <p className="mb-3 font-medium">Novo tom</p>
      <VariantFields v={v} onChange={setV} />
      <div className="mt-3 max-w-48">
        <label className="label">Estoque inicial</label>
        <input inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value.replace(/\D/g, ""))} className="input" placeholder="0" />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button disabled={pending} className="btn-primary py-2.5">
          {pending && <Loader2 size={15} className="animate-spin" />} Adicionar
        </button>
        <button type="button" onClick={onDone} className="btn py-2.5 text-muted">
          Cancelar
        </button>
        <Feedback msg={msg} />
      </div>
    </form>
  );
}
