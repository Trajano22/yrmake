import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { ImagesManager } from "@/components/admin/ImagesManager";
import { ProductDetailsForm, VariantsEditor } from "@/components/admin/ProductForms";
import { Card, PageHeader } from "@/components/admin/ui";
import { requireStaff } from "@/lib/auth";

export const metadata = { title: "Produto" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { staff, db } = await requireStaff();
  const canEdit = staff.role !== "staff";
  const [{ data: p }, { data: categories }, { data: variants }, { data: images }] = await Promise.all([
    db.from("products").select("*").eq("id", id).maybeSingle(),
    db.from("categories").select("id, name").order("position"),
    db.from("product_variants").select("*").eq("product_id", id).order("position").order("created_at"),
    db.from("product_images").select("id, path, position").eq("product_id", id).order("position"),
  ]);
  if (!p) notFound();

  return (
    <>
      <Link href="/admin/produtos" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-granat-700">
        <ChevronLeft size={16} /> Produtos
      </Link>
      <PageHeader
        title={p.name}
        action={
          p.status === "active" && (
            <a href={`/produto/${p.slug}`} target="_blank" className="btn-outline py-2.5">
              <ExternalLink size={15} /> Ver na loja
            </a>
          )
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card>
            <h2 className="mb-4 font-serif text-2xl">Dados</h2>
            <ProductDetailsForm
              id={p.id}
              categories={categories ?? []}
              canEdit={canEdit}
              initial={{
                name: p.name,
                category_id: p.category_id ?? "",
                description: p.description,
                status: p.status,
                featured: p.featured,
              }}
            />
          </Card>
          <Card>
            <h2 className="font-serif text-2xl">Tons / variações</h2>
            <p className="mb-4 text-xs text-muted">
              Cada tom tem preço, custo e estoque próprios. O estoque muda só pela tela Estoque (fica registrado quem mexeu).
            </p>
            <VariantsEditor productId={p.id} variants={variants ?? []} canEdit={canEdit} />
          </Card>
        </div>
        <Card className="h-fit">
          <h2 className="font-serif text-2xl">Fotos</h2>
          <p className="mb-4 text-xs text-muted">A primeira é a capa. JPG, PNG ou WebP até 5 MB.</p>
          <ImagesManager productId={p.id} images={images ?? []} canEdit={canEdit} />
        </Card>
      </div>
    </>
  );
}
