import { describe, expect, it } from 'vitest'
import { juntarNotas, lerNotaXML, notaDoMes } from '../notasFiscais'

const ABRASF = `<?xml version="1.0"?><CompNfse><Nfse><InfNfse Id="n1"><Numero>153</Numero><DataEmissao>2026-11-01T09:12:00</DataEmissao>
<Competencia>2026-10-31</Competencia><Servico><Valores><ValorServicos>8540.50</ValorServicos><ValorIss>0</ValorIss></Valores></Servico>
</InfNfse></Nfse></CompNfse>`

const NACIONAL = `<NFSe xmlns="http://www.sped.fazenda.gov.br/nfse"><infNFSe><nNFSe>22</nNFSe><dhProc>2026-10-02T10:00:00-03:00</dhProc>
<DPS><infDPS><dhEmi>2026-10-01T08:00:00-03:00</dhEmi><dCompet>2026-09-30</dCompet><valores><vServPrest><vServ>4210.00</vServ></vServPrest></valores></infDPS></DPS></infNFSe></NFSe>`

describe('ler XML de nota fiscal de serviço', () => {
  it('padrão ABRASF: valor dos serviços, competência e número', () => {
    expect(lerNotaXML(ABRASF)).toEqual({ numero: '153', data: '2026-10-31', valor: 8540.5 })
  })
  it('padrão nacional: vServ, dCompet e nNFSe', () => {
    expect(lerNotaXML(NACIONAL)).toEqual({ numero: '22', data: '2026-09-30', valor: 4210 })
  })
  it('aceita prefixo de namespace e valor com vírgula', () => {
    expect(lerNotaXML('<ns2:Numero>9</ns2:Numero><ns2:Competencia>2026-08-31</ns2:Competencia><ns2:ValorServicos>1.234,56</ns2:ValorServicos>'))
      .toEqual({ numero: '9', data: '2026-08-31', valor: 1234.56 })
  })
  it('sem valor ou sem data, não lê', () => {
    expect(lerNotaXML('<Numero>1</Numero><ValorServicos>10</ValorServicos>')).toBeNull()
    expect(lerNotaXML('<html>não é nota</html>')).toBeNull()
  })
})

describe('juntar notas por mês', () => {
  it('soma as notas do mesmo mês e não repete o mesmo número', () => {
    const r = juntarNotas([{ mes: '2026-10', valor: 1000, numeros: ['150'] }], [
      { numero: '151', data: '2026-10-31', valor: 500.25 },
      { numero: '150', data: '2026-10-31', valor: 1000 }, // já estava
      { numero: '140', data: '2026-09-30', valor: 300 },
    ])
    expect(r.lista).toEqual([
      { mes: '2026-09', valor: 300, numeros: ['140'] },
      { mes: '2026-10', valor: 1500.25, numeros: ['150', '151'] },
    ])
    expect(r.entraram).toBe(2)
    expect(r.repetidas).toBe(1)
    expect(notaDoMes(r.lista, '2026-10')).toBe(1500.25)
    expect(notaDoMes(r.lista, '2026-08')).toBeUndefined()
  })
})
