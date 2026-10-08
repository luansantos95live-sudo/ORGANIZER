import { addMonths, addQuarters, addYears, endOfMonth, endOfQuarter, endOfYear, format, parseISO, startOfMonth, startOfQuarter, startOfYear } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { OS, Tipologia } from '../types'

export type Periodo = 'mes' | 'trimestre' | 'ano'
export type Situacao = 'finalizada' | 'a_faturar' | 'vencida'

export const POLOS: Record<string, string[]> = {
  'Ji-Paraná': ['Ji-Paraná', 'Ouro Preto do Oeste', 'Jaru'],
  Ariquemes: ['Ariquemes'],
  Cacoal: ['Cacoal', 'Rolim de Moura'],
}

export function poloDe(cidade: string) {
  for (const [polo, cidades] of Object.entries(POLOS)) if (cidades.includes(cidade)) return polo
  return 'Outros'
}

export const TIPOLOGIAS: Record<Tipologia, string> = {
  A413: 'Avaliação residencial',
  E004: 'Vistoria de obra',
  C021: 'Planilha PCI/PLS',
  M112: 'Avaliação comercial',
  R017: 'Reavaliação',
}

export const valorTotal = (o: OS) => o.valorServico + o.valorDeslocamento

/** O.S. que geram faturamento: aceitas e não canceladas. Convocadas ainda podem ser recusadas. */
export const entraNoFaturamento = (o: OS) => o.status !== 'cancelada' && o.status !== 'convocada'

export const estaFinalizada = (o: OS) => o.status === 'finalizada' || o.status === 'conferida'

/** Data que posiciona a O.S. no período: a conclusão, ou o prazo enquanto ainda está a faturar. */
export const dataReferencia = (o: OS) => (estaFinalizada(o) ? o.concluidaEm ?? o.prazo : o.prazo)

export function situacaoDe(o: OS, hoje = new Date()): Situacao {
  if (estaFinalizada(o)) return 'finalizada'
  return parseISO(o.prazo) < startOfDay(hoje) ? 'vencida' : 'a_faturar'
}
function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function intervalo(periodo: Periodo, ref: Date) {
  if (periodo === 'mes') return { ini: startOfMonth(ref), fim: endOfMonth(ref) }
  if (periodo === 'trimestre') return { ini: startOfQuarter(ref), fim: endOfQuarter(ref) }
  return { ini: startOfYear(ref), fim: endOfYear(ref) }
}

export function moverPeriodo(periodo: Periodo, ref: Date, passo: number) {
  if (periodo === 'mes') return addMonths(ref, passo)
  if (periodo === 'trimestre') return addQuarters(ref, passo)
  return addYears(ref, passo)
}

export function rotuloPeriodo(periodo: Periodo, ref: Date) {
  if (periodo === 'mes') return format(ref, "MMMM 'de' yyyy", { locale: ptBR })
  if (periodo === 'trimestre') return `${Math.floor(ref.getMonth() / 3) + 1}º trimestre de ${ref.getFullYear()}`
  return String(ref.getFullYear())
}

export function noIntervalo(o: OS, ini: Date, fim: Date) {
  const d = parseISO(dataReferencia(o))
  return d >= ini && d <= fim
}

export interface Resumo {
  qtd: number
  qtdFinalizadas: number
  qtdAFaturar: number
  qtdVencidas: number
  previsto: number
  finalizado: number
  aFaturar: number
  vencido: number
  deslocamento: number
  ticketMedio: number
  maior?: OS
  menor?: OS
  conversao: number // 0–1
  projecao: number
}

export function resumir(lista: OS[], hoje = new Date()): Resumo {
  let previsto = 0, finalizado = 0, vencido = 0, deslocamento = 0, qtdFinalizadas = 0, qtdVencidas = 0
  let maior: OS | undefined, menor: OS | undefined
  for (const o of lista) {
    const v = valorTotal(o)
    previsto += v
    deslocamento += o.valorDeslocamento
    const s = situacaoDe(o, hoje)
    if (s === 'finalizada') { finalizado += v; qtdFinalizadas++ }
    if (s === 'vencida') { vencido += v; qtdVencidas++ }
    if (!maior || v > valorTotal(maior)) maior = o
    if (!menor || v < valorTotal(menor)) menor = o
  }
  const aFaturar = previsto - finalizado
  return {
    qtd: lista.length,
    qtdFinalizadas,
    qtdAFaturar: lista.length - qtdFinalizadas,
    qtdVencidas,
    previsto,
    finalizado,
    aFaturar,
    vencido,
    deslocamento,
    ticketMedio: lista.length ? previsto / lista.length : 0,
    maior,
    menor,
    conversao: previsto ? finalizado / previsto : 0,
    // O que ainda está no prazo tende a fechar; o vencido é risco e fica fora da projeção.
    projecao: previsto - vencido,
  }
}

export const brlCompacto = (v: number) => {
  if (Math.abs(v) >= 1000) return `R$ ${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

export const pct = (v: number, casas = 1) => `${(v * 100).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`

/** Escala "bonita" para o eixo do histórico. */
export function ticksBonitos(max: number, alvo = 4) {
  if (max <= 0) return { topo: 1000, ticks: [0, 250, 500, 750, 1000] }
  const bruto = max / alvo
  const mag = Math.pow(10, Math.floor(Math.log10(bruto)))
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((p) => p >= bruto) ?? 10 * mag
  const topo = Math.ceil(max / passo) * passo
  const ticks: number[] = []
  for (let t = 0; t <= topo + 1e-6; t += passo) ticks.push(t)
  return { topo, ticks }
}
