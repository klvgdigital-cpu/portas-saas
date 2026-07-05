import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const POST: APIRoute = async ({ request }) => {
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

    const body = await request.json();
    const { nome, whatsapp, cpf_cnpj, descricao, cidade, estado, tipos_porta, anos_experiencia, foto_base64 } = body;

    // Validação server-side de CPF/CNPJ (dígitos verificadores)
    if (cpf_cnpj) {
      const d = String(cpf_cnpj).replace(/\D/g, '');
      const cpfOk = (c: string) => {
        if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
        let s = 0; for (let i = 0; i < 9; i++) s += parseInt(c[i]) * (10 - i);
        let r = (s * 10) % 11; if (r === 10) r = 0;
        if (r !== parseInt(c[9])) return false;
        s = 0; for (let i = 0; i < 10; i++) s += parseInt(c[i]) * (11 - i);
        r = (s * 10) % 11; if (r === 10) r = 0;
        return r === parseInt(c[10]);
      };
      const cnpjOk = (c: string) => {
        if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;
        const calc = (base: string, pesos: number[]) => {
          const s = base.split('').reduce((acc, n, i) => acc + parseInt(n) * pesos[i], 0);
          const r = s % 11; return r < 2 ? 0 : 11 - r;
        };
        return calc(c.slice(0, 12), [5,4,3,2,9,8,7,6,5,4,3,2]) === parseInt(c[12])
            && calc(c.slice(0, 13), [6,5,4,3,2,9,8,7,6,5,4,3,2]) === parseInt(c[13]);
      };
      if (!(d.length === 11 ? cpfOk(d) : d.length === 14 ? cnpjOk(d) : false)) {
        return new Response(JSON.stringify({ error: 'CPF/CNPJ inválido' }), { status: 400 });
      }
    }

    const updates: Record<string, any> = {};
    if (nome !== undefined) updates.nome = nome;
    if (whatsapp !== undefined) updates.whatsapp = whatsapp;
    if (cpf_cnpj !== undefined) updates.cpf_cnpj = cpf_cnpj;
    if (descricao !== undefined) updates.descricao = descricao;
    if (cidade !== undefined) updates.cidade = cidade;
    if (estado !== undefined) updates.estado = estado;
    if (tipos_porta !== undefined) updates.tipos_porta = tipos_porta;
    if (anos_experiencia !== undefined) updates.anos_experiencia = Number(anos_experiencia) || 1;

    // Upload de foto (base64) para o Supabase Storage
    if (foto_base64) {
      const matches = foto_base64.match(/^data:(image\/(png|jpe?g|webp));base64,(.+)$/);
      if (!matches) {
        return new Response(JSON.stringify({ error: 'Formato de imagem inválido. Use JPG, PNG ou WebP.' }), { status: 400 });
      }
      const mimeType = matches[1];
      const ext = matches[2] === 'jpeg' ? 'jpg' : matches[2];
      const buffer = Buffer.from(matches[3], 'base64');

      if (buffer.length > 3 * 1024 * 1024) {
        return new Response(JSON.stringify({ error: 'Imagem muito grande (máx. 3MB)' }), { status: 400 });
      }

      const filePath = `${user.id}/perfil.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('fotos-perfil')
        .upload(filePath, buffer, { contentType: mimeType, upsert: true });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return new Response(JSON.stringify({ error: 'Erro ao enviar foto: ' + uploadError.message }), { status: 500 });
      }

      const { data: publicUrl } = supabase.storage.from('fotos-perfil').getPublicUrl(filePath);
      updates.foto_url = publicUrl.publicUrl + '?t=' + Date.now();
    }

    if (Object.keys(updates).length === 0) {
      return new Response(JSON.stringify({ error: 'Nada para atualizar' }), { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('profissionais')
      .update(updates)
      .eq('email', user.email);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true, foto_url: updates.foto_url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
