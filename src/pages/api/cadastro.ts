import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { email, nome, senha, whatsapp, cpf_cnpj, descricao, cidade, estado, tipos_porta, anos_experiencia } = body;

    if (!email || !nome || !senha) {
      return new Response(JSON.stringify({ error: 'Nome, e-mail e senha são obrigatórios' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 1. Verificar se e-mail já existe
    const { data: existing } = await supabase
      .from('profissionais')
      .select('id, status')
      .eq('email', email)
      .single();

    if (existing) {
      return new Response(JSON.stringify({ error: 'Este e-mail já está cadastrado. Faça login.' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Criar usuário no Supabase Auth
    const { error: authError } = await supabase.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { nome, plano: 'basico' },
    });

    if (authError && !authError.message.includes('already registered')) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Erro ao criar conta: ' + authError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Calcular trial de 7 dias
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 10); // oferta de lancamento

    // 4. Salvar na tabela profissionais
    const slug = (nome || email).toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + '-' + Date.now();

    const { error: dbError } = await supabase.from('profissionais').upsert({
      slug,
      nome: nome || '',
      email,
      whatsapp: whatsapp || '',
      cpf_cnpj: cpf_cnpj || '',
      descricao: descricao || '',
      cidade: cidade || '',
      estado: estado || 'SP',
      tipos_porta: tipos_porta || 'ambas',
      anos_experiencia: Number(anos_experiencia) || 1,
      plano: 'basico',
      status: 'ativo',
      trial_ends_at: trialEndsAt.toISOString(),
    }, { onConflict: 'email' });

    if (dbError) {
      console.error('DB error:', JSON.stringify(dbError));
      return new Response(JSON.stringify({ error: 'Erro ao salvar dados: ' + dbError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 5. Enviar e-mail de boas-vindas com trial
    const siteUrl = import.meta.env.PUBLIC_SITE_URL || 'https://www.portafacil.net';
    const trialDate = trialEndsAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });

    try {
      const { Resend } = await import('resend');
      const resend = new Resend(import.meta.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'PortaFácil <contato@portafacil.net>',
        to: email,
        subject: '🎉 Seu perfil está ativo! 10 dias grátis na PortaFácil',
        html: `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="font-family:system-ui,sans-serif;background:#f8f9fa;padding:24px;margin:0">
  <div style="max-width:560px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
    <div style="background:#1e3a5f;padding:24px 32px">
      <h1 style="color:white;margin:0;font-size:20px">🎉 Bem-vindo à PortaFácil!</h1>
      <p style="color:#b0c4de;margin:6px 0 0;font-size:14px">Seu perfil está ativo — 10 dias grátis começando agora</p>
    </div>
    <div style="padding:32px">
      <p style="color:#444;margin:0 0 20px">Olá, <strong>${nome}</strong>! Seu cadastro foi criado com sucesso.</p>
      <div style="background:#dcfce7;border-radius:8px;padding:16px 20px;margin-bottom:24px">
        <p style="color:#166534;margin:0;font-size:14px;font-weight:500">✅ Perfil ativo e visível nas buscas<br>⏳ Trial gratuito até <strong>${trialDate}</strong> — sem precisar de cartão agora</p>
      </div>
      <p style="color:#444;font-size:14px;margin:0 0 20px">Antes que o trial acabe, assine um plano para continuar recebendo clientes. <strong>R$ 79/mês</strong> no Básico ou <strong>R$ 149/mês</strong> no Pro.</p>
      <a href="${siteUrl}/painel" style="display:inline-block;background:#f97316;color:white;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:15px">Acessar meu painel →</a>
    </div>
    <div style="background:#f8f9fa;padding:16px 32px;border-top:1px solid #e5e7eb">
      <p style="color:#aaa;font-size:11px;margin:0">PortaFácil · <a href="${siteUrl}" style="color:#aaa">portafacil.net</a></p>
    </div>
  </div>
</body>
</html>`,
      });
    } catch (emailErr) {
      console.error('Erro e-mail boas-vindas:', emailErr);
    }

    return new Response(JSON.stringify({ success: true, slug }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('Cadastro error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Erro interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
