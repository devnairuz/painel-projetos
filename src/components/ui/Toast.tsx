import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
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

const KIND_STYLE: Record<
  ToastKind,
  { icon: typeof Info; border: string; iconColor: string; iconBackground: string }
> = {
  success: {
    icon: CheckCircle2,
    border: 'border-emerald-200',
    iconColor: 'text-emerald-700',
    iconBackground: 'bg-emerald-50',
  },
  info: {
    icon: Info,
    border: 'border-sky-200',
    iconColor: 'text-sky-700',
    iconBackground: 'bg-sky-50',
  },
  error: {
    icon: AlertTriangle,
    border: 'border-red-200',
    iconColor: 'text-red-700',
    iconBackground: 'bg-red-50',
  },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<number[]>([])

  useEffect(
    () => () => {
      timers.current.forEach((timer) => window.clearTimeout(timer))
    },
    [],
  )

  const remove = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const notify = useCallback(
    (message: string, kind: ToastKind = 'success') => {
      const id = Date.now() + Math.random()
      setToasts((list) => [...list, { id, kind, message }].slice(-4))
      const timer = window.setTimeout(() => {
        remove(id)
        timers.current = timers.current.filter((activeTimer) => activeTimer !== timer)
      }, 4000)
      timers.current.push(timer)
    },
    [remove],
  )

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <section
        aria-label="Notificações do sistema"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[70] flex flex-col gap-2 sm:right-4 sm:left-auto sm:w-96"
      >
        {toasts.map((t) => {
          const style = KIND_STYLE[t.kind]
          const Icon = style.icon
          return (
            <div
              key={t.id}
              role={t.kind === 'error' ? 'alert' : undefined}
              aria-atomic="true"
              className={cn(
                'pointer-events-auto flex items-start gap-3 rounded-2xl border bg-white p-3.5 shadow-xl shadow-slate-900/10',
                style.border,
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-xl',
                  style.iconBackground,
                  style.iconColor,
                )}
              >
                <Icon className="size-4.5" />
              </span>
              <p className="min-w-0 flex-1 pt-1 text-sm leading-5 text-slate-700 break-words">
                {t.message}
              </p>
              <button
                type="button"
                onClick={() => remove(t.id)}
                className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
                aria-label="Fechar notificação"
              >
                <X className="size-4" />
              </button>
            </div>
          )
        })}
      </section>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast deve ser usado dentro de <ToastProvider>')
  return ctx
}
