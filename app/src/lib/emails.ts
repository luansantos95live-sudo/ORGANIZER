import { subHours, subMinutes } from 'date-fns'
import { poloDe } from './os'
import { lerSiopiTxt } from './siopi'

/**
 * E-mails da Caixa: o único vínculo do sistema com a Caixa é a caixa de entrada do Gmail. Só entram os e-mails
 * de endereços @caixa; quando trazem o .txt da O.S., dá para importar direto.
 */
export interface Email {
  id: string
  de: string // endereço do remetente
  nome: string // nome do remetente
  assunto: string
  corpo: string
  recebidoEm: string // ISO
  anexo?: { nome: string; texto: string }
  lido: boolean
  importadaId?: string // O.S. criada a partir do anexo
  peptOsId?: string // e-mail de PEPT resolvida já aplicado nesta O.S. (o prazo voltou a contar)
}

/** Remetente da Caixa: endereço que termina em @caixa.gov.br (ou outro domínio @caixa). */
export const ehDaCaixa = (de: string) => /@caixa(\.[a-z]+)*\s*$/i.test(de.trim())

export type TipoEmail = 'os' | 'finalizada' | 'pept' | 'cancelamento' | 'prazo' | 'aviso'
export const TIPO_EMAIL: Record<TipoEmail, string> = { os: 'O.S. nova', finalizada: 'O.S. finalizada', pept: 'PEPT resolvida', cancelamento: 'Cancelamento', prazo: 'Prazo', aviso: 'Aviso' }

/**
 * E-mail da Caixa sobre PEPT: é sempre o aviso de que a pendência foi resolvida (dito pelo usuário em 20/10).
 * Vale quando o assunto fala de PEPT/pendência ou o texto diz que a pendência "foi resolvida"
 * (o e-mail de O.S. nova pode citar "pendência" no texto e não conta).
 */
const PEPT_ASSUNTO = /\bpept\b|pend[êe]ncia/i
const PEPT_CORPO = /pend[êe]ncia[\s\S]{0,120}?resolvida/i
const REF = /\d{4}\.\d{4}\.\d{8,9}\/\d{4}(?:\.\d{2}){2,5}/
const ehPept = (e: { assunto: string; corpo?: string; anexo?: unknown }) => !e.anexo && (PEPT_ASSUNTO.test(e.assunto) || PEPT_CORPO.test(e.corpo ?? ''))

/** Referência da O.S. cuja PEPT foi resolvida (ou null se o e-mail não for desse tipo ou não trouxer o número). */
export function refPeptResolvida(e: Pick<Email, 'assunto' | 'corpo'> & { anexo?: unknown }): string | null {
  if (!ehPept(e)) return null
  return `${e.assunto}\n${e.corpo}`.match(REF)?.[0] ?? null
}

export function tipoEmail(e: Pick<Email, 'assunto' | 'anexo'> & { corpo?: string }): TipoEmail {
  if (ehPept(e)) return 'pept'
  const t = e.assunto.toLowerCase()
  if (/^aviso/.test(t)) return 'aviso'
  if (/cancel/.test(t)) return 'cancelamento'
  if (/prazo|prorroga/.test(t)) return 'prazo'
  // "Conclusão da Ordem de Serviço" sem anexo: a Caixa avisa que a O.S. foi finalizada (24/11: aba própria)
  if (/conclus[aã]o/.test(t) && !e.anexo) return 'finalizada'
  if (e.anexo || /ordem de servi|o\.s\./.test(t)) return 'os'
  return 'aviso'
}

/** Caixa de entrada: só os da Caixa, do mais novo para o mais antigo. */
export const caixaDeEntrada = (lista: Email[]) => lista.filter((e) => ehDaCaixa(e.de)).sort((a, b) => b.recebidoEm.localeCompare(a.recebidoEm))

const txtOS = (ref: string, nome: string, end: string, cidade: string, cep: string, servico: string, desloc: string, contato: string, fone: string) => `ORDEM DE SERVIÇO - AVALIAÇÃO DE IMÓVEL
Referência.: ${ref}
Proponente.: ${nome}
Endereço.: ${end}
Cidade/UF: ${cidade}/RO
CEP......: ${cep}
Valor previsto do Serviço: R$ ${servico}
Valor previsto do Deslocamento: R$ ${desloc}
Nome do contato: ${contato}
Telefone contato: ${fone}
`

