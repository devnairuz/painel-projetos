import { useRef, useState, type DragEvent, type PointerEvent } from 'react'
import { GripVertical, LayoutGrid, User, Users } from 'lucide-react'
import type { BoardStatus, ChecklistItem, Phase, TravaLevel } from '@/types'
import { BOARD_COLUMNS, BOARD_STATUS_META, TRAVA_META } from '@/constants'
import { boardStatusOf } from '@/utils/projects'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/utils/cn'

interface PhaseKanbanProps {
  phases: Phase[]
  /** Move o item para outra coluna (e espelha `done` quando entra/sai de Concluído). */
  onSetBoardStatus: (phaseId: string, itemId: string, status: BoardStatus) => void
}

interface BoardCard {
  phaseId: string
  item: ChecklistItem
  bloco: string
  trava: TravaLevel
  status: BoardStatus
}

/**
 * Visão Kanban das etapas. É uma *visão* sobre os mesmos `ChecklistItem`s das
 * fases (sem duplicar dados): status vira coluna, nível de trava vira a cor do
 * card e o bloco vira a raia. Mover um card atualiza o `boardStatus`.
 */
export function PhaseKanban({ phases, onSetBoardStatus }: PhaseKanbanProps) {
  const [dragging, setDragging] = useState<{ phaseId: string; itemId: string; status: BoardStatus } | null>(null)
  const [dropTarget, setDropTarget] = useState<BoardStatus | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const panRef = useRef({ pointerId: 0, startX: 0, scrollLeft: 0 })
  const cards: BoardCard[] = phases.flatMap((phase) =>
    phase.checklist.map((item) => ({
      phaseId: phase.id,
      item,
      bloco: item.bloco ?? phase.name,
      trava: item.travaLevel ?? 'trava_golive',
      status: boardStatusOf(phase, item),
    })),
  )

  if (cards.length === 0) {
    return (
      <EmptyState
        icon={LayoutGrid}
        title="Nenhum card no board"
        description="Adicione itens às etapas para vê-los aqui como cards do Kanban."
      />
    )
  }

  function shouldIgnorePan(target: EventTarget | null): boolean {
    return (
      target instanceof HTMLElement &&
      !!target.closest('button, select, input, textarea, a, [data-kanban-no-pan]')
    )
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    const scroller = scrollerRef.current
    if (!scroller || event.button !== 0 || dragging || shouldIgnorePan(event.target)) return
    if (scroller.scrollWidth <= scroller.clientWidth) return

    panRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      scrollLeft: scroller.scrollLeft,
    }
    setIsPanning(true)
    scroller.setPointerCapture(event.pointerId)
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const scroller = scrollerRef.current
    if (!scroller || !isPanning || event.pointerId !== panRef.current.pointerId) return

    const distance = event.clientX - panRef.current.startX
    scroller.scrollLeft = panRef.current.scrollLeft - distance
    if (Math.abs(distance) > 4) event.preventDefault()
  }

  function stopPanning(event: PointerEvent<HTMLDivElement>) {
    const scroller = scrollerRef.current
    if (scroller?.hasPointerCapture(event.pointerId)) scroller.releasePointerCapture(event.pointerId)
    setIsPanning(false)
  }

  return (
    <div className="space-y-4">
      <Legend />
      <div
        ref={scrollerRef}
        className={cn(
          'flex gap-3 overflow-x-auto pb-2 touch-pan-y',
          isPanning ? 'cursor-grabbing select-none' : 'cursor-grab',
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopPanning}
        onPointerCancel={stopPanning}
      >
        {BOARD_COLUMNS.map((status) => (
          <BoardColumn
            key={status}
            status={status}
            cards={cards.filter((c) => c.status === status)}
            dragging={dragging}
            isDropTarget={dropTarget === status}
            onDragStart={setDragging}
            onDragOver={() => setDropTarget(status)}
            onDragLeave={() => setDropTarget((current) => (current === status ? null : current))}
            onDrop={(card) => {
              setDropTarget(null)
              setDragging(null)
              if (card.status !== status) onSetBoardStatus(card.phaseId, card.itemId, status)
            }}
            onDragEnd={() => {
              setDropTarget(null)
              setDragging(null)
            }}
            onSetBoardStatus={onSetBoardStatus}
          />
        ))}
      </div>
    </div>
  )
}

/** Legenda do semáforo (vermelho/amarelo/verde + a regra de cada cor). */
function Legend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2">
      {(Object.keys(TRAVA_META) as TravaLevel[]).map((level) => {
        const meta = TRAVA_META[level]
        return (
          <span key={level} className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: meta.dot }} />
            <span className="font-semibold text-slate-700">{meta.label}</span>
            <span className="text-slate-400">· {meta.hint}</span>
          </span>
        )
      })}
    </div>
  )
}

