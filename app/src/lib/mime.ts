/**
 * Leitor do e-mail bruto (MIME) que o Gmail devolve em base64url — usado pela ponte Claude → sistema
 * (scripts/caixa-emails.ts): o Claude pega o e-mail bruto da Caixa pelo Gmail, e daqui saem remetente,
 * assunto, texto e o anexo .txt da O.S. Sem dependências: roda no navegador e no Node.
 */
import type { Email } from './emails'

export interface EmailBruto {
  de: string
  nome: string
  para: string
  assunto: string
  data: string // ISO; '' se o cabeçalho não veio
  corpo: string
  anexo?: { nome: string; texto: string }
}

/** bytes → texto no charset declarado (utf-8, iso-8859-1, windows-1252…); charset desconhecido cai em UTF-8. */
function bytesParaTexto(bytes: Uint8Array, charset = 'utf-8'): string {
  let dec: TextDecoder
  try { dec = new TextDecoder(charset || 'utf-8') } catch { dec = new TextDecoder('utf-8') }
  return dec.decode(bytes).replace(/\u0000+/g, '')
}

/** base64 ou base64url → texto (NUL e lixo de preenchimento removidos). */
export function base64ParaTexto(b64: string, charset = 'utf-8'): string {
  const s = b64.replace(/-/g, '+').replace(/_/g, '/').replace(/\s+/g, '')
  const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : ''
  const bin = atob(s + pad)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytesParaTexto(bytes, charset)
}

/** quoted-printable → texto (o SIOPI manda ISO-8859-1: "pend=EAncia"). */
export function quotedPrintableParaTexto(qp: string, charset = 'utf-8'): string {
  const semQuebras = qp.replace(/=\r?\n/g, '')
  const bytes: number[] = []
  for (let i = 0; i < semQuebras.length; i++) {
    const c = semQuebras[i]
    if (c === '=' && /^[0-9A-Fa-f]{2}$/.test(semQuebras.slice(i + 1, i + 3))) { bytes.push(parseInt(semQuebras.slice(i + 1, i + 3), 16)); i += 2 }
    else bytes.push(c.charCodeAt(0) & 0xff)
  }
  return bytesParaTexto(new Uint8Array(bytes), charset)
}

/** Palavras codificadas de cabeçalho (=?UTF-8?B?...?= / =?ISO-8859-1?Q?...?=) → texto. */
export function decodificarCabecalho(v: string): string {
  return v.replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (_, cs: string, tipo: string, dados: string) =>
    tipo.toUpperCase() === 'B' ? base64ParaTexto(dados, cs) : quotedPrintableParaTexto(dados.replace(/_/g, ' '), cs),
  ).replace(/\?=\s+=\?/g, '?==?').trim()
}

/** Cabeçalhos (linhas dobradas juntadas; nomes em minúsculas). */
export function lerCabecalhos(bloco: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const linha of bloco.replace(/\r?\n[ \t]+/g, ' ').split(/\r?\n/)) {
    const m = linha.match(/^([\w-]+):\s*(.*)$/)
    if (m) out[m[1].toLowerCase()] = m[2].trim()
  }
  return out
}

const parametro = (cabecalho: string | undefined, nome: string) => {
  const m = cabecalho?.match(new RegExp(`${nome}\\s*=\\s*(?:"([^"]*)"|([^;\\s]+))`, 'i'))
  return m ? decodificarCabecalho(m[1] ?? m[2]) : ''
}

/** "Nome <endereco>" ou "endereco" → { de, nome } (nome vazio vira a parte antes do @, ex.: AG2976). */
export function lerRemetente(v: string): { de: string; nome: string } {
  const m = decodificarCabecalho(v).match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/)
  const de = (m ? m[2] : v).trim().toLowerCase()
  const nome = (m ? m[1] : '').trim() || de.split('@')[0].toUpperCase()
  return { de, nome }
}

// Partes em 8bit já chegaram decodificadas junto com a mensagem inteira (UTF-8, como a Caixa manda o .txt);
// base64 e quoted-printable são decodificados aqui no charset que a parte declara.
const corpoDaParte = (cabecalhos: Record<string, string>, bruto: string) => {
  const cte = (cabecalhos['content-transfer-encoding'] ?? '').toLowerCase()
  const charset = parametro(cabecalhos['content-type'], 'charset') || 'utf-8'
  const texto = cte === 'base64' ? base64ParaTexto(bruto, charset) : cte === 'quoted-printable' ? quotedPrintableParaTexto(bruto, charset) : bruto
  return texto.replace(/\r\n/g, '\n').replace(/\u0000+/g, '')
}

