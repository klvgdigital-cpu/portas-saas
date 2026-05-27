import type { APIRoute } from 'astro';
import Stripe from 'stripe';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { plano, email, nome } = body;

    if (!plano || !email) {
      return new Response(JSON.stringify({ error: 'Dados incompletos' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const stripeKey = import.meta.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: 'Stripe não configurado' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const stripe = new Stripe(stripeKey);

    const priceId = plano === 'pro'
      ? import.meta.env.STRIPE_PRICE_PRO
      : import.meta.env.STRIPE_PRICE_BASICO;

    const siteUrl = import.meta.env.PUBLIC_SITE_URL || 'https://www.portafacil.net';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      customer_email: email,
      metadata: { nome: nome || '', plano },
      success_url: `${siteUrl}/painel?cadastro=sucesso`,
      cancel_url: `${siteUrl}/planos`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('Stripe error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Erro interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
