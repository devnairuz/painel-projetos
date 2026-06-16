import { useState } from 'react'
import { Gift, Star, ArrowLeft, ArrowRight, Check } from 'lucide-react'
import type { Nps } from '@/types'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { clientAnswerNps } from '@/services/clientProjectsService'
import { SURVEY_SECTIONS, FEEDBACK_QUESTION, type SurveyRatingKey } from '@/constants/satisfaction'
import { cn } from '@/utils/cn'

interface NpsGateProps {
  projectId: string
  hoursAfter: number
  onAnswered: () => void
}

/**
 * Pesquisa de satisfação (lado cliente) em formato de etapas — uma seção por
 * vez, estilo Google Forms. Obrigatória para liberar a finalização; cada etapa
 * de notas precisa ser respondida para avançar. Ao concluir, as horas sobem.
 */
export function NpsGate({ projectId, hoursAfter, onAnswered }: NpsGateProps) {
  const { notify } = useToast()
  const [answers, setAnswers] = useState<Partial<Record<SurveyRatingKey, number>>>({})
  const [feedback, setFeedback] = useState('')
  const [saving, setSaving] = useState(false)
  const [step, setStep] = useState(0)

  const totalSteps = SURVEY_SECTIONS.length + 1 // seções + feedback
  const isFeedback = step === SURVEY_SECTIONS.length
  const section = isFeedback ? null : SURVEY_SECTIONS[step]
  const isLast = step === totalSteps - 1

  // Só avança quando todas as notas da etapa atual foram dadas (feedback é livre).
  const canAdvance = section ? section.questions.every((q) => typeof answers[q.key] === 'number') : true

  function goNext() {
    if (canAdvance && !isLast) setStep((s) => s + 1)
  }
  function goBack() {
    setStep((s) => Math.max(0, s - 1))
  }

  async function handleSubmit() {
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

      {/* Progresso */}
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-500">
          <span>
            Etapa {step + 1} de {totalSteps}
          </span>
          <span className="font-semibold text-brand-700">{isFeedback ? 'Feedback Aberto' : section!.section}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-brand-500 transition-all duration-300"
            style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Bônus só na primeira etapa */}
      {step === 0 && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <Gift className="mt-0.5 size-4 shrink-0" />
          <span>
            Responder libera a finalização e amplia seu suporte para <strong>{hoursAfter}h</strong> — além de
            +70 XP de bônus.
          </span>
        </div>
      )}

      {/* Conteúdo da etapa */}
      <div className="mt-6 min-h-[190px]">
        {section ? (
          <div className="space-y-6">
            {section.questions.map((q) => (
              <div key={q.key}>
                <p className="mb-3 text-sm font-medium text-slate-800">{q.question}</p>
                <RatingScale
                  value={answers[q.key] ?? null}
                  onChange={(v) => setAnswers((a) => ({ ...a, [q.key]: v }))}
                />
              </div>
            ))}
          </div>
        ) : (
          <div>
            <p className="mb-3 text-sm font-medium text-slate-800">{FEEDBACK_QUESTION}</p>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              placeholder="Opcional"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Navegação */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <Button variant="secondary" onClick={goBack} disabled={step === 0 || saving}>
          <ArrowLeft className="size-4" />
          Voltar
        </Button>

        {isLast ? (
          <Button onClick={handleSubmit} disabled={saving}>
            <Check className="size-4" />
            {saving ? 'Enviando…' : 'Enviar avaliação'}
          </Button>
        ) : (
          <Button onClick={goNext} disabled={!canAdvance}>
            Próximo
            <ArrowRight className="size-4" />
          </Button>
        )}
      </div>

      {section && !canAdvance && (
        <p className="mt-2 text-right text-xs text-slate-400">Responda para avançar.</p>
      )}
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
