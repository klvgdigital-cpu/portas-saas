-- PortaFácil — Schema SQL para Supabase
-- Execute este arquivo no SQL Editor do Supabase

-- Profissionais
CREATE TABLE profissionais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  cpf_cnpj TEXT,
  whatsapp TEXT NOT NULL,
  foto_url TEXT,
  descricao TEXT NOT NULL,
  cidade TEXT NOT NULL,
  estado CHAR(2) NOT NULL,
  tipos_porta TEXT CHECK (tipos_porta IN ('automatica', 'manual', 'ambas')) DEFAULT 'ambas',
  anos_experiencia INT DEFAULT 1,
  portfolio_urls TEXT[] DEFAULT '{}',
  plano TEXT CHECK (plano IN ('basico', 'pro')) DEFAULT 'basico',
  status TEXT CHECK (status IN ('ativo', 'pendente', 'suspenso')) DEFAULT 'pendente',
  leads_mes_atual INT DEFAULT 0,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clientes
CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  cep TEXT,
  cidade TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leads
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profissional_id UUID REFERENCES profissionais(id) ON DELETE CASCADE,
  nome_cliente TEXT NOT NULL,
  telefone_cliente TEXT NOT NULL,
  cidade TEXT,
  tipo_servico TEXT NOT NULL,
  descricao TEXT,
  data_preferida DATE,
  status TEXT CHECK (status IN ('novo', 'visualizado', 'respondido', 'concluido')) DEFAULT 'novo',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Avaliações
CREATE TABLE avaliacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profissional_id UUID REFERENCES profissionais(id) ON DELETE CASCADE,
  nome_cliente TEXT NOT NULL,
  nota INT CHECK (nota BETWEEN 1 AND 5) NOT NULL,
  comentario TEXT,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security)
ALTER TABLE profissionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE avaliacoes ENABLE ROW LEVEL SECURITY;

-- Profissional lê só o próprio perfil
CREATE POLICY "profissional_lê_proprio" ON profissionais
  FOR SELECT USING (email = auth.jwt() ->> 'email');

-- Profissional lê só os próprios leads
CREATE POLICY "profissional_lê_leads" ON leads
  FOR SELECT USING (
    profissional_id = (
      SELECT id FROM profissionais WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Clientes podem criar leads (público)
CREATE POLICY "cliente_cria_lead" ON leads
  FOR INSERT WITH CHECK (TRUE);

-- Avaliações são públicas para leitura
CREATE POLICY "avaliacoes_publicas" ON avaliacoes
  FOR SELECT USING (is_published = TRUE);

-- Índices de performance
CREATE INDEX idx_profissionais_cidade ON profissionais (cidade);
CREATE INDEX idx_profissionais_estado ON profissionais (estado);
CREATE INDEX idx_profissionais_plano ON profissionais (plano);
CREATE INDEX idx_profissionais_status ON profissionais (status);
CREATE INDEX idx_leads_profissional ON leads (profissional_id);
CREATE INDEX idx_avaliacoes_profissional ON avaliacoes (profissional_id);

-- Função para zerar leads mensais (rodar via cron todo dia 1)
CREATE OR REPLACE FUNCTION zerar_leads_mensais()
RETURNS VOID AS $$
  UPDATE profissionais SET leads_mes_atual = 0;
$$ LANGUAGE SQL;
