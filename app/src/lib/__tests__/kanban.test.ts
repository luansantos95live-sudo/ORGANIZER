import { describe, expect, it } from 'vitest'
import { KANBAN_PADRAO, acaoAoSoltar, colunaDaOS, completarColunas, tituloColuna } from '../kanban'
import type { KanbanColuna, OS } from '../../types'

const H = '2026-10-20'
const mk = (extra: Partial<OS> = {}) => ({ id: 'x', status: 'recebida', tipologia: 'A413', emissao: '2026-10-15', prazo: '2026-10-30', diasPausado: 0, ...extra }) as OS
const col = (id: string) => KANBAN_PADRAO.find((c) => c.id === id)!
const livre: KanbanColuna = { id: 'livre-1', tipo: 'livre', titulo: 'Aguardando cliente', cor: '#3b82f6' }
const passoVistoria: KanbanColuna = { id: 'passo-1', tipo: 'passo', passo: 'marcar_vistoria', cor: '#14b8a6' }

describe('colunas do Kanban', () => {
  it('cada O.S. vai para a coluna da etapa; pausada vai para PEPT', () => {
    expect(colunaDaOS(mk({ status: 'em_andamento' }), KANBAN_PADRAO, H)).toBe('etapa-em_andamento')
    expect(colunaDaOS(mk({ status: 'em_andamento', pausadoEm: '2026-10-18' }), KANBAN_PADRAO, H)).toBe('etapa-pept')
    expect(colunaDaOS(mk({ status: 'cancelada', pausadoEm: '2026-10-18' }), KANBAN_PADRAO, H)).toBe('etapa-cancelada')
  })
  it('coluna escondida: a O.S. não aparece (Concluídas começa escondida); PEPT escondida volta para a etapa', () => {
    expect(colunaDaOS(mk({ status: 'concluida' }), KANBAN_PADRAO, H)).toBeNull()
    const semPept = KANBAN_PADRAO.map((c) => (c.id === 'etapa-pept' ? { ...c, oculta: true } : c))
    expect(colunaDaOS(mk({ pausadoEm: '2026-10-18' }), semPept, H)).toBe('etapa-recebida')
  })
  it('coluna livre segura o cartão; PEPT tem prioridade; coluna apagada devolve para a etapa', () => {
    const cols = [...KANBAN_PADRAO, livre]
    expect(colunaDaOS(mk({ colunaLivre: 'livre-1' }), cols, H)).toBe('livre-1')
    expect(colunaDaOS(mk({ colunaLivre: 'livre-1', pausadoEm: '2026-10-18' }), cols, H)).toBe('etapa-pept')
    expect(colunaDaOS(mk({ colunaLivre: 'livre-1' }), KANBAN_PADRAO, H)).toBe('etapa-recebida')
  })
  it('coluna por passo junta sozinha as O.S. naquele passo', () => {
    const cols = [...KANBAN_PADRAO, passoVistoria]
    expect(colunaDaOS(mk({ passos: { baixar_docs: '2026-10-16', analisar_docs: '2026-10-17' } }), cols, H)).toBe('passo-1')
    expect(colunaDaOS(mk(), cols, H)).toBe('etapa-recebida') // ainda em "Baixar as documentações"
  })
  it('nome: o renomeado vale; vazio volta ao padrão', () => {
    expect(tituloColuna({ ...col('etapa-recebida'), titulo: 'Novas' })).toBe('Novas')
    expect(tituloColuna({ ...col('etapa-recebida'), titulo: '  ' })).toBe('Recebidas')
    expect(tituloColuna(col('etapa-pept'))).toBe('PEPT')
    expect(tituloColuna(passoVistoria)).toBe('Marcar vistoria')
  })
  it('colunas salvas ganham as etapas que faltarem', () => {
    const r = completarColunas([livre, col('etapa-recebida')])
    expect(r.slice(0, 2).map((c) => c.id)).toEqual(['livre-1', 'etapa-recebida'])
    expect(r.filter((c) => c.tipo === 'etapa')).toHaveLength(7)
    expect(completarColunas(undefined)).toHaveLength(7)
  })
})

describe('soltar o cartão numa coluna', () => {
  it('na PEPT pede a pausa; numa coluna por passo o cartão fica nela (mover livremente)', () => {
    expect(acaoAoSoltar(mk(), col('etapa-pept'), col('etapa-recebida'))).toEqual({ tipo: 'pausar' })
    expect(acaoAoSoltar(mk({ status: 'concluida' }), col('etapa-pept'), undefined)).toEqual({ tipo: 'nada' })
    expect(acaoAoSoltar(mk(), passoVistoria, col('etapa-recebida'))).toEqual({ tipo: 'mover', colunaLivre: 'passo-1', retomar: false })
    expect(colunaDaOS(mk({ colunaLivre: 'passo-1' }), [...KANBAN_PADRAO, passoVistoria], H)).toBe('passo-1')
  })
  it('numa coluna livre só guarda a coluna; tirar da PEPT retoma', () => {
    expect(acaoAoSoltar(mk(), livre, col('etapa-recebida'))).toEqual({ tipo: 'mover', colunaLivre: 'livre-1', retomar: false })
    expect(acaoAoSoltar(mk({ pausadoEm: '2026-10-18' }), livre, col('etapa-pept'))).toEqual({ tipo: 'mover', colunaLivre: 'livre-1', retomar: true })
  })
  it('numa coluna de etapa troca a etapa e sai da coluna livre', () => {
    expect(acaoAoSoltar(mk(), col('etapa-em_andamento'), col('etapa-recebida'))).toEqual({ tipo: 'mover', colunaLivre: null, status: 'em_andamento', retomar: false })
    expect(acaoAoSoltar(mk({ colunaLivre: 'livre-1' }), col('etapa-recebida'), livre)).toEqual({ tipo: 'mover', colunaLivre: null, status: undefined, retomar: false })
  })
})