/** HTML do e-mail → texto corrido: sem <head>/<title>/<style>, quebras onde havia <br>, <p>, <div> e <tr>, linhas limpas. */
const htmlParaTexto = (html: string) =>
  html
    .replace(/<head[\s\S]*?<\/head>/gi, '').replace(/<title[\s\S]*?<\/title>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|tr|li|h\d)>/gi, '\n').replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim()

/** Lê o e-mail bruto (texto MIME já decodificado do base64): cabeçalhos, texto e o anexo .txt, se houver. */
export function lerMime(mime: string): EmailBruto {
  const corte = mime.search(/\r?\n\r?\n/)
  const cab = lerCabecalhos(corte < 0 ? mime : mime.slice(0, corte))
  const corpoBruto = corte < 0 ? '' : mime.slice(corte).replace(/^\r?\n\r?\n/, '')
  const { de, nome } = lerRemetente(cab.from ?? '')
  const dataCab = cab.date ? new Date(cab.date) : null
  const out: EmailBruto = {
    de, nome, para: decodificarCabecalho(cab.to ?? ''), assunto: decodificarCabecalho(cab.subject ?? ''),
    data: dataCab && !isNaN(dataCab.getTime()) ? dataCab.toISOString() : '', corpo: '',
  }
  const tipo = (cab['content-type'] ?? 'text/plain').toLowerCase()
  const boundary = parametro(cab['content-type'], 'boundary')
  if (!tipo.startsWith('multipart/') || !boundary) {
    out.corpo = tipo.includes('html') ? htmlParaTexto(corpoDaParte(cab, corpoBruto)) : corpoDaParte(cab, corpoBruto).trim()
    return out
  }
  let html = ''
  for (const parte of corpoBruto.split(`--${boundary}`).slice(1)) {
    if (parte.startsWith('--')) break
    const pc = parte.search(/\r?\n\r?\n/)
    const pcab = lerCabecalhos(pc < 0 ? parte : parte.slice(0, pc))
    const pconteudo = pc < 0 ? '' : parte.slice(pc).replace(/^\r?\n\r?\n/, '').replace(/\r?\n$/, '')
    const ptipo = (pcab['content-type'] ?? 'text/plain').toLowerCase()
    const nomeArq = parametro(pcab['content-disposition'], 'filename') || parametro(pcab['content-type'], 'name')
    const ehAnexo = /attachment/i.test(pcab['content-disposition'] ?? '') || (!!nomeArq && !ptipo.startsWith('multipart/'))
    if (ehAnexo) {
      // só o .txt da O.S. interessa (outros anexos ficam no Gmail)
      if (!out.anexo && (ptipo.startsWith('text/') || /\.txt$/i.test(nomeArq))) out.anexo = { nome: nomeArq || 'anexo.txt', texto: corpoDaParte(pcab, pconteudo) }
      continue
    }
    if (ptipo.startsWith('multipart/')) {
      const dentro = lerMime(parte.replace(/^\r?\n/, ''))
      if (!out.corpo) out.corpo = dentro.corpo
      if (!out.anexo && dentro.anexo) out.anexo = dentro.anexo
    } else if (ptipo.startsWith('text/plain')) { if (!out.corpo) out.corpo = corpoDaParte(pcab, pconteudo).trim() }
    else if (ptipo.startsWith('text/html')) { if (!html) html = htmlParaTexto(corpoDaParte(pcab, pconteudo)) }
  }
  if (!out.corpo) out.corpo = html
  return out
}

/**
 * E-mail do Gmail (id da mensagem + `raw` em base64url, como `get_message` com formato RAW devolve) → Email do sistema.
 * `recebidoEm` vem do `internalDate` do Gmail (milissegundos) quando houver; senão do cabeçalho Date.
 */
export function emailDoGmail(id: string, raw: string, internalDate?: string | number): Email {
  const b = lerMime(base64ParaTexto(raw))
  const ms = internalDate !== undefined && internalDate !== '' ? Number(internalDate) : NaN
  return {
    id: `gm-${id}`, de: b.de, nome: b.nome, assunto: b.assunto, corpo: b.corpo,
    recebidoEm: !isNaN(ms) ? new Date(ms).toISOString() : b.data || new Date().toISOString(),
    lido: false, ...(b.anexo ? { anexo: b.anexo } : {}),
  }
}
