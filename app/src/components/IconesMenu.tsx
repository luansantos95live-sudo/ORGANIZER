import type { ReactNode } from 'react'

// Ícones do menu lateral (23/11, modelos enviados pelo usuário): traço claro (cor do texto do menu) com um detalhe verde.
// Todos no mesmo quadro 24×24, mesma espessura de traço e mesma margem, para terem o mesmo tamanho e proporção.

type Props = { size?: number | string; strokeWidth?: number | string; className?: string }
const VERDE = 'var(--brand)'

// Quadro mais justo que o 24×24 (pedido de 23/11: "estão muito pequenos, mantenha o tamanho dos anteriores"): o desenho
// ocupa ~18% a mais do espaço; o traço é reduzido na mesma proporção para ficar com a espessura de antes na tela.
const QUADRO = 20.4
const ORIGEM = (24 - QUADRO) / 2

function Base({ size = 24, strokeWidth = 1.75, className, children }: Props & { children: ReactNode }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox={`${ORIGEM} ${ORIGEM} ${QUADRO} ${QUADRO}`} fill="none" stroke="currentColor"
      strokeWidth={Number(strokeWidth) * (QUADRO / 24)} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {children}
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
  <Base {...p}>
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

/** Fichas de Pesquisa: fichas empilhadas com lupa (cabo verde). */
export const IconeFichas = (p: Props) => (
  <Base {...p}>
    <path d="M3.5 15V6.5A2.5 2.5 0 0 1 6 4h9.5" />
    <path d="M14.6 19.5H8.5A2.5 2.5 0 0 1 6 17V9.5A2.5 2.5 0 0 1 8.5 7h9A2.5 2.5 0 0 1 20 9.5v3.6" />
    <rect x="8.7" y="9.6" width="2.6" height="2.6" rx=".6" fill="currentColor" stroke="none" />
    <path d="M13 10.2h3.8M13 12.2h2.4M8.8 15.2h3.4" />
    <circle cx="17.4" cy="16.9" r="2.4" />
    <path d="m19.2 18.7 1.8 1.8" stroke={VERDE} />
  </Base>
)

/** Amostragem: pino verde sobre camadas, com cantos de enquadramento. */
export const IconeAmostragem = (p: Props) => (
  <Base {...p}>
    <path d="M3.5 7.5v-2a2 2 0 0 1 2-2h2M16.5 3.5h2a2 2 0 0 1 2 2v2M3.5 16.5v2a2 2 0 0 0 2 2h2M20.5 16.5v2a2 2 0 0 1-2 2h-2" />
    <path d="M9.7 10 6.6 11.6l5.4 2.7 5.4-2.7-3.1-1.6" />
    <path d="m6.6 14.1 5.4 2.7 5.4-2.7" stroke={VERDE} />
    <path d="m6.6 16.6 5.4 2.7 5.4-2.7" />
    <path d="M12 11c-.9-1-2.6-3-2.6-4.6a2.6 2.6 0 0 1 5.2 0c0 1.6-1.7 3.6-2.6 4.6Z" fill={VERDE} stroke={VERDE} />
    <circle cx="12" cy="6.4" r=".85" fill="var(--chrome)" stroke="none" />
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
  <Base {...p}>
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
