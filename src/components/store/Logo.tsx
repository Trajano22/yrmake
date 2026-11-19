import Link from "next/link";

/** Logo oficial da YR Make e Variedades (public/brand). */
export function BrandLogo({
  variant = "dark",
  className = "h-14",
  priority = false,
}: {
  variant?: "dark" | "light";
  className?: string;
  priority?: boolean;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={variant === "light" ? "/brand/logo-claro.png" : "/brand/logo.png"}
      alt="YR Make e Variedades"
      width={447}
      height={292}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={`w-auto select-none ${className}`}
      draggable={false}
    />
  );
}

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const h = size === "lg" ? "h-28" : size === "sm" ? "h-[68px]" : "h-20";
  return (
    <Link href="/" aria-label="YR Make e Variedades — início" className="inline-flex items-center transition hover:opacity-85">
      <BrandLogo className={h} priority />
    </Link>
  );
}
