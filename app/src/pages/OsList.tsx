import clsx from 'clsx'
import { LayoutGrid, List, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Avatar, Empty, FarolChip, PageHeader, Segmented, StatusChip } from '../components/ui'
import { STATUS_ABERTOS, STATUS_META, STATUS_ORDER, TIPO_META, dataCurta, farolDe, refCurta } from '../lib/os'
import { filtrarEscopo, useStore } from '../store/useStore'
import type { OS, Status, TipoServico } from '../types'

type Visao = 'tabela' | 'quadro'

export function OsList() {
  const todas = useStore((s) => s.os)
  const escopo = useStore((s) => s.escopo)
  const [sp, setSp] = useSearchParams()
  const nav = useNavigate()
  const [visao, setVisao] = useState<Visao>('tabela')

  const status = (sp.get('status') ?? '') as Status | ''
  const farol = sp.get('farol') ?? ''
  const cidade = sp.get('cidade') ?? ''
  const bairro = sp.get('bairro') ?? ''
  const tipo = (sp.get('tipo') ?? '') as TipoServico | ''
  const q = sp.get('q') ?? ''
  const mostrarFechadas = sp.get('fechadas') === '1'

  const set = (k: string, v: string) => {
    const n = new URLSearchParams(sp)
    if (v) n.set(k, v); else n.delete(k)
    if (k === 'cidade') n.delete('bairro')
    setSp(n, { replace: true })
  }

  const base = useMemo(() => filtrarEscopo(todas, escopo), [todas, escopo])
  const cidades = useMemo(() => [...new Set(base.map((o) => o.endereco.cidade))].sort(), [base])
  const bairros = useMemo(() => [...new Set(base.filter((o) => !cidade || o.endereco.cidade === cidade).map((o) => o.endereco.bairro))].sort(), [base, cidade])

  const lista = useMemo(() => {
    const t = q.trim().toLowerCase()
    return base
      .filter((o) => (mostrarFechadas || status ? true : STATUS_ABERTOS.includes(o.status)))
      .filter((o) => !status || o.status === status)
      .filter((o) => !farol || farolDe(o).farol === farol)
      .filter((o) => !cidade || o.endereco.cidade === cidade)
      .filter((o) => !bairro || o.endereco.bairro === bairro)
      .filter((o) => !tipo || o.tipo === tipo)
      .filter((o) => !t || [o.referencia, refCurta(o.referencia), o.proponente, o.contato, o.endereco.logradouro, o.endereco.bairro, o.endereco.cidade].join(' ').toLowerCase().includes(t))
      .sort((a, b) => {
        const fa = farolDe(a).dias, fb = farolDe(b).dias
        if (fa === null && fb === null) return b.emissao.localeCompare(a.emissao)
        if (fa === null) return 1
        if (fb === null) return -1
        return fa - fb
      })
  }, [base, status, farol, cidade, bairro, tipo, q, mostrarFechadas])

  const filtrosAtivos = [status, farol, cidade, bairro, tipo, q].filter(Boolean).length

  return (
    <>
      <PageHeader
        title="Ordens de serviço"
        subtitle={`${lista.length} de ${base.length} O.S. no escopo · ordenadas por prazo`}
        actions={
          <Segmented<Visao>
            value={visao}
            onChange={setVisao}
            options={[
              { value: 'tabela', label: <span className="flex items-center gap-1.5"><List size={14} />Tabela</span> },
              { value: 'quadro', label: <span className="flex items-center gap-1.5"><LayoutGrid size={14} />Quadro</span> },
            ]}
          />
        }
      />

      <div className="card px-3 py-2.5 mb-4 flex flex-wrap items-center gap-2">
        <input className="input input-sm w-[220px]" placeholder="Buscar referência, nome, rua…" value={q} onChange={(e) => set('q', e.target.value)} />
        <select className="input input-sm" value={status} onChange={(e) => set('status', e.target.value)}>
          <option value="">Status: abertas</option>
          {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
        </select>
        <select className="input input-sm" value={farol} onChange={(e) => set('farol', e.target.value)}>
          <option value="">Prazo: todos</option>
          <option value="late">Vencidas</option>
          <option value="urgent">Vence hoje/amanhã</option>
          <option value="warn">2–3 dias</option>
          <option value="ok">Tranquilas</option>
        </select>
        <select className="input input-sm" value={cidade} onChange={(e) => set('cidade', e.target.value)}>
          <option value="">Cidade: todas</option>
          {cidades.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className="input input-sm" value={bairro} onChange={(e) => set('bairro', e.target.value)}>
          <option value="">Bairro: todos</option>
          {bairros.map((b) => <option key={b}>{b}</option>)}
        </select>
        <select className="input input-sm" value={tipo} onChange={(e) => set('tipo', e.target.value)}>
          <option value="">Tipo: todos</option>
          {(Object.keys(TIPO_META) as TipoServico[]).map((t) => <option key={t} value={t}>{TIPO_META[t].curto}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-[12px] text-muted ml-1">
          <input type="checkbox" checked={mostrarFechadas} onChange={(e) => set('fechadas', e.target.checked ? '1' : '')} /> incluir finalizadas
        </label>
        {filtrosAtivos > 0 && (
          <button className="btn btn-ghost btn-sm ml-auto" onClick={() => setSp(new URLSearchParams(), { replace: true })}><X size={13} /> limpar filtros</button>
        )}
      </div>

      {lista.length === 0 ? (
        <div className="card"><Empty title="Nenhuma O.S. com esses filtros" text="Ajuste os filtros ou troque o escopo no topo." /></div>
      ) : visao === 'tabela' ? (
        <div className="card overflow-hidden">
          <div className="overflow-auto max-h-[calc(100vh-260px)]">
            <table className="table">
              <thead>
                <tr>
                  <th className="w-[120px]">Prazo</th>
                  <th className="w-[70px]">Ref.</th>
                  <th>Proponente</th>
                  <th>Endereço</th>
                  <th className="w-[110px]">Tipo</th>
                  <th className="w-[130px]">Status</th>
                  <th className="w-[92px]">Vistoria</th>
                  {escopo === 'todas' && <th className="w-[60px]">Resp.</th>}
                </tr>
              </thead>
              <tbody>
                {lista.map((o) => (
                  <tr key={o.id} onClick={() => nav(`/os/${o.id}`)}>
                    <td><FarolChip os={o} /></td>
                    <td className="tnum text-muted">#{refCurta(o.referencia)}</td>
                    <td>
                      <div className="font-medium">{o.proponente}</div>
                      <div className="text-[12px] text-muted">{o.contato} · {o.telefone}</div>
                    </td>
                    <td>
                      <div>{o.endereco.logradouro}, {o.endereco.numero}</div>
                      <div className="text-[12px] text-muted">{o.endereco.bairro} · {o.endereco.cidade}</div>
                    </td>
                    <td className="text-[12.5px]">{TIPO_META[o.tipo].curto}</td>
                    <td><StatusChip status={o.status} curto /></td>
                    <td className="tnum text-[12.5px]">{o.vistoria ? `${dataCurta(o.vistoria.data)} ${o.vistoria.hora}` : <span className="text-muted">—</span>}</td>
                    {escopo === 'todas' && <td><Avatar resp={o.responsavel} size={22} /></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <Quadro lista={lista} mostrarResp={escopo === 'todas'} />
      )}
    </>
  )
}

function Quadro({ lista, mostrarResp }: { lista: OS[]; mostrarResp: boolean }) {
  const colunas = STATUS_ORDER.filter((s) => lista.some((o) => o.status === s))
  return (
    <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1">
      {colunas.map((st) => {
        const itens = lista.filter((o) => o.status === st)
        return (
          <div key={st} className="w-[268px] shrink-0 flex flex-col gap-2">
            <div className={clsx('chip', `status-${st}`, 'self-start')}><span className="dot" />{STATUS_META[st].label} · {itens.length}</div>
            {itens.map((o) => (
              <Link key={o.id} to={`/os/${o.id}`} className="card p-3 flex flex-col gap-2 hover:-translate-y-px transition">
                <div className="flex items-center justify-between gap-2">
                  <span className="tnum text-[12px] text-muted">#{refCurta(o.referencia)}</span>
                  <FarolChip os={o} />
                </div>
                <div className="font-medium leading-tight">{o.proponente}</div>
                <div className="text-[12px] text-muted leading-snug">{o.endereco.logradouro}, {o.endereco.numero}<br />{o.endereco.bairro} · {o.endereco.cidade}</div>
                <div className="flex items-center justify-between text-[12px] text-muted">
                  <span>{TIPO_META[o.tipo].curto}</span>
                  <span className="flex items-center gap-2 tnum">
                    {o.vistoria && `${dataCurta(o.vistoria.data)} ${o.vistoria.hora}`}
                    {mostrarResp && <Avatar resp={o.responsavel} size={20} />}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )
      })}
    </div>
  )
}
