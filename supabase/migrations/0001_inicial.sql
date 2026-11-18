-- =====================================================================
-- YR Make e Variedades — Fase 1
-- Loja + pedidos pelo WhatsApp + painel (produtos com tons, estoque, pedidos)
-- Valores em CENTAVOS (integer). Nunca ponto flutuante.
-- =====================================================================


-- ---------- Tipos ----------
create type public.staff_role as enum ('owner', 'manager', 'staff');
create type public.product_status as enum ('draft', 'active', 'archived');
create type public.order_status as enum (
  'pendente', 'aguardando_pagamento', 'pago', 'em_preparacao',
  'saiu_para_entrega', 'pronto_para_retirada', 'concluido', 'cancelado'
);
create type public.delivery_method as enum ('entrega', 'retirada');
create type public.order_channel as enum ('site', 'whatsapp', 'manual');
create type public.payment_method as enum ('pix', 'dinheiro', 'cartao', 'outro');
create type public.stock_movement_type as enum ('entrada', 'saida', 'ajuste', 'venda', 'devolucao');

-- ---------- updated_at ----------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------- Equipe ----------
-- Não existe cadastro público: perfis só são criados pelo script da proprietária
-- (scripts/create-owner.mjs) ou, na fase 2, pela proprietária no painel.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role public.staff_role not null default 'staff',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and active);
$$;

create or replace function public.is_manager() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and active and role in ('owner', 'manager')
  );
$$;

create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and active and role = 'owner'
  );
$$;

-- ---------- Catálogo ----------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 60),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  position integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  category_id uuid references public.categories (id) on delete set null,
  description text not null default '' check (length(description) <= 5000),
  status public.product_status not null default 'draft',
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_category_idx on public.products (category_id);
create index products_status_idx on public.products (status);
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

-- Cada produto tem 1 ou mais variações (tons/cores). Estoque e preço ficam na variação.
create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  name text not null default 'Único' check (length(trim(name)) between 1 and 60),
  sku text not null unique check (length(trim(sku)) between 2 and 40),
  color_hex text check (color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  price_cents integer not null check (price_cents > 0),
  promo_price_cents integer check (promo_price_cents is null or (promo_price_cents > 0 and promo_price_cents < price_cents)),
  cost_cents integer not null default 0 check (cost_cents >= 0),
  stock integer not null default 0 check (stock >= 0),
  reserved integer not null default 0 check (reserved >= 0),
  min_stock integer not null default 0 check (min_stock >= 0),
  active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reserved_le_stock check (reserved <= stock)
);
create index variants_product_idx on public.product_variants (product_id);
create trigger variants_touch before update on public.product_variants
  for each row execute function public.touch_updated_at();

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  path text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index product_images_product_idx on public.product_images (product_id, position);

