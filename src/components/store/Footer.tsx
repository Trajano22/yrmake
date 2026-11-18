import Link from "next/link";
import { AtSign, MapPin, MessageCircle } from "lucide-react";
import type { CatalogCategory, PublicSettings } from "@/lib/types";
import { whatsappLink } from "@/lib/whatsapp";

export function Footer({ settings, categories }: { settings: PublicSettings; categories: CatalogCategory[] }) {
  const ig = settings.instagram.replace(/^@/, "");
  return (
    <footer className="mt-24 bg-granat-950 text-granat-50">
      <div className="container-x grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <p className="font-serif text-4xl font-semibold tracking-[-0.05em] text-white">YR</p>
          <p className="mt-1 font-serif text-xs uppercase tracking-[0.3em]">Make e Variedades</p>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-granat-200">
            {settings.about ||
              "Maquiagens, skincare e acessórios escolhidos com carinho. Peça pelo site e receba em casa ou retire com a gente."}
          </p>
        </div>
        <div>
          <p className="eyebrow !text-granat-200">Categorias</p>
          <ul className="mt-4 space-y-2 text-sm">
            {categories.slice(0, 6).map((c) => (
              <li key={c.id}>
                <Link href={`/produtos?categoria=${c.slug}`} className="hover:text-white">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="eyebrow !text-granat-200">Fale com a gente</p>
          <ul className="mt-4 space-y-3 text-sm">
            {settings.whatsapp && (
              <li>
                <a href={whatsappLink(settings.whatsapp, "Olá! Vim pelo site 💕")} target="_blank" rel="noopener" className="inline-flex items-center gap-2 hover:text-white">
                  <MessageCircle size={16} /> WhatsApp
                </a>
              </li>
            )}
            {ig && (
              <li>
                <a href={`https://instagram.com/${encodeURIComponent(ig)}`} target="_blank" rel="noopener" className="inline-flex items-center gap-2 hover:text-white">
                  <AtSign size={16} /> @{ig}
                </a>
              </li>
            )}
            {(settings.address || settings.city) && (
              <li className="inline-flex items-start gap-2">
                <MapPin size={16} className="mt-0.5 shrink-0" />
                <span>{[settings.address, settings.city].filter(Boolean).join(" · ")}</span>
              </li>
            )}
            <li>
              <Link href="/contato" className="hover:text-white">
                Entrega e retirada
              </Link>
            </li>
            <li>
              <Link href="/privacidade" className="hover:text-white">
                Privacidade
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col items-center justify-between gap-2 py-5 text-[11px] text-granat-200 sm:flex-row">
          <span>© {new Date().getFullYear()} {settings.store_name}</span>
          <span className="font-script text-lg text-granat-200">com amor, YR</span>
        </div>
      </div>
    </footer>
  );
}
