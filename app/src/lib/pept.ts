import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'
import type { ComoResolveu, OS, Pept, TipoPept } from '../types'
import { PEPT_LIMITE, PEPT_SEM_PRAZO, diasDePausa, pausaValida, peptContaPrazo } from './os'

/**
 * PEPT (pendência que pausa o prazo da O.S.), como o usuário trabalha (23/10/2026):
 *   abre PEPT → o prazo PARA
 *   cliente resolve (e-mail da Caixa ou data à mão) → o prazo VOLTA a contar; a PEPT fica aberta, "em análise"
 *   analiso: reabro (não resolveu tudo) → o prazo PARA de novo (da resolução até a reabertura os dias contam)
 *            ou valido (finalizo) → a PEPT encerra; o prazo não muda (já estava contando)
 * O prazo só para quando a PEPT é aberta/reaberta e sempre volta a contar quando o cliente resolve.
 * Cada período fica no registro: início, resolução do cliente, encerramento, dias parados e como terminou.
 */
export const TIPO_PEPT: Record<TipoPept, { label: string; descricao: string }> = {
  documental: {
    label: 'Documental',
    descricao: 'Falta ou problema em documento: matrícula, ART/RRT, projeto, documento do cliente.',
  },
  vistoria: {
    label: 'De vistoria',
    descricao: 'Impedimento para fazer a vistoria: acesso, contato, endereço, obra.',
  },
}

/** Como o período da PEPT terminou. */
export const COMO_RESOLVEU: Record<ComoResolveu, string> = { manual: 'Validada e finalizada', reaberta: 'Reaberta', email: 'E-mail da Caixa', conclusao: 'O.S. concluída' }
/** Como a resolução do cliente foi registrada. */
export const ORIGEM_RESOLUCAO: Record<'email' | 'manual', string> = { email: 'pelo e-mail da Caixa', manual: 'registrada à mão' }

/** Pendência da pausa antiga, lida da linha do tempo ("Pausa solicitada: …"). */
export function motivoDoHistorico(o: Pick<OS, 'historico'>): string {
  const ev = [...(o.historico ?? [])].reverse().find((h) => /^Pausa( solicitada)?\b/.test(h.texto))
  return (ev?.texto.replace(/^Pausa( solicitada)?( \(PEPT [^)]*\))?:?\s*/, '').replace(/\s*\(desde [\d/]+\)$/, '') ?? '').replace(/^pendência$/, '')
}

/** Registros de PEPT da O.S.; dados de antes do registro (só `pausadoEm`) ganham a PEPT em aberto, com a pendência da linha do tempo. */
export function peptsDaOS(o: Pick<OS, 'pepts' | 'pausadoEm' | 'historico'>): Pept[] {
  const lista = o.pepts ?? []
  if (o.pausadoEm && !lista.some((p) => !p.fim)) return [...lista, { id: `pept-${o.pausadoEm}`, motivo: motivoDoHistorico(o), inicio: o.pausadoEm }]
  return lista
}
/** PEPT em aberto: pausada (aguardando o cliente) ou já resolvida pelo cliente e em análise. */
export const peptAberta = (o: Pick<OS, 'pepts' | 'pausadoEm' | 'historico'>) => peptsDaOS(o).find((p) => !p.fim)
/** A PEPT em aberto foi resolvida pelo cliente (o prazo está contando) e espera você validar ou reabrir. */
export const peptEmAnalise = (o: Pick<OS, 'pepts' | 'pausadoEm' | 'historico'>) => !o.pausadoEm && !!peptAberta(o)?.resolvidaEm
/** Dia em que o período parou de segurar o prazo (resolução do cliente; em registros antigos, o encerramento). */
export const fimDaPausa = (p: Pept) => p.resolvidaEm ?? p.fim

/** Abrir uma PEPT: pausa o prazo a partir do dia escolhido e guarda o registro. */
export function abrirPept(o: Pick<OS, 'pepts'>, dados: { tipo: TipoPept; motivo: string; desde: string }, id: string): Pick<OS, 'pausadoEm' | 'pepts'> {
  return { pausadoEm: dados.desde, pepts: [...(o.pepts ?? []), { id, tipo: dados.tipo, motivo: dados.motivo, inicio: dados.desde }] }
}

/**
 * O cliente resolveu a PEPT no dia informado (e-mail da Caixa ou registro à mão): o prazo volta a contar desse dia
 * e os dias parados empurram o prazo (só se a PEPT foi aberta até 2 dias do recebimento). A PEPT continua aberta,
 * em análise, até você validar (finalizar) ou reabrir. Devolve null se não estiver pausada ou se o dia for antes da pausa.
 */
