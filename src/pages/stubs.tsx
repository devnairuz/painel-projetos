import { Ticket, BellRing, CheckCircle2, Building2, BarChart3 } from 'lucide-react'
import { ComingSoonPage } from './ComingSoonPage'

export function ChamadosPage() {
  return (
    <ComingSoonPage
      title="Chamados"
      subtitle="Gerencie todos os chamados"
      icon={Ticket}
      description="O módulo de chamados, com fila, filtros, estimativas e SLA, entra no próximo ciclo."
    />
  )
}

export function CobrancasPage() {
  return (
    <ComingSoonPage
      title="Cobranças e pendências"
      subtitle="Tratativas formais com clientes e times"
      icon={BellRing}
      description="Cobranças formais, prazos, impacto e visibilidade para o cliente chegam em breve."
    />
  )
}

export function AprovacoesPage() {
  return (
    <ComingSoonPage
      title="Aprovações"
      subtitle="Aprovações formais por etapa"
      icon={CheckCircle2}
      description="Hoje as aprovações vivem dentro de cada fase do projeto. Uma central dedicada vem depois."
    />
  )
}

export function OrganizacoesPage() {
  return (
    <ComingSoonPage
      title="Organizações"
      subtitle="Clientes e contas"
      icon={Building2}
      description="Cadastro e visão consolidada por organização entram no próximo ciclo."
    />
  )
}

export function RelatoriosPage() {
  return (
    <ComingSoonPage
      title="Relatórios"
      subtitle="Indicadores e exportações"
      icon={BarChart3}
      description="Relatórios de risco, SLA e desempenho por time virão após os módulos base."
    />
  )
}
