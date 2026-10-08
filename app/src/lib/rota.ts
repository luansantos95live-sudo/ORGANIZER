import type { Config, OS, Parada } from '../types'

export const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + (m || 0)
}
export const toHHMM = (min: number) => {
  const m = ((min % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

export function deslocamentoEntre(a: OS | undefined, b: OS | undefined, cfg: Config) {
  if (!a || !b) return 0
  if (a.endereco.cidade !== b.endereco.cidade) return cfg.deslocamentoOutraCidade
  if (a.endereco.bairro !== b.endereco.bairro) return cfg.deslocamentoOutroBairro
  return cfg.deslocamentoMesmoBairro
}

/**
 * Agrupa as paradas por cidade e, dentro da cidade, por bairro.
 * A ordem respeita as horas que o usuário definiu: a cidade com a parada mais cedo vem primeiro,
 * e o mesmo vale para os bairros dentro de cada cidade. A ordem interna de cada bairro é mantida.
 */
export function agruparPorBairro(paradas: Parada[], byId: (id: string) => OS | undefined): Parada[] {
  const cidades = new Map<string, Map<string, Parada[]>>()
  for (const p of paradas) {
    const os = byId(p.osId)
    const cidade = os?.endereco.cidade ?? '~'
    const bairro = os?.endereco.bairro ?? '~'
    if (!cidades.has(cidade)) cidades.set(cidade, new Map())
    const bairros = cidades.get(cidade)!
    if (!bairros.has(bairro)) bairros.set(bairro, [])
    bairros.get(bairro)!.push(p)
  }
  const cedo = (ps: Parada[]) => Math.min(...ps.map((p) => toMin(p.inicio)))
  const porCidade = [...cidades.values()].map((bairros) => [...bairros.values()].sort((x, y) => cedo(x) - cedo(y)))
  porCidade.sort((x, y) => cedo(x.flat()) - cedo(y.flat()))
  return porCidade.flat(2)
}

export function ordenarPorHora(paradas: Parada[]): Parada[] {
  return [...paradas].sort((a, b) => toMin(a.inicio) - toMin(b.inicio))
}

/** Recalcula deslocamentos conforme a sequência atual. */
export function recalcularDeslocamentos(paradas: Parada[], byId: (id: string) => OS | undefined, cfg: Config): Parada[] {
  return paradas.map((p, i) => ({
    ...p,
    deslocamento: i < paradas.length - 1 ? deslocamentoEntre(byId(p.osId), byId(paradas[i + 1].osId), cfg) : 0,
  }))
}

/** Preenche horários em cascata a partir da partida, respeitando duração + deslocamento. */
export function preencherHorarios(paradas: Parada[], partida: string): Parada[] {
  let t = toMin(partida)
  return paradas.map((p) => {
    const inicio = toHHMM(t)
    t += p.duracao + p.deslocamento
    return { ...p, inicio }
  })
}

export interface Conflito { idx: number; comIdx: number; minutos: number }

/** Detecta sobreposição entre paradas consecutivas na ordem atual. */
export function conflitos(paradas: Parada[]): Conflito[] {
  const out: Conflito[] = []
  for (let i = 0; i < paradas.length - 1; i++) {
    const fimComDesloc = toMin(paradas[i].inicio) + paradas[i].duracao + paradas[i].deslocamento
    const prox = toMin(paradas[i + 1].inicio)
    if (prox < fimComDesloc) out.push({ idx: i + 1, comIdx: i, minutos: fimComDesloc - prox })
  }
  return out
}

export function resumoRota(paradas: Parada[]) {
  if (!paradas.length) return { inicio: '—', fim: '—', totalMin: 0, vistoriaMin: 0, deslocMin: 0 }
  const ordenadas = ordenarPorHora(paradas)
  const inicio = ordenadas[0].inicio
  const ult = ordenadas[ordenadas.length - 1]
  const fim = toHHMM(toMin(ult.inicio) + ult.duracao)
  const vistoriaMin = paradas.reduce((s, p) => s + p.duracao, 0)
  const deslocMin = paradas.reduce((s, p) => s + p.deslocamento, 0)
  return { inicio, fim, totalMin: toMin(fim) - toMin(inicio), vistoriaMin, deslocMin }
}

export function fmtMin(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (!h) return `${m} min`
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}
