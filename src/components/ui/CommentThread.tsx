import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { AtSign, ImagePlus, Send, X } from 'lucide-react'
import type { ChecklistComment, CommentAttachment } from '@/types'
import type { MentionableUser } from '@/services/usersService'
import { formatDate } from '@/utils/dates'
import { cn } from '@/utils/cn'

interface CommentThreadProps {
  comments: ChecklistComment[]
  onAdd: (
    body: string,
    mentionedUserIds: string[],
    attachments?: CommentAttachment[],
  ) => void | Promise<void>
  placeholder?: string
  side?: 'nairuz' | 'cliente'
  currentAuthorId?: string
  currentAuthorName?: string
  /** Usuários disponíveis para menção (@). Vazio = sem menção. */
  users?: MentionableUser[]
}

const MAX_IMAGE_DATA_URL_LENGTH = 1_450_000
const MAX_IMAGE_DIMENSION = 1440

/** Thread de comentários da subtarefa, com menção (@) e imagem anexada. */
export function CommentThread({
  comments,
  onAdd,
  placeholder,
  side = 'nairuz',
  currentAuthorId,
  currentAuthorName,
  users = [],
}: CommentThreadProps) {
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [processingImage, setProcessingImage] = useState(false)
  const [attachments, setAttachments] = useState<CommentAttachment[]>([])
  const [error, setError] = useState('')
  const [picked, setPicked] = useState<{ id: string; name: string }[]>([])
  const [query, setQuery] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const suggestions =
    query !== null && users.length > 0
      ? users.filter((u) => u.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
      : []

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
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

  async function handleImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Envie apenas arquivos de imagem.')
      return
    }

    setError('')
    setProcessingImage(true)
    try {
      setAttachments([await imageFileToAttachment(file)])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível anexar a imagem.')
    } finally {
      setProcessingImage(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const text = body.trim()
    if (!text && attachments.length === 0) return
    const ids = [...new Set(picked.filter((p) => body.includes(`@${p.name}`)).map((p) => p.id))]
    setBusy(true)
    try {
      await onAdd(text, ids, attachments)
      setBody('')
      setAttachments([])
      setPicked([])
      setQuery(null)
      setError('')
    } finally {
      setBusy(false)
    }
  }

  function isMine(comment: ChecklistComment) {
    if (currentAuthorId && comment.authorId) return comment.authorId === currentAuthorId
    if (currentAuthorName && comment.authorName) {
      return comment.authorType === side && normalizeName(comment.authorName) === normalizeName(currentAuthorName)
    }
    return comment.authorType === side
  }

  return (
    <div>
      {comments.length > 0 ? (
        <ul className="mb-2 space-y-2">
          {comments.map((comment) => {
            const mine = isMine(comment)
            return (
              <li key={comment.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-3 py-2 text-sm',
                    mine ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700',
                  )}
                >
                  <div className="mb-0.5 flex items-center gap-2">
                    <span className={cn('text-xs font-semibold', mine ? 'text-white' : 'text-navy-900')}>
                      {comment.authorName}
                    </span>
                    <span className={cn('text-[10px]', mine ? 'text-white/70' : 'text-slate-400')}>
                      {formatDate(comment.createdAt)}
                    </span>
                  </div>
                  {comment.body && <p className="whitespace-pre-wrap">{renderBody(comment.body, mine)}</p>}
                  {(comment.attachments ?? []).length > 0 && (
                    <div className={cn('space-y-2', comment.body && 'mt-2')}>
                      {(comment.attachments ?? []).map((attachment) => (
                        <a
                          key={attachment.id}
                          href={attachment.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block overflow-hidden rounded-xl"
                          title={attachment.name}
                        >
                          <img
                            src={attachment.url}
                            alt={attachment.name}
                            className="max-h-72 w-full object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="mb-2 text-xs text-slate-400">Sem comentários ainda.</p>
      )}

      <form onSubmit={handleSubmit} className="relative">
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

        {attachments.length > 0 && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2">
            <img
              src={attachments[0].url}
              alt={attachments[0].name}
              className="size-12 rounded-md object-cover"
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-slate-700">{attachments[0].name}</div>
              <div className="text-[10px] text-slate-400">Imagem anexada</div>
            </div>
            <button
              type="button"
              onClick={() => setAttachments([])}
              className="flex size-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Remover imagem"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        {error && <p className="mb-2 text-xs text-red-500">{error}</p>}

        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy || processingImage}
            className="flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-brand-600 disabled:opacity-50"
            aria-label="Anexar imagem"
            title="Anexar imagem"
          >
            <ImagePlus className="size-4" />
          </button>
          <input
            ref={inputRef}
            value={body}
            onChange={handleChange}
            placeholder={placeholder ?? (users.length > 0 ? 'Comentar... (use @ para mencionar)' : 'Escrever um comentário...')}
            className="h-9 flex-1 rounded-lg border border-slate-200 px-2.5 text-sm text-slate-700 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || processingImage || (!body.trim() && attachments.length === 0)}
            className="flex size-9 items-center justify-center rounded-lg bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
            aria-label="Enviar comentário"
          >
            <Send className="size-4" />
          </button>
        </div>
      </form>
    </div>
  )
}

/** Realça as menções (@Nome) no corpo do comentário. */
function renderBody(text: string, mine: boolean) {
  const parts = text.split(/(@[\p{L}][\p{L} .]*)/u)
  return parts.map((part, i) =>
    part.startsWith('@') ? (
      <span key={i} className={cn('font-semibold', mine ? 'text-white' : 'text-brand-700')}>
        {part.trimEnd()}
        {part.endsWith(' ') ? ' ' : ''}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}

function normalizeName(name: string) {
  return name.trim().toLowerCase()
}

async function imageFileToAttachment(file: File): Promise<CommentAttachment> {
  const dataUrl = await readFileAsDataUrl(file)
  const image = await loadImage(dataUrl)
  let width = image.naturalWidth || image.width
  let height = image.naturalHeight || image.height
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / width, MAX_IMAGE_DIMENSION / height)
  width = Math.max(1, Math.round(width * scale))
  height = Math.max(1, Math.round(height * scale))

  let quality = 0.86
  let output = ''
  for (let attempt = 0; attempt < 5; attempt += 1) {
    output = drawImageToJpeg(image, width, height, quality)
    if (output.length <= MAX_IMAGE_DATA_URL_LENGTH) break
    quality = Math.max(0.55, quality - 0.1)
    width = Math.max(320, Math.round(width * 0.82))
    height = Math.max(320, Math.round(height * 0.82))
  }

  if (output.length > MAX_IMAGE_DATA_URL_LENGTH) {
    throw new Error('A imagem ainda ficou grande demais. Tente uma imagem menor.')
  }

  return {
    id: `att-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: file.name,
    mimeType: 'image/jpeg',
    size: Math.round((output.length * 3) / 4),
    url: output,
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Não foi possível processar a imagem.'))
    image.src = src
  })
}

function drawImageToJpeg(image: HTMLImageElement, width: number, height: number, quality: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Não foi possível preparar a imagem.')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(image, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', quality)
}
