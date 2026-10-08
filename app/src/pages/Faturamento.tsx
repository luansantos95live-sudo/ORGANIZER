import clsx from 'clsx'
import { addMonths, format, startOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ChartColumn, ChartPie, ChevronDown, ChevronLeft, ChevronRight, CircleArrowDown, CircleCheck, Clock, Columns3, Download,
  ExternalLink, FileText, Info, Layers, Percent, Search, TrendingUp, Trophy, Users, Wallet, Zap, MapPin,
} from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Avatar, Card, Empty, PageHeader } from '../components/ui'
import {
  POLOS, TIPOLOGIAS, brlCompacto, projecaoPorRitmo, repasseDaOS, repasseDe, type BaseRepasse, dataReferencia, entraNoFaturamento, estaFinalizada, intervalo, moverPeriodo, noIntervalo, pct, poloDe,
  resumir, rotuloPeriodo, situacaoDe, ticksBonitos, valorTotal, type Periodo, type Resumo, type Situacao,
} from '../lib/faturamento'
import { copiar } from '../lib/clipboard'
import { brl, cap, dataCurta as dataCurtaPrazo, dataMedia, enderecoLinha, refCurta } from '../lib/os'
import { useStore } from '../store/useStore'
import type { Escopo, OS, Tipologia } from '../types'

// ---------------------------------------------------------------- tipos de apresentação
type SegKind = 'me' | 'rt'
interface Seg { key: string; label: string; valor: number; kind: SegKind; pend?: boolean }
interface Barra { titulo: string; nota?: string; segs: Seg[] }
interface KpiDef { tone: string; icon: ReactNode; label: string; valor: string; sub: ReactNode; info: string }
interface Indicador { icon: ReactNode; tone: string; label: string; sub: string; valor: string }
interface TrioItem { tipo: 'anel'; titulo: string; valor: number; texto: string; kind: SegKind }
type Trio = TrioItem | { tipo: 'card'; tone: string; icon: ReactNode; titulo: string; valor: string; texto: string }

const SITUACAO_META: Record<Situacao, { label: string; cls: string }> = {
  finalizada: { label: 'Finalizada', cls: 'status-finalizada' },
  a_faturar: { label: 'A faturar', cls: 'status-emitida' },
  vencida: { label: 'Vencida', cls: 'farol-urgent' },
}

type ColOpc = 'tipologia' | 'responsavel' | 'conclusao' | 'deslocamento' | 'polo'
const COL_LABEL: Record<ColOpc, string> = { tipologia: 'Tipologia', responsavel: 'Responsável', conclusao: 'Conclusão', deslocamento: 'Deslocamento', polo: 'Polo' }

