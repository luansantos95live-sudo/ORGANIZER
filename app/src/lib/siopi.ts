import { addDays, format, parse } from 'date-fns'
import type { OS, Tipologia, TipoServico } from '../types'

/** Rascunho de O.S. lido de um arquivo .txt do SIOPI. Campos que o arquivo não traz ficam vazios para revisão. */
export interface RascunhoOS {
  referencia: string
  tipo: TipoServico
  tipologia: Tipologia
  proponente: string
  contato: string
  telefone: string
  endereco: OS['endereco']
  matricula: string
  valorServico: number
  valorDeslocamento: number
  emissao: string // yyyy-mm-dd
  prazo: string // yyyy-mm-dd
  avisos: string[]
}

export const REFERENCIA_RE = /\d{4}\.\d{4}\.\d{8}\/\d{4}\.\d{2}\.\d{2}(?:\.\d{2}\.\d{2})?/

const TIPOLOGIA_PADRAO: Record<TipoServico, Tipologia> = { AVALIACAO: 'A413', VISTORIA_RAE: 'E004', PCI_PLS: 'C021', REAVALIACAO: 'R017' }

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

function detectarTipo(texto: string): TipoServico {
  const t = texto.toLowerCase()
  if (/reavalia/.test(t)) return 'REAVALIACAO'
  if (/(vistoria|rae|evolu[cç][aã]o de obra)/.test(t)) return 'VISTORIA_RAE'
  if (/\b(pci|pls)\b/.test(t)) return 'PCI_PLS'
  return 'AVALIACAO'
}

export function lerSiopiTxt(texto: string, prazoDias = 12): RascunhoOS {
  const avisos: string[] = []
  const refMatch = texto.match(REFERENCIA_RE)
  const referencia = refMatch ? refMatch[0] : ''
  if (!referencia) avisos.push('Referência da O.S. não encontrada.')

  // data de emissão vem da própria referência (…/AAAA.MM.DD…)
  let emissao = format(new Date(), 'yyyy-MM-dd')
  const dataRef = referencia.match(/\/(\d{4})\.(\d{2})\.(\d{2})/)
  if (dataRef) emissao = `${dataRef[1]}-${dataRef[2]}-${dataRef[3]}`
  else if (referencia) avisos.push('Data de emissão não veio na referência; usei hoje.')
  const prazo = format(addDays(parse(emissao, 'yyyy-MM-dd', new Date()), prazoDias), 'yyyy-MM-dd')

  const tipo = detectarTipo(texto)
  const end = lerEndereco(campo(texto, 'Endere[cç]o'))
  const cid = lerCidadeUf(campo(texto, 'Cidade/UF'))
  const cep = (campo(texto, 'CEP') ?? '').replace(/[^\d]/g, '')
  const cepFmt = cep.length === 8 ? `${cep.slice(0, 5)}-${cep.slice(5)}` : (campo(texto, 'CEP') ?? '')

  const valorServico = lerValor(campo(texto, 'Valor previsto do Servi[cç]o'))
  const valorDeslocamento = lerValor(campo(texto, 'Valor previsto do Deslocamento'))
  if (!valorServico) avisos.push('Valor previsto do serviço não encontrado.')

  const proponente = campo(texto, 'Proponente') ?? campo(texto, 'Nome do contato') ?? ''
  const contato = campo(texto, 'Nome do contato') ?? proponente
  if (!end.bairro) avisos.push('Bairro não identificado no endereço; confira antes de salvar.')

  return {
    referencia,
    tipo,
    tipologia: TIPOLOGIA_PADRAO[tipo],
    proponente: maiusculaInicial(proponente),
    contato: maiusculaInicial(contato),
    telefone: campo(texto, 'Telefone contato') ?? campo(texto, 'Telefone') ?? '',
    endereco: { ...end, cidade: cid.cidade, uf: cid.uf, cep: cepFmt },
    matricula: (campo(texto, 'Matr[ií]cula') ?? '').replace(/[^\d]/g, ''),
    valorServico,
    valorDeslocamento,
    emissao,
    prazo,
    avisos,
  }
}

export const REFERENCIA_VALIDA = (r: string) => REFERENCIA_RE.test(r)
