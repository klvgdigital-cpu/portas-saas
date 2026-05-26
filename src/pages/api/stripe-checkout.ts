import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { plano, email, nome } = body;

  const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY);
  const priceId = plano === 'pro'
    ? import.meta.env.STRIPE_PRICE_PRO
    : import.meta.env.STRIPE_PRICE_BASICO;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    customer_email: email,
    metadata: { nome, plano },
    success_url: `${import.meta.env.PUBLIC_SITE_URL}/painel?cadastro=sucesso`,
    cancel_url: `${import.meta.env.PUBLIC_SITE_URL}/planos`,
  });

  return new Response(JSON.stringify({ url: session.url }), { status: 200 });
};
