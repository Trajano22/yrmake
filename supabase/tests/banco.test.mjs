// Testa o banco num Postgres embutido (PGlite): segurança, reservas, estoque, cancelamento.
// Rode com: npm run test:db
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const migration = ["0001_inicial.sql", "0002_pix.sql", "0003_excluir.sql"]
  .map((f) => readFileSync(new URL(`../migrations/${f}`, import.meta.url), "utf8"))
  .join("\n");
const demo = null;
const db = new PGlite();

await db.exec(`
create role anon nologin; create role authenticated nologin;
create schema auth; create schema storage;
grant usage on schema auth, storage, public to anon, authenticated;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant execute on function auth.uid() to anon, authenticated;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
`);
try { await db.exec(migration); } catch (e) { console.log("MIGRATION ERROR:", e.message, e.position, e.where); process.exit(2); }
if (demo) await db.exec(demo);
console.log("migration OK");

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗", m); } };
const as = async (role, uid, fn) => {
  await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub', '${uid ?? ""}', false);`);
  try { return await fn(); } finally { await db.exec(`reset role;`); }
};
const err = async (p) => { try { await p; return null; } catch (e) { return e.message; } };

const OWNER = "11111111-1111-1111-1111-111111111111";
const STRANGER = "22222222-2222-2222-2222-222222222222";
await db.exec(`insert into auth.users values ('${OWNER}','o@x'),('${STRANGER}','s@x');
insert into profiles (id, full_name, role) values ('${OWNER}', 'Dona', 'owner');
insert into products (id, name, slug, status, category_id) values ('aaaaaaaa-0000-0000-0000-000000000001','Batom Teste','batom-teste','active',(select id from categories where slug='batons'));
insert into product_variants (id, product_id, name, sku, price_cents, promo_price_cents, cost_cents)
  values ('bbbbbbbb-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','Rosa','BAT-ROSA',3990,2990,1200);
update product_variants set stock = 5 where sku='BAT-ROSA';
update store_settings set delivery_fee_cents = 500, free_delivery_min_cents = 10000;`);
const V = "bbbbbbbb-0000-0000-0000-000000000001";
const stock = async () => (await db.query(`select stock, reserved from product_variants where id='${V}'`)).rows[0];

console.log("Vitrine pública");
await as("anon", null, async () => {
  const r = await db.query(`select * from catalog_variants`);
  ok(r.rows.length === 1 && !("cost_cents" in r.rows[0]), "anon vê variação sem custo");
  ok(r.rows[0].final_price_cents === 2990, "preço final usa promoção");
  ok(!!(await err(db.query(`select cost_cents from product_variants`))), "anon NÃO lê tabela de variações");
  ok(!!(await err(db.query(`select * from orders`))), "anon NÃO lê pedidos");
  ok(!!(await err(db.query(`select * from customers`))), "anon NÃO lê clientes");
  const p = await db.query(`select * from catalog_products`);
  ok(p.rows.length === 1 && p.rows[0].available === true && p.rows[0].min_price_cents === 2990, "catalog_products ok");
  ok(!!(await err(db.query(`select set_order_status('${V}','pago')`))), "anon não executa set_order_status");
  ok(!!(await err(db.query(`select release_expired_reservations()`))), "anon não executa release");
});

console.log("Pedido pelo site");
const order = (key, qty, extra = {}) => as("anon", null, () => db.query(`select create_order($1::jsonb) as r`, [JSON.stringify({
  idempotency_key: key, customer_name: "Maria", customer_phone: "(11) 98888-7777",
  delivery_method: "entrega", address: "Rua das Flores, 10", neighborhood: "Centro", payment_method: "pix",
  items: [{ variant_id: V, quantity: qty }], ...extra })]));
