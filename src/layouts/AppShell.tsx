import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { NotificationBell } from '@/components/layout/NotificationBell'
import { ToastProvider } from '@/components/ui/Toast'

/**
 * Casca da aplicação: sidebar fixa + barra superior (notificações) + conteúdo.
 */
export function AppShell() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden bg-surface">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        <main className="flex-1 overflow-y-auto">
          <div className="sticky top-0 z-30 flex justify-end border-b border-slate-200 bg-surface px-6 py-2">
            <NotificationBell />
          </div>
          <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
            <Outlet />
          </div>
        </main>
      </div>
    </ToastProvider>
  )
}
