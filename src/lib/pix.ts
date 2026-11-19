/**
 * PIX estático no padrão BR Code (EMV/Banco Central): gera o "copia e cola"
 * com chave, valor e identificador do pedido. Não depende de nenhum banco ou gateway.
 */

export type PixKeyType = "cpf" | "cnpj" | "email" | "telefone" | "aleatoria";

export type PixConfig = {
  keyType: PixKeyType | "";
  key: string;
  receiverName: string;
  city: string;
};

/** Remove acentos e caracteres fora do padrão aceito pelos bancos. */
function clean(s: string, max: number) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 .\-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()
    .slice(0, max);
}

/** Normaliza a chave conforme o tipo. Devolve null se for inválida. */
export function normalizePixKey(type: PixKeyType | "", raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  switch (type) {
    case "cpf": {
      const d = v.replace(/\D/g, "");
      return d.length === 11 ? d : null;
    }
    case "cnpj": {
      const d = v.replace(/\D/g, "");
      return d.length === 14 ? d : null;
    }
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v.toLowerCase() : null;
    case "telefone": {
      let d = v.replace(/\D/g, "");
      if (d.length === 10 || d.length === 11) d = `55${d}`;
      return d.length === 12 || d.length === 13 ? `+${d}` : null;
    }
    case "aleatoria":
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v) ? v.toLowerCase() : null;
    default:
      return null;
  }
}

function tlv(id: string, value: string) {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

/** CRC16-CCITT (polinômio 0x1021, valor inicial 0xFFFF), exigido pelo BR Code. */
export function crc16(payload: string) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Monta o código "PIX copia e cola".
 * @param amountCents valor em centavos (inteiro); omitido = cliente digita o valor
 * @param txid identificador do pedido (só letras e números, até 25)
 */
export function buildPixPayload(opts: {
  key: string;
  receiverName: string;
  city: string;
  amountCents?: number;
  txid?: string;
  description?: string;
}) {
  const account =
    tlv("00", "br.gov.bcb.pix") +
    tlv("01", opts.key) +
    (opts.description ? tlv("02", clean(opts.description, 40)) : "");
  const txid = (opts.txid ?? "").replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***";
  let payload =
    tlv("00", "01") +
    tlv("26", account) +
    tlv("52", "0000") +
    tlv("53", "986") +
    (opts.amountCents && opts.amountCents > 0
      ? tlv("54", `${Math.floor(opts.amountCents / 100)}.${String(opts.amountCents % 100).padStart(2, "0")}`)
      : "") +
    tlv("58", "BR") +
    tlv("59", clean(opts.receiverName, 25) || "RECEBEDOR") +
    tlv("60", clean(opts.city, 15) || "MANAUS") +
    tlv("62", tlv("05", txid));
  payload += "6304";
  return payload + crc16(payload);
}

/** Gera o copia e cola do pedido, ou null se o PIX não estiver configurado. */
export function pixForOrder(cfg: PixConfig, amountCents: number, orderCode: string) {
  const key = normalizePixKey(cfg.keyType, cfg.key);
  if (!key || !cfg.receiverName.trim()) return null;
  return buildPixPayload({
    key,
    receiverName: cfg.receiverName,
    city: cfg.city || "Manaus",
    amountCents,
    txid: orderCode,
  });
}
