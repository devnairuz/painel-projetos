import { useState, type FormEvent, type ReactNode } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { LogIn, UserPlus, AlertCircle, MailCheck, KeyRound, CheckCircle2 } from 'lucide-react'
import { useCompanyAuth } from '@/hooks/useCompanyAuth'
import { registerCompany, requestPasswordReset } from '@/services/companyAuthService'
import { Logo } from '@/components/layout/Logo'
import { Button } from '@/components/ui/Button'

type Mode = 'login' | 'register' | 'verify' | 'forgot' | 'reset'

const inputCls =
  'h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none'

export function CompanyAuthPage() {
  const { user, login, verify, resetPassword } = useCompanyAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [devCode, setDevCode] = useState<string>()
  const [error, setError] = useState<string>()
  const [info, setInfo] = useState<string>()
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />

  function switchMode(next: Mode) {
    setMode(next)
    setError(undefined)
    setInfo(undefined)
    setCode('')
  }

  async function run(fn: () => Promise<void>) {
    setError(undefined)
    setInfo(undefined)
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

  const onForgot = (e: FormEvent) => {
    e.preventDefault()
    run(async () => {
      const res = await requestPasswordReset(email)
      setDevCode(res.devCode)
      setInfo('Se o e-mail tiver conta, enviamos um código.')
      setMode('reset')
    })
  }

  const onReset = (e: FormEvent) => {
    e.preventDefault()
    run(async () => {
      await resetPassword(email, code, password)
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
          {/* ── Confirmar e-mail (cadastro) ── */}
          {mode === 'verify' && (
            <>
              <Header icon={MailCheck} title="Confirme seu e-mail" />
              <p className="text-sm text-slate-500">
                Enviamos um código de 6 dígitos para <strong>{email}</strong>.
              </p>
              {devCode && <DevCode code={devCode} />}
              <form onSubmit={onVerify} className="mt-5 space-y-4">
                <CodeInput value={code} onChange={setCode} />
                {info && <Info msg={info} />}
                {error && <Err msg={error} />}
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? 'Confirmando…' : 'Confirmar e entrar'}
                </Button>
              </form>
              <button type="button" onClick={() => switchMode('login')} className={linkCls}>
                Voltar ao login
              </button>
            </>
          )}

          {/* ── Esqueci a senha: pedir código ── */}
          {mode === 'forgot' && (
            <>
              <Header icon={KeyRound} title="Redefinir senha" />
              <p className="text-sm text-slate-500">Informe seu e-mail e enviaremos um código.</p>
              <form onSubmit={onForgot} className="mt-5 space-y-4">
                <Field label="E-mail">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="voce@nairuz.com"
                    className={inputCls}
                  />
                </Field>
                {error && <Err msg={error} />}
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? 'Enviando…' : 'Enviar código'}
                </Button>
              </form>
              <button type="button" onClick={() => switchMode('login')} className={linkCls}>
                Voltar ao login
              </button>
            </>
          )}

          {/* ── Redefinir: código + nova senha ── */}
          {mode === 'reset' && (
            <>
              <Header icon={KeyRound} title="Nova senha" />
              <p className="text-sm text-slate-500">
                Digite o código enviado para <strong>{email}</strong> e crie uma nova senha.
              </p>
              {devCode && <DevCode code={devCode} />}
              <form onSubmit={onReset} className="mt-5 space-y-4">
                <CodeInput value={code} onChange={setCode} />
                <Field label="Nova senha">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className={inputCls}
                  />
                </Field>
                {info && <Info msg={info} />}
                {error && <Err msg={error} />}
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? 'Redefinindo…' : 'Redefinir e entrar'}
                </Button>
              </form>
              <button type="button" onClick={() => switchMode('forgot')} className={linkCls}>
                Não recebeu? Enviar outro código
              </button>
            </>
          )}

          {/* ── Login / Cadastro ── */}
          {(mode === 'login' || mode === 'register') && (
            <>
              <h1 className="text-xl font-bold text-slate-900">
                {mode === 'login' ? 'Entrar' : 'Criar conta'}
              </h1>
              <p className="mt-1 text-sm text-slate-500">Painel interno da Nairuz.</p>

              <form onSubmit={mode === 'login' ? onLogin : onRegister} className="mt-6 space-y-4">
                {mode === 'register' && (
                  <Field label="Nome">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      placeholder="Seu nome"
                      className={inputCls}
                    />
                  </Field>
                )}
                <Field label="E-mail">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="voce@nairuz.com"
                    className={inputCls}
                  />
                </Field>
                <Field label="Senha">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className={inputCls}
                  />
                </Field>
                {error && <Err msg={error} />}
                <Button type="submit" className="w-full" disabled={busy}>
                  {mode === 'login' ? <LogIn className="size-4" /> : <UserPlus className="size-4" />}
                  {busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
                </Button>
              </form>

              {mode === 'login' && (
                <button type="button" onClick={() => switchMode('forgot')} className={linkCls}>
                  Esqueci minha senha
                </button>
              )}
              <button
                type="button"
                onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
                className={linkCls}
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

const linkCls = 'mt-4 w-full text-center text-sm text-brand-600 hover:underline disabled:opacity-50'

function Header({ icon: Icon, title }: { icon: typeof MailCheck; title: string }) {
  return (
    <div className="mb-1 flex items-center gap-2">
      <Icon className="size-5 text-brand-600" />
      <h1 className="text-xl font-bold text-slate-900">{title}</h1>
    </div>
  )
}

function CodeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      inputMode="numeric"
      maxLength={6}
      placeholder="000000"
      className={`${inputCls} text-center text-lg tracking-[0.4em]`}
    />
  )
}

function DevCode({ code }: { code: string }) {
  return (
    <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
      Modo de testes — seu código é <strong className="tracking-widest">{code}</strong>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
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

function Info({ msg }: { msg: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
      <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
      {msg}
    </div>
  )
}
