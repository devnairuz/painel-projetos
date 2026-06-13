import { useMemo } from 'react'
import { Navigate, Outlet, Link } from 'react-router-dom'
import { LogOut, Star } from 'lucide-react'
import { useClientAuth } from '@/hooks/useClientAuth'
import { useClientProjects } from '@/hooks/useProjects'
import { useLookups } from '@/hooks/useLookups'
import { ToastProvider } from '@/components/ui/Toast'
import { Avatar } from '@/components/ui/Avatar'
import { Logo } from '@/components/layout/Logo'

/**
 * Casca do portal do cliente: barra superior com a marca Nairuz, sem o menu
 * administrativo. Protege as rotas — sem sessão, volta para o login.
 */
export function ClientShell() {
  const { user, logout } = useClientAuth()
  const { getOrg } = useLookups()
  const { data: clientProjects } = useClientProjects()

  // Carteira de pontos: soma dos pontos das etapas concluídas e visíveis em
  // todos os projetos do cliente (gamificação — troca por horas depois).
  const totalPoints = useMemo(
    () =>
      (clientProjects ?? []).reduce(
        (sum, p) =>
          sum +
          p.phases
            .filter((ph) => ph.clientVisible !== false && ph.status === 'concluida')
            .reduce((s, ph) => s + (ph.points ?? 0), 0),
        0,
      ),
    [clientProjects],
  )

  if (!user) {
    return <Navigate to="/cliente/login" replace />
  }

  const org = getOrg(user.organizationId)

  return (
    <ToastProvider>
      <div className="min-h-screen bg-surface">
        {/* Top bar */}
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
            <Link to="/cliente">
              <Logo tone="dark" />
            </Link>
            <div className="flex items-center gap-4">
              {/* Carteira de pontos (gamificação) */}
              <div
                className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5"
                title="Pontos acumulados — troque por horas de acompanhamento"
              >
                <Star className="size-4 text-amber-500" />
                <span className="text-sm font-bold text-amber-700">{totalPoints}</span>
                <span className="hidden text-xs font-medium text-amber-600 sm:inline">pontos</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-slate-800">{user.name}</div>
                <div className="text-xs text-slate-400">{org?.name ?? 'Cliente'}</div>
              </div>
              <Avatar name={user.name} color="#14b885" />
              <button
                onClick={logout}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
              >
                <LogOut className="size-4" />
                Sair
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-6 py-8">
          <Outlet />
        </main>

        <footer className="mx-auto max-w-5xl px-6 pb-8 text-center text-xs text-slate-400">
          Portal do cliente · Nairuz Marketing &amp; Tecnologia
        </footer>
      </div>
    </ToastProvider>
  )
}
