import { cn } from '@/utils/cn'
import wordmark from '@/assets/nairuz-wordmark.svg'

interface LogoProps {
  collapsed?: boolean
  /** 'light' para fundo escuro (sidebar), 'dark' para fundo claro (portal cliente). */
  tone?: 'light' | 'dark'
}

/**
 * Marca Nairuz oficial: wordmark "nairuz" em mint (SVG do repositório
 * suporte-nairuz) + subtítulo institucional. Colapsado mostra o mascote.
 */
export function Logo({ collapsed = false, tone = 'light' }: LogoProps) {
  const subtitle = tone === 'light' ? 'text-slate-300/80' : 'text-slate-400'

  if (collapsed) {
    return (
      <div className="flex items-center justify-center">
        <img src="/dinossairuz.png" alt="Nairuz" className="size-9 object-contain" />
      </div>
    )
  }
  return (
    <div className="select-none">
      <img src={wordmark} alt="nairuz" className="h-7 w-auto" />
      <p className={cn('mt-1 text-[11px] font-medium tracking-wide', subtitle)}>
        Merketing &amp; Tecnologia
      </p>
    </div>
  )
}
