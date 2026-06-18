import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileTopNav } from '@/components/layout/MobileTopNav'
import { NotificationBell } from '@/components/layout/NotificationBell'
import { ToastProvider } from '@/components/ui/Toast'
import { LiquidGlassDefs } from '@/components/ui/LiquidGlassDefs'

/**
 * Casca da aplicação. Desktop: sidebar lateral fixa + barra de notificações.
 * Mobile: menu no topo (sidebar oculta), liberando a largura total da tela.
 */
export function AppShell() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <ToastProvider>
      <LiquidGlassDefs />
      <div className="fixed inset-0 flex overflow-hidden bg-surface">
        {/* Sidebar lateral apenas no desktop */}
        <div className="hidden md:flex">
          <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        </div>
        <main className="min-w-0 flex-1 overflow-y-auto">
          {/* Menu no topo apenas no mobile */}
          <MobileTopNav />
          {/* Barra de notificações apenas no desktop */}
          <div className="sticky top-0 z-30 hidden justify-end border-b border-slate-200 bg-surface px-6 py-2 md:flex">
            <NotificationBell />
          </div>
          <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8 lg:px-10">
            <Outlet />
          </div>
        </main>
      </div>
    </ToastProvider>
  )
}
