"use client";

import { useState, useTransition } from "react";
import { saveInternalNotes } from "@/app/admin/actions/orders";

export function NotesForm({ orderId, initial }: { orderId: string; initial: string }) {
  const [value, setValue] = useState(initial);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="mt-3">
      <textarea
        rows={3}
        maxLength={2000}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setMsg("");
        }}
        className="input resize-y text-sm"
        placeholder="Ex.: cliente pediu para entregar depois das 18h"
      />
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          disabled={pending || value === initial}
          onClick={() =>
            start(async () => {
              const r = await saveInternalNotes(orderId, value);
              setMsg(r.ok ? "Salvo" : r.error);
            })
          }
          className="btn-outline py-2"
        >
          Salvar
        </button>
        {msg && <span className="text-xs text-muted">{msg}</span>}
      </div>
    </div>
  );
}
