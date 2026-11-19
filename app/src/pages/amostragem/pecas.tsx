import { BriefcaseBusiness, Building2, CarFront, House, LandPlot, Shapes, Store, Tractor, Warehouse } from 'lucide-react'
import { ROTULO_SITUACAO, type SituacaoValidade, diasRestantes, fmtData, situacao, validoAte } from '../../lib/amostragem/calculo'
import './amostragem.css'

const ICONES = {
  TERRENO: LandPlot,
  CASA: House,
  APARTAMENTO: Building2,
  VAGA_GARAGEM: CarFront,
  SALA_COMERCIAL: BriefcaseBusiness,
  LOJA: Store,
  GALPAO: Warehouse,
  RURAL: Tractor,
  OUTRO: Shapes,
} as const

export function IconeTipo({ tipo, size = 18 }: { tipo: string; size?: number }) {
  const Icone = ICONES[tipo as keyof typeof ICONES] ?? Shapes
  return (
    <span className="icone-tipo">
      <Icone size={size} strokeWidth={1.75} />
    </span>
  )
}

const CLASSE: Record<SituacaoValidade, string> = { vigente: 'chip-v', vencendo: 'chip-l', vencida: 'chip-r' }

/** Selo de validade da amostragem: vigente / vence em breve / vencida, com os dias. */
export function ChipValidade({ data, meses, detalhe }: { data: string; meses: number; detalhe?: boolean }) {
  const s = situacao(data, meses)
  const dias = diasRestantes(data, meses)
  return (
    <span className={`chip ${CLASSE[s]} !h-[22px] text-[11.5px] font-semibold`} title={`Válida até ${fmtData(validoAte(data, meses))}`}>
      <span className="dot" />
      {ROTULO_SITUACAO[s]}
      {detalhe && (
        <span className="font-normal">
          {' · '}
          {dias < 0 ? `há ${-dias} ${dias === -1 ? 'dia' : 'dias'}` : dias === 0 ? 'vence hoje' : `${dias} ${dias === 1 ? 'dia' : 'dias'}`}
        </span>
      )}
    </span>
  )
}

export const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`
