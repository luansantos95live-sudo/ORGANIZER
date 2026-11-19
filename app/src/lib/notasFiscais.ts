import type { NotaFiscal } from '../types'

/** O que dá para tirar de um XML de nota fiscal de serviço (NFS-e no padrão ABRASF ou no padrão nacional). */
export interface NotaLida {
  numero: string
  data: string // yyyy-MM-dd (competência ou emissão)
  valor: number
}

/** Primeiro conteúdo de uma das tags (aceita prefixo de namespace, ex.: <ns2:ValorServicos>). */
function tag(xml: string, nomes: string[]): string | undefined {
  for (const n of nomes) {
    const m = xml.match(new RegExp(`<(?:[\\w-]+:)?${n}(?:\\s[^>]*)?>\\s*([^<]+?)\\s*</(?:[\\w-]+:)?${n}>`, 'i'))
    if (m) return m[1]
  }
  return undefined
}

/**
 * Lê valor, data e número de um XML de NFS-e. Valor: valor dos serviços (ou o total/líquido quando não houver);
 * data: competência (ou emissão). Devolve null se não achar valor e data.
 */
export function lerNotaXML(xml: string): NotaLida | null {
  const bruto = tag(xml, ['ValorServicos', 'vServ', 'ValorTotal', 'vNF', 'ValorLiquidoNfse', 'vLiq'])
  const data = tag(xml, ['Competencia', 'dCompet', 'DataEmissao', 'dhEmi', 'dEmi'])
  if (!bruto || !data) return null
  // XML usa ponto decimal; se vier "1.234,56", converte
  const valor = Number(bruto.includes(',') ? bruto.replace(/\./g, '').replace(',', '.') : bruto)
  const dia = data.slice(0, 10)
  if (!Number.isFinite(valor) || !/^\d{4}-\d{2}-\d{2}$/.test(dia)) return null
  const numero = tag(xml, ['nNFSe', 'NumeroNfse', 'Numero', 'nNF']) ?? ''
  return { numero: numero.trim(), data: dia, valor }
}

/**
 * Junta notas lidas às que já existem, somando por mês. Nota com o mesmo número no mesmo mês não entra de novo.
 * Devolve a lista em ordem de mês.
 */
export function juntarNotas(atuais: NotaFiscal[], novas: NotaLida[]): { lista: NotaFiscal[]; entraram: number; repetidas: number } {
  const porMes = new Map(atuais.map((n) => [n.mes, { ...n, numeros: [...n.numeros] }]))
  let entraram = 0
  let repetidas = 0
  for (const n of novas) {
    const mes = n.data.slice(0, 7)
    const atual = porMes.get(mes) ?? { mes, valor: 0, numeros: [] }
    if (n.numero && atual.numeros.includes(n.numero)) { repetidas++; continue }
    atual.valor = Math.round((atual.valor + n.valor) * 100) / 100
    if (n.numero) atual.numeros.push(n.numero)
    porMes.set(mes, atual)
    entraram++
  }
  return { lista: [...porMes.values()].sort((a, b) => a.mes.localeCompare(b.mes)), entraram, repetidas }
}

/** Valor da nota de um mês (yyyy-MM), ou undefined se não houver. */
export const notaDoMes = (lista: NotaFiscal[] | undefined, mes: string) => lista?.find((n) => n.mes === mes)?.valor
