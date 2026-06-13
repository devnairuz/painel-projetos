import {
  LayoutDashboard,
  FolderKanban,
  BarChart3,
  Building2,
  Users,
  AlertCircle,
  UserRoundCheck,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  /** Chave de contador dinâmico (badge), opcional. */
  badge?: 'projects'
  /** Módulo ainda não implementado (stub). */
  soon?: boolean
  /** Visível apenas para administradores. */
  adminOnly?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard },
  { label: 'Minha visão', to: '/minha-visao', icon: UserRoundCheck },
  { label: 'Projetos', to: '/projetos', icon: FolderKanban, badge: 'projects' },
  { label: 'Pendências', to: '/pendencias', icon: AlertCircle },
  { label: 'Organizações', to: '/organizacoes', icon: Building2 },
  { label: 'Usuários', to: '/usuarios', icon: Users, adminOnly: true },
  { label: 'Relatórios', to: '/relatorios', icon: BarChart3 },
]
