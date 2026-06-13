import { useState } from 'react'
import { Star } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { clientAnswerNps } from '@/services/clientProjectsService'
import { cn } from '@/utils/cn'

interface NpsGateProps {
  projectId: string
  hoursAfter: number
  onAnswered: () => void
}

/**
 * Portão de NPS (lado cliente): obrigatório para liberar a finalização. Ao
 * responder, as horas de suporte sobem.
 */
export function NpsGate({ projectId, hoursAfter, onAnswered }: NpsGateProps) {
  const { notify } = useToast()
  const [score, setScore] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    if (score === null) return
    setSaving(true)
    await clientAnswerNps(projectId, score, comment)
    setSaving(false)
    notify(`Obrigado pela avaliação! Suas horas de suporte agora são ${hoursAfter}h.`)
    onAnswered()
  }

  return (
    <Card className="border-brand-200 p-6">
      <div className="mb-1 flex items-center gap-2">
        <Star className="size-5 text-brand-600" />
        <h2 className="text-lg font-semibold text-slate-900">Sua avaliação (NPS)</h2>
      </div>
      <p className="text-sm text-slate-500">
        De 0 a 10, o quanto você recomendaria a Nairuz para um colega? Responder libera a finalização
        e amplia seu suporte para <strong>{hoursAfter}h</strong>.
      </p>

      {/* Escala 0–10 */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {Array.from({ length: 11 }).map((_, n) => (
          <button
            key={n}
            onClick={() => setScore(n)}
            className={cn(
              'size-9 rounded-lg border text-sm font-semibold transition-colors',
              score === n
                ? 'border-brand-600 bg-brand-600 text-white'
                : 'border-slate-200 text-slate-600 hover:border-brand-400',
            )}
          >
            {n}
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        placeholder="Quer deixar um comentário? (opcional)"
        className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
      />

      <Button onClick={handleSubmit} disabled={score === null || saving} className="mt-3 w-full">
        {saving ? 'Enviando…' : 'Enviar avaliação'}
      </Button>
    </Card>
  )
}
