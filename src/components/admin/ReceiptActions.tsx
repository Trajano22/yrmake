"use client";

import { MessageCircle, Printer } from "lucide-react";
import { whatsappLink } from "@/lib/whatsapp";

export function ReceiptActions({ phone, text }: { phone: string; text: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => window.print()} className="btn-outline py-2.5">
        <Printer size={16} /> Imprimir / salvar PDF
      </button>
      <a href={whatsappLink(phone, text)} target="_blank" rel="noopener" className="btn-whatsapp py-2.5">
        <MessageCircle size={16} /> Enviar à cliente
      </a>
    </div>
  );
}