-- ---------- Clientes e pedidos ----------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique check (phone ~ '^[0-9]{10,13}$'),
  address text,
  neighborhood text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger customers_touch before update on public.customers
  for each row execute function public.touch_updated_at();

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity unique,
  code text unique,
  customer_id uuid references public.customers (id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  status public.order_status not null default 'pendente',
  channel public.order_channel not null default 'site',
  delivery_method public.delivery_method not null,
  address text,
  neighborhood text,
  address_ref text,
  payment_method public.payment_method not null default 'pix',
  subtotal_cents integer not null check (subtotal_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  delivery_fee_cents integer not null default 0 check (delivery_fee_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  notes text check (length(notes) <= 500),
  internal_notes text check (length(internal_notes) <= 2000),
  idempotency_key uuid not null unique,
  reservation_active boolean not null default true,
  reserved_until timestamptz,
  stock_committed boolean not null default false,
  paid_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint total_ok check (total_cents = subtotal_cents - discount_cents + delivery_fee_cents),
  constraint address_ok check (delivery_method = 'retirada' or (address is not null and length(trim(address)) >= 5))
);
create index orders_status_idx on public.orders (status, created_at desc);
create index orders_created_idx on public.orders (created_at desc);
create index orders_phone_idx on public.orders (customer_phone, created_at desc);
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

-- Itens guardam nome, preço e CUSTO do momento da venda (histórico não muda depois).
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete restrict,
  product_name text not null,
  variant_name text not null,
  sku text not null,
  unit_price_cents integer not null check (unit_price_cents >= 0),
  unit_cost_cents integer not null check (unit_cost_cents >= 0),
  quantity integer not null check (quantity between 1 and 99),
  total_cents integer not null,
  constraint item_total_ok check (total_cents = unit_price_cents * quantity)
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_variant_idx on public.order_items (variant_id);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  from_status public.order_status,
  to_status public.order_status not null,
  note text,
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index order_history_order_idx on public.order_status_history (order_id, created_at);

-- ---------- Movimentação de estoque ----------
create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants (id) on delete restrict,
  type public.stock_movement_type not null,
  quantity integer not null check (quantity <> 0), -- com sinal: + entra, - sai
  stock_after integer not null,
  reason text,
  order_id uuid references public.orders (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index stock_movements_variant_idx on public.stock_movements (variant_id, created_at desc);
create index stock_movements_created_idx on public.stock_movements (created_at desc);

-- ---------- Configurações (uma linha só) ----------
create table public.store_settings (
  id integer primary key default 1 check (id = 1),
  store_name text not null default 'YR Make e Variedades',
  whatsapp text not null default '' check (whatsapp = '' or whatsapp ~ '^[0-9]{12,13}$'),
  instagram text not null default '',
  city text not null default '',
  address text not null default '',
  pickup_address text not null default '',
  pickup_hours text not null default '',
  about text not null default '',
  delivery_fee_cents integer not null default 0 check (delivery_fee_cents >= 0),
  free_delivery_min_cents integer check (free_delivery_min_cents is null or free_delivery_min_cents > 0),
  min_order_cents integer not null default 0 check (min_order_cents >= 0),
  reservation_hours integer not null default 24 check (reservation_hours between 1 and 168),
  accepting_orders boolean not null default true,
  updated_at timestamptz not null default now()
);
create trigger settings_touch before update on public.store_settings
  for each row execute function public.touch_updated_at();
insert into public.store_settings (id) values (1);

-- =====================================================================
-- Vitrine pública (views). Clientes NUNCA leem as tabelas: só estas views,
-- que não têm custo, margem, estoque reservado nem dados de clientes.
-- =====================================================================
create view public.catalog_categories as
  select id, name, slug, position
  from public.categories
  where active;

create view public.catalog_variants as
  select v.id, v.product_id, v.name, v.sku, v.color_hex,
         v.price_cents, v.promo_price_cents,
         coalesce(v.promo_price_cents, v.price_cents) as final_price_cents,
         least(greatest(v.stock - v.reserved, 0), 99) as available,
         v.position
  from public.product_variants v
  join public.products p on p.id = v.product_id
  where v.active and p.status = 'active';

create view public.catalog_images as
  select i.id, i.product_id, i.path, i.position
  from public.product_images i
  join public.products p on p.id = i.product_id
  where p.status = 'active';

create view public.catalog_products as
  select p.id, p.name, p.slug, p.description, p.featured, p.created_at,
         c.id as category_id, c.name as category_name, c.slug as category_slug,
         agg.min_price_cents, agg.min_regular_cents, agg.on_sale, agg.available,
         agg.variant_count,
         (select i.path from public.product_images i
            where i.product_id = p.id order by i.position, i.created_at limit 1) as cover_path
  from public.products p
  left join public.categories c on c.id = p.category_id and c.active
  join lateral (
    select min(coalesce(v.promo_price_cents, v.price_cents)) as min_price_cents,
           min(v.price_cents) as min_regular_cents,
           bool_or(v.promo_price_cents is not null) as on_sale,
           sum(greatest(v.stock - v.reserved, 0)) > 0 as available,
           count(*) as variant_count
    from public.product_variants v
    where v.product_id = p.id and v.active
  ) agg on agg.variant_count > 0
  where p.status = 'active';

create view public.public_settings as
  select store_name, whatsapp, instagram, city, address, pickup_address, pickup_hours,
         about, delivery_fee_cents, free_delivery_min_cents, min_order_cents, accepting_orders
  from public.store_settings
  where id = 1;

-- =====================================================================
-- Permissões e RLS
-- =====================================================================
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

grant select on public.catalog_categories, public.catalog_variants, public.catalog_images,
  public.catalog_products, public.public_settings to anon, authenticated;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.stock_movements enable row level security;
alter table public.store_settings enable row level security;

-- Equipe (painel). Somente usuários com perfil ativo.
grant select on public.profiles to authenticated;
create policy profiles_self on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_owner());

grant select, insert, update, delete on public.categories to authenticated;
create policy categories_read on public.categories for select to authenticated using (public.is_staff());
create policy categories_write on public.categories for all to authenticated
  using (public.is_manager()) with check (public.is_manager());

grant select, insert, update, delete on public.products to authenticated;
create policy products_read on public.products for select to authenticated using (public.is_staff());
create policy products_write on public.products for all to authenticated
  using (public.is_manager()) with check (public.is_manager());

-- Estoque (stock/reserved) NÃO pode ser alterado direto: só pelas funções abaixo,
-- que registram a movimentação e o responsável.
grant select, delete on public.product_variants to authenticated;
grant insert (product_id, name, sku, color_hex, price_cents, promo_price_cents, cost_cents,
              min_stock, active, position) on public.product_variants to authenticated;
grant update (name, sku, color_hex, price_cents, promo_price_cents, cost_cents,
              min_stock, active, position) on public.product_variants to authenticated;
create policy variants_read on public.product_variants for select to authenticated using (public.is_staff());
create policy variants_write on public.product_variants for all to authenticated
  using (public.is_manager()) with check (public.is_manager());

grant select, insert, update, delete on public.product_images to authenticated;
create policy images_read on public.product_images for select to authenticated using (public.is_staff());
create policy images_write on public.product_images for all to authenticated
  using (public.is_manager()) with check (public.is_manager());

grant select, update on public.customers to authenticated;
create policy customers_read on public.customers for select to authenticated using (public.is_staff());
create policy customers_update on public.customers for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Pedidos: leitura pela equipe; criação e mudança de status só pelas funções.
grant select on public.orders, public.order_items, public.order_status_history, public.stock_movements to authenticated;
grant update (internal_notes) on public.orders to authenticated;
create policy orders_read on public.orders for select to authenticated using (public.is_staff());
create policy orders_notes on public.orders for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy order_items_read on public.order_items for select to authenticated using (public.is_staff());
create policy order_history_read on public.order_status_history for select to authenticated using (public.is_staff());
create policy stock_movements_read on public.stock_movements for select to authenticated using (public.is_staff());

grant select, update on public.store_settings to authenticated;
create policy settings_read on public.store_settings for select to authenticated using (public.is_staff());
create policy settings_write on public.store_settings for update to authenticated
  using (public.is_manager()) with check (public.is_manager());

-- =====================================================================
-- Funções de negócio (transações com trava de linha → sem estoque negativo)
-- =====================================================================

-- Libera reservas vencidas de pedidos ainda não confirmados.
-- O pedido continua aberto; ao confirmar depois, o estoque é conferido de novo.
create or replace function public.release_expired_reservations() returns integer
language plpgsql security definer set search_path = public as $$
declare
  o record;
  n integer := 0;
begin
  for o in
    select id from public.orders
    where reservation_active and not stock_committed and reserved_until < now()
    order by id
    for update skip locked
  loop
    update public.product_variants v
       set reserved = greatest(v.reserved - i.qty, 0)
      from (select variant_id, sum(quantity) as qty from public.order_items
             where order_id = o.id group by variant_id) i
     where v.id = i.variant_id;
    update public.orders set reservation_active = false where id = o.id;
    n := n + 1;
  end loop;
  return n;
end $$;

-- Cria o pedido da loja. Preços, frete e estoque são calculados AQUI, no banco;
-- nada que vem do navegador além de "qual variação" e "quantas".
create or replace function public.create_order(payload jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s public.store_settings;
  v_key uuid;
  v_existing public.orders;
  v_name text := trim(coalesce(payload->>'customer_name', ''));
  v_phone text := regexp_replace(coalesce(payload->>'customer_phone', ''), '[^0-9]', '', 'g');
  v_method public.delivery_method;
  v_payment public.payment_method;
  v_address text := nullif(trim(coalesce(payload->>'address', '')), '');
  v_neighborhood text := nullif(trim(coalesce(payload->>'neighborhood', '')), '');
  v_ref text := nullif(trim(coalesce(payload->>'address_ref', '')), '');
  v_notes text := nullif(left(trim(coalesce(payload->>'notes', '')), 500), '');
  v_items jsonb := coalesce(payload->'items', '[]'::jsonb);
  v_item record;
  v_var record;
  v_subtotal integer := 0;
  v_fee integer := 0;
  v_order public.orders;
  v_customer_id uuid;
  v_lines jsonb := '[]'::jsonb;
  v_pending integer;
begin
  -- Idempotência: mesmo clique enviado 2x devolve o mesmo pedido.
  begin
    v_key := (payload->>'idempotency_key')::uuid;
  exception when others then
    raise exception 'Requisição inválida.';
  end;
  if v_key is null then raise exception 'Requisição inválida.'; end if;

  select * into v_existing from public.orders where idempotency_key = v_key;
  if found then
    return public.order_summary(v_existing.id);
  end if;

  select * into s from public.store_settings where id = 1;
  if not s.accepting_orders then
    raise exception 'A loja não está recebendo pedidos pelo site no momento. Fale com a gente pelo WhatsApp.';
  end if;

  if length(v_name) < 2 or length(v_name) > 80 then raise exception 'Informe seu nome.'; end if;
  if length(v_phone) = 10 or length(v_phone) = 11 then v_phone := '55' || v_phone; end if;
  if length(v_phone) not between 12 and 13 then raise exception 'Informe um WhatsApp válido com DDD.'; end if;

  begin
    v_method := (payload->>'delivery_method')::public.delivery_method;
    v_payment := coalesce(payload->>'payment_method', 'pix')::public.payment_method;
  exception when others then
    raise exception 'Escolha entrega ou retirada e a forma de pagamento.';
  end;
  if v_method is null then raise exception 'Escolha entrega ou retirada.'; end if;
  if v_method = 'entrega' and (v_address is null or length(v_address) < 5 or v_neighborhood is null) then
    raise exception 'Informe endereço e bairro para entrega.';
  end if;
  if v_method = 'retirada' then v_address := null; v_neighborhood := null; v_ref := null; end if;

  if jsonb_typeof(v_items) <> 'array' or jsonb_array_length(v_items) = 0 then
    raise exception 'Seu carrinho está vazio.';
  end if;
  if jsonb_array_length(v_items) > 30 then raise exception 'Pedido com itens demais.'; end if;

  -- Proteção simples contra abuso: no máx. 3 pedidos em aberto por telefone em 24h.
  select count(*) into v_pending from public.orders
   where customer_phone = v_phone and status in ('pendente', 'aguardando_pagamento')
     and created_at > now() - interval '24 hours';
  if v_pending >= 3 then
    raise exception 'Você já tem pedidos em aberto. Fale com a gente pelo WhatsApp para finalizar.';
  end if;

  perform public.release_expired_reservations();

  -- Upsert do cliente
  insert into public.customers (name, phone, address, neighborhood)
  values (v_name, v_phone, v_address, v_neighborhood)
  on conflict (phone) do update
    set name = excluded.name,
        address = coalesce(excluded.address, public.customers.address),
        neighborhood = coalesce(excluded.neighborhood, public.customers.neighborhood)
  returning id into v_customer_id;

  insert into public.orders (customer_id, customer_name, customer_phone, delivery_method, address,
                             neighborhood, address_ref, payment_method, subtotal_cents, total_cents,
                             notes, idempotency_key, reserved_until, channel)
  values (v_customer_id, v_name, v_phone, v_method, v_address, v_neighborhood, v_ref, v_payment, 0, 0,
          v_notes, v_key, now() + make_interval(hours => s.reservation_hours), 'site')
  returning * into v_order;

  -- Itens: agrupa por variação e trava em ordem fixa (evita deadlock entre pedidos simultâneos).
  for v_item in
    select (e->>'variant_id')::uuid as variant_id, sum((e->>'quantity')::integer) as qty
      from jsonb_array_elements(v_items) e
     group by 1
     order by 1
  loop
    if v_item.qty is null or v_item.qty < 1 or v_item.qty > 20 then
      raise exception 'Quantidade inválida.';
    end if;

    select v.*, p.name as product_name
      into v_var
      from public.product_variants v
      join public.products p on p.id = v.product_id
     where v.id = v_item.variant_id and v.active and p.status = 'active'
       for update of v;
    if not found then
      raise exception 'Um dos produtos do carrinho não está mais disponível.';
    end if;
    if v_var.stock - v_var.reserved < v_item.qty then
      raise exception 'Estoque insuficiente: % (%). Disponível: %.',
        v_var.product_name, v_var.name, greatest(v_var.stock - v_var.reserved, 0);
    end if;

    update public.product_variants set reserved = reserved + v_item.qty where id = v_var.id;

    insert into public.order_items (order_id, variant_id, product_name, variant_name, sku,
                                    unit_price_cents, unit_cost_cents, quantity, total_cents)
    values (v_order.id, v_var.id, v_var.product_name, v_var.name, v_var.sku,
            coalesce(v_var.promo_price_cents, v_var.price_cents), v_var.cost_cents, v_item.qty,
            coalesce(v_var.promo_price_cents, v_var.price_cents) * v_item.qty);

    v_subtotal := v_subtotal + coalesce(v_var.promo_price_cents, v_var.price_cents) * v_item.qty;
  end loop;

  if v_subtotal < s.min_order_cents then
    raise exception 'O pedido mínimo é de R$ %.', to_char(s.min_order_cents / 100.0, 'FM999G990D00');
  end if;

  if v_method = 'entrega' then
    v_fee := case when s.free_delivery_min_cents is not null and v_subtotal >= s.free_delivery_min_cents
                  then 0 else s.delivery_fee_cents end;
  end if;

  update public.orders
     set subtotal_cents = v_subtotal,
         delivery_fee_cents = v_fee,
         total_cents = v_subtotal + v_fee,
         code = 'YR-' || lpad(number::text, 5, '0')
   where id = v_order.id;

  insert into public.order_status_history (order_id, from_status, to_status, note)
  values (v_order.id, null, 'pendente', 'Pedido feito pelo site');

  return public.order_summary(v_order.id);
end $$;

-- Resumo devolvido ao navegador logo após criar o pedido (sem custo).
create or replace function public.order_summary(p_order_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'code', o.code,
    'customer_name', o.customer_name,
    'delivery_method', o.delivery_method,
    'address', o.address,
    'neighborhood', o.neighborhood,
    'address_ref', o.address_ref,
    'payment_method', o.payment_method,
    'notes', o.notes,
    'subtotal_cents', o.subtotal_cents,
    'delivery_fee_cents', o.delivery_fee_cents,
    'total_cents', o.total_cents,
    'items', (select coalesce(jsonb_agg(jsonb_build_object(
                'product_name', i.product_name, 'variant_name', i.variant_name,
                'quantity', i.quantity, 'unit_price_cents', i.unit_price_cents,
                'total_cents', i.total_cents) order by i.product_name, i.variant_name), '[]'::jsonb)
              from public.order_items i where i.order_id = o.id)
  )
  from public.orders o where o.id = p_order_id;
$$;

-- Muda o status do pedido (equipe). Baixa o estoque quando o pedido é confirmado
-- e devolve quando é cancelado.
create or replace function public.set_order_status(p_order_id uuid, p_status public.order_status, p_note text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
  it record;
  v public.product_variants;
  commit_states public.order_status[] := array['pago', 'em_preparacao', 'saiu_para_entrega',
                                                'pronto_para_retirada', 'concluido']::public.order_status[];
begin
  if not public.is_staff() then raise exception 'Sem permissão.'; end if;

  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'Pedido não encontrado.'; end if;
  if o.status = p_status then return; end if;
  if o.status in ('concluido', 'cancelado') then
    raise exception 'Pedido % já está %. Não pode mudar.', o.code, o.status;
  end if;

  if p_status = any (commit_states) and not o.stock_committed then
    for it in
      select variant_id, sum(quantity) as qty from public.order_items
       where order_id = o.id and variant_id is not null group by variant_id order by variant_id
    loop
      select * into v from public.product_variants where id = it.variant_id for update;
      if o.reservation_active then
        update public.product_variants
           set stock = stock - it.qty, reserved = greatest(reserved - it.qty, 0)
         where id = v.id returning * into v;
      else
        if v.stock - v.reserved < it.qty then
          raise exception 'Estoque insuficiente para confirmar (SKU %). Disponível: %.',
            v.sku, greatest(v.stock - v.reserved, 0);
        end if;
        update public.product_variants set stock = stock - it.qty where id = v.id returning * into v;
      end if;
      insert into public.stock_movements (variant_id, type, quantity, stock_after, reason, order_id, user_id)
      values (v.id, 'venda', -it.qty, v.stock, 'Pedido ' || o.code, o.id, auth.uid());
    end loop;
    o.stock_committed := true;
    o.reservation_active := false;
  end if;

  if p_status = 'cancelado' then
    if o.stock_committed then
      for it in
        select variant_id, sum(quantity) as qty from public.order_items
         where order_id = o.id and variant_id is not null group by variant_id order by variant_id
      loop
        update public.product_variants set stock = stock + it.qty where id = it.variant_id returning * into v;
        insert into public.stock_movements (variant_id, type, quantity, stock_after, reason, order_id, user_id)
        values (v.id, 'devolucao', it.qty, v.stock, 'Cancelamento ' || o.code, o.id, auth.uid());
      end loop;
      o.stock_committed := false;
    elsif o.reservation_active then
      update public.product_variants pv
         set reserved = greatest(pv.reserved - i.qty, 0)
        from (select variant_id, sum(quantity) as qty from public.order_items
               where order_id = o.id group by variant_id) i
       where pv.id = i.variant_id;
    end if;
    o.reservation_active := false;
  end if;

  update public.orders
     set status = p_status,
         stock_committed = o.stock_committed,
         reservation_active = o.reservation_active,
         -- Faturamento só conta com pagamento confirmado.
         paid_at = case when p_status in ('pago', 'concluido') then coalesce(paid_at, now())
                        when p_status = 'cancelado' then null else paid_at end,
         cancelled_at = case when p_status = 'cancelado' then now() else cancelled_at end
   where id = o.id;

  insert into public.order_status_history (order_id, from_status, to_status, note, user_id)
  values (o.id, o.status, p_status, nullif(trim(coalesce(p_note, '')), ''), auth.uid());
end $$;

-- Marca pagamento recebido sem mudar a etapa (ex.: pago na entrega).
create or replace function public.mark_order_paid(p_order_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  if not public.is_staff() then raise exception 'Sem permissão.'; end if;
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'Pedido não encontrado.'; end if;
  if o.status = 'cancelado' then raise exception 'Pedido cancelado.'; end if;
  if o.paid_at is not null then return; end if;
  if o.status in ('pendente', 'aguardando_pagamento') then
    perform public.set_order_status(p_order_id, 'pago', 'Pagamento confirmado');
  else
    update public.orders set paid_at = now() where id = p_order_id;
    insert into public.order_status_history (order_id, from_status, to_status, note, user_id)
    values (o.id, o.status, o.status, 'Pagamento confirmado', auth.uid());
  end if;
end $$;

-- Entrada, saída ou ajuste (contagem) de estoque, com responsável.
create or replace function public.adjust_stock(p_variant_id uuid, p_type public.stock_movement_type,
                                               p_quantity integer, p_reason text default null)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v public.product_variants;
  delta integer;
begin
  if not public.is_staff() then raise exception 'Sem permissão.'; end if;
  if p_type not in ('entrada', 'saida', 'ajuste') then raise exception 'Tipo inválido.'; end if;
  if p_quantity is null or p_quantity < 0 or p_quantity > 100000 then raise exception 'Quantidade inválida.'; end if;

  select * into v from public.product_variants where id = p_variant_id for update;
  if not found then raise exception 'Variação não encontrada.'; end if;

  delta := case p_type when 'entrada' then p_quantity
                       when 'saida' then -p_quantity
                       else p_quantity - v.stock end;
  if delta = 0 then return v.stock; end if;
  if v.stock + delta < v.reserved then
    raise exception 'Não dá: ficaria abaixo do que está reservado em pedidos (%).', v.reserved;
  end if;

  update public.product_variants set stock = stock + delta where id = v.id returning * into v;
  insert into public.stock_movements (variant_id, type, quantity, stock_after, reason, user_id)
  values (v.id, p_type, delta, v.stock, nullif(trim(coalesce(p_reason, '')), ''), auth.uid());
  return v.stock;
end $$;

-- Painel: números do resumo.
create or replace function public.dashboard_summary(p_from timestamptz, p_to timestamptz) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  if not public.is_staff() then raise exception 'Sem permissão.'; end if;
  select jsonb_build_object(
    'revenue_cents', coalesce((select sum(total_cents - delivery_fee_cents) from orders
                               where paid_at >= p_from and paid_at < p_to and status <> 'cancelado'), 0),
    'paid_orders', (select count(*) from orders where paid_at >= p_from and paid_at < p_to and status <> 'cancelado'),
    'cogs_cents', coalesce((select sum(i.unit_cost_cents * i.quantity) from order_items i join orders o on o.id = i.order_id
                            where o.paid_at >= p_from and o.paid_at < p_to and o.status <> 'cancelado'), 0),
    'open_orders', (select count(*) from orders where status in ('pendente', 'aguardando_pagamento')),
    'in_progress', (select count(*) from orders where status in ('pago', 'em_preparacao', 'saiu_para_entrega', 'pronto_para_retirada')),
    'active_products', (select count(*) from products where status = 'active'),
    'low_stock', (select count(*) from product_variants v join products p on p.id = v.product_id
                  where v.active and p.status <> 'archived' and v.stock - v.reserved <= v.min_stock and v.stock - v.reserved > 0),
    'out_of_stock', (select count(*) from product_variants v join products p on p.id = v.product_id
                     where v.active and p.status <> 'archived' and v.stock - v.reserved <= 0),
    'stock_value_cents', case when public.is_manager()
                              then (select coalesce(sum(stock::bigint * cost_cents), 0) from product_variants where active)
                              else null end
  ) into r;
  return r;
end $$;

-- Funções: ninguém executa nada por padrão; liberamos só o necessário.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.create_order(jsonb) to anon, authenticated;
grant execute on function public.is_staff(), public.is_manager(), public.is_owner() to authenticated;
grant execute on function public.set_order_status(uuid, public.order_status, text),
                          public.mark_order_paid(uuid),
                          public.adjust_stock(uuid, public.stock_movement_type, integer, text),
                          public.release_expired_reservations(),
                          public.dashboard_summary(timestamptz, timestamptz) to authenticated;

-- =====================================================================
-- Storage: fotos dos produtos (leitura pública, escrita só gerência)
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "product images write" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_manager());
create policy "product images update" on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.is_manager());
create policy "product images delete" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_manager());

-- =====================================================================
-- Categorias iniciais (dados reais da loja, não demonstração)
-- =====================================================================
insert into public.categories (name, slug, position) values
  ('Maquiagem', 'maquiagem', 1),
  ('Batons', 'batons', 2),
  ('Bases', 'bases', 3),
  ('Corretivos', 'corretivos', 4),
  ('Pó compacto', 'po-compacto', 5),
  ('Máscaras de cílios', 'mascaras-de-cilios', 6),
  ('Paletas de sombras', 'paletas-de-sombras', 7),
  ('Skincare', 'skincare', 8),
  ('Acessórios', 'acessorios', 9);