/** E-mails de exemplo (fictícios). */
export function emailsExemplo(hoje = new Date()): Email[] {
  return [
    {
      id: 'em-1', de: 'gihab.ariquemes@caixa.gov.br', nome: 'GIHAB Ariquemes', assunto: 'Ordem de Serviço 7886.1831.00099101/2026 - Avaliação de imóvel',
      corpo: 'Prezado(a) credenciado(a),\n\nSegue em anexo a Ordem de Serviço para avaliação de imóvel. Favor observar o prazo de execução.\n\nAtenciosamente,\nGIHAB Ariquemes',
      recebidoEm: subMinutes(hoje, 25).toISOString(), lido: false,
      anexo: { nome: 'OS_7886.1831.00099101.txt', texto: txtOS('7886.1831.00099101/2026.10.20.01.01', 'RENATA SOUZA LIMA', 'RUA DAS PALMEIRAS, 412 - SETOR 05', 'ARIQUEMES', '76873000', '357,00', '15,00', 'renata', '(69) 99210-4433') },
    },
    {
      id: 'em-2', de: 'gihab.jiparana@caixa.gov.br', nome: 'GIHAB Ji-Paraná', assunto: 'Ordem de Serviço 7886.2976.00099102/2026 - Avaliação de imóvel',
      corpo: 'Prezado(a) credenciado(a),\n\nSegue em anexo a Ordem de Serviço. Em caso de pendência documental, abrir PEPT no prazo.\n\nAtenciosamente,\nGIHAB Ji-Paraná',
      recebidoEm: subHours(hoje, 3).toISOString(), lido: false,
      anexo: { nome: 'OS_7886.2976.00099102.txt', texto: txtOS('7886.2976.00099102/2026.10.20.01.01', 'MARCELO ANTUNES ROCHA', 'AV. BRASIL, 1500 - CENTRO', 'JI-PARANA', '76900000', '412,00', '48,00', 'marcelo', '(69) 98422-1180') },
    },
    {
      id: 'em-3', de: 'gihab.ariquemes@caixa.gov.br', nome: 'GIHAB Ariquemes', assunto: 'Prorrogação de prazo - OS 7886.1831.001134632/2026',
      corpo: 'Informamos que o prazo da O.S. em referência foi prorrogado em 5 dias, conforme solicitação.\n\nAtenciosamente,\nGIHAB Ariquemes',
      recebidoEm: subHours(hoje, 20).toISOString(), lido: true,
    },
    {
      id: 'em-4', de: 'cot.ro@caixa.gov.br', nome: 'COT Rondônia', assunto: 'Cancelamento de O.S. 7886.3564.001160299/2026',
      corpo: 'Comunicamos o cancelamento da O.S. em referência a pedido do proponente. Desconsiderar o agendamento.\n\nCOT Rondônia',
      recebidoEm: subHours(hoje, 46).toISOString(), lido: true,
    },
    { ...emailPeptResolvida('7886.3564.009990213/2026.01.01', 'CLIENTE DE EXEMPLO', 'ARIQUEMES', subHours(hoje, 70)), id: 'em-5', lido: true },
  ]
}

/** E-mail de exemplo para o botão "Simular novo e-mail" (testar a notificação). */
export function emailSimulado(n: number, hoje = new Date()): Email {
  const ref = `7886.1831.0009${String(9200 + n).padStart(4, '0')}`
  return {
    id: `em-sim-${n}-${hoje.getTime()}`, de: 'gihab.ariquemes@caixa.gov.br', nome: 'GIHAB Ariquemes', assunto: `Ordem de Serviço ${ref}/2026 - Avaliação de imóvel`,
    corpo: 'Prezado(a) credenciado(a),\n\nSegue em anexo nova Ordem de Serviço.\n\nAtenciosamente,\nGIHAB Ariquemes',
    recebidoEm: hoje.toISOString(), lido: false,
    anexo: { nome: `OS_${ref}.txt`, texto: txtOS(`${ref}/2026.10.20.01.01`, 'CLIENTE DE TESTE ' + n, 'RUA TESTE, 100 - CENTRO', 'ARIQUEMES', '76870000', '357,00', '15,00', 'cliente', '(69) 99999-0000') },
  }
}

/**
 * Arquivo "Caixa de entrada" (emails.json) que o Claude monta a partir do Gmail (scripts/caixa-emails.ts) e o usuário
 * importa na aba E-mails. É uma lista de Email; aceita também { emails: [...] }. Devolve só os itens válidos.
 */
