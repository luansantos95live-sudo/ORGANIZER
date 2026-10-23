import { describe, expect, it } from 'vitest'
import { dataReferencia, entraNoFaturamento, intervalo, noIntervalo, noPeriodoComPendencias, painelEquipe, painelGeral, painelMinhas, paradaSemNota, projecaoPorRitmo, repasseDaOS, repasseDe, resumir, situacaoDe, textoPronto, ticksBonitos, valorTotal } from '../faturamento'
import type { OS, Status } from '../../types'

const mk = (status: Status, servico: number, desloc: number, extra: Partial<OS> = {}) =>
  ({ id: Math.random().toString(36), status, valorServico: servico, valorDeslocamento: desloc, prazo: '2026-10-20', diasPausado: 0, faturada: false, concluidaEm: undefined, ...extra }) as OS

const HOJE = new Date(2026, 9, 8, 12)

describe('regras de entrada', () => {
  it('só a cancelada fica fora do faturamento', () => {
    expect(entraNoFaturamento(mk('cancelada', 1, 0))).toBe(false)
    expect(entraNoFaturamento(mk('recebida', 1, 0))).toBe(true)
    expect(entraNoFaturamento(mk('concluida', 1, 0))).toBe(true)
  })
  it('o total soma serviço e deslocamento', () => {
    expect(valorTotal(mk('recebida', 300, 45))).toBe(345)
  })
})

describe('situação e data de referência', () => {
  it('concluída usa a conclusão; aberta usa o prazo efetivo', () => {
    expect(dataReferencia(mk('concluida', 1, 0, { concluidaEm: '2026-10-03' }), HOJE)).toBe('2026-10-03')
    expect(dataReferencia(mk('em_andamento', 1, 0), HOJE)).toBe('2026-10-20')
    expect(dataReferencia(mk('em_andamento', 1, 0, { diasPausado: 4 }), HOJE)).toBe('2026-10-24')
  })
  it('a faturar é concluída sem nota; faturada é a marcada; aberta vence pelo prazo efetivo', () => {
    expect(situacaoDe(mk('concluida', 1, 0), HOJE)).toBe('a_faturar')
    expect(situacaoDe(mk('concluida', 1, 0, { faturada: true }), HOJE)).toBe('faturada')
    expect(situacaoDe(mk('em_andamento', 1, 0, { prazo: '2026-10-20' }), HOJE)).toBe('em_aberto')
    expect(situacaoDe(mk('recebida', 1, 0, { prazo: '2026-10-07' }), HOJE)).toBe('vencida')
    expect(situacaoDe(mk('recebida', 1, 0, { prazo: '2026-10-08' }), HOJE)).toBe('em_aberto')
    // pausa em curso empurra o prazo: venceria dia 7, mas está pausada desde o dia 5
    expect(situacaoDe(mk('recebida', 1, 0, { prazo: '2026-10-07', pausadoEm: '2026-10-05' }), HOJE)).toBe('em_aberto')
  })
  it('parada há mais de 5 dias sem nota', () => {
    expect(paradaSemNota(mk('concluida', 1, 0, { concluidaEm: '2026-10-01' }), HOJE)).toBe(true)
    expect(paradaSemNota(mk('concluida', 1, 0, { concluidaEm: '2026-10-04' }), HOJE)).toBe(false)
    expect(paradaSemNota(mk('concluida', 1, 0, { concluidaEm: '2026-10-01', faturada: true }), HOJE)).toBe(false)
  })
  it('períodos semana, mês, ano e todos', () => {
    const { ini, fim } = intervalo('mes', HOJE)
    expect(noIntervalo(mk('recebida', 1, 0, { prazo: '2026-10-31' }), ini, fim, HOJE)).toBe(true)
    expect(noIntervalo(mk('recebida', 1, 0, { prazo: '2026-11-01' }), ini, fim, HOJE)).toBe(false)
    const s = intervalo('semana', HOJE) // segunda 05/10 a domingo 11/10
    expect(s.ini.getDate()).toBe(5)
    expect(s.fim.getDate()).toBe(11)
    const t = intervalo('todos', HOJE)
    expect(noIntervalo(mk('recebida', 1, 0, { prazo: '2020-01-01' }), t.ini, t.fim, HOJE)).toBe(true)
    const e = intervalo('especifico', HOJE, { ini: '2026-10-01', fim: '2026-10-10' })
    expect(noIntervalo(mk('concluida', 1, 0, { concluidaEm: '2026-10-10' }), e.ini, e.fim, HOJE)).toBe(true)
  })
  it('"incluir pendências anteriores" traz só as abertas de antes do período', () => {
    const { ini, fim } = intervalo('mes', HOJE)
    expect(noPeriodoComPendencias(mk('recebida', 1, 0, { prazo: '2026-09-20' }), ini, fim, true, HOJE)).toBe(true)
    expect(noPeriodoComPendencias(mk('recebida', 1, 0, { prazo: '2026-09-20' }), ini, fim, false, HOJE)).toBe(false)
    expect(noPeriodoComPendencias(mk('concluida', 1, 0, { concluidaEm: '2026-09-20' }), ini, fim, true, HOJE)).toBe(false)
  })
})

