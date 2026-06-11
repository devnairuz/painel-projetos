import { useState } from 'react'
import { ChevronDown, Settings2 } from 'lucide-react'
import type { FinalizationConfig, Project } from '@/types'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { updateFinalization, updateSupportHours } from '@/services/projectsService'
import { cn } from '@/utils/cn'

interface FinalizationConfigCardProps {
  project: Project
  onChanged: () => void
}

function Input({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string | number
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-sm text-slate-700 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
      />
    </label>
  )
}

/**
 * Painel (Nairuz) para personalizar a finalização do projeto: mensagem,
 * apresentações e WhatsApp dos programas de Sustentação/Evolução, e as horas
 * de suporte antes/depois do NPS.
 */
export function FinalizationConfigCard({ project, onChanged }: FinalizationConfigCardProps) {
  const { notify } = useToast()
  const [open, setOpen] = useState(false)
  const [cfg, setCfg] = useState<FinalizationConfig>(() =>
    JSON.parse(JSON.stringify(project.finalization)),
  )
  const [antes, setAntes] = useState(project.supportHours.antes)
  const [depois, setDepois] = useState(project.supportHours.depois)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    await updateFinalization(project.id, cfg)
    await updateSupportHours(project.id, { antes: Number(antes) || 0, depois: Number(depois) || 0 })
    setSaving(false)
    notify('Configuração de finalização salva.')
    onChanged()
  }

  return (
    <Card className="p-5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left"
      >
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Settings2 className="size-5 text-slate-500" />
          Finalização &amp; upsell
        </h2>
        <ChevronDown className={cn('size-5 text-slate-400 transition-transform', open && 'rotate-180')} />
      </button>
      <p className="mt-0.5 text-sm text-slate-500">
        O que o cliente vê quando o projeto é encerrado.
      </p>

      {open && (
        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Mensagem de conclusão</span>
            <textarea
              value={cfg.mensagem}
              onChange={(e) => setCfg({ ...cfg, mensagem: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm text-slate-700 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Horas suporte (antes NPS)" type="number" value={antes} onChange={(v) => setAntes(Number(v))} />
            <Input label="Horas suporte (após NPS)" type="number" value={depois} onChange={(v) => setDepois(Number(v))} />
          </div>

          <fieldset className="rounded-lg border border-slate-200 p-3">
            <legend className="px-1 text-xs font-semibold text-brand-700">Programa de Sustentação</legend>
            <div className="space-y-2">
              <Input
                label="Apresentação"
                value={cfg.sustentacao.apresentacao}
                onChange={(v) => setCfg({ ...cfg, sustentacao: { ...cfg.sustentacao, apresentacao: v } })}
              />
              <Input
                label="Link WhatsApp"
                value={cfg.sustentacao.whatsappUrl}
                onChange={(v) => setCfg({ ...cfg, sustentacao: { ...cfg.sustentacao, whatsappUrl: v } })}
              />
            </div>
          </fieldset>

          <fieldset className="rounded-lg border border-slate-200 p-3">
            <legend className="px-1 text-xs font-semibold text-indigo-700">Programa de Evolução</legend>
            <div className="space-y-2">
              <Input
                label="Apresentação"
                value={cfg.evolucao.apresentacao}
                onChange={(v) => setCfg({ ...cfg, evolucao: { ...cfg.evolucao, apresentacao: v } })}
              />
              <Input
                label="Link WhatsApp"
                value={cfg.evolucao.whatsappUrl}
                onChange={(v) => setCfg({ ...cfg, evolucao: { ...cfg.evolucao, whatsappUrl: v } })}
              />
            </div>
          </fieldset>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? 'Salvando…' : 'Salvar configuração'}
          </Button>
        </div>
      )}
    </Card>
  )
}
