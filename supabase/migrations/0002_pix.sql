-- =====================================================================
-- PIX estático (QR Code com valor do pedido). Confirmação manual no painel.
-- Chave, nome e cidade são públicos por natureza (aparecem no QR Code).
-- =====================================================================
alter table public.store_settings
  add column pix_key_type text not null default ''
    check (pix_key_type in ('', 'cpf', 'cnpj', 'email', 'telefone', 'aleatoria')),
  add column pix_key text not null default '' check (length(pix_key) <= 77),
  add column pix_receiver_name text not null default '' check (length(pix_receiver_name) <= 60),
  add column pix_city text not null default 'Manaus' check (length(pix_city) <= 30);

create or replace view public.public_settings as
  select store_name, whatsapp, instagram, city, address, pickup_address, pickup_hours,
         about, delivery_fee_cents, free_delivery_min_cents, min_order_cents, accepting_orders,
         pix_key_type, pix_key, pix_receiver_name, pix_city
  from public.store_settings
  where id = 1;

grant select on public.public_settings to anon, authenticated;
