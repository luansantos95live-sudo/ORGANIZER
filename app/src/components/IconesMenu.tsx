import type { CSSProperties, ReactNode } from 'react'

// Ícones do menu lateral (23/11, modelos enviados pelo usuário): traço claro (cor do texto do menu) com um detalhe verde.
// Todos no mesmo quadro 24×24, mesma espessura de traço e mesma margem, para terem o mesmo tamanho e proporção.

type Props = { size?: number | string; strokeWidth?: number | string; className?: string; style?: CSSProperties }
const VERDE = 'var(--brand)'

// Quadro mais justo que o 24×24 (pedido de 23/11: "estão muito pequenos, mantenha o tamanho dos anteriores"): o desenho
// ocupa ~18% a mais do espaço; o traço é reduzido na mesma proporção para ficar com a espessura de antes na tela.
const QUADRO = 20.4
const ORIGEM = (24 - QUADRO) / 2

/** `escala` aumenta só o desenho (ex.: 1.1 = +10%, pedido de 23/11 para Amostragem, Anotações e Rotas); o traço fica igual. */
function Base({ size = 24, strokeWidth = 1.75, className, style, children, escala = 1 }: Props & { children: ReactNode; escala?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox={`${ORIGEM} ${ORIGEM} ${QUADRO} ${QUADRO}`} fill="none" stroke="currentColor"
      strokeWidth={(Number(strokeWidth) * (QUADRO / 24)) / escala} strokeLinecap="round" strokeLinejoin="round" overflow="visible" className={className} style={style} aria-hidden="true">
      {escala === 1 ? children : <g transform={`translate(12 12) scale(${escala}) translate(-12 -12)`}>{children}</g>}
    </svg>
  )
}

/** Início: casa com 4 quadradinhos, um verde. */
export const IconeInicio = (p: Props) => (
  <Base {...p}>
    <path d="M4 10.4 10.7 4.6a2 2 0 0 1 2.6 0L20 10.4V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
    <rect x="8.4" y="11" width="3" height="3" rx=".9" fill="currentColor" stroke="none" />
    <rect x="12.6" y="11" width="3" height="3" rx=".9" fill={VERDE} stroke="none" />
    <rect x="8.4" y="15.2" width="3" height="3" rx=".9" fill="currentColor" stroke="none" />
    <rect x="12.6" y="15.2" width="3" height="3" rx=".9" fill="currentColor" stroke="none" />
  </Base>
)

/** Ordens de Serviço: prancheta com checklist (clipe e vistos verdes). */
export const IconeOS = (p: Props) => (
  <Base {...p}>
    <rect x="4.5" y="4.5" width="15" height="17" rx="2.5" />
    <rect x="8.5" y="2.5" width="7" height="3.6" rx="1.4" fill={VERDE} stroke={VERDE} />
    <path d="m7.6 10.6 1.3 1.3 2.3-2.4M7.6 14.6l1.3 1.3 2.3-2.4" stroke={VERDE} />
    <rect x="7.7" y="17.3" width="2.6" height="2.6" rx=".6" />
    <path d="M13 11h3.6M13 15h3.6M13 18.6h3.6" />
  </Base>
)

/** Rotas: saída, trajeto com parada verde e pino de chegada. */
export const IconeRotas = (p: Props) => (
  <Base {...p} escala={1.1}>
    <circle cx="5.5" cy="18.8" r="1.9" fill="currentColor" />
    <path d="M5.5 16.9v-.4a3 3 0 0 1 3-3h.8M13.7 13.5h.8a3 3 0 0 0 3-3v-.4" />
    <circle cx="11.5" cy="13.5" r="2.2" />
    <circle cx="11.5" cy="13.5" r=".9" fill={VERDE} stroke={VERDE} />
    <path d="M17.5 10.1c-1-1.1-3-3.4-3-5.1a3 3 0 0 1 6 0c0 1.7-2 4-3 5.1Z" />
    <circle cx="17.5" cy="5" r=".9" />
  </Base>
)

/** Financeiro: carteira com cifrão e fecho verde. */
export const IconeFinanceiro = (p: Props) => (
  <Base {...p}>
    <path d="M5.8 7.6 16.6 4.4a1.5 1.5 0 0 1 1.9 1.4v1.8" />
    <path d="M20.5 11.2V9.6a2 2 0 0 0-2-2h-13a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2V17" />
    <path d="M20.5 11.2h-3.4a2.9 2.9 0 0 0 0 5.8h3.4Z" />
    <circle cx="17.2" cy="14.1" r=".95" fill={VERDE} stroke={VERDE} />
    <path d="M11 11.6c-.4-.6-1-.9-1.8-.9-1 0-1.7.5-1.7 1.2 0 1.7 3.6.9 3.6 2.8 0 .8-.8 1.3-1.9 1.3-.8 0-1.5-.3-1.9-.9M9.2 9.6v1.1M9.2 16v1.1" />
  </Base>
)

/** Fichas de Pesquisa (modelo do usuário, 23/11): ficha com casa e linhas, folha de trás e dobra verdes, lápis com ponta verde.
 *  Simplificado para ler bem em 22 px: duas linhas, casa só com telhado e paredes, lápis de traço grosso. */
