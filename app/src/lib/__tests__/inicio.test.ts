import { describe, expect, it } from 'vitest'
import { alertas, emPept, porTipologia, abertasPorCidade, agendaDaSemana, carteiraPorEtapa, concluidasPorSemana, diasParada, faixaDePrazo, grupoDe, paradas, porUrgencia, producaoDoMes, proximaAcao, proximoHorario } from '../inicio'
import type { OS } from '../../types'

const HOJE = new Date(2026, 9, 13, 10)
const mk = (extra: Partial<OS> = {}) => ({ id: 'x', numero: 1, status: 'recebida', tipologia: 'A413', prazo: '2026-10-20', diasPausado: 0, ...extra }) as OS
const vist = (data: string, hora = '09:00', feita?: boolean) => ({ data, hora, duracao: 40, feita })

describe('próximo passo da O.S.', () => {
  it('em aberto: agendar e fazer a vistoria', () => {
    expect(proximaAcao(mk(), HOJE)).toBe('agendar')
    expect(proximaAcao(mk({ status: 'em_andamento', vistoria: vist('2026-10-15') }), HOJE)).toBe('vistoriar')
    expect(proximaAcao(mk({ status: 'em_andamento', vistoria: vist('2026-10-13') }), HOJE)).toBe('vistoriar')
    expect(grupoDe(mk(), HOJE)).toBe('aberto')
  })
  it('a finalizar: laudo, assinatura, envio e devolução', () => {
    expect(proximaAcao(mk({ status: 'em_andamento', vistoria: vist('2026-10-10') }), HOJE)).toBe('laudo')
    expect(proximaAcao(mk({ status: 'em_andamento', vistoria: vist('2026-10-13', '08:00', true) }), HOJE)).toBe('laudo')
    expect(proximaAcao(mk({ tipologia: 'G402' }), HOJE)).toBe('laudo')
    expect(proximaAcao(mk({ status: 'assinatura_pendente' }), HOJE)).toBe('assinar')
    expect(proximaAcao(mk({ status: 'assinatura_concluida' }), HOJE)).toBe('enviar')
    expect(grupoDe(mk({ status: 'assinatura_pendente' }), HOJE)).toBe('finalizar')
  })
  it('concluída e cancelada não têm próximo passo', () => {
    expect(proximaAcao(mk({ status: 'concluida' }), HOJE)).toBeNull()
    expect(proximaAcao(mk({ status: 'cancelada' }), HOJE)).toBeNull()
  })
})

describe('urgência e faixas de prazo', () => {
  it('vencidas primeiro, depois as que vencem logo; pausadas no fim', () => {
    const a = mk({ id: 'a', prazo: '2026-10-25' })
    const b = mk({ id: 'b', prazo: '2026-10-10' })
    const c = mk({ id: 'c', prazo: '2026-10-14' })
    const d = mk({ id: 'd', prazo: '2026-10-11', pausadoEm: '2026-10-09' })
    expect(porUrgencia([a, b, c, d], HOJE).map((o) => o.id)).toEqual(['b', 'c', 'a', 'd'])
  })
  it('separa por quando vence', () => {
    expect(faixaDePrazo(mk({ prazo: '2026-10-12' }), HOJE)).toBe('vencidas')
    expect(faixaDePrazo(mk({ prazo: '2026-10-13' }), HOJE)).toBe('hoje')
    expect(faixaDePrazo(mk({ prazo: '2026-10-14' }), HOJE)).toBe('amanha')
    expect(faixaDePrazo(mk({ prazo: '2026-10-20' }), HOJE)).toBe('semana')
    expect(faixaDePrazo(mk({ prazo: '2026-10-28' }), HOJE)).toBe('quinzena')
    expect(faixaDePrazo(mk({ prazo: '2026-11-10' }), HOJE)).toBe('depois')
    expect(faixaDePrazo(mk({ pausadoEm: '2026-10-10' }), HOJE)).toBe('pausadas')
  })
})

