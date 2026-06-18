/**
 * Definições SVG do efeito "liquid glass" (refração das bordas). Renderize uma
 * única vez perto da raiz; a classe CSS `.liquid-glass` (em index.css) referencia
 * o filtro `#liquid` via backdrop-filter (Chromium). Outros navegadores caem
 * graciosamente para um vidro fosco simples.
 */
export function LiquidGlassDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
      <filter id="liquid" x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.009 0.012" numOctaves={2} seed={14} result="noise" />
        <feGaussianBlur in="noise" stdDeviation="1.4" result="soft" />
        <feDisplacementMap in="SourceGraphic" in2="soft" scale={40} xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  )
}
