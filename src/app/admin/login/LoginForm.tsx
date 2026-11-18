"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { signIn } from "../actions/auth";

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, { error: "" });
  return (
    <form action={action} className="mt-8 space-y-4">
      <div>
        <label htmlFor="email" className="label">E-mail</label>
        <input id="email" name="email" type="email" required autoComplete="username" className="input" />
      </div>
      <div>
        <label htmlFor="password" className="label">Senha</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className="input" />
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-granat-700">
          {state.error}
        </p>
      )}
      <button disabled={pending} className="btn-primary h-12 w-full">
        {pending && <Loader2 size={16} className="animate-spin" />} Entrar
      </button>
    </form>
  );
}
