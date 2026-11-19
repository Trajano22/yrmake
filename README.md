# YR Make e Variedades — loja online (Fase 1)

**No ar:** https://yrmake.yrmake.workers.dev

Loja de maquiagem com pedido pelo WhatsApp e painel para produtos, tons, estoque e pedidos.

- **Site:** Next.js 15 + Tailwind 4, hospedado no **Cloudflare Workers** (via OpenNext)
- **Banco, login e fotos:** Supabase (PostgreSQL + Auth + Storage)
- **Entrega:** só na cidade (entrega ou retirada)

## O que já funciona

**Loja (pública)**
- Página inicial, catálogo com busca, filtro por categoria e promoções
- Produto com **tons/variações** (cada tom com preço, promoção e estoque próprios)
- Carrinho, que confere preço e estoque atualizados no banco
- Finalização: entrega ou retirada, forma de pagamento → **o pedido é gravado no banco** → abre o WhatsApp com a mensagem pronta (código, itens, total, endereço)
- Página de contato/entrega e página de privacidade (LGPD)

**Painel (`/admin`)**
- Login (sem cadastro público)
- Resumo: vendas recebidas, pedidos pagos, ticket médio, lucro bruto e margem, pedidos em aberto, estoque baixo, esgotados, valor em estoque
- Pedidos: filtros por situação, busca e data. Etapas: Pendente → Aguardando pagamento → Pago → Em preparação → Saiu para entrega / Pronto para retirada → Concluído (ou Cancelado). Histórico de cada mudança, botão para falar com a cliente, anotações internas
- Produtos: cadastro, tons com cálculo automático de lucro e margem, fotos (envio, capa, exclusão)
- Estoque: entrada, saída e contagem, com responsável e motivo; histórico; alertas de baixo/esgotado
- Categorias (ordem do menu, mostrar/esconder) e Configurações (WhatsApp, cidade, taxa de entrega, entrega grátis acima de X, pedido mínimo, tempo de reserva)

## Regras importantes (garantidas no banco, não só na tela)

- O cliente **nunca** vê custo, margem nem dados de outros clientes: a loja só lê *views* públicas (`catalog_*`, `public_settings`).
- O preço do pedido é calculado **no banco**. O navegador manda só "qual tom e quantos".
- Ao criar o pedido, o estoque fica **reservado** (padrão 24h). A reserva vencida é liberada sozinha; ao confirmar depois, o estoque é conferido de novo.
- O estoque baixa quando o pedido passa para *Pago / Em preparação / Saiu / Pronto / Concluído*, e **volta** se o pedido for cancelado.
- Travas de linha no banco: dois clientes não conseguem comprar a última unidade ao mesmo tempo. O estoque nunca fica negativo.
- O estoque **não pode** ser alterado direto na tabela, só pelas funções que registram quem mexeu.
- Clicar duas vezes em "Enviar pedido" não duplica o pedido (chave de idempotência).
- O faturamento só conta pedidos com pagamento confirmado (`paid_at`).
- Cada item guarda o **custo do dia da venda**: mudar o custo depois não altera o lucro passado.
- Valores sempre em **centavos inteiros**.

## Instalação

### 1. Criar o projeto no Supabase
1. Em [supabase.com](https://supabase.com), clique em **New project** (região São Paulo).
2. **SQL Editor** → cole e rode `supabase/migrations/0001_inicial.sql`.
3. (Opcional, para testar) rode `supabase/demo/demo_produtos.sql`. Para apagar a demonstração depois, rode `select public.remove_demo_data();`.
4. **Authentication → Sign In / Providers → Email**: desligue **"Allow new users to sign up"**. Só a proprietária cria acessos.

### 2. Variáveis
Copie `.env.example` para `.env.local` e preencha com os dados de **Project Settings → API**:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Criar a proprietária (uma vez)
No `.env.local`, preencha temporariamente `SUPABASE_SERVICE_ROLE_KEY`, `OWNER_EMAIL`, `OWNER_PASSWORD` (mínimo 12 caracteres) e `OWNER_NAME`. Depois rode:
```
npm install
npm run create-owner
```
Em seguida, **apague `SUPABASE_SERVICE_ROLE_KEY` e `OWNER_PASSWORD` do `.env.local`**. A chave service role nunca vai para o site nem para o Cloudflare.

### 4. Rodar no computador
```
npm run dev
```
Loja em http://localhost:3000 e painel em http://localhost:3000/admin.

### 5. Testes do banco
```
npm run test:db
```
São 36 verificações num Postgres embutido: segurança, reserva, concorrência, cancelamento, estoque e resumo.

## Publicar no Cloudflare

1. `npx wrangler login`
2. Em **Workers & Pages → yrmake → Settings → Variables**, cadastre `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `NEXT_PUBLIC_SITE_URL` (ex.: `https://yrmake.com.br`). Mantenha-as também no `.env.local` na hora do build, porque as `NEXT_PUBLIC_*` entram no build.
3. `npm run deploy`
4. Domínio: compre `yrmake.com.br` no Registro.br, aponte os DNS para o Cloudflare e, em **Workers → yrmake → Domains & Routes**, adicione o domínio.
5. No Supabase, em **Authentication → URL Configuration**, coloque a URL do site.

> O Supabase grátis pausa depois de 7 dias **sem nenhum acesso**. Com a loja recebendo visitas, ele não pausa.

## Estrutura

```
src/app/(loja)/          loja pública (home, produtos, produto, carrinho, finalizar, contato, privacidade)
src/app/admin/           painel (login, resumo, pedidos, produtos, estoque, categorias, configurações)
src/app/admin/actions/   Server Actions do painel (sempre conferem a permissão no servidor)
src/components/          componentes da loja e do painel
src/lib/                 Supabase, dinheiro, WhatsApp, tipos
src/middleware.ts        exige login no /admin (1ª barreira; a 2ª é no servidor, a 3ª no banco)
supabase/migrations/     banco: tabelas, RLS, views públicas, funções de pedido e estoque
supabase/demo/           dados de demonstração (SKUs DEMO-*)
supabase/tests/          testes do banco (PGlite)
scripts/create-owner.mjs criação segura da proprietária
```

## Próximas fases

- **Fase 2:** caixa (abertura e fechamento), despesas, fornecedores e compras, relatórios com gráficos, venda manual no balcão, cadastro de funcionárias e gerentes pelo painel, cupons de desconto.
- **Fase 3:** PIX automático com gateway (Asaas, Efí ou Pagar.me), com webhook validado.