describe('semana de trabalho', () => {
  it('junta vistorias (por hora) e vencimentos de cada dia', () => {
    const lista = [
      mk({ id: 'v2', status: 'em_andamento', vistoria: vist('2026-10-14', '14:00') }),
      mk({ id: 'v1', status: 'em_andamento', vistoria: vist('2026-10-14', '08:00') }),
      mk({ id: 'p', prazo: '2026-10-14' }),
    ]
    const [dia] = agendaDaSemana(lista, [new Date(2026, 9, 14)], HOJE)
    expect(dia.vistorias.map((o) => o.id)).toEqual(['v1', 'v2'])
    expect(dia.vencem.map((o) => o.id)).toEqual(['p'])
  })
  it('sugere o próximo horário livre do dia', () => {
    expect(proximoHorario([], 40)).toBe('08:00')
    expect(proximoHorario([mk({ vistoria: vist('2026-10-14', '08:00') })], 40)).toBe('09:00')
    expect(proximoHorario([mk({ vistoria: vist('2026-10-14', '17:30') })], 40)).toBe('18:00')
  })
})

describe('gestão da carteira', () => {
  const ev = (data: string) => ({ data: `${data}T10:00:00.000Z`, texto: 'x' })
  it('dias sem movimento e lista de paradas', () => {
    const a = mk({ id: 'a', emissao: '2026-10-01', historico: [ev('2026-10-02'), ev('2026-10-05')] })
    const b = mk({ id: 'b', emissao: '2026-10-11', historico: [] })
    const c = mk({ id: 'c', emissao: '2026-09-20', historico: [ev('2026-09-21')], pausadoEm: '2026-10-01' })
    expect(diasParada(a, HOJE)).toBe(8)
    expect(diasParada(b, HOJE)).toBe(2)
    expect(paradas([a, b, c], HOJE).map((p) => [p.os.id, p.dias])).toEqual([['a', 8]])
  })
  it('carteira por etapa com idade média e paradas', () => {
    const lista = [
      mk({ emissao: '2026-10-03', historico: [ev('2026-10-03')] }),
      mk({ emissao: '2026-10-11', historico: [ev('2026-10-12')] }),
      mk({ status: 'assinatura_pendente', emissao: '2026-10-01', historico: [ev('2026-10-06')] }),
    ]
    const [rec, , ass] = carteiraPorEtapa(lista, HOJE)
    expect(rec).toMatchObject({ status: 'recebida', qtd: 2, idadeMedia: 6, maisAntiga: 10, paradas: 1 })
    expect(ass).toMatchObject({ status: 'assinatura_pendente', qtd: 1, paradas: 1 })
  })
  it('produção do mês: entrada, saída, prazo e tempo médio', () => {
    const lista = [
      mk({ status: 'concluida', emissao: '2026-09-28', prazo: '2026-10-10', concluidaEm: '2026-10-08' }),
      mk({ status: 'concluida', emissao: '2026-10-01', prazo: '2026-10-05', concluidaEm: '2026-10-09' }),
      mk({ emissao: '2026-10-12' }),
      mk({ status: 'cancelada', emissao: '2026-10-02' }),
    ]
    expect(producaoDoMes(lista, HOJE)).toEqual({ entraram: 2, concluidas: 2, noPrazo: 1, pctNoPrazo: 0.5, tempoMedio: 9 })
  })
  it('concluídas por semana e abertas por cidade', () => {
    const lista = [
      mk({ status: 'concluida', concluidaEm: '2026-10-12' }),
      mk({ status: 'concluida', concluidaEm: '2026-10-09' }),
      mk({ endereco: { cidade: 'Ariquemes' } as OS['endereco'] }),
      mk({ status: 'em_andamento', vistoria: vist('2026-10-15'), endereco: { cidade: 'ARIQUEMES' } as OS['endereco'] }),
      mk({ endereco: { cidade: 'JARU' } as OS['endereco'] }),
    ]
    expect(concluidasPorSemana(lista, HOJE, 2)).toEqual([{ inicio: '2026-10-05', qtd: 1 }, { inicio: '2026-10-12', qtd: 1 }])
    expect(abertasPorCidade(lista, HOJE)).toEqual([{ cidade: 'ARIQUEMES', qtd: 2, semData: 1 }, { cidade: 'JARU', qtd: 1, semData: 1 }])
  })
})

