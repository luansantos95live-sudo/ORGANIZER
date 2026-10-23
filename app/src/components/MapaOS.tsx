import clsx from 'clsx'
import { useMemo, useRef, useState } from 'react'
import { dentroDoPoligono, type Ponto } from '../lib/rota'

export interface PontoMapa { id: string; lat: number; lng: number; rotulo: string; titulo: string; selecionado?: boolean; ordem?: number }

const W = 760
const H = 460
const PAD = 34

/** Cidades de referência no fundo do mapa (só para orientar). */
const CIDADES: { nome: string; lat: number; lng: number }[] = [
  { nome: 'Ariquemes', lat: -9.9133, lng: -63.0408 }, { nome: 'Monte Negro', lat: -10.2459, lng: -63.2899 }, { nome: 'Jaru', lat: -10.4318, lng: -62.4788 },
  { nome: 'Ouro Preto', lat: -10.7167, lng: -62.2565 }, { nome: 'Ji-Paraná', lat: -10.8777, lng: -61.9322 }, { nome: 'Cacoal', lat: -11.4386, lng: -61.4472 },
  { nome: 'Rolim de Moura', lat: -11.7271, lng: -61.7714 }, { nome: 'Pimenta Bueno', lat: -11.6725, lng: -61.1936 }, { nome: 'Cacaulândia', lat: -10.3389, lng: -62.9047 },
]

/**
 * Mapa das O.S. (sem fundo de ruas, funciona sem internet). Projeção simples (equirretangular) ajustada aos pontos.
 * Modo "laço": arraste para contornar O.S.; o contorno devolve os ids de dentro. Com `rota`, desenha o caminho em ordem.
 */
