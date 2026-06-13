import { useRef, useState, type FormEvent } from 'react'
import { Send, AtSign } from 'lucide-react'
import type { ChecklistComment } from '@/types'
import type { MentionableUser } from '@/services/usersService'
import { formatDate } from '@/utils/dates'
import { cn } from '@/utils/cn'

interface CommentThreadProps {
  comments: ChecklistComment[]
  onAdd: (body: string, mentionedUserIds: string[]) => void | Promise<void>
  placeholder?: string
  side?: 'nairuz' | 'cliente'
  /** Usuários disponíveis para menção (@). Vazio = sem menção. */
  users?: MentionableUser[]
}

/** Thread de comentários da subtarefa, com menção (@) de usuários. */
export function CommentThread({ comments, onAdd, placeholder, side = 'nairuz', users = [] }: CommentThreadProps) {
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [picked, setPicked] = useState<{ id: string; name: string }[]>([])
  const [query, setQuery] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const suggestions =
    query !== null && users.length > 0
      ? users.filter((u) => u.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
      : []

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const text = e.target.value
    setBody(text)
    const caret = e.target.selectionStart ?? text.length
    const m = text.slice(0, caret).match(/@([^@]*)$/)
    setQuery(m && users.length > 0 ? m[1] : null)
  }

  function insertMention(u: MentionableUser) {
    const el = inputRef.current
    const caret = el?.selectionStart ?? body.length
    const atIdx = body.slice(0, caret).lastIndexOf('@')
    if (atIdx < 0) return
    const newBody = body.slice(0, atIdx) + `@${u.name} ` + body.slice(caret)
    setBody(newBody)
    setPicked((prev) => (prev.some((p) => p.id === u.id) ? prev : [...prev, { id: u.id, name: u.name }]))
    setQuery(null)
    requestAnimationFrame(() => {
      el?.focus()
      const pos = atIdx + u.name.length + 2
      el?.setSelectionRange(pos, pos)
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const text = body.trim()
    if (!text) return
    const ids = [...new Set(picked.filter((p) => body.includes(`@${p.name}`)).map((p) => p.id))]
    setBusy(true)
    await onAdd(text, ids)
    setBusy(false)
    setBody('')
    setPicked([])
    setQuery(null)
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
                    c.authorType === 'cliente' ? 'bg-brand-50 text-slate-700' : 'bg-slate-100 text-slate-700',
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
                  <p className="whitespace-pre-wrap">{renderBody(c.body)}</p>
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="mb-2 text-xs text-slate-400">Sem comentários ainda.</p>
      )}

      <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
        {suggestions.length > 0 && (
          <div className="absolute bottom-full left-0 z-20 mb-1 w-60 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
            <div className="border-b border-slate-100 px-3 py-1 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
              Mencionar
            </div>
            {suggestions.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => insertMention(u)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                <AtSign className="size-3.5 text-brand-600" />
                <span className="truncate">{u.name}</span>
              </button>
            ))}
          </div>
        )}
        <input
          ref={inputRef}
          value={body}
          onChange={handleChange}
          placeholder={placeholder ?? (users.length > 0 ? 'Comentar… (use @ para mencionar)' : 'Escrever um comentário…')}
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

/** Realça as menções (@Nome) no corpo do comentário. */
function renderBody(text: string) {
  const parts = text.split(/(@[\p{L}][\p{L} .]*)/u)
  return parts.map((part, i) =>
    part.startsWith('@') ? (
      <span key={i} className="font-semibold text-brand-700">
        {part.trimEnd()}
        {part.endsWith(' ') ? ' ' : ''}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}
