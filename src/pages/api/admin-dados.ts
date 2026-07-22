import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

// Emails com acesso ADM — exclusivo da administração
const ADMIN_EMAILS = [
  'karen.lemuche@icloud.com',
  'klvgdigital@gmail.com',
];

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
    if (authError || !user?.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      return new Response(JSON.stringify({ error: 'Acesso restrito' }), { status: 403 });
    }

    // ===== Dados =====
    const { data: profissionais } = await supabase
      .from('profissionais')
      .select('id, nome, email, whatsapp, plano, status, trial_ends_at, regioes, created_at')
      .order('created_at', { ascending: false });

    const { data: leads } = await supabase
      .from('leads')
      .select('id, profissional_id, nome_cliente, telefone_cliente, cidade, tipo_servico, descricao, created_at')
      .order('created_at', { ascending: false });

    const agora = Date.now();
    const seteDias = agora - 7 * 24 * 60 * 60 * 1000;
    const trintaDias = agora - 30 * 24 * 60 * 60 * 1000;

    // Leads por região
    const leadsPorRegiao: Record<string, number> = {};
    (leads || []).forEach((l: any) => {
      const r = l.cidade || 'Não informada';
      leadsPorRegiao[r] = (leadsPorRegiao[r] || 0) + 1;
    });

    // Leads por profissional + último lead
    const porProf: Record<string, { total: number; ultimo: string | null }> = {};
    (leads || []).forEach((l: any) => {
      if (!l.profissional_id) return;
      if (!porProf[l.profissional_id]) porProf[l.profissional_id] = { total: 0, ultimo: null };
      porProf[l.profissional_id].total++;
      if (!porProf[l.profissional_id].ultimo || l.created_at > porProf[l.profissional_id].ultimo!) {
        porProf[l.profissional_id].ultimo = l.created_at;
      }
    });

    const profResumo = (profissionais || []).map((p: any) => ({
      nome: p.nome,
      email: p.email,
      plano: p.plano,
      status: p.status,
      trial_ends_at: p.trial_ends_at,
      leads_total: porProf[p.id]?.total || 0,
      ultimo_lead: porProf[p.id]?.ultimo || null,
    }));

    const ativos = (profissionais || []).filter((p: any) => p.status === 'ativo').length;
    const pendentes = (profissionais || []).filter((p: any) => p.status === 'pendente').length;
    const totalBasico = (profissionais || []).filter((p: any) => p.plano === 'basico' && p.status === 'ativo').length;
    const totalPro = (profissionais || []).filter((p: any) => p.plano === 'pro' && p.status === 'ativo').length;

    return new Response(JSON.stringify({
      metricas: {
        leads_total: (leads || []).length,
        leads_7d: (leads || []).filter((l: any) => new Date(l.created_at).getTime() > seteDias).length,
        leads_30d: (leads || []).filter((l: any) => new Date(l.created_at).getTime() > trintaDias).length,
        profissionais_ativos: ativos,
        profissionais_pendentes: pendentes,
        receita_potencial: totalBasico * 79 + totalPro * 149,
      },
      leads_por_regiao: leadsPorRegiao,
      profissionais: profResumo,
      ultimos_leads: (leads || []).slice(0, 20),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
