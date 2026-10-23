import { format } from 'date-fns'
import type { Importacao, OS, Tipologia } from '../types'
import { IMPORTACAO_VAZIA, TIPOLOGIAS, prazoDaTipologia } from './os'

/** Rascunho de O.S. lido de um arquivo .txt da Caixa. Campos que o arquivo não traz ficam vazios para revisão. */
export interface RascunhoOS {
  referencia: string
  tipologia: Tipologia
  proponente: string
  documento: string
  contato: string
  telefone: string
  endereco: OS['endereco']
  matricula: string
  valorServico: number
  valorDeslocamento: number
  emissao: string // yyyy-mm-dd
  prazo: string // yyyy-mm-dd
  descricao: string
  importacao: Importacao
  avisos: string[]
}

/**
 * Nº da O.S. da Caixa. Formato do sistema real: 7886.1831.001122004/2026.01.01 (9 dígitos);
 * também aceita o formato antigo com a data de emissão: 7886.1831.00012345/2026.09.10.01.01.
 */
export const REFERENCIA_RE = /\d{4}\.\d{4}\.\d{8,9}\/\d{4}\.\d{2}\.\d{2}(?:\.\d{2}\.\d{2})?/

/** "R$ 1.234,56" ou "1234,56" ou "1234.56" → 1234.56 */
export function lerValor(txt: string | undefined): number {
  if (!txt) return 0
  let s = txt.replace(/R\$\s*/i, '').replace(/[^\d.,-]/g, '').trim()
  if (!s) return 0
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

/** Pega o valor depois de um rótulo como "Endereço.:" ou "CEP......:" (pontos de preenchimento opcionais). */
function campo(texto: string, rotulo: string): string | undefined {
  const re = new RegExp(`^[ \\t]*${rotulo}[ \\t.]*:[ \\t]*(.*)$`, 'im')
  const m = texto.match(re)
  const v = m?.[1]?.trim()
  return v ? v : undefined
}

function maiusculaInicial(s: string) {
  const menores = new Set(['de', 'da', 'do', 'das', 'dos', 'e'])
  return s
    .toLowerCase()
    .split(/(\s+|-)/)
    .map((p, i) => (i > 0 && menores.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join('')
}

/** "RUA CURITIBA, 13 - SOL NASCENTE" → logradouro, número (0 vira SN) e bairro. */
export function lerEndereco(linha: string | undefined) {
  const bruto = (linha ?? '').trim()
  const vazio = { logradouro: '', numero: 'SN', bairro: '' }
  if (!bruto) return vazio
  // logradouro, número - bairro   |   logradouro, número, bairro
  const m = bruto.match(/^(.*?),\s*(\d+|S\/?N)\s*(?:[-–,]\s*(.+))?$/i)
  if (m) {
    const n = m[2].toUpperCase()
    return { logradouro: maiusculaInicial(m[1].trim()), numero: n === '0' || n.startsWith('S') ? 'SN' : n, bairro: maiusculaInicial((m[3] ?? '').trim()) }
  }
  const partes = bruto.split(/\s+[-–]\s+/)
  if (partes.length >= 2) return { logradouro: maiusculaInicial(partes[0]), numero: 'SN', bairro: maiusculaInicial(partes.slice(1).join(' - ')) }
  return { ...vazio, logradouro: maiusculaInicial(bruto) }
}

export function lerCidadeUf(linha: string | undefined) {
  const bruto = (linha ?? '').trim()
  const m = bruto.match(/^(.*?)\s*[/\-]\s*([A-Za-z]{2})$/)
  if (m) return { cidade: maiusculaInicial(m[1].trim()), uf: m[2].toUpperCase() }
  return { cidade: maiusculaInicial(bruto), uf: 'RO' }
}

/** Tipologia pelo código que vier no texto (ex.: B438); sem código, pelas palavras do serviço. */
export function detectarTipologia(texto: string): Tipologia {
  const cod = (Object.keys(TIPOLOGIAS) as Tipologia[]).find((c) => new RegExp(`\\b${c}\\b`).test(texto))
  if (cod) return cod
  const t = texto.toLowerCase()
  if (/reedi[cç][aã]o/.test(t)) return 'G402'
  if (/rean[aá]lise/.test(t)) return 'G014'
  if (/nova vistoria|pend[eê]ncias/.test(t)) return 'G416'
  if (/reprograma/.test(t)) return 'E005'
  if (/(acompanhamento|vistoria de obra|evolu[cç][aã]o de obra|\brae\b)/.test(t)) return 'E401'
  if (/altera[cç][aã]o de projeto/.test(t)) return 'G012'
  if (/terreno pr[oó]prio/.test(t)) return 'B437'
  if (/(an[aá]lise de proposta|projeto de constru)/.test(t)) return 'B438'
  return 'A413'
}

export function lerSiopiTxt(texto: string, prazoDias = 12, hoje = new Date()): RascunhoOS {
  const avisos: string[] = []
  const refMatch = texto.match(REFERENCIA_RE)
  const referencia = refMatch ? refMatch[0] : ''
  if (!referencia) avisos.push('Referência da O.S. não encontrada.')

  // Data de recebimento: rótulo do arquivo; senão a data embutida no formato antigo da referência; senão hoje.
  let emissao = format(hoje, 'yyyy-MM-dd')
  const dataTxt = campo(texto, 'Data (?:de )?(?:emiss[aã]o|recebimento)')?.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  const dataRef = referencia.match(/\/(\d{4})\.(\d{2})\.(\d{2})\.\d{2}\.\d{2}$/)
  if (dataTxt) emissao = `${dataTxt[3]}-${dataTxt[2]}-${dataTxt[1]}`
  else if (dataRef) emissao = `${dataRef[1]}-${dataRef[2]}-${dataRef[3]}`
  else if (referencia) avisos.push('Data de recebimento não veio no arquivo; usei hoje.')
  // Prazo: o do arquivo; senão o prazo da tipologia (cadastro); senão o prazo padrão.
  const tipologia = detectarTipologia(texto)
  const prazoTxt = campo(texto, 'Prazo')?.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  const prazo = prazoTxt ? `${prazoTxt[3]}-${prazoTxt[2]}-${prazoTxt[1]}` : prazoDaTipologia(tipologia, emissao, prazoDias)

  const end = lerEndereco(campo(texto, 'Endere[cç]o'))
  const cid = lerCidadeUf(campo(texto, 'Cidade/UF'))
  const cep = (campo(texto, 'CEP') ?? '').replace(/[^\d]/g, '')
  const cepFmt = cep.length === 8 ? `${cep.slice(0, 5)}-${cep.slice(5)}` : (campo(texto, 'CEP') ?? '')

  const valorServico = lerValor(campo(texto, 'Valor previsto do Servi[cç]o'))
  const valorDeslocamento = lerValor(campo(texto, 'Valor previsto do Deslocamento'))
  if (!valorServico) avisos.push('Valor previsto do serviço não encontrado.')

  const proponente = campo(texto, 'Proponente') ?? campo(texto, 'Cliente') ?? campo(texto, 'Nome do contato') ?? ''
  const contato = campo(texto, 'Nome do contato') ?? proponente
  if (!end.bairro) avisos.push('Bairro não identificado no endereço; confira antes de salvar.')

  const importacao: Importacao = {
    ...IMPORTACAO_VAZIA,
    codProduto: campo(texto, 'C[oó]d(?:igo)?\\.? ?(?:do )?Produto') ?? '',
    codLinha: campo(texto, 'C[oó]d(?:igo)?\\.? ?(?:da )?Linha') ?? '',
    codFonte: campo(texto, 'C[oó]d(?:igo)?\\.? ?(?:da )?Fonte') ?? '',
    cartorio: campo(texto, 'Cart[oó]rio(?: \\(?Of[ií]cio\\)?)?') ?? '',
    livro: campo(texto, 'Livro') ?? '',
    localRetirada: campo(texto, 'Local (?:de )?Retirada') ?? '',
    solicitante: campo(texto, 'Solicitante') ?? '',
    executante: campo(texto, 'Executante') ?? '',
  }

  return {
    referencia,
    tipologia,
    proponente: maiusculaInicial(proponente),
    documento: campo(texto, 'CPF/CNPJ') ?? campo(texto, 'CPF') ?? campo(texto, 'CNPJ') ?? '',
    contato: maiusculaInicial(contato),
    telefone: campo(texto, 'Telefone contato') ?? campo(texto, 'Telefone') ?? '',
    endereco: { ...end, cidade: cid.cidade, uf: cid.uf, cep: cepFmt },
    matricula: (campo(texto, 'Matr[ií]cula') ?? campo(texto, 'N[º°o]? ?Registro') ?? '').replace(/[^\d]/g, ''),
    valorServico,
    valorDeslocamento,
    emissao,
    prazo,
    descricao: campo(texto, 'Descri[cç][aã]o') ?? '',
    importacao,
    avisos,
  }
}

export const REFERENCIA_VALIDA = (r: string) => REFERENCIA_RE.test(r)