export function resolverPeptNaOS(o: OS, dia: string, origem: 'email' | 'manual'): Partial<OS> | null {
  if (!o.pausadoEm || dia < o.pausadoEm) return null
  const dias = pausaValida(o) ? diasDePausa(o.tipologia, o.pausadoEm, parseISO(dia)) : 0
  return {
    pausadoEm: undefined,
    diasPausado: (o.diasPausado || 0) + dias,
    pepts: peptsDaOS(o).map((p) => (p.fim || p.resolvidaEm ? p : { ...p, resolvidaEm: dia, resolucao: origem, dias })),
  }
}

/**
 * Encerrar a PEPT em aberto no dia informado (validada/finalizada, reaberta ou pela conclusão da O.S.). Se o cliente
 * ainda não tinha resolvido, esse dia vale também como resolução (o prazo volta a contar). Já resolvida, o prazo não muda.
 */
export function encerrarPeptNaOS(o: OS, dia: string, como: ComoResolveu): Partial<OS> {
  let patch: Partial<OS> = {}
  let base = o
  if (o.pausadoEm) {
    const r = resolverPeptNaOS(o, dia < o.pausadoEm ? o.pausadoEm : dia, como === 'email' ? 'email' : 'manual')
    if (r) { patch = r; base = { ...o, ...r } }
  }
  const lista = peptsDaOS(base)
  if (!lista.some((p) => !p.fim)) return patch
  return { ...patch, pepts: lista.map((p) => (p.fim ? p : { ...p, fim: dia, resolvidaPor: como })) }
}
/** Encerrar a PEPT numa data (resolve, se preciso, e encerra). */
export const fecharPept = (o: OS, quando: Date, como: ComoResolveu) => encerrarPeptNaOS(o, format(quando, 'yyyy-MM-dd'), como)

export interface ResumoPept {
  total: number // quantos períodos de PEPT a O.S. já teve
  diasParados: number // dias que as PEPTs já empurraram o prazo
  aberta?: { pept: Pept; dias: number; indeterminado: boolean; limite?: number; restam?: number; emAnalise: boolean }
}

/** Resumo para a aba PEPT: a em aberto (há quantos dias, limite da tipologia, se está em análise) e o total já parado. */
export function resumoPept(o: OS, hoje = new Date()): ResumoPept {
  const lista = peptsDaOS(o)
  const p = peptAberta(o)
  const r: ResumoPept = { total: lista.length, diasParados: o.diasPausado || 0 }
  if (p) {
    const dias = Math.max(0, differenceInCalendarDays(hoje, parseISO(p.inicio)))
    const limite = PEPT_LIMITE[o.tipologia]
    r.aberta = { pept: p, dias, indeterminado: PEPT_SEM_PRAZO.includes(o.tipologia) && pausaValida(o), limite, restam: limite !== undefined ? limite - dias : undefined, emAnalise: peptEmAnalise(o) }
  }
  return r
}

/** Editar a PEPT (pendência ou tipo), inclusive a de dado antigo, que passa a ficar no registro. */
export function editarPeptNaOS(o: Pick<OS, 'pepts' | 'pausadoEm' | 'historico'>, peptId: string, patch: Partial<Pick<Pept, 'motivo' | 'tipo'>>): Pick<OS, 'pepts'> {
  return { pepts: peptsDaOS(o).map((p) => (p.id === peptId ? { ...p, ...patch } : p)) }
}

/**
 * Corrigir as datas de um período da PEPT (abertura, resolução do cliente e encerramento): recalcula os dias parados
 * desse período, o total que empurra o prazo e, se for a PEPT pausada, o dia em que o prazo parou.
 * Devolve null se as datas não fizerem sentido (resolução antes da abertura, encerramento antes da resolução).
 */
export function editarDatasPeptNaOS(o: OS, peptId: string, datas: { inicio?: string; resolvidaEm?: string; fim?: string }): Partial<OS> | null {
  const lista = peptsDaOS(o)
  const p = lista.find((x) => x.id === peptId)
  if (!p) return null
  const inicio = datas.inicio ?? p.inicio
  const resolvidaEm = datas.resolvidaEm ?? p.resolvidaEm
  const fim = p.fim ? datas.fim ?? p.fim : undefined
  if (!inicio || (resolvidaEm && resolvidaEm < inicio) || (fim && fim < (resolvidaEm ?? inicio))) return null
  const pausaAte = resolvidaEm ?? fim
  // pausada (sem resolução): só muda o dia em que o prazo parou
  if (!pausaAte) return { pausadoEm: inicio, pepts: lista.map((x) => (x.id === peptId ? { ...x, inicio } : x)) }
  const novaLista = lista.map((x) => (x.id === peptId ? { ...x, inicio } : x))
  const conta = peptContaPrazo({ ...o, pepts: novaLista }, { ...p, inicio })
  const dias = conta ? diasDePausa(o.tipologia, inicio, parseISO(pausaAte)) : 0
  return {
    diasPausado: Math.max(0, (o.diasPausado || 0) - (p.dias || 0) + dias),
    pepts: lista.map((x) => (x.id === peptId ? { ...x, inicio, ...(resolvidaEm ? { resolvidaEm } : {}), ...(fim ? { fim } : {}), dias } : x)),
  }
}

