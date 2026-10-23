import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'
import type { OS, TipoPept, Tipologia } from '../types'
import { PEPT_LIMITE, STATUS_ABERTOS, TIPOLOGIAS_SEM_VISTORIA, farolDe, normCidade, prazoAtual } from './os'
import { peptAberta } from './pept'
import { toHHMM, toMin } from './rota'

// ---------------------------------------------------------------- próximo passo de cada O.S. aberta
/**
 * O ciclo de trabalho do credenciado, do jeito que ele pensa (não pela etapa da Caixa):
 * em aberto = antes da vistoria (agendar, vistoriar); a finalizar = depois dela (laudo, assinatura, envio).
 */
export type Acao = 'agendar' | 'vistoriar' | 'laudo' | 'assinar' | 'enviar'
export type Grupo = 'aberto' | 'finalizar'

export const ACAO_META: Record<Acao, { label: string; botao: string; grupo: Grupo; passo: number; descricao: string }> = {
  agendar: { label: 'Agendar vistoria', botao: 'Agendar', grupo: 'aberto', passo: 0, descricao: 'Recebida, sem dia marcado com o cliente' },
  vistoriar: { label: 'Fazer vistoria', botao: 'Vistoria feita', grupo: 'aberto', passo: 1, descricao: 'Vistoria marcada, ainda não feita' },
  laudo: { label: 'Terminar laudo', botao: 'Laudo pronto', grupo: 'finalizar', passo: 2, descricao: 'Vistoria feita, falta montar o laudo' },
  assinar: { label: 'Assinar laudo', botao: 'Assinado', grupo: 'finalizar', passo: 3, descricao: 'Laudo pronto, esperando a assinatura do RT' },
  enviar: { label: 'Enviar à Caixa', botao: 'Concluir', grupo: 'finalizar', passo: 4, descricao: 'Assinado, falta enviar e concluir' },
}
export const ACOES: Acao[] = ['agendar', 'vistoriar', 'laudo', 'assinar', 'enviar']
/** Passos mostrados na barrinha de progresso da O.S. */
export const PASSOS = ['Vistoria', 'Laudo', 'Assinatura', 'Envio'] as const

export function proximaAcao(o: OS, hoje = new Date()): Acao | null {
  if (!STATUS_ABERTOS.includes(o.status)) return null
  if (o.status === 'assinatura_pendente') return 'assinar'
  if (o.status === 'assinatura_concluida') return 'enviar'
  // recebida ou em andamento
  if (TIPOLOGIAS_SEM_VISTORIA.includes(o.tipologia)) return 'laudo'
  if (o.vistoria) return !o.vistoria.feita && o.vistoria.data >= format(hoje, 'yyyy-MM-dd') ? 'vistoriar' : 'laudo'
  return o.status === 'recebida' ? 'agendar' : 'laudo'
}

export const grupoDe = (o: OS, hoje = new Date()): Grupo | null => {
  const a = proximaAcao(o, hoje)
  return a ? ACAO_META[a].grupo : null
}

// ---------------------------------------------------------------- urgência
const PESO_FAROL = { late: 0, urgent: 1, warn: 2, ok: 3, pausa: 4, none: 5 } as const

/** Mais urgente primeiro: vencidas, vencendo, atenção, no prazo, pausadas. Empate: o prazo. */
export function porUrgencia(lista: OS[], hoje = new Date()): OS[] {
  return [...lista].sort((a, b) =>
    PESO_FAROL[farolDe(a, hoje).farol] - PESO_FAROL[farolDe(b, hoje).farol] ||
    prazoAtual(a, hoje).localeCompare(prazoAtual(b, hoje)))
}

