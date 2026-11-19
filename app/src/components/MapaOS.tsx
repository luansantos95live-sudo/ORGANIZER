import type { GeoJSONSource, LngLatBounds, LngLatLike, Map as MapaGL, Marker, Popup } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
// O empacotador (Vite) quebra o "worker" do MapLibre ao importá-lo como módulo: o mapa fica em branco. Por isso a
// biblioteca oficial é embutida como texto e executada como <script>, do jeito que o MapLibre é distribuído. Funciona
// no servidor local e no arquivo único do atalho.
import fonteMaplibre from 'maplibre-gl/dist/maplibre-gl.js?raw'
import type { Feature, FeatureCollection, LineString, Polygon } from 'geojson'
import clsx from 'clsx'
import { useEffect, useRef, useState } from 'react'
import { dentroDoPoligono, type Ponto } from '../lib/rota'

export interface PontoMapa { id: string; lat: number; lng: number; rotulo: string; titulo: string; selecionado?: boolean; ordem?: number }

/**
 * Mapa vetorial com MapLibre GL (pedido do usuário em 06/11: "use um mapa de API free"): suave como o Google Maps,
 * sem chave e sem custo. Tema claro = estilo "Liberty" do OpenFreeMap; tema escuro = "Eclipse" do VersaTiles.
 * Precisa de internet para carregar as ruas.
 */
const ESTILOS = {
  claro: 'https://tiles.openfreemap.org/styles/liberty',
  escuro: 'https://tiles.versatiles.org/assets/styles/eclipse/style.json',
}
type ML = typeof import('maplibre-gl')
function maplibre(): ML {
  const w = window as unknown as { maplibregl?: ML }
  if (!w.maplibregl) { const s = document.createElement('script'); s.text = fonteMaplibre; document.head.appendChild(s) }
  return w.maplibregl!
}
const temaEscuro = () => document.documentElement.dataset.theme === 'dark'
const ENQUADRE = { padding: 44, maxZoom: 15, animate: false } as const
const VERDE = '#3AB81E'

const elMarcador = (p: PontoMapa) => {
  const el = document.createElement('span')
  el.className = `mk${p.selecionado ? ' sel' : ''}`
  el.textContent = p.ordem !== undefined ? String(p.ordem) : ''
  return el
}
const elBase = () => {
  const el = document.createElement('span')
  el.className = 'mk-base'
  el.innerHTML = '<svg viewBox="0 0 10 10" width="10" height="10"><path d="M1 8V4L5 1l4 3v4z" fill="#fff"/></svg>'
  return el
}
const linha = (coords: [number, number][]): Feature<LineString> => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } })
const poligono = (coords: [number, number][]): Feature<Polygon> => ({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [coords.length ? [...coords, coords[0]] : []] } })
const vazio: FeatureCollection = { type: 'FeatureCollection', features: [] }

/**
 * Mapa das O.S. com zoom e arrastar. Modo "laço": arraste para contornar O.S.; o contorno devolve os ids de dentro.
 * Com `rota`, desenha o caminho em ordem. Os pontos só são redesenhados quando mudam de verdade (chave em texto).
 */
