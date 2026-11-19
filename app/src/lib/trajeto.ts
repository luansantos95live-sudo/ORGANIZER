import { distanciaKm, toHHMM, toMin, type Ponto } from './rota'

/**
 * Caminho pelas ruas e rodovias (pedido do usuário em 06/11: "o sistema deve considerar o caminho das ruas, não a
 * linha reta"). Usa o OSRM público (router.project-osrm.org): grátis, sem chave, dados do OpenStreetMap.
 * Sem internet, as telas voltam para a estimativa em linha reta × 1,3 (lib/rota.ts).
 */
export const OSRM = 'https://router.project-osrm.org'

export interface Trecho { km: number; min: number }
export interface Trajeto {
  km: number
  min: number
  /** um trecho por perna: partida → 1ª parada, 1ª → 2ª, …, última → partida (quando volta) */
  trechos: Trecho[]
  /** linha do caminho, em [lng, lat] (GeoJSON) */
  linha: [number, number][]
}
export interface Matriz { km: number[][]; min: number[][] }

const coords = (pontos: Ponto[]) => pontos.map((p) => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`).join(';')

/** URL da rota (partida → paradas → partida) com a geometria para desenhar no mapa. */
export function urlTrajeto(partida: Ponto, pontos: Ponto[], voltar = true) {
  const lista = voltar ? [partida, ...pontos, partida] : [partida, ...pontos]
  return `${OSRM}/route/v1/driving/${coords(lista)}?overview=full&geometries=geojson&steps=false`
}

/** URL da tabela de distâncias/tempos entre todos os pontos (para ordenar as paradas pelo caminho real). */
export function urlMatriz(pontos: Ponto[]) {
  return `${OSRM}/table/v1/driving/${coords(pontos)}?annotations=distance,duration`
}

/** Lê a resposta do OSRM `route`. Devolve null se vier erro ou vazio. */
export function lerTrajeto(json: unknown): Trajeto | null {
  const r = json as { code?: string; routes?: Array<{ distance: number; duration: number; legs: Array<{ distance: number; duration: number }>; geometry?: { coordinates: [number, number][] } }> }
  const rota = r?.code === 'Ok' ? r.routes?.[0] : undefined
  if (!rota) return null
  return {
    km: rota.distance / 1000,
    min: rota.duration / 60,
    trechos: rota.legs.map((l) => ({ km: l.distance / 1000, min: l.duration / 60 })),
    linha: rota.geometry?.coordinates ?? [],
  }
}

/** Lê a resposta do OSRM `table`. Célula sem caminho (null) vira Infinity. */
export function lerMatriz(json: unknown): Matriz | null {
  const r = json as { code?: string; distances?: (number | null)[][]; durations?: (number | null)[][] }
  if (r?.code !== 'Ok' || !r.distances || !r.durations) return null
  return {
    km: r.distances.map((l) => l.map((v) => (v == null ? Infinity : v / 1000))),
    min: r.durations.map((l) => l.map((v) => (v == null ? Infinity : v / 60))),
  }
}

/**
 * Hora de chegada em cada parada a partir dos tempos reais de cada trecho (minutos até a parada; parada sem
 * coordenada = 0) e da duração da vistoria.
 */
export function horariosPorTempos(saida: string, minutosAte: number[], duracao: number) {
  let t = toMin(saida)
  return minutosAte.map((m) => {
    t += m
    const chegada = toHHMM(t)
    t += duracao
    return chegada
  })
}

/** Minutos de viagem até cada parada, casando os trechos do trajeto com a lista de paradas (as sem coordenada contam 0). */
export function minutosPorParada(trechos: Trecho[], pontos: (Ponto | undefined)[]) {
  let j = 0
  return pontos.map((p) => (p && trechos[j] ? trechos[j++].min : 0))
}

/** Distância pelo caminho real entre dois pontos da matriz; fora dela (ou sem caminho), linha reta. */
export function distanciaPelaMatriz(pontos: Ponto[], matriz: Matriz) {
  const idx = new Map(pontos.map((p, i) => [`${p.lat},${p.lng}`, i]))
  return (a: Ponto, b: Ponto) => {
    const ia = idx.get(`${a.lat},${a.lng}`)
    const ib = idx.get(`${b.lat},${b.lng}`)
    const v = ia != null && ib != null ? matriz.km[ia]?.[ib] : undefined
    return v != null && Number.isFinite(v) ? v : distanciaKm(a, b)
  }
}

// ---- busca com cache (cada combinação de pontos só é pedida uma vez por sessão)
type Fetch = typeof fetch
const cacheTrajeto = new Map<string, Promise<Trajeto | null>>()
const cacheMatriz = new Map<string, Promise<Matriz | null>>()

async function pegar<T>(url: string, ler: (j: unknown) => T | null, fetchFn: Fetch): Promise<T | null> {
  try {
    const res = await fetchFn(url)
    if (!res.ok) return null
    return ler(await res.json())
  } catch {
    return null
  }
}

export function buscarTrajeto(partida: Ponto, pontos: Ponto[], voltar = true, fetchFn: Fetch = fetch): Promise<Trajeto | null> {
  if (!pontos.length) return Promise.resolve(null)
  const url = urlTrajeto(partida, pontos, voltar)
  let p = cacheTrajeto.get(url)
  if (!p) {
    p = pegar(url, lerTrajeto, fetchFn).then((t) => { if (!t) cacheTrajeto.delete(url); return t }) // falhou (sem internet): tenta de novo depois
    cacheTrajeto.set(url, p)
  }
  return p
}

export function buscarMatriz(pontos: Ponto[], fetchFn: Fetch = fetch): Promise<Matriz | null> {
  if (pontos.length < 2) return Promise.resolve(null)
  const url = urlMatriz(pontos)
  let p = cacheMatriz.get(url)
  if (!p) {
    p = pegar(url, lerMatriz, fetchFn).then((m) => { if (!m) cacheMatriz.delete(url); return m })
    cacheMatriz.set(url, p)
  }
  return p
}