// ---------------------------------------------------------------- faixas de prazo
export type Faixa = 'vencidas' | 'hoje' | 'amanha' | 'semana' | 'quinzena' | 'depois' | 'pausadas'
export const FAIXA_META: Record<Faixa, { label: string; tom: 'vermelho' | 'laranja' | 'neutro' | 'azul' }> = {
  vencidas: { label: 'Vencidas', tom: 'vermelho' },
  hoje: { label: 'Vencem hoje', tom: 'laranja' },
  amanha: { label: 'Vencem amanhã', tom: 'laranja' },
  semana: { label: 'Em até 7 dias', tom: 'neutro' },
  quinzena: { label: 'Em até 15 dias', tom: 'neutro' },
  depois: { label: 'Depois', tom: 'neutro' },
  pausadas: { label: 'Pausadas', tom: 'azul' },
}
export const FAIXAS: Faixa[] = ['vencidas', 'hoje', 'amanha', 'semana', 'quinzena', 'depois', 'pausadas']

export function faixaDePrazo(o: OS, hoje = new Date()): Faixa {
  if (o.pausadoEm) return 'pausadas'
  const d = differenceInCalendarDays(parseISO(prazoAtual(o, hoje)), hoje)
  if (d < 0) return 'vencidas'
  if (d === 0) return 'hoje'
  if (d === 1) return 'amanha'
  if (d <= 7) return 'semana'
  if (d <= 15) return 'quinzena'
  return 'depois'
}

// ---------------------------------------------------------------- semana de trabalho
export interface DiaDeTrabalho { data: string; vistorias: OS[]; vencem: OS[] }

/** Para cada dia: vistorias marcadas (por hora) e O.S. que vencem nele. */
export function agendaDaSemana(lista: OS[], dias: Date[], hoje = new Date()): DiaDeTrabalho[] {
  return dias.map((d) => {
    const data = format(d, 'yyyy-MM-dd')
    return {
      data,
      vistorias: lista.filter((o) => o.vistoria?.data === data).sort((a, b) => a.vistoria!.hora.localeCompare(b.vistoria!.hora)),
      vencem: lista.filter((o) => prazoAtual(o, hoje) === data),
    }
  })
}

/** Próximo horário livre no dia: 08:00 se vazio; senão logo depois da última vistoria (duração + 20 min de estrada). */
export function proximoHorario(vistorias: OS[], duracao: number) {
  if (!vistorias.length) return '08:00'
  const fim = Math.max(...vistorias.map((o) => toMin(o.vistoria!.hora) + (o.vistoria!.duracao || duracao)))
  return toHHMM(Math.min(Math.ceil((fim + 20) / 30) * 30, 18 * 60))
}

export const semanaQueVem = (dias: Date[]) => dias.map((d) => addDays(d, 7))

// ---------------------------------------------------------------- gestão da carteira (Início)
const dias = (de: string, hoje: Date) => differenceInCalendarDays(hoje, parseISO(de.slice(0, 10)))

/** Dias sem nenhum movimento: desde o último evento da linha do tempo (ou da chegada, se não houver). */
export function diasParada(o: OS, hoje = new Date()): number {
  const ultimo = o.historico?.length ? o.historico[o.historico.length - 1].data : o.emissao
  return Math.max(0, dias(ultimo, hoje))
}

/** O.S. abertas sem movimento há `limite` dias ou mais (pausadas ficam de fora: já estão justificadas). */
export function paradas(lista: OS[], hoje = new Date(), limite = 5): { os: OS; dias: number }[] {
  return lista
    .filter((o) => STATUS_ABERTOS.includes(o.status) && !o.pausadoEm)
    .map((o) => ({ os: o, dias: diasParada(o, hoje) }))
    .filter((p) => p.dias >= limite)
    .sort((a, b) => b.dias - a.dias)
}

export interface LinhaEtapa { status: OS['status']; qtd: number; idadeMedia: number; maisAntiga: number; paradas: number }

/** Quantas O.S. abertas há em cada etapa, a idade média (dias desde a chegada) e quantas estão paradas. */
export function carteiraPorEtapa(lista: OS[], hoje = new Date(), limite = 5): LinhaEtapa[] {
  return STATUS_ABERTOS.map((status) => {
    const da = lista.filter((o) => o.status === status)
    const idades = da.map((o) => Math.max(0, dias(o.emissao, hoje)))
    return {
      status,
      qtd: da.length,
      idadeMedia: idades.length ? Math.round(idades.reduce((s, n) => s + n, 0) / idades.length) : 0,
      maisAntiga: idades.length ? Math.max(...idades) : 0,
      paradas: da.filter((o) => !o.pausadoEm && diasParada(o, hoje) >= limite).length,
    }
  })
}

