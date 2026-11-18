"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { saveSettings } from "@/app/admin/actions/settings";

type S = {
  store_name: string;
  whatsapp: string;
  instagram: string;
  city: string;
  address: string;
  pickup_address: string;
  pickup_hours: string;
  about: string;
  delivery_fee: string;
  free_delivery_min: string;
  min_order: string;
  reservation_hours: string;
  accepting_orders: boolean;
};

export function SettingsForm({ initial }: { initial: S }) {
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const f =
    (k: keyof S) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setS({ ...s, [k]: e.target.value });
      setMsg(null);
    };

  const Field = ({ k, label, hint, ...rest }: { k: keyof S; label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
    <div>
      <label className="label">{label}</label>
      <input value={s[k] as string} onChange={f(k)} className="input" {...rest} />
      {hint && <p className="mt-1 text-[11px] text-muted">{hint}</p>}
    </div>
  );

  return (
    <form
      className="max-w-3xl space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveSettings(s);
          setMsg(r.ok ? { ok: true, text: r.message ?? "Salvo" } : { ok: false, text: r.error });
          if (r.ok) router.refresh();
        });
      }}
    >
      <section className="rounded-[24px] border border-line bg-white p-5">
        <h2 className="mb-4 font-serif text-2xl">Loja</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {Field({ k: "store_name", label: "Nome da loja", required: true, maxLength: 80 })}
          {Field({ k: "whatsapp", label: "WhatsApp comercial", placeholder: "(00) 00000-0000", inputMode: "tel", hint: "Para onde os pedidos são enviados." })}
          {Field({ k: "instagram", label: "Instagram", placeholder: "@yrmake" })}
          {Field({ k: "city", label: "Cidade", placeholder: "Ex.: Campinas" })}
          <div className="sm:col-span-2">{Field({ k: "address", label: "Endereço da loja", maxLength: 200 })}</div>
          <div className="sm:col-span-2">
            <label className="label">Sobre a loja (rodapé)</label>
            <textarea value={s.about} onChange={f("about")} rows={3} maxLength={600} className="input resize-y" />
          </div>
        </div>
      </section>

      <section className="rounded-[24px] border border-line bg-white p-5">
        <h2 className="mb-4 font-serif text-2xl">Entrega e retirada</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {Field({ k: "delivery_fee", label: "Taxa de entrega (R$)", inputMode: "decimal", placeholder: "0,00" })}
          {Field({ k: "free_delivery_min", label: "Grátis acima de (R$)", inputMode: "decimal", placeholder: "vazio = nunca" })}
          {Field({ k: "min_order", label: "Pedido mínimo (R$)", inputMode: "decimal", placeholder: "vazio = sem mínimo" })}
          <div className="sm:col-span-2">{Field({ k: "pickup_address", label: "Endereço de retirada", hint: "Vazio = usa o endereço da loja." })}</div>
          {Field({ k: "pickup_hours", label: "Horário de retirada", placeholder: "Seg a sáb, 9h às 18h" })}
        </div>
      </section>

      <section className="rounded-[24px] border border-line bg-white p-5">
        <h2 className="mb-4 font-serif text-2xl">Pedidos</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {Field({
            k: "reservation_hours",
            label: "Reservar estoque por (horas)",
            inputMode: "numeric",
            hint: "Tempo que o produto fica separado esperando a cliente confirmar.",
          })}
          <label className="flex items-center gap-3 self-center text-sm">
            <input
              type="checkbox"
              checked={s.accepting_orders}
              onChange={(e) => setS({ ...s, accepting_orders: e.target.checked })}
              className="h-5 w-5 accent-granat-700"
            />
            Recebendo pedidos pelo site
          </label>
        </div>
      </section>

      <div className="flex items-center gap-4">
        <button disabled={pending} className="btn-primary">
          {pending && <Loader2 size={16} className="animate-spin" />} Salvar configurações
        </button>
        {msg && <span className={`text-sm ${msg.ok ? "text-emerald-700" : "text-granat-700"}`}>{msg.text}</span>}
      </div>
    </form>
  );
}
