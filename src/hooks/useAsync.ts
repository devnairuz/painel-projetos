import { useCallback, useEffect, useRef, useState } from 'react'
import { subscribe } from '@/services/store'

interface AsyncState<T> {
  data: T | undefined
  loading: boolean
  error: Error | undefined
  /** Re-executa a função (após mutações, por exemplo). */
  reload: () => void
}

/** Intervalo do poll de segurança (ms) — garante convergência mesmo se um evento se perder. */
const POLL_MS = 2500

/**
 * Executa uma função assíncrona com *stale-while-revalidate* e sincronização
 * contínua e robusta:
 * - skeleton só na carga inicial ou quando as `deps` mudam;
 * - revalida no broadcast do store (mesma aba / outras abas), ao focar a aba,
 *   e por um poll leve de segurança;
 * - só troca o estado se o resultado realmente mudou (compara serializado),
 *   evitando re-render e flicker desnecessários.
 *
 * Resultado: painéis Nairuz e cliente sempre integrados, sem recarregar a página.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error>()
  const [nonce, setNonce] = useState(0)

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  useEffect(() => {
    const unsub = subscribe(reload)
    const onFocus = () => reload()
    const onVisible = () => {
      if (document.visibilityState === 'visible') reload()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    const interval = window.setInterval(reload, POLL_MS)
    return () => {
      unsub()
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
      window.clearInterval(interval)
    }
  }, [reload])

  const depsKey = JSON.stringify(deps)
  const prevDepsKey = useRef<string | undefined>(undefined)
  const hasData = useRef(false)
  const lastSerialized = useRef<string | undefined>(undefined)

  useEffect(() => {
    let active = true
    const depsChanged = prevDepsKey.current !== depsKey
    prevDepsKey.current = depsKey
    if (depsChanged) lastSerialized.current = undefined
    if (!hasData.current || depsChanged) setLoading(true)

    fn()
      .then((result) => {
        if (!active) return
        const serialized = JSON.stringify(result)
        // Só atualiza o estado se mudou de fato — evita re-render à toa.
        if (serialized !== lastSerialized.current) {
          lastSerialized.current = serialized
          setData(result)
        }
        hasData.current = true
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err : new Error(String(err)))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depsKey, nonce])

  return { data, loading, error, reload }
}
