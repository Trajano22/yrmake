export type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  featured: boolean;
  category_id: string | null;
  category_name: string | null;
  category_slug: string | null;
  min_price_cents: number;
  min_regular_cents: number;
  on_sale: boolean;
  available: boolean;
  variant_count: number;
  cover_path: string | null;
};

export type CatalogVariant = {
  id: string;
  product_id: string;
  name: string;
  sku: string;
  color_hex: string | null;
  price_cents: number;
  promo_price_cents: number | null;
  final_price_cents: number;
  available: number;
  position: number;
};

export type CatalogCategory = { id: string; name: string; slug: string; position: number };

export type PublicSettings = {
  store_name: string;
  whatsapp: string;
  instagram: string;
  city: string;
  address: string;
  pickup_address: string;
  pickup_hours: string;
  about: string;
  delivery_fee_cents: number;
  free_delivery_min_cents: number | null;
  min_order_cents: number;
  accepting_orders: boolean;
};

export type OrderStatus =
  | "pendente"
  | "aguardando_pagamento"
  | "pago"
  | "em_preparacao"
  | "saiu_para_entrega"
  | "pronto_para_retirada"
  | "concluido"
  | "cancelado";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pendente: "Pendente",
  aguardando_pagamento: "Aguardando pagamento",
  pago: "Pago",
  em_preparacao: "Em preparação",
  saiu_para_entrega: "Saiu para entrega",
  pronto_para_retirada: "Pronto para retirada",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export const PAYMENT_LABEL: Record<string, string> = {
  pix: "PIX",
  dinheiro: "Dinheiro",
  cartao: "Cartão",
  outro: "Outro",
};

export type OrderSummary = {
  code: string;
  customer_name: string;
  delivery_method: "entrega" | "retirada";
  address: string | null;
  neighborhood: string | null;
  address_ref: string | null;
  payment_method: string;
  notes: string | null;
  subtotal_cents: number;
  delivery_fee_cents: number;
  total_cents: number;
  items: {
    product_name: string;
    variant_name: string;
    quantity: number;
    unit_price_cents: number;
    total_cents: number;
  }[];
};
