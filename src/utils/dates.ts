import { differenceInCalendarDays, format, parseISO, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'

/** Formata uma data ISO para "dd MMM yyyy" em PT-BR. Vazio se inválida. */
export function formatDate(iso?: string): string {
  if (!iso) return '—'
  const d = parseISO(iso)
  return isValid(d) ? format(d, "dd MMM yyyy", { locale: ptBR }) : '—'
}

/** Formato curto "dd/MM". */
export function formatShort(iso?: string): string {
  if (!iso) return '—'
  const d = parseISO(iso)
  return isValid(d) ? format(d, 'dd/MM', { locale: ptBR }) : '—'
}

/**
 * Dias até a data (negativo = atrasado). undefined se sem data.
 */
export function daysUntil(iso?: string): number | undefined {
  if (!iso) return undefined
  const d = parseISO(iso)
  if (!isValid(d)) return undefined
  return differenceInCalendarDays(d, new Date())
}

/** Rótulo humano relativo ao go live / prazo. */
export function relativeDeadlineLabel(iso?: string): string {
  const days = daysUntil(iso)
  if (days === undefined) return '—'
  if (days === 0) return 'hoje'
  if (days < 0) return `${Math.abs(days)}d atrasado`
  return `em ${days}d`
}
