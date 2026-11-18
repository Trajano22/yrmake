const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Formata centavos (inteiro) em reais. */
export function brl(cents: number | null | undefined): string {
  return fmt.format((cents ?? 0) / 100);
}

/** "39,90" | "39.90" | "1.234,56" → centavos inteiros (sem ponto flutuante). null = vazio, NaN = inválido. */
export function parseCents(input: string | null | undefined): number | null {
  if (input == null) return null;
  let s = String(input).trim().replace(/[R$\s]/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return NaN;
  const [int, dec = ""] = s.split(".");
  return Number(int) * 100 + Number((dec + "00").slice(0, 2));
}

export function centsToInput(cents: number | null | undefined): string {
  if (cents == null) return "";
  const neg = cents < 0;
  const abs = Math.abs(cents);
  return `${neg ? "-" : ""}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, "0")}`;
}
