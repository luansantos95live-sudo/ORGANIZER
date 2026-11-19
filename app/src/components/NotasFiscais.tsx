import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { FileUp, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { juntarNotas, lerNotaXML, type NotaLida } from '../lib/notasFiscais'
import { cap } from '../lib/os'
import { useStore } from '../store/useStore'
import type { NotaFiscal } from '../types'
import { Modal } from './ui'

const paraTexto = (v: number | undefined) => (v === undefined ? '' : v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
const paraNumero = (t: string) => {
  const limpo = t.replace(/[^\d,.-]/g, '')
  const n = Number(limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo)
  return Number.isFinite(n) ? n : NaN
}

/**
 * Notas fiscais dos últimos 6 meses (19/11): a empresa emite uma nota no fim de cada mês com as O.S. finalizadas.
 * Aqui se digita o valor de cada mês ou se importam os XML das notas (lidos por `lerNotaXML`), para o gráfico
 * "Últimos 6 meses" comparar o faturamento calculado pelas O.S. com o que foi faturado de fato.
 */
export function NotasFiscais({ meses, onClose }: { meses: Date[]; onClose: () => void }) {
  const config = useStore((s) => s.config)
  const setConfig = useStore((s) => s.setConfig)
  const chaves = meses.map((m) => format(m, 'yyyy-MM'))
  const [lista, setLista] = useState<NotaFiscal[]>(config.notasFiscais ?? [])
  const [textos, setTextos] = useState<Record<string, string>>(() =>
    Object.fromEntries(chaves.map((k) => [k, paraTexto((config.notasFiscais ?? []).find((n) => n.mes === k)?.valor)])))
  const [aviso, setAviso] = useState('')
  const input = useRef<HTMLInputElement>(null)

  const importar = async (arquivos: FileList | null) => {
    if (!arquivos?.length) return
    const lidas: NotaLida[] = []
    let ruins = 0
    for (const f of Array.from(arquivos)) {
      const n = lerNotaXML(await f.text())
      if (n) lidas.push(n); else ruins++
    }
    // o que foi digitado à mão vale como base antes de somar o que veio do XML
    const base = aplicarTextos(lista, textos)
    const r = juntarNotas(base, lidas)
    setLista(r.lista)
    setTextos((t) => ({ ...t, ...Object.fromEntries(chaves.map((k) => [k, paraTexto(r.lista.find((n) => n.mes === k)?.valor)])) }))
    const fora = lidas.filter((n) => !chaves.includes(n.data.slice(0, 7))).length
    setAviso([
      `${r.entraram} ${r.entraram === 1 ? 'nota importada' : 'notas importadas'}`,
      r.repetidas ? `${r.repetidas} já estava${r.repetidas === 1 ? '' : 'm'} aqui` : '',
      ruins ? `${ruins} arquivo${ruins === 1 ? '' : 's'} sem valor/data de nota (só XML de NFS-e)` : '',
      fora ? `${fora} de outro${fora === 1 ? '' : 's'} mês${fora === 1 ? '' : 'es'} (guardada${fora === 1 ? '' : 's'}, aparece${fora === 1 ? '' : 'm'} ao mudar o período)` : '',
    ].filter(Boolean).join(' · '))
  }

  const salvar = () => {
    const ruim = chaves.find((k) => textos[k]?.trim() && Number.isNaN(paraNumero(textos[k])))
    if (ruim) { setAviso(`Valor inválido em ${cap(format(meses[chaves.indexOf(ruim)], 'MMMM', { locale: ptBR }))}.`); return }
    setConfig({ notasFiscais: aplicarTextos(lista, textos) })
    onClose()
  }

  return (
    <Modal open onClose={onClose} title="Notas fiscais dos últimos 6 meses" width={520}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={salvar}>Salvar</button>
      </>}>
      <p className="text-[12.5px] text-muted mb-3">
        Digite o valor da nota de cada mês ou importe os arquivos XML das notas (pode escolher vários de uma vez).
        O gráfico mostra a nota ao lado do faturamento das O.S. finalizadas, para comparar.
      </p>
      <button type="button" className="btn btn-secondary btn-sm mb-3" onClick={() => input.current?.click()}>
        <FileUp size={15} />Importar XML das notas
      </button>
      <input ref={input} type="file" accept=".xml,text/xml,application/xml" multiple className="hidden"
        onChange={(e) => { void importar(e.target.files); e.target.value = '' }} />
      <div className="flex flex-col divide-y divide-border rounded-[12px] border border-border">
        {chaves.map((k, i) => {
          const nota = lista.find((n) => n.mes === k)
          return (
            <label key={k} className="flex items-center gap-3 px-3 py-2">
              <span className="w-[110px] font-medium">{cap(format(meses[i], "MMMM 'de' yy", { locale: ptBR }))}</span>
              <span className="text-muted text-[12.5px]">R$</span>
              <input className="input input-sm tnum w-[140px]" inputMode="decimal" placeholder="0,00" value={textos[k] ?? ''}
                onChange={(e) => setTextos((t) => ({ ...t, [k]: e.target.value }))} />
              <span className="flex-1 min-w-0 truncate text-[12px] text-muted">{nota?.numeros.length ? `Nº ${nota.numeros.join(', ')}` : ''}</span>
              {textos[k] && (
                <button type="button" className="btn btn-ghost btn-icon" aria-label="Limpar mês" title="Limpar mês"
                  onClick={() => { setTextos((t) => ({ ...t, [k]: '' })); setLista((l) => l.filter((n) => n.mes !== k)) }}>
                  <X size={14} />
                </button>
              )}
            </label>
          )
        })}
      </div>
      {aviso && <p className="text-[12.5px] mt-3">{aviso}</p>}
    </Modal>
  )
}

/** Valores digitados na janela por cima da lista: mês com texto vira esse valor; mês apagado sai. */
function aplicarTextos(lista: NotaFiscal[], textos: Record<string, string>): NotaFiscal[] {
  const porMes = new Map(lista.map((n) => [n.mes, n]))
  for (const [mes, t] of Object.entries(textos)) {
    const v = t.trim() ? paraNumero(t) : NaN
    if (Number.isNaN(v) || v <= 0) { if (!t.trim()) porMes.delete(mes); continue }
    const atual = porMes.get(mes)
    porMes.set(mes, { mes, valor: Math.round(v * 100) / 100, numeros: atual?.numeros ?? [] })
  }
  return [...porMes.values()].sort((a, b) => a.mes.localeCompare(b.mes))
}
