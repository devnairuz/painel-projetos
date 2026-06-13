import { Bell, X } from 'lucide-react'
import type { MentionableUser } from '@/services/usersService'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'

interface CollaboratorsCardProps {
  collaborators: string[]
  users: MentionableUser[]
  onChange: (userIds: string[]) => void
}

/**
 * Colaboradores: usuários que recebem as notificações deste projeto
 * (NPS, comentário do cliente, menções). Se vazio, todos são notificados.
 */
export function CollaboratorsCard({ collaborators, users, onChange }: CollaboratorsCardProps) {
  const byId = new Map(users.map((u) => [u.id, u]))
  const selected = collaborators.map((id) => byId.get(id)).filter(Boolean) as MentionableUser[]
  const available = users.filter((u) => !collaborators.includes(u.id))

  return (
    <Card className="p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
        <Bell className="size-5 text-brand-600" />
        Colaboradores
      </h2>
      <p className="mt-0.5 text-sm text-slate-500">
        Recebem as notificações deste projeto (NPS, comentários do cliente, menções).
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {selected.length === 0 ? (
          <span className="text-xs text-slate-400">
            Ninguém definido — por ora, todos da equipe são notificados.
          </span>
        ) : (
          selected.map((u) => (
            <span
              key={u.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 py-1 pr-1 pl-1.5 text-sm text-slate-700"
            >
              <Avatar name={u.name} color="#034c8c" size="sm" />
              <span className="max-w-32 truncate">{u.name}</span>
              <button
                onClick={() => onChange(collaborators.filter((id) => id !== u.id))}
                className="rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                aria-label={`Remover ${u.name}`}
              >
                <X className="size-3.5" />
              </button>
            </span>
          ))
        )}
      </div>

      {available.length > 0 && (
        <select
          value=""
          onChange={(e) => e.target.value && onChange([...collaborators, e.target.value])}
          className="mt-3 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-600 focus:border-brand-400 focus:outline-none"
        >
          <option value="">+ Adicionar colaborador…</option>
          {available.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.role === 'admin' ? 'Admin' : 'Membro'})
            </option>
          ))}
        </select>
      )}
    </Card>
  )
}
