import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { plano, email, nome, whatsapp, cpf_cnpj, descricao, cidade, estado, tipos_porta, anos_experiencia } = body;

    if (!plano || !email) {
      return new Response(JSON.stringify({ error: 'Dados incompletos' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Salvar profissional no Supabase (server-side — funciona sempre)
    const supabase = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const slug = (nome || email).toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + '-' + Date.now();

    const { error: dbError } = await supabase.from('profissionais').upsert({
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
      console.error('Supabase error:', dbError);
    }

    // Criar sessão Stripe
    const stripeKey = import.meta.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: 'Stripe não configurado' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const stripe = new Stripe(stripeKey);
    // Price IDs fixos — Stripe PortaFácil
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
