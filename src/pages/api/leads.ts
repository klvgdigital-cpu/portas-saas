import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { profissional_id, nome, telefone, tipo_servico, descricao, cidade } = body;

    if (!profissional_id || !nome || !telefone) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios faltando' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Salvar lead
    // --- Proteções anti-raspagem ---
    // 1) Honeypot: campo invisível preenchido = robô. Finge sucesso, não salva nada.
    if (body.site) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2) Rate limit: máx 3 leads/hora por IP
    const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'desconhecido';
    const umaHoraAtras = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: leadsRecentes } = await supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('ip', ip)
      .gte('created_at', umaHoraAtras);

    if ((leadsRecentes || 0) >= 3) {
      return new Response(JSON.stringify({ error: 'Muitas solicitações. Tente novamente mais tarde.' }), {
        status: 429, headers: { 'Content-Type': 'application/json' },
      });
    }


    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        profissional_id,
        nome_cliente: nome,
        telefone_cliente: telefone,
        tipo_servico: tipo_servico || 'Não informado',
        descricao: descricao || '',
      ip,
        cidade: cidade || '',
        status: 'novo',
      })
      .select()
      .single();

    if (leadError) {
      console.error('Erro ao salvar lead:', leadError);
      return new Response(JSON.stringify({ error: 'Erro ao salvar solicitação' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Buscar dados do profissional
    const { data: profissional } = await supabase
      .from('profissionais')
      .select('email, nome, whatsapp, plano')
      .eq('id', profissional_id)
      .single();

    // Enviar e-mail ao profissional via Resend
    if (profissional?.email && import.meta.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(import.meta.env.RESEND_API_KEY);
        
        await resend.emails.send({
          from: 'PortaFácil <contato@portafacil.net>',
          to: profissional.email,
          subject: `🔔 Novo lead recebido — ${tipo_servico || 'Serviço'}`,
          html: `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head><meta charset="UTF-8"></head>
            <body style="font-family:system-ui,sans-serif;background:#f8f9fa;padding:24px;margin:0">
              <div style="max-width:560px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
                <div style="background:#1e3a5f;padding:24px 32px">
                  <h1 style="color:white;margin:0;font-size:20px">🔔 Novo lead recebido!</h1>
                  <p style="color:#b0c4de;margin:6px 0 0;font-size:14px">Um cliente está procurando seu serviço na PortaFácil</p>
                </div>
                <div style="padding:32px">
                  <p style="color:#444;margin:0 0 20px">Olá, <strong>${profissional.nome}</strong>! Você recebeu uma nova solicitação de orçamento.</p>
                  
                  <div style="background:#f8f9fa;border-radius:8px;padding:20px;margin-bottom:24px">
                    <h2 style="color:#1e3a5f;font-size:16px;margin:0 0 16px">Dados do cliente</h2>
                    <table style="width:100%;border-collapse:collapse">
                      <tr><td style="padding:6px 0;color:#888;font-size:13px;width:120px">Nome</td><td style="padding:6px 0;color:#222;font-size:13px;font-weight:500">${nome}</td></tr>
                      <tr><td style="padding:6px 0;color:#888;font-size:13px">Telefone</td><td style="padding:6px 0;color:#222;font-size:13px;font-weight:500">${telefone}</td></tr>
                      <tr><td style="padding:6px 0;color:#888;font-size:13px">Serviço</td><td style="padding:6px 0;color:#222;font-size:13px;font-weight:500">${tipo_servico || 'Não informado'}</td></tr>
                      <tr><td style="padding:6px 0;color:#888;font-size:13px">Região</td><td style="padding:6px 0;color:#222;font-size:13px;font-weight:500">${cidade || 'Não informada'}</td></tr>
                      ${descricao ? `<tr><td style="padding:6px 0;color:#888;font-size:13px;vertical-align:top">Descrição</td><td style="padding:6px 0;color:#222;font-size:13px">${descricao}</td></tr>` : ''}
                    </table>
                  </div>

                  <a href="https://www.portafacil.net/painel" style="display:inline-block;background:#f97316;color:white;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px">Ver no painel →</a>

                  <p style="color:#999;font-size:12px;margin-top:24px">Entre em contato com o cliente o quanto antes — profissionais que respondem rápido têm mais chances de fechar o serviço.</p>
                </div>
                <div style="background:#f8f9fa;padding:16px 32px;border-top:1px solid #e5e7eb">
                  <p style="color:#aaa;font-size:11px;margin:0">PortaFácil · <a href="https://www.portafacil.net" style="color:#aaa">portafacil.net</a></p>
                </div>
              </div>
            </body>
            </html>
          `,
        });
      } catch (emailError) {
        console.error('Erro ao enviar e-mail:', emailError);
        // Não falha o lead por causa do e-mail
      }
    }

    const waNum = (profissional?.whatsapp || '').replace(/\D/g, '');
    const whatsappUrl = waNum
      ? `https://wa.me/55${waNum}?text=${encodeURIComponent('Olá! Acabei de enviar uma solicitação de orçamento pelo seu perfil na PortaFácil.')}`
      : null;

    return new Response(JSON.stringify({ success: true, lead, whatsapp_url: whatsappUrl }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('Erro na API de leads:', err);
    return new Response(JSON.stringify({ error: err.message || 'Erro interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
