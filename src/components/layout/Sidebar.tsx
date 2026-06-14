import { NavLink } from 'react-router-dom'
import { ChevronLeft, ExternalLink, LogOut } from 'lucide-react'
import { NAV_ITEMS } from '@/constants/nav'
import { useProjects } from '@/hooks/useProjects'
import { useCompanyAuth } from '@/hooks/useCompanyAuth'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/utils/cn'
import { Logo } from './Logo'

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
      className={cn(
        'relative z-40 flex h-screen flex-col bg-gradient-to-b from-red-600 to-red-700 text-slate-200 transition-all duration-300',
        collapsed ? 'w-20' : 'w-64',
      )}
    >
      {/* Cabeçalho / logo */}
      <div className="flex items-center justify-between px-5 pt-6 pb-5">
        <Logo collapsed={collapsed} />
      </div>

      {/* Botão de colapsar */}
      <button
        onClick={onToggle}
        aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        className="absolute -right-3 top-7 flex size-7 items-center justify-center rounded-full bg-accent-500 text-white shadow-md transition-transform hover:scale-105"
      >
        <ChevronLeft className={cn('size-4 transition-transform', collapsed && 'rotate-180')} />
      </button>

      {/* Navegação */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
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
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-slate-300/80 hover:bg-white/5 hover:text-white',
                  collapsed && 'justify-center',
                )
              }
              title={collapsed ? item.label : undefined}
            >
              <Icon className="size-5 shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 truncate">{item.label}</span>
                  {badgeValue !== undefined && badgeValue > 0 && (
                    <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold text-white">
                      {badgeValue}
                    </span>
                  )}
                  {item.soon && (
                    <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                      em breve
                    </span>
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Atalho: portal do cliente */}
      <div className="px-3 pb-1">
        <a
          href="/cliente/login"
          target="_blank"
          rel="noreferrer"
          className={cn(
            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300/70 transition-colors hover:bg-white/5 hover:text-white',
            collapsed && 'justify-center',
          )}
          title="Abrir portal do cliente"
        >
          <ExternalLink className="size-5 shrink-0" />
          {!collapsed && <span className="flex-1 truncate">Portal do cliente</span>}
        </a>
      </div>

      {/* Rodapé / usuário logado */}
      <div className="border-t border-white/10 p-3">
        <div className={cn('flex items-center gap-3 rounded-xl px-2 py-2', collapsed && 'justify-center')}>
          <Avatar name={user?.name ?? 'Nairuz'} color="#14b885" />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{user?.name ?? 'Usuário'}</p>
              <p className="truncate text-xs text-slate-400">
                {user?.role === 'admin' ? 'Admin' : 'Membro'} · Nairuz
              </p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={logout}
              title="Sair"
              aria-label="Sair"
              className="text-slate-400 transition-colors hover:text-white"
            >
              <LogOut className="size-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
