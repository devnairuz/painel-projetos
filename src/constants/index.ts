import type {
  Platform,
  ProjectStatus,
  ProjectType,
  RiskLevel,
  PhaseStatus,
  MemberRole,
} from '@/types'

/**
 * Metadados de apresentação para cada enum: rótulo em PT-BR e classes
 * Tailwind para badges. Centralizar aqui garante consistência visual e
 * um único ponto de manutenção.
 */
export interface EnumMeta {
  label: string
  /** Classes para badge (bg + texto + borda). */
  badge: string
  /** Cor sólida (ponto/indicador), em hex. */
  dot: string
}

export const PLATFORM_META: Record<Platform, EnumMeta> = {
  vtex: { label: 'VTEX', badge: 'bg-pink-50 text-pink-700 border-pink-200', dot: '#db2777' },
  linx: { label: 'Linx', badge: 'bg-orange-50 text-orange-700 border-orange-200', dot: '#ea580c' },
  wake: { label: 'Wake', badge: 'bg-purple-50 text-purple-700 border-purple-200', dot: '#7c3aed' },
  tray: { label: 'Tray', badge: 'bg-sky-50 text-sky-700 border-sky-200', dot: '#0284c7' },
  woocommerce: { label: 'WooCommerce', badge: 'bg-violet-50 text-violet-700 border-violet-200', dot: '#6d28d9' },
  shopify: { label: 'Shopify', badge: 'bg-green-50 text-green-700 border-green-200', dot: '#16a34a' },
  kobe: { label: 'Kobe', badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: '#d97706' },
  outro: { label: 'Outro', badge: 'bg-slate-50 text-slate-700 border-slate-200', dot: '#475569' },
}

export const TYPE_META: Record<ProjectType, EnumMeta> = {
  implantacao: { label: 'Implantação', badge: 'bg-blue-50 text-blue-700 border-blue-200', dot: '#2563eb' },
  sustentacao: { label: 'Sustentação', badge: 'bg-teal-50 text-teal-700 border-teal-200', dot: '#0d9488' },
  evolucao: { label: 'Evolução', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: '#4f46e5' },
  cro: { label: 'CRO', badge: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200', dot: '#c026d3' },
  pontual: { label: 'Projeto Pontual', badge: 'bg-slate-50 text-slate-700 border-slate-200', dot: '#475569' },
}

export const STATUS_META: Record<ProjectStatus, EnumMeta> = {
  nao_iniciado: { label: 'Não iniciado', badge: 'bg-slate-100 text-slate-600 border-slate-200', dot: '#64748b' },
  em_andamento: { label: 'Em andamento', badge: 'bg-blue-50 text-blue-700 border-blue-200', dot: '#2563eb' },
  aguardando_cliente: { label: 'Aguardando cliente', badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: '#d97706' },
  aguardando_nairuz: { label: 'Aguardando Nairuz', badge: 'bg-orange-50 text-orange-700 border-orange-200', dot: '#ea580c' },
  aguardando_terceiro: { label: 'Aguardando terceiro', badge: 'bg-yellow-50 text-yellow-700 border-yellow-200', dot: '#ca8a04' },
  homologacao: { label: 'Em homologação', badge: 'bg-violet-50 text-violet-700 border-violet-200', dot: '#7c3aed' },
  qa: { label: 'Em QA', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: '#4f46e5' },
  pronto_go_live: { label: 'Pronto para go live', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: '#059669' },
  publicado: { label: 'Publicado', badge: 'bg-green-100 text-green-800 border-green-200', dot: '#16a34a' },
  pausado: { label: 'Pausado', badge: 'bg-zinc-100 text-zinc-600 border-zinc-200', dot: '#71717a' },
  cancelado: { label: 'Cancelado', badge: 'bg-red-50 text-red-700 border-red-200', dot: '#dc2626' },
  encerrado: { label: 'Encerrado', badge: 'bg-slate-100 text-slate-500 border-slate-200', dot: '#94a3b8' },
}

export const RISK_META: Record<RiskLevel, EnumMeta> = {
  baixo: { label: 'Baixo', badge: 'bg-green-50 text-green-700 border-green-200', dot: '#16a34a' },
  medio: { label: 'Médio', badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: '#d97706' },
  alto: { label: 'Alto', badge: 'bg-orange-50 text-orange-700 border-orange-200', dot: '#ea580c' },
  critico: { label: 'Crítico', badge: 'bg-red-50 text-red-700 border-red-200', dot: '#dc2626' },
}

export const PHASE_STATUS_META: Record<PhaseStatus, EnumMeta> = {
  nao_iniciada: { label: 'Não iniciada', badge: 'bg-slate-100 text-slate-600 border-slate-200', dot: '#94a3b8' },
  em_andamento: { label: 'Em andamento', badge: 'bg-blue-50 text-blue-700 border-blue-200', dot: '#2563eb' },
  aguardando_cliente: { label: 'Aguardando cliente', badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: '#d97706' },
  bloqueada: { label: 'Bloqueada', badge: 'bg-red-50 text-red-700 border-red-200', dot: '#dc2626' },
  concluida: { label: 'Concluída', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: '#059669' },
}

export const ROLE_META: Record<MemberRole, { label: string }> = {
  cs: { label: 'CS' },
  tech_lead: { label: 'Tech Lead' },
  designer: { label: 'Designer' },
  dev: { label: 'Desenvolvedor' },
  pm: { label: 'PM' },
  cliente: { label: 'Cliente' },
}

/** Fases padrão de uma implantação (espelha o spec). */
export const DEFAULT_PHASE_NAMES: readonly string[] = [
  'Kickoff e acessos',
  'Escopo e alinhamento',
  'Design e UX',
  'Desenvolvimento',
  'Catálogo e conteúdo',
  'Pagamentos',
  'Frete e logística',
  'Integrações',
  'SEO e tracking',
  'QA interno',
  'Homologação cliente',
  'Go live',
  'Acompanhamento pós-go live',
  'Encerramento técnico',
] as const
