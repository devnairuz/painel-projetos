import { NavLink } from 'react-router-dom'
import { ChevronLeft, ExternalLink, LogOut } from 'lucide-react'
import { NAV_ITEMS } from '@/constants/nav'
import { useProjects } from '@/hooks/useProjects'
import { useCompanyAuth } from '@/hooks/useCompanyAuth'
import { Avatar } from '@/components/ui/Avatar'
import { Logo } from '@/components/layout/Logo'
import { cn } from '@/utils/cn'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

/** Sidebar azul-profundo, colapsável, com branding Nairuz e navegação. */
export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { data: projects } = useProjects()
  const projectCount = projects?.length ?? 0
  const { user, logout } = useCompanyAuth()

  return (
    <aside
      aria-label="Menu lateral"
      className={cn(
        'relative z-40 flex h-dvh shrink-0 flex-col border-r border-white/10 bg-gradient-to-b from-navy-900 to-navy-950 text-slate-200 shadow-xl shadow-navy-950/10 transition-[width] duration-300',
        collapsed ? 'w-[4.75rem]' : 'w-[17rem]',
      )}
    >
      {/* Cabeçalho / logo */}
      <div
        className={cn(
          'flex min-h-20 items-center border-b border-white/8 px-5',
          collapsed && 'justify-center px-3',
        )}
      >
        <NavLink
          to="/"
          aria-label="Ir para o Dashboard"
          className="rounded-lg focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900 focus-visible:outline-none"
        >
          <Logo collapsed={collapsed} />
        </NavLink>
      </div>

      {/* Botão de colapsar */}
      <button
        type="button"
        onClick={onToggle}
        aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        aria-expanded={!collapsed}
        aria-controls="navegacao-lateral"
        className="absolute top-6 -right-4 z-10 flex size-8 cursor-pointer items-center justify-center rounded-full border-2 border-surface bg-accent-500 text-white shadow-md transition-[background-color,transform] hover:scale-105 hover:bg-navy-800 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        <ChevronLeft
          aria-hidden="true"
          className={cn('size-4 transition-transform', collapsed && 'rotate-180')}
        />
      </button>

      {/* Navegação */}
      <nav
        id="navegacao-lateral"
        aria-label="Navegação principal"
        className="flex-1 space-y-1 overflow-y-auto px-3 py-4"
      >
        {!collapsed && (
          <p className="px-3 pb-2 text-[10px] font-semibold tracking-[0.16em] text-slate-400 uppercase">
            Navegação
          </p>
        )}
        {NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === 'admin').map((item) => {
          const Icon = item.icon
          const badgeValue = item.badge === 'projects' ? projectCount : undefined
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'group relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-[color,background-color,box-shadow]',
                  'focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900 focus-visible:outline-none',
                  isActive
                    ? 'bg-white/12 text-white shadow-sm ring-1 ring-white/10 before:absolute before:left-0 before:h-5 before:w-1 before:rounded-r-full before:bg-brand-400'
                    : 'text-slate-300 hover:bg-white/6 hover:text-white',
                  collapsed && 'justify-center px-2',
                )
              }
              title={collapsed ? item.label : undefined}
            >
              <Icon aria-hidden="true" className="size-5 shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 truncate">{item.label}</span>
                  {badgeValue !== undefined && badgeValue > 0 && (
                    <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold text-white">
                      {badgeValue}
                    </span>
                  )}
                  {item.soon && (
                    <span className="rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-slate-300">
                      Em breve
                    </span>
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Atalho: portal do cliente */}
      <div className="border-t border-white/8 px-3 pt-3 pb-2">
        {!collapsed && (
          <p className="px-3 pb-1.5 text-[10px] font-semibold tracking-[0.16em] text-slate-400 uppercase">
            Atalhos
          </p>
        )}
        <a
          href="/cliente/login"
          target="_blank"
          rel="noreferrer"
          className={cn(
            'flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/6 hover:text-white',
            'focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900 focus-visible:outline-none',
            collapsed && 'justify-center px-2',
          )}
          title={collapsed ? 'Abrir portal do cliente' : undefined}
        >
          <ExternalLink aria-hidden="true" className="size-5 shrink-0" />
          {!collapsed && <span className="flex-1 truncate">Portal do cliente</span>}
          {!collapsed && <span className="sr-only">(abre em uma nova aba)</span>}
        </a>
      </div>

      {/* Rodapé / usuário logado */}
      <div className="border-t border-white/10 p-3">
        <div
          className={cn(
            'flex items-center gap-3 rounded-xl bg-white/[0.04] px-2 py-2',
            collapsed && 'flex-col justify-center gap-1.5 px-1',
          )}
        >
          <Avatar name={user?.name ?? 'Nairuz'} color="#14b885" />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{user?.name ?? 'Usuário'}</p>
              <p className="truncate text-xs text-slate-400">
                {user?.role === 'admin' ? 'Admin' : 'Membro'} · Nairuz
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={logout}
            title="Sair da conta"
            aria-label="Sair da conta"
            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none"
          >
            <LogOut aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
