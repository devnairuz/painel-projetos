import { useMemo, useState, type FormEvent } from 'react'
import { ListChecks, Plus, Building2, X } from 'lucide-react'
import type { Platform, Product, Project, ProjectType } from '@/types'
import { PLATFORM_META, TYPE_META } from '@/constants'
import { PRODUCT_META, PRODUCT_TEMPLATES } from '@/constants/templates'
import { useOrganizations } from '@/hooks/useProjects'
import { useToast } from '@/components/ui/Toast'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { createProject, createOrganization } from '@/services/projectsService'

interface NewProjectModalProps {
  open: boolean
  onClose: () => void
  onCreated: (project: Project) => void
}

const PLATFORM_OPTIONS = Object.entries(PLATFORM_META).map(([value, m]) => ({ value, label: m.label }))
const TYPE_OPTIONS = Object.entries(TYPE_META).map(([value, m]) => ({ value, label: m.label }))
const PRODUCT_OPTIONS = Object.entries(PRODUCT_META).map(([value, m]) => ({ value, label: m.label }))

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  )
}

export function NewProjectModal({ open, onClose, onCreated }: NewProjectModalProps) {
  const { data: orgs } = useOrganizations()
  const { notify } = useToast()

  const [clientName, setClientName] = useState('')
  const [organizationId, setOrganizationId] = useState('')
  const [platform, setPlatform] = useState<Platform>('vtex')
  const [type, setType] = useState<ProjectType>('implantacao')
  const [product, setProduct] = useState<Product>('ecommerce')
  const [goLiveDate, setGoLiveDate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>()

  // Cadastro inline de organização
  const [creatingOrg, setCreatingOrg] = useState(false)
  const [orgName, setOrgName] = useState('')
  const [orgSegment, setOrgSegment] = useState('')
  const [orgBusy, setOrgBusy] = useState(false)

  const orgOptions = useMemo(
    () => (orgs ?? []).map((o) => ({ value: o.id, label: o.name })),
    [orgs],
  )

  async function handleCreateOrg() {
    if (!orgName.trim()) return
    setOrgBusy(true)
    const org = await createOrganization({ name: orgName.trim(), segment: orgSegment.trim() })
    setOrgBusy(false)
    setOrganizationId(org.id)
    setOrgName('')
    setOrgSegment('')
    setCreatingOrg(false)
    notify(`Organização "${org.name}" cadastrada.`)
  }
  const previewPhases = PRODUCT_TEMPLATES[product]

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!clientName.trim()) {
      setError('Informe o nome do cliente.')
      return
    }
    if (!organizationId) {
      setError('Selecione a organização.')
      return
    }
    setError(undefined)
    setSubmitting(true)
    const project = await createProject({
      clientName: clientName.trim(),
      organizationId,
      platform,
      type,
      product,
      goLiveDate: goLiveDate ? new Date(goLiveDate).toISOString() : undefined,
    })
    setSubmitting(false)
    notify(`Projeto ${project.code} criado com ${project.phases.length} etapas.`)
    onCreated(project)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Novo projeto"
      subtitle="Escolha o produto — as etapas iniciais são geradas automaticamente."
      size="lg"
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="new-project-form" disabled={submitting}>
            {submitting ? 'Criando…' : 'Criar projeto'}
          </Button>
        </>
      }
    >
      <form id="new-project-form" onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nome do cliente">
          <input
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Ex.: Loja Vivara"
            className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Organização</span>
              <button
                type="button"
                onClick={() => setCreatingOrg((v) => !v)}
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
              >
                {creatingOrg ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
                {creatingOrg ? 'Cancelar' : 'Nova organização'}
              </button>
            </div>
            {creatingOrg ? (
              <div className="space-y-2 rounded-xl border border-brand-200 bg-brand-50/40 p-3">
                <div className="flex items-center gap-2 text-xs font-medium text-brand-700">
                  <Building2 className="size-4" /> Cadastrar organização
                </div>
                <input
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Nome (ex.: Loja Nova)"
                  className="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-sm text-slate-700 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
                />
                <input
                  value={orgSegment}
                  onChange={(e) => setOrgSegment(e.target.value)}
                  placeholder="Segmento (opcional)"
                  className="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-sm text-slate-700 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
                />
                <Button type="button" size="sm" onClick={handleCreateOrg} disabled={orgBusy || !orgName.trim()}>
                  {orgBusy ? 'Cadastrando…' : 'Cadastrar e selecionar'}
                </Button>
              </div>
            ) : (
              <Select
                options={orgOptions}
                placeholder="Selecione…"
                value={organizationId}
                onChange={(e) => setOrganizationId(e.target.value)}
              />
            )}
          </div>
          <Field label="Plataforma">
            <Select
              options={PLATFORM_OPTIONS}
              value={platform}
              onChange={(e) => setPlatform(e.target.value as Platform)}
            />
          </Field>
          <Field label="Tipo de engajamento">
            <Select
              options={TYPE_OPTIONS}
              value={type}
              onChange={(e) => setType(e.target.value as ProjectType)}
            />
          </Field>
          <Field label="Go live previsto">
            <input
              type="date"
              value={goLiveDate}
              onChange={(e) => setGoLiveDate(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
            />
          </Field>
        </div>

        <Field label="Produto">
          <Select
            options={PRODUCT_OPTIONS}
            value={product}
            onChange={(e) => setProduct(e.target.value as Product)}
          />
        </Field>
        <p className="-mt-2 text-xs text-slate-500">{PRODUCT_META[product].description}</p>

        {/* Preview das etapas do template */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
            <ListChecks className="size-4 text-brand-600" />
            {previewPhases.length} etapas serão criadas
          </div>
          <ol className="flex flex-wrap gap-1.5">
            {previewPhases.map((p, i) => (
              <li
                key={p.name}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600"
              >
                {i + 1}. {p.name}
              </li>
            ))}
          </ol>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  )
}
