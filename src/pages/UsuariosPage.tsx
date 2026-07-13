import { Users, ShieldAlert } from 'lucide-react'
import { useUsers } from '@/hooks/useUsers'
import { useCompanyAuth } from '@/hooks/useCompanyAuth'
import { updateUser } from '@/services/usersService'
import { useToast } from '@/components/ui/Toast'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import type { CompanyUser } from '@/services/companyAuthService'

const OPCOES_PAPEL = [
  { value: 'admin', label: 'Administrador' },
  { value: 'member', label: 'Membro' },
]

const STATUS_USUARIO_META = {
  ativo: { label: 'Ativo', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: '#059669' },
  desativado: { label: 'Desativado', badge: 'bg-slate-100 text-slate-600 border-slate-200', dot: '#64748b' },
}

export function UsuariosPage() {
  const { user: me } = useCompanyAuth()
  const { data: users, loading, error, reload } = useUsers()
  const { notify } = useToast()

  async function changeRole(id: string, role: 'admin' | 'member') {
    await updateUser(id, { role })
    notify('Papel atualizado.')
    reload()
  }

  async function toggleActive(id: string, active: boolean) {
    await updateUser(id, { active })
    notify(active ? 'Usuário reativado.' : 'Usuário desativado.', 'info')
    reload()
  }

  if (error) {
    return (
      <>
        <PageHeader title="Usuários" subtitle="Gerencie os acessos da equipe" />
        <Card>
          <EmptyState
            icon={ShieldAlert}
            title="Não foi possível acessar os usuários"
            description="A gestão da equipe é restrita a administradores. Se você já possui esse acesso, tente carregar novamente."
            action={<Button variant="secondary" onClick={reload}>Tentar novamente</Button>}
          />
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Usuários" subtitle="Gerencie os acessos da equipe Nairuz" />

      <Card className="overflow-hidden">
        <CardHeader
          title="Equipe cadastrada"
          subtitle="Defina o nível de acesso e mantenha somente os usuários ativos."
          className="border-b border-slate-100"
          action={!loading && users ? (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 tabular-nums">
              {users.length} {users.length === 1 ? 'usuário' : 'usuários'}
            </span>
          ) : undefined}
        />
        {loading ? (
          <div className="space-y-4 p-5" aria-label="Carregando usuários">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-9 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40 max-w-full" />
                  <Skeleton className="h-3 w-56 max-w-full" />
                </div>
                <Skeleton className="hidden h-9 w-28 sm:block" />
                <Skeleton className="hidden h-7 w-20 sm:block" />
              </div>
            ))}
          </div>
        ) : !users || users.length === 0 ? (
          <EmptyState icon={Users} title="Nenhum usuário" description="Os cadastros aparecerão aqui." />
        ) : (
          <>
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-sm">
              <caption className="sr-only">Usuários internos, papéis de acesso e status da conta</caption>
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  <th scope="col" className="px-5 py-3">Usuário</th>
                  <th scope="col" className="px-3 py-3">Papel</th>
                  <th scope="col" className="px-3 py-3">Status</th>
                  <th scope="col" className="px-3 py-3"><span className="sr-only">Ações</span></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isMe = u.id === me?.id
                  return (
                    <tr key={u.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.name} color="#034c8c" />
                          <div className="min-w-0">
                            <div className="font-medium text-slate-900">
                              {u.name} {isMe && <span className="text-xs text-slate-500">(você)</span>}
                            </div>
                            <div className="text-xs text-slate-500">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        <Select
                          options={OPCOES_PAPEL}
                          value={u.role}
                          disabled={isMe}
                          onChange={(e) => changeRole(u.id, e.target.value as 'admin' | 'member')}
                          className="w-36"
                          aria-label={`Papel de ${u.name}`}
                          title={isMe ? 'Você não pode mudar o próprio papel' : undefined}
                        />
                      </td>
                      <td className="px-3 py-3.5">
                        <Badge meta={u.active ? STATUS_USUARIO_META.ativo : STATUS_USUARIO_META.desativado} withDot />
                      </td>
                      <td className="px-3 py-3.5 text-right">
                        {!isMe && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => toggleActive(u.id, !u.active)}
                            aria-label={`${u.active ? 'Desativar' : 'Reativar'} ${u.name}`}
                          >
                            {u.active ? 'Desativar' : 'Reativar'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <ul className="divide-y divide-slate-100 sm:hidden" aria-label="Usuários internos">
            {users.map((usuario) => (
              <li key={usuario.id}>
                <UsuarioMobile
                  usuario={usuario}
                  atual={usuario.id === me?.id}
                  onChangeRole={changeRole}
                  onToggleActive={toggleActive}
                />
              </li>
            ))}
          </ul>
          </>
        )}
      </Card>

      <p className="mt-3 px-1 text-xs text-slate-500">
        O primeiro cadastro do sistema vira Admin. Admins podem promover/desativar os demais.
      </p>
    </>
  )
}

function UsuarioMobile({
  usuario,
  atual,
  onChangeRole,
  onToggleActive,
}: {
  usuario: CompanyUser
  atual: boolean
  onChangeRole: (id: string, role: 'admin' | 'member') => Promise<void>
  onToggleActive: (id: string, active: boolean) => Promise<void>
}) {
  return (
    <div className="p-4">
      <div className="flex items-start gap-3">
        <Avatar name={usuario.name} color="#034c8c" />
        <div className="min-w-0 flex-1">
          <div className="font-medium text-slate-900">
            {usuario.name} {atual && <span className="text-xs font-normal text-slate-500">(você)</span>}
          </div>
          <div className="truncate text-xs text-slate-500">{usuario.email}</div>
        </div>
        <Badge meta={usuario.active ? STATUS_USUARIO_META.ativo : STATUS_USUARIO_META.desativado} withDot />
      </div>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 border-t border-slate-100 pt-3">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-600">Papel de acesso</span>
          <Select
            options={OPCOES_PAPEL}
            value={usuario.role}
            disabled={atual}
            onChange={(e) => onChangeRole(usuario.id, e.target.value as 'admin' | 'member')}
            aria-label={`Papel de ${usuario.name}`}
            title={atual ? 'Você não pode mudar o próprio papel' : undefined}
          />
        </label>
        {!atual && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onToggleActive(usuario.id, !usuario.active)}
            aria-label={`${usuario.active ? 'Desativar' : 'Reativar'} ${usuario.name}`}
          >
            {usuario.active ? 'Desativar' : 'Reativar'}
          </Button>
        )}
      </div>
    </div>
  )
}