describe('O.S. em PEPT', () => {
  it('lista as pausadas com motivo, dias e prazo efetivo', () => {
    const ev = (data: string, texto: string) => ({ data: `${data}T10:00:00.000Z`, texto })
    const a = mk({ id: 'a', pausadoEm: '2026-10-09', prazo: '2026-10-15', historico: [ev('2026-10-09', 'Pausa solicitada: aguardando documento do cliente')] })
    const b = mk({ id: 'b', pausadoEm: '2026-10-12', historico: [ev('2026-10-12', 'Pausa solicitada')] })
    const c = mk({ id: 'c' })
    const r = emPept([b, a, c], HOJE)
    expect(r.map((i) => [i.os.id, i.dias, i.motivo])).toEqual([['a', 4, 'aguardando documento do cliente'], ['b', 1, '']])
    expect(r[0].prazoEfetivo).toBe('2026-10-18') // o dia do cadastro (09) e hoje (13) contam: 3 dias parados
  })
})

describe('alertas do Início', () => {
  it('vencida, PEPT no limite do COT, vencendo e vistoria amanhã, do mais grave ao mais leve', () => {
    const lista = [
      mk({ id: 'v', numero: 1, proponente: 'ANA', prazo: '2026-10-11' }),
      mk({ id: 'p', numero: 2, proponente: 'BIA', tipologia: 'B438', pausadoEm: '2026-09-23' }),
      mk({ id: 'q', numero: 3, proponente: 'CAU', tipologia: 'B437', pausadoEm: '2026-09-28' }),
      mk({ id: 'f', numero: 4, proponente: 'DAN', prazo: '2026-10-15' }),
      mk({ id: 'a', numero: 5, proponente: 'EVA', status: 'em_andamento', prazo: '2026-10-30', vistoria: vist('2026-10-14', '09:30'), endereco: { cidade: 'JARU' } as OS['endereco'] }),
      mk({ id: 'ok', numero: 6, proponente: 'FIA', prazo: '2026-10-30' }),
    ]
    const r = alertas(lista, HOJE)
    expect(r.map((x) => x.os.id)).toEqual(['v', 'p', 'f', 'q', 'a'])
    expect(r[1].texto).toBe('PEPT da OS-2 (BIA) aberta há 20 dias. Falta 1 dia para o prazo do COT (21 dias).')
    expect(r[2].texto).toBe('Faltam 2 dias para a OS-4 (DAN) vencer.')
    expect(r[4].texto).toBe('Vistoria amanhã às 09:30: OS-5 (EVA), JARU.')
  })
})

describe('O.S. por tipologia', () => {
  it('recebidas no mês e não finalizadas, sem canceladas nem outros meses', () => {
    const mk2 = (tipologia: string, status: string, emissao = '2026-10-05') => ({ id: tipologia + status + emissao, tipologia, status, emissao }) as OS
    const l = [mk2('A413', 'concluida'), mk2('A413', 'recebida'), mk2('A413', 'em_andamento'), mk2('B438', 'concluida'), mk2('B438', 'cancelada'), mk2('E005', 'recebida', '2026-09-28')]
    expect(porTipologia(l, '2026-10')).toEqual([{ tipologia: 'A413', recebidas: 3, abertas: 2 }, { tipologia: 'B438', recebidas: 1, abertas: 0 }])
    expect(porTipologia([], '2026-10')).toEqual([])
  })
})
