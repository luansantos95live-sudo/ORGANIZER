import { subHours, subMinutes } from 'date-fns'

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

export type TipoEmail = 'os' | 'pept' | 'cancelamento' | 'prazo' | 'aviso'
export const TIPO_EMAIL: Record<TipoEmail, string> = { os: 'O.S. nova', pept: 'PEPT resolvida', cancelamento: 'Cancelamento', prazo: 'Prazo', aviso: 'Aviso' }

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
