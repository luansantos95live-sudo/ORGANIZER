import type { OS, Rota } from '../types'
import { TIPOLOGIAS_SEM_VISTORIA, normCidade } from './os'

export interface Ponto { lat: number; lng: number }

export const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + (m || 0)
}
export const toHHMM = (min: number) => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** Distância em linha reta (km) entre dois pontos, pela fórmula de haversine. */
export function distanciaKm(a: Ponto, b: Ponto) {
  const R = 6371
  const rad = (g: number) => (g * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Fator para transformar linha reta em distância de estrada (estimativa). */
export const FATOR_ESTRADA = 1.3

/** Distância estimada da rota: partida → paradas na ordem → volta à partida. Paradas sem coordenada ficam de fora. */
export function distanciaRota(partida: Ponto, pontos: (Ponto | undefined)[], voltar = true) {
  const ok = pontos.filter((p): p is Ponto => !!p)
  if (!ok.length) return 0
  let km = 0
  let atual = partida
  for (const p of ok) { km += distanciaKm(atual, p); atual = p }
  if (voltar) km += distanciaKm(atual, partida)
  return km * FATOR_ESTRADA
}

/**
 * Hora estimada de chegada em cada parada, a partir da hora de saída, da velocidade média e da duração
 * de cada vistoria. Parada sem coordenada conta só a duração.
 */
export function horariosEstimados(saida: string, partida: Ponto, pontos: (Ponto | undefined)[], velocidade: number, duracao: number) {
  let t = toMin(saida)
  let atual: Ponto = partida
  return pontos.map((p) => {
    if (p) { t += (distanciaKm(atual, p) * FATOR_ESTRADA / Math.max(velocidade, 1)) * 60; atual = p }
    const chegada = toHHMM(t)
    t += duracao
    return chegada
  })
}

/** Ordem pelo vizinho mais próximo a partir da partida ("otimizar ordem"). Paradas sem coordenada vão para o fim. */
export function ordemOtimizada<T>(partida: Ponto, itens: T[], pontoDe: (t: T) => Ponto | undefined): T[] {
  const com = itens.filter((i) => pontoDe(i))
  const sem = itens.filter((i) => !pontoDe(i))
  const out: T[] = []
  let atual = partida
  const resto = [...com]
  while (resto.length) {
    let melhor = 0
    let dMelhor = Infinity
    resto.forEach((it, i) => {
      const d = distanciaKm(atual, pontoDe(it)!)
      if (d < dMelhor) { dMelhor = d; melhor = i }
    })
    const [esc] = resto.splice(melhor, 1)
    out.push(esc)
    atual = pontoDe(esc)!
  }
  return [...out, ...sem]
}

/** Ponto dentro de um polígono (laço do roteirizador), pelo método do raio. */
export function dentroDoPoligono(p: { x: number; y: number }, poligono: { x: number; y: number }[]) {
  let dentro = false
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const a = poligono[i], b = poligono[j]
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) dentro = !dentro
  }
  return dentro
}

export const rotaAtiva = (r: Rota) => r.status === 'rascunho' || r.status === 'confirmada'

/**
 * O.S. que podem entrar numa rota, como no sistema real: não concluídas nem canceladas, ainda sem a vistoria
 * feita, com vistoria na tipologia, e fora de outra rota ativa (a rota em edição não conta).
 */
export function elegivelParaRota(o: OS, rotas: Rota[], rotaAtualId?: string) {
  if (o.status !== 'recebida' && o.status !== 'em_andamento') return false
  if (TIPOLOGIAS_SEM_VISTORIA.includes(o.tipologia)) return false
  return !rotas.some((r) => r.id !== rotaAtualId && rotaAtiva(r) && r.paradas.some((p) => p.osId === o.id))
}

/** Código curto da rota, como no sistema real (ROTA-27E9). */
export function novoCodigoRota(existentes: string[]) {
  for (;;) {
    const c = 'ROTA-' + Math.floor(Math.random() * 0xffff).toString(16).toUpperCase().padStart(4, '0')
    if (!existentes.includes(c)) return c
  }
}

export function fmtMin(min: number) {
  const total = Math.round(min)
  const h = Math.floor(total / 60)
  const m = total % 60
  if (!h) return `${m} min`
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

export const fmtKm = (km: number) => `${km.toLocaleString('pt-BR', { maximumFractionDigits: km < 10 ? 1 : 0 })} km`

/**
 * Sugestão do Início (sistema real): a cidade com mais O.S. ainda sem vistoria marcada, fora da cidade da base,
 * para fazer todas na mesma viagem. Precisa de pelo menos duas.
 */
export function sugestaoDeViagem(lista: OS[], cidadeBase: string, rotas: Rota[] = []): { cidade: string; os: OS[] } | null {
  const porCidade = new Map<string, OS[]>()
  for (const o of lista) {
    if (o.vistoria || !elegivelParaRota(o, rotas)) continue
    const c = o.endereco.cidade
    if (normCidade(c) === normCidade(cidadeBase)) continue
    porCidade.set(c, [...(porCidade.get(c) ?? []), o])
  }
  const melhor = [...porCidade.entries()].sort((a, b) => b[1].length - a[1].length)[0]
  return melhor && melhor[1].length >= 2 ? { cidade: melhor[0], os: melhor[1] } : null
}
