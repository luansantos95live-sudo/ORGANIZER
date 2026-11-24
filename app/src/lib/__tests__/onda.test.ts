import { describe, expect, it } from 'vitest'

import type { OS } from '../../types'
import { recebidasPorMes, ultimosMeses } from '../inicio'
import { caminhoOnda, tetoDoEixo } from '../onda'

describe('gráfico de onda (24/11)', () => {
  it('últimos 6 meses, do mais antigo ao atual, virando o ano', () => {
    expect(ultimosMeses(new Date(2026, 1, 10), 6)).toEqual([
      '2025-09',
      '2025-10',
      '2025-11',
      '2025-12',
      '2026-01',
      '2026-02',
    ])
  })
  it('recebidas por mês de uma pessoa, sem canceladas', () => {
    const l = [
      { responsavel: 'luan', status: 'recebida', emissao: '2026-10-02' },
      { responsavel: 'luan', status: 'concluida', emissao: '2026-11-05' },
      { responsavel: 'luan', status: 'cancelada', emissao: '2026-11-06' },
      { responsavel: 'rt', status: 'recebida', emissao: '2026-11-07' },
    ] as OS[]
    expect(recebidasPorMes(l, ['2026-10', '2026-11'], 'luan')).toEqual([1, 1])
    expect(recebidasPorMes(l, ['2026-10', '2026-11'], 'rt')).toEqual([0, 1])
  })
  it('a curva passa pelos pontos e não passa do vizinho (sem pico inventado)', () => {
    const c = caminhoOnda([
      [0, 100],
      [50, 0],
      [100, 0],
    ])
    expect(c.startsWith('M0,100')).toBe(true)
    expect(c.endsWith('100,0')).toBe(true)
    // segmento plano (0 → 0): os controles ficam na mesma altura, sem passar de 0
    const ys = [...c.matchAll(/,(-?[\d.]+)/g)].map(m => Number(m[1]))
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0)
  })
  it('teto do eixo redondo e um pouco acima do maior valor', () => {
    expect(tetoDoEixo(0)).toBe(4)
    expect(tetoDoEixo(7)).toBe(10)
    expect(tetoDoEixo(23)).toBe(30)
  })
})
