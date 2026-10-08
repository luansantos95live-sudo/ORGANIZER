import { addMonths, format, parse } from 'date-fns'
import type { Config } from '../types'

/** "469,15" ou "1.234,56": vírgula decimal, ponto de milhar, sem o símbolo R$ (padrão do texto do RRT). */
const ou = (v: string, vazio = '________') => (v.trim() ? v.trim() : vazio)

export const valorRRT = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/**
 * Descrição do serviço de cada Endereço do RRT Múltiplo Mensal.
 * N é o total de O.S. do mês inteiro (o número do Relatório de Conferência), igual para todas as O.S.
 */
export function descricaoRRT(referenciaCompleta: string, totalOS: number, valor: number, contratoRRT: string) {
  return `PRESTAÇÃO DE ${totalOS} SERVIÇO DE ENGENHARIA A CAIXA CONFORME O CONTRATO N.º ${ou(contratoRRT)} / ORDEM DE SERVIÇO N° ${referenciaCompleta} - VALOR OS + DESLOCAMENTO: R$ ${valorRRT(valor)}`
}

/** Mês dos serviços ("yyyy-MM") a partir da data de emissão: sempre o mês imediatamente anterior. */
export function mesDosServicos(emissao: Date) {
  return format(addMonths(new Date(emissao.getFullYear(), emissao.getMonth(), 1), -1), 'yyyy-MM')
}

/** Mês em que a nota deve ser emitida: o seguinte ao dos serviços. */
export function mesDaEmissao(mesServico: string) {
  return format(addMonths(parse(mesServico + '-01', 'yyyy-MM-dd', new Date()), 1), 'yyyy-MM')
}

export function descricaoNF(mesServico: string, dataRelatorio: string | undefined, c: Config['contrato']) {
  const [ano, mes] = mesServico.split('-')
  const dr = dataRelatorio ? dataRelatorio.split('-').reverse().join('/') : '__/__/____'
  return `PRESTAÇÃO DE SERVIÇOS TÉCNICOS DE ENGENHARIA/ARQUITETURA EXECUTADOS ATÉ O MÊS ${mes}/${ano}, CONFORME CONTRATO N.º ${ou(c.numero)}, ORIUNDO DO EDITAL DE CREDENCIAMENTO N.º ${ou(c.edital)}, ASSINADO COM A CAIXA, CUJOS ITENS, VALORES UNITÁRIOS E TOTAIS CONSTAM DO RELATÓRIO PARA CONFERÊNCIA DAS ORDENS DE SERVIÇOS, RECEBIDO EM ${dr} DA CAIXA, QUE COMPÕE ESTE DOCUMENTO FISCAL COMO ANEXO. PROCESSO ADMINISTRATIVO N.º ${ou(c.processo)}.`
}

export type Conferencia = { tipo: 'sem-extrato' } | { tipo: 'bate'; dif: 0 } | { tipo: 'diferente'; dif: number }

/** Compara o total do sistema com o do Relatório de Conferência, com tolerância de 1 centavo. */
export function conferirExtrato(totalSistema: number, totalExtrato: number | undefined): Conferencia {
  if (totalExtrato === undefined || Number.isNaN(totalExtrato) || totalExtrato <= 0) return { tipo: 'sem-extrato' }
  const dif = Math.round((totalExtrato - totalSistema) * 100) / 100
  return Math.abs(dif) < 0.01 ? { tipo: 'bate', dif: 0 } : { tipo: 'diferente', dif }
}

/** Dados fixos de tributação do serviço (públicos). Razão social e CNPJ de quem emite vêm das Configurações. */
export const SERVICO_NF = { regime: 'Simples Nacional (ME/EPP), alíquota aproximada de 2,00%', codigoTributacao: '07.01.01 · Engenharia e congêneres' }
export const TOMADOR = { razao: 'CAIXA ECONOMICA FEDERAL', cnpj: '00.360.305/0001-04', endereco: 'Setor SBS, Quadra 4, Bloco A · Asa Sul · Brasília/DF · 70.092-900' }
