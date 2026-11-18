import type { Metadata } from "next";
import { CartView } from "@/components/store/CartView";
import { getSettings } from "@/lib/catalog";

export const metadata: Metadata = { title: "Carrinho", robots: { index: false } };

export default async function CartPage() {
  const s = await getSettings();
  return (
    <div className="container-x pt-10">
      <p className="eyebrow">Sua sacola</p>
      <h1 className="mt-2 font-serif text-4xl text-granat-950 sm:text-5xl">Carrinho</h1>
      <CartView freeDeliveryMin={s.free_delivery_min_cents} minOrder={s.min_order_cents} />
    </div>
  );
}
