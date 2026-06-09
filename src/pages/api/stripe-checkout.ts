import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { plano, email, nome, whatsapp, cpf_cnpj, descricao, cidade, estado, tipos_porta, anos_experiencia, senha } = body;

    if (!plano || !email) {
      return new Response(JSON.stringify({ error: 'Dados incompletos' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 1. Criar usuario no Supabase Auth
    if (senha) {
      const { error: authError } = await supabase.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
        user_metadata: { nome, plano }
      });
      if (authError && !authError.message.includes('already registered')) {
        console.error('Auth error:', authError);
      }
    }

    // 2. Salvar dados na tabela profissionais (service role ignora RLS)
    const slug = (nome || email).toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + '-' + Date.now();

    const { error: dbError, data: dbData } = await supabase.from('profissionais').upsert({
      slug,
      nome: nome || '',
      email,
      whatsapp: whatsapp || '',
      cpf_cnpj: cpf_cnpj || '',
      descricao: descricao || '',
      cidade: cidade || '',
      estado: estado || 'SP',
      tipos_porta: tipos_porta || 'ambas',
      anos_experiencia: Number(anos_experiencia) || 1,
      plano: 'basico',
      status: 'pendente',
    }, { onConflict: 'email' });

    if (dbError) {
      console.error('Supabase upsert error:', JSON.stringify(dbError));
      // Nao bloqueia o checkout — o webhook vai tentar atualizar apos pagamento
    } else {
      console.log('Profissional salvo no banco:', email);
    }

    // 3. Criar sessao Stripe
    const stripeKey = import.meta.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: 'Stripe nao configurado' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const stripe = new Stripe(stripeKey);
    const PRICE_PRO = 'price_1TbWBp10Lgf22AVyeiuNmkU6';
    const PRICE_BASICO = 'price_1TbWBA10Lgf22AVyNNU3mgK9';
    const priceId = plano === 'pro' ? PRICE_PRO : PRICE_BASICO;
    const siteUrl = import.meta.env.PUBLIC_SITE_URL || 'https://www.portafacil.net';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      customer_email: email,
      metadata: { nome: nome || '', plano, slug },
      success_url: `${siteUrl}/painel?cadastro=sucesso`,
      cancel_url: `${siteUrl}/planos`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('Checkout error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Erro interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
