import { useState } from 'react'
import { Bell, CheckCheck, Star, MessageSquare, BellRing } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '@/hooks/useNotifications'
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
  const { data, reload } = useNotifications()
  const navigate = useNavigate()
  const items = data?.items ?? []
  const unread = data?.unread ?? 0

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
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
        aria-label="Notificações"
      >
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <span className="text-sm font-semibold text-slate-800">Notificações</span>
              {unread > 0 && (
                <button onClick={readAll} className="text-xs font-medium text-brand-600 hover:underline">
                  Marcar todas como lidas
                </button>
              )}
            </div>

            {items.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-slate-400">Nada por aqui ainda.</p>
            ) : (
              <ul className="max-h-96 divide-y divide-slate-50 overflow-y-auto">
                {items.map((n) => {
                  const Icon = ICON[n.type] ?? BellRing
                  return (
                    <li key={n.id}>
                      <button
                        onClick={() => openItem(n)}
                        className={cn(
                          'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50',
                          !n.read && 'bg-brand-50/60',
                        )}
                      >
                        <span
                          className={cn(
                            'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg',
                            n.read ? 'bg-slate-100 text-slate-400' : 'bg-brand-100 text-brand-700',
                          )}
                        >
                          <Icon className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium text-slate-800">{n.title}</span>
                            {!n.read && <span className="size-1.5 shrink-0 rounded-full bg-brand-500" />}
                          </div>
                          {n.body && <p className="line-clamp-2 text-xs text-slate-500">{n.body}</p>}
                          <p className="mt-0.5 text-[11px] text-slate-400">{formatDate(n.createdAt)}</p>
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
