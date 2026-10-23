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
  it('lê referência (formato antigo) e deriva recebimento e prazo', () => {
    expect(r.referencia).toBe('7886.1831.00012345/2026.09.10.01.01')
    expect(r.emissao).toBe('2026-09-10')
    expect(r.prazo).toBe('2026-09-16') // A413: 6 dias
  })
  it('lê endereço, cidade, CEP e valores', () => {
    expect(r.endereco).toMatchObject({ logradouro: 'Rua Curitiba', numero: 'SN', bairro: 'Sol Nascente', cidade: 'Monte Negro', uf: 'RO', cep: '76888-000' })
    expect(r.valorServico).toBe(357)
    expect(r.valorDeslocamento).toBe(95)
  })
  it('lê contato e detecta a tipologia pelo serviço', () => {
    expect(r.contato).toBe('Ana Paula')
    expect(r.telefone).toBe('(69) 99231-4410')
    expect(r.tipologia).toBe('A413')
    expect(r.avisos).toEqual([])
  })
  it('detecta acompanhamento de obra e avisa quando faltam dados', () => {
    const v = lerSiopiTxt('VISTORIA DE OBRA RAE\nEndereço.: RUA X, 10')
    expect(v.tipologia).toBe('E401')
    expect(v.avisos.join(' ')).toContain('Referência')
    expect(v.avisos.join(' ')).toContain('serviço')
  })
  it('sem prazo no arquivo, usa o prazo da tipologia (cadastro)', () => {
    expect(lerSiopiTxt(TXT, 5).prazo).toBe('2026-09-16')
    expect(lerSiopiTxt(TXT.replace(/A413|Avalia[cç][aã]o[^\n]*/gi, 'Laudo B438 - Análise de Proposta'), 5).prazo).toBe('2026-09-25')
  })
  it('lê o formato real: referência de 9 dígitos, código da tipologia, datas e importação', () => {
    const real = `Referência: 7886.1831.001122004/2026.01.01
Serviço: B438 - Análise de Proposta/Projeto de Construção do Imóvel
Data de recebimento: 02/10/2026
Prazo: 17/10/2026
Proponente: JOAO DA SILVA
CPF: 000.000.000-00
Endereço: TANCREDO NEVES, 0 - SETOR INSTITUCIONAL
Cidade/UF: ARIQUEMES/RO
Valor previsto do Serviço: 914,00
Valor previsto do Deslocamento: 15,00
Cód. Produto: 0173
Cód. Linha: 0067
Cód. Fonte: 0030
Livro: 15751
Solicitante: 1831 - ARIQUEMES, RO`
    const x = lerSiopiTxt(real)
    expect(x.referencia).toBe('7886.1831.001122004/2026.01.01')
    expect(x.tipologia).toBe('B438')
    expect(x.emissao).toBe('2026-10-02')
    expect(x.prazo).toBe('2026-10-17')
    expect(x.documento).toBe('000.000.000-00')
    expect(x.importacao).toMatchObject({ codProduto: '0173', codLinha: '0067', codFonte: '0030', livro: '15751', solicitante: '1831 - ARIQUEMES, RO' })
    expect(x.avisos).toEqual([])
  })
})