export function lerArquivoCaixaDeEntrada(json: string): { emails: Email[]; erro?: string } {
  let dados: unknown
  try { dados = JSON.parse(json) } catch { return { emails: [], erro: 'Este arquivo não é um JSON válido.' } }
  const lista = Array.isArray(dados) ? dados : dados && typeof dados === 'object' && Array.isArray((dados as { emails?: unknown }).emails) ? (dados as { emails: unknown[] }).emails : null
  if (!lista) return { emails: [], erro: 'O arquivo não tem a lista de e-mails (esperava emails.json da Caixa de entrada).' }
  const texto = (v: unknown) => (typeof v === 'string' ? v : '')
  const emails: Email[] = []
  for (const it of lista) {
    if (!it || typeof it !== 'object') continue
    const e = it as Record<string, unknown>
    if (!texto(e.id) || !texto(e.de) || !texto(e.recebidoEm)) continue
    const anexo = e.anexo && typeof e.anexo === 'object' && texto((e.anexo as Record<string, unknown>).texto) ? { nome: texto((e.anexo as Record<string, unknown>).nome) || 'anexo.txt', texto: texto((e.anexo as Record<string, unknown>).texto) } : undefined
    emails.push({ id: texto(e.id), de: texto(e.de), nome: texto(e.nome) || texto(e.de).split('@')[0].toUpperCase(), assunto: texto(e.assunto), corpo: texto(e.corpo), recebidoEm: texto(e.recebidoEm), lido: e.lido === true, ...(anexo ? { anexo } : {}) })
  }
  return { emails }
}

/**
 * Ligação com o Gmail pelo Google Apps Script (10/11): o script publicado responde em JSON com os e-mails da Caixa.
 * `desde` (ISO) limita a busca; vai como segundos desde 1970 (`after:` do Gmail). Sem `desde`, o script usa os últimos 10 dias.
 * `remetentes` (24/11): os endereços da Caixa escolhidos em Configurações › Gmail; o script só busca os e-mails deles.
 */
export function urlPonteGmail(url: string, token: string, desde?: string, remetentes?: string[]): string {
  const base = url.trim()
  if (!base) return ''
  const p = new URLSearchParams()
  if (token.trim()) p.set('token', token.trim())
  const ms = desde ? Date.parse(desde) : NaN
  if (!isNaN(ms)) p.set('desde', String(Math.floor(ms / 1000)))
  if (remetentes?.length) p.set('de', remetentes.join(','))
  const q = p.toString()
  return q ? `${base}${base.includes('?') ? '&' : '?'}${q}` : base
}

/**
 * Endereços da Caixa digitados em Configurações › Gmail (24/11): "caixa.gov.br, gilie@caixa.gov.br" vira a lista limpa.
 * Aceita domínio (todos os remetentes dele) ou e-mail completo (só ele). Vazio = o padrão do script (@caixa.gov.br).
 */
export function lerRemetentes(v: string): string[] {
  const l = v.split(/[,;\s]+/).map((x) => x.trim().toLowerCase().replace(/^@/, '')).filter((x) => /^[a-z0-9._%+-]*@?[a-z0-9.-]+\.[a-z]{2,}$/.test(x))
  return [...new Set(l)]
}

/** A partir de quando buscar na próxima sincronização: 2 dias antes da última (o id repete, não duplica); sem última, os últimos 10 dias (pedido de 12/11). */
export function desdeParaSincronizar(ultima: string | undefined, agora = new Date()): string {
  const ms = ultima ? Date.parse(ultima) : NaN
  const folga = isNaN(ms) ? agora.getTime() - 10 * 24 * 3600 * 1000 : ms - 2 * 24 * 3600 * 1000
  return new Date(folga).toISOString()
}

/** Resposta do script: { ok: true, emails: [...] } ou { ok: false, erro: '...' } (ou a lista direta). */
export function lerRespostaPonte(json: string): { emails: Email[]; erro?: string } {
  try {
    const d = JSON.parse(json) as { ok?: boolean; erro?: string }
    if (d && typeof d === 'object' && !Array.isArray(d) && d.ok === false) return { emails: [], erro: d.erro || 'O script do Gmail recusou o pedido.' }
  } catch { return { emails: [], erro: 'A resposta do script não é um JSON válido (confira o endereço publicado).' } }
  return lerArquivoCaixaDeEntrada(json)
}

/** Quantos e-mails ficam guardados no navegador (os mais antigos saem; o Gmail continua com todos). */
export const MAX_EMAILS_GUARDADOS = 400

/**
 * Junta os e-mails importados aos que já estão no sistema: só entram ids novos (lido/importada/PEPT dos antigos ficam).
 * Guarda no máximo `maximo` e-mails, os mais recentes, para o armazenamento do navegador não estourar.
 */
