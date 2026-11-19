import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[linear-gradient(180deg,#fce3e8_0%,#ffffff_70%)] px-4 text-center">
      <p className="font-serif text-7xl font-semibold tracking-[-0.06em] text-granat-950">YR</p>
      <p className="mt-2 font-script text-4xl text-granat-600">ops, não achamos</p>
      <p className="mt-4 text-sm text-muted">Essa página não existe ou o produto saiu da loja.</p>
      <Link href="/produtos" className="btn-primary mt-8">
        Ver produtos
      </Link>
    </div>
  );
}
