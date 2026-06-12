import { useState, type FormEvent } from 'react'
import { Send } from 'lucide-react'
import type { ChecklistComment } from '@/types'
import { formatDate } from '@/utils/dates'
import { cn } from '@/utils/cn'

interface CommentThreadProps {
  comments: ChecklistComment[]
  onAdd: (body: string) => void | Promise<void>
  placeholder?: string
  /** Lado de quem está escrevendo — alinha visualmente as bolhas. */
  side?: 'nairuz' | 'cliente'
}

/** Thread de comentários de uma subtarefa (Nairuz ⇄ cliente). */
export function CommentThread({ comments, onAdd, placeholder, side = 'nairuz' }: CommentThreadProps) {
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const text = body.trim()
    if (!text) return
    setBusy(true)
    await onAdd(text)
    setBusy(false)
    setBody('')
  }

  return (
    <div>
      {comments.length > 0 ? (
        <ul className="mb-2 space-y-2">
          {comments.map((c) => {
            const mine = c.authorType === side
            return (
              <li key={c.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-3 py-2 text-sm',
                    c.authorType === 'cliente'
                      ? 'bg-brand-50 text-slate-700'
                      : 'bg-slate-100 text-slate-700',
                  )}
                >
                  <div className="mb-0.5 flex items-center gap-2">
                    <span
                      className={cn(
                        'text-xs font-semibold',
                        c.authorType === 'cliente' ? 'text-brand-700' : 'text-navy-900',
                      )}
                    >
                      {c.authorName}
                    </span>
                    <span className="text-[10px] text-slate-400">{formatDate(c.createdAt)}</span>
                  </div>
                  <p className="whitespace-pre-wrap">{c.body}</p>
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="mb-2 text-xs text-slate-400">Sem comentários ainda.</p>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={placeholder ?? 'Escrever um comentário…'}
          className="h-9 flex-1 rounded-lg border border-slate-200 px-2.5 text-sm text-slate-700 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !body.trim()}
          className="flex size-9 items-center justify-center rounded-lg bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          aria-label="Enviar comentário"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  )
}
