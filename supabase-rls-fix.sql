-- Correção das políticas RLS
-- Execute no SQL Editor do Supabase

-- 1. Remover política restritiva de profissionais
DROP POLICY IF EXISTS "profissional_lê_proprio" ON profissionais;

-- 2. Política pública — qualquer um pode VER profissionais ativos
CREATE POLICY "profissionais_publicos" ON profissionais
  FOR SELECT USING (status = 'ativo');

-- 3. Profissional pode atualizar só o próprio perfil
CREATE POLICY "profissional_atualiza_proprio" ON profissionais
  FOR UPDATE USING (email = auth.jwt() ->> 'email');

-- 4. Service role pode inserir (usado pela API de cadastro)
CREATE POLICY "service_insere_profissional" ON profissionais
  FOR INSERT WITH CHECK (TRUE);

-- 5. Garantir que leads podem ser inseridos publicamente
DROP POLICY IF EXISTS "cliente_cria_lead" ON leads;
CREATE POLICY "cliente_cria_lead" ON leads
  FOR INSERT WITH CHECK (TRUE);

-- 6. Profissional vê só os próprios leads
DROP POLICY IF EXISTS "profissional_lê_leads" ON leads;
CREATE POLICY "profissional_lê_leads" ON leads
  FOR SELECT USING (
    profissional_id IN (
      SELECT id FROM profissionais WHERE email = auth.jwt() ->> 'email'
    )
  );

-- 7. Avaliações públicas para leitura
DROP POLICY IF EXISTS "avaliacoes_publicas" ON avaliacoes;
CREATE POLICY "avaliacoes_publicas" ON avaliacoes
  FOR SELECT USING (is_published = TRUE);

-- 8. Habilitar RLS na tabela clientes também
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clientes_inserem" ON clientes
  FOR INSERT WITH CHECK (TRUE);
