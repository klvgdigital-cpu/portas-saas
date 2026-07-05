export interface Profissional {
  id: string;
  slug: string;
  nome: string;
  email: string;
  whatsapp: string;
  foto_url: string;
  descricao: string;
  cidade: string;
  estado: string;
  tipos_porta: 'automatica' | 'manual' | 'ambas';
  anos_experiencia: number;
  portfolio_urls: string[];
  plano: 'basico' | 'pro';
  status: 'ativo' | 'pendente' | 'suspenso';
  leads_mes_atual: number;
  avaliacao_media: number;
  total_avaliacoes: number;
  created_at: string;
}

export interface Lead {
  id: string;
  profissional_id: string;
  nome_cliente: string;
  telefone_cliente: string;
  email_cliente: string;
  tipo_servico: string;
  descricao_problema: string;
  cidade: string;
  data_preferida?: string;
  status: 'novo' | 'visualizado' | 'respondido' | 'concluido';
  created_at: string;
}

export interface Avaliacao {
  id: string;
  profissional_id: string;
  nome_cliente: string;
  cidade_cliente: string;
  nota: number;
  comentario: string;
  created_at: string;
}

export interface Plano {
  id: 'basico' | 'pro';
  nome: string;
  preco: number;
  descricao: string;
  features: string[];
  destaque: boolean;
  gateway_price_id: string;
}

export const PLANOS: Plano[] = [
  {
    id: 'basico',
    nome: 'Plano Básico',
    preco: 79,
    descricao: 'Ideal para começar a receber clientes',
    features: [
      'Perfil completo na plataforma',
      'Até 10 leads por mês',
      'Foto e portfólio',
      'Área de atuação por cidade',
      'Avaliações de clientes',
    ],
    destaque: false,
    gateway_price_id: 'price_basico_mensal',
  },
  {
    id: 'pro',
    nome: 'Plano Pro',
    preco: 149,
    descricao: 'Para profissionais que querem crescer',
    features: [
      'Tudo do Plano Básico',
      'Leads ilimitados',
      'Destaque no topo da busca',
      'Selo "Verificado" no perfil',
      'Agendamento online ativado',
      'Painel de métricas avançado',
    ],
    destaque: true,
    gateway_price_id: 'price_pro_mensal',
  },
];

