import type { OrderStatus } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/types";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-serif text-4xl text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-[24px] border border-line bg-surface p-5 ${className}`}>{children}</div>;
}

const STATUS_STYLE: Record<OrderStatus, string> = {
  pendente: "bg-amber-50 text-amber-800 ring-amber-200",
  aguardando_pagamento: "bg-orange-50 text-orange-800 ring-orange-200",
  pago: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  em_preparacao: "bg-sky-50 text-sky-800 ring-sky-200",
  saiu_para_entrega: "bg-indigo-50 text-indigo-800 ring-indigo-200",
  pronto_para_retirada: "bg-violet-50 text-violet-800 ring-violet-200",
  concluido: "bg-tint text-granat-800 ring-granat-200",
  cancelado: "bg-zinc-100 text-zinc-600 ring-zinc-200",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-[24px] border border-dashed border-granat-200 bg-surface p-10 text-center text-sm text-muted">{children}</div>;
}

export function formatDate(iso: string | null, withTime = true) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}
