import type { Metadata } from "next";
import { getSettings } from "@/lib/catalog";

export const metadata: Metadata = { title: "Privacidade" };

export default async function PrivacyPage() {
  const s = await getSettings();
  return (
    <article className="container-x max-w-2xl pt-12 text-[15px] leading-relaxed text-granat-950/85">
      <p className="eyebrow">LGPD</p>
      <h1 className="mt-2 font-serif text-5xl text-granat-950">Privacidade</h1>
      <p className="mt-6">
        A {s.store_name} usa seus dados apenas para atender o seu pedido. Explicamos aqui, de forma simples, o que
        coletamos e por quê.
      </p>
      <h2 className="mt-8 font-serif text-2xl text-granat-950">O que coletamos</h2>
      <p className="mt-2">
        Nome, WhatsApp e, quando você escolhe entrega, endereço e bairro. Também guardamos os produtos e valores de cada
        pedido.
      </p>
      <h2 className="mt-8 font-serif text-2xl text-granat-950">Para que usamos</h2>
      <p className="mt-2">
        Para confirmar o pedido, combinar pagamento, entregar ou separar para retirada, e manter o histórico de compras.
        Não vendemos nem compartilhamos seus dados com terceiros para publicidade.
      </p>
      <h2 className="mt-8 font-serif text-2xl text-granat-950">No seu aparelho</h2>
      <p className="mt-2">
        O carrinho e os dados do último pedido ficam salvos no seu navegador para facilitar a próxima compra. Você pode
        apagá-los limpando os dados do site.
      </p>
      <h2 className="mt-8 font-serif text-2xl text-granat-950">Seus direitos</h2>
      <p className="mt-2">
        Você pode pedir para ver, corrigir ou apagar seus dados a qualquer momento pelo nosso WhatsApp.
      </p>
    </article>
  );
}
