import { addDays, addMonths, addWeeks, addYears, differenceInCalendarDays, endOfMonth, endOfWeek, endOfYear, format, parseISO, startOfMonth, startOfWeek, startOfYear } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { OS } from '../types'
import { prazoAtual } from './os'

export { POLOS, TIPOLOGIAS, poloDe } from './os'

/** Períodos do sistema real. "especifico" usa um intervalo escolhido pelo usuário. */
export type Periodo = 'todos' | 'semana' | 'mes' | 'ano' | 'especifico'
export const PERIODOS: Record<Periodo, string> = { todos: 'Todos os períodos', semana: 'Semana', mes: 'Mês', ano: 'Ano', especifico: 'Período específico' }

/**
 * Situação no Financeiro, com o significado do sistema real:
 * - em_aberto: ainda não concluída (no prazo)
 * - vencida: não concluída e com o prazo efetivo vencido
 * - a_faturar: concluída e ainda sem nota fiscal
 * - faturada: concluída e marcada como faturada
 */
export type Situacao = 'em_aberto' | 'vencida' | 'a_faturar' | 'faturada'

export const valorTotal = (o: OS) => o.valorServico + o.valorDeslocamento

/** O.S. que geram faturamento: todas, menos as canceladas. */
export const entraNoFaturamento = (o: OS) => o.status !== 'cancelada'

export const estaFinalizada = (o: OS) => o.status === 'concluida'

/** Data que posiciona a O.S. no período: a conclusão, ou o prazo que vale agora enquanto está em aberto. */
export const dataReferencia = (o: OS, hoje = new Date()) => (estaFinalizada(o) ? o.concluidaEm ?? o.prazo : prazoAtual(o, hoje))

