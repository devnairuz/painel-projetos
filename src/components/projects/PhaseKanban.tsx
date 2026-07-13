import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent, type PointerEvent } from 'react'
import { ChevronLeft, ChevronRight, GripVertical, LayoutGrid, User, Users } from 'lucide-react'
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

interface CartaoBoard {
  phaseId: string
  phaseName: string
  item: ChecklistItem
  bloco: string
  trava: TravaLevel
  status: BoardStatus
}

interface CartaoEmMovimento {
  phaseId: string
  itemId: string
  status: BoardStatus
}

const DESCRICAO_COLUNA: Record<BoardStatus, string> = {
  a_fazer: 'Itens que ainda não começaram',
  responsabilidade_cliente: 'Ação direta do cliente',
  em_andamento: 'Em execução pela equipe',
  aguardando_cliente: 'Dependem de retorno ou validação',
  pendente_golive: 'Prontos, aguardando publicação',
  concluido: 'Entregues e encerrados',
}

/**
 * Visão Kanban das etapas. É uma *visão* sobre os mesmos `ChecklistItem`s das
 * fases (sem duplicar dados): status vira coluna, nível de trava vira a cor do
 * card e o bloco vira a raia. Mover um card atualiza o `boardStatus`.
 */
export function PhaseKanban({ phases, onSetBoardStatus }: PhaseKanbanProps) {
  const [dragging, setDragging] = useState<CartaoEmMovimento | null>(null)
  const [dropTarget, setDropTarget] = useState<BoardStatus | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [pistasRolagem, setPistasRolagem] = useState({ esquerda: false, direita: true })
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const panRef = useRef({ pointerId: 0, startX: 0, scrollLeft: 0 })
  const cards: CartaoBoard[] = phases.flatMap((phase) =>
    phase.checklist.map((item) => ({
      phaseId: phase.id,
      phaseName: phase.name,
      item,
      bloco: item.bloco ?? phase.name,
      trava: item.travaLevel ?? 'trava_golive',
      status: boardStatusOf(phase, item),
    })),
  )

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return

    const observer = new ResizeObserver(() => atualizarPistasRolagem(scroller, setPistasRolagem))
    observer.observe(scroller)
    return () => observer.disconnect()
  }, [cards.length])

  if (cards.length === 0) {
    return (
      <EmptyState
        icon={LayoutGrid}
        title="Nenhum card no Kanban"
        description="Adicione itens às etapas para acompanhar o fluxo de trabalho por aqui."
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
    if (
      !scroller ||
      event.pointerType !== 'mouse' ||
      event.button !== 0 ||
      dragging ||
      shouldIgnorePan(event.target)
    ) return
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

  function handleBoardKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const scroller = scrollerRef.current
    if (
      !scroller ||
      event.target !== event.currentTarget ||
      !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)
    ) return

    event.preventDefault()
    if (event.key === 'Home') scroller.scrollTo({ left: 0, behavior: 'smooth' })
    else if (event.key === 'End') scroller.scrollTo({ left: scroller.scrollWidth, behavior: 'smooth' })
    else scroller.scrollBy({ left: event.key === 'ArrowLeft' ? -336 : 336, behavior: 'smooth' })
  }

  return (
    <div className="space-y-3">
      <Legend />

      <div className="relative">
        <div
          ref={scrollerRef}
          role="region"
          aria-label="Quadro Kanban das etapas do projeto"
          aria-describedby="kanban-instrucoes"
          tabIndex={0}
          className={cn(
            'flex snap-x snap-proximity gap-3 overflow-x-auto px-0.5 pb-3 scroll-smooth touch-auto focus-visible:rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 motion-reduce:scroll-auto',
            isPanning ? 'cursor-grabbing select-none' : 'cursor-grab',
          )}
          onScroll={(event) => atualizarPistasRolagem(event.currentTarget, setPistasRolagem)}
          onKeyDown={handleBoardKeyDown}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopPanning}
          onPointerCancel={stopPanning}
        >
          {BOARD_COLUMNS.map((status) => (
            <BoardColumn
              key={status}
              status={status}
              cards={cards.filter((card) => card.status === status)}
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

        {pistasRolagem.esquerda && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center bg-linear-to-r from-white via-white/80 to-transparent">
            <span className="rounded-full border border-slate-200 bg-white p-1 text-slate-500 shadow-sm" aria-hidden="true">
              <ChevronLeft className="size-4" />
            </span>
          </div>
        )}
        {pistasRolagem.direita && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex w-12 items-center justify-end bg-linear-to-l from-white via-white/80 to-transparent">
            <span className="rounded-full border border-slate-200 bg-white p-1 text-slate-500 shadow-sm" aria-hidden="true">
              <ChevronRight className="size-4" />
            </span>
          </div>
        )}
      </div>

      <p id="kanban-instrucoes" className="text-xs leading-relaxed text-slate-500">
        Arraste os cards pelo puxador ou use o campo <span className="font-semibold text-slate-600">Mover para</span>.
        Para navegar entre as colunas, deslize horizontalmente ou use as setas do teclado com o quadro em foco.
      </p>
    </div>
  )
}

