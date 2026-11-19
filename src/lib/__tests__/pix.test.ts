// Rode com: npm run test:pix
import { buildPixPayload, crc16, normalizePixKey } from "../pix.ts";

let fail = 0;
const ok = (c: boolean, m: string) => { console.log(c ? "  ✓" : "  ✗", m); if (!c) fail++; };

// Exemplo oficial do Manual do BR Code (Banco Central)
const ref = "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304";
ok(crc16(ref) === "1D3D", `CRC do exemplo do Banco Central = 1D3D (deu ${crc16(ref)})`);

const p = buildPixPayload({ key: "123e4567-e12b-12d1-a456-426655440000", receiverName: "Fulano de Tal", city: "Brasília" });
ok(p.startsWith("00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426655440000520400005303986"), "estrutura igual ao exemplo");
ok(p.includes("5913FULANO DE TAL6008BRASILIA62070503***6304"), "nome/cidade sem acento e txid padrão");
ok(crc16(p.slice(0, -4)) === p.slice(-4), "CRC confere");

const q = buildPixPayload({ key: "+5592992120062", receiverName: "Maria José Conceição", city: "Manaus", amountCents: 6490, txid: "YR-00012" });
ok(q.includes("540564.90"), "valor 64.90");
ok(q.includes("62110507YR00012"), "txid do pedido sem traço");
ok(q.includes("5920MARIA JOSE CONCEICAO"), "nome sem acentos");
ok(buildPixPayload({ key: "x", receiverName: "a", city: "b", amountCents: 5 }).includes("54040.05"), "5 centavos = 0.05");
ok(buildPixPayload({ key: "x", receiverName: "a", city: "b", amountCents: 100000 }).includes("54071000.00"), "R$ 1000,00");

ok(normalizePixKey("telefone", "(92) 99212-0062") === "+5592992120062", "telefone vira +55");
ok(normalizePixKey("cpf", "123.456.789-09") === "12345678909", "cpf só dígitos");
ok(normalizePixKey("cpf", "123") === null, "cpf inválido recusado");
ok(normalizePixKey("email", "Loja@Gmail.com") === "loja@gmail.com", "e-mail minúsculo");
ok(normalizePixKey("cnpj", "12.345.678/0001-90") === "12345678000190", "cnpj só dígitos");

console.log(fail ? `\n${fail} falha(s)` : "\ntudo ok");
process.exit(fail ? 1 : 0);
