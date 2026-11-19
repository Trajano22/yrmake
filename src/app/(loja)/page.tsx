import Link from "next/link";
import { ArrowRight, Heart, MapPin, MessageCircle, Sparkles } from "lucide-react";
import { ProductCard } from "@/components/store/ProductCard";
import { getCategories, getProducts, getSettings } from "@/lib/catalog";

export default async function Home() {
  const [featured, latest, categories, settings] = await Promise.all([
    getProducts({ featured: true, limit: 8 }),
    getProducts({ limit: 8 }),
    getCategories(),
    getSettings(),
  ]);
  const showcase = featured.length ? featured : latest;

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,var(--color-hero-a)_0%,var(--color-hero-b)_45%,var(--color-page)_92%)]">
        <Sparkle className="left-[8%] top-[18%] h-6 w-6" />
        <Sparkle className="right-[10%] top-[12%] h-8 w-8" />
        <Sparkle className="right-[22%] bottom-[22%] h-4 w-4" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-granat-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-tint blur-3xl" />

        <div className="container-x relative flex flex-col items-center py-16 text-center sm:py-24">
          <p className="eyebrow animate-fade-up">Maquiagem · Skincare · Acessórios</p>
          <h1 className="mt-5 animate-fade-up font-serif text-[44px] leading-[1.05] font-normal tracking-[-0.01em] text-ink [animation-delay:80ms] sm:text-7xl">
            Sua beleza,
            <span className="block font-script text-granat-600">do seu jeito</span>
          </h1>
          <svg aria-hidden viewBox="0 0 220 24" className="mt-1 w-48 animate-fade-up text-granat-400 [animation-delay:160ms]">
            <path d="M2 12 H90" stroke="currentColor" strokeWidth="1.2" />
            <path d="M130 12 H218" stroke="currentColor" strokeWidth="1.2" />
            <path
              d="M110 20 C 96 10, 100 2, 110 8 C 120 2, 124 10, 110 20 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
            />
          </svg>
          <p className="mt-5 max-w-md animate-fade-up text-[15px] leading-relaxed text-muted [animation-delay:200ms]">
            Escolha seus favoritos, finalize pelo WhatsApp e receba em casa
            {settings.city ? ` em ${settings.city}` : ""} — ou retire com a gente.
          </p>
          <div className="mt-8 flex animate-fade-up flex-col gap-3 [animation-delay:260ms] sm:flex-row">
            <Link href="/produtos" className="btn-primary px-8">
              Ver produtos <ArrowRight size={16} />
            </Link>
            <Link href="/produtos?promo=1" className="btn-outline px-8">
              Promoções
            </Link>
          </div>
        </div>
      </section>

      {/* CATEGORIAS */}
      {categories.length > 0 && (
        <section className="container-x pb-4 pt-8">
          <div className="-mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:flex-wrap sm:justify-center">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/produtos?categoria=${c.slug}`}
                className="shrink-0 snap-start rounded-full border border-line bg-surface px-5 py-2.5 text-sm text-ink transition hover:border-granat-400 hover:bg-tint"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* DESTAQUES */}
      <section className="container-x pt-14">
        <div className="relative mb-8 text-center">
          <h2 className="section-title">{featured.length ? "Mais amados" : "Novidades da semana"}</h2>
          <Link
            href="/produtos"
            className="absolute right-0 top-1/2 hidden -translate-y-1/2 items-center gap-1 text-xs uppercase tracking-[0.16em] text-granat-700 hover:underline sm:inline-flex"
          >
            Ver tudo <ArrowRight size={14} />
          </Link>
        </div>
        {showcase.length ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
            {showcase.map((p, i) => (
              <ProductCard key={p.id} p={p} priority={i < 4} />
            ))}
          </div>
        ) : (
          <EmptyShowcase />
        )}
        <div className="mt-10 text-center sm:hidden">
          <Link href="/produtos" className="btn-outline">
            Ver todos os produtos
          </Link>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="container-x pt-24">
        <div className="rounded-[36px] bg-blush px-6 py-12 sm:px-12">
          <div className="text-center">
            <h2 className="section-title">Como comprar</h2>
          </div>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {[
              { icon: Heart, t: "Escolha", d: "Navegue, escolha o tom e coloque no carrinho." },
              { icon: MessageCircle, t: "Finalize no WhatsApp", d: "Seu pedido chega pra gente pronto, com tudo certinho." },
              { icon: MapPin, t: "Receba ou retire", d: "Entregamos na cidade ou você retira com a gente." },
            ].map(({ icon: Icon, t, d }, i) => (
              <div key={t} className="flex flex-col items-center text-center">
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-surface text-granat-700 shadow-[0_10px_30px_-15px_rgba(146,23,51,0.5)]">
                  <Icon size={24} strokeWidth={1.4} />
                  <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-granat-700 text-[11px] text-white">
                    {i + 1}
                  </span>
                </div>
                <h3 className="mt-4 text-sm font-medium uppercase tracking-[0.16em] text-ink">{t}</h3>
                <p className="mt-1 max-w-[16rem] text-sm text-muted">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function Sparkle({ className = "" }: { className?: string }) {
  return (
    <Sparkles aria-hidden strokeWidth={1} className={`pointer-events-none absolute text-granat-400/70 ${className}`} />
  );
}

function EmptyShowcase() {
  return (
    <div className="rounded-[28px] border border-dashed border-granat-200 bg-blush px-6 py-16 text-center">
      <p className="font-script text-3xl text-granat-600">Em breve</p>
      <p className="mt-2 text-sm text-muted">Estamos arrumando a vitrine. Volte daqui a pouquinho!</p>
    </div>
  );
}
