"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import QRCode from "qrcode";
import { brl } from "@/lib/money";
import type { OrderSummary } from "@/lib/types";

/** Tela de pagamento PIX: QR Code + copia e cola + envio do comprovante pelo WhatsApp. */
export function PixPayment({
  order,
  pixCode,
  whatsappLink,
  hasWhatsapp,
}: {
  order: OrderSummary;
  pixCode: string;
  whatsappLink: string;
  hasWhatsapp: boolean;
}) {
  const [svg, setSvg] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    QRCode.toString(pixCode, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#2b0710", light: "#ffffff" } })
      .then(setSvg)
      .catch(() => setSvg(""));
  }, [pixCode]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pixCode);
    } catch {
      const el = document.getElementById("pix-code") as HTMLTextAreaElement | null;
      el?.select();
      document.execCommand?.("copy");
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="mx-auto max-w-lg py-4 text-center animate-fade-up">
      <p className="eyebrow">Pedido {order.code}</p>
      <h1 className="mt-2 font-serif text-4xl text-granat-950">
        Pague com <span className="font-script text-5xl text-granat-600">PIX</span>
      </h1>
      <p className="mt-3 font-serif text-4xl text-granat-700">{brl(order.total_cents)}</p>

      <div className="mt-6 rounded-[28px] bg-blush p-5">
        <p className="text-left text-sm font-medium text-granat-950">
          <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-granat-700 text-xs text-white">1</span>
          Pague pelo app do seu banco
        </p>

        <div className="mx-auto mt-4 hidden w-56 overflow-hidden rounded-2xl bg-white p-2 sm:block">
          {svg ? (
            <div aria-label="QR Code do PIX" role="img" dangerouslySetInnerHTML={{ __html: svg }} />
          ) : (
            <div className="aspect-square animate-pulse rounded-xl bg-granat-50" />
          )}
        </div>
        <p className="mt-3 hidden text-xs text-muted sm:block">Escaneie o QR Code ou use o código abaixo</p>

        <textarea
          id="pix-code"
          readOnly
          value={pixCode}
          rows={3}
          onFocus={(e) => e.currentTarget.select()}
          className="mt-4 w-full resize-none rounded-2xl border border-line bg-white p-3 font-mono text-[11px] leading-snug text-granat-950"
          aria-label="Código PIX copia e cola"
        />
        <button type="button" onClick={copy} className="btn-primary mt-3 h-12 w-full">
          {copied ? <Check size={18} /> : <Copy size={18} />}
          {copied ? "Código copiado!" : "Copiar código PIX"}
        </button>
        <p className="mt-2 text-xs text-muted">
          No app do banco: <strong>PIX → Pix Copia e Cola</strong>. O valor já vem preenchido.
        </p>

        {/* QR no celular fica escondido (a cliente está no próprio celular); mostra sob demanda */}
        {svg && (
          <details className="mt-3 text-xs text-muted sm:hidden">
            <summary className="cursor-pointer">Mostrar QR Code</summary>
            <div className="mx-auto mt-3 w-52 rounded-2xl bg-white p-2" dangerouslySetInnerHTML={{ __html: svg }} />
          </details>
        )}
      </div>

      <div className="mt-4 rounded-[28px] border border-line p-5">
        <p className="text-left text-sm font-medium text-granat-950">
          <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-granat-700 text-xs text-white">2</span>
          Envie o comprovante
        </p>
        {hasWhatsapp ? (
          <a href={whatsappLink} target="_blank" rel="noopener" className="btn-whatsapp mt-4 h-12 w-full">
            <MessageCircle size={18} /> Já paguei — enviar no WhatsApp
          </a>
        ) : (
          <p className="mt-3 text-sm text-muted">Guarde o comprovante e o código {order.code}.</p>
        )}
        <p className="mt-2 text-xs text-muted">
          A mensagem já vai com seu pedido. É só anexar o comprovante. Confirmamos e separamos tudo pra você 💕
        </p>
      </div>

      <div className="mt-6 rounded-[24px] bg-blush p-5 text-left text-sm">
        {order.items.map((i, idx) => (
          <div key={idx} className="flex justify-between gap-3 py-1">
            <span>
              {i.quantity}× {i.product_name}
              {!/^únic/i.test(i.variant_name) && <span className="text-muted"> · {i.variant_name}</span>}
            </span>
            <span>{brl(i.total_cents)}</span>
          </div>
        ))}
        {order.delivery_fee_cents > 0 && (
          <div className="flex justify-between py-1 text-muted">
            <span>Entrega</span>
            <span>{brl(order.delivery_fee_cents)}</span>
          </div>
        )}
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
