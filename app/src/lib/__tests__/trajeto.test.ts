import { describe, expect, it, vi } from 'vitest'
import { buscarMatriz, buscarTrajeto, distanciaPelaMatriz, horariosPorTempos, lerMatriz, lerTrajeto, minutosPorParada, urlMatriz, urlTrajeto } from '../trajeto'
import { distanciaKm } from '../rota'

const A = { lat: -9.9133, lng: -63.0408 }
const B = { lat: -9.9075, lng: -63.0375 }
const C = { lat: -9.9330, lng: -63.0285 }

const respostaRota = {
  code: 'Ok',
  routes: [{ distance: 4200, duration: 600, legs: [{ distance: 1000, duration: 120 }, { distance: 2000, duration: 300 }, { distance: 1200, duration: 180 }], geometry: { coordinates: [[-63.0408, -9.9133], [-63.0375, -9.9075], [-63.0285, -9.933], [-63.0408, -9.9133]] } }],
}

describe('trajeto pelas ruas (OSRM)', () => {
  it('monta as URLs com lng,lat e volta à partida', () => {
    const u = urlTrajeto(A, [B], true)
    expect(u).toContain('/route/v1/driving/-63.040800,-9.913300;-63.037500,-9.907500;-63.040800,-9.913300?')
    expect(urlTrajeto(A, [B], false)).toContain('-63.040800,-9.913300;-63.037500,-9.907500?')
    expect(urlMatriz([A, B])).toContain('/table/v1/driving/-63.040800,-9.913300;-63.037500,-9.907500?annotations=distance,duration')
  })

  it('lê a rota: km, minutos, trechos e linha', () => {
    const t = lerTrajeto(respostaRota)!
    expect(t.km).toBeCloseTo(4.2)
    expect(t.min).toBe(10)
    expect(t.trechos).toEqual([{ km: 1, min: 2 }, { km: 2, min: 5 }, { km: 1.2, min: 3 }])
    expect(t.linha).toHaveLength(4)
    expect(lerTrajeto({ code: 'NoRoute' })).toBeNull()
    expect(lerTrajeto(null)).toBeNull()
  })

  it('lê a matriz e usa linha reta onde não há caminho', () => {
    const m = lerMatriz({ code: 'Ok', distances: [[0, 1500], [null, 0]], durations: [[0, 120], [null, 0]] })!
    expect(m.km[0][1]).toBe(1.5)
    expect(m.km[1][0]).toBe(Infinity)
    const dist = distanciaPelaMatriz([A, B], m)
    expect(dist(A, B)).toBe(1.5)
    expect(dist(B, A)).toBeCloseTo(distanciaKm(B, A))
    expect(dist(A, C)).toBeCloseTo(distanciaKm(A, C))
    expect(lerMatriz({ code: 'Ok' })).toBeNull()
  })

  it('horários pelos tempos reais, pulando paradas sem coordenada', () => {
    const t = lerTrajeto(respostaRota)!
    const minutos = minutosPorParada(t.trechos, [B, undefined, C])
    expect(minutos).toEqual([2, 0, 5])
    expect(horariosPorTempos('08:00', minutos, 40)).toEqual(['08:02', '08:42', '09:27'])
  })

  it('busca com cache: a mesma rota só é pedida uma vez; falha não fica no cache', async () => {
    const fetchOk = vi.fn(async () => ({ ok: true, json: async () => respostaRota })) as unknown as typeof fetch
    const t1 = await buscarTrajeto(A, [B, C], true, fetchOk)
    const t2 = await buscarTrajeto(A, [B, C], true, fetchOk)
    expect(t1?.km).toBeCloseTo(4.2)
    expect(t2).toBe(t1)
    expect(fetchOk).toHaveBeenCalledTimes(1)
    expect(await buscarTrajeto(A, [], true, fetchOk)).toBeNull()

    const fetchFalha = vi.fn(async () => { throw new Error('sem internet') }) as unknown as typeof fetch
    expect(await buscarMatriz([A, C], fetchFalha)).toBeNull()
    expect(await buscarMatriz([A, C], fetchFalha)).toBeNull()
    expect(fetchFalha).toHaveBeenCalledTimes(2)
    expect(await buscarMatriz([A], fetchOk)).toBeNull()
  })
})