export function mesclarEmails(atuais: Email[], novos: Email[], maximo = MAX_EMAILS_GUARDADOS): { emails: Email[]; novos: number } {
  const ids = new Set(atuais.map((e) => e.id))
  const entram = novos.filter((e) => !ids.has(e.id) && (ids.add(e.id), true))
  const todos = [...entram, ...atuais]
  const emails = todos.length > maximo ? [...todos].sort((a, b) => b.recebidoEm.localeCompare(a.recebidoEm)).slice(0, maximo) : todos
  return { emails, novos: entram.length }
}

/** Notificam: O.S. nova e PEPT resolvida (aviso, prazo e cancelamento não notificam). */
export const notificaveis = (lista: Email[]) => caixaDeEntrada(lista).filter((e) => !e.lido && (tipoEmail(e) === 'os' || tipoEmail(e) === 'pept'))

/** E-mail de exemplo de PEPT resolvida (mesmo texto do SIOPI), para testar no laboratório. */
export function emailPeptResolvida(ref: string, cliente: string, cidade: string, hoje = new Date()): Email {
  return {
    id: `em-pept-${hoje.getTime()}-${Math.random().toString(36).slice(2, 6)}`, de: 'siopi@caixa.gov.br', nome: 'SIOPI', assunto: `Pendência resolvida - OS ${ref}`,
    corpo: `Prezados(as),\n1 - A pendência aberta para a OS ${ref} foi resolvida.\n\nDados da Ordem de Serviço:\nNome do Cliente: ${cliente}\nMunicípio: ${cidade}\nUF: RO\n\n2 - Solicitamos verificarem se a resolução atende às exigências para continuidade do atendimento.\n3 - Para dúvidas favor abrir chamado no serviços.caixa.\n\nAtenciosamente,\nSIOPI\nCAIXA ECONÔMICA FEDERAL\n\nEste é um email automático. Favor não responder.`,
    recebidoEm: hoje.toISOString(), lido: false,
  }
}

/**
 * E-mail que mexe no sistema (cria O.S., resolve PEPT): só os que chegaram depois de ligar o Gmail (pedido de 12/11).
 * Os anteriores ficam na caixa de entrada só para consulta. Sem data de corte, todos mexem.
 */
export const emailInterage = (e: Pick<Email, 'recebidoEm'>, ativoDesde?: string) => !ativoDesde || e.recebidoEm >= ativoDesde

/** Abas da caixa de entrada (24/11): O.S. recebidas, O.S. finalizadas, PEPT resolvidas e o resto como notificação. */
export type GrupoEmail = 'recebidas' | 'finalizadas' | 'pept' | 'gerais'
export const GRUPOS_EMAIL: { id: GrupoEmail; rotulo: string }[] = [
  { id: 'recebidas', rotulo: 'O.S. recebidas' },
  { id: 'finalizadas', rotulo: 'O.S. finalizadas' },
  { id: 'pept', rotulo: 'PEPT resolvidas' },
  { id: 'gerais', rotulo: 'Notificações gerais' },
]

/** Em qual aba o e-mail fica: cancelamento, prazo e aviso vão para Notificações gerais. */
export function grupoEmail(e: Pick<Email, 'assunto' | 'anexo'> & { corpo?: string }): GrupoEmail {
  const t = tipoEmail(e)
  return t === 'os' ? 'recebidas' : t === 'finalizada' ? 'finalizadas' : t === 'pept' ? 'pept' : 'gerais'
}

/** Polo da O.S. do e-mail, pela cidade do .txt anexo (24/11); null quando o e-mail não traz a O.S. */
export function poloDoEmail(e: Pick<Email, 'anexo'>): string | null {
  if (!e.anexo) return null
  const cidade = lerSiopiTxt(e.anexo.texto).endereco.cidade
  return cidade ? poloDe(cidade) : 'OUTROS'
}

/** E-mails separados por polo (24/11): polos em ordem alfabética, "OUTROS" e "SEM POLO" no fim; a ordem dos e-mails é mantida. */
export function porPolo<T extends Pick<Email, 'anexo'>>(lista: T[]): { polo: string; emails: T[] }[] {
  const grupos = new Map<string, T[]>()
  for (const e of lista) {
    const polo = poloDoEmail(e) ?? 'SEM POLO'
    grupos.set(polo, [...(grupos.get(polo) ?? []), e])
  }
  const peso = (p: string) => (p === 'SEM POLO' ? 2 : p === 'OUTROS' ? 1 : 0)
  return [...grupos.entries()]
    .sort(([a], [b]) => peso(a) - peso(b) || a.localeCompare(b))
    .map(([polo, emails]) => ({ polo, emails }))
}
