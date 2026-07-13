import { useMemo, useState, type FormEvent } from 'react'
import { Building2, FolderKanban, Plus } from 'lucide-react'
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Carregando organizações">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="flex items-start gap-4 p-5">
              <Skeleton className="size-11 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2.5">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3.5 w-1/2" />
                <Skeleton className="h-3 w-20" />
              </div>
            </Card>
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
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Organizações cadastradas">
          {orgs.map((o) => (
            <li key={o.id}>
              <Card className="flex h-full items-start gap-4 p-5">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Building2 className="size-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold text-slate-900">{o.name}</h2>
                  <p className="mt-0.5 text-sm text-slate-600">{o.segment || 'Segmento não informado'}</p>
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                    <FolderKanban className="size-3.5 text-slate-400" aria-hidden />
                    {countByOrg.get(o.id) ?? 0} {(countByOrg.get(o.id) ?? 0) === 1 ? 'projeto' : 'projetos'}
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
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
          <label className="block" htmlFor="nome-organizacao">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Nome</span>
            <input
              id="nome-organizacao"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Loja Vivara"
              autoComplete="organization"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'erro-organizacao' : undefined}
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
            />
          </label>
          <label className="block" htmlFor="segmento-organizacao">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Segmento <span className="font-normal text-slate-500">(opcional)</span></span>
            <input
              id="segmento-organizacao"
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
              placeholder="Ex.: Joalheria"
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
            />
          </label>
          {error && <p id="erro-organizacao" role="alert" className="text-sm font-medium text-red-600">{error}</p>}
        </form>
      </Modal>
    </>
  )
}
