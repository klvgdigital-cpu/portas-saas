import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const POST: APIRoute = async ({ request }) => {
  const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY);
  const sig = request.headers.get('stripe-signature') ?? '';
  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, import.meta.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return new Response('Webhook signature invalido', { status: 400 });
  }

  const supabase = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.CheckoutSession;
    const { nome, plano, slug } = session.metadata ?? {};
    const email = session.customer_email;

    if (!email) {
      console.error('Webhook: email ausente na sessao', session.id);
      return new Response('Email ausente', { status: 400 });
    }

    // 1. Buscar profissional pelo email primeiro
    const { data: prof, error: fetchError } = await supabase
      .from('profissionais')
      .select('id, nome, email, status')
      .eq('email', email)
      .single();

    if (fetchError || !prof) {
      console.error('Webhook: profissional nao encontrado para email', email, fetchError);
      return new Response(JSON.stringify({ warning: 'Profissional nao encontrado' }), { status: 200 });
    }

    // 2. Atualizar status e dados Stripe
    const { error: updateError } = await supabase
      .from('profissionais')
      .update({
        plano: plano ?? 'basico',
        status: 'ativo',
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string,
      })
      .eq('email', email);

    if (updateError) {
      console.error('Webhook: erro ao atualizar profissional', updateError);
    }

    // 3. Criar usuario no Supabase Auth se ainda nao existir
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const authUserExists = existingUsers?.users?.some(u => u.email === email);

    if (!authUserExists) {
      const tempPassword = crypto.randomUUID();
      const { error: authError } = await supabase.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { nome: prof.nome ?? nome, plano: plano ?? 'basico' },
      });
      if (authError && !authError.message.includes('already registered')) {
        console.error('Webhook: erro ao criar usuario Auth', authError);
      } else if (!authError) {
        await supabase.auth.admin.generateLink({ type: 'recovery', email });
      }
    }

    // 4. Enviar email de boas-vindas via Resend
    if (import.meta.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(import.meta.env.RESEND_API_KEY);
        const nomeFinal = prof.nome ?? nome ?? 'profissional';
        const planoFinal = plano ?? 'Basico';
        await resend.emails.send({
          from: 'PortaFacil <contato@portafacil.net>',
          to: email,
          subject: 'Bem-vindo a PortaFacil! Seu perfil esta ativo',
          html: '<html><body style="font-family:sans-serif;padding:24px"><h1 style="color:#1e3a5f">Bem-vindo a PortaFacil!</h1><p>Ola <strong>' + nomeFinal + '</strong>! Seu Plano ' + planoFinal + ' esta ativo.</p><p><a href="https://www.portafacil.net/painel" style="background:#f97316;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Acessar painel</a></p></body></html>',
        });
        console.log('Email boas-vindas enviado para', email);
      } catch (e) {
        console.error('Erro email boas-vindas:', e);
      }
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription;
    await supabase
      .from('profissionais')
      .update({ status: 'inativo', plano: 'basico' })
      .eq('stripe_subscription_id', sub.id);
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
};