export interface Producao { entraram: number; concluidas: number; noPrazo: number; pctNoPrazo: number | null; tempoMedio: number | null }

/** Produção do mês de `hoje`: O.S. que chegaram, que foram concluídas, quantas dentro do prazo e o tempo médio até concluir. */
export function producaoDoMes(lista: OS[], hoje = new Date()): Producao {
  const mes = format(hoje, 'yyyy-MM')
  const validas = lista.filter((o) => o.status !== 'cancelada')
  const concl = validas.filter((o) => o.concluidaEm?.startsWith(mes))
  const noPrazo = concl.filter((o) => o.concluidaEm! <= prazoAtual(o, hoje)).length
  const tempos = concl.map((o) => Math.max(0, differenceInCalendarDays(parseISO(o.concluidaEm!), parseISO(o.emissao))))
  return {
    entraram: validas.filter((o) => o.emissao.startsWith(mes)).length,
    concluidas: concl.length,
    noPrazo,
    pctNoPrazo: concl.length ? noPrazo / concl.length : null,
    tempoMedio: tempos.length ? Math.round(tempos.reduce((s, n) => s + n, 0) / tempos.length) : null,
  }
}

/** Concluídas em cada uma das últimas `n` semanas (segunda a domingo), a mais antiga primeiro. */
export function concluidasPorSemana(lista: OS[], hoje = new Date(), n = 8): { inicio: string; qtd: number }[] {
  const seg = addDays(hoje, -((hoje.getDay() + 6) % 7))
  return Array.from({ length: n }, (_, i) => {
    const ini = addDays(seg, -7 * (n - 1 - i))
    const a = format(ini, 'yyyy-MM-dd'), b = format(addDays(ini, 6), 'yyyy-MM-dd')
    return { inicio: a, qtd: lista.filter((o) => o.status !== 'cancelada' && o.concluidaEm && o.concluidaEm >= a && o.concluidaEm <= b).length }
  })
}

/** O.S. abertas por cidade: quantas e quantas ainda sem vistoria marcada. */
export function abertasPorCidade(lista: OS[], hoje = new Date()): { cidade: string; qtd: number; semData: number }[] {
  const m = new Map<string, { qtd: number; semData: number }>()
  for (const o of lista) {
    if (!STATUS_ABERTOS.includes(o.status)) continue
    const c = normCidade(o.endereco.cidade)
    const v = m.get(c) ?? { qtd: 0, semData: 0 }
    v.qtd++
    if (proximaAcao(o, hoje) === 'agendar') v.semData++
    m.set(c, v)
  }
  return [...m.entries()].map(([cidade, v]) => ({ cidade, ...v })).sort((a, b) => b.qtd - a.qtd || a.cidade.localeCompare(b.cidade))
}

/** Quem precisa agir para destravar uma O.S. parada, pela etapa em que ela está. */
export const QUEM_DESTRAVA: Partial<Record<OS['status'], string>> = {
  recebida: 'Falar com o cliente', em_andamento: 'Laudo com você', assinatura_pendente: 'Cobrar o RT',
  assinatura_concluida: 'Enviar à Caixa',
}

export interface ItemPept { os: OS; desde: string; dias: number; motivo: string; tipo?: TipoPept; prazoEfetivo: string }

/**
 * O.S. em PEPT: prazo pausado por alguma pendência. Mostra desde quando, há quantos dias, o motivo
 * (o texto da última "Pausa solicitada" da linha do tempo) e o prazo efetivo, que anda junto com a pausa.
 */
