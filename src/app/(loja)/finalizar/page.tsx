import type { Metadata } from "next";
import { CheckoutForm } from "@/components/store/CheckoutForm";
import { getSettings } from "@/lib/catalog";

export const metadata: Metadata = { title: "Finalizar pedido", robots: { index: false } };

export default async function CheckoutPage() {
  const s = await getSettings();
  return (
    <div className="container-x pt-10">
      <CheckoutForm
        settings={{
          acceptingOrders: s.accepting_orders,
          deliveryFee: s.delivery_fee_cents,
          freeDeliveryMin: s.free_delivery_min_cents,
          pickupAddress: s.pickup_address || s.address,
          pickupHours: s.pickup_hours,
          city: s.city,
          whatsapp: s.whatsapp,
        }}
      />
    </div>
  );
}
