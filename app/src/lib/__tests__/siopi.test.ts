import { describe, expect, it } from 'vitest'
import { detectarTipologia, lerEndereco, lerSiopiTxt, lerValor, separarDocumento } from '../siopi'

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

describe('.txt de convocação da Caixa (data da O.S. e prazo em dias)', () => {
  it('lê "Data da Ordem de Serviço" e "N Dia(s) corridos"', () => {
    const conv = `Referência: Ordem de Serviço - 7886.2976.009990001/2026.01.01
Data da Ordem de Serviço......: 28/10/2026
Prazo de execução.............:  15 Dia(s) corridos. Recusas conforme motivos
Valor previsto do Serviço.....: R$ 914,00
Valor previsto do Deslocamento: R$ 73,50`
    const r = lerSiopiTxt(conv)
    expect(r.emissao).toBe('2026-10-28')
    expect(r.prazo).toBe('2026-11-12')
    expect(r.valorServico).toBe(914)
    expect(r.avisos.join(' ')).not.toContain('Data de recebimento')
  })
})

describe('nome do cliente sem o CPF', () => {
  it('separa CPF ou CNPJ do nome', () => {
    expect(separarDocumento('000.000.000-00 - CLIENTE DE EXEMPLO')).toEqual({ nome: 'CLIENTE DE EXEMPLO', documento: '000.000.000-00' })
    expect(separarDocumento('00.000.000/0001-00 - EMPRESA EXEMPLO')).toEqual({ nome: 'EMPRESA EXEMPLO', documento: '00.000.000/0001-00' })
    expect(separarDocumento('CLIENTE SEM CPF')).toEqual({ nome: 'CLIENTE SEM CPF', documento: '' })
  })
  it('o leitor do .txt guarda só o nome', () => {
    const r = lerSiopiTxt(['Referência: Ordem de Serviço - 7886.2976.009990002/2026.01.01', 'Cliente .: 000.000.000-00 - CLIENTE DE EXEMPLO', 'Data da Ordem de Serviço......: 11/11/2026'].join('\n'))
    expect(r.proponente.toUpperCase()).toBe('CLIENTE DE EXEMPLO')
    expect(r.documento).toBe('000.000.000-00')
  })
})

describe('tipologia pela linha "Atividade" (12/11)', () => {
  it('E005 cuja descrição cita E401 continua E005', () => {
    expect(detectarTipologia('Assunto .: ATIVIDADES VINCULADAS\nAtividade: E005  - ATIVIDADE EDITAL E005: ATIVIDADE EDITAL E401 + ATIVIDADE EDIT')).toBe('E005')
    expect(detectarTipologia('Atividade: G416  - NOVA VISTORIA P/ VERIF.CORRECAO DE PENDENCIAS')).toBe('G416')
    expect(detectarTipologia('Serviço: B438 - Análise de Proposta')).toBe('B438')
  })
})
