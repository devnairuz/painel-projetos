import { useState } from 'react'
import type { ProjectOwners, TeamMember } from '@/types'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'

interface OwnersCardProps {
  owners: ProjectOwners
  /** Resolve o nome a partir do id antigo (compatibilidade com o seed). */
  getMember: (id?: string) => TeamMember | undefined
  onChange: (patch: Partial<ProjectOwners>) => void
}

/**
 * Responsáveis do projeto em texto livre. Por enquanto é só escrever o nome;
 * a busca por usuário cadastrado fica para depois.
 */
export function OwnersCard({ owners, getMember, onChange }: OwnersCardProps) {
  return (
    <Card className="p-5">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Responsáveis</h2>
      <div className="space-y-3">
        <OwnerRow
          label="PMO"
          value={owners.csName ?? getMember(owners.csId)?.name ?? ''}
          onCommit={(v) => onChange({ csName: v })}
        />
        <OwnerRow
          label="Desenvolvedor"
          value={owners.techLeadName ?? getMember(owners.techLeadId)?.name ?? ''}
          onCommit={(v) => onChange({ techLeadName: v })}
        />
        <OwnerRow
          label="Designer"
          value={owners.designerName ?? getMember(owners.designerId)?.name ?? ''}
          onCommit={(v) => onChange({ designerName: v })}
        />
        <div className="border-t border-slate-100 pt-3">
          <OwnerRow
            label="Contato do cliente"
            value={owners.clientContact ?? ''}
            onCommit={(v) => onChange({ clientContact: v })}
            accent
          />
        </div>
      </div>
    </Card>
  )
}

function OwnerRow({
  label,
  value,
  onCommit,
  accent = false,
}: {
  label: string
  value: string
  onCommit: (value: string) => void
  accent?: boolean
}) {
  const [text, setText] = useState(value)

  function commit() {
    const clean = text.trim()
    if (clean !== (value ?? '')) onCommit(clean)
  }

  return (
    <div className="flex items-center gap-3">
      {text.trim() ? (
        <Avatar name={text} color={accent ? '#52d09e' : '#034c8c'} />
      ) : (
        <span className="flex size-8 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-400">
          ?
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-xs text-slate-400">{label}</div>
        <input
          data-owner={label}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              ;(e.target as HTMLInputElement).blur()
            }
          }}
          placeholder="Escrever o nome…"
          className="mt-0.5 h-8 w-full rounded-lg border border-transparent bg-transparent px-2 text-sm font-medium text-slate-800 hover:border-slate-200 focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100 focus:outline-none"
        />
      </div>
    </div>
  )
}