function BoardColumn({
  status,
  cards,
  dragging,
  isDropTarget,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onSetBoardStatus,
}: {
  status: BoardStatus
  cards: BoardCard[]
  dragging: { phaseId: string; itemId: string; status: BoardStatus } | null
  isDropTarget: boolean
  onDragStart: (card: { phaseId: string; itemId: string; status: BoardStatus }) => void
  onDragOver: () => void
  onDragLeave: () => void
  onDrop: (card: { phaseId: string; itemId: string; status: BoardStatus }) => void
  onDragEnd: () => void
  onSetBoardStatus: (phaseId: string, itemId: string, status: BoardStatus) => void
}) {
  const meta = BOARD_STATUS_META[status]
  // Ordena por bloco (raia) e, dentro do bloco, pelo rótulo.
  const ordered = [...cards].sort(
    (a, b) => a.bloco.localeCompare(b.bloco, 'pt-BR') || a.item.label.localeCompare(b.item.label, 'pt-BR'),
  )

  return (
    <div
      className={cn(
        'flex w-72 shrink-0 flex-col rounded-xl border bg-slate-50/60 transition-colors',
        isDropTarget ? 'border-brand-300 bg-brand-50/50 ring-2 ring-brand-100' : 'border-slate-200',
      )}
      onDragOver={(event) => {
        event.preventDefault()
        onDragOver()
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onDragLeave()
      }}
      onDrop={(event) => {
        event.preventDefault()
        const phaseId = event.dataTransfer.getData('application/x-phase-id')
        const itemId = event.dataTransfer.getData('application/x-item-id')
        const sourceStatus = event.dataTransfer.getData('application/x-board-status') as BoardStatus
        if (phaseId && itemId) onDrop({ phaseId, itemId, status: sourceStatus })
      }}
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-200/70 px-3 py-2.5">
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <span className="size-2 rounded-full" style={{ backgroundColor: meta.dot }} />
          {meta.label}
        </span>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-500">
          {cards.length}
        </span>
      </div>

      <div className="max-h-[70vh] flex-1 space-y-2 overflow-y-auto p-2">
        {ordered.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs text-slate-400">Sem cards aqui.</p>
        ) : (
          ordered.map((card, index) => (
            <div key={card.item.id}>
              {(index === 0 || ordered[index - 1].bloco !== card.bloco) && (
                <div className="px-1 pt-1 pb-1.5 text-[10px] font-bold tracking-wide text-slate-400 uppercase">
                  {card.bloco}
                </div>
              )}
              <BoardCardItem
                card={card}
                dragging={dragging?.itemId === card.item.id}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onSetBoardStatus={onSetBoardStatus}
              />
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function BoardCardItem({
  card,
  dragging,
  onDragStart,
  onDragEnd,
  onSetBoardStatus,
}: {
  card: BoardCard
  dragging: boolean
  onDragStart: (card: { phaseId: string; itemId: string; status: BoardStatus }) => void
  onDragEnd: () => void
  onSetBoardStatus: (phaseId: string, itemId: string, status: BoardStatus) => void
}) {
  const trava = TRAVA_META[card.trava]
  return (
    <div
      className={cn(
        'rounded-lg border border-slate-200 border-l-4 bg-white p-2.5 shadow-sm transition',
        dragging && 'scale-[0.98] opacity-50',
      )}
      style={{ borderLeftColor: trava.dot }}
      title={`${trava.label} — ${trava.hint}`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          draggable
          onDragStart={(event: DragEvent<HTMLButtonElement>) => {
            event.dataTransfer.effectAllowed = 'move'
            event.dataTransfer.setData('application/x-phase-id', card.phaseId)
            event.dataTransfer.setData('application/x-item-id', card.item.id)
            event.dataTransfer.setData('application/x-board-status', card.status)
            onDragStart({ phaseId: card.phaseId, itemId: card.item.id, status: card.status })
          }}
          onDragEnd={onDragEnd}
          className="mt-0.5 cursor-grab rounded-md p-1 text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-500 active:cursor-grabbing"
          title="Arrastar card"
          aria-label="Arrastar card"
        >
          <GripVertical className="size-4" />
        </button>
        <p className={cn('min-w-0 flex-1 text-sm', card.item.done ? 'text-slate-400 line-through' : 'text-slate-700')}>
          {card.item.label}
        </p>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-slate-400">{card.bloco}</span>
        <ResponsibilityChip client={!!card.item.clientResponsibility} />
      </div>
      <select
        value={card.status}
        onChange={(e) => onSetBoardStatus(card.phaseId, card.item.id, e.target.value as BoardStatus)}
        title="Mover para outra coluna"
        data-kanban-no-pan
        className="mt-2 h-7 w-full rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-600 focus:border-brand-400 focus:outline-none"
      >
        {BOARD_COLUMNS.map((status) => (
          <option key={status} value={status}>
            {BOARD_STATUS_META[status].label}
          </option>
        ))}
      </select>
    </div>
  )
}

function ResponsibilityChip({ client }: { client: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold',
        client
          ? 'border-amber-200 bg-amber-50 text-amber-700'
          : 'border-slate-200 bg-slate-50 text-slate-500',
      )}
      title={client ? 'Responsabilidade do cliente' : 'Responsabilidade da Nairuz'}
    >
      {client ? <User className="size-3" /> : <Users className="size-3" />}
      {client ? 'Cliente' : 'Nairuz'}
    </span>
  )
}
