"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { Bike, Check, Loader2, MessageCircle, Store } from "lucide-react";
import { createOrder } from "@/app/(loja)/finalizar/actions";
import { brl } from "@/lib/money";
import type { OrderSummary } from "@/lib/types";
import { pixForOrder, type PixConfig } from "@/lib/pix";
import { orderMessage, whatsappLink } from "@/lib/whatsapp";
import { PixPayment } from "./PixPayment";
import { useCart } from "./CartProvider";
import { useCartSync } from "./CartView";

type Settings = {
  acceptingOrders: boolean;
  deliveryFee: number;
  freeDeliveryMin: number | null;
  pickupAddress: string;
  pickupHours: string;
  city: string;
  whatsapp: string;
  pix: PixConfig;
};

const PROFILE_KEY = "yr-checkout-profile";

function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function CheckoutForm({ settings }: { settings: Settings }) {
  const { items, ready, subtotalCents, clear } = useCart();
  const { warnings, checked } = useCartSync();
  const [method, setMethod] = useState<"entrega" | "retirada">("entrega");
  const [payment, setPayment] = useState<"pix" | "dinheiro" | "cartao">("pix");
  const [form, setForm] = useState({ name: "", phone: "", address: "", neighborhood: "", ref: "", notes: "" });
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ order: OrderSummary; link: string; pix: string | null } | null>(null);
  const pixReady = Boolean(pixForOrder(settings.pix, 100, "TESTE"));
  const [pending, start] = useTransition();
  const key = useRef<string>("");

  useEffect(() => {
    key.current = crypto.randomUUID();
    try {
      const saved = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "null");
      if (saved && typeof saved === "object") setForm((f) => ({ ...f, ...saved, ref: saved.ref ?? "", notes: "" }));
    } catch {}
  }, []);

  const fee =
    method === "retirada"
      ? 0
      : settings.freeDeliveryMin && subtotalCents >= settings.freeDeliveryMin
        ? 0
        : settings.deliveryFee;
  const total = subtotalCents + fee;
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: k === "phone" ? maskPhone(e.target.value) : e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    start(async () => {
      const res = await createOrder({
        idempotency_key: key.current,
        customer_name: form.name,
        customer_phone: form.phone,
        delivery_method: method,
        address: method === "entrega" ? form.address : "",
        neighborhood: method === "entrega" ? form.neighborhood : "",
        address_ref: method === "entrega" ? form.ref : "",
        payment_method: payment,
        notes: form.notes,
        items: items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      try {
        const { name, phone, address, neighborhood, ref } = form;
        localStorage.setItem(PROFILE_KEY, JSON.stringify({ name, phone, address, neighborhood, ref }));
      } catch {}
      const pix = res.order.payment_method === "pix" ? pixForOrder(settings.pix, res.order.total_cents, res.order.code) : null;
      const link = whatsappLink(res.whatsapp || settings.whatsapp, orderMessage(res.order, { pixPaid: Boolean(pix) }));
      setDone({ order: res.order, link, pix });
      clear();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  if (done && done.pix) {
    return <PixPayment order={done.order} pixCode={done.pix} whatsappLink={done.link} hasWhatsapp={Boolean(settings.whatsapp)} />;
  }
  if (done) return <Success order={done.order} link={done.link} hasWhatsapp={Boolean(settings.whatsapp)} />;
  if (!ready) return <div className="h-60 animate-pulse rounded-3xl bg-blush" />;
  if (!items.length) {
    return (
      <div className="rounded-[28px] bg-blush px-6 py-16 text-center">
        <p className="font-script text-5xl text-granat-600">Carrinho vazio</p>
        <Link href="/produtos" className="btn-primary mt-6">
          Ver produtos
        </Link>
      </div>
    );
  }

  const option = (active: boolean) =>
    `flex flex-1 items-center gap-3 rounded-2xl border p-4 text-left transition ${
      active ? "border-granat-700 bg-granat-50" : "border-line hover:border-granat-200"
    }`;

  return (
    <form onSubmit={submit} className="grid gap-10 lg:grid-cols-[1fr_380px]">
      <div>
        <p className="eyebrow">Quase lá</p>
        <h1 className="mt-2 font-serif text-4xl text-granat-950 sm:text-5xl">Finalizar pedido</h1>
        <p className="mt-2 text-sm text-muted">
          Você confirma tudo pelo WhatsApp com a gente. Nada é cobrado agora.
        </p>

        {!settings.acceptingOrders && (
          <p className="mt-6 rounded-2xl bg-granat-50 px-4 py-3 text-sm text-granat-800">
            No momento não estamos recebendo pedidos pelo site. Chame a gente no WhatsApp!
          </p>
        )}
        {warnings.length > 0 && (
          <div className="mt-6 rounded-2xl border border-granat-200 bg-granat-50 px-4 py-3 text-sm text-granat-800">
            {warnings.map((w) => (
              <p key={w}>{w}</p>
            ))}
          </div>
        )}

        <fieldset className="mt-8">
          <legend className="font-serif text-2xl text-granat-950">Seus dados</legend>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="name">Nome</label>
              <input id="name" required autoComplete="name" maxLength={80} value={form.name} onChange={set("name")} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="phone">WhatsApp</label>
              <input
                id="phone"
                required
                inputMode="tel"
                autoComplete="tel-national"
                placeholder="(00) 00000-0000"
                value={form.phone}
                onChange={set("phone")}
                className="input"
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="mt-8">
          <legend className="font-serif text-2xl text-granat-950">Como você quer receber?</legend>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button type="button" className={option(method === "entrega")} onClick={() => setMethod("entrega")} aria-pressed={method === "entrega"}>
              <Bike size={22} className="text-granat-700" strokeWidth={1.5} />
              <span>
                <span className="block font-medium">Entrega{settings.city ? ` em ${settings.city}` : ""}</span>
                <span className="text-xs text-muted">
                  {settings.freeDeliveryMin && subtotalCents >= settings.freeDeliveryMin
                    ? "Grátis para este pedido"
                    : settings.deliveryFee
                      ? `Taxa de ${brl(settings.deliveryFee)}`
                      : "Combinamos pelo WhatsApp"}
                </span>
              </span>
            </button>
            <button type="button" className={option(method === "retirada")} onClick={() => setMethod("retirada")} aria-pressed={method === "retirada"}>
              <Store size={22} className="text-granat-700" strokeWidth={1.5} />
              <span>
                <span className="block font-medium">Retirar na loja</span>
                <span className="text-xs text-muted">Sem taxa</span>
              </span>
            </button>
          </div>

          {method === "entrega" ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 animate-fade-up">
              <div className="sm:col-span-2">
                <label className="label" htmlFor="address">Endereço (rua e número)</label>
                <input id="address" required autoComplete="street-address" maxLength={200} value={form.address} onChange={set("address")} className="input" />
              </div>
              <div>
                <label className="label" htmlFor="neighborhood">Bairro</label>
                <input id="neighborhood" required maxLength={80} value={form.neighborhood} onChange={set("neighborhood")} className="input" />
              </div>
              <div>
                <label className="label" htmlFor="ref">Referência (opcional)</label>
                <input id="ref" maxLength={120} value={form.ref} onChange={set("ref")} className="input" />
              </div>
            </div>
          ) : (
            (settings.pickupAddress || settings.pickupHours) && (
              <div className="mt-4 rounded-2xl bg-blush px-4 py-3 text-sm animate-fade-up">
                {settings.pickupAddress && <p><strong>Onde:</strong> {settings.pickupAddress}</p>}
                {settings.pickupHours && <p className="mt-1"><strong>Quando:</strong> {settings.pickupHours}</p>}
              </div>
            )
          )}
        </fieldset>

        <fieldset className="mt-8">
          <legend className="font-serif text-2xl text-granat-950">Pagamento</legend>
          <p className="mt-1 text-xs text-muted">
            {payment === "pix" && pixReady
              ? "Na próxima tela aparece o QR Code do PIX com o valor certinho."
              : "Você paga depois de confirmar com a gente pelo WhatsApp."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(
              [
                ["pix", "PIX"],
                ["cartao", "Cartão"],
                ["dinheiro", "Dinheiro"],
              ] as const
            ).map(([v, l]) => (
              <button
                key={v}
                type="button"
                aria-pressed={payment === v}
                onClick={() => setPayment(v)}
                className={`rounded-full border px-5 py-2.5 text-sm transition ${
                  payment === v ? "border-granat-700 bg-granat-700 text-white" : "border-line hover:border-granat-400"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="mt-5">
            <label className="label" htmlFor="notes">Observações (opcional)</label>
            <textarea id="notes" rows={3} maxLength={500} value={form.notes} onChange={set("notes")} className="input resize-none" placeholder="Ex.: troco para R$ 100, melhor horário…" />
          </div>
        </fieldset>
      </div>

      <aside className="h-fit rounded-[28px] bg-blush p-6 lg:sticky lg:top-32">
        <h2 className="font-serif text-2xl text-granat-950">Seu pedido</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {items.map((i) => (
            <li key={i.variantId} className="flex justify-between gap-3">
              <span className="min-w-0">
                <span className="text-muted">{i.quantity}×</span> {i.productName}
                {!/^únic/i.test(i.variantName) && <span className="block text-xs text-muted">{i.variantName}</span>}
              </span>
              <span className="shrink-0">{brl(i.priceCents * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-5 space-y-2 border-t border-granat-200/60 pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd>{brl(subtotalCents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">{method === "entrega" ? "Entrega" : "Retirada"}</dt>
            <dd>{fee ? brl(fee) : "Grátis"}</dd>
          </div>
          <div className="flex justify-between border-t border-granat-200/60 pt-3 text-base">
            <dt className="font-medium">Total</dt>
            <dd className="font-serif text-2xl text-granat-700">{brl(total)}</dd>
          </div>
        </dl>
        {error && (
          <p role="alert" className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm text-granat-700">
            {error}
          </p>
        )}
        <button type="submit" disabled={pending || !checked || !settings.acceptingOrders} className="btn-whatsapp mt-6 h-12 w-full">
          {pending ? <Loader2 size={18} className="animate-spin" /> : <MessageCircle size={18} />}
          {pending ? "Registrando…" : payment === "pix" && pixReady ? "Finalizar e pagar com PIX" : "Enviar pedido pelo WhatsApp"}
        </button>
        <p className="mt-3 text-center text-[11px] leading-relaxed text-muted">
          Os produtos ficam reservados para você por um tempo. Usamos seus dados só para este pedido —{" "}
          <Link href="/privacidade" className="underline">privacidade</Link>.
        </p>
      </aside>
    </form>
  );
}

function Success({ order, link, hasWhatsapp }: { order: OrderSummary; link: string; hasWhatsapp: boolean }) {
  return (
    <div className="mx-auto max-w-lg py-6 text-center animate-fade-up">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-granat-50 text-granat-700">
        <Check size={30} />
      </div>
      <p className="mt-6 eyebrow">Pedido {order.code}</p>
      <h1 className="mt-2 font-serif text-4xl text-granat-950">
        Falta <span className="font-script text-5xl text-granat-600">só um toque</span>
      </h1>
      <p className="mt-4 text-[15px] text-muted">
        Seu pedido foi registrado. Agora envie a mensagem no WhatsApp para a gente confirmar com você.
      </p>
      {hasWhatsapp ? (
        <a href={link} target="_blank" rel="noopener" className="btn-whatsapp mt-8 h-14 w-full text-base">
          <MessageCircle size={20} /> Abrir WhatsApp e enviar
        </a>
      ) : (
        <p className="mt-8 rounded-2xl bg-granat-50 p-4 text-sm text-granat-800">
          Guarde o código <strong>{order.code}</strong> — entraremos em contato.
        </p>
      )}
      <div className="mt-8 rounded-[24px] bg-blush p-5 text-left text-sm">
        {order.items.map((i, idx) => (
          <div key={idx} className="flex justify-between gap-3 py-1">
            <span>
              {i.quantity}× {i.product_name}
              {!/^únic/i.test(i.variant_name) && <span className="text-muted"> · {i.variant_name}</span>}
            </span>
            <span>{brl(i.total_cents)}</span>
          </div>
        ))}
        <div className="mt-3 flex justify-between border-t border-granat-200/60 pt-3 font-medium">
          <span>Total</span>
          <span className="text-granat-700">{brl(order.total_cents)}</span>
        </div>
      </div>
      <Link href="/produtos" className="mt-6 inline-block text-sm text-granat-700 hover:underline">
        Voltar para a loja
      </Link>
    </div>
  );
}
