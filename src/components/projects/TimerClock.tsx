import { useEffect, useState } from 'react'
import { formatClock } from '@/utils/hours'

interface TimerClockProps {
  /** Início do cronômetro (ISO). */
  startedAt: string
  className?: string
}

/** Exibe o tempo decorrido desde `startedAt`, atualizando a cada segundo. */
export function TimerClock({ startedAt, className }: TimerClockProps) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const elapsed = Math.max(0, now - new Date(startedAt).getTime())
  return <span className={className}>{formatClock(elapsed)}</span>
}
