import { useMemo, useState, type FormEvent } from 'react'
import { Building2, Plus } from 'lucide-react'
import { useOrganizations, useProjects } from '@/hooks/useProjects'
import { createOrganization } from '@/services/projectsService'
import { useToast } from '@/components/ui/Toast'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

export function OrganizacoesPage() {
  const { data: orgs, loading } = useOrganizations()
  const { data: projects } = useProjects()
  const { notify } = useToast()

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [segment, setSegment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  const countByOrg = useMemo(() => {
    const m = new Map<string, number>()
    ;(projects ?? []).forEach((p) => m.set(p.organizationId, (m.get(p.organizationId) ?? 0) + 1))
    return m
  }, [projects])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Informe o nome da organização.')
      return
    }
    setError(undefined)
    setBusy(true)
    const org = await createOrganization({ name: name.trim(), segment: segment.trim() })
    setBusy(false)
    setName('')
    setSegment('')
    setOpen(false)
    notify(`Organização "${org.name}" cadastrada.`)
  }

  return (
    <>
      <PageHeader
        title="Organizações"
        subtitle="Cadastre e gerencie os clientes (organizações) dos projetos"
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            Nova organização
          </Button>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : !orgs || orgs.length === 0 ? (
        <Card>
          <EmptyState
            icon={Building2}
            title="Nenhuma organização ainda"
            description="Cadastre a primeira organização para vinculá-la a um projeto."
            action={<Button onClick={() => setOpen(true)}><Plus className="size-4" /> Nova organização</Button>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orgs.map((o) => (
            <Card key={o.id} className="flex items-start gap-3 p-5">
              <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Building2 className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="truncate font-semibold text-slate-900">{o.name}</div>
                <div className="text-sm text-slate-500">{o.segment || 'Sem segmento'}</div>
                <div className="mt-1 text-xs text-slate-400">
                  {countByOrg.get(o.id) ?? 0} projeto(s)
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Nova organização"
        subtitle="O cliente que será vinculado aos projetos."
        footer={
          <>
            <Button variant="secondary" type="button" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="new-org-form" disabled={busy}>
              {busy ? 'Cadastrando…' : 'Cadastrar'}
            </Button>
          </>
        }
      >
        <form id="new-org-form" onSubmit={handleCreate} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Nome</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Loja Vivara"
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Segmento (opcional)</span>
            <input
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
              placeholder="Ex.: Joalheria"
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      </Modal>
    </>
  )
}
