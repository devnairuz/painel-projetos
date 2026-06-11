import { useState } from 'react'
import { PartyPopper, LifeBuoy, TrendingUp, ArrowRight, MessageCircle } from 'lucide-react'
import type { Project, UpsellCta } from '@/types'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'

interface FinalizationUpsellProps {
  project: Project
}

/**
 * Tela de conclusão (lado cliente) exibida quando a Nairuz encerra o projeto:
 * mensagem + dois caminhos (Sustentação / Evolução). Cada um revela a
 * apresentação e leva ao WhatsApp do comercial.
 */
export function FinalizationUpsell({ project }: FinalizationUpsellProps) {
  const { finalization, supportHours } = project

  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-br from-brand-500 to-brand-700 px-6 py-8 text-center text-white">
        <PartyPopper className="mx-auto mb-3 size-9" />
        <h2 className="text-2xl font-bold">Projeto concluído!</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-white/90">{finalization.mensagem}</p>
        {project.nps && (
          <p className="mt-3 text-xs text-white/80">
            Suporte ativo: <strong>{supportHours.depois}h</strong> · obrigado pela avaliação 💚
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
        <UpsellOption
          tone="brand"
          icon={LifeBuoy}
          title="Programa de Sustentação"
          cta={finalization.sustentacao}
        />
        <UpsellOption
          tone="indigo"
          icon={TrendingUp}
          title="Programa de Evolução"
          cta={finalization.evolucao}
        />
      </div>
    </Card>
  )
}

function UpsellOption({
  tone,
  icon: Icon,
  title,
  cta,
}: {
  tone: 'brand' | 'indigo'
  icon: typeof LifeBuoy
  title: string
  cta: UpsellCta
}) {
  const [open, setOpen] = useState(false)
  const ring = tone === 'brand' ? 'border-brand-200' : 'border-indigo-200'
  const iconBg = tone === 'brand' ? 'bg-brand-50 text-brand-600' : 'bg-indigo-50 text-indigo-600'

  return (
    <div className={cn('flex flex-col rounded-xl border p-5', ring)}>
      <div className={cn('mb-3 flex size-10 items-center justify-center rounded-xl', iconBg)}>
        <Icon className="size-5" />
      </div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>

      {open ? (
        <>
          <p className="mt-2 flex-1 text-sm text-slate-600">{cta.apresentacao}</p>
          <a href={cta.whatsappUrl} target="_blank" rel="noreferrer" className="mt-4">
            <Button className="w-full">
              <MessageCircle className="size-4" />
              Falar no WhatsApp
            </Button>
          </a>
        </>
      ) : (
        <>
          <p className="mt-2 flex-1 text-sm text-slate-500">
            Conheça como podemos continuar trabalhando juntos.
          </p>
          <Button variant="secondary" className="mt-4 w-full" onClick={() => setOpen(true)}>
            Conhecer
            <ArrowRight className="size-4" />
          </Button>
        </>
      )}
    </div>
  )
}
