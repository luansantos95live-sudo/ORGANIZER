import { describe, expect, it } from 'vitest'
import { base64ParaTexto, decodificarCabecalho, emailDoGmail, lerMime, lerRemetente, quotedPrintableParaTexto } from '../mime'
import { desdeParaSincronizar, lerArquivoCaixaDeEntrada, lerRespostaPonte, mesclarEmails, tipoEmail, urlPonteGmail } from '../emails'
import { lerSiopiTxt } from '../siopi'

// Dados fictícios no formato do e-mail de convocação da Caixa (multipart, .txt como parte TEXT/PLAIN sem base64).
const TXT_OS = [
  '          Convocação - Ordem para prestação de Serviço', '', '', 'A', 'Empresa .: EMPRESA DE EXEMPLO LTDA', 'CNPJ ....: 00.000.000/0001-00', '',
  'Referência: Ordem de Serviço - 7886.2976.001200001/2026.01.01', '',
  'Assunto .: ATIVIDADES VINCULADAS', 'Atividade: G416  - NOVA VISTORIA P/ VERIF.CORRECAO DE PENDENCIAS', '',
  'Cliente .: 000.000.000-00 - CLIENTE DE EXEMPLO', '', 'Imóvel ..: JARU/RO', '           Matrícula RGI: 12345, Ofício: 01, Cartório: 96016', '',
  'Endereço.:  RUA DAS FLORES, 100 - CENTRO', '', 'Cidade/UF: JARU/RO', 'CEP......: 76890-000', '',
  'Data da Ordem de Serviço......: 29/10/2026', 'Prazo de execução.............:   5 Dia(s) corridos.', '',
  'Valor previsto do Serviço.....: R$ 200,00\u0000\u0000\u0000', 'Valor previsto do Deslocamento: R$ 350,00\u0000\u0000', '',
  'Nome do contato.: CONTATO DE EXEMPLO', 'Telefone contato: (69)99999-0000', '',
].join('\r\n')

const MIME_OS = [
  'Delivered-To: eu@gmail.com', 'DATE: 29 OCT 26 10:55:18 -0300', 'FROM: AG2976@CAIXA.GOV.BR', 'TO: eu@gmail.com', '   ,AG2976@CAIXA.GOV.BR',
  'SUBJECT:  Convocação de Ordem da Serviço 7886.2976.001200001/2026.01.01', 'MIME-VERSION: 1.0', 'CONTENT-TYPE: MULTIPART/MIXED;BOUNDARY="CORPO DO EMAIL"', '',
  '--CORPO DO EMAIL', '', 'A EMPRESA', '      CONVOCACAO PARA PRESTACAO DE SERVICO', '', 'ATT.',
  '--CORPO DO EMAIL', 'CONTENT-TYPE: TEXT/PLAIN; NAME="CONVOCACAO PRESTACAO SERVICO.TXT"', 'CONTENT-DISPOSITION: ATTACHMENT; FILENAME="CONVOCACAO PRESTACAO SERVICO.TXT"',
  TXT_OS, '--CORPO DO EMAIL--', '',
].join('\r\n')

