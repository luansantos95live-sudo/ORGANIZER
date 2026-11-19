import { useMemo, useState } from 'react'
import type { Candidato } from '../../lib/amostragem/compor'
import { dadoVencido, estatistica, fmtData, fmtMoeda, fmtNum, lerNumero, semFonte, valorUnitario } from '../../lib/amostragem/calculo'
import { tipoPorId } from '../../lib/amostragem/catalogo'

/**
 * Passo "Escolher os dados" da amostragem composta: filtra por cidade, validade e fonte, marca os dados e mostra na
 * hora quantos são, de quantas cidades e a média do valor unitário escolhido.
 */
export function PassoDados({ todos, tipoId, escolhidos, onEscolher }: { todos: Candidato[]; tipoId: string; escolhidos: Set<string>; onEscolher: (s: Set<string>) => void }) {
  const [cidades, setCidades] = useState<Set<string>>(new Set())
  const [soValidos, setSoValidos] = useState(true)
  const [soComFonte, setSoComFonte] = useState(true)
  const tipo = tipoPorId(tipoId)
  const areaKey = tipo.areaKey

  const contagemCidade = useMemo(() => {
    const m = new Map<string, number>()
    for (const c of todos) m.set(c.cidade, (m.get(c.cidade) ?? 0) + 1)
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
  }, [todos])
  const vencido = (c: Candidato) => dadoVencido(c.dado, c.origem.validityMonths)
  const visiveis = todos
    .filter((c) => !cidades.size || cidades.has(c.cidade))
    .filter((c) => !soValidos || !vencido(c))
    .filter((c) => !soComFonte || !semFonte(c.dado))
  const unit = (c: Candidato) => valorUnitario(c.dado, tipoId)
  const sel = todos.filter((c) => escolhidos.has(c.chave))
  const est = estatistica(sel.map(unit).filter((x): x is number => x != null))
  const nCidades = new Set(sel.map((c) => c.cidade)).size

  const alternarCidade = (c: string) => {
    const s = new Set(cidades)
    if (s.has(c)) s.delete(c)
    else s.add(c)
    setCidades(s)
  }
  const alternar = (k: string) => {
    const s = new Set(escolhidos)
    if (s.has(k)) s.delete(k)
    else s.add(k)
    onEscolher(s)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12px] font-medium text-muted">Cidades:</span>
        {contagemCidade.map(([c, n]) => (
          <button key={c} type="button" className="var-pilula" aria-pressed={cidades.has(c)} onClick={() => alternarCidade(c)}>
            {c} <span className="text-[11px] opacity-70">{n}</span>
          </button>
        ))}
        <label className="ml-auto flex items-center gap-1.5 text-[12.5px]">
          <input type="checkbox" className="accent-[var(--brand)]" checked={soValidos} onChange={(e) => setSoValidos(e.target.checked)} />
          Só dentro da validade
        </label>
        <label className="flex items-center gap-1.5 text-[12.5px]">
          <input type="checkbox" className="accent-[var(--brand)]" checked={soComFonte} onChange={(e) => setSoComFonte(e.target.checked)} />
          Só com fonte
        </label>
      </div>

      <div className="resumo-compor">
        <b className="tnum">{sel.length}</b> {sel.length === 1 ? 'dado escolhido' : 'dados escolhidos'} de <b>{nCidades}</b> {nCidades === 1 ? 'cidade' : 'cidades'}
        {est && <> · média <b>{fmtMoeda(est.media)}</b> {tipo.unidade}</>}
        <span className="ml-auto flex gap-1.5">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => onEscolher(new Set([...escolhidos, ...visiveis.map((c) => c.chave)]))}>
            Marcar os {visiveis.length} da lista
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onEscolher(new Set())}>Limpar</button>
        </span>
      </div>

      <div className="max-h-[46vh] overflow-auto rounded-xl border border-border">
        <table className="grade-ficha">
          <thead>
            <tr>
              <th className="fixa" aria-label="Escolher" />
              <th>Cidade</th>
              <th>Bairro</th>
              <th>Endereço</th>
              <th>Coleta</th>
              <th className="th-num">Valor (R$)</th>
              {areaKey && <th className="th-num">Área</th>}
              <th className="th-num">{tipo.unidade}</th>
              <th>Amostragem de origem</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.map((c) => (
              <tr key={c.chave} className={`cursor-pointer ${vencido(c) ? 'a-atualizar' : ''}`} onClick={() => alternar(c.chave)}>
                <td className="fixa">
                  <input type="checkbox" className="mx-2 accent-[var(--brand)]" aria-label="Usar este dado" checked={escolhidos.has(c.chave)} onClick={(e) => e.stopPropagation()} onChange={() => alternar(c.chave)} />
                </td>
                <td className="px-2 font-medium">{c.cidade}</td>
                <td className="px-2">{String(c.dado.values.bairro ?? '')}</td>
                <td className="px-2">{String(c.dado.values.endereco ?? '')}</td>
                <td className="px-2 tnum">{fmtData(c.dado.collectedAt)}</td>
                <td className="px-2 text-right tnum">{fmtNum(lerNumero(c.dado.values.valor), 2)}</td>
                {areaKey && <td className="px-2 text-right tnum">{fmtNum(lerNumero(c.dado.values[areaKey]), 2)}</td>}
                <td className="unit">{unit(c) == null ? '—' : fmtMoeda(unit(c))}</td>
                <td className="px-2 text-[11.5px] text-muted">{c.origem.title}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visiveis.length && <p className="p-4 text-center text-[13px] text-muted">Nenhum dado com esses filtros.</p>}
      </div>
    </div>
  )
}
