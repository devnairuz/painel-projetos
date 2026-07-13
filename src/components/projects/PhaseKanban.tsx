import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent, type PointerEvent } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  GripVertical,
  LayoutGrid,
  Search,
  SlidersHorizontal,
  User,
  Users,
  X,
} from 'lucide-react'
import type { BoardStatus, ChecklistItem, Phase, TravaLevel } from '@/types'
import { BOARD_COLUMNS, BOARD_STATUS_META, PHASE_STATUS_META, TRAVA_META } from '@/constants'
import { boardStatusOf } from '@/utils/projects'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select } from '@/components/ui/Select'
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

const TODAS_AS_ETAPAS = 'todas'

function idDaEtapaEmFoco(phases: Phase[]): string {
  const ordenadas = [...phases].sort((a, b) => a.order - b.order)
  return (
    ordenadas.find((phase) => phase.status === 'em_andamento')?.id
    ?? ordenadas.find((phase) => phase.status !== 'concluida')?.id
    ?? TODAS_AS_ETAPAS
  )
}

function normalizarBusca(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim()
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
  const [etapaSelecionada, setEtapaSelecionada] = useState(() => (
    phases.length > 0 ? idDaEtapaEmFoco(phases) : ''
  ))
  const [busca, setBusca] = useState('')
  const [mostrarConcluidos, setMostrarConcluidos] = useState(false)
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const panRef = useRef({ pointerId: 0, startX: 0, scrollLeft: 0 })
  const etapasOrdenadas = [...phases].sort((a, b) => a.order - b.order)
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
  const idEtapaAplicada = etapaSelecionada || idDaEtapaEmFoco(phases)
  const termoBusca = normalizarBusca(busca)
  const cardsDaEtapa = idEtapaAplicada === TODAS_AS_ETAPAS
    ? cards
    : cards.filter((card) => card.phaseId === idEtapaAplicada)
  const cardsVisiveis = cardsDaEtapa.filter((card) => {
    if (!mostrarConcluidos && card.status === 'concluido') return false
    if (!termoBusca) return true
    return normalizarBusca(`${card.item.label} ${card.bloco} ${card.phaseName}`).includes(termoBusca)
  })
  const colunasVisiveis = mostrarConcluidos
    ? BOARD_COLUMNS
    : BOARD_COLUMNS.filter((status) => status !== 'concluido')
  const etapaEmExibicao = phases.find((phase) => phase.id === idEtapaAplicada)
  const concluidosOcultos = cardsDaEtapa.filter((card) => card.status === 'concluido').length

  useEffect(() => {
    setEtapaSelecionada((atual) => {
      if (phases.length === 0) return atual
      if (!atual) return idDaEtapaEmFoco(phases)
      if (atual === TODAS_AS_ETAPAS || phases.some((phase) => phase.id === atual)) return atual
      return idDaEtapaEmFoco(phases)
    })
  }, [phases])

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return

    const observer = new ResizeObserver(() => atualizarPistasRolagem(scroller, setPistasRolagem))
    observer.observe(scroller)
    return () => observer.disconnect()
  }, [cardsVisiveis.length, colunasVisiveis.length])

  if (cards.length === 0) {
    return (
      <EmptyState
        icon={LayoutGrid}
        title="Nenhum card no Kanban"
        description="Adicione itens às etapas para acompanhar o fluxo de trabalho por aqui."
      />
    )
  }

  const semResultadosBusca = !!termoBusca && cardsVisiveis.length === 0
  const apenasConcluidosOcultos = !mostrarConcluidos
    && cardsVisiveis.length === 0
    && concluidosOcultos > 0

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
    <div className="space-y-4">
      <section
        aria-labelledby="kanban-foco-titulo"
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"
              aria-hidden="true"
            >
              <SlidersHorizontal className="size-4" />
            </span>
            <div className="min-w-0">
              <h2 id="kanban-foco-titulo" className="text-sm font-bold text-slate-900">
                Foco do Kanban
              </h2>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                Visualize uma etapa por vez para reduzir o volume de cards e encontrar o próximo passo.
              </p>
            </div>
          </div>
          <p className="shrink-0 text-xs font-medium text-slate-600" aria-live="polite">
            <span className="font-bold text-slate-900">{cardsVisiveis.length}</span> de {cardsDaEtapa.length}{' '}
            {cardsDaEtapa.length === 1 ? 'item exibido' : 'itens exibidos'}
          </p>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(13rem,0.85fr)_minmax(15rem,1.15fr)_auto] lg:items-end">
          <label className="block min-w-0">
            <span className="mb-1.5 block text-xs font-semibold text-slate-700">Etapa em foco</span>
            <Select
              value={idEtapaAplicada}
              onChange={(event) => {
                setEtapaSelecionada(event.target.value)
                scrollerRef.current?.scrollTo({ left: 0, behavior: 'smooth' })
              }}
              aria-label="Filtrar Kanban por etapa"
              options={[
                { value: TODAS_AS_ETAPAS, label: `Todas as etapas (${cards.length})` },
                ...etapasOrdenadas.map((phase) => ({
                  value: phase.id,
                  label: `${phase.order}. ${phase.name} (${phase.checklist.length})`,
                })),
              ]}
            />
          </label>

          <div className="block min-w-0">
            <label htmlFor="kanban-busca" className="mb-1.5 block text-xs font-semibold text-slate-700">
              Buscar item ou bloco
            </label>
            <span className="relative block">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="kanban-busca"
                type="search"
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Ex.: acessos, pagamentos..."
                className="h-10 w-full rounded-xl border border-slate-300 bg-white pr-10 pl-9 text-sm text-slate-800 shadow-sm shadow-slate-950/5 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
              {busca && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-1/2 right-1 size-8 -translate-y-1/2 p-0"
                  onClick={() => setBusca('')}
                  aria-label="Limpar busca"
                  title="Limpar busca"
                >
                  <X className="size-4" />
                </Button>
              )}
            </span>
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-semibold text-slate-700">Itens encerrados</span>
            <Button
              variant="secondary"
              className="w-full whitespace-nowrap lg:w-auto"
              aria-pressed={mostrarConcluidos}
              onClick={() => setMostrarConcluidos((atual) => !atual)}
            >
              {mostrarConcluidos
                ? <EyeOff className="size-4" aria-hidden="true" />
                : <Eye className="size-4" aria-hidden="true" />}
              {mostrarConcluidos ? 'Ocultar concluídos' : 'Mostrar concluídos'}
              {!mostrarConcluidos && concluidosOcultos > 0 && (
                <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                  {concluidosOcultos}
                </span>
              )}
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          {etapaEmExibicao ? (
            <>
              <span className="text-xs font-semibold text-slate-600">Em foco:</span>
              <span className="max-w-full truncate text-xs font-bold text-slate-800">
                Etapa {etapaEmExibicao.order} · {etapaEmExibicao.name}
              </span>
              <Badge meta={PHASE_STATUS_META[etapaEmExibicao.status]} withDot />
            </>
          ) : (
            <span className="text-xs font-medium text-slate-600">Visão consolidada de todas as etapas</span>
          )}
        </div>
      </section>

      <Legend />

      {cardsVisiveis.length === 0 ? (
        <EmptyState
          icon={Search}
          title={semResultadosBusca
            ? 'Nenhum item encontrado'
            : apenasConcluidosOcultos
              ? 'Todos os itens deste foco estão concluídos'
              : 'Esta etapa ainda não possui itens'}
          description={semResultadosBusca
            ? 'Tente outro termo ou limpe a busca para visualizar os cards disponíveis.'
            : apenasConcluidosOcultos
              ? 'Mostre os concluídos para consultar o histórico desta etapa.'
              : 'Selecione outra etapa ou veja o projeto completo no Kanban.'}
          action={(
            <>
              {semResultadosBusca && (
                <Button variant="secondary" onClick={() => setBusca('')}>Limpar busca</Button>
              )}
              {apenasConcluidosOcultos && (
                <Button variant="secondary" onClick={() => setMostrarConcluidos(true)}>
                  <Eye className="size-4" aria-hidden="true" />
                  Mostrar concluídos
                </Button>
              )}
              {cardsDaEtapa.length === 0 && idEtapaAplicada !== TODAS_AS_ETAPAS && (
                <Button variant="secondary" onClick={() => setEtapaSelecionada(TODAS_AS_ETAPAS)}>
                  Ver todas as etapas
                </Button>
              )}
            </>
          )}
          className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50"
        />
      ) : (
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
            {colunasVisiveis.map((status) => (
              <BoardColumn
                key={status}
                status={status}
                cards={cardsVisiveis.filter((card) => card.status === status)}
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
      )}

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
    <details className="group rounded-xl border border-slate-200 bg-slate-50/70">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block text-xs font-semibold text-slate-700">Como funciona o semáforo das travas?</span>
          <span className="mt-0.5 block text-xs text-slate-500">
            Vermelho bloqueia a entrada, amarelo retém a publicação e verde não bloqueia.
          </span>
        </span>
        <ChevronRight
          className="size-4 shrink-0 text-slate-400 transition-transform group-open:rotate-90"
          aria-hidden="true"
        />
      </summary>
      <div className="border-t border-slate-200 px-3.5 py-3">
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
    </details>
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
          <h3 className={cn(
            'text-sm font-semibold leading-snug text-slate-800',
            card.item.done && 'text-slate-500 line-through decoration-slate-300',
          )}>
            {card.item.label}
          </h3>
          <p className="mt-1.5 truncate text-[11px] font-medium text-slate-500" title={card.phaseName}>
            Etapa · {card.phaseName}
          </p>
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
          className="-mt-1 -mr-1 inline-flex size-9 shrink-0 cursor-grab items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-1 active:cursor-grabbing"
          title="Arrastar card"
          aria-label={`Arrastar ${card.item.label}`}
        >
          <GripVertical className="size-4" />
        </button>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <TravaChip level={card.trava} />
        <ResponsibilityChip client={!!card.item.clientResponsibility} />
      </div>

      <label className="mt-2.5 flex items-center gap-2 border-t border-slate-100 pt-2.5" data-kanban-no-pan>
        <span className="shrink-0 text-[11px] font-semibold text-slate-500">Mover para</span>
        <Select
          value={card.status}
          onChange={(event) => onSetBoardStatus(card.phaseId, card.item.id, event.target.value as BoardStatus)}
          aria-label={`Mover ${card.item.label} para outra coluna`}
          className="min-w-0 flex-1 [&_select]:h-9 [&_select]:rounded-lg [&_select]:border-slate-200 [&_select]:text-xs [&_select]:font-medium"
          options={BOARD_COLUMNS.map((status) => ({
            value: status,
            label: BOARD_STATUS_META[status].label,
          }))}
        />
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
