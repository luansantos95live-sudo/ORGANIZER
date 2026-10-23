import type { Config, OS, Rota } from '../types'
import { migrarOS, statusReconhecido } from './os'

/** Versão 2: etapas e campos do sistema real. A versão 1 (formato antigo) é convertida na leitura. */
export const VERSAO_BACKUP = 2

export interface DadosBackup {
  os: OS[]
  rotas: Rota[]
  config: Partial<Config>
  fechamentos: Record<string, { extratoTotal?: number; extratoQtd?: number; dataRelatorio?: string; valorNF?: number }>
}

const ehObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

export function montarBackup(d: DadosBackup): string {
  return JSON.stringify({ versao: VERSAO_BACKUP, geradoEm: new Date().toISOString(), ...d }, null, 2)
}

export type ResultadoBackup = { ok: true; dados: DadosBackup; resumo: string } | { ok: false; erro: string }

/** Rotas do formato antigo (uma por dia e responsável, com horários) não têm equivalente: ficam de fora. */
const rotaValida = (r: unknown): r is Rota => ehObjeto(r) && typeof r.codigo === 'string' && Array.isArray(r.paradas) && ehObjeto(r.partida)

/** Lê e valida um arquivo de backup. Qualquer problema devolve erro e nada é substituído. */
export function lerBackup(texto: string): ResultadoBackup {
  let j: unknown
  try { j = JSON.parse(texto) } catch { return { ok: false, erro: 'O arquivo não é um JSON válido.' } }
  if (!ehObjeto(j)) return { ok: false, erro: 'O arquivo não tem o formato de um backup.' }
  if (j.versao !== 1 && j.versao !== VERSAO_BACKUP) return { ok: false, erro: `Versão do backup não suportada (${String(j.versao ?? 'ausente')}).` }
  if (!Array.isArray(j.os)) return { ok: false, erro: 'O backup não traz a lista de O.S.' }
  const refs = new Set<string>()
  const os: OS[] = []
  for (const [i, o] of j.os.entries()) {
    if (!ehObjeto(o)) return { ok: false, erro: `O.S. ${i + 1} inválida.` }
    if (typeof o.id !== 'string' || !o.id) return { ok: false, erro: `O.S. ${i + 1} sem identificador.` }
    if (typeof o.referencia !== 'string' || !o.referencia) return { ok: false, erro: `O.S. ${i + 1} sem referência.` }
    if (!statusReconhecido(o.status)) return { ok: false, erro: `O.S. ${o.referencia} com etapa desconhecida.` }
    if (typeof o.valorServico !== 'number' || typeof o.valorDeslocamento !== 'number') return { ok: false, erro: `O.S. ${o.referencia} com valores inválidos.` }
    if (!ehObjeto(o.endereco)) return { ok: false, erro: `O.S. ${o.referencia} sem endereço.` }
    if (refs.has(o.referencia)) return { ok: false, erro: `Referência repetida no backup: ${o.referencia}.` }
    refs.add(o.referencia)
    os.push(migrarOS(o))
  }
  const rotas = Array.isArray(j.rotas) ? j.rotas.filter(rotaValida) : []
  const config = ehObjeto(j.config) ? (j.config as Partial<Config>) : {}
  const fechamentos = ehObjeto(j.fechamentos) ? (j.fechamentos as DadosBackup['fechamentos']) : {}
  return { ok: true, dados: { os, rotas, config, fechamentos }, resumo: `${os.length} O.S., ${rotas.length} rota(s)${j.versao === 1 ? ' (convertido do formato antigo)' : ''}` }
}
