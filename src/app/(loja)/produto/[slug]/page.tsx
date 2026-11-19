import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { ProductBuy } from "@/components/store/ProductBuy";
import { ProductGallery } from "@/components/store/ProductGallery";
import { getProduct } from "@/lib/catalog";
import { imageUrl } from "@/lib/env";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const data = await getProduct((await params).slug);
  if (!data) return { title: "Produto não encontrado" };
  const img = imageUrl(data.product.cover_path);
  return {
    title: data.product.name,
    description: data.product.description.slice(0, 160),
    openGraph: img ? { images: [img] } : undefined,
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const data = await getProduct((await params).slug);
  if (!data || data.variants.length === 0) notFound();
  const { product, variants, images } = data;

  return (
    <div className="container-x pt-6">
      <Link
        href={product.category_slug ? `/produtos?categoria=${product.category_slug}` : "/produtos"}
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-granat-700"
      >
        <ChevronLeft size={16} /> {product.category_name ?? "Produtos"}
      </Link>

      <div className="mt-5 grid gap-8 lg:grid-cols-2 lg:gap-14">
        <ProductGallery images={images.map((i) => i.path)} name={product.name} />

        <div className="lg:pt-4">
          {product.category_name && <p className="eyebrow">{product.category_name}</p>}
          <h1 className="mt-2 font-serif text-4xl leading-tight text-ink sm:text-5xl">{product.name}</h1>

          <ProductBuy
            product={{ slug: product.slug, name: product.name, cover: product.cover_path }}
            variants={variants}
          />

          {product.description && (
            <div className="mt-10 border-t border-line pt-6">
              <h2 className="eyebrow">Sobre o produto</h2>
              <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-ink/80">
                {product.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