export function MapaOS({ pontos, base, modoLaco, onLaco, onClique, rota, altura = H, legenda = true }: {
  pontos: PontoMapa[]
  base: Ponto & { rotulo?: string }
  modoLaco?: 'mais' | 'menos' | null
  onLaco?: (ids: string[], modo: 'mais' | 'menos') => void
  onClique?: (id: string) => void
  rota?: boolean
  altura?: number
  legenda?: boolean
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [laco, setLaco] = useState<{ x: number; y: number }[] | null>(null)
  const [hover, setHover] = useState<string | null>(null)

  const proj = useMemo(() => {
    const todos = [...pontos, base]
    let minLat = Math.min(...todos.map((p) => p.lat)), maxLat = Math.max(...todos.map((p) => p.lat))
    let minLng = Math.min(...todos.map((p) => p.lng)), maxLng = Math.max(...todos.map((p) => p.lng))
    // Garante uma área mínima (uma cidade só ficaria espremida num ponto).
    const minSpan = 0.08
    if (maxLat - minLat < minSpan) { const c = (maxLat + minLat) / 2; minLat = c - minSpan / 2; maxLat = c + minSpan / 2 }
    if (maxLng - minLng < minSpan) { const c = (maxLng + minLng) / 2; minLng = c - minSpan / 2; maxLng = c + minSpan / 2 }
    const kx = Math.cos(((minLat + maxLat) / 2) * Math.PI / 180)
    const spanX = (maxLng - minLng) * kx
    const spanY = maxLat - minLat
    const escala = Math.min((W - 2 * PAD) / spanX, (altura - 2 * PAD) / spanY)
    const offX = (W - spanX * escala) / 2
    const offY = (altura - spanY * escala) / 2
    return (p: Ponto) => ({ x: offX + (p.lng - minLng) * kx * escala, y: offY + (maxLat - p.lat) * escala })
  }, [pontos, base, altura])

  const pos = (e: React.PointerEvent) => {
    const r = svgRef.current!.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * altura }
  }

  const terminarLaco = () => {
    if (laco && laco.length > 4 && modoLaco && onLaco) {
      const dentro = pontos.filter((p) => dentroDoPoligono(proj(p), laco)).map((p) => p.id)
      onLaco(dentro, modoLaco)
    }
    setLaco(null)
  }

  const b = proj(base)
  const ordenados = rota ? [...pontos].filter((p) => p.ordem !== undefined).sort((x, y) => x.ordem! - y.ordem!) : []
  const caminho = rota && ordenados.length ? [b, ...ordenados.map(proj), b].map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') : ''
  const ativo = pontos.find((p) => p.id === hover)

  return (
    <div className="relative rounded-[12px] overflow-hidden border border-border bg-[var(--bg)]">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${altura}`}
        className={clsx('w-full h-auto block select-none touch-none', modoLaco && 'cursor-crosshair')}
        onPointerDown={(e) => { if (!modoLaco) return; svgRef.current?.setPointerCapture(e.pointerId); setLaco([pos(e)]) }}
        onPointerMove={(e) => { if (laco) setLaco((l) => (l ? [...l, pos(e)] : l)) }}
        onPointerUp={terminarLaco}
        role="img"
        aria-label="Mapa das ordens de serviço"
      >
        <defs>
          <pattern id="grade-mapa" width="38" height="38" patternUnits="userSpaceOnUse">
            <path d="M38 0H0V38" fill="none" stroke="var(--border)" strokeWidth="0.6" opacity=".55" />
          </pattern>
        </defs>
        <rect width={W} height={altura} fill="url(#grade-mapa)" />
        {CIDADES.map((c) => {
          const p = proj(c)
          if (p.x < -40 || p.x > W + 40 || p.y < -20 || p.y > altura + 20) return null
          return <text key={c.nome} x={p.x} y={p.y - 14} textAnchor="middle" fontSize="11" fill="var(--fraco)" style={{ letterSpacing: '.08em', textTransform: 'uppercase' }}>{c.nome}</text>
        })}
        {caminho && <path d={caminho} fill="none" stroke="var(--brand)" strokeWidth="2" strokeDasharray="6 5" opacity=".85" />}
        {pontos.map((p) => {
          const q = proj(p)
          return (
            <g key={p.id} onClick={(e) => { e.stopPropagation(); if (!modoLaco) onClique?.(p.id) }} onPointerEnter={() => setHover(p.id)} onPointerLeave={() => setHover(null)} className={clsx(!modoLaco && onClique && 'cursor-pointer')}>
              <circle cx={q.x} cy={q.y} r={p.selecionado ? 9 : 7} fill={p.selecionado ? 'var(--brand)' : 'var(--azul)'} stroke="var(--surface)" strokeWidth="2.5" />
              {p.ordem !== undefined && <text x={q.x} y={q.y + 3.5} textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff">{p.ordem}</text>}
            </g>
          )
        })}
        <g>
          <rect x={b.x - 9} y={b.y - 9} width={18} height={18} rx={4} fill="var(--laranja)" stroke="var(--surface)" strokeWidth="2.5" />
          <path d={`M${b.x - 4.5} ${b.y + 3.5}V${b.y - 0.5}L${b.x} ${b.y - 4.5}L${b.x + 4.5} ${b.y - 0.5}V${b.y + 3.5}Z`} fill="#fff" />
        </g>
        {laco && <polygon points={laco.map((p) => `${p.x},${p.y}`).join(' ')} fill={modoLaco === 'menos' ? 'rgba(208,68,58,.12)' : 'rgba(58,184,30,.14)'} stroke={modoLaco === 'menos' ? 'var(--vermelho)' : 'var(--brand)'} strokeWidth="1.5" strokeDasharray="5 4" />}
      </svg>
      {ativo && (
        <div className="absolute left-3 bottom-3 tooltip !relative !pointer-events-none max-w-[280px]">
          <b className="block">{ativo.rotulo}</b>
          <span className="text-muted">{ativo.titulo}</span>
        </div>
      )}
      {legenda && <div className="absolute right-3 top-3 flex items-center gap-3 rounded-lg bg-[var(--surface)]/90 border border-border px-2.5 py-1.5 text-[11.5px]">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[3px] bg-[var(--laranja)]" />Base</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[var(--azul)]" />Disponível</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[var(--brand)]" />Selecionada</span>
      </div>}
    </div>
  )
}
