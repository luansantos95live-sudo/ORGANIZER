import { describe, expect, it } from 'vitest'
import { caixaDeEntrada, ehDaCaixa, emailsExemplo, notificaveis, tipoEmail } from '../emails'
import { refPeptResolvida, emailPeptResolvida, tipoEmail as tipoEmail2, notificaveis as notificaveis2 } from '../emails'
import { lerSiopiTxt } from '../siopi'

describe('e-mails da Caixa', () => {
  it('só entram remetentes @caixa', () => {
    expect(ehDaCaixa('gihab.ariquemes@caixa.gov.br')).toBe(true)
    expect(ehDaCaixa('cot@CAIXA.GOV.BR ')).toBe(true)
    expect(ehDaCaixa('fulano@gmail.com')).toBe(false)
    expect(ehDaCaixa('caixa@empresa.com.br')).toBe(false)
    const l = [...emailsExemplo(), { ...emailsExemplo()[0], id: 'x', de: 'promo@loja.com' }]
    expect(caixaDeEntrada(l).every((e) => ehDaCaixa(e.de))).toBe(true)
  })
  it('classifica pelo assunto e pelo anexo', () => {
    const [os, os2, prazo, canc, pept] = emailsExemplo()
    expect([tipoEmail(os), tipoEmail(os2), tipoEmail(prazo), tipoEmail(canc), tipoEmail(pept)]).toEqual(['os', 'os', 'prazo', 'cancelamento', 'pept'])
  })
  it('o anexo de exemplo é um .txt da Caixa válido', () => {
    const r = lerSiopiTxt(emailsExemplo()[0].anexo!.texto)
    expect(r.referencia).toBe('7886.1831.00099101/2026.10.20.01.01')
    expect(r.proponente).toBe('Renata Souza Lima')
  })
  it('só e-mail de O.S. nova e de PEPT resolvida notifica', () => {
    const l = emailsExemplo().map((e) => ({ ...e, lido: false }))
    expect(notificaveis(l).map((e) => e.id)).toEqual(['em-1', 'em-2', 'em-5'])
  })
})

describe('PEPT resolvida por e-mail', () => {
  it('lê a referência do texto do SIOPI e notifica', () => {
    const e = emailPeptResolvida('7886.3564.009990213/2026.01.01', 'CLIENTE DE EXEMPLO', 'ARIQUEMES')
    expect(refPeptResolvida(e)).toBe('7886.3564.009990213/2026.01.01')
    expect(tipoEmail2(e)).toBe('pept')
    expect(notificaveis2([e]).length).toBe(1)
    // e-mail de PEPT é sempre de PEPT resolvida; sem referência no texto não dá para achar a O.S.
    expect(tipoEmail2({ assunto: 'Aviso: PEPT', corpo: 'texto' })).toBe('pept')
    expect(refPeptResolvida({ assunto: 'Aviso: PEPT', corpo: 'sem número' })).toBeNull()
    expect(refPeptResolvida({ assunto: 'Ordem de Serviço 7886.1831.00099101/2026', corpo: 'Segue a O.S.' })).toBeNull()
  })
})