describe('resumir', () => {
  const lista = [
    mk('concluida', 400, 100, { concluidaEm: '2026-10-02' }),
    mk('concluida', 300, 0, { concluidaEm: '2026-10-01', faturada: true }),
    mk('em_andamento', 200, 50, { prazo: '2026-10-20' }),
    mk('recebida', 150, 0, { prazo: '2026-10-05' }),
  ]
  const r = resumir(lista, HOJE)
  it('soma previsto, finalizado e em aberto', () => {
    expect(r.previsto).toBe(1200)
    expect(r.finalizado).toBe(800)
    expect(r.emAberto).toBe(400)
    expect(r.deslocamento).toBe(150)
    expect(r.qtd).toBe(4)
    expect(r.qtdFinalizadas).toBe(2)
    expect(r.qtdEmAberto).toBe(2)
  })
  it('separa a faturar (sem nota) e faturado', () => {
    expect(r.aFaturarNF).toBe(500)
    expect(r.qtdAFaturarNF).toBe(1)
    expect(r.faturado).toBe(300)
    expect(r.qtdFaturadas).toBe(1)
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
    expect(resumir([], HOJE)).toMatchObject({ qtd: 0, previsto: 0, conversao: 0, ticketMedio: 0 })
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
    mk('concluida', 400, 100, { concluidaEm: '2026-10-02' }),
    mk('em_andamento', 200, 50, { prazo: '2026-10-20' }),
    mk('recebida', 150, 30, { prazo: '2026-10-05' }),
  ]
  const r = resumir(lista, HOJE)
  it('base total aplica a fração sobre serviço mais deslocamento', () => {
    const x = repasseDe(r, 0.4, 'total')
    expect(x.previsto).toBeCloseTo(930 * 0.4)
    expect(x.finalizado).toBeCloseTo(500 * 0.4)
    expect(x.emAberto).toBeCloseTo(430 * 0.4)
    expect(x.vencido).toBeCloseTo(180 * 0.4)
    expect(x.projecao).toBeCloseTo(750 * 0.4)
  })
  it('base serviço ignora o deslocamento', () => {
    const x = repasseDe(r, 0.4, 'servico')
    expect(x.previsto).toBeCloseTo(750 * 0.4)
    expect(x.finalizado).toBeCloseTo(400 * 0.4)
    expect(x.emAberto).toBeCloseTo(350 * 0.4)
  })
  it('repasse por O.S. segue a base', () => {
    const o = mk('concluida', 300, 100)
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

describe('texto pronto da nota', () => {
  it('segue o modelo do RRT com o valor da O.S. + deslocamento', () => {
    const o = mk('concluida', 450, 19.15, { referencia: '7886.1831.001123732/2026.01.01' })
    expect(textoPronto(o, '20999/2024 - NACIONAL')).toBe('PRESTAÇÃO DE SERVIÇO DE ENGENHARIA A CAIXA CONFORME O CONTRATO N.º 20999/2024 - NACIONAL / ORDEM DE SERVIÇO N° 7886.1831.001123732/2026.01.01 - VALOR OS + DESLOCAMENTO: R$ 469,15')
    expect(textoPronto(o, '')).toContain('CONTRATO N.º ________')
  })
})

// Casos montados com os valores das telas de referência do Financeiro (outubro de 2026).
describe('visão Minha equipe', () => {
  const rt = resumir([
    mk('concluida', 6000, 935.5, { concluidaEm: '2026-10-07' }),
    mk('em_andamento', 3200, 314.5, { prazo: '2026-10-20' }),
  ], HOJE)
  const p = painelEquipe(rt, 0.4, 'total')
  it('RT previsto, finalizado e saldo em aberto', () => {
    expect(p.previsto).toBeCloseTo(10450)
    expect(p.finalizado).toBeCloseTo(6935.5)
    expect(p.emAberto).toBeCloseTo(3514.5)
  })
  it('repasse de 40% previsto, finalizado e restante', () => {
    expect(p.repassePrevisto).toBeCloseTo(4180)
    expect(p.repasseFinalizado).toBeCloseTo(2774.2)
    expect(p.repasseRestante).toBeCloseTo(1405.8)
  })
  it('conversão do RT e média por O.S.', () => {
    expect(p.conversao * 100).toBeCloseTo(66.37, 1)
    expect(p.media).toBeCloseTo(5225)
    expect(valorTotal(p.maior!)).toBeCloseTo(6935.5)
  })
})

describe('visão Só minhas', () => {
  const me = resumir([
    mk('concluida', 1000, 248.15, { concluidaEm: '2026-10-03' }),
    mk('em_andamento', 900, 100, { prazo: '2026-10-20' }),
    mk('recebida', 500, 0, { prazo: '2026-10-05' }), // vencida
  ], HOJE)
  const rt = resumir([
    mk('concluida', 6000, 935.5, { concluidaEm: '2026-10-07' }),
    mk('em_andamento', 3200, 314.5, { prazo: '2026-10-20' }),
  ], HOJE)
  const p = painelMinhas(me, rt, 0.4, 'total')
  it('consolidado é meu finalizado mais 40% do RT finalizado', () => {
    expect(p.meuFinalizado).toBeCloseTo(1248.15)
    expect(p.partFinalizada).toBeCloseTo(2774.2)
    expect(p.consolidado).toBeCloseTo(4022.35)
  })
  it('saldo é o previsto total (meu + 40% do RT) menos o consolidado', () => {
    expect(p.meuPrevisto).toBeCloseTo(2748.15)
    expect(p.partPrevista).toBeCloseTo(4180)
    expect(p.previstoTotal).toBeCloseTo(6928.15)
    expect(p.saldo).toBeCloseTo(2905.8)
    expect(p.conversao).toBeCloseTo(4022.35 / 6928.15)
  })
  it('peso do RT, ticket das finalizadas e projeção sem vencidas', () => {
    expect(p.pesoRT).toBeCloseTo(2774.2 / 4022.35)
    expect(p.qtdConcluidas).toBe(1)
    expect(p.qtdEmAberto).toBe(2)
    expect(p.qtdVencidas).toBe(1)
    expect(p.ticketFinalizadas).toBeCloseTo(1248.15)
    expect(p.projecao).toBeCloseTo(6928.15 - 500)
  })
  it('sem O.S. não divide por zero', () => {
    const v = painelMinhas(resumir([], HOJE), resumir([], HOJE), 0.4, 'total')
    expect(v).toMatchObject({ consolidado: 0, conversao: 0, pesoRT: 0, ticketFinalizadas: 0 })
  })
})

describe('visão Geral', () => {
  const lista = [
    mk('concluida', 1230, 100, { concluidaEm: '2026-10-07' }),
    mk('concluida', 950, 50, { concluidaEm: '2026-10-08' }),
    mk('em_andamento', 1500, 75, { prazo: '2026-10-20' }),
    mk('concluida', 700, 80, { concluidaEm: '2026-10-06', faturada: true }),
    mk('assinatura_pendente', 850, 60, { prazo: '2026-10-25' }),
    mk('concluida', 500, 45, { concluidaEm: '2026-10-05' }),
  ]
  const p = painelGeral(resumir(lista, HOJE))
  it('conversão conta O.S. finalizadas sobre o total (4 de 6)', () => {
    expect(p.qtd).toBe(6)
    expect(p.qtdFinalizadas).toBe(4)
    expect(p.qtdPendentes).toBe(2)
    expect(p.conversaoQtd * 100).toBeCloseTo(66.67, 1)
  })
  it('deslocamento, maior e menor O.S.', () => {
    expect(p.deslocamento).toBe(410)
    expect(valorTotal(p.maior!)).toBe(1575)
    expect(valorTotal(p.menor!)).toBe(545)
    expect(p.previsto).toBe(6140)
    expect(p.ticketMedio).toBeCloseTo(6140 / 6)
  })
})
