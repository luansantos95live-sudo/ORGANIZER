import { describe, expect, it } from 'vitest'
import { conferirExtrato, descricaoNF, descricaoRRT, mesDaEmissao, mesDosServicos, valorRRT } from '../fechamento'

const contrato = { numero: '20999/2024-DF', edital: '0244/2024-DF', processo: '5688.01.0244.4188/2024', rrt: '20999/2024 - NACIONAL' }

describe('valorRRT', () => {
  it('usa vírgula decimal e ponto de milhar', () => {
    expect(valorRRT(469.15)).toBe('469,15')
    expect(valorRRT(1234.5)).toBe('1.234,50')
    expect(valorRRT(0)).toBe('0,00')
  })
})

describe('descricaoRRT', () => {
  it('segue o modelo do RRT e mantém o .01.01 do documento', () => {
    const t = descricaoRRT('7886.1831.00012345/2026.09.10.01.01', 34, 469.15, contrato.rrt)
    expect(t).toBe('PRESTAÇÃO DE 34 SERVIÇO DE ENGENHARIA A CAIXA CONFORME O CONTRATO N.º 20999/2024 - NACIONAL / ORDEM DE SERVIÇO N° 7886.1831.00012345/2026.09.10.01.01 - VALOR OS + DESLOCAMENTO: R$ 469,15')
  })
})

describe('mês de competência da nota', () => {
  it('os serviços são sempre do mês anterior à emissão', () => {
    expect(mesDosServicos(new Date(2026, 6, 7))).toBe('2026-06')
    expect(mesDosServicos(new Date(2026, 0, 5))).toBe('2025-12')
  })
  it('a emissão é no mês seguinte aos serviços', () => {
    expect(mesDaEmissao('2026-06')).toBe('2026-07')
    expect(mesDaEmissao('2026-12')).toBe('2027-01')
  })
})

describe('descricaoNF', () => {
  it('reproduz a nota de referência', () => {
    const t = descricaoNF('2026-06', '2026-07-01', contrato)
    expect(t).toContain('EXECUTADOS ATÉ O MÊS 06/2026')
    expect(t).toContain('CONTRATO N.º 20999/2024-DF')
    expect(t).toContain('EDITAL DE CREDENCIAMENTO N.º 0244/2024-DF')
    expect(t).toContain('RECEBIDO EM 01/07/2026 DA CAIXA')
    expect(t.endsWith('PROCESSO ADMINISTRATIVO N.º 5688.01.0244.4188/2024.')).toBe(true)
  })
  it('sem data do relatório deixa o espaço para preencher', () => {
    expect(descricaoNF('2026-06', undefined, contrato)).toContain('RECEBIDO EM __/__/____ DA CAIXA')
  })
})

describe('contrato em branco', () => {
  it('deixa espaços para preencher em vez de inventar números', () => {
    const vazio = { numero: '', edital: '  ', processo: '', rrt: '' }
    expect(descricaoNF('2026-06', '2026-07-01', vazio)).toContain('CONTRATO N.º ________, ORIUNDO DO EDITAL DE CREDENCIAMENTO N.º ________')
    expect(descricaoRRT('7886.1831.00012345/2026.09.10.01.01', 3, 100, '')).toContain('CONTRATO N.º ________ / ORDEM')
  })
})

describe('conferirExtrato', () => {
  it('sem extrato informado', () => {
    expect(conferirExtrato(1000, undefined).tipo).toBe('sem-extrato')
    expect(conferirExtrato(1000, 0).tipo).toBe('sem-extrato')
  })
  it('bate com tolerância de centavo', () => {
    expect(conferirExtrato(1000.004, 1000).tipo).toBe('bate')
  })
  it('aponta diferença com sinal (extrato menos sistema)', () => {
    expect(conferirExtrato(1000, 1050.5)).toEqual({ tipo: 'diferente', dif: 50.5 })
    expect(conferirExtrato(1000, 900)).toEqual({ tipo: 'diferente', dif: -100 })
  })
})
