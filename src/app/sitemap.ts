import type { MetadataRoute } from "next";
import { getCategories, getProducts } from "@/lib/catalog";
import { SITE_URL } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);
  return [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/produtos`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/contato`, changeFrequency: "monthly", priority: 0.4 },
    ...categories.map((c) => ({ url: `${SITE_URL}/produtos?categoria=${c.slug}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...products.map((p) => ({ url: `${SITE_URL}/produto/${p.slug}`, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
