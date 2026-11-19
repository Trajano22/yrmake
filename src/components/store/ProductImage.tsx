import { imageUrl } from "@/lib/env";

/** Foto do produto ou, sem foto, um fundo rosado elegante com o nome em letra cursiva. */
export function ProductImage({
  path,
  name,
  className = "",
  priority = false,
}: {
  path: string | null;
  name: string;
  className?: string;
  priority?: boolean;
}) {
  const src = imageUrl(path);
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className={`h-full w-full object-cover ${className}`}
      />
    );
  }
  const word = name.split(" ")[0] ?? name;
  return (
    <div
      role="img"
      aria-label={name}
      className={`relative flex h-full w-full items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_30%_20%,#fff_0%,#fce3e8_45%,#f2a9b7_100%)] [container-type:inline-size] ${className}`}
    >
      <span className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/50 blur-2xl" />
      <span className="px-[6%] text-center font-script text-[min(2.6rem,16cqw)] leading-none text-granat-700/80">{word}</span>
    </div>
  );
}
