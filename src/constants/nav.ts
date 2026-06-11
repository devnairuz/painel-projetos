import {
  LayoutDashboard,
  FolderKanban,
  Ticket,
  BellRing,
  CheckCircle2,
  BarChart3,
  Building2,
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
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard },
  { label: 'Projetos', to: '/projetos', icon: FolderKanban, badge: 'projects' },
  { label: 'Chamados', to: '/chamados', icon: Ticket, soon: true },
  { label: 'Cobranças', to: '/cobrancas', icon: BellRing, soon: true },
  { label: 'Aprovações', to: '/aprovacoes', icon: CheckCircle2, soon: true },
  { label: 'Organizações', to: '/organizacoes', icon: Building2 },
  { label: 'Relatórios', to: '/relatorios', icon: BarChart3, soon: true },
]