const K1 = "c0000000-0000-0000-0000-000000000001";
const r1 = (await order(K1, 3)).rows[0].r;
ok(r1.code === "YR-00001" && r1.subtotal_cents === 8970 && r1.delivery_fee_cents === 500 && r1.total_cents === 9470, `pedido 1: ${r1.code} total ${r1.total_cents}`);
ok((await stock()).reserved === 3, "reservou 3");
const r1b = (await order(K1, 3)).rows[0].r;
ok(r1b.code === r1.code && (await stock()).reserved === 3, "mesmo clique 2x não duplica");
const e2 = await err(order("c0000000-0000-0000-0000-000000000002", 3));
ok(e2 && e2.includes("Estoque insuficiente"), "sem estoque: " + e2);
const e3 = await err(order("c0000000-0000-0000-0000-000000000003", 1, { delivery_method: "entrega", address: "" }));
ok(e3 && e3.includes("endereço"), "entrega exige endereço");
const r4 = (await order("c0000000-0000-0000-0000-000000000004", 2, { delivery_method: "retirada", address: "x" })).rows[0].r;
ok(r4.delivery_fee_cents === 0 && r4.address === null, "retirada sem frete");
ok((await stock()).reserved === 5, "reservado 5 (de 5)");
const e5 = await err(as("anon", null, () => db.query(`select create_order($1::jsonb)`, [JSON.stringify({ idempotency_key: "c0000000-0000-0000-0000-000000000005", customer_name: "Maria", customer_phone: "11988887777", delivery_method: "retirada", items: [{ variant_id: V, quantity: -1 }] })])));
ok(!!e5, "quantidade negativa recusada: " + e5);

console.log("Painel");
const id1 = (await db.query(`select id from orders where code='YR-00001'`)).rows[0].id;
const id2 = (await db.query(`select id from orders where code='${r4.code}'`)).rows[0].id;
await as("authenticated", STRANGER, async () => {
  ok((await db.query(`select * from orders`)).rows.length === 0, "usuário sem perfil não vê pedidos");
  ok(!!(await err(db.query(`select set_order_status('${id1}','pago')`))), "usuário sem perfil não muda status");
  ok((await db.query(`select * from product_variants`)).rows.length === 0, "usuário sem perfil não vê custo");
});
await as("authenticated", OWNER, async () => {
  ok((await db.query(`select * from orders`)).rows.length === 2, "dona vê pedidos");
  ok(!!(await err(db.query(`update product_variants set stock = 99 where id='${V}'`))), "estoque não muda por UPDATE direto");
  await db.query(`update product_variants set cost_cents = 1300 where id='${V}'`);
  ok(true, "dona altera custo");
  await db.query(`select set_order_status('${id1}','em_preparacao')`);
});
let s = await stock();
ok(s.stock === 2 && s.reserved === 2, `confirmado: baixou estoque (stock ${s.stock}, reserved ${s.reserved})`);
const o1 = (await db.query(`select paid_at, stock_committed from orders where id='${id1}'`)).rows[0];
ok(o1.paid_at === null && o1.stock_committed, "em preparação não conta como pago");
const cost = (await db.query(`select unit_cost_cents from order_items where order_id='${id1}'`)).rows[0].unit_cost_cents;
ok(cost === 1200, "custo histórico preservado no item (1200)");
await as("authenticated", OWNER, () => db.query(`select mark_order_paid('${id1}')`));
ok((await db.query(`select paid_at from orders where id='${id1}'`)).rows[0].paid_at !== null, "marcar pago");
await as("authenticated", OWNER, () => db.query(`select set_order_status('${id1}','cancelado','cliente desistiu')`));
s = await stock();
ok(s.stock === 5 && s.reserved === 2, `cancelado: devolveu (stock ${s.stock}, reserved ${s.reserved})`);
ok(!!(await err(as("authenticated", OWNER, () => db.query(`select set_order_status('${id1}','pago')`)))), "cancelado não reabre");

console.log("Reserva vencida");
await db.exec(`update orders set reserved_until = now() - interval '1 hour' where id='${id2}'`);
await as("authenticated", OWNER, () => db.query(`select release_expired_reservations()`));
s = await stock();
ok(s.reserved === 0, "reserva vencida liberada");
await db.exec(`update product_variants set stock = 1 where id='${V}'`);
const e6 = await err(as("authenticated", OWNER, () => db.query(`select set_order_status('${id2}','pago')`)));
ok(e6 && e6.includes("insuficiente"), "confirmar sem reserva confere estoque de novo");
await db.exec(`update product_variants set stock = 5 where id='${V}'`);
await as("authenticated", OWNER, () => db.query(`select set_order_status('${id2}','concluido')`));
s = await stock();
ok(s.stock === 3 && s.reserved === 0, `concluído sem reserva: stock ${s.stock}`);

