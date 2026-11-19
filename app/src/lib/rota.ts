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

/** Distância entre dois pontos usada para ordenar: linha reta por padrão; pelo caminho real quando há matriz (lib/trajeto). */
export type Distancia = (a: Ponto, b: Ponto) => number

/** Ordem pelo vizinho mais próximo a partir da partida ("otimizar ordem"). Paradas sem coordenada vão para o fim. */
export function ordemOtimizada<T>(partida: Ponto, itens: T[], pontoDe: (t: T) => Ponto | undefined, dist: Distancia = distanciaKm): T[] {
  const com = itens.filter((i) => pontoDe(i))
  const sem = itens.filter((i) => !pontoDe(i))
  const out: T[] = []
  let atual = partida
  const resto = [...com]
  while (resto.length) {
    let melhor = 0
    let dMelhor = Infinity
    resto.forEach((it, i) => {
      const d = dist(atual, pontoDe(it)!)
      if (d < dMelhor) { dMelhor = d; melhor = i }
    })
    const [esc] = resto.splice(melhor, 1)
    out.push(esc)
    atual = pontoDe(esc)!
  }
  return [...out, ...sem]
}

/**
 * Ordem por bairro e proximidade (pedido do usuário em 06/11): agrupa as paradas por bairro; os bairros entram na
 * ordem do mais perto do ponto atual (começando na partida), e dentro do bairro vai sempre à parada mais próxima.
 * Assim a rota não fica pulando de um bairro para outro. Paradas sem coordenada vão para o fim.
 */
export function ordemPorBairro<T>(partida: Ponto, itens: T[], pontoDe: (t: T) => Ponto | undefined, bairroDe: (t: T) => string, dist: Distancia = distanciaKm): T[] {
  const com = itens.filter((i) => pontoDe(i))
  const sem = itens.filter((i) => !pontoDe(i))
  const grupos = new Map<string, T[]>()
  for (const it of com) {
    const b = (bairroDe(it) || '').trim().toUpperCase()
    grupos.set(b, [...(grupos.get(b) ?? []), it])
  }
  const out: T[] = []
  let atual = partida
  const restantes = [...grupos.values()]
  while (restantes.length) {
    // o próximo bairro é o que tem a parada mais perto de onde estamos
    let melhor = 0
    let dMelhor = Infinity
    restantes.forEach((g, i) => {
      for (const it of g) {
        const d = dist(atual, pontoDe(it)!)
        if (d < dMelhor) { dMelhor = d; melhor = i }
      }
    })
    const [grupo] = restantes.splice(melhor, 1)
    const ordenado = ordemOtimizada(atual, grupo, pontoDe, dist)
    out.push(...ordenado)
    atual = pontoDe(ordenado[ordenado.length - 1])!
  }
  return [...out, ...sem]
}

/** Link do Google Maps com a rota inteira (partida → paradas → volta), para abrir ou copiar para o celular. */
export function linkGoogleMaps(partida: Ponto, destinos: string[], voltar = true) {
  const origem = `${partida.lat},${partida.lng}`
  if (!destinos.length) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(origem)}`
  const ultimo = voltar ? origem : destinos[destinos.length - 1]
  const meio = voltar ? destinos : destinos.slice(0, -1)
  let url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origem)}&destination=${encodeURIComponent(ultimo)}&travelmode=driving`
  if (meio.length) url += `&waypoints=${encodeURIComponent(meio.join('|'))}`
  return url
}

/**
 * A rota completa no Google Maps aceita no máximo 9 paradas intermediárias por link. Com mais, divide em partes:
 * cada parte começa onde a anterior terminou e a última volta à partida.
 */
