import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { LogIn, AlertCircle } from 'lucide-react'
import { useClientAuth } from '@/hooks/useClientAuth'
import { Logo } from '@/components/layout/Logo'
import { Button } from '@/components/ui/Button'
import { CLIENT_USERS } from '@/services/mockData'

/** Login do cliente (mock): valida o e-mail, qualquer senha é aceita. */
export function ClientLoginPage() {
  const { user, login } = useClientAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string>()
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to="/cliente" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(undefined)
    setSubmitting(true)
    try {
      await login(email)
      navigate('/cliente')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao entrar.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-navy-900 to-navy-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="inline-block">
            <Logo />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xl">
          <h1 className="text-xl font-bold text-slate-900">Portal do cliente</h1>
          <p className="mt-1 text-sm text-slate-500">
            Acompanhe o andamento do seu projeto com a Nairuz.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">E-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              <LogIn className="size-4" />
              {submitting ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>

          {/* Dica de demo */}
          <div className="mt-6 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
            <p className="mb-1 font-semibold text-slate-600">Protótipo — logins de demonstração:</p>
            <ul className="space-y-0.5">
              {CLIENT_USERS.slice(0, 3).map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => setEmail(u.email)}
                    className="text-brand-600 hover:underline"
                  >
                    {u.email}
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-1.5">Qualquer senha funciona.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
