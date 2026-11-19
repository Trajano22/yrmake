"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionStaff, fail, type ActionResult } from "@/lib/auth";
import { parseCents } from "@/lib/money";

function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "produto";
}

const money = (label: string, required: boolean) =>
  z
    .string()
    .optional()
    .transform((v, ctx) => {
      const c = parseCents(v ?? "");
      if (c === null) {
        if (required) ctx.addIssue({ code: "custom", message: `Informe ${label}.` });
        return null;
      }
      if (Number.isNaN(c) || c < 0 || c > 10_000_000) {
        ctx.addIssue({ code: "custom", message: `${label} inválido.` });
        return null;
      }
      return c;
    });

const productSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto.").max(120),
  category_id: z.union([z.uuid(), z.literal("")]).transform((v) => v || null),
  description: z.string().max(5000).default(""),
  status: z.enum(["draft", "active", "archived"]),
  featured: z.boolean().default(false),
});

const variantSchema = z
  .object({
    name: z.string().trim().min(1, "Dê um nome à variação (ex.: tom).").max(60),
    sku: z
      .string()
      .trim()
      .toUpperCase()
      .min(2, "SKU muito curto.")
      .max(40)
      .regex(/^[A-Z0-9._-]+$/, "SKU: use letras, números, ponto, traço."),
    color_hex: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v && /^#[0-9a-fA-F]{6}$/.test(v) ? v : null)),
    price: money("o preço de venda", true),
    promo: money("o preço promocional", false),
    cost: money("o custo", false),
    min_stock: z.coerce.number().int().min(0).max(100000).default(0),
    active: z.boolean().default(true),
    position: z.coerce.number().int().min(0).max(1000).default(0),
  })
  .superRefine((v, ctx) => {
    if (v.price !== null && v.price <= 0) ctx.addIssue({ code: "custom", message: "Preço precisa ser maior que zero." });
    if (v.promo !== null && v.price !== null && v.promo >= v.price)
      ctx.addIssue({ code: "custom", message: "Promoção precisa ser menor que o preço." });
  });

export type VariantInput = z.input<typeof variantSchema>;
export type ProductInput = z.input<typeof productSchema>;

function variantRow(v: z.output<typeof variantSchema>) {
  return {
    name: v.name,
    sku: v.sku,
    color_hex: v.color_hex,
    price_cents: v.price!,
    promo_price_cents: v.promo,
    cost_cents: v.cost ?? 0,
    min_stock: v.min_stock,
    active: v.active,
    position: v.position,
  };
}

function firstIssue(e: z.ZodError) {
  return e.issues[0]?.message ?? "Confira os campos.";
}

export async function createProduct(
  product: ProductInput,
  variant: VariantInput,
  initialStock: number,
): Promise<ActionResult & { id?: string }> {
  try {
    const p = productSchema.safeParse(product);
    if (!p.success) return { ok: false, error: firstIssue(p.error) };
    const v = variantSchema.safeParse(variant);
    if (!v.success) return { ok: false, error: firstIssue(v.error) };
    const stock = z.number().int().min(0).max(100000).parse(initialStock || 0);
    const { db } = await actionStaff("manager");

    const base = slugify(p.data.name);
    let id: string | null = null;
    for (let i = 0; i < 6 && !id; i++) {
      const slug = i === 0 ? base : `${base}-${i + 1}`;
      const { data, error } = await db.from("products").insert({ ...p.data, slug }).select("id").single();
      if (!error) id = data.id;
      else if (!error.message.includes("slug")) throw error;
    }
    if (!id) return { ok: false, error: "Não consegui gerar o endereço do produto. Mude o nome." };

    const { data: variantRowData, error: vErr } = await db
      .from("product_variants")
      .insert({ ...variantRow(v.data), product_id: id })
      .select("id")
      .single();
    if (vErr) {
      await db.from("products").delete().eq("id", id);
      throw vErr;
    }
    if (stock > 0) {
      const { error } = await db.rpc("adjust_stock", {
        p_variant_id: variantRowData.id,
        p_type: "entrada",
        p_quantity: stock,
        p_reason: "Estoque inicial",
      });
      if (error) throw error;
    }
    revalidatePath("/admin/produtos");
    return { ok: true, id };
  } catch (e) {
    return fail(e);
  }
}

export async function updateProduct(id: string, product: ProductInput): Promise<ActionResult> {
  try {
    z.uuid().parse(id);
    const p = productSchema.safeParse(product);
    if (!p.success) return { ok: false, error: firstIssue(p.error) };
    const { db } = await actionStaff("manager");
    const { error } = await db.from("products").update(p.data).eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/produtos");
    return { ok: true, message: "Produto salvo" };
  } catch (e) {
    return fail(e);
  }
}

