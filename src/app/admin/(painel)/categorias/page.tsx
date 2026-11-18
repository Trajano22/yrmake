import { CategoriesEditor } from "@/components/admin/CategoriesEditor";
import { PageHeader } from "@/components/admin/ui";
import { requireManager } from "@/lib/auth";

export const metadata = { title: "Categorias" };

export default async function CategoriesPage() {
  const { db } = await requireManager();
  const { data } = await db.from("categories").select("id, name, slug, active, position, products(count)").order("position").order("name");
  const cats = (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    active: c.active,
    count: (c.products as unknown as { count: number }[])?.[0]?.count ?? 0,
  }));
  return (
    <>
      <PageHeader title="Categorias" subtitle="A ordem aqui é a ordem do menu da loja." />
      <CategoriesEditor categories={cats} />
    </>
  );
}
