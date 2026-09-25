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

/** Agrupa as paradas por bairro (mantendo a ordem interna e a ordem de primeira aparição do bairro). */
export function agruparPorBairro(paradas: Parada[], byId: (id: string) => OS | undefined): Parada[] {
  const grupos = new Map<string, Parada[]>()
  for (const p of paradas) {
    const os = byId(p.osId)
    const chave = os ? `${os.endereco.cidade}|${os.endereco.bairro}` : '~'
    if (!grupos.has(chave)) grupos.set(chave, [])
    grupos.get(chave)!.push(p)
  }
  // ordena grupos por cidade e depois pela menor hora dentro do grupo
  const ordenados = [...grupos.entries()].sort((a, b) => {
    const [ca] = a[0].split('|')
    const [cb] = b[0].split('|')
    if (ca !== cb) return ca.localeCompare(cb)
    const ma = Math.min(...a[1].map((p) => toMin(p.inicio)))
    const mb = Math.min(...b[1].map((p) => toMin(p.inicio)))
    return ma - mb
  })
  return ordenados.flatMap(([, ps]) => ps)
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
