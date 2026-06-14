import { useCallback, useState } from 'react'

/**
 * Metas (Objetivo) dos relatórios de acompanhamento. Persistidas no navegador
 * por enquanto — quando houver uma coleção de configurações no servidor, só
 * troca a fonte; a UI continua igual.
 */
export interface ReportTargets {
  finalizado: number
  goLive: number
}

const KEY = 'nairuz-portal:report-targets'
const DEFAULT: ReportTargets = { finalizado: 90, goLive: 50 }

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(300, Math.round(value)))
}

function read(): ReportTargets {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT
    const parsed = JSON.parse(raw)
    return {
      finalizado: clamp(Number(parsed.finalizado) || DEFAULT.finalizado),
      goLive: clamp(Number(parsed.goLive) || DEFAULT.goLive),
    }
  } catch {
    return DEFAULT
  }
}

export function useReportTargets() {
  const [targets, setTargetsState] = useState<ReportTargets>(read)

  const setTargets = useCallback((next: ReportTargets) => {
    const clamped: ReportTargets = { finalizado: clamp(next.finalizado), goLive: clamp(next.goLive) }
    setTargetsState(clamped)
    try {
      localStorage.setItem(KEY, JSON.stringify(clamped))
    } catch {
      /* navegador sem storage: mantém só em memória */
    }
  }, [])

  return { targets, setTargets }
}
