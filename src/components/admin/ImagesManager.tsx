"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { ImagePlus, Loader2, Star, Trash2 } from "lucide-react";
import { addImage, makeCover, removeImage } from "@/app/admin/actions/products";
import { ProductImage } from "@/components/store/ProductImage";
import { browserClient } from "@/lib/supabase/browser";

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export function ImagesManager({
  productId,
  images,
  canEdit,
}: {
  productId: string;
  images: { id: string; path: string; position: number }[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    setError("");
    const db = browserClient();
    for (const file of Array.from(files).slice(0, 8)) {
      const ext = TYPES[file.type];
      if (!ext) {
        setError("Use JPG, PNG ou WebP.");
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("Cada foto pode ter até 5 MB.");
        continue;
      }
      const path = `${productId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await db.storage.from("product-images").upload(path, file, {
        contentType: file.type,
        cacheControl: "31536000",
        upsert: false,
      });
      if (upErr) {
        setError(`Falha ao enviar: ${upErr.message}`);
        continue;
      }
      const r = await addImage(productId, path);
      if (!r.ok) setError(r.error);
    }
    setBusy(false);
    if (input.current) input.current.value = "";
    router.refresh();
  };

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error ?? "Erro");
      router.refresh();
    });

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {images.map((img, i) => (
          <div key={img.id} className="group relative aspect-square overflow-hidden rounded-2xl bg-blush">
            <ProductImage path={img.path} name={`Foto ${i + 1}`} />
            {i === 0 && (
              <span className="absolute left-1.5 top-1.5 rounded-full bg-granat-700 px-2 py-0.5 text-[10px] text-white">Capa</span>
            )}
            {canEdit && (
              <div className="absolute inset-x-1.5 bottom-1.5 flex justify-end gap-1 opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100">
                {i > 0 && (
                  <button
                    type="button"
                    title="Usar como capa"
                    onClick={() => run(() => makeCover(productId, img.id))}
                    className="rounded-full bg-surface/90 p-1.5 text-granat-700"
                  >
                    <Star size={14} />
                  </button>
                )}
                <button
                  type="button"
                  title="Excluir foto"
                  onClick={() => confirm("Excluir esta foto?") && run(() => removeImage(img.id))}
                  className="rounded-full bg-surface/90 p-1.5 text-granat-700"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>
        ))}
        {canEdit && (
          <button
            type="button"
            disabled={busy || pending}
            onClick={() => input.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-granat-200 text-xs text-granat-700 transition hover:bg-tint"
          >
            {busy ? <Loader2 size={20} className="animate-spin" /> : <ImagePlus size={20} />}
            {busy ? "Enviando…" : "Adicionar"}
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(e) => upload(e.target.files)}
      />
      {error && <p className="mt-3 text-sm text-granat-700">{error}</p>}
    </div>
  );
}
