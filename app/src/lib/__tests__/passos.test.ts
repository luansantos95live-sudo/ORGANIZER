import { describe, expect, it } from 'vitest'
import { estadoPassos, proximoPasso, voltarParaPasso } from '../passos'
import type { OS } from '../../types'

const H = '2026-10-20'
const mk = (extra: Partial<OS> = {}) => ({ id: 'x', status: 'recebida', tipologia: 'A413', emissao: '2026-10-15', prazo: '2026-10-30', diasPausado: 0, ...extra }) as OS

describe('passo a passo da O.S.', () => {
  it('recém-recebida: próximo é baixar as documentações', () => {
    expect(proximoPasso(mk(), H)).toMatchObject({ key: 'baixar_docs', feitos: 1, total: 10 })
  })
  it('marcado à mão vale', () => {
    expect(proximoPasso(mk({ passos: { baixar_docs: '2026-10-16', analisar_docs: '2026-10-17' } }), H).key).toBe('marcar_vistoria')
  })
  it('deduz pela etapa e pela vistoria', () => {
    expect(proximoPasso(mk({ status: 'em_andamento', vistoria: { data: '2026-10-22', hora: '09:00', duracao: 40 } }), H).key).toBe('fazer_vistoria')
    expect(proximoPasso(mk({ status: 'em_andamento', vistoria: { data: '2026-10-18', hora: '09:00', duracao: 40 } }), H).key).toBe('avaliacao')
    expect(proximoPasso(mk({ status: 'assinatura_pendente' }), H).key).toBe('assinar')
    expect(proximoPasso(mk({ status: 'concluida', concluidaEm: '2026-10-19' }), H)).toMatchObject({ key: null, feitos: 10 })
  })
  it('PEPT é opcional: feito quando pausada, pulado quando já passou', () => {
    expect(estadoPassos(mk({ pausadoEm: '2026-10-18' }), H).pept).toMatchObject({ estado: 'feito', em: '2026-10-18' })
    expect(estadoPassos(mk({ status: 'assinatura_pendente' }), H).pept.estado).toBe('pulado')
  })
  it('tipologia sem vistoria pula marcar e fazer vistoria', () => {
    expect(proximoPasso(mk({ tipologia: 'G402', passos: { baixar_docs: 'a', analisar_docs: 'b' } }), H)).toMatchObject({ key: 'avaliacao', total: 8 })
  })
})

describe('voltar para um passo', () => {
  const aplica = (o: OS, p: Parameters<typeof voltarParaPasso>[1]) => ({ ...o, ...voltarParaPasso(o, p, H) }) as OS
  it('volta a etapa junto e deixa os seguintes pendentes', () => {
    const o = aplica(mk({ status: 'assinatura_pendente', vistoria: { data: '2026-10-18', hora: '09:00', duracao: 40, feita: true } }), 'baixar_laudo')
    expect(o.status).toBe('em_andamento')
    expect(proximoPasso(o, H).key).toBe('baixar_laudo')
    expect(estadoPassos(o, H).simil.estado).toBe('feito')
  })
  it('voltar antes da vistoria desfaz a vistoria; concluída perde a data de conclusão', () => {
    const o = aplica(mk({ status: 'concluida', concluidaEm: '2026-10-19', vistoria: { data: '2026-10-18', hora: '09:00', duracao: 40, feita: true } }), 'fazer_vistoria')
    expect(o).toMatchObject({ status: 'em_andamento', concluidaEm: undefined, vistoria: { feita: false } })
    expect(proximoPasso(o, H).key).toBe('fazer_vistoria')
    expect(aplica(o, 'marcar_vistoria').vistoria).toBeUndefined()
  })
  it('voltar tudo leva a O.S. para Recebida', () => {
    const o = aplica(mk({ status: 'em_andamento', passos: { baixar_docs: '2026-10-16' } }), 'baixar_docs')
    expect(o.status).toBe('recebida')
    expect(proximoPasso(o, H).key).toBe('baixar_docs')
  })
})

describe('passos nunca finalizam a O.S.', () => {
  it('nenhum passo leva a etapa para Concluída (só o botão Concluir finaliza)', async () => {
    const { ETAPA_DO_PASSO } = await import('../passos')
    expect(Object.values(ETAPA_DO_PASSO)).not.toContain('concluida')
  })
})

describe('fase da O.S.', () => {
  it('aberto, andamento, PEPT e finalizada', async () => {
    const { faseDe } = await import('../passos')
    expect(faseDe(mk())).toBe('aberto')
    expect(faseDe(mk({ status: 'assinatura_pendente' }))).toBe('andamento')
    expect(faseDe(mk({ status: 'em_andamento', pausadoEm: '2026-10-18' }))).toBe('pept')
    expect(faseDe(mk({ status: 'concluida' }))).toBe('finalizada')
    expect(faseDe(mk({ status: 'cancelada' }))).toBe('cancelada')
  })
})

describe('cor da O.S. pelo prazo', () => {
  it('amarela até 3 dias, vermelha com 1 dia ou vencida, cinza em PEPT', async () => {
    const { corPrazo } = await import('../passos')
    const d = new Date(2026, 9, 20, 10)
    expect(corPrazo(mk({ prazo: '2026-10-30' }), d)).toBeNull()
    expect(corPrazo(mk({ prazo: '2026-10-23' }), d)).toBe('amarelo')
    expect(corPrazo(mk({ prazo: '2026-10-22' }), d)).toBe('amarelo')
    expect(corPrazo(mk({ prazo: '2026-10-21' }), d)).toBe('vermelho')
    expect(corPrazo(mk({ prazo: '2026-10-15' }), d)).toBe('vermelho')
    expect(corPrazo(mk({ prazo: '2026-10-15', pausadoEm: '2026-10-14' }), d)).toBe('cinza')
    expect(corPrazo(mk({ prazo: '2026-10-15', status: 'concluida' }), d)).toBe('verde')
    expect(corPrazo(mk({ status: 'cancelada' }), d)).toBeNull()
  })
})
