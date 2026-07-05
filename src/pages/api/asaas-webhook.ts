import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const POST: APIRoute = async ({ request }) => {
  try {
    // Verificar token de autenticação do webhook (configurado no painel Asaas)
    const token = request.headers.get('asaas-access-token');
    if (import.meta.env.ASAAS_WEBHOOK_TOKEN && token !== import.meta.env.ASAAS_WEBHOOK_TOKEN) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const event = await request.json();
    const eventType = event?.event;
    const payment = event?.payment;

    if (!eventType || !payment) {
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    const subscriptionId = payment.subscription;
    if (!subscriptionId) {
      // Cobrança avulsa, não relacionada a assinatura — ignorar
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    const supabase = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Buscar profissional pela assinatura
    const { data: prof, error: fetchError } = await supabase
      .from('profissionais')
      .select('id, email, status')
      .eq('asaas_subscription_id', subscriptionId)
      .single();

    if (fetchError || !prof) {
      console.error('Webhook: profissional nao encontrado para subscription', subscriptionId);
      return new Response(JSON.stringify({ warning: 'Profissional nao encontrado' }), { status: 200 });
    }

    switch (eventType) {
      // Pagamento confirmado (cartão) ou recebido (Pix/boleto) → ativar perfil
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED': {
        await supabase
          .from('profissionais')
          .update({ status: 'ativo' })
          .eq('id', prof.id);
        console.log('Perfil ativado:', prof.email);
        break;
      }

      // Cobrança vencida sem pagamento → desativar perfil
      case 'PAYMENT_OVERDUE': {
        await supabase
          .from('profissionais')
          .update({ status: 'pendente' })
          .eq('id', prof.id);
        console.log('Perfil desativado (cobrança vencida):', prof.email);
        break;
      }

      // Cobrança/assinatura removida ou estornada → desativar perfil
      case 'PAYMENT_DELETED':
      case 'PAYMENT_REFUNDED': {
        await supabase
          .from('profissionais')
          .update({ status: 'pendente' })
          .eq('id', prof.id);
        console.log('Perfil desativado (cobrança removida/estornada):', prof.email);
        break;
      }

      default:
        // Outros eventos (PAYMENT_CREATED, PAYMENT_UPDATED etc.) — apenas registrar
        console.log('Evento Asaas ignorado:', eventType);
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });

  } catch (err: any) {
    console.error('Asaas webhook error:', err);
    // Retornar 200 para o Asaas não reenviar indefinidamente em caso de erro de parsing
    return new Response(JSON.stringify({ error: err.message }), { status: 200 });
  }
};
