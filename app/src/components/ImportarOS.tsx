import clsx from 'clsx'
import { FileUp, Mail, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { TIPOLOGIA_ORDEM, brl, type NovaOSInput } from '../lib/os'
import { lerSiopiTxt, type RascunhoOS } from '../lib/siopi'
import { useStore } from '../store/useStore'
import type { Origem, Responsavel, Tipologia } from '../types'
import { Abas, Modal } from './ui'

interface Linha { arquivo: string; r: RascunhoOS; marcada: boolean; origem: Origem }

/** "Nova OS": abas Arquivo (colar o conteúdo ou arrastar .txt), Manual (formulário, aberto pela NovaOS) e E-mail. */
export function ImportarOS({ open, onClose, onManual, abaInicial = 'arquivo' }: { open: boolean; onClose: () => void; onManual?: () => void; abaInicial?: 'arquivo' | 'email' }) {
  const config = useStore((s) => s.config)
  const escopo = useStore((s) => s.escopo)
  const existentes = useStore((s) => s.os)
  const importarOS = useStore((s) => s.importarOS)
  const inputRef = useRef<HTMLInputElement>(null)
  const [aba, setAba] = useState<'arquivo' | 'email'>(abaInicial)
  useEffect(() => { if (open) setAba(abaInicial) }, [open, abaInicial])
  const [linhas, setLinhas] = useState<Linha[]>([])
  const [colado, setColado] = useState('')
  const [arrastando, setArrastando] = useState(false)
  const [resp, setResp] = useState<Responsavel>(escopo === 'rt' ? 'rt' : 'luan')
  const [resultado, setResultado] = useState<string | null>(null)

  const refs = new Set(existentes.map((o) => o.referencia))
  const duplicada = (r: RascunhoOS) => !!r.referencia && refs.has(r.referencia)
  const invalida = (r: RascunhoOS) => !r.referencia || !r.endereco.bairro.trim() || !r.valorServico

  const addTextos = (itens: { arquivo: string; texto: string }[], origem: Origem) => {
    setResultado(null)
    setLinhas((atual) => [
      ...atual,
      ...itens.map(({ arquivo, texto }) => {
        const r = lerSiopiTxt(texto, config.prazoPadraoDias)
        return { arquivo, r, marcada: !duplicada(r) && !!r.referencia, origem }
      }),
    ])
  }

  const aoEscolher = async (files: FileList | File[] | null) => {
    const lista = [...(files ?? [])].filter((f) => f.name.toLowerCase().endsWith('.txt') || f.type === 'text/plain')
    if (!lista.length) return
    addTextos(await Promise.all(lista.map(async (f) => ({ arquivo: f.name, texto: await f.text() }))), 'arquivo')
    if (inputRef.current) inputRef.current.value = ''
  }

  const edit = (i: number, patch: Partial<RascunhoOS>) => setLinhas((l) => l.map((x, k) => (k === i ? { ...x, r: { ...x.r, ...patch } } : x)))
  const editBairro = (i: number, bairro: string) => setLinhas((l) => l.map((x, k) => (k === i ? { ...x, r: { ...x.r, endereco: { ...x.r.endereco, bairro } } } : x)))

  const escolhidas = linhas.filter((l) => l.marcada && !duplicada(l.r) && !invalida(l.r))

  const confirmar = () => {
    let criadas = 0, ignoradas = 0
    for (const origem of ['arquivo', 'texto'] as Origem[]) {
      const inputs: NovaOSInput[] = escolhidas.filter((l) => l.origem === origem).map(({ r }) => ({
        referencia: r.referencia, tipologia: r.tipologia, responsavel: resp, proponente: (r.proponente || r.contato || 'SEM NOME').toUpperCase(), documento: r.documento,
        contato: (r.contato || r.proponente).toUpperCase(), telefone: r.telefone, endereco: r.endereco, matricula: r.matricula, valorServico: r.valorServico,
        valorDeslocamento: r.valorDeslocamento, emissao: r.emissao, prazo: r.prazo, descricao: r.descricao, importacao: r.importacao, status: 'recebida',
      }))
      if (!inputs.length) continue
      const x = importarOS(inputs, origem)
      criadas += x.criadas
      ignoradas += x.ignoradas
    }
    setResultado(`${criadas} O.S. importada(s)${ignoradas ? `, ${ignoradas} ignorada(s) por já existirem` : ''}.`)
    setLinhas([])
    setColado('')
  }

  const fechar = () => { setLinhas([]); setColado(''); setResultado(null); setAba('arquivo'); onClose() }

  return (
    <Modal open={open} onClose={fechar} title="Nova OS" width={1034}
      footer={linhas.length > 0 ? <>
        <label className="flex items-center gap-2 text-[13px] mr-auto">Técnico
          <select className="input input-sm" value={resp} onChange={(e) => setResp(e.target.value as Responsavel)}>
            <option value="luan">{config.responsaveis.luan.nome}</option>
            <option value="rt">{config.responsaveis.rt.nome}</option>
          </select>
        </label>
        <button className="btn btn-secondary" onClick={() => setLinhas([])}>Limpar lista</button>
        <button className="btn btn-primary" disabled={!escolhidas.length} onClick={confirmar}>Importar {escolhidas.length || ''} OS</button>
      </> : undefined}
    >
      <Abas abas={[{ id: 'arquivo' as const, label: 'Arquivo' }, ...(onManual ? [{ id: 'manual' as const, label: 'Manual' }] : []), { id: 'email' as const, label: 'E-mail' }]} valor={aba}
        onChange={(a) => { if (a === 'manual') onManual?.(); else setAba(a) }} />
      {resultado && <div className="rounded-[10px] px-3 py-2 mb-3 text-[13px] chip-v">{resultado}</div>}

      {aba === 'arquivo' ? (
        <>
          <textarea className="input w-full min-h-[121px] tnum" value={colado} onChange={(e) => setColado(e.target.value)} placeholder="Cole aqui o conteúdo do arquivo TXT da CAIXA..." />
          <div className="flex justify-end mt-2">
            <button className={clsx("btn btn-sm", colado.trim() ? "btn-primary" : "btn-secondary")} disabled={!colado.trim()} onClick={() => { addTextos([{ arquivo: 'texto colado', texto: colado }], 'texto'); setColado('') }}>Importar texto</button>
          </div>
          <div className="text-center text-[12px] text-muted my-3">ou importe o arquivo</div>
          <label
            className={clsx('flex flex-col items-center justify-center gap-1.5 rounded-[12px] border-2 border-dashed px-4 py-8 text-center cursor-pointer transition', arrastando ? 'border-[var(--brand)] bg-[rgba(58,184,30,.08)]' : 'border-border hover:border-[var(--brand)]')}
            onDragOver={(e) => { e.preventDefault(); setArrastando(true) }}
            onDragLeave={() => setArrastando(false)}
            onDrop={(e) => { e.preventDefault(); setArrastando(false); aoEscolher([...e.dataTransfer.files]) }}
          >
            <Upload size={22} className="text-muted" />
            <span className="font-semibold">Arraste os arquivos ou clique para selecionar</span>
            <span className="text-[12.5px] text-muted">Um ou mais arquivos .txt da CAIXA</span>
            <span className="btn btn-primary btn-sm mt-2"><FileUp size={14} /> Importar arquivo</span>
            <input ref={inputRef} type="file" accept=".txt,text/plain" multiple className="sr-only" onChange={(e) => aoEscolher(e.target.files)} />
          </label>
        </>
      ) : (
        <div className="rounded-[12px] border border-border px-5 py-6 text-center">
          <Mail size={24} className="mx-auto text-muted" />
          <p className="font-semibold mt-2">Importe ordens de serviço diretamente do seu e-mail.</p>
          <p className="text-[13px] text-muted mt-1">O sistema busca e-mails com arquivos .txt da CAIXA e importa automaticamente. As que chegam assim aparecem no Início, em "Chegaram da CAIXA".</p>
          <button className="btn btn-secondary mt-4" disabled title="No laboratório não há conexão com o Gmail">Conectar Gmail</button>
          <p className="text-[12px] text-muted mt-2">No laboratório a conexão com o Gmail fica desligada. Use a aba Arquivo.</p>
        </div>
      )}

      {linhas.length > 0 && (
        <div className="overflow-auto max-h-[40vh] border border-border rounded-[10px] mt-4">
          <table className="table table-compact min-w-[820px]">
            <thead><tr><th className="w-8" /><th>Nº Referência</th><th>Cliente</th><th>Endereço</th><th>Bairro</th><th>Tipologia</th><th className="text-right">Total</th><th>Situação</th></tr></thead>
            <tbody>
              {linhas.map((l, i) => {
                const dup = duplicada(l.r)
                const inv = invalida(l.r)
                return (
                  <tr key={i} className="!cursor-default">
                    <td><input type="checkbox" className="accent-[var(--brand)]" aria-label="Importar" checked={l.marcada && !dup && !inv} disabled={dup || inv} onChange={(e) => setLinhas((x) => x.map((y, k) => (k === i ? { ...y, marcada: e.target.checked } : y)))} /></td>
                    <td className="tnum text-[12px]">{l.r.referencia || <span className="text-[var(--vermelho)]">não encontrada</span>}<div className="text-muted">{l.arquivo}</div></td>
                    <td className="text-[12.5px]">{l.r.proponente || '-'}</td>
                    <td className="text-[12.5px]">{l.r.endereco.logradouro}, {l.r.endereco.numero}<div className="text-muted">{l.r.endereco.cidade}/{l.r.endereco.uf}</div></td>
                    <td><input className={clsx('input input-sm w-[130px]', !l.r.endereco.bairro && '!border-[var(--vermelho)]')} aria-label="Bairro" value={l.r.endereco.bairro} onChange={(e) => editBairro(i, e.target.value)} /></td>
                    <td>
                      <select className="input input-sm" aria-label="Tipologia" value={l.r.tipologia} onChange={(e) => edit(i, { tipologia: e.target.value as Tipologia })}>
                        {TIPOLOGIA_ORDEM.map((t) => <option key={t}>{t}</option>)}
                      </select>
                    </td>
                    <td className="text-right tnum whitespace-nowrap">{brl(l.r.valorServico + l.r.valorDeslocamento)}</td>
                    <td className="text-[12px]">
                      {dup ? <span className="chip status-cancelada !no-underline">já existe</span> : inv ? <span className="chip farol-urgent" title={l.r.avisos.join(' ')}>revisar</span> : l.r.avisos.length ? <span className="chip farol-warn" title={l.r.avisos.join(' ')}>aviso</span> : <span className="chip chip-v">ok</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  )
}