export function emPept(lista: OS[], hoje = new Date()): ItemPept[] {
  return lista
    .filter((o) => o.pausadoEm && STATUS_ABERTOS.includes(o.status))
    .map((o) => {
      const p = peptAberta(o)
      return { os: o, desde: o.pausadoEm!, dias: Math.max(0, dias(o.pausadoEm!, hoje)), motivo: p?.motivo ?? '', tipo: p?.tipo, prazoEfetivo: prazoAtual(o, hoje) }
    })
    .sort((a, b) => b.dias - a.dias)
}

// ---------------------------------------------------------------- alertas do Início
/** Prazo do COT para uma PEPT ficar aberta (dias). */
export const LIMITE_PEPT = 21

export interface Alerta { nivel: 'critico' | 'atencao' | 'info'; texto: string; os: OS; ordem: number }

/**
 * Alertas do dia, do mais grave para o mais leve: O.S. vencida, PEPT estourando o prazo do COT,
 * O.S. que vence em até 3 dias, PEPT perto do limite e vistoria marcada para amanhã.
 */
export function alertas(lista: OS[], hoje = new Date()): Alerta[] {
  const r: Alerta[] = []
  const amanha = format(addDays(hoje, 1), 'yyyy-MM-dd')
  const nome = (o: OS) => `OS-${o.numero} (${o.proponente})`
  for (const o of lista) {
    if (!STATUS_ABERTOS.includes(o.status)) continue
    if (o.pausadoEm) {
      if (!PEPT_LIMITE[o.tipologia]) continue // sem limite (ex.: A413, prazo indeterminado): não há prazo do COT
      const d = Math.max(0, dias(o.pausadoEm, hoje)), falta = LIMITE_PEPT - d
      if (falta <= 0) r.push({ nivel: 'critico', os: o, ordem: 1, texto: `PEPT da ${nome(o)} aberta há ${d} dias: passou do prazo do COT (${LIMITE_PEPT} dias).` })
      else if (falta <= 7) r.push({ nivel: 'atencao', os: o, ordem: 2 + falta / 10, texto: `PEPT da ${nome(o)} aberta há ${d} dias. ${falta === 1 ? 'Falta 1 dia' : `Faltam ${falta} dias`} para o prazo do COT (${LIMITE_PEPT} dias).` })
      continue
    }
    const dp = differenceInCalendarDays(parseISO(prazoAtual(o, hoje)), hoje)
    if (dp < 0) r.push({ nivel: 'critico', os: o, ordem: 0 + dp / 1000, texto: `${nome(o)} venceu há ${-dp} ${dp === -1 ? 'dia' : 'dias'}.` })
    else if (dp <= 3) r.push({ nivel: 'atencao', os: o, ordem: 2 + dp / 10, texto: dp === 0 ? `${nome(o)} vence hoje.` : `${dp === 1 ? 'Falta 1 dia' : `Faltam ${dp} dias`} para a ${nome(o)} vencer.` })
    if (o.vistoria && !o.vistoria.feita && o.vistoria.data === amanha) r.push({ nivel: 'info', os: o, ordem: 5, texto: `Vistoria amanhã às ${o.vistoria.hora}: ${nome(o)}, ${o.endereco.cidade}.` })
  }
  return r.sort((a, b) => a.ordem - b.ordem)
}

/**
 * Por tipologia, as O.S. recebidas no mês (sem as canceladas) e quantas delas ainda não foram finalizadas.
 * Da que mais recebeu para a que menos; empate pelo código.
 */
export function porTipologia(lista: OS[], mes: string): { tipologia: Tipologia; recebidas: number; abertas: number }[] {
  const m = new Map<Tipologia, { recebidas: number; abertas: number }>()
  for (const o of lista) {
    if (o.status === 'cancelada' || !o.emissao.startsWith(mes)) continue
    const v = m.get(o.tipologia) ?? { recebidas: 0, abertas: 0 }
    v.recebidas++
    if (o.status !== 'concluida') v.abertas++
    m.set(o.tipologia, v)
  }
  return [...m.entries()].map(([tipologia, v]) => ({ tipologia, ...v })).sort((a, b) => b.recebidas - a.recebidas || a.tipologia.localeCompare(b.tipologia))
}
