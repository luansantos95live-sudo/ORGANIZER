import { Crop, ImagePlus, Trash2, ZoomIn, ZoomOut } from 'lucide-react'
import { useEffect, useRef, useState, type PointerEvent as PE } from 'react'
import { useStore } from '../store/useStore'
import type { Membro, Responsavel } from '../types'
import { Avatar, Modal } from './ui'

const LADO = 256 // px da foto final: nítida no maior avatar e pequena no navegador/backup (~20 KB)
const ORIGINAL = 800 // maior lado da imagem guardada para reajustar o enquadramento
const JANELA = 260 // px do círculo de ajuste na tela
type Enq = NonNullable<Membro['fotoEnq']>
const ENQ_INICIAL: Enq = { zoom: 1, x: 0, y: 0 }

const carregar = (src: string) => new Promise<HTMLImageElement>((ok, erro) => {
  const img = new Image()
  img.onload = () => ok(img)
  img.onerror = () => erro(new Error('imagem inválida'))
  img.src = src
})

/** Reduz a imagem escolhida para no máximo ORIGINAL px no maior lado (JPEG), para guardar e reajustar depois. */
async function reduzirOriginal(arquivo: File): Promise<string> {
  const url = URL.createObjectURL(arquivo)
  try {
    const img = await carregar(url)
    const k = Math.min(1, ORIGINAL / Math.max(img.naturalWidth, img.naturalHeight))
    const c = document.createElement('canvas')
    c.width = Math.round(img.naturalWidth * k)
    c.height = Math.round(img.naturalHeight * k)
    const g = c.getContext('2d')!
    g.fillStyle = '#fff' // PNG com fundo transparente vira branco no JPEG
    g.fillRect(0, 0, c.width, c.height)
    g.drawImage(img, 0, 0, c.width, c.height)
    return c.toDataURL('image/jpeg', 0.9)
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Onde a imagem fica dentro de uma janela quadrada de lado `v`, para um enquadramento (deslocamento já limitado). */
function posicao(w: number, h: number, v: number, e: Enq) {
  const escala = (v / Math.min(w, h)) * e.zoom // zoom 1 = o lado menor cobre a janela
  const dw = w * escala
  const dh = h * escala
  const folgaX = (dw - v) / 2
  const folgaY = (dh - v) / 2
  const ox = Math.max(-folgaX, Math.min(folgaX, e.x * v))
  const oy = Math.max(-folgaY, Math.min(folgaY, e.y * v))
  return { left: (v - dw) / 2 + ox, top: (v - dh) / 2 + oy, dw, dh, ox, oy }
}

/** Gera a foto final (LADO × LADO) com o enquadramento escolhido. */
async function recortar(original: string, e: Enq): Promise<string> {
  const img = await carregar(original)
  const p = posicao(img.naturalWidth, img.naturalHeight, LADO, e)
  const c = document.createElement('canvas')
  c.width = LADO
  c.height = LADO
  const g = c.getContext('2d')!
  g.fillStyle = '#fff'
  g.fillRect(0, 0, LADO, LADO)
  g.drawImage(img, p.left, p.top, p.dw, p.dh)
  return c.toDataURL('image/jpeg', 0.88)
}

/** Janela "Ajustar foto": arrastar a imagem para enquadrar e zoom pela barra ou pela rodinha do mouse. */
function AjustarFoto({ original, inicial, onCancelar, onSalvar }: {
  original: string; inicial: Enq; onCancelar: () => void; onSalvar: (e: Enq) => void
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [e, setE] = useState<Enq>(inicial)
  const arrasto = useRef<{ px: number; py: number; x: number; y: number } | null>(null)
  useEffect(() => { void carregar(original).then(setImg) }, [original])

  const p = img ? posicao(img.naturalWidth, img.naturalHeight, JANELA, e) : null
  // guarda o deslocamento já limitado, para o zoom não "pular" depois de arrastar para fora
  const fixar = (n: Enq) => {
    if (!img) return setE(n)
    const q = posicao(img.naturalWidth, img.naturalHeight, JANELA, n)
    setE({ zoom: n.zoom, x: q.ox / JANELA, y: q.oy / JANELA })
  }
  const zoom = (z: number) => fixar({ ...e, zoom: Math.max(1, Math.min(3, z)) })

  const descer = (ev: PE<HTMLDivElement>) => {
    ev.currentTarget.setPointerCapture(ev.pointerId)
    arrasto.current = { px: ev.clientX, py: ev.clientY, x: e.x, y: e.y }
  }
  const mover = (ev: PE<HTMLDivElement>) => {
    const a = arrasto.current
    if (!a) return
    fixar({ zoom: e.zoom, x: a.x + (ev.clientX - a.px) / JANELA, y: a.y + (ev.clientY - a.py) / JANELA })
  }

  return (
    <Modal open onClose={onCancelar} title="Ajustar foto" width={380}
      footer={<>
        <button className="btn btn-secondary" onClick={onCancelar}>Cancelar</button>
        <button className="btn btn-primary" disabled={!img} onClick={() => onSalvar(e)}>Salvar foto</button>
      </>}>
      <div className="flex flex-col items-center gap-4">
        <div
          className="relative overflow-hidden rounded-full bg-surface-2 cursor-grab active:cursor-grabbing touch-none select-none"
          style={{ width: JANELA, height: JANELA, boxShadow: '0 0 0 3px var(--brand)' }}
          onPointerDown={descer} onPointerMove={mover} onPointerUp={() => { arrasto.current = null }}
          onWheel={(ev) => zoom(e.zoom - ev.deltaY / 600)}
        >
          {img && p && (
            <img src={original} alt="" draggable={false} className="absolute max-w-none pointer-events-none"
              style={{ left: p.left, top: p.top, width: p.dw, height: p.dh }} />
          )}
        </div>
        <label className="flex items-center gap-2 w-full text-muted">
          <ZoomOut size={16} className="shrink-0" />
          <input type="range" min={1} max={3} step={0.01} value={e.zoom} onChange={(ev) => zoom(Number(ev.target.value))}
            className="flex-1 accent-[var(--brand)]" aria-label="Zoom da foto" />
          <ZoomIn size={16} className="shrink-0" />
        </label>
        <p className="text-[12px] text-muted text-center -mt-2">Arraste a foto para enquadrar. O que fica dentro do círculo aparece no seu perfil.</p>
      </div>
    </Modal>
  )
}

/** Foto de perfil em Configurações: prévia, Escolher/Trocar foto, Ajustar enquadramento e Remover. */
export function FotoPerfil({ resp }: { resp: Responsavel }) {
  const config = useStore((s) => s.config)
  const setConfig = useStore((s) => s.setConfig)
  const membro = config.responsaveis[resp]
  const input = useRef<HTMLInputElement>(null)
  const [aviso, setAviso] = useState('')
  const [editando, setEditando] = useState<{ original: string; enq: Enq } | null>(null)

  const gravar = (campos: Pick<Membro, 'foto' | 'fotoOriginal' | 'fotoEnq'>) =>
    setConfig({ responsaveis: { ...config.responsaveis, [resp]: { ...membro, ...campos } } })

  const escolher = async (arquivo: File | undefined) => {
    if (!arquivo) return
    setAviso('')
    if (!arquivo.type.startsWith('image/')) { setAviso('Escolha um arquivo de imagem (JPG, PNG…).'); return }
    try {
      setEditando({ original: await reduzirOriginal(arquivo), enq: ENQ_INICIAL })
    } catch {
      setAviso('Não consegui abrir essa imagem. Tente outra.')
    }
  }

  const salvar = async (enq: Enq) => {
    if (!editando) return
    try {
      gravar({ foto: await recortar(editando.original, enq), fotoOriginal: editando.original, fotoEnq: enq })
      setEditando(null)
    } catch {
      setAviso('Não consegui salvar a foto. Tente outra imagem.')
    }
  }

  // fotos salvas antes do ajuste (19/11) não têm original: reajusta a partir da própria foto
  const original = membro.fotoOriginal ?? membro.foto

  return (
    <div className="flex items-center gap-4 pt-6">{/* pt-6: espaço para a coroinha do dono, que sobe acima da foto */}
      <Avatar resp={resp} size={72} />
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => input.current?.click()}>
            <ImagePlus size={15} />{membro.foto ? 'Trocar foto' : 'Escolher foto'}
          </button>
          {original && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditando({ original, enq: membro.fotoEnq ?? ENQ_INICIAL })}>
              <Crop size={15} />Ajustar enquadramento
            </button>
          )}
          {membro.foto && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => gravar({ foto: undefined, fotoOriginal: undefined, fotoEnq: undefined })}>
              <Trash2 size={15} />Remover
            </button>
          )}
        </div>
        <span className="text-[12px] text-muted">Aparece no ícone do seu perfil. Depois de escolher, arraste e use o zoom para enquadrar.</span>
        {aviso && <span className="text-[12px] text-[var(--vermelho)]">{aviso}</span>}
      </div>
      <input ref={input} type="file" accept="image/*" className="hidden"
        onChange={(e) => { void escolher(e.target.files?.[0]); e.target.value = '' }} />
      {editando && <AjustarFoto original={editando.original} inicial={editando.enq} onCancelar={() => setEditando(null)} onSalvar={(e) => void salvar(e)} />}
    </div>
  )
}
