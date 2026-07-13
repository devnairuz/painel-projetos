import { useEffect, useId, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { ExternalLink, LogOut, Menu, X } from 'lucide-react'
import { NAV_ITEMS } from '@/constants/nav'
import { useProjects } from '@/hooks/useProjects'
import { useCompanyAuth } from '@/hooks/useCompanyAuth'
import { Avatar } from '@/components/ui/Avatar'
import { Logo } from '@/components/layout/Logo'
import { NotificationBell } from '@/components/layout/NotificationBell'
import { cn } from '@/utils/cn'

/**
 * Barra de navegação no topo, exclusiva para mobile. Mantém o conteúdo com
 * largura total (a sidebar lateral fica oculta) e abre o menu em um painel
 * sobreposto ao tocar no botão.
 */
export function MobileTopNav() {
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const menuRef = useRef<HTMLElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const { data: projects } = useProjects()
  const projectCount = projects?.length ?? 0
  const { user, logout } = useCompanyAuth()

  useEffect(() => {
    if (!open) return
    const frame = window.requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLElement>('a, button')?.focus()
    })
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('keydown', handleKeyDown)
      toggleRef.current?.focus()
    }
  }, [open])

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm shadow-slate-950/5 backdrop-blur md:hidden">
      <div className="flex min-h-16 items-center justify-between px-4">
        <NavLink
          to="/"
          aria-label="Ir para o Dashboard"
          className="rounded-lg focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <Logo tone="dark" />
        </NavLink>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <button
            ref={toggleRef}
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={open}
            aria-controls={menuId}
            className="flex size-11 cursor-pointer items-center justify-center rounded-xl text-navy-900 transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
          >
            {open ? (
              <X aria-hidden="true" className="size-6" />
            ) : (
              <Menu aria-hidden="true" className="size-6" />
            )}
          </button>
        </div>
      </div>

      {open && (
        <>
          {/* Backdrop para fechar ao tocar fora */}
          <div
            aria-hidden="true"
            onClick={() => setOpen(false)}
            className="fixed inset-0 top-16 z-30 bg-slate-950/40 backdrop-blur-[1px]"
          />

          {/* Painel deslizante com a navegação */}
          <nav
            ref={menuRef}
            id={menuId}
            aria-label="Navegação principal"
            className="absolute inset-x-0 top-full z-40 max-h-[calc(100dvh-4rem)] space-y-1 overflow-y-auto border-b border-white/10 bg-gradient-to-b from-navy-900 to-navy-950 px-3 py-4 text-slate-200 shadow-2xl shadow-slate-950/30"
          >
            <p className="px-3 pb-2 text-[10px] font-semibold tracking-[0.16em] text-slate-400 uppercase">
              Navegação
            </p>
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
                      'group relative flex min-h-12 items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors',
                      'focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900 focus-visible:outline-none',
                      isActive
                        ? 'bg-white/12 text-white shadow-sm ring-1 ring-white/10 before:absolute before:left-0 before:h-5 before:w-1 before:rounded-r-full before:bg-brand-400'
                        : 'text-slate-300 hover:bg-white/6 hover:text-white',
                    )
                  }
                >
                  <Icon aria-hidden="true" className="size-5 shrink-0" />
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
                </NavLink>
              )
            })}

            {/* Atalho: portal do cliente */}
            <a
              href="/cliente/login"
              target="_blank"
              rel="noreferrer"
              className="flex min-h-12 items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/6 hover:text-white focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900 focus-visible:outline-none"
            >
              <ExternalLink aria-hidden="true" className="size-5 shrink-0" />
              <span className="flex-1 truncate">Portal do cliente</span>
              <span className="sr-only">(abre em uma nova aba)</span>
            </a>

            {/* Rodapé / usuário logado */}
            <div className="mt-2 flex items-center gap-3 border-t border-white/10 px-2 pt-4 pb-1">
              <Avatar name={user?.name ?? 'Nairuz'} color="#14b885" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{user?.name ?? 'Usuário'}</p>
                <p className="truncate text-xs text-slate-400">
                  {user?.role === 'admin' ? 'Admin' : 'Membro'} · Nairuz
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  logout()
                }}
                title="Sair da conta"
                aria-label="Sair da conta"
                className="flex size-11 cursor-pointer items-center justify-center rounded-xl text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none"
              >
                <LogOut aria-hidden="true" className="size-5" />
              </button>
            </div>
          </nav>
        </>
      )}
    </header>
  )
}
