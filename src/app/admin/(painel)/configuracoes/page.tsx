import { SettingsForm } from "@/components/admin/SettingsForm";
import { PageHeader } from "@/components/admin/ui";
import { requireManager } from "@/lib/auth";
import { centsToInput } from "@/lib/money";

export const metadata = { title: "Configurações" };

export default async function SettingsPage() {
  const { db } = await requireManager();
  const { data: s } = await db.from("store_settings").select("*").eq("id", 1).single();
  if (!s) return <p>Configurações não encontradas. Rode a migração do banco.</p>;
  return (
    <>
      <PageHeader title="Configurações" subtitle="Dados da loja, entrega e retirada." />
      <SettingsForm
        initial={{
          store_name: s.store_name,
          whatsapp: s.whatsapp,
          instagram: s.instagram,
          city: s.city,
          address: s.address,
          pickup_address: s.pickup_address,
          pickup_hours: s.pickup_hours,
          about: s.about,
          delivery_fee: centsToInput(s.delivery_fee_cents),
          free_delivery_min: centsToInput(s.free_delivery_min_cents),
          min_order: s.min_order_cents ? centsToInput(s.min_order_cents) : "",
          reservation_hours: String(s.reservation_hours),
          accepting_orders: s.accepting_orders,
        }}
      />
    </>
  );
}
