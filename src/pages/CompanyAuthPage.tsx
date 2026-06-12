import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { LogIn, UserPlus, AlertCircle, MailCheck } from 'lucide-react'
import { useCompanyAuth } from '@/hooks/useCompanyAuth'
import { registerCompany } from '@/services/companyAuthService'
import { Logo } from '@/components/layout/Logo'
import { Button } from '@/components/ui/Button'

type Mode = 'login' | 'register' | 'verify'

const inputCls =
  'h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none'

export function CompanyAuthPage() {
  const { user, login, verify } = useCompanyAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [devCode, setDevCode] = useState<string>()
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />

  async function run(fn: () => Promise<void>) {
    setError(undefined)
    setBusy(true)
    try {
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha na operação.')
    } finally {
      setBusy(false)
    }
  }

  const onLogin = (e: FormEvent) => {
    e.preventDefault()
    run(async () => {
      await login(email, password)
      navigate('/')
    })
  }

  const onRegister = (e: FormEvent) => {
    e.preventDefault()
    run(async () => {
      const res = await registerCompany({ name, email, password })
      setDevCode(res.devCode)
      setMode('verify')
    })
  }

  const onVerify = (e: FormEvent) => {
    e.preventDefault()
    run(async () => {
      await verify(email, code)
      navigate('/')
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-navy-900 to-navy-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xl">
          {mode === 'verify' ? (
            <>
              <div className="mb-1 flex items-center gap-2">
                <MailCheck className="size-5 text-brand-600" />
                <h1 className="text-xl font-bold text-slate-900">Confirme seu e-mail</h1>
              </div>
              <p className="text-sm text-slate-500">
                Enviamos um código de 6 dígitos para <strong>{email}</strong>.
              </p>
              {devCode && (
                <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Modo de testes — seu código é <strong className="tracking-widest">{devCode}</strong>
                </div>
              )}
              <form onSubmit={onVerify} className="mt-5 space-y-4">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  className={`${inputCls} text-center text-lg tracking-[0.4em]`}
                />
                {error && <Err msg={error} />}
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? 'Confirmando…' : 'Confirmar e entrar'}
                </Button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-slate-900">
                {mode === 'login' ? 'Entrar' : 'Criar conta'}
              </h1>
              <p className="mt-1 text-sm text-slate-500">Painel interno da Nairuz.</p>

              <form onSubmit={mode === 'login' ? onLogin : onRegister} className="mt-6 space-y-4">
                {mode === 'register' && (
                  <Field label="Nome">
                    <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Seu nome" className={inputCls} />
                  </Field>
                )}
                <Field label="E-mail">
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="voce@nairuz.com" className={inputCls} />
                </Field>
                <Field label="Senha">
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" className={inputCls} />
                </Field>
                {error && <Err msg={error} />}
                <Button type="submit" className="w-full" disabled={busy}>
                  {mode === 'login' ? <LogIn className="size-4" /> : <UserPlus className="size-4" />}
                  {busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
                </Button>
              </form>

              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login')
                  setError(undefined)
                }}
                className="mt-4 w-full text-center text-sm text-brand-600 hover:underline"
              >
                {mode === 'login' ? 'Não tem conta? Criar agora' : 'Já tenho conta — entrar'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  )
}

function Err({ msg }: { msg: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      {msg}
    </div>
  )
}
