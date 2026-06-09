import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { email, plano } = body;

    if (!email || !plano) {
      return new Response(JSON.stringify({ error: 'Dados incompletos' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Buscar profissional
    const { data: prof, error: fetchError } = await supabase
      .from('profissionais')
      .select('id, nome, slug')
      .eq('email', email)
      .single();

    if (fetchError || !prof) {
      return new Response(JSON.stringify({ error: 'Profissional não encontrado' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY);
    const PRICE_PRO = 'price_1TbWBp10Lgf22AVyeiuNmkU6';
    const PRICE_BASICO = 'price_1TbWBA10Lgf22AVyNNU3mgK9';
    const priceId = plano === 'pro' ? PRICE_PRO : PRICE_BASICO;
    const siteUrl = import.meta.env.PUBLIC_SITE_URL || 'https://www.portafacil.net';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      customer_email: email,
      metadata: { nome: prof.nome || '', plano, slug: prof.slug },
      success_url: `${siteUrl}/painel?assinatura=sucesso`,
      cancel_url: `${siteUrl}/painel`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('Assinar error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Erro interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
