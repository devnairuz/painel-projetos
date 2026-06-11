import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { ToastProvider } from '@/components/ui/Toast'

/**
 * Casca da aplicação: sidebar fixa + área de conteúdo rolável.
 * Envolve tudo no ToastProvider para feedback global.
 */
export function AppShell() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden bg-surface">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
            <Outlet />
          </div>
        </main>
      </div>
    </ToastProvider>
  )
}
