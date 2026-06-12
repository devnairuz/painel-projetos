import { createBrowserRouter, Outlet, Navigate } from 'react-router-dom'
import { AppShell } from '@/layouts/AppShell'
import { ClientShell } from '@/layouts/ClientShell'
import { ClientAuthProvider } from '@/hooks/useClientAuth'
import { CompanyAuthProvider, useCompanyAuth } from '@/hooks/useCompanyAuth'
import { CompanyAuthPage } from '@/pages/CompanyAuthPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ProjetosPage } from '@/pages/ProjetosPage'
import { ProjetoDetalhePage } from '@/pages/ProjetoDetalhePage'
import { RelatoriosPage } from '@/pages/stubs'
import { OrganizacoesPage } from '@/pages/OrganizacoesPage'
import { ClientLoginPage } from '@/pages/cliente/ClientLoginPage'
import { ClientProjectsPage } from '@/pages/cliente/ClientProjectsPage'
import { ClientProjectDetailPage } from '@/pages/cliente/ClientProjectDetailPage'

/** Envolve o portal do cliente no provedor de sessão (mock auth). */
function ClientAuthLayout() {
  return (
    <ClientAuthProvider>
      <Outlet />
    </ClientAuthProvider>
  )
}

/** Provedor de sessão da empresa (JWT). */
function CompanyAuthLayout() {
  return (
    <CompanyAuthProvider>
      <Outlet />
    </CompanyAuthProvider>
  )
}

/** Guarda: sem login da empresa → vai para /entrar. Com login → AppShell. */
function RequireCompanyAuth() {
  const { user } = useCompanyAuth()
  if (!user) return <Navigate to="/entrar" replace />
  return <AppShell />
}

export const router = createBrowserRouter([
  // ───── Visão Nairuz (interna, protegida por login) ─────
  {
    path: '/',
    element: <CompanyAuthLayout />,
    children: [
      { path: 'entrar', element: <CompanyAuthPage /> },
      {
        element: <RequireCompanyAuth />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'projetos', element: <ProjetosPage /> },
          { path: 'projetos/:id', element: <ProjetoDetalhePage /> },
          { path: 'organizacoes', element: <OrganizacoesPage /> },
          { path: 'relatorios', element: <RelatoriosPage /> },
        ],
      },
    ],
  },

  // ───── Portal do cliente (externo) ─────
  {
    path: '/cliente',
    element: <ClientAuthLayout />,
    children: [
      { path: 'login', element: <ClientLoginPage /> },
      {
        element: <ClientShell />,
        children: [
          { index: true, element: <ClientProjectsPage /> },
          { path: 'projeto/:id', element: <ClientProjectDetailPage /> },
        ],
      },
    ],
  },
])
