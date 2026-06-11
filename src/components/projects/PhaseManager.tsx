import { useState, type FormEvent } from 'react'
import { GripVertical, Trash2, Plus, Check, ChevronDown, Eye, EyeOff, UserCheck, Star } from 'lucide-react'
import type { ChecklistItem, Phase, TeamMember } from '@/types'
import type { PhaseSettingsPatch } from '@/services/projectsService'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'

interface PhaseManagerProps {
  phases: Phase[] // já ordenadas
  team: TeamMember[]
  onAdd: (name: string) => void
  onRename: (phaseId: string, name: string) => void
  onRemove: (phaseId: string) => void
  onUpdateSettings: (phaseId: string, patch: PhaseSettingsPatch) => void
  onAddItem: (phaseId: string, label: string) => void
  onRenameItem: (phaseId: string, itemId: string, label: string) => void
  onRemoveItem: (phaseId: string, itemId: string) => void
}

/** Editor de etapas: nome, visibilidade/aprovação, pontos, responsável e itens. */
export function PhaseManager({
  phases,
  team,
  onAdd,
  onRename,
  onRemove,
  onUpdateSettings,
  onAddItem,
  onRenameItem,
  onRemoveItem,
}: PhaseManagerProps) {
  const [newName, setNewName] = useState('')

  function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    onAdd(newName)
    setNewName('')
  }

  return (
    <div className="space-y-2">
      {phases.map((phase) => (
        <PhaseRow
          key={phase.id}
          phase={phase}
          team={team}
          onRename={onRename}
          onRemove={onRemove}
          onUpdateSettings={onUpdateSettings}
          onAddItem={onAddItem}
          onRenameItem={onRenameItem}
          onRemoveItem={onRemoveItem}
        />
      ))}

      <form onSubmit={handleAdd} className="flex items-center gap-2 pt-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nova etapa…"
          className="h-10 flex-1 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
        />
        <Button type="submit">
          <Plus className="size-4" />
          Adicionar etapa
        </Button>
      </form>
    </div>
  )
}

function PhaseRow({
  phase,
  team,
  onRename,
  onRemove,
  onUpdateSettings,
  onAddItem,
  onRenameItem,
  onRemoveItem,
}: {
  phase: Phase
  team: TeamMember[]
  onRename: (id: string, name: string) => void
  onRemove: (id: string) => void
  onUpdateSettings: (phaseId: string, patch: PhaseSettingsPatch) => void
  onAddItem: (phaseId: string, label: string) => void
  onRenameItem: (phaseId: string, itemId: string, label: string) => void
  onRemoveItem: (phaseId: string, itemId: string) => void
}) {
  const [value, setValue] = useState(phase.name)
  const [points, setPoints] = useState(String(phase.points ?? 0))
  const [open, setOpen] = useState(false)
  const dirty = value.trim() !== phase.name && value.trim().length > 0
  const visible = phase.clientVisible !== false
  const requires = !!phase.requiresApproval

  function commitName() {
    if (dirty) onRename(phase.id, value)
  }
  function commitPoints() {
    const n = Math.max(0, Number(points) || 0)
    if (n !== (phase.points ?? 0)) onUpdateSettings(phase.id, { points: n })
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      {/* Linha 1: nome */}
      <div className="flex items-center gap-2 px-3 pt-2">
        <GripVertical className="size-4 shrink-0 text-slate-300" />
        <span className="w-6 shrink-0 text-center text-xs font-semibold text-slate-400">{phase.order}</span>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commitName()
            }
          }}
          className="h-9 flex-1 rounded-lg border border-transparent bg-transparent px-2 text-sm font-medium text-slate-800 hover:border-slate-200 focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100 focus:outline-none"
        />
        {dirty && (
          <button onClick={commitName} className="text-brand-600 hover:text-brand-700" title="Salvar nome" aria-label="Salvar nome">
            <Check className="size-4" />
          </button>
        )}
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
          title="Itens do checklist"
        >
          {phase.checklist.length} {phase.checklist.length === 1 ? 'item' : 'itens'}
          <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} />
        </button>
        <button
          onClick={() => {
            if (window.confirm(`Remover a etapa "${phase.name}"?`)) onRemove(phase.id)
          }}
          className="text-slate-400 transition-colors hover:text-red-500"
          title="Remover etapa"
          aria-label={`Remover etapa ${phase.name}`}
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      {/* Linha 2: configurações */}
      <div className="flex flex-wrap items-center gap-2 px-3 pb-2 pl-11">
        {/* Visível ao cliente */}
        <button
          onClick={() => onUpdateSettings(phase.id, { clientVisible: !visible })}
          className={cn(
            'inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium transition-colors',
            visible
              ? 'border-brand-200 bg-brand-50 text-brand-700'
              : 'border-slate-200 bg-slate-50 text-slate-500',
          )}
          title={visible ? 'Visível para o cliente' : 'Oculto para o cliente'}
        >
          {visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
          {visible ? 'Cliente vê' : 'Oculto'}
        </button>

        {/* Exige aprovação */}
        <button
          onClick={() => onUpdateSettings(phase.id, { requiresApproval: !requires })}
          className={cn(
            'inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium transition-colors',
            requires
              ? 'border-amber-200 bg-amber-50 text-amber-700'
              : 'border-slate-200 bg-slate-50 text-slate-500',
          )}
          title={requires ? 'Exige aprovação do cliente' : 'Não exige aprovação'}
        >
          <UserCheck className="size-3.5" />
          {requires ? 'Exige aprovação' : 'Sem aprovação'}
        </button>

        {/* Pontos */}
        <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600">
          <Star className="size-3.5 text-amber-500" />
          <input
            type="number"
            min={0}
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            onBlur={commitPoints}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commitPoints()
              }
            }}
            className="w-12 bg-transparent text-right outline-none"
          />
          pts
        </div>

        {/* Responsável */}
        <select
          value={phase.ownerId ?? ''}
          onChange={(e) => onUpdateSettings(phase.id, { ownerId: e.target.value })}
          className="h-7 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-600 focus:border-brand-400 focus:outline-none"
          title="Responsável pela etapa"
        >
          <option value="">Sem responsável</option>
          {team.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      {/* Checklist editável */}
      {open && (
        <div className="border-t border-slate-100 bg-slate-50/60 px-3 py-3 pl-12">
          <ChecklistEditor
            phaseId={phase.id}
            items={phase.checklist}
            onAddItem={onAddItem}
            onRenameItem={onRenameItem}
            onRemoveItem={onRemoveItem}
          />
        </div>
      )}
    </div>
  )
}