/** Última PEPT encerrada (a que pode ser reaberta), quando não há nenhuma em aberto. */
export function ultimaFinalizada(o: Pick<OS, 'pepts' | 'pausadoEm' | 'historico'>): Pept | undefined {
  if (peptAberta(o)) return undefined
  return [...peptsDaOS(o)].filter((p) => p.fim).sort((a, b) => (a.fim! < b.fim! ? -1 : a.fim! > b.fim! ? 1 : 0)).at(-1)
}

/**
 * Reabrir a PEPT no dia informado (o cliente não resolveu tudo): o prazo para de novo desse dia, com o mesmo motivo e
 * tipo (novo período ligado ao anterior, `reabertaDe`). Da resolução do cliente até a reabertura, os dias contam no prazo.
 * Vale para a PEPT em análise (resolvida) ou para a última encerrada. Devolve null se não houver PEPT ou se o dia for
 * antes da resolução/abertura do período anterior.
 */
export function reabrirPeptNaOS(o: OS, dia: string, novoId: string): { pausadoEm: string; diasPausado: number; pepts: Pept[] } | null {
  const aberta = peptAberta(o)
  let base: Pept | undefined, lista: Pept[], diasPausado = o.diasPausado || 0
  if (aberta) {
    if (dia < (aberta.resolvidaEm ?? aberta.inicio)) return null
    const f = encerrarPeptNaOS(o, dia, 'reaberta')
    base = aberta; lista = f.pepts ?? peptsDaOS(o); diasPausado = f.diasPausado ?? diasPausado
  } else {
    base = ultimaFinalizada(o)
    if (!base || dia < base.fim!) return null
    lista = peptsDaOS(o)
  }
  return { pausadoEm: dia, diasPausado, pepts: [...lista, { id: novoId, tipo: base.tipo, motivo: base.motivo, inicio: dia, reabertaDe: base.id }] }
}

/**
 * Prazo antes e depois da PEPT (a em aberto ou, se não houver, a última encerrada), contando as reaberturas como a
 * mesma PEPT. "Antes" é o prazo que valia quando a PEPT começou; "depois" é o prazo com os dias parados dela: pausada,
 * é o prazo se o cliente resolver hoje (null = indeterminado, A413); resolvida/encerrada, é o que vale no cartão.
 */
export function prazosDaPept(o: OS, hoje = new Date()): { antes: string; depois: string | null; dias: number; aberta: boolean } | null {
  const lista = peptsDaOS(o)
  const atual = peptAberta(o) ?? ultimaFinalizada(o)
  if (!atual) return null
  // a PEPT e as reaberturas dela (ligadas por reabertaDe)
  const daPept = new Set<string>([atual.id])
  for (let p: Pept | undefined = atual; p?.reabertaDe; p = lista.find((x) => x.id === p!.reabertaDe)) daPept.add(p.reabertaDe)
  const fechados = lista.filter((p) => daPept.has(p.id) && fimDaPausa(p)).reduce((t, p) => t + (p.dias || 0), 0)
  const aberta = !!o.pausadoEm
  const emCurso = aberta && pausaValida(o) ? diasDePausa(o.tipologia, o.pausadoEm!, hoje) : 0
  const base = (o.diasPausado || 0) - fechados
  const mais = (d: number) => format(addDays(parseISO(o.prazo), d), 'yyyy-MM-dd')
  return {
    antes: mais(base),
    depois: aberta && PEPT_SEM_PRAZO.includes(o.tipologia) && pausaValida(o) ? null : mais(base + fechados + emCurso),
    dias: fechados + emCurso,
    aberta,
  }
}

/**
 * Os períodos de uma PEPT, do primeiro (abertura) ao atual, seguindo as reaberturas (`reabertaDe`), em ordem.
 * Serve para mostrar que é uma reabertura e o histórico dela (cada período: aberta, resolvida, encerrada, dias parados).
 */
export function periodosDaPept(o: Pick<OS, 'pepts' | 'pausadoEm' | 'historico'>, pept: Pept): Pept[] {
  const lista = peptsDaOS(o)
  const r: Pept[] = [pept]
  for (let p: Pept | undefined = pept, i = 0; p?.reabertaDe && i < 50; i++) {
    p = lista.find((x) => x.id === p!.reabertaDe)
    if (p) r.unshift(p)
  }
  return r
}

/**
 * Etapa da O.S. depois de finalizar a PEPT: volta para "Em Andamento" (pedido de 23/10). Se já estiver numa etapa
 * mais à frente (assinatura…), não volta para trás; concluída e cancelada não mudam.
 */
export function etapaAoFinalizarPept(status: OS['status']): OS['status'] {
  return status === 'recebida' ? 'em_andamento' : status
}
