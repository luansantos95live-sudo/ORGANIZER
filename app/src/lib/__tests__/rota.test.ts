import { describe, expect, it } from 'vitest'
import { dentroDoPoligono, distanciaKm, distanciaRota, elegivelParaRota, fmtKm, fmtMin, horariosEstimados, novoCodigoRota, ordemOtimizada, sugestaoDeViagem, toHHMM, toMin } from '../rota'
import type { OS, Rota } from '../../types'

const ARIQUEMES = { lat: -9.9133, lng: -63.0408 }
const JI_PARANA = { lat: -10.8777, lng: -61.9322 }

describe('horas e formatos', () => {
  it('converte ida e volta', () => {
    expect(toMin('08:45')).toBe(525)
    expect(toHHMM(525)).toBe('08:45')
    expect(toHHMM(1500)).toBe('01:00')
    expect(fmtMin(75)).toBe('1h15')
    expect(fmtMin(45)).toBe('45 min')
    expect(fmtKm(4.26)).toBe('4,3 km')
    expect(fmtKm(163.4)).toBe('163 km')
  })
})

describe('distâncias', () => {
  it('Ariquemes a Ji-Paraná dá cerca de 160 km em linha reta', () => {
    const d = distanciaKm(ARIQUEMES, JI_PARANA)
    expect(d).toBeGreaterThan(155)
    expect(d).toBeLessThan(170)
    expect(distanciaKm(ARIQUEMES, ARIQUEMES)).toBe(0)
  })
  it('a rota soma ida, paradas e volta, com fator de estrada, e ignora parada sem coordenada', () => {
    const ida = distanciaKm(ARIQUEMES, JI_PARANA)
    expect(distanciaRota(ARIQUEMES, [JI_PARANA, undefined])).toBeCloseTo(ida * 2 * 1.3)
    expect(distanciaRota(ARIQUEMES, [JI_PARANA], false)).toBeCloseTo(ida * 1.3)
    expect(distanciaRota(ARIQUEMES, [])).toBe(0)
  })
  it('hora estimada de chegada considera viagem e duração da vistoria', () => {
    const perto = { lat: -9.9133, lng: -63.0408 + 0.1 } // ~11 km
    const h = horariosEstimados('08:00', ARIQUEMES, [perto, perto], 30, 40)
    expect(h[0] > '08:00').toBe(true)
    // a segunda parada é no mesmo lugar: chega 40 min depois da primeira
    expect(toMin(h[1]) - toMin(h[0])).toBe(40)
  })
})

describe('otimizar ordem', () => {
  it('vai sempre para a parada mais próxima e deixa as sem coordenada no fim', () => {
    const longe = { id: 'longe', p: JI_PARANA }
    const perto = { id: 'perto', p: { lat: -9.95, lng: -63.05 } }
    const sem = { id: 'sem', p: undefined }
    expect(ordemOtimizada(ARIQUEMES, [longe, sem, perto], (x) => x.p).map((x) => x.id)).toEqual(['perto', 'longe', 'sem'])
  })
})

describe('laço do roteirizador', () => {
  const quadrado = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]
  it('ponto dentro e fora do polígono', () => {
    expect(dentroDoPoligono({ x: 5, y: 5 }, quadrado)).toBe(true)
    expect(dentroDoPoligono({ x: 15, y: 5 }, quadrado)).toBe(false)
  })
})

describe('O.S. elegíveis para rota', () => {
  const os = (id: string, status: OS['status'], tipologia: OS['tipologia'] = 'A413') => ({ id, status, tipologia }) as OS
  const rota = (id: string, status: Rota['status'], ids: string[]) => ({ id, status, paradas: ids.map((osId) => ({ osId })) }) as Rota
  it('só recebidas ou em andamento, com vistoria, e fora de outra rota ativa', () => {
    const rotas = [rota('r1', 'rascunho', ['a']), rota('r2', 'concluida', ['b'])]
    expect(elegivelParaRota(os('a', 'recebida'), rotas)).toBe(false) // já está no rascunho r1
    expect(elegivelParaRota(os('a', 'recebida'), rotas, 'r1')).toBe(true) // editando a própria r1
    expect(elegivelParaRota(os('b', 'em_andamento'), rotas)).toBe(true) // r2 já foi concluída
    expect(elegivelParaRota(os('c', 'concluida'), rotas)).toBe(false)
    expect(elegivelParaRota(os('d', 'recebida', 'G402'), rotas)).toBe(false) // reedição sem vistoria
  })
  it('código ROTA-XXXX sem repetir', () => {
    const c = novoCodigoRota(['ROTA-0001'])
    expect(c).toMatch(/^ROTA-[0-9A-F]{4}$/)
    expect(c).not.toBe('ROTA-0001')
  })
})

describe('sugestão de viagem do Início', () => {
  const os = (id: string, cidade: string, extra: Partial<OS> = {}) => ({ id, status: 'recebida', tipologia: 'A413', endereco: { cidade }, ...extra }) as OS
  it('escolhe a cidade com mais O.S. sem vistoria, fora da base', () => {
    const lista = [os('a', 'CACOAL'), os('b', 'CACOAL'), os('c', 'CACOAL'), os('d', 'JARU'), os('e', 'JARU'), os('f', 'ARIQUEMES'), os('g', 'ARIQUEMES'), os('h', 'ARIQUEMES')]
    const s = sugestaoDeViagem(lista, 'ARIQUEMES')
    expect(s?.cidade).toBe('CACOAL')
    expect(s?.os.map((o) => o.id)).toEqual(['a', 'b', 'c'])
  })
  it('ignora as que já têm vistoria e precisa de pelo menos duas', () => {
    const lista = [os('a', 'CACOAL'), os('b', 'CACOAL', { vistoria: { data: '2026-10-10', hora: '08:00', duracao: 40 } })]
    expect(sugestaoDeViagem(lista, 'ARIQUEMES')).toBeNull()
  })
})
