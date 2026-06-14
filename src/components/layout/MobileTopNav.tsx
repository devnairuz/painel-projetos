import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { ExternalLink, LogOut, Menu, X } from 'lucide-react'
import { NAV_ITEMS } from '@/constants/nav'
import { useProjects } from '@/hooks/useProjects'
import { useCompanyAuth } from '@/hooks/useCompanyAuth'
import { Avatar } from '@/components/ui/Avatar'
import { NotificationBell } from '@/components/layout/NotificationBell'
import { cn } from '@/utils/cn'
import { Logo } from './Logo'

/**
 * Barra de navegação no topo, exclusiva para mobile. Mantém o conteúdo com
 * largura total (a sidebar lateral fica oculta) e abre o menu em um painel
 * sobreposto ao tocar no botão.
 */
export function MobileTopNav() {
  const [open, setOpen] = useState(false)
  const { data: projects } = useProjects()
  const projectCount = projects?.length ?? 0
  const { user, logout } = useCompanyAuth()

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-surface md:hidden">
      <div className="flex items-center justify-between px-4 py-2.5">
        <Logo tone="dark" />
        <div className="flex items-center gap-1">
          <NotificationBell />
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={open}
            className="flex size-10 items-center justify-center rounded-xl text-navy-900 transition-colors hover:bg-slate-100"
          >
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>

      {open && (
        <>
          {/* Backdrop para fechar ao tocar fora */}
          <button
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 top-[57px] z-30 bg-black/30"
          />

          {/* Painel deslizante com a navegação */}
          <nav className="absolute inset-x-0 top-full z-40 max-h-[80vh] space-y-1 overflow-y-auto border-b border-slate-200 bg-gradient-to-b from-navy-900 to-navy-950 px-3 py-3 text-slate-200 shadow-xl">
            {NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === 'admin').map((item) => {
              const Icon = item.icon
              const badgeValue = item.badge === 'projects' ? projectCount : undefined
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-white/10 text-white shadow-sm'
                        : 'text-slate-300/80 hover:bg-white/5 hover:text-white',
                    )
                  }
                >
                  <Icon className="size-5 shrink-0" />
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
                </NavLink>
              )
            })}

            {/* Atalho: portal do cliente */}
            <a
              href="/cliente/login"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-300/70 transition-colors hover:bg-white/5 hover:text-white"
            >
              <ExternalLink className="size-5 shrink-0" />
              <span className="flex-1 truncate">Portal do cliente</span>
            </a>

            {/* Rodapé / usuário logado */}
            <div className="mt-1 flex items-center gap-3 border-t border-white/10 px-2 pt-3">
              <Avatar name={user?.name ?? 'Nairuz'} color="#14b885" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{user?.name ?? 'Usuário'}</p>
                <p className="truncate text-xs text-slate-400">
                  {user?.role === 'admin' ? 'Admin' : 'Membro'} · Nairuz
                </p>
              </div>
              <button
                onClick={logout}
                title="Sair"
                aria-label="Sair"
                className="text-slate-400 transition-colors hover:text-white"
              >
                <LogOut className="size-5" />
              </button>
            </div>
          </nav>
        </>
      )}
    </header>
  )
}
