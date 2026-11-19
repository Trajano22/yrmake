import type { Metadata } from "next";
import { Bike, Clock, AtSign, MapPin, MessageCircle, Store } from "lucide-react";
import { getSettings } from "@/lib/catalog";
import { brl } from "@/lib/money";
import { whatsappLink } from "@/lib/whatsapp";

export const metadata: Metadata = { title: "Contato, entrega e retirada" };

export default async function ContactPage() {
  const s = await getSettings();
  const ig = s.instagram.replace(/^@/, "");
  return (
    <div className="container-x pt-12">
      <div className="text-center">
        <p className="eyebrow">Fale com a gente</p>
        <h1 className="mt-2 font-serif text-5xl text-ink">
          Contato <span className="font-script text-granat-600">&</span> entrega
        </h1>
      </div>

      <div className="mx-auto mt-12 grid max-w-4xl gap-5 sm:grid-cols-2">
        <Card icon={Bike} title={`Entrega${s.city ? ` em ${s.city}` : " na cidade"}`}>
          {s.delivery_fee_cents ? <p>Taxa de entrega: {brl(s.delivery_fee_cents)}</p> : <p>Taxa combinada pelo WhatsApp.</p>}
          {s.free_delivery_min_cents && <p>Grátis em pedidos a partir de {brl(s.free_delivery_min_cents)}.</p>}
          <p className="mt-2 text-muted">Entregamos somente na cidade.</p>
        </Card>
        <Card icon={Store} title="Retirada">
          <p>{s.pickup_address || s.address || "Endereço informado pelo WhatsApp."}</p>
          {s.pickup_hours && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-muted">
              <Clock size={14} /> {s.pickup_hours}
            </p>
          )}
        </Card>
        {s.whatsapp && (
          <a href={whatsappLink(s.whatsapp, "Olá! Vim pelo site 💕")} target="_blank" rel="noopener" className="block">
            <Card icon={MessageCircle} title="WhatsApp">
              <p className="text-granat-700 underline-offset-4 hover:underline">Chamar no WhatsApp</p>
            </Card>
          </a>
        )}
        {ig && (
          <a href={`https://instagram.com/${encodeURIComponent(ig)}`} target="_blank" rel="noopener" className="block">
            <Card icon={AtSign} title="Instagram">
              <p className="text-granat-700">@{ig}</p>
            </Card>
          </a>
        )}
        {s.address && (
          <Card icon={MapPin} title="Endereço">
            <p>{[s.address, s.city].filter(Boolean).join(" · ")}</p>
          </Card>
        )}
      </div>
    </div>
  );
}

function Card({ icon: Icon, title, children }: { icon: typeof Bike; title: string; children: React.ReactNode }) {
  return (
    <div className="h-full rounded-[28px] bg-blush p-6 transition hover:bg-tint">
      <Icon size={24} strokeWidth={1.4} className="text-granat-700" />
      <h2 className="mt-3 font-serif text-2xl text-ink">{title}</h2>
      <div className="mt-2 text-sm leading-relaxed">{children}</div>
    </div>
  );
}
