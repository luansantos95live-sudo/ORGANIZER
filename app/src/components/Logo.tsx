import { useId } from 'react'

// Logo do Fluxo: um "F" de faixa dobrada em verde-água. Desenho em unidades de 0 a 100 na altura;
// as mesmas formas geram o ícone do atalho (ferramentas/gerar-icone.py) e a textura da barra de cima.
export const LOGO_FORMAS = {
  lateral: '0,14.85 24.31,0 24.31,100 0,84.72',
  topo: '24.31,0 63.61,0 73.07,25.47 24.31,25.47',
  dobraTopo: '24.31,0.6 24.31,25.47 38.1,25.47',
  meio: '0,53.71 23.29,38.72 56.33,38.72 56.33,64.05 15.87,64.05 0,73.8',
  sombraMeio: '0,73.8 15.87,64.05 24.31,64.05 24.31,100 0,84.72',
}

export function Logo({ size = 34, className }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, '')
  const g = (n: string) => `${n}-${id}`
  return (
    <svg width={size} height={size} viewBox="-15.5 -2 104 104" className={className} aria-label="Fluxo" role="img">
      <defs>
        <linearGradient id={g('lat')} gradientUnits="userSpaceOnUse" x1="0" y1="8" x2="26" y2="44">
          <stop offset="0" stopColor="#36f6d8" />
          <stop offset="1" stopColor="#07a586" />
        </linearGradient>
        <linearGradient id={g('topo')} gradientUnits="userSpaceOnUse" x1="24" y1="10" x2="73" y2="14">
          <stop offset="0" stopColor="#0aa486" />
          <stop offset=".45" stopColor="#14e3b5" />
          <stop offset="1" stopColor="#1af3c3" />
        </linearGradient>
        <linearGradient id={g('meio')} gradientUnits="userSpaceOnUse" x1="0" y1="66" x2="56" y2="46">
          <stop offset="0" stopColor="#0aa98b" />
          <stop offset=".5" stopColor="#11e2b8" />
          <stop offset="1" stopColor="#0ff6cc" />
        </linearGradient>
        <linearGradient id={g('sombra')} gradientUnits="userSpaceOnUse" x1="0" y1="64" x2="0" y2="96">
          <stop offset="0" stopColor="#02130e" stopOpacity=".55" />
          <stop offset="1" stopColor="#02130e" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={LOGO_FORMAS.lateral} fill={`url(#${g('lat')})`} />
      <polygon points={LOGO_FORMAS.sombraMeio} fill={`url(#${g('sombra')})`} />
      <polygon points={LOGO_FORMAS.topo} fill={`url(#${g('topo')})`} />
      <polygon points={LOGO_FORMAS.dobraTopo} fill="#04392d" opacity=".35" />
      <polygon points={LOGO_FORMAS.meio} fill={`url(#${g('meio')})`} />
      <path d="M24.31 0H63.61M23.29 38.72H56.33M0 53.71L23.29 38.72" stroke="#b9fff0" strokeOpacity=".35" strokeWidth=".6" fill="none" />
    </svg>
  )
}
