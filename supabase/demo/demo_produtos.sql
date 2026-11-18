-- =====================================================================
-- DADOS DE DEMONSTRAÇÃO — NÃO RODE EM PRODUÇÃO COM PRODUTOS REAIS.
-- Todos os SKUs começam com "DEMO-" para facilitar apagar depois:
--   select public.remove_demo_data();   (função criada no fim deste arquivo)
-- =====================================================================

do $$
declare
  c_batons uuid := (select id from public.categories where slug = 'batons');
  c_bases uuid := (select id from public.categories where slug = 'bases');
  c_corretivos uuid := (select id from public.categories where slug = 'corretivos');
  c_po uuid := (select id from public.categories where slug = 'po-compacto');
  c_mascaras uuid := (select id from public.categories where slug = 'mascaras-de-cilios');
  c_paletas uuid := (select id from public.categories where slug = 'paletas-de-sombras');
  c_skin uuid := (select id from public.categories where slug = 'skincare');
  c_acess uuid := (select id from public.categories where slug = 'acessorios');
  p uuid;
begin
  insert into public.products (name, slug, category_id, description, status, featured)
  values ('Batom Matte Veludo', 'demo-batom-matte-veludo', c_batons,
          'Batom matte de alta pigmentação com acabamento aveludado e longa duração. Não resseca os lábios.', 'active', true)
  returning id into p;
  insert into public.product_variants (product_id, name, sku, color_hex, price_cents, promo_price_cents, cost_cents, position) values
    (p, 'Rosa Granada', 'DEMO-BAT-01', '#C82A4C', 3490, 2990, 1100, 1),
    (p, 'Vinho', 'DEMO-BAT-02', '#5C0F21', 3490, null, 1100, 2),
    (p, 'Nude Rosado', 'DEMO-BAT-03', '#E4677F', 3490, null, 1100, 3),
    (p, 'Bordô', 'DEMO-BAT-04', '#921733', 3490, null, 1100, 4);

  insert into public.products (name, slug, category_id, description, status, featured)
  values ('Gloss Brilho Espelhado', 'demo-gloss-brilho-espelhado', c_batons,
          'Gloss com efeito espelhado, textura leve e não pegajosa.', 'active', false)
  returning id into p;
  insert into public.product_variants (product_id, name, sku, color_hex, price_cents, cost_cents, position) values
    (p, 'Transparente', 'DEMO-GLO-01', '#FCE3E8', 2490, 700, 1),
    (p, 'Rosé', 'DEMO-GLO-02', '#F2A9B7', 2490, 700, 2);

  insert into public.products (name, slug, category_id, description, status, featured)
  values ('Base Líquida Cobertura Alta', 'demo-base-liquida', c_bases,
          'Base de cobertura alta, acabamento natural e efeito matte por até 12h. 30 ml.', 'active', true)
  returning id into p;
  insert into public.product_variants (product_id, name, sku, color_hex, price_cents, cost_cents, position) values
    (p, '01 Clara', 'DEMO-BAS-01', '#F3D7C2', 5990, 2200, 1),
    (p, '02 Média', 'DEMO-BAS-02', '#E0B796', 5990, 2200, 2),
    (p, '03 Morena', 'DEMO-BAS-03', '#B9845E', 5990, 2200, 3),
    (p, '04 Escura', 'DEMO-BAS-04', '#7C5236', 5990, 2200, 4);

  insert into public.products (name, slug, category_id, description, status)
  values ('Corretivo Alta Cobertura', 'demo-corretivo', c_corretivos,
          'Corretivo cremoso para olheiras e imperfeições.', 'active')
  returning id into p;
  insert into public.product_variants (product_id, name, sku, color_hex, price_cents, cost_cents, position) values
    (p, 'Claro', 'DEMO-COR-01', '#F1D2BC', 2990, 900, 1),
    (p, 'Médio', 'DEMO-COR-02', '#D6A984', 2990, 900, 2);

  insert into public.products (name, slug, category_id, description, status)
  values ('Pó Compacto Translúcido', 'demo-po-compacto', c_po,
          'Pó compacto que sela a maquiagem e controla a oleosidade.', 'active')
  returning id into p;
  insert into public.product_variants (product_id, name, sku, price_cents, promo_price_cents, cost_cents) values
    (p, 'Único', 'DEMO-PO-01', 3990, 3490, 1300);

  insert into public.products (name, slug, category_id, description, status, featured)
  values ('Máscara de Cílios Volume Extremo', 'demo-mascara-volume', c_mascaras,
          'Volume e alongamento sem grumos. À prova d''água.', 'active', true)
  returning id into p;
  insert into public.product_variants (product_id, name, sku, price_cents, cost_cents) values
    (p, 'Preta', 'DEMO-MAS-01', 3290, 1000);

  insert into public.products (name, slug, category_id, description, status, featured)
  values ('Paleta de Sombras Granada', 'demo-paleta-granada', c_paletas,
          '12 cores entre foscas e cintilantes, dos nudes ao vinho.', 'active', true)
  returning id into p;
  insert into public.product_variants (product_id, name, sku, price_cents, promo_price_cents, cost_cents) values
    (p, 'Única', 'DEMO-PAL-01', 7990, 6490, 2900);

  insert into public.products (name, slug, category_id, description, status)
  values ('Hidratante Facial com Ácido Hialurônico', 'demo-hidratante-facial', c_skin,
          'Hidratação leve para todos os tipos de pele. 50 g.', 'active')
  returning id into p;
  insert into public.product_variants (product_id, name, sku, price_cents, cost_cents) values
    (p, 'Único', 'DEMO-SKN-01', 4590, 1600);

  insert into public.products (name, slug, category_id, description, status)
  values ('Kit Pincéis Essenciais', 'demo-kit-pinceis', c_acess,
          'Kit com 7 pincéis de cerdas macias e estojo.', 'active')
  returning id into p;
  insert into public.product_variants (product_id, name, sku, price_cents, cost_cents) values
    (p, 'Rosa', 'DEMO-PIN-01', 6990, 2500);
end $$;

-- Estoque inicial (direto, sem movimentação, só porque é demonstração)
update public.product_variants set stock = case sku
  when 'DEMO-BAT-01' then 12 when 'DEMO-BAT-02' then 3 when 'DEMO-BAT-03' then 0 when 'DEMO-BAT-04' then 8
  when 'DEMO-GLO-01' then 10 when 'DEMO-GLO-02' then 2
  when 'DEMO-BAS-01' then 6 when 'DEMO-BAS-02' then 6 when 'DEMO-BAS-03' then 4 when 'DEMO-BAS-04' then 1
  when 'DEMO-COR-01' then 9 when 'DEMO-COR-02' then 7
  when 'DEMO-PO-01' then 15 when 'DEMO-MAS-01' then 20 when 'DEMO-PAL-01' then 5
  when 'DEMO-SKN-01' then 8 when 'DEMO-PIN-01' then 0 else stock end,
  min_stock = 3
where sku like 'DEMO-%';

-- Remove tudo que é demonstração (pedidos de teste com itens DEMO também).
create or replace function public.remove_demo_data() returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.orders o
   where exists (select 1 from public.order_items i where i.order_id = o.id and i.sku like 'DEMO-%');
  delete from public.stock_movements m using public.product_variants v
   where m.variant_id = v.id and v.sku like 'DEMO-%';
  delete from public.products where slug like 'demo-%';
end $$;
revoke execute on function public.remove_demo_data() from public, anon, authenticated;
