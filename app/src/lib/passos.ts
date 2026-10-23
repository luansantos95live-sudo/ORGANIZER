import type { OS, PassoKey, Status } from '../types'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { STATUS_META, TIPOLOGIAS_SEM_VISTORIA, prazoEfetivo } from './os'

/**
 * Passo a passo de uma O.S. da Caixa, do jeito que o credenciado trabalha (dito pelo usuário em 20/10/2026).
 * As etapas do sistema real (Recebida, Em Andamento, Assinatura…) continuam; este checklist mostra onde a
 * O.S. está de verdade e alguns passos andam a etapa sozinhos (ver ETAPA_DO_PASSO).
 */
export const PASSOS: { key: PassoKey; label: string; opcional?: boolean; vistoria?: boolean }[] = [
  { key: 'recebida', label: 'O.S. recebida' },
  { key: 'baixar_docs', label: 'Baixar as documentações' },
  { key: 'analisar_docs', label: 'Analisar documentos' },
  { key: 'pept', label: 'Abrir PEPT (se necessário)', opcional: true },
  { key: 'marcar_vistoria', label: 'Marcar vistoria', vistoria: true },
  { key: 'fazer_vistoria', label: 'Fazer vistoria', vistoria: true },
  { key: 'avaliacao', label: 'Fazer avaliação' },
  { key: 'simil', label: 'Preencher SIMIL' },
  { key: 'baixar_laudo', label: 'Baixar o laudo' },
  { key: 'assinar', label: 'Assinar' },
  { key: 'enviar', label: 'Enviar' },
]
export const PASSO_LABEL = Object.fromEntries(PASSOS.map((p) => [p.key, p.label])) as Record<PassoKey, string>

/** Etapa do sistema real que o passo, quando feito, leva a O.S. (só avança, nunca volta). */
export const ETAPA_DO_PASSO: Partial<Record<PassoKey, Status>> = {
  // "Enviar" não tem etapa: concluir todos os passos NUNCA finaliza a O.S. (só o botão Concluir finaliza; pedido do usuário)
  marcar_vistoria: 'em_andamento', fazer_vistoria: 'em_andamento', baixar_laudo: 'assinatura_pendente', assinar: 'assinatura_concluida',
}

/** Passos que valem para a O.S. (tipologias sem vistoria pulam marcar e fazer vistoria). */
export const passosDaOS = (o: Pick<OS, 'tipologia'>) => PASSOS.filter((p) => !p.vistoria || !TIPOLOGIAS_SEM_VISTORIA.includes(o.tipologia))

export type EstadoPasso = 'feito' | 'pulado' | 'pendente'

/**
 * Estado de cada passo. O que foi marcado à mão vale; o resto é deduzido da etapa e das datas
 * (O.S. antigas ou importadas não têm o checklist preenchido).
 */
export function estadoPassos(o: OS, hojeStr: string): Record<PassoKey, { estado: EstadoPasso; em?: string }> {
  const lista = passosDaOS(o)
  const r = {} as Record<PassoKey, { estado: EstadoPasso; em?: string }>
  // Até onde a etapa e as datas garantem que já foi feito.
  const ordem = lista.map((p) => p.key)
  let ate = 'recebida' as PassoKey
  const temVist = lista.some((p) => p.key === 'fazer_vistoria')
  if (o.status === 'concluida') ate = 'enviar'
  else if (o.status === 'assinatura_concluida') ate = 'assinar'
  else if (o.status === 'assinatura_pendente') ate = 'baixar_laudo'
  // A etapa garante; a vistoria só sugere (um passo desfeito à mão vence a sugestão).
  const iEtapa = ordem.indexOf(ate)
  if (iEtapa === 0 && temVist && o.vistoria && (o.vistoria.feita || o.vistoria.data < hojeStr)) ate = 'fazer_vistoria'
  else if (iEtapa === 0 && temVist && o.vistoria) ate = 'marcar_vistoria'
  const iAte = ordem.indexOf(ate)
  for (const [i, p] of lista.entries()) {
    const marcado = o.passos?.[p.key]
    if (marcado === DESFEITO && (i > iEtapa || p.key === 'pept')) r[p.key] = p.key === 'pept' && o.pausadoEm ? { estado: 'feito', em: o.pausadoEm } : { estado: 'pendente' }
    else if (marcado === DESFEITO) r[p.key] = { estado: 'feito' }
    else if (marcado === 'pulado') r[p.key] = { estado: 'pulado' }
    else if (marcado) r[p.key] = { estado: 'feito', em: marcado }
    else if (p.key === 'pept') r[p.key] = o.pausadoEm ? { estado: 'feito', em: o.pausadoEm } : { estado: i < iAte ? 'pulado' : 'pendente' }
    else if (p.key === 'recebida') r[p.key] = { estado: 'feito', em: o.emissao }
    else if (i <= iAte) r[p.key] = { estado: 'feito', em: p.key === 'enviar' ? o.concluidaEm : undefined }
    else r[p.key] = { estado: 'pendente' }
  }
  return r
}

