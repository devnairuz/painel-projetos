import type { TimeEntry } from '@/types'

/**
 * Converte uma entrada de duração em horas decimais.
 * Aceita: `1.5`, `1,5` (decimal de horas) · `1:30` (h:mm) · `1h30`, `1h`, `1h30m`
 * (horas/minutos) · `90m`, `45min` (minutos). Retorna `null` se inválido.
 */
export function parseDuration(input: string): number | null {
  const raw = String(input ?? '').trim().toLowerCase().replace(',', '.')
  if (!raw) return null

  // decimal puro de horas: "1.5", "2", ".5"
  if (/^\d*\.?\d+$/.test(raw)) {
    const n = Number(raw)
    return Number.isFinite(n) && n >= 0 ? n : null
  }

  // relógio "h:mm"
  const clock = raw.match(/^(\d+):([0-5]?\d)$/)
  if (clock) {
    return Number(clock[1]) + Number(clock[2]) / 60
  }

  // "1h", "1h30", "1h30m", "1 h 30 m"
  const hm = raw.match(/^(\d+)\s*h\s*(\d{1,2})?\s*m?$/)
  if (hm) {
    const h = Number(hm[1])
    const m = hm[2] ? Number(hm[2]) : 0
    if (m > 59) return null
    return h + m / 60
  }

  // só minutos "90m", "45min"
  const min = raw.match(/^(\d+)\s*m(?:in)?$/)
  if (min) {
    return Number(min[1]) / 60
  }

  return null
}

/** Formata horas decimais como "2h 30m" / "45m" / "1h". */
export function formatDuration(hours: number): string {
  const totalMinutes = Math.max(0, Math.round((Number(hours) || 0) * 60))
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

/** Formata milissegundos como relógio "HH:MM:SS" (para o cronômetro ao vivo). */
export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor((Number(ms) || 0) / 1000))
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

/** Apontamentos realizados (os que contam como horas trabalhadas). */
function realizado(entries: TimeEntry[]): TimeEntry[] {
  return (entries ?? []).filter((e) => e.kind === 'realizado')
}

/** Soma total de horas realizadas. */
export function sumRealizado(entries: TimeEntry[]): number {
  return realizado(entries).reduce((sum, e) => sum + (Number(e.hours) || 0), 0)
}

/** Total de horas por usuário (ownerId), do maior para o menor. */
export function hoursByUser(entries: TimeEntry[]): Array<{ ownerId?: string; hours: number }> {
  const map = new Map<string, number>()
  for (const e of realizado(entries)) {
    const key = e.ownerId ?? '__none__'
    map.set(key, (map.get(key) ?? 0) + (Number(e.hours) || 0))
  }
  return [...map.entries()]
    .map(([ownerId, hours]) => ({ ownerId: ownerId === '__none__' ? undefined : ownerId, hours }))
    .sort((a, b) => b.hours - a.hours)
}

/** Total de horas por subtarefa (checklistItemId). */
export function hoursByChecklistItem(entries: TimeEntry[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const e of realizado(entries)) {
    if (!e.checklistItemId) continue
    out[e.checklistItemId] = (out[e.checklistItemId] ?? 0) + (Number(e.hours) || 0)
  }
  return out
}

/**
 * Total de horas por etapa/fase (phaseId) — soma o tempo de todas as subtarefas
 * daquela etapa (apontamentos de subtarefa carregam o `phaseId`), além de
 * apontamentos feitos na própria etapa. É o "tempo apontado na tarefa-pai".
 */
export function hoursByPhase(entries: TimeEntry[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const e of realizado(entries)) {
    if (!e.phaseId) continue
    out[e.phaseId] = (out[e.phaseId] ?? 0) + (Number(e.hours) || 0)
  }
  return out
}