function ChecklistEditor({
  phaseId,
  items,
  onAddItem,
  onRenameItem,
  onRemoveItem,
}: {
  phaseId: string
  items: ChecklistItem[]
  onAddItem: (phaseId: string, label: string) => void
  onRenameItem: (phaseId: string, itemId: string, label: string) => void
  onRemoveItem: (phaseId: string, itemId: string) => void
}) {
  const [newItem, setNewItem] = useState('')

  function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!newItem.trim()) return
    onAddItem(phaseId, newItem)
    setNewItem('')
  }

  return (
    <div className="space-y-1.5">
      {items.length === 0 && <p className="text-xs text-slate-400">Nenhum item ainda — adicione abaixo.</p>}
      {items.map((item) => (
        <ItemRow
          key={item.id}
          item={item}
          onRename={(label) => onRenameItem(phaseId, item.id, label)}
          onRemove={() => onRemoveItem(phaseId, item.id)}
        />
      ))}

      <form onSubmit={handleAdd} className="flex items-center gap-2 pt-1">
        <input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Novo item do checklist…"
          className="h-9 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
        />
        <Button type="submit" size="sm">
          <Plus className="size-3.5" />
          Item
        </Button>
      </form>
    </div>
  )
}

function ItemRow({
  item,
  onRename,
  onRemove,
}: {
  item: ChecklistItem
  onRename: (label: string) => void
  onRemove: () => void
}) {
  const [value, setValue] = useState(item.label)
  const dirty = value.trim() !== item.label && value.trim().length > 0

  function commit() {
    if (dirty) onRename(value)
  }

  return (
    <div className="flex items-center gap-2">
      <span className={cn('size-2 shrink-0 rounded-full', item.done ? 'bg-brand-500' : 'bg-slate-300')} />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit()
          }
        }}
        className="h-8 flex-1 rounded-lg border border-transparent bg-transparent px-2 text-sm text-slate-700 hover:border-slate-200 focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100 focus:outline-none"
      />
      {dirty && (
        <button onClick={commit} className="text-brand-600 hover:text-brand-700" title="Salvar" aria-label="Salvar item">
          <Check className="size-3.5" />
        </button>
      )}
      <button onClick={onRemove} className="text-slate-400 transition-colors hover:text-red-500" title="Remover item" aria-label={`Remover item ${item.label}`}>
        <Trash2 className="size-3.5" />
      </button>
    </div>
  )
}
