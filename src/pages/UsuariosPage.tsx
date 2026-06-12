import { Users, ShieldAlert } from 'lucide-react'
import { useUsers } from '@/hooks/useUsers'
import { useCompanyAuth } from '@/hooks/useCompanyAuth'
import { updateUser } from '@/services/usersService'
import { useToast } from '@/components/ui/Toast'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/utils/cn'

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
            title="Acesso restrito"
            description="Apenas administradores podem gerenciar usuários."
          />
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Usuários" subtitle="Gerencie os acessos da equipe Nairuz" />

      <Card className="overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !users || users.length === 0 ? (
          <EmptyState icon={Users} title="Nenhum usuário" description="Os cadastros aparecerão aqui." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  <th className="px-5 py-3">Usuário</th>
                  <th className="px-3 py-3">Papel</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3" />
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
                              {u.name} {isMe && <span className="text-xs text-slate-400">(você)</span>}
                            </div>
                            <div className="text-xs text-slate-400">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        <select
                          value={u.role}
                          disabled={isMe}
                          onChange={(e) => changeRole(u.id, e.target.value as 'admin' | 'member')}
                          className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:border-brand-400 focus:outline-none disabled:opacity-50"
                          title={isMe ? 'Você não pode mudar o próprio papel' : undefined}
                        >
                          <option value="admin">Admin</option>
                          <option value="member">Membro</option>
                        </select>
                      </td>
                      <td className="px-3 py-3.5">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
                            u.active
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-500',
                          )}
                        >
                          <span className={cn('size-1.5 rounded-full', u.active ? 'bg-emerald-500' : 'bg-slate-400')} />
                          {u.active ? 'Ativo' : 'Desativado'}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-right">
                        {!isMe && (
                          <button
                            onClick={() => toggleActive(u.id, !u.active)}
                            className={cn(
                              'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                              u.active
                                ? 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50',
                            )}
                          >
                            {u.active ? 'Desativar' : 'Reativar'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="mt-3 px-1 text-xs text-slate-400">
        O primeiro cadastro do sistema vira Admin. Admins podem promover/desativar os demais.
      </p>
    </>
  )
}