// ---------------------------------------------------------------- página
export function Faturamento() {
  const todas = useStore((s) => s.os)
  const escopo = useStore((s) => s.escopo)
  const setEscopo = useStore((s) => s.setEscopo)
  const config = useStore((s) => s.config)
  const rep = config.repasseRT
  const repTxt = `${Math.round(rep * 100)}%`
  const nomeRT = config.responsaveis.rt.curto

  const [busca, setBusca] = useState('')
  const [tipologia, setTipologia] = useState<Tipologia | ''>('')
  const [polo, setPolo] = useState('')
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [ref, setRef] = useState(() => startOfMonth(new Date()))
  const [situacao, setSituacao] = useState<Situacao | ''>('')

  const { ini, fim } = intervalo(periodo, ref)

  const baseOS = useMemo(() => {
    const t = busca.trim().toLowerCase()
    return todas
      .filter(entraNoFaturamento)
      .filter((o) => !tipologia || o.tipologia === tipologia)
      .filter((o) => !polo || poloDe(o.endereco.cidade) === polo)
      .filter((o) => !t || [o.referencia, refCurta(o.referencia), o.proponente, o.endereco.bairro, o.endereco.cidade].join(' ').toLowerCase().includes(t))
  }, [todas, busca, tipologia, polo])

  const doPeriodo = useMemo(() => baseOS.filter((o) => noIntervalo(o, ini, fim)), [baseOS, ini, fim])
  const meus = doPeriodo.filter((o) => o.responsavel === 'luan')
  const doRT = doPeriodo.filter((o) => o.responsavel === 'rt')
  const rMe = resumir(meus)
  const rRt = resumir(doRT)
  const rAll = resumir(doPeriodo)

  const base = config.repasseBase
  const visao = montarVisao(escopo, rMe, rRt, rAll, rep, repTxt, nomeRT, base)

  const linhas = escopo === 'luan' ? doPeriodo : escopo === 'rt' ? doRT : doPeriodo
  const linhasFiltradas = situacao ? linhas.filter((o) => situacaoDe(o) === situacao) : linhas

  const subtitulo =
    escopo === 'luan' ? `Seu faturamento e sua participação de ${repTxt} no RT de ${nomeRT}.`
      : escopo === 'rt' ? `Desempenho das O.S. de ${nomeRT} e o repasse de ${repTxt} que volta para você.`
        : 'Visão geral do faturamento das duas carteiras.'

  return (
    <>
      <PageHeader title="Faturamento" subtitle={subtitulo} />

      {/* filtros */}
      <div className="card px-3 py-3 mb-4 flex flex-wrap items-end gap-2.5">
        <Filtro label="Buscar">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <input id="fat-busca" className="input input-sm pl-8 w-[190px]" placeholder="O.S., cliente, bairro…" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
        </Filtro>
        <Filtro label="Tipologia">
          <select id="fat-tipologia" className="input input-sm w-[150px]" value={tipologia} onChange={(e) => setTipologia(e.target.value as Tipologia | '')}>
            <option value="">Todas</option>
            {(Object.keys(TIPOLOGIAS) as Tipologia[]).map((t) => <option key={t} value={t}>{t} · {TIPOLOGIAS[t]}</option>)}
          </select>
        </Filtro>
        <Filtro label="Polo">
          <select id="fat-polo" className="input input-sm w-[120px]" value={polo} onChange={(e) => setPolo(e.target.value)}>
            <option value="">Todos</option>
            {Object.keys(POLOS).map((p) => <option key={p}>{p}</option>)}
          </select>
        </Filtro>
        <Filtro label="Período">
          <div className="flex items-center gap-1">
            <select id="fat-periodo" className="input input-sm w-[96px]" value={periodo} onChange={(e) => setPeriodo(e.target.value as Periodo)}>
              <option value="mes">Mês</option>
              <option value="trimestre">Trimestre</option>
              <option value="ano">Ano</option>
            </select>
            <button className="btn btn-secondary btn-icon !h-[30px] !w-[30px]" aria-label="Período anterior" onClick={() => setRef(moverPeriodo(periodo, ref, -1))}><ChevronLeft size={15} /></button>
            <span className="input input-sm inline-flex items-center justify-center min-w-[150px] whitespace-nowrap font-medium">{cap(rotuloPeriodo(periodo, ref))}</span>
            <button className="btn btn-secondary btn-icon !h-[30px] !w-[30px]" aria-label="Próximo período" onClick={() => setRef(moverPeriodo(periodo, ref, 1))}><ChevronRight size={15} /></button>
          </div>
        </Filtro>
        <Filtro label="Carteira">
          <div className="seg">
            {([['luan', 'Só minhas'], ['rt', 'Equipe'], ['todas', 'Geral']] as [Escopo, string][]).map(([v, l]) => (
              <button key={v} aria-pressed={escopo === v} onClick={() => setEscopo(v)} className="!h-[24px]">{l}</button>
            ))}
          </div>
        </Filtro>
      </div>

      <Insight escopo={escopo} rMe={rMe} rRt={rRt} rAll={rAll} rep={rep} nomeRT={nomeRT} base={base} />

      {escopo === 'luan' && periodo === 'mes' && <MetaCard meta={config.metaMensal} consolidado={rMe.finalizado + repasseDe(rRt, rep, base).finalizado} potencial={rMe.previsto + repasseDe(rRt, rep, base).previsto} refMes={ref} />}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 mb-4">
        {visao.kpis.map((k) => <KpiCard key={k.label} {...k} />)}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.55fr_1fr] gap-4 mb-4 items-start">
        <Card
          title={<span className="flex items-center gap-2"><ChartColumn size={16} className="text-brand" />{visao.tituloComposicao}</span>}
          actions={<Legenda escopo={escopo} nomeRT={nomeRT} repTxt={repTxt} />}
        >
          <div className="flex flex-col gap-5 pt-1">
            {visao.barras.map((b) => <BarraEmpilhada key={b.titulo} barra={b} />)}
          </div>
          <div className="grid sm:grid-cols-3 gap-3 mt-5">
            {visao.trio.map((t) => <TrioCard key={t.titulo} item={t} />)}
          </div>
        </Card>

        <Card title={<span className="flex items-center gap-2"><ChartPie size={16} className="text-brand" />{visao.tituloIndicadores}</span>} pad={false}>
          <ul className="divide-y divide-border">
            {visao.indicadores.map((i) => (
              <li key={i.label} className="flex items-center gap-3 px-4 py-2.5">
                <span className={clsx('kpi-icon !w-8 !h-8 !rounded-lg', i.tone)}>{i.icon}</span>
                <span className="flex-1 min-w-0">
                  <span className="block font-medium leading-tight">{i.label}</span>
                  <span className="block text-[12px] text-muted leading-tight">{i.sub}</span>
                </span>
                <span className="tnum font-semibold text-[15px] whitespace-nowrap">{i.valor}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Historico base={baseOS} baseRepasse={base} escopo={escopo} rep={rep} refMes={periodo === 'mes' ? ref : startOfMonth(fim)} nomeRT={nomeRT} repTxt={repTxt} />

      <Tabela linhas={linhasFiltradas} escopo={escopo} rep={rep} repTxt={repTxt} periodoLabel={rotuloPeriodo(periodo, ref)} situacao={situacao} onSituacao={setSituacao} base={base} />
    </>
  )
}

// ---------------------------------------------------------------- regras por visão
function montarVisao(escopo: Escopo, rMe: Resumo, rRt: Resumo, rAll: Resumo, rep: number, repTxt: string, nomeRT: string, base: BaseRepasse) {
  const rr = repasseDe(rRt, rep, base)
  if (escopo === 'luan') {
    const partFinal = rr.finalizado
    const partPrev = rr.previsto
    const consolidado = rMe.finalizado + partFinal
    const potencial = rMe.previsto + partPrev
    const aFaturar = potencial - consolidado
    const kpis: KpiDef[] = [
      { tone: 'kpi-sky', icon: <ChartColumn size={19} />, label: 'Meu previsto', valor: brl(rMe.previsto), sub: `${rMe.qtd} O.S. + deslocamentos`, info: 'Soma de serviço + deslocamento das suas O.S. aceitas no período (finalizadas e a faturar).' },
      { tone: 'kpi-sage', icon: <CircleCheck size={19} />, label: 'Meu finalizado', valor: brl(rMe.finalizado), sub: `${pct(rMe.conversao)} do previsto`, info: 'Suas O.S. com laudo aceito no período.' },
      { tone: 'kpi-lav', icon: <Users size={19} />, label: `Participação no RT (${repTxt})`, valor: brl(partFinal), sub: <>prevista <b className="tnum">{brl(partPrev)}</b></>, info: `${repTxt} do que ${nomeRT} finalizou no período. O valor previsto considera todas as O.S. dele no período.` },
      { tone: 'kpi-mint', icon: <Layers size={19} />, label: 'Total consolidado', valor: brl(consolidado), sub: `meu finalizado + ${repTxt} do RT`, info: 'O que já entrou de fato: seu finalizado somado à sua parte do finalizado do RT.' },
      { tone: 'kpi-peach', icon: <Zap size={19} />, label: 'Potencial a faturar', valor: brl(aFaturar), sub: 'previsto consolidado − já faturado', info: 'Quanto ainda pode entrar no período se todas as O.S. em aberto forem finalizadas.' },
    ]
    const barras: Barra[] = [{
      titulo: 'Potencial do período', nota: brl(potencial),
      segs: [
        { key: 'mf', label: 'Meu finalizado', valor: rMe.finalizado, kind: 'me' },
        { key: 'rf', label: `${repTxt} do RT finalizado`, valor: partFinal, kind: 'rt' },
        { key: 'mp', label: 'Meu a faturar', valor: rMe.aFaturar, kind: 'me', pend: true },
        { key: 'rp', label: `${repTxt} do RT a faturar`, valor: rr.aFaturar, kind: 'rt', pend: true },
      ],
    }]
    const trio: Trio[] = [
      { tipo: 'anel', titulo: 'Conversão do potencial', valor: potencial ? consolidado / potencial : 0, texto: `${brl(consolidado)} de ${brl(potencial)} já faturados.`, kind: 'me' },
      { tipo: 'card', tone: 'kpi-lav', icon: <Percent size={18} />, titulo: 'Peso do RT no meu total', valor: pct(consolidado ? partFinal / consolidado : 0), texto: `do consolidado vem do repasse de ${nomeRT}.` },
      { tipo: 'card', tone: 'kpi-peach', icon: <Wallet size={18} />, titulo: 'Saldo a faturar', valor: brl(aFaturar), texto: `${pct(potencial ? aFaturar / potencial : 0)} do potencial ainda em aberto.` },
    ]
    const indicadores: Indicador[] = [
      { tone: 'kpi-sage', icon: <CircleCheck size={16} />, label: 'Minhas O.S. finalizadas', sub: 'laudo aceito no período', valor: String(rMe.qtdFinalizadas) },
      { tone: 'kpi-sky', icon: <Clock size={16} />, label: 'Minhas O.S. a faturar', sub: rMe.qtdVencidas ? `${rMe.qtdVencidas} com prazo vencido` : 'nenhuma vencida', valor: String(rMe.qtdAFaturar) },
      { tone: 'kpi-stone', icon: <ChartColumn size={16} />, label: 'Ticket médio das minhas O.S.', sub: 'previsto ÷ quantidade', valor: brl(rMe.ticketMedio) },
      { tone: 'kpi-lav', icon: <Users size={16} />, label: `O.S. de ${nomeRT} no período`, sub: `${rRt.qtdFinalizadas} finalizadas · ${rRt.qtdAFaturar} a faturar`, valor: String(rRt.qtd) },
      { tone: 'kpi-mint', icon: <TrendingUp size={16} />, label: 'Projeção de fechamento', sub: 'consolidado previsto sem as O.S. vencidas', valor: brl(rMe.projecao + rr.projecao) },
      { tone: 'kpi-sage', icon: <Trophy size={16} />, label: 'Minha maior O.S.', sub: rMe.maior ? `#${refCurta(rMe.maior.referencia)} · ${rMe.maior.proponente}` : '—', valor: rMe.maior ? brl(valorTotal(rMe.maior)) : '—' },
    ]
    return { kpis, barras, trio, indicadores, tituloComposicao: 'Composição do meu faturamento', tituloIndicadores: 'Resumo estratégico' }
  }

  if (escopo === 'rt') {
    const repPrev = rr.previsto
    const repFinal = rr.finalizado
    const kpis: KpiDef[] = [
      { tone: 'kpi-sky', icon: <ChartColumn size={19} />, label: 'RT previsto', valor: brl(rRt.previsto), sub: `${rRt.qtd} O.S. de ${nomeRT} no período`, info: `Serviço + deslocamento de todas as O.S. aceitas de ${nomeRT} no período.` },
      { tone: 'kpi-sage', icon: <CircleCheck size={19} />, label: 'RT finalizado', valor: brl(rRt.finalizado), sub: `${pct(rRt.conversao)} do previsto`, info: 'O.S. do RT com laudo aceito no período.' },
      { tone: 'kpi-lav', icon: <Users size={19} />, label: `Repasse previsto (${repTxt})`, valor: brl(repPrev), sub: 'sua parte sobre o previsto', info: `${repTxt} do previsto do RT.` },
      { tone: 'kpi-mint', icon: <Layers size={19} />, label: `Repasse finalizado (${repTxt})`, valor: brl(repFinal), sub: 'sua parte já garantida', info: `${repTxt} do finalizado do RT.` },
      { tone: 'kpi-peach', icon: <Zap size={19} />, label: 'Saldo do RT a faturar', valor: brl(rRt.aFaturar), sub: `${rRt.qtdAFaturar} O.S. em aberto`, info: 'Diferença entre previsto e finalizado do RT.' },
    ]
    const barras: Barra[] = [
      { titulo: 'RT previsto', nota: brl(rRt.previsto), segs: [
        { key: 'rf', label: 'RT finalizado', valor: rRt.finalizado, kind: 'rt' },
        { key: 'rp', label: 'RT a faturar', valor: rRt.aFaturar, kind: 'rt', pend: true },
      ] },
      { titulo: `Seu repasse (${repTxt})`, nota: brl(repPrev), segs: [
        { key: 'pf', label: 'Repasse finalizado', valor: repFinal, kind: 'me' },
        { key: 'pp', label: 'Repasse potencial restante', valor: repPrev - repFinal, kind: 'me', pend: true },
      ] },
    ]
    const trio: Trio[] = [
      { tipo: 'anel', titulo: 'Conversão do RT', valor: rRt.conversao, texto: `do previsto de ${nomeRT} já foi finalizado.`, kind: 'rt' },
      { tipo: 'card', tone: 'kpi-sky', icon: <Trophy size={18} />, titulo: 'Maior O.S. da equipe', valor: rRt.maior ? brl(valorTotal(rRt.maior)) : '—', texto: rRt.maior ? `#${refCurta(rRt.maior.referencia)} · ${rRt.maior.proponente}` : 'sem O.S. no período' },
      { tipo: 'card', tone: 'kpi-stone', icon: <ChartColumn size={18} />, titulo: 'Média por O.S.', valor: brl(rRt.ticketMedio), texto: 'valor médio das O.S. do RT.' },
    ]
    const indicadores: Indicador[] = [
      { tone: 'kpi-sky', icon: <FileText size={16} />, label: 'O.S. da equipe', sub: 'aceitas no período', valor: String(rRt.qtd) },
      { tone: 'kpi-sage', icon: <CircleCheck size={16} />, label: 'O.S. finalizadas', sub: 'laudo aceito', valor: String(rRt.qtdFinalizadas) },
      { tone: 'kpi-peach', icon: <Clock size={16} />, label: 'O.S. a faturar', sub: rRt.qtdVencidas ? `${rRt.qtdVencidas} com prazo vencido` : 'nenhuma vencida', valor: String(rRt.qtdAFaturar) },
      { tone: 'kpi-mint', icon: <Layers size={16} />, label: `Repasse finalizado (${repTxt})`, sub: 'sua parte já garantida', valor: brl(repFinal) },
      { tone: 'kpi-lav', icon: <Users size={16} />, label: `Repasse previsto (${repTxt})`, sub: 'sua parte sobre o previsto', valor: brl(repPrev) },
      { tone: 'kpi-mint', icon: <TrendingUp size={16} />, label: 'Projeção do repasse', sub: 'sem as O.S. vencidas', valor: brl(rr.projecao) },
    ]
    return { kpis, barras, trio, indicadores, tituloComposicao: 'Desempenho financeiro da equipe', tituloIndicadores: 'Indicadores da equipe' }
  }

  // visão geral
  const kpis: KpiDef[] = [
    { tone: 'kpi-sky', icon: <ChartColumn size={19} />, label: 'Previsto total', valor: brl(rAll.previsto), sub: `${rAll.qtd} O.S. + deslocamentos`, info: 'Serviço + deslocamento de todas as O.S. aceitas no período, das duas carteiras.' },
    { tone: 'kpi-sage', icon: <CircleCheck size={19} />, label: 'Finalizado', valor: brl(rAll.finalizado), sub: `${pct(rAll.conversao)} do previsto`, info: 'O.S. com laudo aceito no período.' },
    { tone: 'kpi-lav', icon: <MapPin size={19} />, label: 'Deslocamento total', valor: brl(rAll.deslocamento), sub: `${pct(rAll.previsto ? rAll.deslocamento / rAll.previsto : 0)} do previsto`, info: 'Soma dos valores de deslocamento das O.S. do período.' },
    { tone: 'kpi-peach', icon: <FileText size={19} />, label: 'A faturar', valor: brl(rAll.aFaturar), sub: `${rAll.qtdAFaturar} O.S. em aberto`, info: 'Previsto menos finalizado.' },
    { tone: 'kpi-stone', icon: <ChartColumn size={19} />, label: 'Ticket médio', valor: brl(rAll.ticketMedio), sub: 'média por O.S.', info: 'Previsto total dividido pela quantidade de O.S.' },
  ]
  const barras: Barra[] = [{
    titulo: 'Previsto total', nota: brl(rAll.previsto), segs: [
      { key: 'mf', label: 'Finalizado · você', valor: rMe.finalizado, kind: 'me' },
      { key: 'rf', label: `Finalizado · ${nomeRT}`, valor: rRt.finalizado, kind: 'rt' },
      { key: 'mp', label: 'A faturar · você', valor: rMe.aFaturar, kind: 'me', pend: true },
      { key: 'rp', label: `A faturar · ${nomeRT}`, valor: rRt.aFaturar, kind: 'rt', pend: true },
    ],
  }]
  const trio: Trio[] = [
    { tipo: 'anel', titulo: 'Taxa de conversão', valor: rAll.conversao, texto: `${rAll.qtdFinalizadas} de ${rAll.qtd} O.S. finalizadas.`, kind: 'me' },
    { tipo: 'card', tone: 'kpi-lav', icon: <MapPin size={18} />, titulo: 'Peso do deslocamento', valor: pct(rAll.previsto ? rAll.deslocamento / rAll.previsto : 0), texto: `${brl(rAll.deslocamento)} em deslocamentos.` },
    { tipo: 'card', tone: 'kpi-mint', icon: <TrendingUp size={18} />, titulo: 'Projeção de fechamento', valor: brl(rAll.projecao), texto: rAll.vencido ? `${brl(rAll.vencido)} vencido fica fora.` : 'nenhuma O.S. vencida no período.' },
  ]
  const indicadores: Indicador[] = [
    { tone: 'kpi-sky', icon: <FileText size={16} />, label: 'O.S. do período', sub: `${rMe.qtd} suas · ${rRt.qtd} de ${nomeRT}`, valor: String(rAll.qtd) },
    { tone: 'kpi-sage', icon: <CircleCheck size={16} />, label: 'O.S. finalizadas', sub: 'laudo aceito no período', valor: String(rAll.qtdFinalizadas) },
    { tone: 'kpi-peach', icon: <Clock size={16} />, label: 'O.S. pendentes', sub: rAll.qtdVencidas ? `${rAll.qtdVencidas} com prazo vencido` : 'nenhuma vencida', valor: String(rAll.qtdAFaturar) },
    { tone: 'kpi-sage', icon: <Trophy size={16} />, label: 'Maior O.S.', sub: rAll.maior ? `#${refCurta(rAll.maior.referencia)} · ${rAll.maior.proponente}` : '—', valor: rAll.maior ? brl(valorTotal(rAll.maior)) : '—' },
    { tone: 'kpi-stone', icon: <CircleArrowDown size={16} />, label: 'Menor O.S.', sub: rAll.menor ? `#${refCurta(rAll.menor.referencia)} · ${rAll.menor.proponente}` : '—', valor: rAll.menor ? brl(valorTotal(rAll.menor)) : '—' },
    { tone: 'kpi-mint', icon: <TrendingUp size={16} />, label: 'Projeção de fechamento', sub: 'previsto sem as O.S. vencidas', valor: brl(rAll.projecao) },
  ]
  return { kpis, barras, trio, indicadores, tituloComposicao: 'Panorama do faturamento', tituloIndicadores: 'Indicadores do período' }
}

// ---------------------------------------------------------------- frase-resumo
function Insight({ escopo, rMe, rRt, rAll, rep, nomeRT, base }: { escopo: Escopo; rMe: Resumo; rRt: Resumo; rAll: Resumo; rep: number; nomeRT: string; base: BaseRepasse }) {
  const rr = repasseDe(rRt, rep, base)
  let texto: ReactNode
  if (escopo === 'luan') {
    const cons = rMe.finalizado + rr.finalizado
    const pot = rMe.previsto + rr.previsto
    texto = <>Você já consolidou <b>{brl(cons)}</b> de <b>{brl(pot)}</b> possíveis ({pct(pot ? cons / pot : 0, 0)}). Faltam <b>{rMe.qtdAFaturar}</b> O.S. suas e <b>{rRt.qtdAFaturar}</b> de {nomeRT} para fechar o período{rMe.qtdVencidas + rRt.qtdVencidas ? <>, sendo <b className="text-[var(--f-urgent-fg)]">{rMe.qtdVencidas + rRt.qtdVencidas} {rMe.qtdVencidas + rRt.qtdVencidas === 1 ? 'já vencida' : 'já vencidas'}</b></> : null}.</>
  } else if (escopo === 'rt') {
    texto = <>{nomeRT} finalizou <b>{pct(rRt.conversao, 0)}</b> do previsto. Seu repasse garantido é <b>{brl(rr.finalizado)}</b> e ainda podem entrar <b>{brl(rr.aFaturar)}</b>.</>
  } else {
    texto = <>As duas carteiras somam <b>{brl(rAll.previsto)}</b> no período, com <b>{pct(rAll.conversao, 0)}</b> já finalizado. Você responde por <b>{pct(rAll.previsto ? rMe.previsto / rAll.previsto : 0, 0)}</b> do previsto.</>
  }
  return (
    <div className="card px-4 py-3 mb-4 flex items-start gap-3 text-[13.5px]" style={{ background: 'var(--brand-soft)', borderColor: 'transparent' }}>
      <TrendingUp size={17} className="text-brand-strong mt-0.5 shrink-0" />
      <p className="leading-relaxed">{texto}</p>
    </div>
  )
}

// ---------------------------------------------------------------- peças
function Filtro({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</span>
      {children}
    </div>
  )
}

function KpiCard({ tone, icon, label, valor, sub, info }: KpiDef) {
  return (
    <div className={clsx('rounded-[12px] px-4 py-3.5 flex gap-3 items-start relative', tone)}>
      <span className="kpi-icon">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[12px] font-semibold leading-tight pr-4">{label}</div>
        <div className="text-[20px] font-bold tnum leading-tight mt-1 text-text">{valor}</div>
        <div className="text-[11.5px] opacity-85 leading-snug mt-0.5">{sub}</div>
      </div>
      <span className="absolute right-2.5 top-2.5 opacity-60 cursor-help" title={info}><Info size={13} /></span>
    </div>
  )
}

function Legenda({ escopo, nomeRT, repTxt }: { escopo: Escopo; nomeRT: string; repTxt: string }) {
  return (
    <div className="hidden sm:flex items-center gap-3 text-[11.5px] text-muted">
      {escopo !== 'rt' && <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-[3px] seg-me" />Você</span>}
      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-[3px] seg-rt" />{escopo === 'luan' ? `RT (${repTxt})` : nomeRT}</span>
      {escopo === 'rt' && <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-[3px] seg-me" />Seu repasse</span>}
      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-[3px] seg-me pend" />a faturar</span>
    </div>
  )
}

function BarraEmpilhada({ barra }: { barra: Barra }) {
  const total = barra.segs.reduce((s, x) => s + Math.max(0, x.valor), 0)
  const visiveis = barra.segs.filter((s) => s.valor > 0.005)
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="font-medium text-[13px]">{barra.titulo}</span>
        {barra.nota && <span className="text-[12px] text-muted tnum">{barra.nota}</span>}
      </div>
      <div className="h-4 rounded-[5px] track flex gap-[2px] overflow-hidden" role="img" aria-label={barra.segs.map((s) => `${s.label} ${brl(s.valor)}`).join(', ')}>
        {total > 0 && visiveis.map((s, i) => (
          <div
            key={s.key}
            title={`${s.label}: ${brl(s.valor)} (${pct(s.valor / total)})`}
            className={clsx(s.kind === 'me' ? 'seg-me' : 'seg-rt', s.pend && 'pend', i === 0 && 'rounded-l-[5px]', i === visiveis.length - 1 && 'rounded-r-[5px]')}
            style={{ width: `${(s.valor / total) * 100}%`, minWidth: 3 }}
          />
        ))}
      </div>
      <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 mt-2.5">
        {barra.segs.map((s) => (
          <li key={s.key} className="flex items-center gap-2 text-[12.5px]">
            <span className={clsx('w-2.5 h-2.5 rounded-[3px] shrink-0', s.kind === 'me' ? 'seg-me' : 'seg-rt', s.pend && 'pend')} />
            <span className="text-muted flex-1 truncate">{s.label}</span>
            <span className="tnum font-semibold">{brl(s.valor)}</span>
            <span className="tnum text-muted w-12 text-right">{total ? pct(s.valor / total, 0) : '—'}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function TrioCard({ item }: { item: Trio }) {
  if (item.tipo === 'anel') {
    const r = 26, c = 2 * Math.PI * r
    const v = Math.max(0, Math.min(1, item.valor))
    return (
      <div className="rounded-[12px] border border-border px-3.5 py-3 flex items-center gap-3">
        <svg width="64" height="64" viewBox="0 0 64 64" className="shrink-0" role="img" aria-label={`${item.titulo}: ${pct(v)}`}>
          <circle cx="32" cy="32" r={r} fill="none" stroke="var(--viz-track)" strokeWidth="7" />
          <circle cx="32" cy="32" r={r} fill="none" stroke={item.kind === 'me' ? 'var(--viz-me)' : 'var(--viz-rt)'} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${c * v} ${c}`} transform="rotate(-90 32 32)" />
          <text x="32" y="36" textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--text)" className="tnum">{pct(v, 0)}</text>
        </svg>
        <div className="min-w-0">
          <div className="font-semibold text-[13px] leading-tight">{item.titulo}</div>
          <div className="text-[12px] text-muted leading-snug mt-0.5">{item.texto}</div>
        </div>
      </div>
    )
  }
  return (
    <div className={clsx('rounded-[12px] px-3.5 py-3 flex items-start gap-3', item.tone)}>
      <span className="kpi-icon !w-9 !h-9">{item.icon}</span>
      <div className="min-w-0">
        <div className="font-semibold text-[12.5px] leading-tight">{item.titulo}</div>
        <div className="text-[18px] font-bold tnum leading-tight mt-0.5 text-text">{item.valor}</div>
        <div className="text-[11.5px] opacity-85 leading-snug">{item.texto}</div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- histórico 6 meses
function Historico({ base, baseRepasse, escopo, rep, refMes, nomeRT, repTxt }: { base: OS[]; baseRepasse: BaseRepasse; escopo: Escopo; rep: number; refMes: Date; nomeRT: string; repTxt: string }) {
  const [hover, setHover] = useState<number | null>(null)
  const meses = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const m = addMonths(startOfMonth(refMes), i - 5)
      const { ini, fim } = intervalo('mes', m)
      const doMes = base.filter((o) => noIntervalo(o, ini, fim))
      const me = resumir(doMes.filter((o) => o.responsavel === 'luan'))
      const rt = resumir(doMes.filter((o) => o.responsavel === 'rt'))
      const rtParte = escopo === 'luan' ? repasseDe(rt, rep, baseRepasse) : null
      const rtFin = rtParte ? rtParte.finalizado : rt.finalizado
      const rtAFat = rtParte ? rtParte.aFaturar : rt.aFaturar
      const segs: Seg[] =
        escopo === 'rt'
          ? [
            { key: 'rf', label: `${nomeRT} finalizado`, valor: rt.finalizado, kind: 'rt' },
            { key: 'rp', label: `${nomeRT} a faturar`, valor: rt.aFaturar, kind: 'rt', pend: true },
          ]
          : [
            { key: 'mf', label: 'Você · finalizado', valor: me.finalizado, kind: 'me' },
            { key: 'rf', label: escopo === 'luan' ? `RT ${repTxt} · finalizado` : `${nomeRT} · finalizado`, valor: rtFin, kind: 'rt' },
            { key: 'mp', label: 'Você · a faturar', valor: me.aFaturar, kind: 'me', pend: true },
            { key: 'rp', label: escopo === 'luan' ? `RT ${repTxt} · a faturar` : `${nomeRT} · a faturar`, valor: rtAFat, kind: 'rt', pend: true },
          ]
      return { mes: m, segs, total: segs.reduce((s, x) => s + x.valor, 0), finalizado: segs.filter((s) => !s.pend).reduce((s, x) => s + x.valor, 0) }
    })
  }, [base, baseRepasse, escopo, rep, refMes, nomeRT, repTxt])

  const { topo, ticks } = ticksBonitos(Math.max(...meses.map((m) => m.total)))
  const H = 170
  const media = meses.slice(0, 5).reduce((s, m) => s + m.finalizado, 0) / 5

  return (
    <Card
      className="mb-4"
      title={<span className="flex items-center gap-2"><TrendingUp size={16} className="text-brand" />Últimos 6 meses</span>}
      actions={<span className="text-[12px] text-muted">média finalizada nos 5 meses anteriores <b className="tnum text-text">{brl(media)}</b> · este mês <b className="tnum text-text">{brl(meses[5].finalizado)}</b> finalizados de <b className="tnum text-text">{brl(meses[5].total)}</b></span>}
    >
      <div className="overflow-x-auto">
        <div className="relative min-w-[520px] pl-14 pr-2" style={{ height: H + 52 }} onMouseLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <div key={t} className="absolute left-0 right-2 flex items-center" style={{ bottom: 26 + (t / topo) * H }}>
              <span className="w-12 text-right pr-2 text-[11px] text-muted tnum -translate-y-0">{brlCompacto(t).replace('R$ ', '')}</span>
              <span className={clsx('flex-1 h-px', t === 0 ? 'bg-[var(--muted)] opacity-40' : 'bg-border')} />
            </div>
          ))}
          <div className="absolute left-14 right-2 bottom-[26px] flex items-end justify-around gap-3" style={{ height: H }}>
            {meses.map((m, i) => (
              <div key={i} className="relative flex-1 h-full flex items-end justify-center" onMouseEnter={() => setHover(i)}>
                {hover === i && <div className="absolute inset-x-[-6px] top-0 bottom-0 rounded-md bg-surface-2 -z-0" />}
                <div className="relative w-full max-w-[46px] flex flex-col-reverse gap-[2px]" style={{ height: `${(m.total / topo) * 100}%` }}>
                  {m.segs.filter((s) => s.valor > 0.005).map((s, k, arr) => (
                    <div key={s.key} className={clsx(s.kind === 'me' ? 'seg-me' : 'seg-rt', s.pend && 'pend', k === arr.length - 1 && 'rounded-t-[4px]')} style={{ height: `${(s.valor / m.total) * 100}%`, minHeight: 2 }} />
                  ))}
                </div>
                {hover === i && (
                  <div className="tooltip" style={{ top: 4, left: i >= 3 ? 'auto' : 'calc(50% + 30px)', right: i >= 3 ? 'calc(50% + 30px)' : 'auto' }}>
                    <div className="font-semibold mb-1">{cap(format(m.mes, "MMMM 'de' yyyy", { locale: ptBR }))}</div>
                    {m.segs.filter((s) => s.valor > 0.005).map((s) => (
                      <div key={s.key} className="flex items-center gap-2 py-0.5 whitespace-nowrap">
                        <span className={clsx('w-2.5 h-2.5 rounded-[3px]', s.kind === 'me' ? 'seg-me' : 'seg-rt', s.pend && 'pend')} />
                        <span className="text-muted flex-1">{s.label}</span>
                        <span className="tnum font-medium">{brl(s.valor)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t border-border mt-1 pt-1 font-semibold"><span>Total</span><span className="tnum">{brl(m.total)}</span></div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="absolute left-14 right-2 bottom-0 flex justify-around gap-3">
            {meses.map((m, i) => (
              <span key={i} className={clsx('flex-1 text-center text-[11.5px]', i === 5 ? 'font-semibold text-text' : 'text-muted')}>{cap(format(m.mes, 'MMM/yy', { locale: ptBR }))}</span>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------- tabela
type SortKey = 'ref' | 'cliente' | 'conclusao' | 'total'

function Tabela({ linhas, escopo, rep, repTxt, periodoLabel, situacao, onSituacao, base }: { linhas: OS[]; escopo: Escopo; rep: number; repTxt: string; periodoLabel: string; situacao: Situacao | ''; onSituacao: (s: Situacao | '') => void; base: BaseRepasse }) {
  const config = useStore((s) => s.config)
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: 'conclusao', dir: -1 })
  const [aberto, setAberto] = useState<string | null>(null)
  const [pagina, setPagina] = useState(0)
  const [cols, setCols] = useState<Set<ColOpc>>(() => new Set<ColOpc>(['tipologia', 'responsavel', 'conclusao', 'deslocamento']))
  const [menuCols, setMenuCols] = useState(false)
  const [csvCopiado, setCsvCopiado] = useState(false)
  const POR_PAG = 10

  const parte = (o: OS) => (escopo === 'luan' && o.responsavel === 'rt') || escopo === 'rt' ? repasseDaOS(o, rep, base) : valorTotal(o)
  const mostrarParte = escopo !== 'todas'

  const ordenadas = useMemo(() => {
    const v = (o: OS) => (sort.k === 'ref' ? o.referencia : sort.k === 'cliente' ? o.proponente : sort.k === 'total' ? valorTotal(o) : dataReferencia(o))
    return [...linhas].sort((a, b) => {
      const x = v(a), y = v(b)
      return (typeof x === 'number' ? x - (y as number) : String(x).localeCompare(String(y))) * sort.dir
    })
  }, [linhas, sort])

  const paginas = Math.max(1, Math.ceil(ordenadas.length / POR_PAG))
  const pag = Math.min(pagina, paginas - 1)
  const visiveis = ordenadas.slice(pag * POR_PAG, pag * POR_PAG + POR_PAG)
  const somaTotal = linhas.reduce((s, o) => s + valorTotal(o), 0)
  const somaParte = linhas.reduce((s, o) => s + parte(o), 0)

  const th = (k: SortKey, label: string, cls?: string) => (
    <th className={clsx('cursor-pointer select-none hover:text-text', cls)} onClick={() => setSort((s) => ({ k, dir: s.k === k ? (s.dir === 1 ? -1 : 1) : k === 'total' || k === 'conclusao' ? -1 : 1 }))}>
      {label}{sort.k === k && <span className="ml-1">{sort.dir === 1 ? '↑' : '↓'}</span>}
    </th>
  )

  const montarCSV = () => {
    const cab = ['OS', 'Cliente', 'Tipologia', 'Origem', 'Responsavel', 'Polo', 'Conclusao', 'Prazo', 'Valor_OS', 'Deslocamento', 'Total', mostrarParte ? 'Sua_parte' : '', 'Situacao'].filter(Boolean)
    const rows = ordenadas.map((o) => [o.referencia, o.proponente, o.tipologia, o.responsavel === 'luan' ? 'Meu' : `RT ${repTxt}`, config.responsaveis[o.responsavel].nome, poloDe(o.endereco.cidade), o.concluidaEm ?? '', o.prazo,
      o.valorServico.toFixed(2).replace('.', ','), o.valorDeslocamento.toFixed(2).replace('.', ','), valorTotal(o).toFixed(2).replace('.', ','), ...(mostrarParte ? [parte(o).toFixed(2).replace('.', ',')] : []), SITUACAO_META[situacaoDe(o)].label])
    return [cab, ...rows].map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n')
  }
  const exportar = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['\ufeff' + montarCSV()], { type: 'text/csv;charset=utf-8' }))
    a.download = `faturamento_${periodoLabel.replace(/\s+/g, '_')}.csv`
    a.click()
  }

  const antesDoTotal = 3 + (cols.has('tipologia') ? 1 : 0) + (escopo === 'luan' ? 1 : 0) + (cols.has('responsavel') && escopo !== 'luan' ? 1 : 0) + (cols.has('polo') ? 1 : 0) + (cols.has('conclusao') ? 1 : 0) + 1 + (cols.has('deslocamento') ? 1 : 0)
  const nCols = antesDoTotal + 1 + (mostrarParte ? 1 : 0) + 2

  return (
    <Card
      pad={false}
      title={<span className="flex items-center gap-2"><FileText size={16} className="text-brand" />Ordens de serviço do período</span>}
      actions={
        <>
          <select id="fat-situacao" aria-label="Situação" className="input input-sm w-[170px]" value={situacao} onChange={(e) => onSituacao(e.target.value as Situacao | '')}>
            <option value="">Todas as situações</option>
            <option value="finalizada">Finalizadas</option>
            <option value="a_faturar">A faturar</option>
            <option value="vencida">Vencidas</option>
          </select>
          <div className="relative">
            <button className="btn btn-secondary btn-sm" onClick={() => setMenuCols((v) => !v)}><Columns3 size={14} /> Colunas <ChevronDown size={13} /></button>
            {menuCols && (
              <div className="absolute right-0 top-9 z-30 card p-2 w-48" onMouseLeave={() => setMenuCols(false)}>
                {(Object.keys(COL_LABEL) as ColOpc[]).map((c) => (
                  <label key={c} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-surface-2 text-[13px] cursor-pointer">
                    <input type="checkbox" checked={cols.has(c)} onChange={() => setCols((s) => { const n = new Set(s); if (n.has(c)) n.delete(c); else n.add(c); return n })} />
                    {COL_LABEL[c]}
                  </label>
                ))}
              </div>
            )}
          </div>
          <button className="btn btn-secondary btn-sm" onClick={async () => { if (await copiar(montarCSV())) { setCsvCopiado(true); setTimeout(() => setCsvCopiado(false), 1400) } }} disabled={!linhas.length}>{csvCopiado ? 'Copiado' : 'Copiar CSV'}</button>
          <button className="btn btn-secondary btn-sm" onClick={exportar} disabled={!linhas.length}><Download size={14} /> CSV</button>
        </>
      }
    >
      {linhas.length === 0 ? (
        <Empty title="Nenhuma O.S. neste período" text="Troque o período, a carteira ou os filtros." />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="table table-compact min-w-[900px] [&_th]:whitespace-nowrap">
              <thead>
                <tr>
                  <th className="w-8" />
                  {th('ref', 'O.S.')}
                  {th('cliente', 'Cliente')}
                  {cols.has('tipologia') && <th>Tipologia</th>}
                  {escopo === 'luan' && <th>Origem</th>}
                  {cols.has('responsavel') && escopo !== 'luan' && <th>Responsável</th>}
                  {cols.has('polo') && <th>Polo</th>}
                  {cols.has('conclusao') && th('conclusao', 'Conclusão')}
                  <th className="text-right">Valor O.S.</th>
                  {cols.has('deslocamento') && <th className="text-right">Desloc.</th>}
                  {th('total', 'Total', 'text-right')}
                  {mostrarParte && <th className="text-right">{escopo === 'rt' ? `Repasse ${repTxt}` : 'Sua parte'}</th>}
                  <th>Situação</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {visiveis.map((o) => {
                  const sit = situacaoDe(o)
                  const exp = aberto === o.id
                  return (
                    <FragmentoLinha key={o.id}>
                      <tr onClick={() => setAberto(exp ? null : o.id)} aria-expanded={exp}>
                        <td className="text-muted">{exp ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</td>
                        <td className="tnum font-medium whitespace-nowrap" title={o.referencia}>#{refCurta(o.referencia)}</td>
                        <td className="font-medium whitespace-nowrap">{o.proponente}<div className="text-[11.5px] text-muted font-normal">{o.endereco.bairro} · {o.endereco.cidade}</div></td>
                        {cols.has('tipologia') && <td><span className={clsx('chip tnum !rounded-md !h-[22px] font-semibold', `tip-${o.tipologia}`)} title={TIPOLOGIAS[o.tipologia]}>{o.tipologia}</span></td>}
                        {escopo === 'luan' && <td>{o.responsavel === 'luan' ? <span className="chip kpi-sage">Meu</span> : <span className="chip kpi-lav">RT {repTxt}</span>}</td>}
                        {cols.has('responsavel') && escopo !== 'luan' && <td className="whitespace-nowrap"><span className="flex items-center gap-2"><Avatar resp={o.responsavel} size={20} />{config.responsaveis[o.responsavel].curto}</span></td>}
                        {cols.has('polo') && <td className="text-[12.5px]">{poloDe(o.endereco.cidade)}</td>}
                        {cols.has('conclusao') && <td className="tnum text-[12.5px] whitespace-nowrap">{estaFinalizada(o) && o.concluidaEm ? dataCurtaPrazo(o.concluidaEm) : <span className="text-muted" title="Ainda não finalizada: data é o prazo">prazo {dataCurtaPrazo(o.prazo)}</span>}</td>}
                        <td className="text-right tnum">{brl(o.valorServico)}</td>
                        {cols.has('deslocamento') && <td className="text-right tnum text-muted">{brl(o.valorDeslocamento)}</td>}
                        <td className="text-right tnum font-semibold">{brl(valorTotal(o))}</td>
                        {mostrarParte && <td className="text-right tnum font-semibold text-brand-strong">{brl(parte(o))}</td>}
                        <td><span className={clsx('chip', SITUACAO_META[sit].cls)}><span className="dot" />{SITUACAO_META[sit].label}</span></td>
                        <td onClick={(e) => e.stopPropagation()}><Link to={`/os/${o.id}`} className="btn btn-ghost btn-icon" aria-label="Abrir O.S."><ExternalLink size={14} /></Link></td>
                      </tr>
                      {exp && (
                        <tr className="!cursor-default">
                          <td />
                          <td colSpan={nCols - 1} className="!bg-surface-2">
                            <div className="grid sm:grid-cols-4 gap-3 text-[12.5px] py-1">
                              <Det l="Endereço" v={enderecoLinha(o)} />
                              <Det l="Tipologia" v={`${o.tipologia} · ${TIPOLOGIAS[o.tipologia]}`} />
                              <Det l="Emissão · prazo" v={`${dataMedia(o.emissao)} · ${dataMedia(o.prazo)}`} />
                              <Det l="Laudo enviado" v={o.enviadoEm ? dataMedia(o.enviadoEm) : '—'} />
                              <Det l="Responsável" v={`${config.responsaveis[o.responsavel].nome} · ${config.responsaveis[o.responsavel].registro}`} />
                              <Det l="Polo" v={poloDe(o.endereco.cidade)} />
                              <Det l="Último evento" v={o.historico[o.historico.length - 1]?.texto ?? '—'} />
                              <Det l="Extrato · RRT" v={`${o.conferida ? 'conferida' : 'não conferida'} · ${o.rrt ? 'no RRT' : 'fora do RRT'}`} />
                            </div>
                          </td>
                        </tr>
                      )}
                    </FragmentoLinha>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-surface-2 font-semibold">
                  <td colSpan={antesDoTotal} className="text-[12px] text-muted uppercase tracking-wide">{linhas.length} O.S. · total do filtro</td>
                  <td className="text-right tnum">{brl(somaTotal)}</td>
                  {mostrarParte && <td className="text-right tnum text-brand-strong">{brl(somaParte)}</td>}
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-border text-[12px] text-muted">
            <span>Mostrando {pag * POR_PAG + 1}–{Math.min(ordenadas.length, (pag + 1) * POR_PAG)} de {ordenadas.length}</span>
            <div className="flex items-center gap-1">
              <button className="btn btn-ghost btn-sm" disabled={pag === 0} onClick={() => setPagina(pag - 1)}>Anterior</button>
              {Array.from({ length: paginas }, (_, i) => (
                <button key={i} className={clsx('btn btn-sm !w-8 !px-0', i === pag ? 'btn-primary' : 'btn-ghost')} onClick={() => setPagina(i)}>{i + 1}</button>
              ))}
              <button className="btn btn-ghost btn-sm" disabled={pag >= paginas - 1} onClick={() => setPagina(pag + 1)}>Próxima</button>
            </div>
          </div>
        </>
      )}
    </Card>
  )
}

function FragmentoLinha({ children }: { children: ReactNode }) {
  return <>{children}</>
}

function Det({ l, v }: { l: string; v: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] uppercase tracking-wide text-muted font-semibold">{l}</div>
      <div className="truncate" title={v}>{v}</div>
    </div>
  )
}

function MetaCard({ meta, consolidado, potencial, refMes }: { meta: number; consolidado: number; potencial: number; refMes: Date }) {
  const hoje = new Date()
  const mesAtual = refMes.getFullYear() === hoje.getFullYear() && refMes.getMonth() === hoje.getMonth()
  const ritmo = mesAtual ? projecaoPorRitmo(consolidado, hoje) : null
  const max = Math.max(meta, potencial, consolidado, 1)
  const pctMeta = meta ? consolidado / meta : 0
  const falta = Math.max(0, meta - consolidado)
  return (
    <div className="card px-4 py-3 mb-4" id="meta-mensal">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
        <span className="font-semibold text-[13px]">Meta do mês · {brl(meta)}</span>
        <span className="text-[12.5px] text-muted">
          {pctMeta >= 1 ? <b className="text-brand-strong">Meta batida</b> : <>faltam <b className="tnum text-text">{brl(falta)}</b> ({pct(1 - pctMeta, 0)})</>}
        </span>
      </div>
      <div className="relative h-4 rounded-[5px] track overflow-hidden" role="img" aria-label={`Consolidado ${brl(consolidado)} de uma meta de ${brl(meta)}`}>
        <div className="absolute inset-y-0 left-0 seg-me pend" style={{ width: `${Math.min(100, (potencial / max) * 100)}%` }} />
        <div className="absolute inset-y-0 left-0 seg-me" style={{ width: `${Math.min(100, (consolidado / max) * 100)}%` }} />
        <div className="absolute inset-y-[-3px] w-[2px] bg-[var(--text)]" style={{ left: `${Math.min(100, (meta / max) * 100)}%` }} title="Meta" />
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-[12.5px] text-muted">
        <span>Consolidado <b className="tnum text-text">{brl(consolidado)}</b> ({pct(pctMeta, 0)} da meta)</span>
        <span>Potencial do mês <b className="tnum text-text">{brl(potencial)}</b></span>
        {ritmo && <span>No ritmo atual (dia {ritmo.diaAtual} de {ritmo.diasNoMes}) fecha em <b className={clsx('tnum', ritmo.projecao >= meta ? 'text-brand-strong' : 'text-[var(--f-warn-fg)]')}>{brl(ritmo.projecao)}</b></span>}
      </div>
    </div>
  )
}
