import { useState } from 'react'
import { Gift, Star } from 'lucide-react'
import type { Nps } from '@/types'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { clientAnswerNps } from '@/services/clientProjectsService'
import {
  SURVEY_SECTIONS,
  SURVEY_QUESTIONS,
  FEEDBACK_QUESTION,
  type SurveyRatingKey,
} from '@/constants/satisfaction'
import { cn } from '@/utils/cn'

interface NpsGateProps {
  projectId: string
  hoursAfter: number
  onAnswered: () => void
}

/**
 * Pesquisa de satisfação (lado cliente): obrigatória para liberar a finalização.
 * Reúne as notas por seção (UX/UI, Desenvolvimento, PMO...) + feedback aberto.
 * Ao responder, as horas de suporte sobem.
 */
export function NpsGate({ projectId, hoursAfter, onAnswered }: NpsGateProps) {
  const { notify } = useToast()
  const [answers, setAnswers] = useState<Partial<Record<SurveyRatingKey, number>>>({})
  const [feedback, setFeedback] = useState('')
  const [saving, setSaving] = useState(false)

  const answeredCount = SURVEY_QUESTIONS.filter((q) => typeof answers[q.key] === 'number').length
  const total = SURVEY_QUESTIONS.length
  const complete = answeredCount === total

  async function handleSubmit() {
    if (!complete) return
    setSaving(true)
    const survey: Omit<Nps, 'answeredAt'> = {
      score: answers.score ?? 0,
      comment: feedback.trim() || undefined,
      satisfacaoProjeto: answers.satisfacaoProjeto,
      uxRecomendacao: answers.uxRecomendacao,
      uxEntregas: answers.uxEntregas,
      uxExperiencia: answers.uxExperiencia,
      devImplantacao: answers.devImplantacao,
      devLayout: answers.devLayout,
      devEstabilidade: answers.devEstabilidade,
      pmoAtendimento: answers.pmoAtendimento,
    }
    try {
      await clientAnswerNps(projectId, survey)
      notify(`Obrigado pela avaliação! Suas horas de suporte agora são ${hoursAfter}h.`)
      onAnswered()
    } catch {
      notify('Não foi possível enviar a avaliação. Tente novamente.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border-brand-200 p-6">
      <div className="mb-1 flex items-center gap-2">
        <Star className="size-5 text-brand-600" />
        <h2 className="text-lg font-semibold text-slate-900">Pesquisa de satisfação</h2>
      </div>
      <p className="text-sm text-slate-500">
        Sua avaliação nos ajuda a melhorar. Responder libera a finalização e amplia seu suporte para{' '}
        <strong>{hoursAfter}h</strong>.
      </p>

      <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        <Gift className="size-4 shrink-0" />
        Bônus de avaliação: +70 XP e liberação das horas extras de acompanhamento.
      </div>

      <div className="mt-6 space-y-7">
        {SURVEY_SECTIONS.map((sec) => (
          <div key={sec.section}>
            <h3 className="mb-3 text-xs font-bold tracking-wide text-brand-700 uppercase">
              {sec.section}
            </h3>
            <div className="space-y-5">
              {sec.questions.map((q) => (
                <div key={q.key}>
                  <p className="mb-2 text-sm text-slate-700">{q.question}</p>
                  <RatingScale
                    value={answers[q.key] ?? null}
                    onChange={(v) => setAnswers((a) => ({ ...a, [q.key]: v }))}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        <div>
          <h3 className="mb-3 text-xs font-bold tracking-wide text-brand-700 uppercase">Feedback Aberto</h3>
          <p className="mb-2 text-sm text-slate-700">{FEEDBACK_QUESTION}</p>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={3}
            placeholder="Opcional"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <span className="text-xs text-slate-400">
          {answeredCount}/{total} respondidas
        </span>
        <Button onClick={handleSubmit} disabled={!complete || saving}>
          {saving ? 'Enviando…' : 'Enviar avaliação'}
        </Button>
      </div>
    </Card>
  )
}

/** Escala 0–10 reutilizável. */
function RatingScale({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {Array.from({ length: 11 }).map((_, n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={cn(
            'size-9 rounded-lg border text-sm font-semibold transition-colors',
            value === n
              ? 'border-brand-600 bg-brand-600 text-white'
              : 'border-slate-200 text-slate-600 hover:border-brand-400',
          )}
        >
          {n}
        </button>
      ))}
    </div>
  )
}