/** Marca de passo desfeito à mão: vale mais que o que a vistoria sugere. */
export const DESFEITO = 'desfeito'

/**
 * Voltar a O.S. para um passo: ele e todos os seguintes ficam pendentes de novo. A etapa do sistema real
 * volta junto (só para trás) e, se voltar antes da vistoria, a vistoria marcada/feita é desfeita.
 */
export function voltarParaPasso(o: OS, passo: PassoKey, hojeStr: string): Partial<OS> {
  const lista = passosDaOS(o)
  const idx = lista.findIndex((p) => p.key === passo)
  if (idx <= 0 || o.status === 'cancelada') return {}
  const est = estadoPassos(o, hojeStr)
  const passos: Partial<Record<PassoKey, string>> = {}
  let alvo: Status = 'recebida'
  for (const [i, p] of lista.entries()) {
    const e = est[p.key]
    if (i >= idx) { passos[p.key] = DESFEITO; continue }
    if (e.estado === 'pulado') passos[p.key] = 'pulado'
    else if (e.estado === 'feito') {
      passos[p.key] = o.passos?.[p.key] && o.passos[p.key] !== DESFEITO ? o.passos[p.key] : e.em ?? 'feito'
      const et = ETAPA_DO_PASSO[p.key] ?? (p.key !== 'recebida' && p.key !== 'pept' ? 'em_andamento' : undefined)
      if (et && STATUS_META[et].ordem > STATUS_META[alvo].ordem) alvo = et
    }
  }
  const patch: Partial<OS> = { passos }
  if (STATUS_META[o.status].ordem > STATUS_META[alvo].ordem) {
    patch.status = alvo
    patch.concluidaEm = undefined
  }
  const iMarcar = lista.findIndex((p) => p.key === 'marcar_vistoria')
  const iFazer = lista.findIndex((p) => p.key === 'fazer_vistoria')
  if (o.vistoria && iMarcar >= 0 && idx <= iMarcar) patch.vistoria = undefined
  else if (o.vistoria && iFazer >= 0 && idx <= iFazer) patch.vistoria = { ...o.vistoria, feita: false }
  return patch
}

/** O próximo passo a fazer (o primeiro pendente, sem contar o PEPT, que é opcional) e o progresso. */
export function proximoPasso(o: OS, hojeStr: string): { key: PassoKey | null; label: string; feitos: number; total: number } {
  const lista = passosDaOS(o)
  const est = estadoPassos(o, hojeStr)
  const obrig = lista.filter((p) => !p.opcional)
  const prox = obrig.find((p) => est[p.key].estado === 'pendente') ?? null
  const feitos = obrig.filter((p) => est[p.key].estado !== 'pendente').length
  return { key: prox?.key ?? null, label: prox ? prox.label : 'Tudo feito', feitos, total: obrig.length }
}

/** Fase da O.S. no jeito do credenciado (a mesma do Início): em aberto, em andamento, em PEPT, finalizada. */
export type Fase = 'aberto' | 'andamento' | 'pept' | 'finalizada' | 'cancelada'
export const FASES: { id: Exclude<Fase, 'cancelada'>; label: string }[] = [
  { id: 'aberto', label: 'Em aberto' }, { id: 'andamento', label: 'Em andamento' }, { id: 'pept', label: 'Em PEPT' }, { id: 'finalizada', label: 'Finalizadas' },
]
export function faseDe(o: Pick<OS, 'status' | 'pausadoEm'> & { pepts?: OS['pepts'] }): Fase {
  if (o.status === 'cancelada') return 'cancelada'
  if (o.status === 'concluida') return 'finalizada'
  // em PEPT: pausada ou já resolvida pelo cliente e em análise (até validar ou reabrir)
  if (o.pausadoEm || o.pepts?.some((p) => !p.fim)) return 'pept'
  return o.status === 'recebida' ? 'aberto' : 'andamento'
}

/**
 * Cor da O.S. pelo prazo, como no sistema real: amarela com 3 dias ou menos para vencer; vermelha com 1 dia ou
 * menos e assim até ser concluída (inclusive vencida); cinza quando pausada (PEPT); verde quando finalizada. Cancelada: sem cor.
 */
export type CorPrazo = 'amarelo' | 'vermelho' | 'cinza' | 'verde' | null
export function corPrazo(o: OS, hoje = new Date()): CorPrazo {
  if (o.status === 'concluida') return 'verde'
  if (o.status === 'cancelada') return null
  if (o.pausadoEm) return 'cinza'
  const d = differenceInCalendarDays(parseISO(prazoEfetivo(o, hoje)), hoje)
  if (d <= 1) return 'vermelho'
  if (d <= 3) return 'amarelo'
  return null
}
