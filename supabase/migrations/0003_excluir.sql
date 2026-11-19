-- =====================================================================
-- Excluir produto / tom pelo painel.
-- Sem vendas: apaga de verdade (junto com as movimentações manuais de estoque).
-- Com vendas: arquiva (some da loja e do painel), para não quebrar pedidos e lucro antigos.
-- =====================================================================

create or replace function public.delete_variant(p_variant_id uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  v public.product_variants;
  siblings integer;
begin
  if not public.is_manager() then raise exception 'Sem permissão.'; end if;
  select * into v from public.product_variants where id = p_variant_id for update;
  if not found then raise exception 'Tom não encontrado.'; end if;
  if v.reserved > 0 then
    raise exception 'Esse tom está reservado em pedido aberto. Conclua ou cancele o pedido antes.';
  end if;

  if exists (select 1 from public.order_items where variant_id = v.id) then
    update public.product_variants set active = false where id = v.id;
    return 'arquivado';
  end if;

  select count(*) into siblings from public.product_variants where product_id = v.product_id and id <> v.id;
  if siblings = 0 then
    raise exception 'Esse é o único tom do produto. Para tirar tudo, exclua o produto.';
  end if;

  delete from public.stock_movements where variant_id = v.id;
  delete from public.product_variants where id = v.id;
  return 'excluido';
end $$;

create or replace function public.delete_product(p_product_id uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  p public.products;
begin
  if not public.is_manager() then raise exception 'Sem permissão.'; end if;
  select * into p from public.products where id = p_product_id for update;
  if not found then raise exception 'Produto não encontrado.'; end if;
  if exists (select 1 from public.product_variants where product_id = p.id and reserved > 0) then
    raise exception 'Esse produto está reservado em pedido aberto. Conclua ou cancele o pedido antes.';
  end if;

  if exists (select 1 from public.order_items i join public.product_variants v on v.id = i.variant_id
             where v.product_id = p.id) then
    update public.products set status = 'archived', featured = false where id = p.id;
    update public.product_variants set active = false where product_id = p.id;
    return 'arquivado';
  end if;

  delete from public.stock_movements m using public.product_variants v
   where m.variant_id = v.id and v.product_id = p.id;
  delete from public.products where id = p.id; -- tons e fotos saem junto (cascade)
  return 'excluido';
end $$;

revoke execute on function public.delete_variant(uuid), public.delete_product(uuid) from public, anon;
grant execute on function public.delete_variant(uuid), public.delete_product(uuid) to authenticated;
