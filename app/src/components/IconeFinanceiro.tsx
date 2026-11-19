import type { SVGProps } from 'react'

/**
 * Ícone do Financeiro (pedido do usuário): o mesmo desenho do menu do FLUXO ARQ — gráfico de linha subindo com seta,
 * dentro do canto dos eixos. Aceita as mesmas props dos ícones lucide usadas no menu (size, strokeWidth, className).
 */
export function IconeFinanceiro({ size = 24, strokeWidth = 1.75, ...props }: SVGProps<SVGSVGElement> & { size?: number | string; strokeWidth?: number | string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M3.5 3.5v15a2 2 0 0 0 2 2h15" />
      <path d="m7.5 15 3.8-4.2 3 3 5.2-6.3" />
      <path d="M15.8 7.5h3.7v3.7" />
    </svg>
  )
}
