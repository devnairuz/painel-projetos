import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileTopNav } from '@/components/layout/MobileTopNav'
import { NotificationBell } from '@/components/layout/NotificationBell'
import { ToastProvider } from '@/components/ui/Toast'

/**
 * Casca da aplicação. Desktop: sidebar lateral fixa + barra de notificações.
 * Mobile: menu no topo (sidebar oculta), liberando a largura total da tela.
 */
export function AppShell() {
  const [collapsed, setCollapsed] = useState(false)
  const mainRef = useRef<HTMLElement>(null)
  const { pathname } = useLocation()

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname])

  return (
    <ToastProvider>
      <a
        href="#conteudo-principal"
        className="fixed top-3 left-3 z-[80] -translate-y-20 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white shadow-xl transition-transform focus:translate-y-0 focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 focus:outline-none"
      >
        Pular para o conteúdo
      </a>
      <div className="fixed inset-0 flex min-h-dvh overflow-hidden bg-surface">
        {/* Sidebar lateral apenas no desktop */}
        <div className="hidden shrink-0 md:flex">
          <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        </div>
        <main
          ref={mainRef}
          id="conteudo-principal"
          tabIndex={-1}
          className="min-w-0 flex-1 overflow-y-auto overscroll-y-contain focus:outline-none"
        >
          {/* Menu no topo apenas no mobile */}
          <MobileTopNav />
          {/* Barra de notificações apenas no desktop */}
          <header className="sticky top-0 z-30 hidden min-h-14 items-center justify-between border-b border-slate-200 bg-white/85 px-6 backdrop-blur md:flex lg:px-10">
            <div>
              <p className="text-xs font-semibold tracking-wide text-navy-900 uppercase">
                Portal de Implantação
              </p>
              <p className="text-[11px] text-slate-500">Visão interna Nairuz</p>
            </div>
            <NotificationBell />
          </header>
          <div className="mx-auto w-full max-w-[1536px] px-4 py-6 pb-10 md:px-6 md:py-8 md:pb-12 lg:px-10">
            <Outlet />
          </div>
        </main>
      </div>
    </ToastProvider>
  )
}