console.log("Estoque manual");
await as("authenticated", OWNER, async () => {
  await db.query(`select adjust_stock('${V}','entrada',10,'Compra')`);
  await db.query(`select adjust_stock('${V}','saida',1,'Quebrou')`);
  await db.query(`select adjust_stock('${V}','ajuste',7,'Contagem')`);
});
s = await stock();
ok(s.stock === 7, "entrada/saída/ajuste = 7");
const mv = (await db.query(`select type, quantity, stock_after, user_id from stock_movements order by created_at, stock_after`)).rows;
ok(mv.every((m) => m.user_id === OWNER), "toda movimentação tem responsável");
ok(!!(await err(as("authenticated", OWNER, () => db.query(`select adjust_stock('${V}','saida',100)`)))), "saída maior que estoque recusada");
const d = (await as("authenticated", OWNER, () => db.query(`select dashboard_summary(now() - interval '1 day', now() + interval '1 day') as d`))).rows[0].d;
ok(d.revenue_cents === 5980 && d.paid_orders === 1 && d.cogs_cents === 2400, `dashboard: ${JSON.stringify(d)}`);

console.log("Concorrência: 2 pedidos disputando a última unidade");
await as("authenticated", OWNER, () => db.query(`select adjust_stock('${V}','ajuste',1)`));
const results = await Promise.allSettled([
  order("c0000000-0000-0000-0000-000000000010", 1, { customer_phone: "11911112222" }),
  order("c0000000-0000-0000-0000-000000000011", 1, { customer_phone: "11933334444" }),
]);
s = await stock();
ok(results.filter((x) => x.status === "fulfilled").length === 1 && s.reserved === 1, `só um levou (reserved ${s.reserved})`);

console.log("Excluir produto e tom");
await db.exec(`insert into products (id, name, slug, status) values ('aaaaaaaa-0000-0000-0000-000000000002','Sem Venda','sem-venda','active');
insert into product_variants (id, product_id, name, sku, price_cents) values
  ('bbbbbbbb-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000002','A','SV-A',1000),
  ('bbbbbbbb-0000-0000-0000-000000000003','aaaaaaaa-0000-0000-0000-000000000002','B','SV-B',1000);`);
await as("authenticated", OWNER, async () => {
  await db.query(`select adjust_stock('bbbbbbbb-0000-0000-0000-000000000002','entrada',5,'inicial')`);
  ok(!!(await err(as("authenticated", STRANGER, () => db.query(`select delete_product('aaaaaaaa-0000-0000-0000-000000000002')`)))), "sem perfil não exclui");
});
let r = (await as("authenticated", OWNER, () => db.query(`select delete_variant('bbbbbbbb-0000-0000-0000-000000000002') as r`))).rows[0].r;
ok(r === "excluido", "tom sem venda (com movimentação manual) é excluído");
ok(!!(await err(as("authenticated", OWNER, () => db.query(`select delete_variant('bbbbbbbb-0000-0000-0000-000000000003')`)))), "não exclui o único tom");
r = (await as("authenticated", OWNER, () => db.query(`select delete_product('aaaaaaaa-0000-0000-0000-000000000002') as r`))).rows[0].r;
ok(r === "excluido" && (await db.query(`select count(*)::int c from products where id='aaaaaaaa-0000-0000-0000-000000000002'`)).rows[0].c === 0, "produto sem venda é excluído");
const eRes = await err(as("authenticated", OWNER, () => db.query(`select delete_product('aaaaaaaa-0000-0000-0000-000000000001')`)));
ok(eRes && eRes.includes("reservado"), "produto reservado em pedido aberto não sai");
await db.exec(`update orders set status='cancelado', reservation_active=false; update product_variants set reserved = 0;`);
r = (await as("authenticated", OWNER, () => db.query(`select delete_product('aaaaaaaa-0000-0000-0000-000000000001') as r`))).rows[0].r;
const st = (await db.query(`select status from products where id='aaaaaaaa-0000-0000-0000-000000000001'`)).rows[0];
ok(r === "arquivado" && st.status === "archived", "produto com venda é arquivado (histórico preservado)");
ok((await db.query(`select count(*)::int c from order_items`)).rows[0].c > 0, "itens de pedidos antigos continuam");

console.log(`\n${pass} ok, ${fail} falhas`);
process.exit(fail ? 1 : 0);
