import { cn } from '@/utils/cn'

interface AvatarProps {
  name: string
  color?: string
  size?: 'sm' | 'md'
  className?: string
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Avatar circular com iniciais — usado para responsáveis. */
export function Avatar({ name, color = '#64748b', size = 'md', className }: AvatarProps) {
  return (
    <span
      title={name}
      className={cn(
        'inline-flex items-center justify-center rounded-full font-semibold text-white',
        size === 'sm' ? 'size-6 text-[10px]' : 'size-8 text-xs',
        className,
      )}
      style={{ backgroundColor: color }}
    >
      {initials(name)}
    </span>
  )
}
