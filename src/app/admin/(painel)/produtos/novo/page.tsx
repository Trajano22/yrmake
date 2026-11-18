import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { NewProductForm } from "@/components/admin/ProductForms";
import { PageHeader } from "@/components/admin/ui";
import { requireManager } from "@/lib/auth";

export const metadata = { title: "Novo produto" };

export default async function NewProductPage() {
  const { db } = await requireManager();
  const { data: categories } = await db.from("categories").select("id, name").eq("active", true).order("position");
  return (
    <>
      <Link href="/admin/produtos" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-granat-700">
        <ChevronLeft size={16} /> Produtos
      </Link>
      <PageHeader title="Novo produto" subtitle="Depois de criar, você adiciona fotos e outros tons." />
      <NewProductForm categories={categories ?? []} />
    </>
  );
}
