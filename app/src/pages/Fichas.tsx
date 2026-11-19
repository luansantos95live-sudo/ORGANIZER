import clsx from 'clsx'
import { startOfMonth } from 'date-fns'
import { Check, MapPin, Search, Tag } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar, Empty, FiltroPeriodo, Filtro, MultiSelect, PageHeader, StatusChip, TipologiaChip } from '../components/ui'
import { intervalo, noIntervalo, type Periodo } from '../lib/faturamento'
import { POLOS, TIPOLOGIAS, TIPOLOGIAS_COM_FICHA, codigoOS, poloDe } from '../lib/os'
import { filtrarEscopo, useStore } from '../store/useStore'
import type { OS, Responsavel, Tipologia } from '../types'

type Situacao = 'todas' | 'pendentes' | 'fornecidas'

/** Fichas de Pesquisa do sistema real: uma linha por O.S. de avaliação, marcando se a ficha de mercado já foi fornecida. */
export function Fichas() {
  const todas = useStore((s) => s.os)
  const escopo = useStore((s) => s.escopo)
  const marcarFicha = useStore((s) => s.marcarFicha)
  const config = useStore((s) => s.config)
  const nav = useNavigate()
  const [busca, setBusca] = useState('')
  const [tipologias, setTipologias] = useState<Tipologia[]>([])
  const [polos, setPolos] = useState<string[]>([])
  const [periodo, setPeriodo] = useState<Periodo>('mes') // controle mensal (12/11): abre no mês atual
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
  const naSituacao = (o: OS) => (situacao === 'todas' ? true : situacao === 'fornecidas' ? !!o.fichaFornecida : !o.fichaFornecida)
  // Um bloco por técnico (12/11): as minhas primeiro e, embaixo, as de cada RT; técnico sem O.S. não aparece.
  const grupos = (Object.keys(config.responsaveis) as Responsavel[])
    .sort((a, b) => (a === 'luan' ? -1 : b === 'luan' ? 1 : 0))
    .map((resp) => { const b = base.filter((o) => o.responsavel === resp); return { resp, base: b, lista: b.filter(naSituacao) } })
    .filter((g) => g.base.length > 0)

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

      {grupos.length === 0 ? (
        <section className="card"><Empty title="Nenhuma ficha com esses filtros" text="Troque o período, a tipologia ou a situação." /></section>
      ) : (
        <div className="flex flex-col gap-3">
          {grupos.map((g) => (
            <BlocoFichas key={g.resp} resp={g.resp} titulo={g.resp === 'luan' ? 'Minhas O.S.' : `O.S. do RT ${config.responsaveis[g.resp].curto}`} base={g.base} lista={g.lista}
              abrir={(id) => nav(`/os/${id}`)} marcar={marcarFicha} />
          ))}
        </div>
      )}
    </>
  )
}

/** Colunas fixas: marcar · OS · cliente · tipologia · polo · etapa · ficha (tudo alinhado de uma linha para a outra). */
const COLUNAS = 'grid grid-cols-[24px_64px_minmax(0,1fr)_64px_120px_140px_84px] items-center gap-x-4'

function BlocoFichas({ resp, titulo, base, lista, abrir, marcar }: {
  resp: Responsavel; titulo: string; base: OS[]; lista: OS[]; abrir: (id: string) => void; marcar: (id: string, v: boolean) => void
}) {
  const fornecidas = base.filter((o) => o.fichaFornecida).length
  const pct = base.length ? (fornecidas / base.length) * 100 : 0
  return (
    <section className="card overflow-hidden">
      <header className="px-4 py-2.5 border-b border-border flex flex-wrap items-center gap-3">
        <Avatar resp={resp} size={24} />
        <b className="text-[14px]">{titulo}</b>
        <span className="text-[12.5px] text-muted tnum">{fornecidas} de {base.length} fichas fornecidas</span>
        <div className="flex-1 min-w-[120px] max-w-[320px] h-2 rounded-full bg-[var(--seg)] overflow-hidden ml-auto">
          <div className="h-full bg-[var(--brand)] rounded-full" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[12px] font-semibold tnum text-[var(--verde-valor)] w-[38px] text-right">{Math.round(pct)}%</span>
      </header>
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <div className={clsx(COLUNAS, 'px-5 pt-2 pb-1 text-[10.5px] font-semibold uppercase tracking-wide text-muted')}>
            <span /><span>OS</span><span>Cliente</span><span>Tipologia</span><span>Polo</span><span>Etapa</span><span className="text-right">Ficha</span>
          </div>
          {lista.length === 0 ? <p className="px-5 py-4 text-[13px] text-muted">Nenhuma ficha nessa situação.</p> : (
            <ul className="flex flex-col gap-1 px-2 pb-2">
              {lista.map((o) => (
                <li key={o.id} className={clsx(COLUNAS, 'linha-os rounded-[10px] border px-3 py-1.5', o.fichaFornecida ? 'border-[color-mix(in_oklab,var(--brand)_45%,var(--border))]' : 'border-border')}>
                  <button
                    className={clsx('w-6 h-6 rounded-md border-2 flex items-center justify-center transition', o.fichaFornecida ? 'bg-[var(--brand)] border-[var(--brand)] text-white' : 'border-[var(--fraco)] hover:border-[var(--brand)]')}
                    aria-label={o.fichaFornecida ? 'Marcar ficha como pendente' : 'Marcar ficha como fornecida'}
                    title={o.fichaFornecida ? 'Marcar ficha como pendente' : 'Marcar ficha como fornecida'}
                    onClick={() => marcar(o.id, !o.fichaFornecida)}
                  >{o.fichaFornecida && <Check size={14} strokeWidth={3} />}</button>
                  <button className="tnum font-bold text-[13px] text-left hover:text-[var(--verde-valor)]" onClick={() => abrir(o.id)}>{codigoOS(o)}</button>
                  <button className="font-medium text-[13.5px] truncate text-left hover:text-[var(--verde-valor)]" title={o.proponente} onClick={() => abrir(o.id)}>{o.proponente}</button>
                  <span><TipologiaChip t={o.tipologia} /></span>
                  <span className="text-[12.5px] text-muted truncate">{poloDe(o.endereco.cidade)}</span>
                  <span><StatusChip status={o.status} className="!h-[22px]" /></span>
                  <span className={clsx('text-[12px] font-semibold text-right', o.fichaFornecida ? 'text-[var(--verde-valor)]' : 'text-muted')}>{o.fichaFornecida ? 'Fornecida' : 'Pendente'}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
