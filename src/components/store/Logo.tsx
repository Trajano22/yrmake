import Link from "next/link";

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const yr = size === "lg" ? "text-6xl" : size === "sm" ? "text-3xl" : "text-4xl";
  const sub = size === "lg" ? "text-[11px]" : "text-[8.5px]";
  return (
    <Link href="/" aria-label="YR Make e Variedades — início" className="group inline-flex flex-col items-center leading-none">
      <span className={`relative font-serif font-semibold tracking-[-0.06em] text-ink ${yr}`}>
        YR
        <svg
          aria-hidden
          viewBox="0 0 120 30"
          className="pointer-events-none absolute bottom-[12%] left-1/2 w-[150%] -translate-x-1/2 text-granat-400 transition group-hover:text-granat-600"
        >
          <path d="M2 22 C 30 30, 60 4, 118 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </span>
      <span className={`mt-1.5 font-serif uppercase tracking-[0.28em] text-ink ${sub}`}>Make e Variedades</span>
    </Link>
  );
}