export function situacaoDe(o: OS, hoje = new Date()): Situacao {
  if (estaFinalizada(o)) return o.faturada ? 'faturada' : 'a_faturar'
  return parseISO(prazoAtual(o, hoje)) < inicioDoDia(hoje) ? 'vencida' : 'em_aberto'
}
function inicioDoDia(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

/** Concluída há mais de 5 dias e ainda sem nota ("parados +5 dias" no Início do sistema real). */
export function paradaSemNota(o: OS, hoje = new Date()) {
  return situacaoDe(o, hoje) === 'a_faturar' && !!o.concluidaEm && differenceInCalendarDays(hoje, parseISO(o.concluidaEm)) > 5
}

export function intervalo(periodo: Periodo, ref: Date, especifico?: { ini: string; fim: string }) {
  if (periodo === 'semana') return { ini: startOfWeek(ref, { weekStartsOn: 1 }), fim: endOfWeek(ref, { weekStartsOn: 1 }) }
  if (periodo === 'mes') return { ini: startOfMonth(ref), fim: endOfMonth(ref) }
  if (periodo === 'ano') return { ini: startOfYear(ref), fim: endOfYear(ref) }
  if (periodo === 'especifico' && especifico?.ini && especifico?.fim) {
    const fim = parseISO(especifico.fim)
    fim.setHours(23, 59, 59, 999)
    return { ini: parseISO(especifico.ini), fim }
  }
  return { ini: new Date(1900, 0, 1), fim: new Date(2999, 11, 31) }
}

export function moverPeriodo(periodo: Periodo, ref: Date, passo: number) {
  if (periodo === 'semana') return addWeeks(ref, passo)
  if (periodo === 'mes') return addMonths(ref, passo)
  if (periodo === 'ano') return addYears(ref, passo)
  return ref
}

export function rotuloPeriodo(periodo: Periodo, ref: Date, especifico?: { ini: string; fim: string }) {
  if (periodo === 'semana') {
    const { ini, fim } = intervalo('semana', ref)
    return `${format(ini, 'dd/MM')} a ${format(fim, 'dd/MM/yyyy')}`
  }
  if (periodo === 'mes') return format(ref, "MMMM 'de' yyyy", { locale: ptBR })
  if (periodo === 'ano') return String(ref.getFullYear())
  if (periodo === 'especifico') return especifico?.ini && especifico?.fim ? `${especifico.ini.split('-').reverse().join('/')} a ${especifico.fim.split('-').reverse().join('/')}` : 'Escolha as datas'
  return 'Todos os períodos'
}

export function noIntervalo(o: OS, ini: Date, fim: Date, hoje = new Date()) {
  const d = parseISO(dataReferencia(o, hoje))
  return d >= ini && d <= fim
}

/**
 * Filtro de período das Ordens de Serviço: com "Incluir pendências anteriores", as O.S. ainda abertas
 * de períodos passados continuam aparecendo (como no sistema real).
 */
export function noPeriodoComPendencias(o: OS, ini: Date, fim: Date, incluirPendencias: boolean, hoje = new Date()) {
  if (noIntervalo(o, ini, fim, hoje)) return true
  if (!incluirPendencias || estaFinalizada(o) || o.status === 'cancelada') return false
  return parseISO(dataReferencia(o, hoje)) < ini
}

export interface Resumo {
  qtd: number
  qtdFinalizadas: number
  qtdEmAberto: number
  qtdVencidas: number
  qtdAFaturarNF: number
  qtdFaturadas: number
  previsto: number
  finalizado: number
  emAberto: number // previsto − finalizado
  vencido: number
  aFaturarNF: number // concluído e sem nota
  faturado: number
  previstoServico: number // sem deslocamento
  finalizadoServico: number
  vencidoServico: number
  deslocamento: number
  ticketMedio: number
  maior?: OS
  menor?: OS
  conversao: number // 0–1
  projecao: number
}

export function resumir(lista: OS[], hoje = new Date()): Resumo {
  let previsto = 0, finalizado = 0, vencido = 0, deslocamento = 0, qtdFinalizadas = 0, qtdVencidas = 0
  let previstoServico = 0, finalizadoServico = 0, vencidoServico = 0, aFaturarNF = 0, faturado = 0, qtdAFaturarNF = 0, qtdFaturadas = 0
  let maior: OS | undefined, menor: OS | undefined
  for (const o of lista) {
    const v = valorTotal(o)
    previsto += v
    previstoServico += o.valorServico
    deslocamento += o.valorDeslocamento
    const s = situacaoDe(o, hoje)
    if (s === 'a_faturar' || s === 'faturada') { finalizado += v; finalizadoServico += o.valorServico; qtdFinalizadas++ }
    if (s === 'a_faturar') { aFaturarNF += v; qtdAFaturarNF++ }
    if (s === 'faturada') { faturado += v; qtdFaturadas++ }
    if (s === 'vencida') { vencido += v; vencidoServico += o.valorServico; qtdVencidas++ }
    if (!maior || v > valorTotal(maior)) maior = o
    if (!menor || v < valorTotal(menor)) menor = o
  }
  return {
    qtd: lista.length,
    qtdFinalizadas,
    qtdEmAberto: lista.length - qtdFinalizadas,
    qtdVencidas,
    qtdAFaturarNF,
    qtdFaturadas,
    previsto,
    finalizado,
    emAberto: previsto - finalizado,
    vencido,
    aFaturarNF,
    faturado,
    previstoServico,
    finalizadoServico,
    vencidoServico,
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

export type BaseRepasse = 'total' | 'servico'

export interface Repasse { previsto: number; finalizado: number; emAberto: number; vencido: number; projecao: number }

/** Sua parte sobre as O.S. do RT. A base é serviço + deslocamento ("total") ou só o serviço. */
export function repasseDe(r: Resumo, fracao: number, base: BaseRepasse): Repasse {
  const prev = base === 'total' ? r.previsto : r.previstoServico
  const fin = base === 'total' ? r.finalizado : r.finalizadoServico
  const venc = base === 'total' ? r.vencido : r.vencidoServico
  return { previsto: prev * fracao, finalizado: fin * fracao, emAberto: (prev - fin) * fracao, vencido: venc * fracao, projecao: (prev - venc) * fracao }
}

/** Valor de uma O.S. do RT que volta para você, segundo a base escolhida. */
export function repasseDaOS(o: OS, fracao: number, base: BaseRepasse) {
  return (base === 'total' ? valorTotal(o) : o.valorServico) * fracao
}

// ---------------------------------------------------------------- as três visões do Financeiro

/** Só minhas: suas O.S. somadas à sua participação no RT. */
export interface PainelMinhas {
  meuPrevisto: number
  meuFinalizado: number
  partPrevista: number // fração do RT previsto
  partFinalizada: number // fração do RT finalizado
  consolidado: number // meu finalizado + participação finalizada
  previstoTotal: number // meu previsto + participação prevista
  saldo: number // o que ainda pode entrar: previsto total − consolidado
  conversao: number // consolidado ÷ previsto total
  pesoRT: number // parte do consolidado que vem do RT
  qtdConcluidas: number
  qtdEmAberto: number
  qtdVencidas: number
  ticketFinalizadas: number // valor médio das minhas O.S. finalizadas
  projecao: number // previsto total sem as O.S. vencidas
}

export function painelMinhas(rMe: Resumo, rRt: Resumo, fracao: number, base: BaseRepasse): PainelMinhas {
  const rr = repasseDe(rRt, fracao, base)
  const consolidado = rMe.finalizado + rr.finalizado
  const previstoTotal = rMe.previsto + rr.previsto
  return {
    meuPrevisto: rMe.previsto,
    meuFinalizado: rMe.finalizado,
    partPrevista: rr.previsto,
    partFinalizada: rr.finalizado,
    consolidado,
    previstoTotal,
    saldo: previstoTotal - consolidado,
    conversao: previstoTotal ? consolidado / previstoTotal : 0,
    pesoRT: consolidado ? rr.finalizado / consolidado : 0,
    qtdConcluidas: rMe.qtdFinalizadas,
    qtdEmAberto: rMe.qtdEmAberto,
    qtdVencidas: rMe.qtdVencidas,
    ticketFinalizadas: rMe.qtdFinalizadas ? rMe.finalizado / rMe.qtdFinalizadas : 0,
    projecao: rMe.projecao + rr.projecao,
  }
}

/** Minha equipe: as O.S. do RT e o seu repasse sobre elas. */
export interface PainelEquipe {
  previsto: number
  finalizado: number
  emAberto: number
  repassePrevisto: number
  repasseFinalizado: number
  repasseRestante: number
  conversao: number
  qtd: number
  qtdFinalizadas: number
  qtdEmAberto: number
  qtdVencidas: number
  media: number
  maior?: OS
}

export function painelEquipe(rRt: Resumo, fracao: number, base: BaseRepasse): PainelEquipe {
  const rr = repasseDe(rRt, fracao, base)
  return {
    previsto: rRt.previsto,
    finalizado: rRt.finalizado,
    emAberto: rRt.emAberto,
    repassePrevisto: rr.previsto,
    repasseFinalizado: rr.finalizado,
    repasseRestante: rr.previsto - rr.finalizado,
    conversao: rRt.conversao,
    qtd: rRt.qtd,
    qtdFinalizadas: rRt.qtdFinalizadas,
    qtdEmAberto: rRt.qtdEmAberto,
    qtdVencidas: rRt.qtdVencidas,
    media: rRt.ticketMedio,
    maior: rRt.maior,
  }
}

/** Geral: o faturamento total do período, sem repasse. A taxa de conversão conta O.S., não valor. */
export interface PainelGeral {
  previsto: number
  finalizado: number
  emAberto: number
  deslocamento: number
  ticketMedio: number
  conversaoQtd: number
  qtd: number
  qtdFinalizadas: number
  qtdPendentes: number
  qtdVencidas: number
  maior?: OS
  menor?: OS
  projecao: number
}

export function painelGeral(r: Resumo): PainelGeral {
  return {
    previsto: r.previsto,
    finalizado: r.finalizado,
    emAberto: r.emAberto,
    deslocamento: r.deslocamento,
    ticketMedio: r.ticketMedio,
    conversaoQtd: r.qtd ? r.qtdFinalizadas / r.qtd : 0,
    qtd: r.qtd,
    qtdFinalizadas: r.qtdFinalizadas,
    qtdPendentes: r.qtdEmAberto,
    qtdVencidas: r.qtdVencidas,
    maior: r.maior,
    menor: r.menor,
    projecao: r.projecao,
  }
}

/**
 * Texto pronto da O.S. para a nota fiscal (botão "Copiar texto pronto" do Financeiro real).
 * Mesmo formato da descrição de cada O.S. no RRT Múltiplo Mensal.
 */
export function textoPronto(o: OS, contratoRRT: string) {
  const v = valorTotal(o).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `PRESTAÇÃO DE SERVIÇO DE ENGENHARIA A CAIXA CONFORME O CONTRATO N.º ${contratoRRT.trim() || '________'} / ORDEM DE SERVIÇO N° ${o.referencia} - VALOR OS + DESLOCAMENTO: R$ ${v}`
}

export interface Ritmo { diaAtual: number; diasNoMes: number; projecao: number }

/** No ritmo dos dias já corridos do mês, quanto fecharia. Só faz sentido para o mês em andamento. */
export function projecaoPorRitmo(consolidado: number, hoje: Date): Ritmo {
  const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate()
  const diaAtual = Math.min(hoje.getDate(), diasNoMes)
  return { diaAtual, diasNoMes, projecao: diaAtual > 0 ? (consolidado / diaAtual) * diasNoMes : consolidado }
}

/** Dias da semana de uma data (segunda a domingo), para a faixa do Início. */
export function diasDaSemana(ref: Date) {
  const ini = startOfWeek(ref, { weekStartsOn: 1 })
  return Array.from({ length: 7 }, (_, i) => addDays(ini, i))
}