export const IconeFichas = (p: Props) => (
  <Base {...p}>
    <path d="M4.6 17V5.4A2.4 2.4 0 0 1 7 3h7.2" stroke={VERDE} />
    <path d="M19.3 10.6V8.6l-4.1-4H9.1a2.4 2.4 0 0 0-2.4 2.4v11.6A2.4 2.4 0 0 0 9.1 21h7.8a2.4 2.4 0 0 0 2.4-2.4v-2.2" />
    <path d="M15.2 4.6v2.6a1.4 1.4 0 0 0 1.4 1.4h2.7" />
    <path d="M16 5.9v1.3a.6.6 0 0 0 .6.6h1.3Z" fill={VERDE} stroke={VERDE} strokeWidth=".7" />
    <path d="m9 10.6 2.6-2.4 2.6 2.4M9.8 10v2.8h3.6V10" />
    <path d="M9.2 15.6h3.8M9.2 18.2h2.6" />
    <path d="m14.5 18.5 4.4-5.5" strokeWidth="2.8" />
    <path d="m13.9 19.4.6-.9" />
    <path d="m19.6 12.1.7-.9" stroke={VERDE} strokeWidth="2.8" />
  </Base>
)

/** Amostragem (modelo do usuário, 23/11): casa com chaminé e janelas, cantos de enquadramento e lupa verde. */
export const IconeAmostragem = (p: Props) => (
  <Base {...p} escala={1.1}>
    <path d="M3.5 7.5v-2a2 2 0 0 1 2-2h2M16.5 3.5h2a2 2 0 0 1 2 2v2M3.5 16.5v2a2 2 0 0 0 2 2h2" />
    <path d="M5.8 11.3 11.3 6.6a1 1 0 0 1 1.3 0l5.6 4.7M15.3 8.4V6.8h1.6v3" />
    <path d="M7.4 10.3v6.9a1 1 0 0 0 1 1h4.2M16.6 10.4v1.2" />
    <rect x="9.4" y="11.2" width="1.6" height="1.6" rx=".4" fill="currentColor" stroke="none" />
    <rect x="11.5" y="11.2" width="1.6" height="1.6" rx=".4" fill="currentColor" stroke="none" />
    <rect x="9.4" y="13.3" width="1.6" height="1.6" rx=".4" fill="currentColor" stroke="none" />
    <rect x="11.5" y="13.3" width="1.6" height="1.6" rx=".4" fill="currentColor" stroke="none" />
    <circle cx="16.3" cy="15.6" r="2.6" stroke={VERDE} />
    <path d="m18.2 17.5 2.3 2.3" stroke={VERDE} />
  </Base>
)

/** E-mails da Caixa (modelo do usuário, 23/11): envelope com a aba em V verde e as duas dobras de baixo. */
export const IconeEmails = (p: Props) => (
  <Base {...p}>
    <rect x="2.8" y="5.2" width="18.4" height="13.6" rx="2.8" />
    <path d="m3.4 7.7 7.5 4.9a2 2 0 0 0 2.2 0l7.5-4.9" stroke={VERDE} />
    <path d="m5.2 16.6 3.5-3.3M18.8 16.6l-3.5-3.3" />
  </Base>
)

/** Anotações (modelo do usuário, 23/11): dois post-its, o de trás em verde e o da frente com linhas e a ponta dobrada verde. */
export const IconeAnotacoes = (p: Props) => (
  <Base {...p} escala={1.1}>
    <path d="M7.4 7.7 5.9 7.9a2 2 0 0 0-1.7 2.3l1.3 8.6a2 2 0 0 0 2.3 1.7l7.9-1.1a2 2 0 0 0 1.5-1.1" stroke={VERDE} />
    <g transform="rotate(-3 14 11)">
      <path d="M9.4 3.8h8.8a2 2 0 0 1 2 2v7.4l-4.4 4.3H9.4a2 2 0 0 1-2-2V5.8a2 2 0 0 1 2-2Z" />
      <path d="M20.2 13.2h-2.9a1.5 1.5 0 0 0-1.5 1.5v2.8" />
      <path d="M19 14.2h-1.6a.6.6 0 0 0-.6.6v1.7Z" fill={VERDE} stroke="none" />
      <path d="M10.2 7.4h7M10.2 9.9h6.4M10.2 12.4h3.4" />
    </g>
  </Base>
)

/** Configurações: engrenagem com o centro verde. */
export const IconeConfig = (p: Props) => (
  <Base {...p}>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="2.6" stroke={VERDE} />
  </Base>
)

/** Todas (perfil do "Ver", modelo do usuário, 23/11): uma pessoa em traço claro e a segunda, atrás, em verde. */
export const IconeTodas = (p: Props) => (
  <Base {...p}>
    <circle cx="9.5" cy="8.5" r="3.6" />
    <path d="M3.5 20v-1.5A4.5 4.5 0 0 1 8 14h3a4.5 4.5 0 0 1 4.5 4.5V20" />
    <path d="M14.9 5a3.6 3.6 0 0 1 0 7" stroke={VERDE} />
    <path d="M16.8 14.1a4.5 4.5 0 0 1 3.7 4.4V20" stroke={VERDE} />
  </Base>
)
