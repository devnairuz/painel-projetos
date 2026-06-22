import { useCallback, useEffect, useState } from 'react'
import type { Project, RunningTimer } from '@/types'
import {
  getCurrentTimer,
  startTimer as startTimerApi,
  stopTimer as stopTimerApi,
  type StartTimerInput,
} from '@/services/timersService'

interface UseTimerResult {
  /** Cronômetro do usuário em andamento (de qualquer projeto), ou null. */
  current: RunningTimer | null
  loading: boolean
  /** Inicia (parando o anterior, se houver). */
  start: (input: StartTimerInput) => Promise<RunningTimer>
  /** Para e devolve o projeto atualizado (o do timer), ou null. */
  stop: () => Promise<Project | null>
  /** Recarrega o estado do cronômetro a partir do servidor. */
  refresh: () => Promise<void>
}

/** Gerencia o cronômetro do usuário logado (estado persistido no servidor). */
export function useTimer(): UseTimerResult {
  const [current, setCurrent] = useState<RunningTimer | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setCurrent(await getCurrentTimer())
    setLoading(false)
  }, [])

  useEffect(() => {
    let alive = true
    getCurrentTimer().then((timer) => {
      if (alive) {
        setCurrent(timer)
        setLoading(false)
      }
    })
    return () => {
      alive = false
    }
  }, [])

  const start = useCallback(async (input: StartTimerInput) => {
    const timer = await startTimerApi(input)
    setCurrent(timer)
    return timer
  }, [])

  const stop = useCallback(async () => {
    const project = await stopTimerApi()
    setCurrent(null)
    return project
  }, [])

  return { current, loading, start, stop, refresh }
}
