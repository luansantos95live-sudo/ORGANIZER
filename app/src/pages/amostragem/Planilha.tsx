import { CopyPlus, ExternalLink, GripVertical, ListPlus, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react'
import type { DadoAmostra, ValorDado, VariavelAmostra } from '../../lib/amostragem/types'
import { converter, dadoVazio, dadoVencido, fmtMoeda, lerNumero, type resumo, semFonte } from '../../lib/amostragem/calculo'
import { rotuloColuna } from '../../lib/amostragem/catalogo'

type Resumo = ReturnType<typeof resumo>

/** Texto do campo enquanto edita: números no formato brasileiro. */
function textoEdicao(v: VariavelAmostra, x: ValorDado): string {
  if (x == null) return ''
  if (v.type === 'moeda') {
    const n = lerNumero(x)
    return n == null ? String(x) : n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  if (v.type === 'numero') {
    const n = lerNumero(x)
    return n == null ? String(x) : n.toLocaleString('pt-BR', { maximumFractionDigits: 6 })
  }
  if (v.type === 'simnao') return x === true ? 'sim' : x === false ? 'nao' : ''
  return String(x)
}
const ehLink = (x: ValorDado) => typeof x === 'string' && /^https?:\/\//i.test(x.trim())

/** Campo de texto/número que guarda só ao sair da célula (como no Excel), sem redesenhar a planilha a cada letra. */
function CampoTexto({ v, valor, falta, onChange }: { v: VariavelAmostra; valor: ValorDado; falta?: boolean; onChange: (x: unknown) => void }) {
  const externo = textoEdicao(v, valor)
  const [texto, setTexto] = useState(externo)
  useEffect(() => setTexto(externo), [externo])
  const num = v.type === 'numero' || v.type === 'moeda'
  const longa = v.key === 'endereco' || v.key === 'link'
  return (
    <input
      aria-label={rotuloColuna(v)}
      className={`cel ${num ? 'num' : ''} ${longa ? 'cel-longa' : ''} ${falta ? 'falta' : ''}`}
      inputMode={num ? 'decimal' : undefined}
      placeholder={falta ? 'obrigatório' : undefined}
      title={!num && texto.length > 24 ? texto : undefined}
      value={texto}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={() => {
        if (texto === externo) return
        onChange(texto)
        if (num) setTexto(textoEdicao(v, converter(v, texto)))
      }}
    />
  )
}

/** Campo de uma célula da planilha, pelo tipo da variável; cresce com o conteúdo. */
function Celula({ v, valor, falta, onChange }: { v: VariavelAmostra; valor: ValorDado; falta?: boolean; onChange: (x: unknown) => void }) {
  if (v.type === 'simnao')
    return (
      <select className="cel" aria-label={rotuloColuna(v)} value={textoEdicao(v, valor)} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        <option value="sim">Sim</option>
        <option value="nao">Não</option>
      </select>
    )
  if (v.type === 'opcao') {
    const ops = v.options ?? []
    const atual = valor == null ? '' : String(valor)
    return (
      <select className="cel" aria-label={rotuloColuna(v)} value={atual} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {ops.map((o) => <option key={o} value={o}>{o}</option>)}
        {atual && !ops.includes(atual) && <option value={atual}>{atual}</option>}
      </select>
    )
  }
  if (v.type === 'data')
    return <input type="date" className="cel cel-data" aria-label={rotuloColuna(v)} value={typeof valor === 'string' ? valor : ''} onChange={(e) => onChange(e.target.value)} />
  return <CampoTexto v={v} valor={valor} falta={falta} onChange={onChange} />
}

/**
 * Planilha dos dados de mercado, com jeito de Excel: colunas do tamanho do conteúdo, colar um bloco do Excel numa
 * célula (cria as linhas que faltarem), Enter desce de linha, arrastar o título para reordenar as colunas, "+" para
 * adicionar coluna e a barra para criar linhas embaixo. Dado com coleta vencida fica amarelo; sem fonte, em vermelho.
 */
export function Planilha(p: {
  vars: VariavelAmostra[]
  itens: DadoAmostra[]
  meses: number
  r: Resumo
  unidade: string
  caixaRef: React.RefObject<HTMLDivElement | null>
  onCel: (i: number, v: VariavelAmostra, bruto: unknown) => void
  onData: (i: number, data: string) => void
  onAtivo: (i: number, ativo: boolean) => void
  onAtualizar: (i: number) => void
  onDuplicar: (i: number) => void
  onRemover: (i: number) => void
  onMover: (de: number, para: number) => void
  onAdicionarColuna: () => void
  onColar: (linha: number, coluna: number, matriz: string[][]) => void
  onNovaLinha: () => void
  onMaisLinhas: (n: number) => void
  onInserirAbaixo: (i: number) => void
}) {
  const [qtd, setQtd] = useState(10)
  const grupoMudou = (i: number) => i === 0 || p.vars[i - 1]!.group !== p.vars[i]!.group

  // Arrastar o título para reordenar as colunas: com ponteiro (mouse, toque ou caneta). No teclado: Alt + ← →.
  const [arrastando, setArrastando] = useState<number | null>(null)
  const [alvo, setAlvo] = useState<{ i: number; antes: boolean } | null>(null)
  const estado = useRef<{ inicio: { i: number; x: number; y: number } | null; arrastando: number | null; alvo: { i: number; antes: boolean } | null }>({ inicio: null, arrastando: null, alvo: null })
  const onMover = useRef(p.onMover)
  onMover.current = p.onMover
  const alvoNoPonto = (x: number, y: number) => {
    const th = document.elementFromPoint(x, y)?.closest<HTMLElement>('th.th-var')
    const i = th ? Number(th.dataset.i) : NaN
    if (!th || Number.isNaN(i)) return null
    const r = th.getBoundingClientRect()
    return { i, antes: x < r.left + r.width / 2 }
  }
  const mover = (e: PointerEvent) => {
    const s = estado.current
    if (!s.inicio) return
    if (s.arrastando == null) {
      if (Math.hypot(e.clientX - s.inicio.x, e.clientY - s.inicio.y) < 6) return
      s.arrastando = s.inicio.i
      setArrastando(s.arrastando)
      document.body.style.cursor = 'grabbing'
    }
    e.preventDefault()
    s.alvo = alvoNoPonto(e.clientX, e.clientY)
    setAlvo(s.alvo)
  }
  const soltar = () => {
    const s = estado.current
    if (s.arrastando != null && s.alvo) {
      let para = s.alvo.antes ? s.alvo.i : s.alvo.i + 1
      if (s.arrastando < para) para--
      if (para !== s.arrastando) onMover.current(s.arrastando, para)
    }
    estado.current = { inicio: null, arrastando: null, alvo: null }
    setArrastando(null)
    setAlvo(null)
    document.body.style.cursor = ''
    window.removeEventListener('pointermove', mover)
    window.removeEventListener('pointerup', soltar)
    window.removeEventListener('pointercancel', soltar)
  }
  const comecar = (e: React.PointerEvent, i: number) => {
    if (e.button !== 0) return
    estado.current.inicio = { i, x: e.clientX, y: e.clientY }
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
    window.addEventListener('pointercancel', soltar)
  }
  useEffect(() => () => soltar(), []) // eslint-disable-line react-hooks/exhaustive-deps

  // Como no Excel: colar várias linhas/colunas a partir da célula (cria as linhas que faltarem) e Enter desce.
  const posicao = (alvoEl: EventTarget | null) => {
    const td = (alvoEl as HTMLElement | null)?.closest<HTMLElement>('td[data-col]')
    const tr = td?.closest<HTMLElement>('tr[data-row]')
    return td && tr ? { linha: Number(tr.dataset.row), coluna: Number(td.dataset.col) } : null
  }
  const colar = (e: ClipboardEvent<HTMLTableElement>) => {
    const pos = posicao(e.target)
    const limpo = (e.clipboardData.getData('text/plain') ?? '').replace(/\r?\n$/, '')
    if (!pos || !/[\t\n]/.test(limpo)) return // um valor só: cola normal
    e.preventDefault()
    p.onColar(pos.linha, pos.coluna, limpo.split(/\r?\n/).map((l) => l.split('\t')))
  }
  const teclar = (e: KeyboardEvent<HTMLTableElement>) => {
    if (e.key !== 'Enter' || e.altKey || e.ctrlKey || e.metaKey) return
    const alvoEl = e.target as HTMLElement
    if (alvoEl.tagName === 'SELECT') return
    const pos = posicao(alvoEl)
    if (!pos) return
    e.preventDefault()
    alvoEl.blur() // grava o valor antes de descer
    const prox = pos.linha + (e.shiftKey ? -1 : 1)
    if (prox < 0) return
    if (prox >= p.itens.length) p.onNovaLinha()
    setTimeout(() => p.caixaRef.current?.querySelector<HTMLElement>(`tr[data-row="${prox}"] td[data-col="${pos.coluna}"] .cel`)?.focus(), 30)
  }

  return (
    <div ref={p.caixaRef} className="max-h-[calc(100vh-220px)] overflow-auto">
      <table className="grade-ficha" aria-label="Dados de mercado" onPaste={colar} onKeyDown={teclar}>
        <thead>
          <tr>
            <th className="fixa"><span className="grupo">&nbsp;</span>Nº</th>
            <th><span className="grupo">Coleta</span>Data</th>
            {p.vars.map((v, i) => (
              <th
                key={v.key}
                data-i={i}
                tabIndex={0}
                className={[
                  'th-var',
                  v.type === 'numero' || v.type === 'moeda' ? 'th-num' : '',
                  v.key === 'link' ? 'col-obrig' : '',
                  arrastando === i ? 'arrastando' : '',
                  alvo?.i === i ? (alvo.antes ? 'alvo-antes' : 'alvo-depois') : '',
                ].join(' ')}
                title={`Arraste para mudar a ordem (ou Alt + ← →)${v.options ? `\n${v.options.join(' · ')}` : ''}`}
                onPointerDown={(e) => comecar(e, i)}
                onKeyDown={(e) => {
                  if (!e.altKey) return
                  if (e.key === 'ArrowLeft' && i > 0) { e.preventDefault(); p.onMover(i, i - 1) }
                  else if (e.key === 'ArrowRight' && i < p.vars.length - 1) { e.preventDefault(); p.onMover(i, i + 1) }
                }}>
                <span className="grupo">{grupoMudou(i) ? v.group : ' '}</span>
                <span className="pega" aria-hidden="true"><GripVertical size={11} /></span>
                {rotuloColuna(v)}
                {v.key === 'link' && ' *'}
              </th>
            ))}
            <th className="th-mais">
              <button type="button" className="btn-mais" title="Adicionar coluna (variável)" aria-label="Adicionar coluna" onClick={p.onAdicionarColuna}>
                <Plus size={14} />
              </button>
            </th>
            <th className="th-num"><span className="grupo">Calculado</span>{p.unidade}</th>
            <th aria-label="Ações" />
          </tr>
        </thead>
        <tbody>
          {p.itens.map((d, i) => {
            const vencido = dadoVencido(d, p.meses)
            const u = p.r.unitarios.get(d.id) ?? null
            return (
              <tr key={d.id} data-row={i} className={`${!d.active ? 'inativo' : ''} ${vencido ? 'a-atualizar' : ''}`}>
                <td className="fixa">
                  <label className="flex items-center gap-1.5 pl-1.5 pr-1 text-[12px] font-semibold tnum" title={`Usar este dado no cálculo${d.origem ? `\nVeio de: ${d.origem}` : ''}`}>
                    <input type="checkbox" className="accent-[var(--brand)]" checked={d.active} onChange={(e) => p.onAtivo(i, e.target.checked)} />
                    {i + 1}
                  </label>
                </td>
                <td data-col="0">
                  <div className="flex items-center gap-0.5">
                    <input
                      type="date"
                      aria-label={`Data da coleta do dado ${i + 1}`}
                      className="cel cel-data primeiro"
                      title={vencido ? `Coleta com mais de ${p.meses} meses: atualize o dado` : undefined}
                      value={d.collectedAt}
                      onChange={(e) => p.onData(i, e.target.value)}
                    />
                    {vencido && (
                      <button type="button" className="btn-atualizar" title="Coleta refeita hoje: confira o valor e marque a nova data" aria-label={`Atualizar a coleta do dado ${i + 1}`} onClick={() => p.onAtualizar(i)}>
                        <RefreshCw size={12} /> Atualizar
                      </button>
                    )}
                  </div>
                </td>
                {p.vars.map((v, j) => (
                  <td key={v.key} data-col={j + 1}>
                    <div className="flex items-center">
                      <Celula v={v} valor={d.values[v.key] ?? null} falta={v.key === 'link' && semFonte(d) && !dadoVazio(d)} onChange={(x) => p.onCel(i, v, x)} />
                      {v.key === 'link' && ehLink(d.values.link ?? null) && (
                        <a href={String(d.values.link).trim()} target="_blank" rel="noopener noreferrer" className="ml-0.5 text-muted hover:text-[var(--verde-valor)]" title="Abrir o anúncio" aria-label="Abrir o anúncio">
                          <ExternalLink size={13} />
                        </a>
                      )}
                    </div>
                  </td>
                ))}
                <td className="td-mais" aria-hidden="true" />
                <td className={`unit ${p.r.suspeitos.has(d.id) ? 'suspeito' : ''}`} title={p.r.suspeitos.has(d.id) ? 'Possível dado discrepante (critério de Chauvenet)' : undefined}>
                  {u == null ? '—' : fmtMoeda(u)}
                </td>
                <td className="whitespace-nowrap pr-1.5">
                  <button className="btn btn-ghost btn-icon !h-7 !w-7" title="Inserir linha vazia abaixo" aria-label="Inserir linha abaixo" onClick={() => p.onInserirAbaixo(i)}><ListPlus size={14} /></button>
                  <button className="btn btn-ghost btn-icon !h-7 !w-7" title="Duplicar dado" aria-label="Duplicar dado" onClick={() => p.onDuplicar(i)}><CopyPlus size={14} /></button>
                  <button className="btn btn-ghost btn-icon !h-7 !w-7 text-[var(--vermelho)]" title="Remover dado" aria-label="Remover dado" onClick={() => p.onRemover(i)}><Trash2 size={14} /></button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="barra-linhas">
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => p.onMaisLinhas(1)}><Plus size={14} /> 1 linha</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => p.onMaisLinhas(5)}>+ 5</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => p.onMaisLinhas(10)}>+ 10</button>
        <span className="text-[12px] text-muted">ou</span>
        <input
          type="number"
          min={1}
          max={500}
          className="input input-sm w-[72px] text-right"
          aria-label="Quantidade de linhas"
          value={qtd}
          onChange={(e) => setQtd(Math.round(Number(e.target.value)))}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (qtd >= 1 && qtd <= 500) p.onMaisLinhas(qtd) } }}
        />
        <button type="button" className="btn btn-ghost btn-sm" disabled={!(qtd >= 1 && qtd <= 500)} onClick={() => p.onMaisLinhas(qtd)}>Adicionar linhas</button>
      </div>
    </div>
  )
}
