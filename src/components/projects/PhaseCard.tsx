import { useId, useState, useEffect } from 'react'
import {
  ChevronDown,
  Check,
  CircleCheck,
  Lock,
  CalendarClock,
  UserCheck,
  MessageSquare,
  User,
  Users,
} from 'lucide-react'
import type { ChecklistItem, CommentAttachment, Phase, TeamMember } from '@/types'
import type { MentionableUser } from '@/services/usersService'
import { PHASE_STATUS_META, TRAVA_META } from '@/constants'
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
  onUpdateItemOwner: (phaseId: string, itemId: string, ownerId: string) => void
  onAddComment: (
    phaseId: string,
    itemId: string,
    body: string,
    mentionedUserIds: string[],
    attachments?: CommentAttachment[],
  ) => void
  onUpdateDates: (phaseId: string, patch: { startDate?: string; dueDate?: string; finishedDate?: string }) => void
  currentUser?: { id?: string; name?: string }
  users?: MentionableUser[]
}

/** Card de fase com checklist, comentários por subtarefa, datas e aprovação. */
export function PhaseCard({
  phase,
  owner,
  defaultOpen = false,
  onToggleItem,
  onApprove,
  onToggleResponsibility,
  onUpdateItemOwner,
  onAddComment,
  onUpdateDates,
  currentUser,
  users = [],
}: PhaseCardProps) {
  const [open, setOpen] = useState(defaultOpen)
  const idConteudo = useId()
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
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={idConteudo}
        className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50/70 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-inset focus-visible:outline-none sm:items-center"
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
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span>{done}/{total} itens</span>
            {phase.dueDate && (
              <span className="flex items-center gap-1">
                <CalendarClock className="size-3" /> prev. {formatDate(phase.dueDate)}
              </span>
            )}
          </div>
        </div>

        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          <Badge meta={PHASE_STATUS_META[phase.status]} withDot />
          {owner && <Avatar name={owner.name} color={owner.avatarColor} size="sm" />}
        </div>
        <ChevronDown className={cn('size-4 shrink-0 text-slate-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div id={idConteudo} className="border-t border-slate-100 px-3 py-4 sm:px-4">
          <div className="mb-4 flex flex-wrap items-center gap-2 sm:hidden">
            <Badge meta={PHASE_STATUS_META[phase.status]} withDot />
            {owner && (
              <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-600">
                <Avatar name={owner.name} color={owner.avatarColor} size="sm" />
                {owner.name}
              </span>
            )}
          </div>

          <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
            <DateField
              label="Início"
              value={phase.startDate}
              onChange={(v) => onUpdateDates(phase.id, { startDate: v || undefined })}
            />
            <DateField
              label="Prevista"
              value={phase.dueDate}
              onChange={(v) => onUpdateDates(phase.id, { dueDate: v || undefined })}
            />
            <DateField
              label="Finalizada"
              value={phase.finishedDate}
              onChange={(v) => onUpdateDates(phase.id, { finishedDate: v || undefined })}
            />
          </div>

          {phase.checklist.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              Esta etapa ainda não possui itens de checklist.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-100">
              {phase.checklist.map((item) => (
                <ChecklistItemRow
                  key={item.id}
                  phaseId={phase.id}
                  item={item}
                  users={users}
                  onToggle={onToggleItem}
                  onToggleResponsibility={onToggleResponsibility}
                  onUpdateItemOwner={onUpdateItemOwner}
                  onAddComment={onAddComment}
                  currentUser={currentUser}
                />
              ))}
            </ul>
          )}

          <div className="mt-4 flex flex-col items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 sm:flex-row sm:items-center">
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
  users,
  onToggle,
  onToggleResponsibility,
  onUpdateItemOwner,
  onAddComment,
  currentUser,
}: {
  phaseId: string
  item: ChecklistItem
  users: MentionableUser[]
  onToggle: (phaseId: string, itemId: string) => void
  onToggleResponsibility: (phaseId: string, itemId: string, value: boolean) => void
  onUpdateItemOwner: (phaseId: string, itemId: string, ownerId: string) => void
  onAddComment: (
    phaseId: string,
    itemId: string,
    body: string,
    mentionedUserIds: string[],
    attachments?: CommentAttachment[],
  ) => void
  currentUser?: { id?: string; name?: string }
}) {
  const [open, setOpen] = useState(false)
  const [editingOwner, setEditingOwner] = useState(false)
  const idComentarios = useId()
  const count = item.comments?.length ?? 0
  const isClient = !!item.clientResponsibility
  const assignedUser = item.ownerId ? users.find((user) => user.id === item.ownerId) : undefined
  const trava = TRAVA_META[item.travaLevel ?? 'trava_golive']

  return (
    <li className="bg-white transition-colors hover:bg-slate-50/70">
      <div className="flex gap-3 px-3 py-3">
        <button
          type="button"
          onClick={() => onToggle(phaseId, item.id)}
          aria-label={item.done ? `Marcar ${item.label} como pendente` : `Marcar ${item.label} como concluído`}
          aria-pressed={item.done}
          className={cn(
            'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border transition-colors focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-1 focus-visible:outline-none',
            item.done
              ? 'border-brand-500 bg-brand-500 text-white'
              : 'border-slate-300 bg-white text-transparent hover:border-brand-400',
          )}
        >
          <Check className="size-4" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <span className={cn('min-w-0 text-sm leading-6', item.done ? 'text-slate-500 line-through' : 'text-slate-700')}>
              {item.label}
            </span>
            <Badge meta={trava} withDot className="w-fit shrink-0" />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {/* Responsável: chip quando atribuído (clique para trocar); senão, o seletor */}
            {assignedUser && !editingOwner ? (
              <button
                type="button"
                onClick={() => setEditingOwner(true)}
                title={`Responsável: ${assignedUser.name} — clique para alterar`}
                className="inline-flex h-9 max-w-48 items-center gap-1.5 rounded-full bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-1 focus-visible:outline-none"
              >
                <UserCheck className="size-3.5 shrink-0" />
                <span className="truncate">{assignedUser.name}</span>
              </button>
            ) : (
              <select
                value={item.ownerId ?? ''}
                autoFocus={editingOwner}
                onChange={(e) => {
                  onUpdateItemOwner(phaseId, item.id, e.target.value)
                  setEditingOwner(false)
                }}
                onBlur={() => setEditingOwner(false)}
                aria-label={`Responsável por ${item.label}`}
                className="h-9 min-w-36 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
              >
                <option value="">Sem responsável</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            )}

            {/* Dono operacional: cliente ou Nairuz. Clique alterna a responsabilidade. */}
            <button
              type="button"
              onClick={() => onToggleResponsibility(phaseId, item.id, !isClient)}
              aria-pressed={isClient}
              title={
                isClient
                  ? 'Responsabilidade do cliente — aparece nas tarefas dele. Clique para remover.'
                  : 'Responsabilidade da Nairuz. Clique para marcar como cliente.'
              }
              className={cn(
                'inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-1 focus-visible:outline-none',
                isClient
                  ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-800',
              )}
            >
              {isClient ? <User className="size-3.5" /> : <Users className="size-3.5" />}
              <span>{isClient ? 'Cliente' : 'Nairuz'}</span>
            </button>

            {/* Comentários */}
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-controls={idComentarios}
              aria-label={`${open ? 'Fechar' : 'Abrir'} comentários de ${item.label}`}
              className={cn(
                'inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-1 focus-visible:outline-none',
                count > 0 ? 'text-brand-700 hover:bg-brand-50' : 'text-slate-500 hover:bg-slate-100',
              )}
            >
              <MessageSquare className="size-4" />
              {count > 0 ? `${count} ${count === 1 ? 'comentário' : 'comentários'}` : 'Comentar'}
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div id={idComentarios} className="border-t border-slate-100 bg-slate-50/70 p-3 sm:pl-12">
          <CommentThread
            comments={item.comments ?? []}
            users={users}
            currentAuthorId={currentUser?.id}
            currentAuthorName={currentUser?.name}
            onAdd={(body, mentions, attachments) => onAddComment(phaseId, item.id, body, mentions, attachments)}
            side="nairuz"
          />
        </div>
      )}
    </li>
  )
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string
  value?: string
  onChange: (value: string) => void
}) {
  const idCampo = useId()
  const normalized = value ? value.slice(0, 10) : ''
  const [text, setText] = useState(normalized)

  // Sincroniza quando o valor muda por fora (ex.: aprovação preenche a data).
  useEffect(() => {
    setText(normalized)
  }, [normalized])

  /** Só persiste ao sair do campo, e apenas se for data completa e plausível. */
  function commit() {
    if (text === normalized) return
    if (text === '') {
      onChange('')
      return
    }
    const year = Number(text.slice(0, 4))
    const isComplete = /^\d{4}-\d{2}-\d{2}$/.test(text)
    if (isComplete && year >= 2000 && year <= 2100) {
      onChange(text)
    } else {
      // valor incompleto/implausível: descarta e volta ao salvo
      setText(normalized)
    }
  }

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
      <label htmlFor={idCampo} className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
        {label}
      </label>
      <input
        id={idCampo}
        type="date"
        value={text}
        min="2000-01-01"
        max="2100-12-31"
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        className="mt-1 w-full rounded-md bg-transparent text-sm text-slate-700 focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:outline-none"
      />
    </div>
  )
}
