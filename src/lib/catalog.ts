import "server-only";
import { cache } from "react";
import { isConfigured } from "@/lib/env";
import { publicClient } from "@/lib/supabase/public";
import type { CatalogCategory, CatalogProduct, CatalogVariant, PublicSettings } from "@/lib/types";

const DEFAULT_SETTINGS: PublicSettings = {
  store_name: "YR Make e Variedades",
  whatsapp: "",
  instagram: "",
  city: "",
  address: "",
  pickup_address: "",
  pickup_hours: "",
  about: "",
  delivery_fee_cents: 0,
  free_delivery_min_cents: null,
  min_order_cents: 0,
  accepting_orders: false,
};

export const getSettings = cache(async (): Promise<PublicSettings> => {
  if (!isConfigured) return DEFAULT_SETTINGS;
  const { data } = await publicClient().from("public_settings").select("*").maybeSingle();
  return (data as PublicSettings) ?? DEFAULT_SETTINGS;
});

export const getCategories = cache(async (): Promise<CatalogCategory[]> => {
  if (!isConfigured) return [];
  const { data } = await publicClient().from("catalog_categories").select("*").order("position");
  return (data as CatalogCategory[]) ?? [];
});

export async function getProducts(
  opts: { category?: string; q?: string; featured?: boolean; promo?: boolean; limit?: number } = {},
): Promise<CatalogProduct[]> {
  if (!isConfigured) return [];
  let query = publicClient().from("catalog_products").select("*");
  if (opts.category) query = query.eq("category_slug", opts.category);
  if (opts.featured) query = query.eq("featured", true);
  if (opts.promo) query = query.eq("on_sale", true);
  if (opts.q) {
    const term = opts.q.replace(/[%_,()*\\]/g, " ").trim().slice(0, 60);
    if (term) query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%`);
  }
  query = query.order("available", { ascending: false }).order("created_at", { ascending: false });
  if (opts.limit) query = query.limit(opts.limit);
  const { data } = await query;
  return (data as CatalogProduct[]) ?? [];
}

export async function getProduct(slug: string) {
  if (!isConfigured) return null;
  const db = publicClient();
  const { data: product } = await db.from("catalog_products").select("*").eq("slug", slug).maybeSingle();
  if (!product) return null;
  const [{ data: variants }, { data: images }] = await Promise.all([
    db.from("catalog_variants").select("*").eq("product_id", product.id).order("position"),
    db.from("catalog_images").select("*").eq("product_id", product.id).order("position"),
  ]);
  return {
    product: product as CatalogProduct,
    variants: (variants as CatalogVariant[]) ?? [],
    images: (images as { id: string; path: string }[]) ?? [],
  };
}