// base64 sem Buffer (o tsconfig do app só conhece o navegador)
const b64 = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s)))
const b64url = (s: string) => b64(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

describe('leitor do e-mail bruto do Gmail', () => {
  it('decodifica base64/base64url e quoted-printable com acentos', () => {
    expect(base64ParaTexto(b64url('Convocação ção'))).toBe('Convocação ção')
    expect(base64ParaTexto(b64('a\u0000b'))).toBe('ab')
    expect(quotedPrintableParaTexto('Pend=C3=AAncia resol=\r\nvida')).toBe('Pendência resolvida')
    expect(decodificarCabecalho('=?UTF-8?B?UmVzb2x1w6fDo28=?= do PEPT')).toBe('Resolução do PEPT')
    expect(decodificarCabecalho('=?utf-8?Q?Pend=C3=AAncia_resolvida?=')).toBe('Pendência resolvida')
    // o SIOPI manda assunto e corpo em ISO-8859-1
    expect(decodificarCabecalho('=?ISO-8859-1?Q?Resolu=E7=E3o_do_PEPT_da_OS?=')).toBe('Resolução do PEPT da OS')
    expect(quotedPrintableParaTexto('pend=EAncia', 'ISO-8859-1')).toBe('pendência')
  })

  it('e-mail de PEPT do SIOPI (HTML em ISO-8859-1 quoted-printable) vira texto com acentos', () => {
    const m = ['From: siopi@caixa.gov.br', 'Subject: =?ISO-8859-1?Q?Resolu=E7=E3o_do_PEPT_da_OS?=', 'Content-Type: multipart/mixed; boundary="p"', '',
      '--p', 'Content-Type: text/html; charset=ISO-8859-1', 'Content-Transfer-Encoding: quoted-printable', '',
      '<HTML><HEAD><TITLE>Recupera=E7=E3o de Acesso</TITLE><STYLE>P { margin: 0 }</STYLE></HEAD><BODY><P>Prezados(as),<BR>1 - A pend=EAncia aberta para a OS 7886.2976=', '.001200002/2026.01.01 foi resolvida.<BR>Munic=EDpio: JARU</P></BODY></HTML>', '--p--', ''].join('\r\n')
    const e = lerMime(m)
    expect(e.assunto).toBe('Resolução do PEPT da OS')
    // o título e o CSS do cabeçalho HTML não entram no texto
    expect(e.corpo.startsWith('Prezados(as),')).toBe(true)
    expect(e.corpo).toContain('A pendência aberta para a OS 7886.2976.001200002/2026.01.01 foi resolvida.')
    expect(e.corpo).toContain('Município: JARU')
    expect(tipoEmail({ ...e, anexo: undefined })).toBe('pept')
  })

  it('separa remetente e nome (sem nome usa a parte antes do @)', () => {
    expect(lerRemetente('AG2976@CAIXA.GOV.BR')).toEqual({ de: 'ag2976@caixa.gov.br', nome: 'AG2976' })
    expect(lerRemetente('"CIHARNO09" <ciharno09@caixa.gov.br>')).toEqual({ de: 'ciharno09@caixa.gov.br', nome: 'CIHARNO09' })
  })

  it('lê a convocação da Caixa: cabeçalhos, texto e o .txt da O.S. (limpo dos NUL)', () => {
    const e = lerMime(MIME_OS)
    expect(e.de).toBe('ag2976@caixa.gov.br')
    expect(e.assunto).toBe('Convocação de Ordem da Serviço 7886.2976.001200001/2026.01.01')
    expect(e.data).toBe('2026-10-29T13:55:18.000Z')
    expect(e.corpo).toBe('A EMPRESA\n      CONVOCACAO PARA PRESTACAO DE SERVICO\n\nATT.')
    expect(e.anexo?.nome).toBe('CONVOCACAO PRESTACAO SERVICO.TXT')
    expect(e.anexo?.texto).toContain('Referência: Ordem de Serviço - 7886.2976.001200001/2026.01.01')
    expect(e.anexo?.texto).not.toContain('\u0000')
    expect(e.anexo?.texto).toContain('R$ 350,00\n')
  })

  it('o .txt que sai do e-mail é lido pelo leitor do SIOPI', () => {
    const r = lerSiopiTxt(lerMime(MIME_OS).anexo!.texto, 12, new Date('2026-10-29T12:00:00'))
    expect(r.referencia).toBe('7886.2976.001200001/2026.01.01')
    expect(r.tipologia).toBe('G416')
    expect(r.valorServico).toBe(200)
    expect(r.valorDeslocamento).toBe(350)
    expect(r.endereco.cidade).toBe('Jaru')
    expect(r.contato.toUpperCase()).toBe('CONTATO DE EXEMPLO')
    expect(r.telefone).toBe('(69)99999-0000')
  })

  it('e-mail simples (sem multipart) e em HTML viram texto', () => {
    const simples = lerMime('From: siopi@caixa.gov.br\r\nSubject: Resolução do PEPT da OS\r\nDate: Mon, 09 Nov 2026 22:29:01 +0000\r\n\r\nPrezados,\r\n1 - A pendência aberta para a OS 7886.2976.001200002/2026.01.01 foi resolvida.\r\n')
    expect(simples.corpo).toContain('foi resolvida')
    expect(simples.anexo).toBeUndefined()
    const html = lerMime('From: x@caixa.gov.br\r\nContent-Type: text/html; charset=utf-8\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\n<p>Ol=C3=A1,</p><p>Prazo <b>prorrogado</b>.</p>')
    expect(html.corpo).toBe('Olá,\nPrazo prorrogado.')
  })

  it('multipart/alternative dentro de multipart/mixed: pega o texto e o anexo', () => {
    const m = ['From: a@caixa.gov.br', 'Subject: Aviso', 'Content-Type: multipart/mixed; boundary="ext"', '',
      '--ext', 'Content-Type: multipart/alternative; boundary="int"', '', '--int', 'Content-Type: text/plain', '', 'Texto simples', '--int', 'Content-Type: text/html', '', '<b>Texto</b> html', '--int--',
      '--ext', 'Content-Type: text/plain; name="OS.txt"', 'Content-Transfer-Encoding: base64', 'Content-Disposition: attachment; filename="OS.txt"', '', b64('Referência: 7886.1831.001200003/2026.01.01'), '--ext--', ''].join('\r\n')
    const e = lerMime(m)
    expect(e.corpo).toBe('Texto simples')
    expect(e.anexo).toEqual({ nome: 'OS.txt', texto: 'Referência: 7886.1831.001200003/2026.01.01' })
  })

  it('emailDoGmail monta o Email do sistema (id gm-, data do internalDate, tipo O.S.)', () => {
    const e = emailDoGmail('abc123', b64url(MIME_OS), '1793282118000')
    expect(e.id).toBe('gm-abc123')
    expect(e.recebidoEm).toBe('2026-10-29T13:55:18.000Z')
    expect(e.lido).toBe(false)
    expect(tipoEmail(e)).toBe('os')
    // sem internalDate usa o cabeçalho Date
    expect(emailDoGmail('x', b64url(MIME_OS)).recebidoEm).toBe('2026-10-29T13:55:18.000Z')
  })
})

describe('arquivo da Caixa de entrada (emails.json)', () => {
  const um = { id: 'gm-1', de: 'ag2976@caixa.gov.br', nome: 'AG2976', assunto: 'Convocação', corpo: 'x', recebidoEm: '2026-10-29T13:55:18.000Z', lido: false, anexo: { nome: 'OS.TXT', texto: 'Referência: 7886.2976.001200001/2026.01.01' } }

  it('lê a lista (ou { emails }) e ignora itens sem id/remetente/data', () => {
    expect(lerArquivoCaixaDeEntrada(JSON.stringify([um, { id: 'sem-de' }, 'lixo'])).emails).toHaveLength(1)
    expect(lerArquivoCaixaDeEntrada(JSON.stringify({ emails: [um] })).emails[0].anexo?.nome).toBe('OS.TXT')
    expect(lerArquivoCaixaDeEntrada('{').erro).toMatch(/JSON/)
    expect(lerArquivoCaixaDeEntrada('{"x":1}').erro).toMatch(/lista/)
    expect(lerArquivoCaixaDeEntrada(JSON.stringify([{ ...um, nome: undefined, lido: 'sim' }])).emails[0]).toMatchObject({ nome: 'AG2976', lido: false })
  })

  it('ligação com o script do Gmail: endereço com token e "desde", resposta ok/erro', () => {
    expect(urlPonteGmail('', 'x')).toBe('')
    expect(urlPonteGmail('https://script.google.com/macros/s/ABC/exec', 'segredo', '2026-11-01T00:00:00.000Z')).toBe('https://script.google.com/macros/s/ABC/exec?token=segredo&desde=1793491200')
    expect(urlPonteGmail('https://x/exec?a=1', '')).toBe('https://x/exec?a=1')
    // sem última sincronização busca 10 dias; com ela, 2 dias antes (o id repete, não duplica)
    expect(desdeParaSincronizar(undefined, new Date('2026-11-10T12:00:00Z'))).toBe('2026-10-31T12:00:00.000Z')
    expect(desdeParaSincronizar('2026-11-10T12:00:00Z')).toBe('2026-11-08T12:00:00.000Z')
    expect(lerRespostaPonte(JSON.stringify({ ok: false, erro: 'Token inválido.' })).erro).toBe('Token inválido.')
    expect(lerRespostaPonte('<html>').erro).toMatch(/JSON/)
    expect(lerRespostaPonte(JSON.stringify({ ok: true, emails: [um] })).emails).toHaveLength(1)
  })

  it('mesclar só acrescenta ids novos e preserva o que o usuário já marcou', () => {
    const atual = { ...um, lido: true, importadaId: 'os-9' }
    const r = mesclarEmails([atual], [{ ...um, lido: false }, { ...um, id: 'gm-2' }, { ...um, id: 'gm-2' }])
    expect(r.novos).toBe(1)
    expect(r.emails.map((e) => e.id)).toEqual(['gm-2', 'gm-1'])
    expect(r.emails[1]).toMatchObject({ lido: true, importadaId: 'os-9' })
    // acima do limite ficam só os mais recentes
    const muitos = Array.from({ length: 5 }, (_, i) => ({ ...um, id: `gm-${i}`, recebidoEm: `2026-11-0${i + 1}T00:00:00.000Z` }))
    expect(mesclarEmails([], muitos, 3).emails.map((e) => e.id)).toEqual(['gm-4', 'gm-3', 'gm-2'])
  })
})
