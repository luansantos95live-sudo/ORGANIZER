import { describe, expect, it } from 'vitest'
import { lerEndereco, lerSiopiTxt, lerValor } from '../siopi'

const TXT = `ORDEM DE SERVIÇO - AVALIAÇÃO DE IMÓVEL
Referência.: 7886.1831.00012345/2026.09.10.01.01
Proponente.: JOAO BATISTA FERREIRA
Endereço.: RUA CURITIBA, 0 - SOL NASCENTE
Cidade/UF: MONTE NEGRO/RO
CEP......: 76888000
Matrícula.: 4.512
Valor previsto do Serviço: R$ 357,00
Valor previsto do Deslocamento: R$ 95,00
Nome do contato: ana paula
Telefone contato: (69) 99231-4410
`

describe('lerValor', () => {
  it('lê formatos brasileiros e simples', () => {
    expect(lerValor('R$ 1.234,56')).toBe(1234.56)
    expect(lerValor('350,00')).toBe(350)
    expect(lerValor('1234.56')).toBe(1234.56)
    expect(lerValor(undefined)).toBe(0)
    expect(lerValor('abc')).toBe(0)
  })
})

describe('lerEndereco', () => {
  it('troca número 0 por SN e separa o bairro', () => {
    expect(lerEndereco('RUA CURITIBA, 0 - SOL NASCENTE')).toEqual({ logradouro: 'Rua Curitiba', numero: 'SN', bairro: 'Sol Nascente' })
  })
  it('aceita vírgula antes do bairro e mantém o número', () => {
    expect(lerEndereco('AV BRASIL, 1500, CENTRO')).toEqual({ logradouro: 'Av Brasil', numero: '1500', bairro: 'Centro' })
  })
  it('sem número reconhecível cai para o logradouro inteiro', () => {
    const r = lerEndereco('RUA SEM NUMERO')
    expect(r.numero).toBe('SN')
    expect(r.bairro).toBe('')
  })
})

describe('lerSiopiTxt', () => {
  const r = lerSiopiTxt(TXT)
  it('lê referência e deriva emissão e prazo', () => {
    expect(r.referencia).toBe('7886.1831.00012345/2026.09.10.01.01')
    expect(r.emissao).toBe('2026-09-10')
    expect(r.prazo).toBe('2026-09-22')
  })
  it('lê endereço, cidade, CEP e valores', () => {
    expect(r.endereco).toMatchObject({ logradouro: 'Rua Curitiba', numero: 'SN', bairro: 'Sol Nascente', cidade: 'Monte Negro', uf: 'RO', cep: '76888-000' })
    expect(r.valorServico).toBe(357)
    expect(r.valorDeslocamento).toBe(95)
  })
  it('lê contato e detecta o tipo', () => {
    expect(r.contato).toBe('Ana Paula')
    expect(r.telefone).toBe('(69) 99231-4410')
    expect(r.tipo).toBe('AVALIACAO')
    expect(r.tipologia).toBe('A413')
    expect(r.avisos).toEqual([])
  })
  it('detecta vistoria de obra e avisa quando faltam dados', () => {
    const v = lerSiopiTxt('VISTORIA DE OBRA RAE\nEndereço.: RUA X, 10')
    expect(v.tipo).toBe('VISTORIA_RAE')
    expect(v.avisos.join(' ')).toContain('Referência')
    expect(v.avisos.join(' ')).toContain('serviço')
  })
  it('respeita o prazo padrão configurado', () => {
    expect(lerSiopiTxt(TXT, 5).prazo).toBe('2026-09-15')
  })
})
