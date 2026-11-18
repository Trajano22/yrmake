"use client";

import { useState } from "react";
import { ProductImage } from "./ProductImage";

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [i, setI] = useState(0);
  const current = images[i] ?? null;
  return (
    <div>
      <div className="aspect-square overflow-hidden rounded-[32px] bg-blush sm:aspect-[4/5]">
        <ProductImage path={current} name={name} priority />
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {images.map((p, idx) => (
            <button
              key={p}
              type="button"
              onClick={() => setI(idx)}
              aria-label={`Foto ${idx + 1}`}
              className={`h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 transition ${
                idx === i ? "border-granat-700" : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <ProductImage path={p} name={`${name} ${idx + 1}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