export async function saveVariant(
  productId: string,
  variantId: string | null,
  variant: VariantInput,
  initialStock = 0,
): Promise<ActionResult> {
  try {
    z.uuid().parse(productId);
    const v = variantSchema.safeParse(variant);
    if (!v.success) return { ok: false, error: firstIssue(v.error) };
    const { db } = await actionStaff("manager");
    if (variantId) {
      z.uuid().parse(variantId);
      const { error } = await db
        .from("product_variants")
        .update(variantRow(v.data))
        .eq("id", variantId)
        .eq("product_id", productId);
      if (error) throw error;
    } else {
      const { data, error } = await db
        .from("product_variants")
        .insert({ ...variantRow(v.data), product_id: productId })
        .select("id")
        .single();
      if (error) throw error;
      const stock = z.number().int().min(0).max(100000).parse(initialStock || 0);
      if (stock > 0) {
        const { error: sErr } = await db.rpc("adjust_stock", {
          p_variant_id: data.id,
          p_type: "entrada",
          p_quantity: stock,
          p_reason: "Estoque inicial",
        });
        if (sErr) throw sErr;
      }
    }
    return { ok: true, message: "Variação salva" };
  } catch (e) {
    return fail(e);
  }
}

/** Exclui o tom se nunca foi vendido; se já foi vendido, arquiva (some da loja, histórico fica). */
export async function removeVariant(variantId: string): Promise<ActionResult> {
  try {
    z.uuid().parse(variantId);
    const { db } = await actionStaff("manager");
    const { data, error } = await db.rpc("delete_variant", { p_variant_id: variantId });
    if (error) throw error;
    revalidatePath("/admin", "layout");
    return {
      ok: true,
      message: data === "arquivado" ? "Esse tom já teve vendas, então foi arquivado (sumiu da loja)." : "Tom excluído.",
    };
  } catch (e) {
    return fail(e);
  }
}

/** Exclui o produto se nunca foi vendido; se já foi vendido, arquiva. */
export async function deleteProduct(productId: string): Promise<ActionResult> {
  try {
    z.uuid().parse(productId);
    const { db } = await actionStaff("manager");
    const { data: imgs } = await db.from("product_images").select("path").eq("product_id", productId);
    const { data, error } = await db.rpc("delete_product", { p_product_id: productId });
    if (error) throw error;
    if (data === "excluido" && imgs?.length) {
      await db.storage.from("product-images").remove(imgs.map((i) => i.path));
    }
    revalidatePath("/admin", "layout");
    revalidatePath("/", "layout");
    return {
      ok: true,
      message:
        data === "arquivado"
          ? "Esse produto já teve vendas, então foi arquivado: sumiu da loja e da lista, e os pedidos antigos continuam certos."
          : "Produto excluído.",
    };
  } catch (e) {
    return fail(e);
  }
}

export async function addImage(productId: string, path: string): Promise<ActionResult> {
  try {
    z.uuid().parse(productId);
    if (!path.startsWith(`${productId}/`) || path.includes("..")) return { ok: false, error: "Caminho inválido." };
    const { db } = await actionStaff("manager");
    const { count } = await db.from("product_images").select("id", { count: "exact", head: true }).eq("product_id", productId);
    const { error } = await db.from("product_images").insert({ product_id: productId, path, position: count ?? 0 });
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function removeImage(imageId: string): Promise<ActionResult> {
  try {
    z.uuid().parse(imageId);
    const { db } = await actionStaff("manager");
    const { data: img } = await db.from("product_images").select("path").eq("id", imageId).single();
    if (!img) return { ok: false, error: "Foto não encontrada." };
    const { error } = await db.from("product_images").delete().eq("id", imageId);
    if (error) throw error;
    await db.storage.from("product-images").remove([img.path]);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function makeCover(productId: string, imageId: string): Promise<ActionResult> {
  try {
    z.uuid().parse(productId);
    z.uuid().parse(imageId);
    const { db } = await actionStaff("manager");
    const { data: imgs } = await db.from("product_images").select("id").eq("product_id", productId).order("position");
    const ordered = [imageId, ...(imgs ?? []).map((i) => i.id).filter((i) => i !== imageId)];
    for (let i = 0; i < ordered.length; i++) {
      const { error } = await db.from("product_images").update({ position: i }).eq("id", ordered[i]);
      if (error) throw error;
    }
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
