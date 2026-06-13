import { useState, type FormEvent } from 'react'
import { Mail, Plus, X, ShieldCheck, Link2, Check } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { grantClientAccess, revokeClientAccess } from '@/services/projectsService'

interface ClientAccessCardProps {
  projectId: string
  emails: string[]
  /** Recarrega o projeto após liberar/remover acesso. */
  onChanged: () => void
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Card da visão Nairuz para controlar quais e-mails de cliente têm acesso ao
 * projeto. É a ponta da empresa na conectividade cliente↔empresa.
 */
export function ClientAccessCard({ projectId, emails, onChanged }: ClientAccessCardProps) {
  const { notify } = useToast()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState<string>()

  /** Link de convite pré-preenchido com o e-mail do cliente. */
  function inviteLink(target: string) {
    return `${window.location.origin}/cliente/login?email=${encodeURIComponent(target)}`
  }

  async function handleCopyInvite(target: string) {
    try {
      await navigator.clipboard.writeText(inviteLink(target))
      setCopied(target)
      notify(`Link de convite de ${target} copiado.`, 'info')
      setTimeout(() => setCopied((c) => (c === target ? undefined : c)), 2000)
    } catch {
      notify('Não foi possível copiar o link.', 'error')
    }
  }

  async function handleGrant(e: FormEvent) {
    e.preventDefault()
    const clean = email.trim().toLowerCase()
    if (!EMAIL_RE.test(clean)) {
      setError('Informe um e-mail válido.')
      return
    }
    if (emails.some((x) => x.toLowerCase() === clean)) {
      setError('Esse e-mail já tem acesso.')
      return
    }
    setError(undefined)
    setBusy(true)
    await grantClientAccess(projectId, clean)
    setBusy(false)
    setEmail('')
    notify(`Acesso liberado para ${clean}.`)
    onChanged()
  }

  async function handleRevoke(target: string) {
    await revokeClientAccess(projectId, target)
    notify(`Acesso de ${target} removido.`, 'info')
    onChanged()
  }

  return (
    <Card className="p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
        <ShieldCheck className="size-5 text-brand-600" />
        Acesso do cliente
      </h2>
      <p className="mt-0.5 text-sm text-slate-500">
        Libere o e-mail do cliente para ele acompanhar este projeto no portal.
      </p>

      {/* Lista de e-mails liberados */}
      <ul className="mt-4 space-y-2">
        {emails.length === 0 ? (
          <li className="rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-400">
            Nenhum e-mail liberado ainda.
          </li>
        ) : (
          emails.map((e) => (
            <li
              key={e}
              className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2"
            >
              <Mail className="size-4 shrink-0 text-slate-400" />
              <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{e}</span>
              <button
                type="button"
                onClick={() => handleCopyInvite(e)}
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-brand-50 hover:text-brand-600"
                title="Copiar link de convite"
                aria-label={`Copiar link de convite para ${e}`}
              >
                {copied === e ? <Check className="size-4 text-emerald-600" /> : <Link2 className="size-4" />}
              </button>
              <button
                type="button"
                onClick={() => handleRevoke(e)}
                className="text-slate-400 transition-colors hover:text-red-500"
                title="Remover acesso"
                aria-label={`Remover acesso de ${e}`}
              >
                <X className="size-4" />
              </button>
            </li>
          ))
        )}
      </ul>

      {/* Liberar novo e-mail */}
      <form onSubmit={handleGrant} className="mt-3 flex items-start gap-2">
        <div className="flex-1">
          <input
            type="email"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            placeholder="email@cliente.com"
            className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
          />
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
        <Button type="submit" size="md" disabled={busy}>
          <Plus className="size-4" />
          Liberar
        </Button>
      </form>
    </Card>
  )
}
