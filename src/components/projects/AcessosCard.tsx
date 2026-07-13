import { useState } from 'react'
import { KeyRound, Eye, EyeOff, Trash2, Plus } from 'lucide-react'
import type { AccessKind, AccessStatus, Project, ProjectAccess } from '@/types'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import {
  addProjectAccess,
  removeProjectAccess,
  updateProjectAccess,
} from '@/services/projectsService'

interface AcessosCardProps {
  project: Project
  onProjectChange: (project: Project) => void
}

/** Rótulo e placeholder de cada tipo de acesso. */
const KIND_META: Record<AccessKind, { label: string; placeholder: string }> = {
  dominio: { label: 'Domínio / DNS', placeholder: 'Ex.: Registro.br, Cloudflare' },
  plataforma: { label: 'Plataforma', placeholder: 'Ex.: VTEX, Wake' },
  hospedagem: { label: 'Hospedagem', placeholder: 'Provedor de hospedagem' },
  gateway: { label: 'Gateway', placeholder: 'Gateway de pagamento' },
  outro: { label: 'Outro', placeholder: 'Nome do acesso' },
}

const KIND_OPTIONS = Object.entries(KIND_META).map(([value, meta]) => ({
  value: value as AccessKind,
  label: meta.label,
}))

const STATUS_OPTIONS: Array<{ value: AccessStatus; label: string }> = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'fornecido', label: 'Fornecido' },
]

const inputClass =
  'h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:border-brand-400 focus:outline-none'

/**
 * Acessos/credenciais dos painéis do projeto (domínio, plataforma, hospedagem,
 * gateway). Uso interno da Nairuz — a senha fica mascarada e não vai ao portal
 * do cliente. Cada linha salva de forma independente.
 */
export function AcessosCard({ project, onProjectChange }: AcessosCardProps) {
  const [adding, setAdding] = useState(false)
  const accesses = project.accesses ?? []

  async function handleAdd() {
    setAdding(true)
    const updated = await addProjectAccess(project.id, { kind: 'outro' })
    onProjectChange(updated)
    setAdding(false)
  }

  return (
    <Card className="p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
        <KeyRound className="size-5 text-brand-600" />
        Acessos
      </h2>
      <p className="mt-0.5 text-sm text-slate-500">
        Painéis e credenciais do projeto (interno). A senha fica oculta e não é exibida ao cliente.
      </p>

      <div className="mt-4 space-y-3">
        {accesses.length === 0 && (
          <p className="rounded-lg bg-slate-50 px-3 py-4 text-center text-sm text-slate-400">
            Nenhum acesso cadastrado ainda.
          </p>
        )}
        {accesses.map((access) => (
          <AccessRow
            key={access.id}
            projectId={project.id}
            access={access}
            onProjectChange={onProjectChange}
          />
        ))}
      </div>

      <Button size="sm" variant="secondary" onClick={handleAdd} disabled={adding} className="mt-4">
        <Plus className="size-4" />
        Adicionar acesso
      </Button>
    </Card>
  )
}

interface AccessRowProps {
  projectId: string
  access: ProjectAccess
  onProjectChange: (project: Project) => void
}

function AccessRow({ projectId, access, onProjectChange }: AccessRowProps) {
  const { notify } = useToast()
  const [kind, setKind] = useState<AccessKind>(access.kind)
  const [label, setLabel] = useState(access.label ?? '')
  const [url, setUrl] = useState(access.url ?? '')
  const [login, setLogin] = useState(access.login ?? '')
  const [senha, setSenha] = useState(access.senha ?? '')
  const [status, setStatus] = useState<AccessStatus>(access.status)
  const [notes, setNotes] = useState(access.notes ?? '')
  const [reveal, setReveal] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    const updated = await updateProjectAccess(projectId, access.id, {
      kind,
      label: label.trim() || undefined,
      url: url.trim() || undefined,
      login: login || undefined,
      senha: senha || undefined,
      status,
      notes: notes.trim() || undefined,
    })
    onProjectChange(updated)
    setSaving(false)
    notify('Acesso salvo.')
  }

  async function handleRemove() {
    setSaving(true)
    const updated = await removeProjectAccess(projectId, access.id)
    onProjectChange(updated)
    notify('Acesso removido.')
  }

  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">Tipo</span>
          <select value={kind} onChange={(e) => setKind(e.target.value as AccessKind)} className={inputClass}>
            {KIND_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as AccessStatus)} className={inputClass}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder={KIND_META[kind].placeholder}
        className={`${inputClass} mt-2`}
      />
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="URL do painel (opcional)"
        className={`${inputClass} mt-2`}
      />

      <div className="mt-2 grid grid-cols-2 gap-2">
        <input
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          placeholder="Login"
          autoComplete="off"
          className={inputClass}
        />
        <div className="relative">
          <input
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            type={reveal ? 'text' : 'password'}
            placeholder="Senha"
            autoComplete="new-password"
            className={`${inputClass} pr-9`}
          />
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            aria-label={reveal ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      <input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Observação (ex.: credenciais no cofre do time)"
        className={`${inputClass} mt-2`}
      />

      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={handleRemove}
          disabled={saving}
          className="flex items-center gap-1 text-sm text-slate-400 hover:text-red-600 disabled:opacity-50"
        >
          <Trash2 className="size-4" />
          Remover
        </button>
        <Button size="sm" variant="secondary" onClick={handleSave} disabled={saving}>
          Salvar
        </Button>
      </div>
    </div>
  )
}
