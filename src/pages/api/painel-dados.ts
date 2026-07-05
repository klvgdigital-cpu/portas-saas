import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const GET: APIRoute = async ({ request }) => {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), { status: 401 });
    }

    const supabase = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user?.email) {
      return new Response(JSON.stringify({ error: 'Sessão inválida' }), { status: 401 });
    }

    const { data: prof, error } = await supabase
      .from('profissionais')
      .select('id, nome, email, whatsapp, cpf_cnpj, descricao, cidade, estado, tipos_porta, anos_experiencia, plano, status, trial_ends_at, foto_url, slug, asaas_subscription_id')
      .eq('email', user.email)
      .single();

    if (error || !prof) {
      return new Response(JSON.stringify({ error: 'Perfil não encontrado' }), { status: 404 });
    }

    // Contar leads do mês atual
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const { count: leadsCount } = await supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('profissional_id', prof.id)
      .gte('created_at', inicioMes.toISOString());

    // Total de leads (histórico)
    const { count: leadsTotal } = await supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('profissional_id', prof.id);

    return new Response(JSON.stringify({
      profissional: prof,
      metricas: {
        leads_mes: leadsCount || 0,
        leads_total: leadsTotal || 0,
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
