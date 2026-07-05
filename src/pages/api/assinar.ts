import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const ASAAS_BASE = 'https://api.asaas.com/v3';

async function asaasFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${ASAAS_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'access_token': import.meta.env.ASAAS_API_KEY,
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.errors?.[0]?.description || `Asaas error ${res.status}`);
  }
  return data;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    // Autenticação obrigatória — o email vem da sessão, não do corpo
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user?.email) {
      return new Response(JSON.stringify({ error: 'Sessão inválida' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { plano } = body;
    const email = user.email;

    if (!plano) {
      return new Response(JSON.stringify({ error: 'Dados incompletos' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data: prof, error: fetchError } = await supabase
      .from('profissionais')
      .select('id, nome, slug, cpf_cnpj, whatsapp, asaas_customer_id, asaas_subscription_id')
      .eq('email', email)
      .single();

    if (fetchError || !prof) {
      return new Response(JSON.stringify({ error: 'Profissional não encontrado' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!prof.cpf_cnpj) {
      return new Response(JSON.stringify({ error: 'CPF/CNPJ não cadastrado. Atualize seu perfil.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Reutilizar ou criar cliente Asaas
    let asaasCustomerId = prof.asaas_customer_id;
    if (!asaasCustomerId) {
      const existing = await asaasFetch(`/customers?email=${encodeURIComponent(email)}`);
      if (existing?.data?.length > 0) {
        asaasCustomerId = existing.data[0].id;
      } else {
        const customer = await asaasFetch('/customers', {
          method: 'POST',
          body: JSON.stringify({
            name: prof.nome || email,
            email,
            cpfCnpj: prof.cpf_cnpj.replace(/\D/g, ''),
            mobilePhone: (prof.whatsapp || '').replace(/\D/g, ''),
          }),
        });
        asaasCustomerId = customer.id;
      }
    }

    // Cancelar assinatura anterior se existir (upgrade/downgrade)
    if (prof.asaas_subscription_id) {
      try {
        await asaasFetch(`/subscriptions/${prof.asaas_subscription_id}`, { method: 'DELETE' });
      } catch (e) {
        console.log('Assinatura anterior já removida ou inexistente');
      }
    }

    // Criar nova assinatura — primeira cobrança vence amanhã
    const valor = plano === 'pro' ? 149.0 : 79.0;
    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + 1);
    const dueDateStr = nextDueDate.toISOString().split('T')[0];

    const subscription = await asaasFetch('/subscriptions', {
      method: 'POST',
      body: JSON.stringify({
        customer: asaasCustomerId,
        billingType: 'UNDEFINED',
        nextDueDate: dueDateStr,
        value: valor,
        cycle: 'MONTHLY',
        description: plano === 'pro' ? 'Plano Pro — PortaFácil' : 'Plano Básico — PortaFácil',
      }),
    });

    // Buscar a primeira cobrança para redirecionar ao pagamento
    const payments = await asaasFetch(`/subscriptions/${subscription.id}/payments`);
    const firstPayment = payments?.data?.[0];
    const invoiceUrl = firstPayment?.invoiceUrl;

    // Atualizar registro
    await supabase
      .from('profissionais')
      .update({
        plano: plano === 'pro' ? 'pro' : 'basico',
        asaas_customer_id: asaasCustomerId,
        asaas_subscription_id: subscription.id,
      })
      .eq('id', prof.id);

    const siteUrl = import.meta.env.PUBLIC_SITE_URL || 'https://www.portafacil.net';
    return new Response(JSON.stringify({ url: invoiceUrl || `${siteUrl}/painel` }), {
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
