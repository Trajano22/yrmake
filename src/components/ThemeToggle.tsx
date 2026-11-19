"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const KEY = "yr-theme";

/** Script que roda antes da página aparecer, para não "piscar" claro antes do escuro. */
export const themeScript = `(function(){try{var t=localStorage.getItem('${KEY}');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(KEY, next ? "dark" : "light");
    } catch {}
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Usar modo claro" : "Usar modo escuro"}
      title={dark ? "Modo claro" : "Modo escuro"}
      className={`rounded-full p-2 text-ink transition hover:bg-tint ${className}`}
    >
      {dark ? <Sun size={20} strokeWidth={1.5} /> : <Moon size={20} strokeWidth={1.5} />}
    </button>
  );
}
