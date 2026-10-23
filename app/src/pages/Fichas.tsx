import clsx from 'clsx'
import { startOfMonth } from 'date-fns'
import { Check, MapPin, Search, Tag } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Empty, FiltroPeriodo, Filtro, MultiSelect, PageHeader, StatusChip, TipologiaChip } from '../components/ui'
import { intervalo, noIntervalo, type Periodo } from '../lib/faturamento'
import { POLOS, TIPOLOGIAS, TIPOLOGIAS_COM_FICHA, codigoOS, poloDe } from '../lib/os'
import { filtrarEscopo, useStore } from '../store/useStore'
import type { Tipologia } from '../types'

type Situacao = 'todas' | 'pendentes' | 'fornecidas'

/** Fichas de Pesquisa do sistema real: uma linha por O.S. de avaliação, marcando se a ficha de mercado já foi fornecida. */
export function Fichas() {
  const todas = useStore((s) => s.os)
  const escopo = useStore((s) => s.escopo)
  const marcarFicha = useStore((s) => s.marcarFicha)
  const nav = useNavigate()
  const [busca, setBusca] = useState('')
  const [tipologias, setTipologias] = useState<Tipologia[]>([])
  const [polos, setPolos] = useState<string[]>([])
  const [periodo, setPeriodo] = useState<Periodo>('todos')
  const [ref, setRef] = useState(() => startOfMonth(new Date()))
  const [especifico, setEspecifico] = useState({ ini: '', fim: '' })
  const [situacao, setSituacao] = useState<Situacao>('todas')
  const { ini, fim } = intervalo(periodo, ref, especifico)

  const base = useMemo(() => {
    const t = busca.trim().toLowerCase()
    return filtrarEscopo(todas, escopo)
      .filter((o) => TIPOLOGIAS_COM_FICHA.includes(o.tipologia) && o.status !== 'cancelada')
      .filter((o) => !tipologias.length || tipologias.includes(o.tipologia))
      .filter((o) => !polos.length || polos.includes(poloDe(o.endereco.cidade)))
      .filter((o) => noIntervalo(o, ini, fim))
      .filter((o) => !t || [o.referencia, codigoOS(o), o.proponente].join(' ').toLowerCase().includes(t))
      .sort((a, b) => b.numero - a.numero)
  }, [todas, escopo, tipologias, polos, ini, fim, busca])
  const lista = base.filter((o) => (situacao === 'todas' ? true : situacao === 'fornecidas' ? o.fichaFornecida : !o.fichaFornecida))
  const fornecidas = base.filter((o) => o.fichaFornecida).length

  return (
    <>
      <PageHeader title="Fichas de Pesquisa" subtitle="Controle as fichas de pesquisa por ordem de serviço" />
      <div className="flex flex-wrap items-end gap-3 mb-3">
        <Filtro label="Buscar" className="flex-1 min-w-[200px] max-w-[300px]">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input className="input w-full !pl-9" placeholder="Buscar por cliente ou número da OS" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
        </Filtro>
        <Filtro label="Tipologia"><MultiSelect rotuloVazio="Todas as tipologias" icon={<Tag />} largura={190} opcoes={TIPOLOGIAS_COM_FICHA.map((t) => ({ value: t, label: `${t} - ${TIPOLOGIAS[t]}` }))} valor={tipologias} onChange={setTipologias} /></Filtro>
        <Filtro label="Polo"><MultiSelect rotuloVazio="Todos os polos" icon={<MapPin />} largura={160} opcoes={Object.keys(POLOS).map((p) => ({ value: p, label: p }))} valor={polos} onChange={setPolos} /></Filtro>
        <Filtro label="Período"><FiltroPeriodo periodo={periodo} setPeriodo={setPeriodo} data={ref} setData={setRef} especifico={especifico} setEspecifico={setEspecifico} /></Filtro>
        <Filtro label="Situação">
          <select className="input w-[150px]" value={situacao} onChange={(e) => setSituacao(e.target.value as Situacao)}>
            <option value="todas">Todas</option>
            <option value="pendentes">Pendentes</option>
            <option value="fornecidas">Fornecidas</option>
          </select>
        </Filtro>
      </div>

      <section className="card overflow-hidden">
        <header className="px-4 py-2.5 border-b border-border flex flex-wrap items-center gap-3">
          <b className="text-[14px] tnum">{fornecidas} de {base.length} fichas fornecidas</b>
          <div className="flex-1 min-w-[160px] max-w-[320px] h-2 rounded-full bg-[var(--seg)] overflow-hidden">
            <div className="h-full bg-[var(--brand)] rounded-full" style={{ width: `${base.length ? (fornecidas / base.length) * 100 : 0}%` }} />
          </div>
        </header>
        {lista.length === 0 ? <Empty title="Nenhuma ficha com esses filtros" text="Troque o período, a tipologia ou a situação." /> : (
          <ul className="flex flex-col gap-1 p-2 max-h-[calc(100vh-250px)] overflow-y-auto">
            {lista.map((o) => (
              <li key={o.id} className={clsx('rounded-[10px] border px-3 py-1.5 flex flex-wrap items-center gap-x-4 gap-y-1', o.fichaFornecida ? 'border-[color-mix(in_oklab,var(--brand)_45%,var(--border))]' : 'border-border')}>
                <button
                  className={clsx('w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition', o.fichaFornecida ? 'bg-[var(--brand)] border-[var(--brand)] text-white' : 'border-[var(--fraco)] hover:border-[var(--brand)]')}
                  aria-label={o.fichaFornecida ? 'Marcar ficha como pendente' : 'Marcar ficha como fornecida'}
                  title={o.fichaFornecida ? 'Marcar ficha como pendente' : 'Marcar ficha como fornecida'}
                  onClick={() => marcarFicha(o.id, !o.fichaFornecida)}
                >{o.fichaFornecida && <Check size={14} strokeWidth={3} />}</button>
                <button className="tnum font-bold text-[13px] w-[56px] text-left hover:text-[var(--verde-valor)]" onClick={() => nav(`/os/${o.id}`)}>{codigoOS(o)}</button>
                <span className="flex-1 min-w-[180px] font-medium text-[13.5px] truncate">{o.proponente}</span>
                <TipologiaChip t={o.tipologia} />
                <span className="text-[12.5px] text-muted w-[92px]">{poloDe(o.endereco.cidade)}</span>
                <StatusChip status={o.status} className="!h-[22px]" />
                <span className={clsx('text-[12px] font-semibold w-[78px] text-right', o.fichaFornecida ? 'text-[var(--verde-valor)]' : 'text-muted')}>{o.fichaFornecida ? 'Fornecida' : 'Pendente'}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