function atualizarPistasRolagem(
  scroller: HTMLDivElement,
  atualizar: (value: { esquerda: boolean; direita: boolean }) => void,
) {
  atualizar({
    esquerda: scroller.scrollLeft > 4,
    direita: scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 4,
  })
}

/** Legenda do semáforo (vermelho/amarelo/verde + a regra de cada cor). */
function Legend() {
  return (
    <section aria-label="Legenda das travas" className="rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-3">
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="shrink-0">
          <p className="text-xs font-semibold text-slate-700">Semáforo das travas</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Vermelho bloqueia a entrada, amarelo retém a publicação e verde não bloqueia.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(TRAVA_META) as TravaLevel[]).map((level) => {
            const meta = TRAVA_META[level]
            return (
              <span
                key={level}
                className={cn('inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-semibold', meta.badge)}
                title={meta.hint}
              >
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: meta.dot }} aria-hidden="true" />
                {meta.label}
              </span>
            )
          })}
        </div>
      </div>
    </section>
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
  cards: CartaoBoard[]
  dragging: CartaoEmMovimento | null
  isDropTarget: boolean
  onDragStart: (card: CartaoEmMovimento) => void
  onDragOver: () => void
  onDragLeave: () => void
  onDrop: (card: CartaoEmMovimento) => void
  onDragEnd: () => void
  onSetBoardStatus: (phaseId: string, itemId: string, status: BoardStatus) => void
}) {
  const meta = BOARD_STATUS_META[status]
  const tituloId = `coluna-kanban-${status}`
  // Ordena por bloco (raia) e, dentro do bloco, pelo rótulo.
  const ordered = [...cards].sort(
    (a, b) => a.bloco.localeCompare(b.bloco, 'pt-BR') || a.item.label.localeCompare(b.item.label, 'pt-BR'),
  )

  return (
    <section
      aria-labelledby={tituloId}
      aria-describedby={`${tituloId}-descricao`}
      className={cn(
        'flex min-h-72 w-[min(20rem,calc(100vw-3rem))] shrink-0 snap-start flex-col overflow-hidden rounded-xl border bg-slate-50/70 transition-colors',
        isDropTarget ? 'border-brand-300 bg-brand-50/60 ring-2 ring-brand-100' : 'border-slate-200',
      )}
      onDragOver={(event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
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
      <header className="border-b border-slate-200/80 bg-white/80 px-3.5 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: meta.dot }} aria-hidden="true" />
              <h2 id={tituloId} className="truncate text-sm font-bold text-slate-800">{meta.label}</h2>
            </div>
            <p id={`${tituloId}-descricao`} className="mt-1 pl-[18px] text-xs leading-snug text-slate-500">
              {DESCRICAO_COLUNA[status]}
            </p>
          </div>
          <span
            className={cn('inline-flex min-w-7 shrink-0 justify-center rounded-full border px-2 py-0.5 text-xs font-bold', meta.badge)}
            aria-label={cards.length === 1 ? '1 card' : `${cards.length} cards`}
          >
            {cards.length}
          </span>
        </div>
      </header>

      <div className="flex-1 space-y-2.5 p-2.5">
        {ordered.length === 0 ? (
          <div className={cn(
            'flex min-h-28 items-center justify-center rounded-lg border border-dashed px-4 text-center text-xs leading-relaxed',
            dragging
              ? 'border-brand-300 bg-brand-50/60 font-medium text-brand-700'
              : 'border-slate-200 bg-white/60 text-slate-400',
          )}>
            {dragging ? 'Solte o card nesta coluna' : 'Nenhum card nesta etapa do fluxo'}
          </div>
        ) : (
          ordered.map((card, index) => (
            <div key={`${card.phaseId}-${card.item.id}`}>
              {(index === 0 || ordered[index - 1].bloco !== card.bloco) && (
                <div className="flex items-center gap-2 px-1 pt-1 pb-1.5" aria-label={`Bloco ${card.bloco}`}>
                  <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
                  <span className="max-w-[80%] truncate text-[10px] font-bold tracking-[0.08em] text-slate-500 uppercase">
                    {card.bloco}
                  </span>
                  <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
                </div>
              )}
              <BoardCardItem
                card={card}
                dragging={dragging?.phaseId === card.phaseId && dragging.itemId === card.item.id}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onSetBoardStatus={onSetBoardStatus}
              />
            </div>
          ))
        )}
      </div>
    </section>
  )
}

function BoardCardItem({
  card,
  dragging,
  onDragStart,
  onDragEnd,
  onSetBoardStatus,
}: {
  card: CartaoBoard
  dragging: boolean
  onDragStart: (card: CartaoEmMovimento) => void
  onDragEnd: () => void
  onSetBoardStatus: (phaseId: string, itemId: string, status: BoardStatus) => void
}) {
  const trava = TRAVA_META[card.trava]
  const blocoDiferenteDaFase = card.bloco.localeCompare(card.phaseName, 'pt-BR', { sensitivity: 'base' }) !== 0

  return (
    <article
      className={cn(
        'rounded-lg border border-slate-200 border-l-4 bg-white p-3 shadow-xs transition focus-within:border-brand-300 focus-within:ring-2 focus-within:ring-brand-100 hover:border-slate-300 hover:shadow-sm',
        dragging && 'scale-[0.98] opacity-50',
      )}
      style={{ borderLeftColor: trava.dot }}
      aria-label={`${card.item.label}. Etapa ${card.phaseName}. ${trava.label}. ${card.item.clientResponsibility ? 'Responsabilidade do cliente' : 'Responsabilidade da Nairuz'}.`}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
            <span>Etapa: {card.phaseName}</span>
            {blocoDiferenteDaFase && (
              <>
                <span aria-hidden="true">·</span>
                <span>Bloco: {card.bloco}</span>
              </>
            )}
          </p>
          <h3 className={cn(
            'mt-1.5 text-sm font-semibold leading-snug text-slate-800',
            card.item.done && 'text-slate-500 line-through decoration-slate-300',
          )}>
            {card.item.label}
          </h3>
        </div>
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
          className="-mt-1 -mr-1 inline-flex size-10 shrink-0 cursor-grab items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-1 active:cursor-grabbing"
          title="Arrastar card"
          aria-label={`Arrastar ${card.item.label}`}
        >
          <GripVertical className="size-4" />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <TravaChip level={card.trava} />
        <ResponsibilityChip client={!!card.item.clientResponsibility} />
      </div>

      <label className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-2.5" data-kanban-no-pan>
        <span className="shrink-0 text-[11px] font-semibold text-slate-500">Mover para</span>
        <select
          value={card.status}
          onChange={(event) => onSetBoardStatus(card.phaseId, card.item.id, event.target.value as BoardStatus)}
          aria-label={`Mover ${card.item.label} para outra coluna`}
          className="h-10 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 outline-none transition hover:border-slate-300 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        >
          {BOARD_COLUMNS.map((status) => (
            <option key={status} value={status}>
              {BOARD_STATUS_META[status].label}
            </option>
          ))}
        </select>
      </label>
    </article>
  )
}

function TravaChip({ level }: { level: TravaLevel }) {
  const meta = TRAVA_META[level]

  return (
    <span
      className={cn('inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold', meta.badge)}
      title={meta.hint}
    >
      <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: meta.dot }} aria-hidden="true" />
      {meta.label}
    </span>
  )
}

function ResponsibilityChip({ client }: { client: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold',
        client
          ? 'border-orange-200 bg-orange-50 text-orange-700'
          : 'border-slate-200 bg-slate-50 text-slate-600',
      )}
      title={client ? 'Responsabilidade do cliente' : 'Responsabilidade da Nairuz'}
    >
      {client ? <User className="size-3" aria-hidden="true" /> : <Users className="size-3" aria-hidden="true" />}
      {client ? 'Cliente' : 'Nairuz'}
    </span>
  )
}
