import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react'
import { CheckCircle2, Info, X, AlertTriangle } from 'lucide-react'
import { cn } from '@/utils/cn'

type ToastKind = 'success' | 'info' | 'error'

interface Toast {
  id: number
  kind: ToastKind
  message: string
}

interface ToastContextValue {
  notify: (message: string, kind?: ToastKind) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const KIND_STYLE: Record<ToastKind, { icon: typeof Info; ring: string; iconColor: string }> = {
  success: { icon: CheckCircle2, ring: 'border-emerald-200', iconColor: 'text-emerald-500' },
  info: { icon: Info, ring: 'border-sky-200', iconColor: 'text-sky-500' },
  error: { icon: AlertTriangle, ring: 'border-red-200', iconColor: 'text-red-500' },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const notify = useCallback(
    (message: string, kind: ToastKind = 'success') => {
      const id = Date.now() + Math.random()
      setToasts((list) => [...list, { id, kind, message }])
      setTimeout(() => remove(id), 3500)
    },
    [remove],
  )

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-80 flex-col gap-2">
        {toasts.map((t) => {
          const style = KIND_STYLE[t.kind]
          const Icon = style.icon
          return (
            <div
              key={t.id}
              className={cn(
                'pointer-events-auto flex items-start gap-3 rounded-xl border bg-white p-3 shadow-lg shadow-slate-300/40',
                style.ring,
              )}
            >
              <Icon className={cn('mt-0.5 size-5 shrink-0', style.iconColor)} />
              <p className="flex-1 text-sm text-slate-700">{t.message}</p>
              <button
                onClick={() => remove(t.id)}
                className="text-slate-400 transition-colors hover:text-slate-600"
                aria-label="Fechar"
              >
                <X className="size-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast deve ser usado dentro de <ToastProvider>')
  return ctx
}
