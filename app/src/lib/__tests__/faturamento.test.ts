import { describe, expect, it } from 'vitest'
import { dataReferencia, entraNoFaturamento, intervalo, noIntervalo, projecaoPorRitmo, repasseDaOS, repasseDe, resumir, situacaoDe, ticksBonitos, valorTotal } from '../faturamento'
import type { OS, Status } from '../../types'

const mk = (status: Status, servico: number, desloc: number, extra: Partial<OS> = {}) =>
  ({ id: Math.random().toString(36), status, valorServico: servico, valorDeslocamento: desloc, prazo: '2026-10-20', concluidaEm: undefined, ...extra }) as OS

const HOJE = new Date(2026, 9, 8, 12)

describe('regras de entrada', () => {
  it('convocada e cancelada não entram no faturamento', () => {
    expect(entraNoFaturamento(mk('convocada', 1, 0))).toBe(false)
    expect(entraNoFaturamento(mk('cancelada', 1, 0))).toBe(false)
    expect(entraNoFaturamento(mk('emitida', 1, 0))).toBe(true)
    expect(entraNoFaturamento(mk('conferida', 1, 0))).toBe(true)
  })
  it('o total soma serviço e deslocamento', () => {
    expect(valorTotal(mk('emitida', 300, 45))).toBe(345)
  })
})

describe('situação e data de referência', () => {
  it('finalizada usa a conclusão; aberta usa o prazo', () => {
    const f = mk('finalizada', 1, 0, { concluidaEm: '2026-10-03' })
    expect(dataReferencia(f)).toBe('2026-10-03')
    expect(dataReferencia(mk('agendada', 1, 0))).toBe('2026-10-20')
  })
  it('classifica finalizada, a faturar e vencida', () => {
    expect(situacaoDe(mk('conferida', 1, 0), HOJE)).toBe('finalizada')
    expect(situacaoDe(mk('agendada', 1, 0, { prazo: '2026-10-20' }), HOJE)).toBe('a_faturar')
    expect(situacaoDe(mk('agendada', 1, 0, { prazo: '2026-10-07' }), HOJE)).toBe('vencida')
    expect(situacaoDe(mk('agendada', 1, 0, { prazo: '2026-10-08' }), HOJE)).toBe('a_faturar')
  })
  it('períodos mês, trimestre e ano', () => {
    const { ini, fim } = intervalo('mes', HOJE)
    expect(noIntervalo(mk('emitida', 1, 0, { prazo: '2026-10-31' }), ini, fim)).toBe(true)
    expect(noIntervalo(mk('emitida', 1, 0, { prazo: '2026-11-01' }), ini, fim)).toBe(false)
    const t = intervalo('trimestre', HOJE)
    expect(noIntervalo(mk('emitida', 1, 0, { prazo: '2026-12-31' }), t.ini, t.fim)).toBe(true)
  })
})

describe('resumir', () => {
  const lista = [
    mk('finalizada', 400, 100, { concluidaEm: '2026-10-02' }),
    mk('conferida', 300, 0, { concluidaEm: '2026-10-01' }),
    mk('agendada', 200, 50, { prazo: '2026-10-20' }),
    mk('emitida', 150, 0, { prazo: '2026-10-05' }),
  ]
  const r = resumir(lista, HOJE)
  it('soma previsto, finalizado e a faturar', () => {
    expect(r.previsto).toBe(1200)
    expect(r.finalizado).toBe(800)
    expect(r.aFaturar).toBe(400)
    expect(r.deslocamento).toBe(150)
    expect(r.qtd).toBe(4)
    expect(r.qtdFinalizadas).toBe(2)
    expect(r.qtdAFaturar).toBe(2)
  })
  it('separa o vencido e tira da projeção', () => {
    expect(r.qtdVencidas).toBe(1)
    expect(r.vencido).toBe(150)
    expect(r.projecao).toBe(1050)
  })
  it('calcula conversão, ticket e extremos', () => {
    expect(r.conversao).toBeCloseTo(800 / 1200)
    expect(r.ticketMedio).toBe(300)
    expect(valorTotal(r.maior!)).toBe(500)
    expect(valorTotal(r.menor!)).toBe(150)
  })
  it('lista vazia não quebra', () => {
    const v = resumir([], HOJE)
    expect(v).toMatchObject({ qtd: 0, previsto: 0, conversao: 0, ticketMedio: 0 })
  })
})

describe('ticksBonitos', () => {
  it('escolhe um topo redondo acima do máximo', () => {
    const { topo, ticks } = ticksBonitos(9411)
    expect(topo).toBeGreaterThanOrEqual(9411)
    expect(ticks[0]).toBe(0)
    expect(ticks[ticks.length - 1]).toBe(topo)
  })
  it('máximo zero devolve escala padrão', () => {
    expect(ticksBonitos(0).topo).toBe(1000)
  })
})

describe('repasse do RT', () => {
  const lista = [
    mk('finalizada', 400, 100, { concluidaEm: '2026-10-02' }),
    mk('agendada', 200, 50, { prazo: '2026-10-20' }),
    mk('emitida', 150, 30, { prazo: '2026-10-05' }),
  ]
  const r = resumir(lista, HOJE)
  it('base total aplica a fração sobre serviço mais deslocamento', () => {
    const x = repasseDe(r, 0.4, 'total')
    expect(x.previsto).toBeCloseTo(930 * 0.4)
    expect(x.finalizado).toBeCloseTo(500 * 0.4)
    expect(x.aFaturar).toBeCloseTo(430 * 0.4)
    expect(x.vencido).toBeCloseTo(180 * 0.4)
    expect(x.projecao).toBeCloseTo(750 * 0.4)
  })
  it('base serviço ignora o deslocamento', () => {
    const x = repasseDe(r, 0.4, 'servico')
    expect(x.previsto).toBeCloseTo(750 * 0.4)
    expect(x.finalizado).toBeCloseTo(400 * 0.4)
    expect(x.aFaturar).toBeCloseTo(350 * 0.4)
  })
  it('repasse por O.S. segue a base', () => {
    const o = mk('finalizada', 300, 100)
    expect(repasseDaOS(o, 0.4, 'total')).toBeCloseTo(160)
    expect(repasseDaOS(o, 0.4, 'servico')).toBeCloseTo(120)
  })
  it('fração zero zera tudo', () => {
    expect(repasseDe(r, 0, 'total').previsto).toBe(0)
  })
})

describe('projeção por ritmo', () => {
  it('extrapola os dias corridos para o mês inteiro', () => {
    const x = projecaoPorRitmo(1000, new Date(2026, 9, 10)) // 10 de outubro, 31 dias
    expect(x.diasNoMes).toBe(31)
    expect(x.diaAtual).toBe(10)
    expect(x.projecao).toBeCloseTo(3100)
  })
  it('no último dia a projeção é o próprio consolidado', () => {
    expect(projecaoPorRitmo(5000, new Date(2026, 8, 30)).projecao).toBeCloseTo(5000)
  })
})
