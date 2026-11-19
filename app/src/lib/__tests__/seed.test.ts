import { describe, expect, it } from 'vitest'
import { exemploParaAriquemes, gerarSeed } from '../../data/seed'

describe('dados de exemplo', () => {
  const { os, rotas } = gerarSeed(new Date('2026-11-06T12:00:00'))

  it('todas as O.S. ficam em Ariquemes, em bairros diferentes (rodízio)', () => {
    expect(os.every((o) => o.endereco.cidade === 'ARIQUEMES')).toBe(true)
    const primeiras = os.slice(0, 12).map((o) => o.endereco.bairro)
    expect(new Set(primeiras).size).toBe(12)
    expect(os.filter((o) => o.endereco.lat != null).every((o) => Math.abs(o.endereco.lat! + 9.92) < 0.06 && Math.abs(o.endereco.lng! + 63.045) < 0.06)).toBe(true)
  })

  it('as rotas de exemplo partem da base em Ariquemes', () => {
    expect(rotas.every((r) => r.partida.endereco.includes('Ariquemes'))).toBe(true)
  })

  it('O.S. de exemplo salva com outra cidade passa para Ariquemes; O.S. real não muda', () => {
    const antiga = { ...os[0], id: 'os-3', numero: 3, endereco: { ...os[0].endereco, cidade: 'CACOAL', bairro: 'CENTRO', lat: -11.43, lng: -61.44 } }
    const nova = exemploParaAriquemes(antiga)
    expect(nova.endereco.cidade).toBe('ARIQUEMES')
    expect(nova.endereco.bairro).toBe('SETOR 03')
    expect(Math.abs(nova.endereco.lat! + 9.92)).toBeLessThan(0.06)
    const real = { ...antiga, id: 'os-m1abc-x9z' }
    expect(exemploParaAriquemes(real)).toBe(real)
    const semCoord = { ...antiga, endereco: { ...antiga.endereco, lat: undefined, lng: undefined } }
    expect(exemploParaAriquemes(semCoord).endereco.lat).toBeUndefined()
  })
})
