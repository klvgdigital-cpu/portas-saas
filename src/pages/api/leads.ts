import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { profissional_id, nome, telefone, tipo_servico, descricao, cidade } = body;

  if (!profissional_id || !nome || !telefone) {
    return new Response(JSON.stringify({ error: 'Campos obrigatórios faltando' }), { status: 400 });
  }

  const supabase = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: lead, error } = await supabase
    .from('leads')
    .insert({
      profissional_id,
      nome_cliente: nome,
      telefone_cliente: telefone,
      tipo_servico,
      descricao,
      cidade,
      status: 'novo',
    })
    .select()
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: 'Erro ao salvar lead' }), { status: 500 });
  }

  // Notificar profissional por e-mail
  try {
    const { data: profissional } = await supabase
      .from('profissionais')
      .select('email, nome')
      .eq('id', profissional_id)
      .single();

    if (profissional?.email) {
      const resend = new Resend(import.meta.env.RESEND_API_KEY);
      await resend.emails.send({
        from: import.meta.env.EMAIL_FROM,
        to: profissional.email,
        subject: `Novo lead recebido — ${tipo_servico}`,
        html: `
          <h2>Olá, ${profissional.nome}!</h2>
          <p>Você recebeu um novo lead na PortaFácil.</p>
          <ul>
            <li><strong>Cliente:</strong> ${nome}</li>
            <li><strong>Telefone:</strong> ${telefone}</li>
            <li><strong>Serviço:</strong> ${tipo_servico}</li>
            <li><strong>Descrição:</strong> ${descricao}</li>
            <li><strong>Cidade:</strong> ${cidade}</li>
          </ul>
          <p><a href="${import.meta.env.PUBLIC_SITE_URL}/painel">Acessar painel</a></p>
        `,
      });
    }
  } catch (emailError) {
    console.error('Erro ao enviar e-mail:', emailError);
  }

  return new Response(JSON.stringify({ success: true, lead }), { status: 201 });
};
