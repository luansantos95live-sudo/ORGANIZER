import iconeSrc from '../assets/fluxo-icone.png?inline'
import logoEscuraSrc from '../assets/fluxo-logo-escura.png?inline'
import logoClaraSrc from '../assets/fluxo-logo-clara.png?inline'

// Logo do Fluxo: um "F" de faixa dobrada em verde-água. Desenho em unidades de 0 a 100 na altura;
// as mesmas formas geram o ícone do atalho (ferramentas/gerar-icone.py) e a textura da barra de cima.
export const LOGO_FORMAS = {
  lateral: '0,14.85 24.31,0 24.31,100 0,84.72',
  topo: '24.31,0 63.61,0 73.07,25.47 24.31,25.47',
  dobraTopo: '24.31,0.6 24.31,25.47 38.1,25.47',
  meio: '0,53.71 23.29,38.72 56.33,38.72 56.33,64.05 15.87,64.05 0,73.8',
  sombraMeio: '0,73.8 15.87,64.05 24.31,64.05 24.31,100 0,84.72',
}

// Logo nova (12/11/2026): ícone quadrado escuro com o "F" verde, recortado da arte enviada pelo usuário
// (original em LOGO/). Vai embutido no HTML (?inline) para funcionar no sistema local de um arquivo só.

export function Logo({ size = 34, className }: { size?: number; className?: string }) {
  return <img src={iconeSrc} width={size} height={size} className={className} alt="Fluxo" draggable={false} />
}

/** Logo completa "FLUXO · Gestão de Ordens de Serviço": `escura` = texto claro, para fundo escuro (menu lateral). */
export function LogoCompleta({ altura = 34, escura = true, className }: { altura?: number; escura?: boolean; className?: string }) {
  return <img src={escura ? logoEscuraSrc : logoClaraSrc} style={{ height: altura, width: 'auto' }} className={className} alt="Fluxo · Gestão de Ordens de Serviço" draggable={false} />
}
