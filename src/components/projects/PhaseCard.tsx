import { useState } from 'react'
import {
  ChevronDown,
  Check,
  CircleCheck,
  Lock,
  CalendarClock,
  UserCheck,
  MessageSquare,
  User,
} from 'lucide-react'
import type { ChecklistItem, Phase, TeamMember } from '@/types'
import { PHASE_STATUS_META } from '@/constants'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { CommentThread } from '@/components/ui/CommentThread'
import { phaseProgress } from '@/utils/projects'
import { formatDate } from '@/utils/dates'
import { cn } from '@/utils/cn'

interface PhaseCardProps {
  phase: Phase
  owner?: TeamMember
  defaultOpen?: boolean
  onToggleItem: (phaseId: string, itemId: string) => void
  onApprove: (phaseId: string) => void
  onToggleResponsibility: (phaseId: string, itemId: string, value: boolean) => void
  onAddComment: (phaseId: string, itemId: string, body: string) => void
}

/** Card de fase com checklist, comentários por subtarefa, datas e aprovação. */
export function PhaseCard({
  phase,
  owner,
  defaultOpen = false,
  onToggleItem,
  onApprove,
  onToggleResponsibility,
  onAddComment,
}: PhaseCardProps) {
  const [open, setOpen] = useState(defaultOpen)
  const { done, total } = phaseProgress(phase)
  const isDone = phase.status === 'concluida'
  const isBlocked = phase.status === 'bloqueada'

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border bg-white transition-shadow',
        isBlocked ? 'border-red-200' : 'border-slate-200',
      )}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50/60"
      >
        <span
          className={cn(
            'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
            isDone
              ? 'bg-emerald-100 text-emerald-700'
              : isBlocked
                ? 'bg-red-100 text-red-700'
                : 'bg-slate-100 text-slate-500',
          )}
        >
          {isDone ? <Check className="size-4" /> : isBlocked ? <Lock className="size-3.5" /> : phase.order}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold text-slate-800">{phase.name}</span>
            {phase.clientApproved && <CircleCheck className="size-4 shrink-0 text-emerald-500" />}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
            <span>{done}/{total} itens</span>
            {phase.dueDate && (
              <span className="flex items-center gap-1">
                <CalendarClock className="size-3" /> prev. {formatDate(phase.dueDate)}
              </span>
            )}
          </div>
        </div>

        <Badge meta={PHASE_STATUS_META[phase.status]} withDot />
        {owner && <Avatar name={owner.name} color={owner.avatarColor} size="sm" />}
        <ChevronDown className={cn('size-4 shrink-0 text-slate-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="border-t border-slate-100 px-4 py-4">
          <div className="mb-4 grid grid-cols-3 gap-3 text-xs">
            <DateCell label="Início" value={formatDate(phase.startDate)} />
            <DateCell label="Prevista" value={formatDate(phase.dueDate)} />
            <DateCell label="Finalizada" value={formatDate(phase.finishedDate)} />
          </div>

          <ul className="space-y-1">
            {phase.checklist.map((item) => (
              <ChecklistItemRow
                key={item.id}
                phaseId={phase.id}
                item={item}
                onToggle={onToggleItem}
                onToggleResponsibility={onToggleResponsibility}
                onAddComment={onAddComment}
              />
            ))}
          </ul>

          <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
            {phase.clientApproved ? (
              <span className="flex items-center gap-2 text-sm text-emerald-700">
                <CircleCheck className="size-4" />
                Aprovada pelo cliente em {formatDate(phase.clientApprovedAt)}
              </span>
            ) : (
              <>
                <span className="text-sm text-slate-500">Aguardando aprovação do cliente</span>
                <Button size="sm" variant="secondary" onClick={() => onApprove(phase.id)}>
                  <UserCheck className="size-4" />
                  Registrar aprovação
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ChecklistItemRow({
  phaseId,
  item,
  onToggle,
  onToggleResponsibility,
  onAddComment,
}: {
  phaseId: string
  item: ChecklistItem
  onToggle: (phaseId: string, itemId: string) => void
  onToggleResponsibility: (phaseId: string, itemId: string, value: boolean) => void
  onAddComment: (phaseId: string, itemId: string, body: string) => void
}) {
  const [open, setOpen] = useState(false)
  const count = item.comments?.length ?? 0
  const isClient = !!item.clientResponsibility

  return (
    <li className="rounded-lg">
      <div className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50">
        <button
          type="button"
          onClick={() => onToggle(phaseId, item.id)}
          aria-pressed={item.done}
          className={cn(
            'flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors',
            item.done ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-300 bg-white hover:border-brand-400',
          )}
        >
          {item.done && <Check className="size-3.5" />}
        </button>
        <span className={cn('flex-1 text-sm', item.done ? 'text-slate-400 line-through' : 'text-slate-700')}>
          {item.label}
        </span>

        {/* Responsabilidade do cliente (toggle por ícone, com tooltip) */}
        <button
          type="button"
          onClick={() => onToggleResponsibility(phaseId, item.id, !isClient)}
          aria-pressed={isClient}
          title={
            isClient
              ? 'Responsabilidade do cliente — aparece nas tarefas dele. Clique para remover.'
              : 'Marcar como responsabilidade do cliente (aparece no portal do cliente).'
          }
          className={cn(
            'inline-flex size-7 items-center justify-center rounded-md transition-colors',
            isClient ? 'bg-brand-50 text-brand-600' : 'text-slate-300 hover:bg-slate-100 hover:text-slate-500',
          )}
        >
          <User className="size-4" />
        </button>

        {/* Comentários */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          title="Comentários"
          className={cn(
            'inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs transition-colors',
            count > 0 ? 'text-brand-600 hover:bg-brand-50' : 'text-slate-400 hover:bg-slate-100',
          )}
        >
          <MessageSquare className="size-4" />
          {count > 0 && count}
        </button>
      </div>

      {open && (
        <div className="mb-1 ml-8 rounded-lg border border-slate-100 bg-slate-50/60 p-3">
          <CommentThread
            comments={item.comments ?? []}
            onAdd={(body) => onAddComment(phaseId, item.id, body)}
            side="nairuz"
            placeholder="Comentar como Nairuz…"
          />
        </div>
      )}
    </li>
  )
}

function DateCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <div className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">{label}</div>
      <div className="mt-0.5 text-slate-700">{value}</div>
    </div>
  )
}
