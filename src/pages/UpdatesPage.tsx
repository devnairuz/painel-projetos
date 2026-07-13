import { Megaphone } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
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
        <Card>
          <EmptyState
            icon={Megaphone}
            title="Nenhuma atualização registrada"
            description="As melhorias e novidades do painel aparecerão aqui."
          />
        </Card>
      ) : (
        <ol
          className="relative ml-1.5 space-y-4 border-l-2 border-slate-200 pl-5 sm:ml-2 sm:pl-7"
          aria-label="Histórico de atualizações do painel"
        >
          {updates.map((update) => {
            const meta = UPDATE_CATEGORY_META[update.category]
            return (
              <li key={update.id} className="relative">
                <span
                  aria-hidden
                  className="absolute -left-[27px] top-5 size-3 rounded-full ring-4 ring-surface sm:-left-[35px]"
                  style={{ backgroundColor: meta.dot }}
                />
                <Card className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge meta={meta} withDot />
                    <time dateTime={update.date} className="text-xs font-medium text-slate-500">{formatDate(update.date)}</time>
                  </div>
                  <h2 className="mt-3 text-base font-semibold text-slate-900">{update.title}</h2>
                  <p className="mt-1.5 text-sm leading-6 text-slate-600">{update.description}</p>
                </Card>
              </li>
            )
          })}
        </ol>
      )}
    </>
  )
}
