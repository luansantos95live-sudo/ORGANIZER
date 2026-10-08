import clsx from 'clsx'
import { FileUp } from 'lucide-react'
import { useRef, useState } from 'react'
import { TIPOLOGIAS } from '../lib/faturamento'
import { brl, type NovaOSInput } from '../lib/os'
import { lerSiopiTxt, type RascunhoOS } from '../lib/siopi'
import { useStore } from '../store/useStore'
import type { Responsavel, Tipologia } from '../types'
import { Modal } from './ui'

interface Linha { arquivo: string; r: RascunhoOS; marcada: boolean }

export function ImportarOS({ open, onClose }: { open: boolean; onClose: () => void }) {
  const config = useStore((s) => s.config)
  const escopo = useStore((s) => s.escopo)
  const existentes = useStore((s) => s.os)
  const importarOS = useStore((s) => s.importarOS)
  const inputRef = useRef<HTMLInputElement>(null)
  const [linhas, setLinhas] = useState<Linha[]>([])
  const [colado, setColado] = useState('')
  const [resp, setResp] = useState<Responsavel>(escopo === 'rt' ? 'rt' : 'luan')
  const [resultado, setResultado] = useState<string | null>(null)

  const refs = new Set(existentes.map((o) => o.referencia))
  const duplicada = (r: RascunhoOS) => !!r.referencia && refs.has(r.referencia)
  const invalida = (r: RascunhoOS) => !r.referencia || !r.endereco.bairro.trim() || !r.valorServico

  const addTextos = (itens: { arquivo: string; texto: string }[]) => {
    setResultado(null)
    setLinhas((atual) => {
      const novas = itens.map(({ arquivo, texto }) => {
        const r = lerSiopiTxt(texto, config.prazoPadraoDias)
        return { arquivo, r, marcada: !duplicada(r) && !!r.referencia }
      })
      return [...atual, ...novas]
    })
  }

  const aoEscolher = async (files: FileList | null) => {
    if (!files?.length) return
    const itens = await Promise.all([...files].map(async (f) => ({ arquivo: f.name, texto: await f.text() })))
    addTextos(itens)
    if (inputRef.current) inputRef.current.value = ''
  }

  const edit = (i: number, patch: Partial<RascunhoOS>) => setLinhas((l) => l.map((x, k) => (k === i ? { ...x, r: { ...x.r, ...patch } } : x)))
  const editEnd = (i: number, bairro: string) => setLinhas((l) => l.map((x, k) => (k === i ? { ...x, r: { ...x.r, endereco: { ...x.r.endereco, bairro } } } : x)))

  const escolhidas = linhas.filter((l) => l.marcada && !duplicada(l.r) && !invalida(l.r))

  const confirmar = () => {
    const inputs: NovaOSInput[] = escolhidas.map(({ r }) => ({
      referencia: r.referencia, tipo: r.tipo, tipologia: r.tipologia, responsavel: resp, proponente: r.proponente || r.contato || 'Sem nome',
      contato: r.contato, telefone: r.telefone, endereco: r.endereco, matricula: r.matricula, valorServico: r.valorServico,
      valorDeslocamento: r.valorDeslocamento, emissao: r.emissao, prazo: r.prazo, status: 'emitida',
    }))
    const { criadas, ignoradas } = importarOS(inputs)
    setResultado(`${criadas} O.S. importada(s)${ignoradas ? `, ${ignoradas} ignorada(s) por já existirem` : ''}.`)
    setLinhas([])
    setColado('')
  }

  const fechar = () => { setLinhas([]); setColado(''); setResultado(null); onClose() }

  return (
    <Modal open={open} onClose={fechar} title="Importar O.S. do SIOPI" width={900}>
      <p className="text-[13px] text-muted mb-3">Escolha um ou vários arquivos .txt das O.S. Os dados são lidos aqui no navegador, conferidos por você e só então cadastrados.</p>
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <label className="btn btn-primary cursor-pointer"><FileUp size={15} /> Escolher arquivos .txt
          <input id="importar-arquivos" ref={inputRef} type="file" accept=".txt,text/plain" multiple className="sr-only" onChange={(e) => aoEscolher(e.target.files)} />
        </label>
        <label className="flex items-center gap-2 text-[13px]">Atribuir a
          <select id="importar-resp" className="input input-sm" value={resp} onChange={(e) => setResp(e.target.value as Responsavel)}>
            <option value="luan">{config.responsaveis.luan.curto}</option>
            <option value="rt">{config.responsaveis.rt.curto}</option>
          </select>
        </label>
      </div>
      <details className="mb-3">
        <summary className="cursor-pointer text-[13px] text-muted">Ou cole o texto da O.S.</summary>
        <textarea id="importar-colar" className="input w-full mt-2 min-h-[110px] tnum" value={colado} onChange={(e) => setColado(e.target.value)} placeholder="Cole aqui o conteúdo do .txt" />
        <button id="importar-colar-ok" className="btn btn-secondary btn-sm mt-2" disabled={!colado.trim()} onClick={() => { addTextos([{ arquivo: 'texto colado', texto: colado }]); setColado('') }}>Ler texto colado</button>
      </details>

      {resultado && <div className="rounded-[10px] px-3 py-2 mb-3 text-[13px] kpi-sage" id="importar-resultado">{resultado}</div>}

      {linhas.length > 0 && (
        <div className="overflow-auto max-h-[46vh] border border-border rounded-[10px]">
          <table className="table table-compact min-w-[800px]">
            <thead><tr><th className="w-8" /><th>Referência</th><th>Proponente</th><th>Endereço</th><th>Bairro</th><th>Tipologia</th><th className="text-right">Total</th><th>Situação</th></tr></thead>
            <tbody>
              {linhas.map((l, i) => {
                const dup = duplicada(l.r)
                const inv = invalida(l.r)
                return (
                  <tr key={i} className="!cursor-default">
                    <td><input type="checkbox" aria-label="Importar" checked={l.marcada && !dup && !inv} disabled={dup || inv} onChange={(e) => setLinhas((x) => x.map((y, k) => (k === i ? { ...y, marcada: e.target.checked } : y)))} /></td>
                    <td className="tnum text-[12px]">{l.r.referencia || <span className="text-[var(--f-urgent-fg)]">não encontrada</span>}<div className="text-muted">{l.arquivo}</div></td>
                    <td className="text-[12.5px]">{l.r.proponente || '—'}</td>
                    <td className="text-[12.5px]">{l.r.endereco.logradouro}, {l.r.endereco.numero}<div className="text-muted">{l.r.endereco.cidade}/{l.r.endereco.uf}</div></td>
                    <td><input className={clsx('input input-sm w-[130px]', !l.r.endereco.bairro && 'border-[var(--f-urgent-fg)]')} aria-label="Bairro" value={l.r.endereco.bairro} onChange={(e) => editEnd(i, e.target.value)} /></td>
                    <td>
                      <select className="input input-sm" aria-label="Tipologia" value={l.r.tipologia} onChange={(e) => edit(i, { tipologia: e.target.value as Tipologia })}>
                        {(Object.keys(TIPOLOGIAS) as Tipologia[]).map((t) => <option key={t}>{t}</option>)}
                      </select>
                    </td>
                    <td className="text-right tnum whitespace-nowrap">{brl(l.r.valorServico + l.r.valorDeslocamento)}</td>
                    <td className="text-[12px]">
                      {dup ? <span className="chip kpi-stone">já existe</span> : inv ? <span className="chip farol-urgent" title={l.r.avisos.join(' ')}>revisar</span> : l.r.avisos.length ? <span className="chip farol-warn" title={l.r.avisos.join(' ')}>aviso</span> : <span className="chip status-finalizada">ok</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex justify-end gap-2 mt-4">
        <button className="btn btn-secondary" onClick={fechar}>Fechar</button>
        <button id="importar-confirmar" className="btn btn-primary" disabled={!escolhidas.length} onClick={confirmar}>Importar {escolhidas.length || ''} O.S.</button>
      </div>
    </Modal>
  )
}
