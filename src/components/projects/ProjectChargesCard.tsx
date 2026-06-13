import { useState } from 'react'
import { AlertCircle, CheckCircle2, Plus, Send, XCircle } from 'lucide-react'
import type { Project, ProjectChargeSide, RiskLevel } from '@/types'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { addProjectCharge, updateProjectCharge } from '@/services/projectsService'
import { formatDate } from '@/utils/dates'
import { cn } from '@/utils/cn'

interface ProjectChargesCardProps {
  project: Project
  onProjectChange: (project: Project) => void
}

const SIDE_LABEL: Record<ProjectChargeSide, string> = {
  cliente: 'Cliente',
  nairuz: 'Nairuz',
  terceiro: 'Terceiro',
}

const PRIORITY_LABEL: Record<RiskLevel, string> = {
  baixo: 'Baixa',
  medio: 'Média',
  alto: 'Alta',
  critico: 'Crítica',
}

export function ProjectChargesCard({ project, onProjectChange }: ProjectChargesCardProps) {
  const [title, setTitle] = useState('')
  const [ownerSide, setOwnerSide] = useState<ProjectChargeSide>('cliente')
  const [priority, setPriority] = useState<RiskLevel>('medio')
  const [dueDate, setDueDate] = useState('')
  const openCharges = (project.charges ?? []).filter((charge) => charge.status !== 'resolvida' && charge.status !== 'cancelada')

  async function handleAdd() {
    if (!title.trim()) return
    const updated = await addProjectCharge(project.id, {
      title: title.trim(),
      ownerSide,
      priority,
      dueDate: dueDate || undefined,
    })
    setTitle('')
    setDueDate('')
    onProjectChange(updated)
  }

  async function setStatus(chargeId: string, status: 'respondida' | 'resolvida' | 'cancelada') {
    onProjectChange(await updateProjectCharge(project.id, chargeId, { status }))
  }

  return (
    <Card className="p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
        <AlertCircle className="size-5 text-amber-600" />
        Cobranças e pendências
      </h2>
      <p className="mt-0.5 text-sm text-slate-500">Tratativas formais com responsável, prazo e status.</p>

      <div className="mt-4 space-y-2">
        {openCharges.length === 0 ? (
          <div className="rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-400">Nenhuma pendência aberta.</div>
        ) : (
          openCharges.slice(0, 4).map((charge) => (
            <div key={charge.id} className="rounded-lg border border-slate-100 bg-white p-3">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-800">{charge.title}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                    <span>{SIDE_LABEL[charge.ownerSide]}</span>
                    <span>•</span>
                    <span>{PRIORITY_LABEL[charge.priority]}</span>
                    {charge.dueDate && (
                      <>
                        <span>•</span>
                        <span>{formatDate(charge.dueDate)}</span>
                      </>
                    )}
                  </div>
                </div>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
                    charge.status === 'respondida'
                      ? 'bg-sky-50 text-sky-700'
                      : 'bg-amber-50 text-amber-700',
                  )}
                >
                  {charge.status}
                </span>
              </div>
              <div className="mt-2 flex gap-1.5">
                <Button size="sm" variant="ghost" onClick={() => setStatus(charge.id, 'respondida')}>
                  <Send className="size-3.5" />
                  Respondida
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setStatus(charge.id, 'resolvida')}>
                  <CheckCircle2 className="size-3.5" />
                  Resolver
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setStatus(charge.id, 'cancelada')}>
                  <XCircle className="size-3.5" />
                  Cancelar
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 rounded-lg bg-slate-50 p-3">
        <div className="grid grid-cols-1 gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nova cobrança ou pendência"
            className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:border-brand-400 focus:outline-none"
          />
          <div className="grid grid-cols-[1fr_1fr_120px_auto] gap-2">
            <select
              value={ownerSide}
              onChange={(e) => setOwnerSide(e.target.value as ProjectChargeSide)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:border-brand-400 focus:outline-none"
            >
              <option value="cliente">Cliente</option>
              <option value="nairuz">Nairuz</option>
              <option value="terceiro">Terceiro</option>
            </select>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as RiskLevel)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:border-brand-400 focus:outline-none"
            >
              <option value="baixo">Baixa</option>
              <option value="medio">Média</option>
              <option value="alto">Alta</option>
              <option value="critico">Crítica</option>
            </select>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:border-brand-400 focus:outline-none"
            />
            <Button size="sm" onClick={handleAdd}>
              <Plus className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
