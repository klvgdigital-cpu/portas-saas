import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const POST: APIRoute = async ({ request }) => {
  const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY);
  const sig = request.headers.get('stripe-signature') ?? '';
  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, import.meta.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return new Response('Webhook signature inválido', { status: 400 });
  }

  const supabase = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.CheckoutSession;
    const { nome, plano } = session.metadata ?? {};
    const email = session.customer_email;

    await supabase
      .from('profissionais')
      .update({
        plano: plano ?? 'basico',
        status: 'ativo',
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string,
      })
      .eq('email', email);
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription;
    await supabase
      .from('profissionais')
      .update({ plano: 'basico', status: 'pendente' })
      .eq('stripe_subscription_id', sub.id);
  }

  if (event.type === 'customer.subscription.updated') {
    const sub = event.data.object as Stripe.Subscription;
    const priceId = sub.items.data[0]?.price.id;
    const novoPlano = priceId === import.meta.env.STRIPE_PRICE_PRO ? 'pro' : 'basico';

    await supabase
      .from('profissionais')
      .update({ plano: novoPlano })
      .eq('stripe_subscription_id', sub.id);
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
};
