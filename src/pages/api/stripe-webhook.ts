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
    return new Response('Webhook signature inválido', { status: 400 });
  }

  const supabase = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.CheckoutSession;
    const { nome, plano, slug } = session.metadata ?? {};
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

    // E-mail de boas-vindas
    if (email && import.meta.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(import.meta.env.RESEND_API_KEY);
        await resend.emails.send({
          from: 'PortaFácil <contato@portafacil.net>',
          to: email,
          subject: '🎉 Bem-vindo à PortaFácil! Seu perfil está ativo',
          html: `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head><meta charset="UTF-8"></head>
            <body style="font-family:system-ui,sans-serif;background:#f8f9fa;padding:24px;margin:0">
              <div style="max-width:560px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
                <div style="background:#1e3a5f;padding:24px 32px">
                  <h1 style="color:white;margin:0;font-size:20px">🎉 Bem-vindo à PortaFácil!</h1>
                  <p style="color:#b0c4de;margin:6px 0 0;font-size:14px">Seu perfil está ativo e você já pode receber clientes</p>
                </div>
                <div style="padding:32px">
                  <p style="color:#444;margin:0 0 20px">Olá, <strong>${nome || 'profissional'}</strong>! Sua assinatura do <strong>Plano ${plano === 'pro' ? 'Pro' : 'Básico'}</strong> foi confirmada.</p>
                  
                  <div style="background:#dcfce7;border-radius:8px;padding:16px 20px;margin-bottom:24px">
                    <p style="color:#166534;margin:0;font-size:14px;font-weight:500">✅ Perfil ativo na plataforma<br>✅ Aparecendo nas buscas de clientes<br>${plano === 'pro' ? '✅ Destaque nas buscas ativado<br>✅ Agendamento online disponível' : ''}</p>
                  </div>

                  <h2 style="color:#1e3a5f;font-size:16px;margin:0 0 12px">Próximos passos:</h2>
                  <ol style="color:#444;font-size:14px;padding-left:20px;margin:0 0 24px">
                    <li style="margin-bottom:8px">Complete seu perfil com foto e descrição detalhada</li>
                    <li style="margin-bottom:8px">Adicione fotos dos seus trabalhos realizados</li>
                    <li style="margin-bottom:8px">Informe todas as cidades onde você atende</li>
                    <li>Aguarde os primeiros leads chegarem por e-mail!</li>
                  </ol>

                  <a href="https://www.portafacil.net/painel" style="display:inline-block;background:#f97316;color:white;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px">Acessar meu painel →</a>
                </div>
                <div style="background:#f8f9fa;padding:16px 32px;border-top:1px solid #e5e7eb">
                  <p style="color:#aaa;font-size:11px;margin:0">PortaFácil · <a href="https://www.portafacil.net" style="color:#aaa">portafacil.net</a> · <a href="mailto:contato@portafacil.net" style="color:#aaa">contato@portafacil.net</a></p>
                </div>
              </div>
            </body>
            </html>
          `,
        });
      } catch (e) {
        console.error('Erro e-mail boas-vindas:', e);
      }
    }
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
    const PRICE_PRO = 'price_1TbWBp10Lgf22AVyeiuNmkU6';
    const novoPlano = priceId === PRICE_PRO ? 'pro' : 'basico';
    await supabase
      .from('profissionais')
      .update({ plano: novoPlano })
      .eq('stripe_subscription_id', sub.id);
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
};
