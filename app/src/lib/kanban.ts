import type { KanbanColuna, OS, Status } from '../types'
import { STATUS_META } from './os'
import { PASSO_LABEL, faseDe, proximoPasso } from './passos'

/**
 * Colunas do Kanban de O.S., editáveis em "Colunas" (22/10/2026): as de etapa (as do sistema real, mais PEPT),
 * colunas livres (o usuário cria e arrasta os cartões para elas, sem mudar a etapa) e colunas por passo
 * (juntam sozinhas as O.S. que estão naquele passo do serviço).
 */

/** Cor do pontinho de cada coluna de etapa. */
export const COR_ETAPA: Record<Status | 'pept', string> = {
  recebida: '#3b82f6', em_andamento: '#f59e0b', pept: '#9ca3af', assinatura_pendente: '#8b5cf6',
  assinatura_concluida: '#a855f7', concluida: '#22c55e', cancelada: '#ef4444',
}
/** Cores para escolher numa coluna nova. */
export const CORES_COLUNA = ['#3b82f6', '#14b8a6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#64748b']

/** Padrão: as etapas na ordem do sistema real, com PEPT depois de Em Andamento; Concluídas começa escondida. */
export const KANBAN_PADRAO: KanbanColuna[] = [
  { id: 'etapa-recebida', tipo: 'etapa', etapa: 'recebida' },
  { id: 'etapa-em_andamento', tipo: 'etapa', etapa: 'em_andamento' },
  { id: 'etapa-pept', tipo: 'etapa', etapa: 'pept' },
  { id: 'etapa-assinatura_pendente', tipo: 'etapa', etapa: 'assinatura_pendente' },
  { id: 'etapa-assinatura_concluida', tipo: 'etapa', etapa: 'assinatura_concluida' },
  { id: 'etapa-concluida', tipo: 'etapa', etapa: 'concluida', oculta: true },
  { id: 'etapa-cancelada', tipo: 'etapa', etapa: 'cancelada' },
]

/** Nome que a coluna teria sem renomear. */
export function tituloPadrao(c: KanbanColuna): string {
  if (c.tipo === 'etapa') return c.etapa === 'pept' ? 'PEPT' : STATUS_META[c.etapa].coluna
  if (c.tipo === 'passo') return PASSO_LABEL[c.passo]
  return 'Nova coluna'
}
export const tituloColuna = (c: KanbanColuna) => c.titulo?.trim() || tituloPadrao(c)
export const corColuna = (c: KanbanColuna) => (c.tipo === 'etapa' ? COR_ETAPA[c.etapa] : c.cor)

/** Colunas salvas + as de etapa que faltarem (no fim, escondidas não); sem nada salvo, o padrão. */
export function completarColunas(salvas: KanbanColuna[] | undefined): KanbanColuna[] {
  if (!salvas?.length) return KANBAN_PADRAO.map((c) => ({ ...c }))
  const tem = new Set(salvas.flatMap((c) => (c.tipo === 'etapa' ? [c.etapa] : [])))
  return [...salvas, ...KANBAN_PADRAO.filter((c) => c.tipo === 'etapa' && !tem.has(c.etapa)).map((c) => ({ ...c }))]
}

/**
 * Em que coluna (visível) o cartão aparece. Prioridade: PEPT (a O.S. pausada vai para lá) → coluna livre onde o
 * usuário pôs → coluna do passo em que a O.S. está → coluna da etapa. Sem coluna visível para ela: null (não aparece).
 */
export function colunaDaOS(o: OS, colunas: KanbanColuna[], hojeStr: string): string | null {
  const vis = colunas.filter((c) => !c.oculta)
  const daEtapa = (e: Status | 'pept') => vis.find((c) => c.tipo === 'etapa' && c.etapa === e)?.id
  const fase = faseDe(o)
  if (fase === 'pept') { const p = daEtapa('pept'); if (p) return p }
  // o cartão que o usuário pôs numa coluna livre ou por passo fica nela
  if (o.colunaLivre) { const l = vis.find((c) => c.tipo !== 'etapa' && c.id === o.colunaLivre); if (l) return l.id }
  if (fase === 'aberto' || fase === 'andamento') {
    const px = proximoPasso(o, hojeStr).key
    const p = px && vis.find((c) => c.tipo === 'passo' && c.passo === px)
    if (p) return p.id
  }
  return daEtapa(o.status) ?? null
}

/** O que fazer quando o cartão é solto numa coluna (a tela só executa). */
export type AcaoSoltar =
  | { tipo: 'nada'; motivo?: string }
  | { tipo: 'pausar' } // abre a janela de Pausar (PEPT)
  | { tipo: 'mover'; colunaLivre: string | null; status?: Status; retomar: boolean }

export function acaoAoSoltar(o: OS, destino: KanbanColuna, origem: KanbanColuna | undefined): AcaoSoltar {
  if (origem?.id === destino.id) return { tipo: 'nada' }
  const fechada = o.status === 'concluida' || o.status === 'cancelada'
  if (destino.tipo === 'etapa' && destino.etapa === 'pept') return fechada || faseDe(o) === 'pept' ? { tipo: 'nada' } : { tipo: 'pausar' }
  // tirar da coluna PEPT = PEPT resolvida hoje
  const retomar = origem?.tipo === 'etapa' && origem.etapa === 'pept' && faseDe(o) === 'pept'
  // coluna livre ou por passo: o cartão fica nela (a etapa não muda); o usuário move as O.S. livremente
  if (destino.tipo !== 'etapa') return { tipo: 'mover', colunaLivre: destino.id, retomar }
  const etapa = destino.etapa as Status
  return { tipo: 'mover', colunaLivre: null, status: etapa === o.status ? undefined : etapa, retomar }
}