export function MapaOS({ pontos, base, modoLaco, onLaco, onClique, rota, trajeto, altura, legenda = true, className, children }: {
  pontos: PontoMapa[]
  base: Ponto & { rotulo?: string }
  modoLaco?: 'mais' | 'menos' | null
  onLaco?: (ids: string[], modo: 'mais' | 'menos') => void
  onClique?: (id: string) => void
  rota?: boolean
  /** caminho pelas ruas ([lng, lat], do OSRM): desenhado em linha cheia no lugar da linha reta tracejada */
  trajeto?: [number, number][]
  /** altura em px; sem ela, o mapa ocupa a altura do pai (flex) */
  altura?: number
  legenda?: boolean
  className?: string
  /** botões por cima do mapa (canto superior direito) */
  children?: React.ReactNode
}) {
  const divRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapaGL | null>(null)
  const marcadores = useRef<Marker[]>([])
  const popup = useRef<Popup | null>(null)
  const desenhando = useRef<[number, number][] | null>(null)
  const chaveDesenho = useRef('')
  const chaveEnquadre = useRef('')
  const limitesRef = useRef<LngLatBounds | null>(null)
  const caminhoRef = useRef<[number, number][]>([])
  const trajetoRef = useRef<[number, number][] | undefined>(trajeto)
  trajetoRef.current = trajeto
  const [pronto, setPronto] = useState(0)
  const [semInternet, setSemInternet] = useState(false)
  // callbacks mais recentes, sem recriar os marcadores a cada render
  const cb = useRef({ onClique, onLaco, modoLaco, pontos })
  cb.current = { onClique, onLaco, modoLaco, pontos }

  // camadas da rota e do laço (precisam ser recriadas quando o estilo/tema muda)
  const garantirCamadas = (map: MapaGL) => {
    if (!map.getSource('rota')) {
      map.addSource('rota', { type: 'geojson', data: vazio })
      map.addLayer({ id: 'rota-linha', type: 'line', source: 'rota', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': VERDE, 'line-width': 3.5, 'line-dasharray': [2, 1.6], 'line-opacity': 0.9 } })
    }
    if (!map.getSource('laco')) {
      map.addSource('laco', { type: 'geojson', data: vazio })
      map.addLayer({ id: 'laco-area', type: 'fill', source: 'laco', paint: { 'fill-color': VERDE, 'fill-opacity': 0.14 } })
      map.addLayer({ id: 'laco-borda', type: 'line', source: 'laco', paint: { 'line-color': VERDE, 'line-width': 1.5, 'line-dasharray': [2, 1.5] } })
    }
    desenharCaminho(map)
  }
  // caminho da rota: pelas ruas (linha cheia) quando o trajeto chegou; senão, linha reta tracejada entre as paradas
  const desenharCaminho = (map: MapaGL) => {
    const fonte = map.getSource('rota') as GeoJSONSource | undefined
    if (!fonte) return
    const real = trajetoRef.current
    const usaReal = !!real?.length && caminhoRef.current.length > 0
    fonte.setData(usaReal ? linha(real) : caminhoRef.current.length ? linha(caminhoRef.current) : vazio)
    if (map.getLayer('rota-linha')) map.setPaintProperty('rota-linha', 'line-dasharray', usaReal ? [1, 0] : [2, 1.6])
  }

  // cria o mapa uma vez
  useEffect(() => {
    const el = divRef.current
    if (!el) return
    const gl = maplibre()
    const map = new gl.Map({ container: el, style: ESTILOS[temaEscuro() ? 'escuro' : 'claro'], center: [base.lng, base.lat], zoom: 11, attributionControl: { compact: true }, fadeDuration: 0 })
    map.addControl(new gl.NavigationControl({ showCompass: false }), 'top-left')
    map.on('error', (e: { error?: { message?: string } }) => { if (/fetch|network|load/i.test(e.error?.message ?? '')) setSemInternet(true) })
    map.on('style.load', () => { garantirCamadas(map); setSemInternet(false) })
    map.once('load', () => setPronto((n) => n + 1))
    mapRef.current = map
    chaveDesenho.current = '' // mapa novo: os pontos precisam ser desenhados de novo (StrictMode monta duas vezes)
    chaveEnquadre.current = ''
    // troca o mapa quando o tema muda (atributo data-theme do <html>)
    const mo = new MutationObserver(() => map.setStyle(ESTILOS[temaEscuro() ? 'escuro' : 'claro']))
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    // dentro de uma janela (ou logo ao abrir a tela) o tamanho só fica certo depois de aparecer: reenquadra os pontos
    let tamanho = ''
    const ro = new ResizeObserver(() => {
      const t = `${el.clientWidth}x${el.clientHeight}`
      if (t === tamanho) return
      tamanho = t
      map.resize()
      if (limitesRef.current) map.fitBounds(limitesRef.current, ENQUADRE)
    })
    ro.observe(el)
    return () => { ro.disconnect(); mo.disconnect(); marcadores.current.forEach((m) => m.remove()); marcadores.current = []; map.remove(); mapRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // marcadores, base e caminho da rota: só redesenha quando algo muda
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const gl = maplibre()
    const chave = `${base.lat},${base.lng}|${rota ? 'r' : ''}|` + pontos.map((p) => `${p.id}:${p.lat}:${p.lng}:${p.selecionado ? 1 : 0}:${p.ordem ?? ''}`).join(';')
    if (chave === chaveDesenho.current) return
    chaveDesenho.current = chave
    marcadores.current.forEach((m) => m.remove())
    marcadores.current = []
    popup.current?.remove()
    marcadores.current.push(new gl.Marker({ element: elBase(), anchor: 'center' }).setLngLat([base.lng, base.lat]).addTo(map))
    for (const p of pontos) {
      const el = elMarcador(p)
      el.addEventListener('click', (e) => { e.stopPropagation(); if (!cb.current.modoLaco) cb.current.onClique?.(p.id) })
      el.addEventListener('mouseenter', () => {
        popup.current?.remove()
        popup.current = new gl.Popup({ closeButton: false, closeOnClick: false, offset: 14, className: 'tip-mapa-pop' })
          .setLngLat([p.lng, p.lat]).setHTML(`<b>${p.rotulo}</b><br><span class="text-muted">${p.titulo}</span>`).addTo(map)
      })
      el.addEventListener('mouseleave', () => { popup.current?.remove(); popup.current = null })
      marcadores.current.push(new gl.Marker({ element: el, anchor: 'center' }).setLngLat([p.lng, p.lat]).addTo(map))
    }
    const ordenados = rota ? [...pontos].filter((p) => p.ordem !== undefined).sort((x, y) => x.ordem! - y.ordem!) : []
    caminhoRef.current = ordenados.length ? [[base.lng, base.lat], ...ordenados.map((p) => [p.lng, p.lat] as [number, number]), [base.lng, base.lat]] : []
    if (map.isStyleLoaded()) garantirCamadas(map)
    // enquadra quando o conjunto de pontos muda (não a cada seleção)
    const chaveIds = pontos.map((p) => p.id).sort().join(',') + `|${base.lat},${base.lng}`
    if (chaveIds !== chaveEnquadre.current) {
      chaveEnquadre.current = chaveIds
      const b = new gl.LngLatBounds([base.lng, base.lat], [base.lng, base.lat])
      pontos.forEach((p) => b.extend([p.lng, p.lat] as LngLatLike))
      limitesRef.current = b
      map.resize()
      map.fitBounds(b, ENQUADRE)
    }
  }, [pontos, base, rota, pronto])

  // o trajeto pelas ruas chega depois (busca na internet): redesenha só a linha
  useEffect(() => {
    const map = mapRef.current
    if (map && map.isStyleLoaded()) desenharCaminho(map)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trajeto, pronto])

  // laço: enquanto ativo, o arrastar do mapa vira desenho do contorno
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (modoLaco) { map.dragPan.disable(); map.getCanvas().style.cursor = 'crosshair' } else { map.dragPan.enable(); map.getCanvas().style.cursor = '' }
  }, [modoLaco])

  const lngLat = (e: React.PointerEvent): [number, number] => {
    const r = divRef.current!.getBoundingClientRect()
    const ll = mapRef.current!.unproject([e.clientX - r.left, e.clientY - r.top])
    return [ll.lng, ll.lat]
  }
  const desenhar = (pts: [number, number][]) => {
    const map = mapRef.current
    if (!map || !map.getSource('laco')) return
    const cor = cb.current.modoLaco === 'menos' ? '#d0443a' : VERDE
    map.setPaintProperty('laco-area', 'fill-color', cor)
    map.setPaintProperty('laco-borda', 'line-color', cor)
    ;(map.getSource('laco') as GeoJSONSource).setData(pts.length > 2 ? poligono(pts) : vazio)
  }
  const terminar = () => {
    const pts = desenhando.current
    desenhando.current = null
    desenhar([])
    if (pts && pts.length > 4 && cb.current.modoLaco && cb.current.onLaco) {
      const pol = pts.map(([x, y]) => ({ x, y }))
      cb.current.onLaco(cb.current.pontos.filter((p) => dentroDoPoligono({ x: p.lng, y: p.lat }, pol)).map((p) => p.id), cb.current.modoLaco)
    }
  }

  return (
    <div className={clsx('relative rounded-[14px] overflow-hidden border border-border bg-[var(--bg)]', !altura && 'h-full', className)}>
      <div
        ref={divRef}
        style={altura ? { height: altura } : undefined}
        className={clsx('w-full mapa-os', !altura && 'h-full', modoLaco && 'touch-none select-none')}
        onPointerDownCapture={(e) => { if (!modoLaco || e.button !== 0) return; e.preventDefault(); desenhando.current = [lngLat(e)]; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) }}
        onPointerMove={(e) => { if (desenhando.current) { desenhando.current.push(lngLat(e)); desenhar(desenhando.current) } }}
        onPointerUp={terminar}
        onPointerCancel={terminar}
        role="img"
        aria-label="Mapa das ordens de serviço"
      />
      {semInternet && <div className="absolute left-3 bottom-6 rounded-lg bg-[var(--surface)]/95 border border-border px-2.5 py-1.5 text-[11.5px] text-muted z-[500]">Sem internet: o mapa de ruas não carregou. Os pontos continuam funcionando.</div>}
      {children && <div className="absolute right-3 top-3 flex flex-wrap items-center gap-1.5 z-[500]">{children}</div>}
      {legenda && <div className="absolute left-3 bottom-6 flex items-center gap-3 rounded-lg bg-[var(--surface)]/90 border border-border px-2.5 py-1.5 text-[11.5px] z-[500]">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[3px] bg-[var(--laranja)]" />Partida</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[var(--azul)]" />Em aberto</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[var(--brand)]" />Na rota</span>
      </div>}
    </div>
  )
}
