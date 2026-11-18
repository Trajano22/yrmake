"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import type { ActionResult } from "@/lib/auth";

/** Botão que chama uma Server Action, mostra carregando, erro e recarrega os dados. */
export function ActionButton({
  action,
  children,
  className = "btn-outline",
  confirm,
}: {
  action: () => Promise<ActionResult>;
  children: React.ReactNode;
  className?: string;
  confirm?: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();
  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        disabled={pending}
        className={className}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          setError("");
          start(async () => {
            const r = await action();
            if (!r.ok) setError(r.error);
            else router.refresh();
          });
        }}
      >
        {pending && <Loader2 size={15} className="animate-spin" />}
        {children}
      </button>
      {error && <span className="mt-1 text-xs text-granat-700">{error}</span>}
    </span>
  );
}
