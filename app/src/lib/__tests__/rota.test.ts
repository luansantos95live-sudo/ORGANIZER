import { describe, expect, it } from 'vitest'
import { dentroDoPoligono, distanciaKm, distanciaRota, elegivelParaRota, fmtKm, fmtMin, horariosEstimados, linkGoogleMaps, linkWaze, linksGoogleMaps, novoCodigoRota, ordemOtimizada, vistoriasDasRotasConcluidas, ordemPorBairro, sugestaoDeViagem, textoRoteiro, toHHMM, toMin } from '../rota'

describe('rota completa para o celular', () => {
  it('até 9 paradas vai num link só; com mais, divide em partes emendadas e a última volta à partida', () => {
    const d = Array.from({ length: 11 }, (_, i) => `-9.9${i},-63.0${i}`)
    expect(linksGoogleMaps(ARIQUEMES, d.slice(0, 9))).toHaveLength(1)
    const partes = linksGoogleMaps(ARIQUEMES, d)
    expect(partes).toHaveLength(2)
    expect(decodeURIComponent(partes[0])).toContain(`origin=${ARIQUEMES.lat},${ARIQUEMES.lng}`)
    expect(decodeURIComponent(partes[0])).toContain(`destination=${d[8]}`)
    expect(decodeURIComponent(partes[0])).toContain(`waypoints=${d.slice(0, 8).join('|')}`)
    expect(decodeURIComponent(partes[1])).toContain(`origin=${d[8]}`)
    expect(decodeURIComponent(partes[1])).toContain(`destination=${ARIQUEMES.lat},${ARIQUEMES.lng}`)
    expect(decodeURIComponent(partes[1])).toContain(`waypoints=${d[9]}|${d[10]}`)
  })
  it('monta o roteiro em texto', () => {
    const t = textoRoteiro('ROTA-1 · 07/11 · saída 08:00', [{ hora: '08:10', nome: 'ANA', endereco: 'RUA A, 1 - CENTRO' }], ['https://maps/x'])
    expect(t).toBe('ROTA-1 · 07/11 · saída 08:00\n\n1. 08:10 · ANA\n   RUA A, 1 - CENTRO\n\nGoogle Maps: https://maps/x')
    expect(textoRoteiro('R', [], ['a', 'b'])).toContain('Google Maps (parte 2): b')
  })
})
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
  it('por bairro: termina um bairro antes de ir ao próximo, começando pelo mais perto da partida', () => {
    // base em Ariquemes; bairro SETOR 02 a leste (perto), bairro JARDIM a mais longe. Um ponto do JARDIM fica mais
    // perto da base que o segundo ponto do SETOR 02, mas a rota não deve pular de bairro.
    const s1 = { id: 's1', b: 'SETOR 02', p: { lat: -9.9133, lng: -63.03 } }
    const s2 = { id: 's2', b: 'Setor 02', p: { lat: -9.9133, lng: -62.99 } } // mesmo bairro, escrito diferente
    const j1 = { id: 'j1', b: 'JARDIM', p: { lat: -9.9133, lng: -63.06 } }
    const j2 = { id: 'j2', b: 'JARDIM', p: { lat: -9.9133, lng: -63.08 } }
    const sem = { id: 'sem', b: 'X', p: undefined }
    // o mais perto da base é s1 (0,011°) → faz s2 (SETOR 02) → depois JARDIM (j1 e j2) → sem coordenada no fim
    expect(ordemPorBairro(ARIQUEMES, [j2, sem, s2, j1, s1], (x) => x.p, (x) => x.b).map((x) => x.id)).toEqual(['s1', 's2', 'j1', 'j2', 'sem'])
  })
})

describe('links para o celular', () => {
  it('Google Maps com a rota inteira e volta à partida', () => {
    const u = linkGoogleMaps(ARIQUEMES, ['-9.95,-63.05', '-9.96,-63.06'])
    expect(u).toContain('origin=-9.9133%2C-63.0408')
    expect(u).toContain('destination=-9.9133%2C-63.0408')
    expect(u).toContain('waypoints=-9.95%2C-63.05%7C-9.96%2C-63.06')
  })
  it('sem volta, o último destino é o fim', () => {
    const u = linkGoogleMaps(ARIQUEMES, ['-9.95,-63.05', '-9.96,-63.06'], false)
    expect(u).toContain('destination=-9.96%2C-63.06')
    expect(u).toContain('waypoints=-9.95%2C-63.05')
    expect(linkGoogleMaps(ARIQUEMES, ['-9.95,-63.05'], false)).not.toContain('waypoints')
  })
  it('Waze navega para um ponto', () => {
    expect(linkWaze({ lat: -9.95, lng: -63.05 })).toBe('https://waze.com/ul?ll=-9.95,-63.05&navigate=yes')
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
    expect(elegivelParaRota({ ...os('e', 'em_andamento'), vistoria: { data: '2026-10-30', hora: '08:00', duracao: 40, feita: true } }, rotas)).toBe(false) // já vistoriada
    expect(elegivelParaRota({ ...os('f', 'em_andamento'), passos: { fazer_vistoria: '2026-10-30' } }, rotas)).toBe(false) // passo Fazer vistoria feito
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

describe('rota concluída = vistorias feitas (13/11)', () => {
  it('as O.S. da rota concluída saem do planejador', () => {
    const o = { id: 'a', status: 'recebida', tipologia: 'A413', passos: {} } as unknown as OS
    const rota = { id: 'r1', status: 'concluida', data: '2026-11-13', hora: '09:00', paradas: [{ osId: 'a', hora: '11:00' }] } as unknown as Rota
    const [x] = vistoriasDasRotasConcluidas([o], [rota])
    expect(x.vistoria).toMatchObject({ data: '2026-11-13', hora: '11:00', feita: true })
    expect(x.status).toBe('em_andamento')
    expect(x.passos?.fazer_vistoria).toBe('2026-11-13')
    expect(elegivelParaRota(x, [rota])).toBe(false)
    // rota ainda não concluída: nada muda
    expect(vistoriasDasRotasConcluidas([o], [{ ...rota, status: 'confirmada' }])[0]).toBe(o)
  })
})
