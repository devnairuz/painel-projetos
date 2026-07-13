import { useEffect, useId, useRef, useState } from 'react'
import { AlertTriangle, Bell, BellRing, CheckCheck, MessageSquare, Star } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '@/hooks/useNotifications'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '@/services/notificationsService'
import { formatDate } from '@/utils/dates'
import { cn } from '@/utils/cn'

const ICON: Record<string, typeof Bell> = {
  nps: Star,
  comentario: MessageSquare,
  aprovacao: CheckCheck,
  info: BellRing,
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const painelId = useId()
  const tituloId = useId()
  const painelRef = useRef<HTMLDivElement>(null)
  const botaoRef = useRef<HTMLButtonElement>(null)
  const { data, loading, error, reload } = useNotifications()
  const navigate = useNavigate()
  const items = data?.items ?? []
  const unread = data?.unread ?? 0

  useEffect(() => {
    if (!open) return
    const frame = window.requestAnimationFrame(() => painelRef.current?.focus())
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        botaoRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  async function openItem(n: AppNotification) {
    if (!n.read) {
      await markNotificationRead(n.id)
      reload()
    }
    setOpen(false)
    if (n.link) navigate(n.link)
  }

  async function readAll() {
    await markAllNotificationsRead()
    reload()
  }

  return (
    <div className="relative">
      <button
        ref={botaoRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex size-10 cursor-pointer items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
        aria-label={unread > 0 ? `Notificações, ${unread} não lidas` : 'Notificações'}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={painelId}
      >
        <Bell aria-hidden="true" className="size-5" />
        {unread > 0 && (
          <span className="absolute top-0 right-0 flex min-h-4 min-w-4 items-center justify-center rounded-full border-2 border-white bg-red-600 px-0.5 text-[9px] leading-none font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            aria-hidden="true"
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div
            ref={painelRef}
            id={painelId}
            role="dialog"
            aria-modal="false"
            aria-labelledby={tituloId}
            tabIndex={-1}
            className="fixed inset-x-4 top-[4.5rem] z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/15 outline-none sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-96"
          >
            <div className="flex min-h-14 items-center justify-between gap-4 border-b border-slate-200 px-4 py-3">
              <div className="min-w-0">
                <h2 id={tituloId} className="text-sm font-semibold text-slate-900">
                  Notificações
                </h2>
                {unread > 0 && (
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {unread} {unread === 1 ? 'item não lido' : 'itens não lidos'}
                  </p>
                )}
              </div>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={readAll}
                  className="min-h-9 cursor-pointer rounded-lg px-2 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-50 hover:text-brand-700 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
                >
                  Marcar todas como lidas
                </button>
              )}
            </div>

            {loading && !data ? (
              <div className="space-y-4 px-4 py-5" aria-label="Carregando notificações">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="flex gap-3">
                    <Skeleton className="size-9 shrink-0 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-2/3" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error && !data ? (
              <div className="flex flex-col items-center px-6 py-9 text-center" role="alert">
                <span className="flex size-10 items-center justify-center rounded-xl bg-red-50 text-red-700">
                  <AlertTriangle aria-hidden="true" className="size-5" />
                </span>
                <p className="mt-3 text-sm font-semibold text-slate-900">
                  Não foi possível carregar
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  Verifique sua conexão e tente novamente.
                </p>
                <button
                  type="button"
                  onClick={reload}
                  className="mt-3 min-h-9 cursor-pointer rounded-lg px-3 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-50 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
                >
                  Tentar novamente
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-10 text-center" role="status">
                <span className="flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                  <Bell aria-hidden="true" className="size-5" />
                </span>
                <p className="mt-3 text-sm font-semibold text-slate-800">Tudo em dia</p>
                <p className="mt-1 text-xs text-slate-500">Nenhuma notificação por enquanto.</p>
              </div>
            ) : (
              <ul className="max-h-[min(24rem,calc(100dvh-10rem))] divide-y divide-slate-100 overflow-y-auto">
                {items.map((n) => {
                  const Icon = ICON[n.type] ?? BellRing
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => openItem(n)}
                        className={cn(
                          'flex min-h-16 w-full cursor-pointer items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500 focus-visible:outline-none',
                          !n.read && 'bg-brand-50/60',
                        )}
                      >
                        <span
                          className={cn(
                            'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg',
                            n.read ? 'bg-slate-100 text-slate-400' : 'bg-brand-100 text-brand-700',
                          )}
                        >
                          <Icon aria-hidden="true" className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-semibold text-slate-800">{n.title}</span>
                            {!n.read && (
                              <>
                                <span
                                  aria-hidden="true"
                                  className="size-1.5 shrink-0 rounded-full bg-brand-600"
                                />
                                <span className="sr-only">Não lida</span>
                              </>
                            )}
                          </div>
                          {n.body && (
                            <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-slate-600">
                              {n.body}
                            </p>
                          )}
                          <time
                            dateTime={n.createdAt}
                            className="mt-1 block text-[11px] text-slate-500"
                          >
                            {formatDate(n.createdAt)}
                          </time>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