// Dados mock para desenvolvimento
export const PROFISSIONAIS_MOCK: Profissional[] = [
  {
    id: '1',
    slug: 'carlos-mendonca-sp',
    nome: 'Carlos Mendonça',
    email: 'carlos@exemplo.com',
    whatsapp: '11999990001',
    foto_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=carlos',
    descricao: 'Especialista em portas de enrolar automáticas e manuais com mais de 12 anos de experiência. Atendo residências, comércios e indústrias em toda a Grande São Paulo.',
    cidade: 'São Paulo',
    estado: 'SP',
    tipos_porta: 'ambas',
    anos_experiencia: 12,
    portfolio_urls: [],
    plano: 'pro',
    status: 'ativo',
    leads_mes_atual: 23,
    avaliacao_media: 4.9,
    total_avaliacoes: 87,
    created_at: '2023-01-15',
  },
  {
    id: '2',
    slug: 'roberto-teixeira-bh',
    nome: 'Roberto Teixeira',
    email: 'roberto@exemplo.com',
    whatsapp: '31999990002',
    foto_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=roberto',
    descricao: 'Técnico especializado em automação de portões e portas de enrolar. Atendo Belo Horizonte e região metropolitana com garantia em todos os serviços.',
    cidade: 'Belo Horizonte',
    estado: 'MG',
    tipos_porta: 'automatica',
    anos_experiencia: 8,
    portfolio_urls: [],
    plano: 'pro',
    status: 'ativo',
    leads_mes_atual: 18,
    avaliacao_media: 4.8,
    total_avaliacoes: 54,
    created_at: '2023-03-10',
  },
  {
    id: '3',
    slug: 'fernanda-azevedo-curitiba',
    nome: 'Fernanda Azevedo',
    email: 'fernanda@exemplo.com',
    whatsapp: '41999990003',
    foto_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=fernanda',
    descricao: 'Serralheira com especialização em portas manuais de aço. Reparos, molas, travas e instalações completas em Curitiba e região.',
    cidade: 'Curitiba',
    estado: 'PR',
    tipos_porta: 'manual',
    anos_experiencia: 6,
    portfolio_urls: [],
    plano: 'basico',
    status: 'ativo',
    leads_mes_atual: 7,
    avaliacao_media: 4.7,
    total_avaliacoes: 31,
    created_at: '2023-06-20',
  },
  {
    id: '4',
    slug: 'lucas-andrade-rio',
    nome: 'Lucas Andrade',
    email: 'lucas@exemplo.com',
    whatsapp: '21999990004',
    foto_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lucas',
    descricao: 'Instalação e manutenção de portas de enrolar para comércios no Rio de Janeiro. Atendimento rápido e preços competitivos.',
    cidade: 'Rio de Janeiro',
    estado: 'RJ',
    tipos_porta: 'ambas',
    anos_experiencia: 10,
    portfolio_urls: [],
    plano: 'pro',
    status: 'ativo',
    leads_mes_atual: 15,
    avaliacao_media: 4.6,
    total_avaliacoes: 42,
    created_at: '2023-02-28',
  },
  {
    id: '5',
    slug: 'mario-silva-salvador',
    nome: 'Mário Silva',
    email: 'mario@exemplo.com',
    whatsapp: '71999990005',
    foto_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mario',
    descricao: 'Especialista em manutenção preventiva e corretiva de portas automáticas. Atendo Salvador, Lauro de Freitas e Camaçari.',
    cidade: 'Salvador',
    estado: 'BA',
    tipos_porta: 'automatica',
    anos_experiencia: 9,
    portfolio_urls: [],
    plano: 'basico',
    status: 'ativo',
    leads_mes_atual: 6,
    avaliacao_media: 4.5,
    total_avaliacoes: 28,
    created_at: '2023-08-05',
  },
  {
    id: '6',
    slug: 'ana-beatriz-porto-alegre',
    nome: 'Ana Beatriz Lima',
    email: 'ana@exemplo.com',
    whatsapp: '51999990006',
    foto_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=anabeatriz',
    descricao: 'Técnica em automação de portões e portas de enrolar. Atendo Porto Alegre e Grande Porto Alegre com garantia de 12 meses.',
    cidade: 'Porto Alegre',
    estado: 'RS',
    tipos_porta: 'ambas',
    anos_experiencia: 7,
    portfolio_urls: [],
    plano: 'pro',
    status: 'ativo',
    leads_mes_atual: 12,
    avaliacao_media: 4.9,
    total_avaliacoes: 39,
    created_at: '2023-04-12',
  },
];

export const AVALIACOES_MOCK: Avaliacao[] = [
  { id: '1', profissional_id: '1', nome_cliente: 'Patrícia Souza', cidade_cliente: 'São Paulo, SP', nota: 5, comentario: 'Serviço impecável! Carlos chegou no horário, resolveu o problema da mola em menos de 1 hora. Preço justo e garantia. Recomendo demais!', created_at: '2024-02-10' },
  { id: '2', profissional_id: '1', nome_cliente: 'José Almeida', cidade_cliente: 'Guarulhos, SP', nota: 5, comentario: 'Excelente profissional. Instalou a porta automática na minha loja com perfeição. Super atencioso e explicou todo o processo.', created_at: '2024-01-22' },
  { id: '3', profissional_id: '1', nome_cliente: 'Renata Costa', cidade_cliente: 'São Bernardo, SP', nota: 4, comentario: 'Bom serviço, veio rápido e resolveu. Só achei o preço um pouco acima do esperado, mas a qualidade compensa.', created_at: '2023-12-15' },
];
