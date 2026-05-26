# PortaFácil — Marketplace de Porta de Enrolar

Marketplace especializado em profissionais de instalação e manutenção de portas de aço de enrolar automáticas e manuais no Brasil.

## Stack

- **Astro 5.1** — Framework web
- **Tailwind CSS 3** — Estilização
- **React 18** — Componentes interativos
- **Supabase** — Banco de dados (PostgreSQL) + Auth + Storage
- **Stripe** — Pagamentos e assinaturas
- **Resend** — E-mails transacionais
- **Vercel** — Deploy

## Instalação

```bash
npm install
cp .env.example .env
# Preencha as variáveis no .env
npm run dev
```

## Configuração do Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Vá em **SQL Editor** e execute o arquivo `supabase-schema.sql`
3. Copie a URL e a anon key para o `.env`

## Configuração do Stripe

1. Crie uma conta em [stripe.com](https://stripe.com)
2. Crie dois produtos com preço recorrente mensal:
   - **Plano Básico** — R$ 79/mês
   - **Plano Pro** — R$ 149/mês
3. Copie os `price_id` de cada plano para o `.env`
4. Configure o webhook apontando para `https://SEU-DOMINIO/api/stripe-webhook`
   - Eventos: `checkout.session.completed`, `customer.subscription.deleted`, `customer.subscription.updated`

## Configuração do Resend

1. Crie uma conta em [resend.com](https://resend.com)
2. Adicione e verifique seu domínio
3. Copie a API key para o `.env`

## Deploy na Vercel

```bash
# Instale a Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Ou conecte o repositório GitHub diretamente no painel da Vercel.

## Estrutura de Páginas

| Página | Rota |
|---|---|
| Home | `/` |
| Buscar profissionais | `/profissionais` |
| Perfil do profissional | `/profissionais/[slug]` |
| Planos | `/planos` |
| Cadastro profissional | `/cadastro-profissional` |
| Login | `/login` |
| Painel profissional | `/painel` |
| Painel admin | `/painel/admin` |

## APIs

| Endpoint | Método | Descrição |
|---|---|---|
| `/api/leads` | POST | Cria um novo lead |
| `/api/stripe-checkout` | POST | Cria sessão de pagamento |
| `/api/stripe-webhook` | POST | Recebe eventos do Stripe |