export function linksGoogleMaps(partida: Ponto, destinos: string[], maxPorParte = 9): string[] {
  if (destinos.length <= maxPorParte) return [linkGoogleMaps(partida, destinos)]
  const partes: string[] = []
  const origem = `${partida.lat},${partida.lng}`
  let de = origem
  for (let i = 0; i < destinos.length; i += maxPorParte) {
    const trecho = destinos.slice(i, i + maxPorParte)
    const ultima = i + maxPorParte >= destinos.length
    const destino = ultima ? origem : trecho[trecho.length - 1]
    const meio = ultima ? trecho : trecho.slice(0, -1)
    let url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(de)}&destination=${encodeURIComponent(destino)}&travelmode=driving`
    if (meio.length) url += `&waypoints=${encodeURIComponent(meio.join('|'))}`
    partes.push(url)
    de = trecho[trecho.length - 1]
  }
  return partes
}

/** Roteiro da rota em texto, para colar no WhatsApp: paradas na ordem com hora e endereço, e o link do Maps no fim. */
export function textoRoteiro(cabecalho: string, paradas: { hora: string; nome: string; endereco: string }[], links: string[]) {
  const linhas = paradas.map((p, i) => `${i + 1}. ${p.hora} · ${p.nome}\n   ${p.endereco}`)
  const mapas = links.length === 1 ? `Google Maps: ${links[0]}` : links.map((l, i) => `Google Maps (parte ${i + 1}): ${l}`).join('\n')
  return `${cabecalho}\n\n${linhas.join('\n')}\n\n${mapas}`
}

/** Link do Waze para um destino (o Waze só navega para um ponto por vez). */
export const linkWaze = (p: Ponto) => `https://waze.com/ul?ll=${p.lat},${p.lng}&navigate=yes`

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
  // vistoria já feita (marcada como feita ou o passo "Fazer vistoria" marcado) não volta para a rota (corrigido em 12/11)
  const passo = o.passos?.fazer_vistoria
  if (o.vistoria?.feita || (passo && passo !== 'pulado' && passo !== 'desfeito')) return false
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

/**
 * Rota concluída = vistorias feitas (pedido de 13/11: depois de concluir a rota, as O.S. dela não ficam mais disponíveis
 * para outra rota). Marca a vistoria como feita no dia da rota, na hora combinada, e os passos "Marcar vistoria" e
 * "Fazer vistoria"; Recebida passa para Em Andamento. O.S. fechada ou já com a vistoria feita: nada muda (null).
 */
export function vistoriaFeitaPelaRota(o: OS, r: Pick<Rota, 'data' | 'hora'>, hora?: string): Partial<OS> | null {
  if (o.status === 'concluida' || o.status === 'cancelada') return null
  const passo = o.passos?.fazer_vistoria
  const passoFeito = !!passo && passo !== 'pulado' && passo !== 'desfeito'
  if (o.vistoria?.feita && passoFeito) return null
  return {
    status: o.status === 'recebida' ? 'em_andamento' : o.status,
    vistoria: { data: o.vistoria?.data ?? r.data, hora: hora ?? o.vistoria?.hora ?? r.hora, duracao: o.vistoria?.duracao ?? 40, feita: true },
    passos: { ...(o.passos ?? {}), marcar_vistoria: o.passos?.marcar_vistoria ?? r.data, fazer_vistoria: passoFeito ? passo : r.data },
  }
}

/** Aplica `vistoriaFeitaPelaRota` às O.S. de todas as rotas concluídas (rotas concluídas antes desta regra). */
export function vistoriasDasRotasConcluidas(os: OS[], rotas: Rota[]): OS[] {
  const feitas = new Map<string, Partial<OS>>()
  for (const r of rotas.filter((x) => x.status === 'concluida')) {
    for (const p of r.paradas) {
      const o = os.find((x) => x.id === p.osId)
      const patch = o && vistoriaFeitaPelaRota(o, r, p.hora)
      if (patch) feitas.set(o.id, patch)
    }
  }
  return feitas.size ? os.map((o) => (feitas.has(o.id) ? { ...o, ...feitas.get(o.id) } : o)) : os
}
