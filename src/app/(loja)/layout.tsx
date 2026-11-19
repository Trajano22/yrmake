import { CartProvider } from "@/components/store/CartProvider";
import { Footer } from "@/components/store/Footer";
import { Header } from "@/components/store/Header";
import { getCategories, getSettings } from "@/lib/catalog";
import { isConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [settings, categories] = await Promise.all([getSettings(), getCategories()]);

  return (
    <CartProvider>
      {!isConfigured && (
        <div className="bg-amber-100 px-4 py-2 text-center text-xs text-amber-900">
          Banco de dados ainda não configurado — veja o README (variáveis NEXT_PUBLIC_SUPABASE_*).
        </div>
      )}
      <Header categories={categories} />
      <main>{children}</main>
      <Footer settings={settings} categories={categories} />
    </CartProvider>
  );
}
