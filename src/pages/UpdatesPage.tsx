import { Megaphone } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { UPDATES, UPDATE_CATEGORY_META } from '@/constants/updates'
import { formatDate } from '@/utils/dates'

/** Mural de atualizações do painel — changelog interno, mais recente primeiro. */
export function UpdatesPage() {
  const updates = [...UPDATES].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <>
      <PageHeader
        title="Updates"
        subtitle="Registro das novidades e mudanças do painel — o que evoluiu e quando."
      />

      {updates.length === 0 ? (
        <Card className="p-10 text-center">
          <Megaphone className="mx-auto size-8 text-slate-300" />
          <p className="mt-3 text-sm text-slate-400">Nenhuma atualização registrada ainda.</p>
        </Card>
      ) : (
        <ol className="relative ml-1.5 space-y-5 border-l border-slate-200 pl-7">
          {updates.map((update) => {
            const meta = UPDATE_CATEGORY_META[update.category]
            return (
              <li key={update.id} className="relative">
                <span
                  aria-hidden
                  className="absolute -left-[34px] top-2 size-3 rounded-full ring-4 ring-surface"
                  style={{ backgroundColor: meta.dot }}
                />
                <Card className="p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge meta={meta} withDot />
                    <time className="text-xs font-medium text-slate-400">{formatDate(update.date)}</time>
                  </div>
                  <h2 className="mt-3 text-base font-semibold text-slate-900">{update.title}</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{update.description}</p>
                </Card>
              </li>
            )
          })}
        </ol>
      )}
    </>
  )
}
