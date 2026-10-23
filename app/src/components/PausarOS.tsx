import clsx from 'clsx'
import { format } from 'date-fns'
import { DoorClosed, FileWarning, PauseCircle } from 'lucide-react'
import { useState } from 'react'
import { PEPT_LIMITE, PEPT_SEM_PRAZO, codigoOS, dataMedia, limiteParaPausar } from '../lib/os'
import { TIPO_PEPT } from '../lib/pept'
import { useStore } from '../store/useStore'
import type { OS, TipoPept } from '../types'
import { Modal } from './ui'

const ICONE: Record<TipoPept, typeof FileWarning> = { documental: FileWarning, vistoria: DoorClosed }

/**
 * Pausar a O.S. (abrir PEPT), simples: o tipo (documental ou de vistoria), uma caixa para descrever o motivo e o dia.
 * O prazo efetivo conta a pausa desde esse dia; tudo fica registrado na aba PEPT da O.S.
 * É a única janela de pausa do sistema (Kanban, Início, janela da O.S. e passo a passo usam esta).
 */
export function PausarOS({ os, onClose }: { os: OS; onClose: () => void }) {
  const pausar = useStore((s) => s.pausar)
  const hoje = format(new Date(), 'yyyy-MM-dd')
  const [tipo, setTipo] = useState<TipoPept | null>(null)
  const [desde, setDesde] = useState(hoje)
  const [motivo, setMotivo] = useState('')
  const lim = PEPT_LIMITE[os.tipologia]
  const regra = PEPT_SEM_PRAZO.includes(os.tipologia)
    ? `${os.tipologia}: enquanto a PEPT estiver aberta, o prazo fica indeterminado.`
    : lim ? `${os.tipologia}: a PEPT segura o prazo por no máximo ${lim} dias.` : 'Os dias parados empurram o prazo.'
  // a PEPT só pausa o prazo se for aberta até 2 dias depois do recebimento
  const limite = limiteParaPausar(os.emissao)
  const pausa = desde <= limite
  const confirmar = () => { if (!tipo) return; pausar(os.id, tipo, motivo.trim(), desde); onClose() }
  return (
    <Modal open onClose={onClose} title={`Pausar ${codigoOS(os)} (PEPT)`} width={500}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" disabled={!tipo} onClick={confirmar} title={tipo ? undefined : 'Escolha se é documental ou de vistoria'}><PauseCircle size={15} /> Pausar</button>
      </>}>
      <p className="text-[13px] text-muted mb-3"><b className="text-[var(--text)]">{os.proponente}</b>. {regra}</p>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="rounded-[10px] border border-border px-3 py-2"><div className="text-[11px] uppercase tracking-[.07em] text-muted font-bold">O.S. recebida em</div><div className="text-[15px] font-bold tnum mt-0.5">{dataMedia(os.emissao)}</div></div>
        <div className="rounded-[10px] border border-border px-3 py-2"><div className="text-[11px] uppercase tracking-[.07em] text-muted font-bold">Pausa o prazo se aberta até</div><div className="text-[15px] font-bold tnum mt-0.5">{dataMedia(limite)}</div></div>
      </div>

      <div className="text-[12px] font-semibold text-muted mb-1.5">A pendência é</div>
      <div className="grid grid-cols-2 gap-2 mb-4" role="radiogroup" aria-label="Tipo da pendência">
        {(Object.keys(TIPO_PEPT) as TipoPept[]).map((t) => {
          const Ic = ICONE[t]
          const ativo = tipo === t
          return (
            <button key={t} type="button" role="radio" aria-checked={ativo} onClick={() => setTipo(t)} title={TIPO_PEPT[t].descricao}
              className={clsx('h-11 rounded-[12px] border px-3 flex items-center justify-center gap-2 font-semibold text-[14px] transition', ativo ? 'border-[var(--brand)] bg-[var(--brand-soft)]' : 'border-border hover:border-[var(--fraco)]')}>
              <Ic size={16} className={ativo ? 'text-[var(--verde-valor)]' : 'text-muted'} />{TIPO_PEPT[t].label}
            </button>
          )
        })}
      </div>

      <label className="flex flex-col gap-1 mb-4">
        <span className="text-[12px] font-semibold text-muted">Motivo da PEPT</span>
        <textarea className="input min-h-[96px] py-2 leading-snug resize-y" placeholder="Descreva a pendência…" value={motivo} onChange={(e) => setMotivo(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) confirmar() }} />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[12px] font-semibold text-muted">Pausou em</span>
        <input type="date" className="input w-[180px]" max={hoje} min={os.emissao} value={desde} onChange={(e) => setDesde(e.target.value)} />
      </label>
      {desde && (pausa
        ? <p className="text-[12.5px] text-[var(--verde-valor)] mt-2">Dentro dos 2 dias do recebimento: o prazo fica pausado a partir desse dia.</p>
        : <p className="text-[12.5px] mt-2 rounded-lg px-3 py-2 bg-[var(--vermelho-soft)] text-[var(--vermelho)]">Aberta depois de {dataMedia(limite)} (mais de 2 dias do recebimento): a PEPT fica registrada, mas <b>o prazo não pausa</b>.</p>)}
    </Modal>
  )
}
