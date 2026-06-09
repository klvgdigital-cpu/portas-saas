import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profissional = {
  id: string;
  slug: string;
  nome: string;
  email: string;
  whatsapp: string;
  foto_url: string | null;
  descricao: string;
  cidade: string;
  estado: string;
  tipos_porta: 'automatica' | 'manual' | 'ambas';
  anos_experiencia: number;
  portfolio_urls: string[];
  plano: 'basico' | 'pro';
  status: 'ativo' | 'pendente' | 'suspenso';
  leads_mes_atual: number;
  created_at: string;
};

export type Lead = {
  id: string;
  profissional_id: string;
  nome_cliente: string;
  telefone_cliente: string;
  cidade: string;
  tipo_servico: string;
  descricao: string;
  data_preferida: string | null;
  status: 'novo' | 'visualizado' | 'respondido' | 'concluido';
  created_at: string;
};

export type Avaliacao = {
  id: string;
  profissional_id: string;
  nome_cliente: string;
  nota: number;
  comentario: string;
  created_at: string;
};

export async function getProfissionais(filters?: {
  cidade?: string;
  estado?: string;
  tipos_porta?: string;
}) {
  let query = supabase
    .from('profissionais')
    .select('*')
    .eq('status', 'ativo')
    .order('plano', { ascending: false })
    .order('created_at', { ascending: false });

  if (filters?.cidade) query = query.ilike('cidade', `%${filters.cidade}%`);
  if (filters?.estado) query = query.eq('estado', filters.estado);
  if (filters?.tipos_porta && filters.tipos_porta !== 'todos') {
    query = query.in('tipos_porta', [filters.tipos_porta, 'ambas']);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Profissional[];
}

export async function getProfissionalBySlug(slug: string) {
  const { data, error } = await supabase
    .from('profissionais')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'ativo')
    .single();
  if (error) throw error;
  return data as Profissional;
}

export async function getAvaliacoes(profissionalId: string) {
  const { data, error } = await supabase
    .from('avaliacoes')
    .select('*')
    .eq('profissional_id', profissionalId)
    .eq('is_published', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Avaliacao[];
}

export async function criarLead(lead: Omit<Lead, 'id' | 'status' | 'created_at'>) {
  const { data, error } = await supabase
    .from('leads')
    .insert({ ...lead, status: 'novo' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getDestaques(limit = 6) {
  const { data, error } = await supabase
    .from('profissionais')
    .select('*')
    .eq('status', 'ativo')
    .eq('plano', 'pro')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as Profissional[];
}
