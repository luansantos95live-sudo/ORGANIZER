import clsx from 'clsx'
import { addMonths, format, startOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ChartColumn, ChartPie, Check, ChevronDown, ChevronRight, CircleAlert, CircleCheck, ClipboardCopy, Clock, Copy, Download, Ellipsis,
  FileText, Info, Layers, MapPin, Percent, Receipt, Search, SlidersHorizontal, TrendingUp, Trophy, Users, Wallet, Zap,
} from 'lucide-react'
import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Avatar, Card, Empty, FiltroPeriodo, PageHeader, TipologiaChip } from '../components/ui'
import {
  POLOS, TIPOLOGIAS, brlCompacto, dataReferencia, entraNoFaturamento, estaFinalizada, intervalo, noIntervalo, painelEquipe, painelGeral,
  painelMinhas, pct, poloDe, projecaoPorRitmo, repasseDaOS, repasseDe, resumir, rotuloPeriodo, situacaoDe, textoPronto, ticksBonitos, valorTotal,
  type BaseRepasse, type Periodo, type Resumo, type Situacao,
} from '../lib/faturamento'
import { copiar } from '../lib/clipboard'
import { brl, cap, codigoOS, dataMedia, enderecoCompleto, enderecoLinha, refCurta } from '../lib/os'
import { useStore } from '../store/useStore'
import type { Escopo, OS, Tipologia } from '../types'

// ---------------------------------------------------------------- tipos de apresentação
// Cores lisas, como no FLUXO ARQ: o cartão é neutro e a cor vai só no número e no ícone.
// Verde = finalizado, roxo = RT, laranja = a faturar, azul = deslocamento, vermelho só para vencido.
type Tom = 'neutro' | 'verde' | 'rt' | 'laranja' | 'azul' | 'vermelho'
type SegKind = 'me' | 'rt'
interface Seg { key: string; label: string; valor: number; kind: SegKind; pend?: boolean }
interface Barra { titulo: string; nota?: string; segs: Seg[] }
interface KpiDef { tom: Tom; icon: ReactNode; label: string; valor: string; sub: ReactNode; info: string }
interface Indicador { tom: Tom; icon: ReactNode; label: string; sub: string; valor: string }
type Trio =
  | { tipo: 'anel'; titulo: string; valor: number; texto: string; kind: SegKind }
  | { tipo: 'card'; tom: Tom; icon: ReactNode; titulo: string; valor: string; texto: string }

const SITUACAO_META: Record<Situacao, { label: string; cls: string; icon: ReactNode }> = {
  em_aberto: { label: 'Em aberto', cls: 'status-recebida', icon: <Clock size={14} /> },
  vencida: { label: 'Vencida', cls: 'chip-r', icon: <CircleAlert size={14} /> },
  a_faturar: { label: 'A faturar', cls: 'chip-l', icon: <Receipt size={14} /> },
  faturada: { label: 'Faturada', cls: 'chip-v', icon: <CircleCheck size={14} /> },
}

const frac = (parte: number, todo: number) => (todo > 0 ? parte / todo : 0)
const ic = (C: typeof ChartColumn) => <C strokeWidth={1.75} />

// ---------------------------------------------------------------- página
export function Faturamento() {
  const todas = useStore((s) => s.os)
  const escopo = useStore((s) => s.escopo)
  const setEscopo = useStore((s) => s.setEscopo)
  const config = useStore((s) => s.config)
  const rep = config.repasseRT
  const base = config.repasseBase
  const repTxt = `${Math.round(rep * 100)}%`
  const nomeRT = config.responsaveis.rt.curto

  const [busca, setBusca] = useState('')
  const [tipologia, setTipologia] = useState<Tipologia | ''>('')
  const [polo, setPolo] = useState('')
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [ref, setRef] = useState(() => startOfMonth(new Date()))
  const [especifico, setEspecifico] = useState({ ini: '', fim: '' })
  const [sp] = useSearchParams()
  const [situacao, setSituacao] = useState<Situacao | ''>(() => (sp.get('situacao') as Situacao | null) ?? '')

  const { ini, fim } = intervalo(periodo, ref, especifico)

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

  const noPeriodo = periodo === 'mes' ? 'no mês' : periodo === 'semana' ? 'na semana' : periodo === 'ano' ? 'no ano' : 'no período'
  const visao = montarVisao(escopo, rMe, rRt, rAll, rep, repTxt, nomeRT, base, noPeriodo)
  const minhas = painelMinhas(rMe, rRt, rep, base)

  const linhas = escopo === 'rt' ? doRT : doPeriodo
  const linhasFiltradas = situacao ? linhas.filter((o) => situacaoDe(o) === situacao) : linhas

  const subtitulo =
    escopo === 'luan' ? `Seu faturamento e sua participação de ${repTxt} no RT de ${nomeRT}.`
      : escopo === 'rt' ? `Desempenho da equipe de ${nomeRT} e o repasse de ${repTxt} que volta para você.`
        : 'Visão geral do faturamento total: suas O.S. e as da equipe do RT.'

  return (
    <>
      <PageHeader title="Financeiro" subtitle={subtitulo} actions={<Link className="btn btn-secondary" to="/financeiro/fechamento"><Receipt size={15} /> Fechamento do mês</Link>} />

      {/* filtros */}
      <div className="card px-3 py-3 mb-3 flex flex-wrap items-end gap-2.5">
        <Filtro label="Buscar">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <input id="fat-busca" className="input input-sm !pl-8 w-[200px]" placeholder="O.S., cliente, bairro…" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
        </Filtro>
        <Filtro label="Tipologia">
          <select id="fat-tipologia" className="input input-sm w-[160px]" value={tipologia} onChange={(e) => setTipologia(e.target.value as Tipologia | '')}>
            <option value="">Todas</option>
            {(Object.keys(TIPOLOGIAS) as Tipologia[]).map((t) => <option key={t} value={t}>{t} · {TIPOLOGIAS[t]}</option>)}
          </select>
        </Filtro>
        <Filtro label="Polo">
          <select id="fat-polo" className="input input-sm w-[125px]" value={polo} onChange={(e) => setPolo(e.target.value)}>
            <option value="">Todos</option>
            {Object.keys(POLOS).map((p) => <option key={p}>{p}</option>)}
          </select>
        </Filtro>
        <Filtro label="Período">
          <FiltroPeriodo periodo={periodo} setPeriodo={setPeriodo} data={ref} setData={setRef} especifico={especifico} setEspecifico={setEspecifico} />
        </Filtro>
        <Filtro label="Carteira">
          <div className="seg">
            {([['luan', 'Só minhas'], ['rt', 'Minha equipe'], ['todas', 'Geral']] as [Escopo, string][]).map(([v, l]) => (
              <button key={v} aria-pressed={escopo === v} onClick={() => setEscopo(v)} className="!h-[24px]">{l}</button>
            ))}
          </div>
        </Filtro>
      </div>

      <Insight escopo={escopo} rMe={rMe} rRt={rRt} rAll={rAll} rep={rep} nomeRT={nomeRT} base={base} />

      {escopo === 'luan' && periodo === 'mes' && <MetaCard meta={config.metaMensal} consolidado={minhas.consolidado} potencial={minhas.previstoTotal} refMes={ref} />}

      {/* indicadores principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 mb-3">
        {visao.kpis.map((k) => <KpiCard key={k.label} {...k} />)}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.55fr_1fr] gap-3 mb-3 items-start">
        <Card
          title={<span className="flex items-center gap-2"><ChartColumn size={15} className="text-brand" />{visao.tituloComposicao}</span>}
          actions={<Legenda escopo={escopo} nomeRT={nomeRT} repTxt={repTxt} />}
        >
          <div className="flex flex-col gap-4 pt-1">
            {visao.barras.map((b) => <BarraEmpilhada key={b.titulo} barra={b} />)}
          </div>
          <div className="grid sm:grid-cols-3 gap-3 mt-4">
            {visao.trio.map((t) => <TrioCard key={t.titulo} item={t} />)}
          </div>
        </Card>

        <Card title={<span className="flex items-center gap-2"><ChartPie size={15} className="text-brand" />{visao.tituloIndicadores}</span>} pad={false}>
          <ul className="divide-y divide-border">
            {visao.indicadores.map((i) => (
              <li key={i.label} className={clsx('flex items-center gap-3 px-4 py-2.5', `tom-${i.tom}`)}>
                <span className="ic-quadro">{i.icon}</span>
                <span className="flex-1 min-w-0">
                  <span className="block font-medium leading-tight">{i.label}</span>
                  <span className="block text-[12px] text-muted leading-tight mt-0.5">{i.sub}</span>
                </span>
                <span className="tnum font-semibold text-[15px] whitespace-nowrap">{i.valor}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Historico base={baseOS} baseRepasse={base} escopo={escopo} rep={rep} refMes={periodo === 'mes' ? ref : startOfMonth(fim)} nomeRT={nomeRT} repTxt={repTxt} />

      <Tabela
        linhas={linhasFiltradas} escopo={escopo} rep={rep} base={base} repTxt={repTxt} periodoLabel={rotuloPeriodo(periodo, ref, especifico)}
        situacao={situacao} onSituacao={setSituacao}
      />
    </>
  )
}

// ---------------------------------------------------------------- regras de apresentação por visão (as contas estão em lib/faturamento)
function montarVisao(escopo: Escopo, rMe: Resumo, rRt: Resumo, rAll: Resumo, rep: number, repTxt: string, nomeRT: string, base: BaseRepasse, noPeriodo: string) {
  const rr = repasseDe(rRt, rep, base)
  const baseTxt = base === 'servico' ? ' (só o serviço, sem deslocamento)' : ' (serviço + deslocamento)'

  if (escopo === 'luan') {
    const p = painelMinhas(rMe, rRt, rep, base)
    const kpis: KpiDef[] = [
      { tom: 'neutro', icon: ic(ChartColumn), label: 'Meu previsto', valor: brl(p.meuPrevisto), sub: `${rMe.qtd} O.S. + deslocamentos ${noPeriodo}`, info: 'Serviço + deslocamento das suas O.S. aceitas no período, finalizadas ou a faturar.' },
      { tom: 'verde', icon: ic(CircleCheck), label: 'Meu finalizado', valor: brl(p.meuFinalizado), sub: `${pct(rMe.conversao)} do meu previsto`, info: 'Suas O.S. com laudo aceito (finalizadas ou conferidas) no período.' },
      { tom: 'rt', icon: ic(Users), label: `Participação no RT (${repTxt})`, valor: brl(p.partFinalizada), sub: <>prevista <b className="tnum text-text">{brl(p.partPrevista)}</b></>, info: `${repTxt} sobre as O.S. de ${nomeRT}${baseTxt}. O valor grande é a parte já finalizada.` },
      { tom: 'verde', icon: ic(Layers), label: 'Total consolidado', valor: brl(p.consolidado), sub: `meu finalizado + ${repTxt} do RT finalizado`, info: 'O que já está garantido no período: seu finalizado somado à sua parte do finalizado do RT.' },
      { tom: 'laranja', icon: ic(Zap), label: 'Potencial a faturar', valor: brl(p.saldo), sub: `previsto (meu + ${repTxt} do RT) − consolidado`, info: `Quanto ainda pode entrar se todas as O.S. em aberto forem finalizadas. Previsto total: ${brl(p.previstoTotal)}.` },
    ]
    const barras: Barra[] = [{
      titulo: 'Potencial do período', nota: brl(p.previstoTotal),
      segs: [
        { key: 'mf', label: 'Meu finalizado', valor: p.meuFinalizado, kind: 'me' },
        { key: 'rf', label: `${repTxt} do RT finalizado`, valor: p.partFinalizada, kind: 'rt' },
        { key: 'mp', label: 'Meu em aberto', valor: rMe.emAberto, kind: 'me', pend: true },
        { key: 'rp', label: `${repTxt} do RT em aberto`, valor: rr.emAberto, kind: 'rt', pend: true },
      ],
    }]
    const trio: Trio[] = [
      { tipo: 'anel', titulo: 'Taxa de conversão do meu previsto', valor: p.conversao, texto: `${brl(p.consolidado)} de ${brl(p.previstoTotal)} já faturados.`, kind: 'me' },
      { tipo: 'card', tom: 'rt', icon: ic(Percent), titulo: 'Participação do RT no meu total', valor: pct(p.pesoRT), texto: `do consolidado vem do repasse de ${nomeRT}.` },
      { tipo: 'card', tom: 'laranja', icon: ic(Wallet), titulo: 'Saldo a faturar', valor: brl(p.saldo), texto: `${pct(frac(p.saldo, p.previstoTotal))} do previsto ainda em aberto.` },
    ]
    const indicadores: Indicador[] = [
      { tom: 'verde', icon: ic(CircleCheck), label: 'Minhas O.S. concluídas', sub: 'laudo aceito no período', valor: String(p.qtdConcluidas) },
      { tom: 'laranja', icon: ic(Clock), label: 'Minhas O.S. em aberto', sub: p.qtdVencidas ? `${p.qtdVencidas} com prazo vencido` : 'nenhuma vencida', valor: String(p.qtdEmAberto) },
      { tom: 'neutro', icon: ic(ChartColumn), label: 'Ticket médio das minhas O.S.', sub: 'média das minhas O.S. finalizadas', valor: brl(p.ticketFinalizadas) },
      { tom: 'rt', icon: ic(Users), label: `O.S. de ${nomeRT} no período`, sub: `${rRt.qtdFinalizadas} finalizadas · ${rRt.qtdEmAberto} em aberto`, valor: String(rRt.qtd) },
      { tom: 'verde', icon: ic(TrendingUp), label: 'Projeção de fechamento', sub: `sem as O.S. vencidas: ${pct(frac(p.projecao, p.previstoTotal), 0)} do previsto`, valor: brl(p.projecao) },
      { tom: 'laranja', icon: ic(Receipt), label: 'A faturar (sem nota)', sub: `${rMe.qtdAFaturarNF} concluídas ainda sem nota fiscal`, valor: brl(rMe.aFaturarNF) },
      { tom: 'verde', icon: ic(CircleCheck), label: 'Valores faturados', sub: `${rMe.qtdFaturadas} O.S. marcadas como faturadas`, valor: brl(rMe.faturado) },
    ]
    return { kpis, barras, trio, indicadores, tituloComposicao: 'Composição do meu faturamento', tituloIndicadores: 'Resumo estratégico' }
  }

  if (escopo === 'rt') {
    const q = painelEquipe(rRt, rep, base)
    const kpis: KpiDef[] = [
      { tom: 'neutro', icon: ic(ChartColumn), label: 'RT previsto', valor: brl(q.previsto), sub: `${q.qtd} O.S. da equipe ${noPeriodo}`, info: `Serviço + deslocamento de todas as O.S. aceitas de ${nomeRT} no período.` },
      { tom: 'verde', icon: ic(CircleCheck), label: 'RT finalizado', valor: brl(q.finalizado), sub: `${pct(q.conversao)} do previsto`, info: 'O.S. do RT com laudo aceito no período.' },
      { tom: 'rt', icon: ic(Users), label: `Repasse previsto (${repTxt})`, valor: brl(q.repassePrevisto), sub: 'sua parte sobre o previsto', info: `${repTxt} do RT previsto${baseTxt}.` },
      { tom: 'verde', icon: ic(Layers), label: `Repasse finalizado (${repTxt})`, valor: brl(q.repasseFinalizado), sub: 'sua parte já garantida', info: `${repTxt} do RT finalizado${baseTxt}.` },
      { tom: 'laranja', icon: ic(Zap), label: 'Saldo do RT em aberto', valor: brl(q.emAberto), sub: `${q.qtdEmAberto} O.S. em aberto`, info: 'Diferença entre o previsto e o finalizado do RT.' },
    ]
    const barras: Barra[] = [
      { titulo: 'RT previsto', nota: brl(q.previsto), segs: [
        { key: 'rf', label: 'RT finalizado', valor: q.finalizado, kind: 'rt' },
        { key: 'rp', label: 'RT em aberto', valor: q.emAberto, kind: 'rt', pend: true },
      ] },
      { titulo: `Seu repasse (${repTxt})`, nota: brl(q.repassePrevisto), segs: [
        { key: 'pf', label: 'Repasse finalizado', valor: q.repasseFinalizado, kind: 'me' },
        { key: 'pp', label: 'Repasse potencial restante', valor: q.repasseRestante, kind: 'me', pend: true },
      ] },
    ]
    const trio: Trio[] = [
      { tipo: 'anel', titulo: 'Conversão do RT', valor: q.conversao, texto: `do previsto de ${nomeRT} já foi finalizado.`, kind: 'rt' },
      { tipo: 'card', tom: 'neutro', icon: ic(Trophy), titulo: 'Maior O.S. da equipe', valor: q.maior ? brl(valorTotal(q.maior)) : '—', texto: q.maior ? `#${refCurta(q.maior.referencia)} · ${q.maior.proponente}` : 'sem O.S. no período' },
      { tipo: 'card', tom: 'neutro', icon: ic(ChartColumn), titulo: 'Média por O.S. da equipe', valor: brl(q.media), texto: `valor médio das O.S. da equipe ${noPeriodo}.` },
    ]
    const indicadores: Indicador[] = [
      { tom: 'neutro', icon: ic(FileText), label: 'O.S. da equipe', sub: 'aceitas no período', valor: String(q.qtd) },
      { tom: 'verde', icon: ic(CircleCheck), label: 'O.S. finalizadas', sub: 'laudo aceito', valor: String(q.qtdFinalizadas) },
      { tom: 'laranja', icon: ic(Clock), label: 'O.S. em aberto', sub: q.qtdVencidas ? `${q.qtdVencidas} com prazo vencido` : 'nenhuma vencida', valor: String(q.qtdEmAberto) },
      { tom: 'verde', icon: ic(Layers), label: `Repasse finalizado (${repTxt})`, sub: 'sua parte já garantida', valor: brl(q.repasseFinalizado) },
      { tom: 'rt', icon: ic(Users), label: `Repasse previsto (${repTxt})`, sub: 'sua parte sobre o previsto', valor: brl(q.repassePrevisto) },
      { tom: 'laranja', icon: ic(Zap), label: 'Saldo do RT em aberto', sub: 'previsto − finalizado do RT', valor: brl(q.emAberto) },
      { tom: 'laranja', icon: ic(Receipt), label: 'RT a faturar (sem nota)', sub: `${rRt.qtdAFaturarNF} concluídas ainda sem nota fiscal`, valor: brl(rRt.aFaturarNF) },
    ]
    return { kpis, barras, trio, indicadores, tituloComposicao: 'Desempenho financeiro da equipe', tituloIndicadores: 'Indicadores da equipe' }
  }

  // visão geral
  const g = painelGeral(rAll)
  const kpis: KpiDef[] = [
    { tom: 'neutro', icon: ic(ChartColumn), label: 'Previsto total', valor: brl(g.previsto), sub: `${g.qtd} O.S. + deslocamentos ${noPeriodo}`, info: 'Serviço + deslocamento de todas as O.S. aceitas no período, das duas carteiras.' },
    { tom: 'verde', icon: ic(CircleCheck), label: 'Finalizado', valor: brl(g.finalizado), sub: `${pct(frac(g.finalizado, g.previsto))} do previsto`, info: 'O.S. com laudo aceito (finalizadas ou conferidas) no período.' },
    { tom: 'azul', icon: ic(MapPin), label: 'Deslocamento total', valor: brl(g.deslocamento), sub: `${pct(frac(g.deslocamento, g.previsto))} do previsto`, info: 'Soma dos valores de deslocamento das O.S. do período.' },
    { tom: 'laranja', icon: ic(FileText), label: 'Em aberto', valor: brl(g.emAberto), sub: `${g.qtdPendentes} O.S. em aberto`, info: 'Previsto menos finalizado.' },
    { tom: 'neutro', icon: ic(ChartColumn), label: 'Ticket médio', valor: brl(g.ticketMedio), sub: 'média por O.S.', info: 'Previsto total dividido pela quantidade de O.S.' },
  ]
  const barras: Barra[] = [{
    titulo: 'Previsto total', nota: brl(g.previsto), segs: [
      { key: 'mf', label: 'Finalizado · você', valor: rMe.finalizado, kind: 'me' },
      { key: 'rf', label: `Finalizado · ${nomeRT}`, valor: rRt.finalizado, kind: 'rt' },
      { key: 'mp', label: 'Em aberto · você', valor: rMe.emAberto, kind: 'me', pend: true },
      { key: 'rp', label: `Em aberto · ${nomeRT}`, valor: rRt.emAberto, kind: 'rt', pend: true },
    ],
  }]
  const trio: Trio[] = [
    { tipo: 'anel', titulo: 'Taxa de conversão do período', valor: g.conversaoQtd, texto: `${g.qtdFinalizadas} de ${g.qtd} O.S. finalizadas.`, kind: 'me' },
    { tipo: 'card', tom: 'azul', icon: ic(MapPin), titulo: 'Peso do deslocamento', valor: pct(frac(g.deslocamento, g.previsto)), texto: `${brl(g.deslocamento)} em deslocamentos.` },
    { tipo: 'card', tom: 'verde', icon: ic(TrendingUp), titulo: 'Projeção de fechamento', valor: brl(g.projecao), texto: rAll.vencido ? `${brl(rAll.vencido)} vencido fica fora.` : 'nenhuma O.S. vencida no período.' },
  ]
  const indicadores: Indicador[] = [
    { tom: 'neutro', icon: ic(FileText), label: 'O.S. do período', sub: `${rMe.qtd} suas · ${rRt.qtd} de ${nomeRT}`, valor: String(g.qtd) },
    { tom: 'verde', icon: ic(CircleCheck), label: 'O.S. finalizadas', sub: 'laudo aceito no período', valor: String(g.qtdFinalizadas) },
    { tom: 'laranja', icon: ic(Clock), label: 'O.S. pendentes', sub: g.qtdVencidas ? `${g.qtdVencidas} com prazo vencido` : 'nenhuma vencida', valor: String(g.qtdPendentes) },
    { tom: 'neutro', icon: ic(Trophy), label: 'Maior O.S.', sub: g.maior ? `#${refCurta(g.maior.referencia)} · ${g.maior.proponente}` : '—', valor: g.maior ? brl(valorTotal(g.maior)) : '—' },
    { tom: 'laranja', icon: ic(Receipt), label: 'A faturar (sem nota)', sub: `${rAll.qtdAFaturarNF} concluídas ainda sem nota fiscal`, valor: brl(rAll.aFaturarNF) },
    { tom: 'verde', icon: ic(CircleCheck), label: 'Valores faturados', sub: `${rAll.qtdFaturadas} O.S. marcadas como faturadas`, valor: brl(rAll.faturado) },
    { tom: 'verde', icon: ic(TrendingUp), label: 'Projeção de fechamento', sub: 'previsto sem as O.S. vencidas', valor: brl(g.projecao) },
  ]
  return { kpis, barras, trio, indicadores, tituloComposicao: 'Panorama do faturamento', tituloIndicadores: 'Indicadores do período' }
}

// ---------------------------------------------------------------- frase-resumo
function Insight({ escopo, rMe, rRt, rAll, rep, nomeRT, base }: { escopo: Escopo; rMe: Resumo; rRt: Resumo; rAll: Resumo; rep: number; nomeRT: string; base: BaseRepasse }) {
  const rr = repasseDe(rRt, rep, base)
  let texto: ReactNode
  if (escopo === 'luan') {
    const p = painelMinhas(rMe, rRt, rep, base)
    const venc = rMe.qtdVencidas + rRt.qtdVencidas
    texto = <>Você já consolidou <b>{brl(p.consolidado)}</b> de <b>{brl(p.previstoTotal)}</b> possíveis ({pct(p.conversao, 0)}). Faltam <b>{rMe.qtdEmAberto}</b> O.S. suas e <b>{rRt.qtdEmAberto}</b> de {nomeRT} para fechar o período{venc ? <>, sendo <b className="text-[var(--vermelho)]">{venc} {venc === 1 ? 'já vencida' : 'já vencidas'}</b></> : null}.</>
  } else if (escopo === 'rt') {
    texto = <>{nomeRT} finalizou <b>{pct(rRt.conversao, 0)}</b> do previsto. Seu repasse garantido é <b>{brl(rr.finalizado)}</b> e ainda podem entrar <b>{brl(rr.emAberto)}</b>.</>
  } else {
    texto = <>As duas carteiras somam <b>{brl(rAll.previsto)}</b> no período, com <b>{pct(rAll.conversao, 0)}</b> já finalizado. Você responde por <b>{pct(frac(rMe.previsto, rAll.previsto), 0)}</b> do previsto.</>
  }
  return (
    <div className="card faixa-resumo px-4 py-3 mb-3 flex items-start gap-3 text-[13.5px]">
      <TrendingUp size={17} className="text-brand mt-0.5 shrink-0" />
      <p className="leading-relaxed">{texto}</p>
    </div>
  )
}

// ---------------------------------------------------------------- peças
function Filtro({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-bold uppercase tracking-[.08em] text-muted">{label}</span>
      {children}
    </div>
  )
}

function Dica({ texto }: { texto: string }) {
  return (
    <span className="dica" tabIndex={0} aria-label={texto}>
      <Info size={14} strokeWidth={1.75} />
      <span className="dica-txt" role="tooltip">{texto}</span>
    </span>
  )
}

function KpiCard({ tom, icon, label, valor, sub, info }: KpiDef) {
  return (
    <div className={clsx('card card-hover kpi-arq', `tom-${tom}`)}>
      <div className="flex items-center gap-2 pr-6">
        <span className="text-[var(--tom-ic)] shrink-0 [&>svg]:w-[15px] [&>svg]:h-[15px]">{icon}</span>
        <span className="card-tit leading-tight">{label}</span>
      </div>
      <div className="kpi-valor">{valor}</div>
      <div className="text-[12px] text-muted leading-snug mt-0.5">{sub}</div>
      <span className="absolute right-3 top-3"><Dica texto={info} /></span>
    </div>
  )
}

function Legenda({ escopo, nomeRT, repTxt }: { escopo: Escopo; nomeRT: string; repTxt: string }) {
  return (
    <div className="hidden sm:flex items-center gap-3 text-[11.5px] text-muted normal-case tracking-normal">
      {escopo !== 'rt' && <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-[3px] seg-me" />Você</span>}
      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-[3px] seg-rt" />{escopo === 'luan' ? `RT (${repTxt})` : nomeRT}</span>
      {escopo === 'rt' && <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-[3px] seg-me" />Seu repasse</span>}
      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-[3px] seg-me pend" />em aberto</span>
    </div>
  )
}

function BarraEmpilhada({ barra }: { barra: Barra }) {
  const total = barra.segs.reduce((s, x) => s + Math.max(0, x.valor), 0)
  const visiveis = barra.segs.filter((s) => s.valor > 0.005)
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="font-medium text-[13.5px]">{barra.titulo}</span>
        {barra.nota && <span className="text-[12.5px] text-muted tnum">{barra.nota}</span>}
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
          <li key={s.key} className="flex items-center gap-2 text-[13px]">
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
    <div className={clsx('rounded-[12px] border border-border px-3.5 py-3 flex items-start gap-3', `tom-${item.tom}`)}>
      <span className="ic-quadro !w-9 !h-9">{item.icon}</span>
      <div className="min-w-0">
        <div className="font-semibold text-[13px] leading-tight">{item.titulo}</div>
        <div className="text-[19px] font-bold tnum leading-tight mt-0.5" style={{ color: 'var(--tom)' }}>{item.valor}</div>
        <div className="text-[12px] text-muted leading-snug">{item.texto}</div>
      </div>
    </div>
  )
}

function MetaCard({ meta, consolidado, potencial, refMes }: { meta: number; consolidado: number; potencial: number; refMes: Date }) {
  const hoje = new Date()
  const mesAtual = refMes.getFullYear() === hoje.getFullYear() && refMes.getMonth() === hoje.getMonth()
  const ritmo = mesAtual ? projecaoPorRitmo(consolidado, hoje) : null
  const max = Math.max(meta, potencial, consolidado, 1)
  const pctMeta = frac(consolidado, meta)
  const falta = Math.max(0, meta - consolidado)
  return (
    <div className="card px-4 py-3 mb-3" id="meta-mensal">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
        <span className="card-tit">Meta do mês <span className="suave tnum">{brl(meta)}</span></span>
        <span className="text-[12.5px] text-muted">
          {pctMeta >= 1 ? <b className="text-[var(--verde-valor)]">Meta batida</b> : <>faltam <b className="tnum text-text">{brl(falta)}</b> ({pct(1 - pctMeta, 0)})</>}
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
        {ritmo && <span>No ritmo atual (dia {ritmo.diaAtual} de {ritmo.diasNoMes}) fecha em <b className={clsx('tnum', ritmo.projecao >= meta ? 'text-[var(--verde-valor)]' : 'text-[var(--laranja-txt)]')}>{brl(ritmo.projecao)}</b></span>}
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
      const rtAFat = rtParte ? rtParte.emAberto : rt.emAberto
      const segs: Seg[] =
        escopo === 'rt'
          ? [
            { key: 'rf', label: `${nomeRT} finalizado`, valor: rt.finalizado, kind: 'rt' },
            { key: 'rp', label: `${nomeRT} em aberto`, valor: rt.emAberto, kind: 'rt', pend: true },
          ]
          : [
            { key: 'mf', label: 'Você · finalizado', valor: me.finalizado, kind: 'me' },
            { key: 'rf', label: escopo === 'luan' ? `RT ${repTxt} · finalizado` : `${nomeRT} · finalizado`, valor: rtFin, kind: 'rt' },
            { key: 'mp', label: 'Você · em aberto', valor: me.emAberto, kind: 'me', pend: true },
            { key: 'rp', label: escopo === 'luan' ? `RT ${repTxt} · em aberto` : `${nomeRT} · em aberto`, valor: rtAFat, kind: 'rt', pend: true },
          ]
      return { mes: m, segs, total: segs.reduce((s, x) => s + x.valor, 0), finalizado: segs.filter((s) => !s.pend).reduce((s, x) => s + x.valor, 0) }
    })
  }, [base, baseRepasse, escopo, rep, refMes, nomeRT, repTxt])

  const { topo, ticks } = ticksBonitos(Math.max(...meses.map((m) => m.total)))
  const H = 170
  const media = meses.slice(0, 5).reduce((s, m) => s + m.finalizado, 0) / 5

  return (
    <Card
      className="mb-3"
      title={<span className="flex items-center gap-2"><TrendingUp size={15} className="text-brand" />Últimos 6 meses</span>}
      actions={<span className="text-[12.5px] text-muted">média finalizada nos 5 meses anteriores <b className="tnum text-text">{brl(media)}</b> · este mês <b className="tnum text-text">{brl(meses[5].finalizado)}</b> finalizados de <b className="tnum text-text">{brl(meses[5].total)}</b></span>}
    >
      <div className="overflow-x-auto">
        <div className="relative min-w-[520px] pl-14 pr-2" style={{ height: H + 52 }} onMouseLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <div key={t} className="absolute left-0 right-2 flex items-center" style={{ bottom: 26 + (t / topo) * H }}>
              <span className="w-12 text-right pr-2 text-[11px] text-muted tnum">{brlCompacto(t).replace('R$ ', '')}</span>
              <span className={clsx('flex-1 h-px', t === 0 ? 'bg-[var(--muted)] opacity-40' : 'bg-border')} />
            </div>
          ))}
          <div className="absolute left-14 right-2 bottom-[26px] flex items-end justify-around gap-3" style={{ height: H }}>
            {meses.map((m, i) => (
              <div key={i} className="relative flex-1 h-full flex items-end justify-center" onMouseEnter={() => setHover(i)}>
                {hover === i && <div className="absolute inset-x-[-6px] top-0 bottom-0 rounded-md bg-surface-2" />}
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

// ---------------------------------------------------------------- tabela (colunas do sistema real + as das telas de referência)
type SortKey = 'ref' | 'cliente' | 'conclusao' | 'total'
type ColOpc = 'categoria' | 'tecnico' | 'telefone' | 'endereco' | 'conclusao' | 'deslocamento' | 'polo' | 'parte'
const COL_LABEL: Record<ColOpc, string> = { categoria: 'Categoria', tecnico: 'Técnico', telefone: 'Telefone', endereco: 'Endereço', conclusao: 'Conclusão', deslocamento: 'Deslocamento', polo: 'Polo', parte: 'Sua parte' }
const COLS_PADRAO: ColOpc[] = ['categoria', 'tecnico', 'telefone', 'endereco', 'conclusao', 'deslocamento', 'parte']
const POR_PAG = 10

function Tabela({ linhas, escopo, rep, base, repTxt, periodoLabel, situacao, onSituacao }: {
  linhas: OS[]; escopo: Escopo; rep: number; base: BaseRepasse; repTxt: string; periodoLabel: string; situacao: Situacao | ''; onSituacao: (s: Situacao | '') => void
}) {
  const config = useStore((s) => s.config)
  const marcarFaturada = useStore((s) => s.marcarFaturada)
  const nav = useNavigate()
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: 'ref', dir: 1 })
  const [aberto, setAberto] = useState<string | null>(null)
  const [pagina, setPagina] = useState(0)
  const [cols, setCols] = useState<Set<ColOpc>>(() => new Set<ColOpc>(COLS_PADRAO))
  const [menu, setMenu] = useState<string | null>(null) // 'cols', 'csv' ou o id da O.S. com o menu "…" aberto
  const [aviso, setAviso] = useState('')

  useEffect(() => setPagina(0), [linhas.length, escopo])
  useEffect(() => {
    if (!menu) return
    const fora = (e: MouseEvent) => { if (!(e.target as Element).closest('[data-menu]')) setMenu(null) }
    document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [menu])

  const avisar = (t: string) => { setAviso(t); setTimeout(() => setAviso(''), 1600) }
  const copiarComAviso = async (texto: string, msg: string) => { if (await copiar(texto)) avisar(msg) }
  // Sua parte: a O.S. inteira quando é sua; o repasse quando é do RT.
  const parte = (o: OS) => (o.responsavel === 'rt' ? repasseDaOS(o, rep, base) : valorTotal(o))

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
      {label}{sort.k === k && <span className="ml-1">{sort.dir === 1 ? '▲' : '▼'}</span>}
    </th>
  )

  const montarCSV = () => {
    const cab = ['OS', 'Numero', 'Cliente', 'Categoria', 'Origem', 'Tecnico', 'Telefone', 'Endereco', 'Polo', 'Conclusao', 'Valor_OS', 'Deslocamento', 'Total', 'Sua_parte', 'Situacao', 'Faturada']
    const num = (v: number) => v.toFixed(2).replace('.', ',')
    const rows = ordenadas.map((o) => [codigoOS(o), o.referencia, o.proponente, o.tipologia, o.responsavel === 'luan' ? 'Meu' : `Participação RT ${repTxt}`, config.responsaveis[o.responsavel].nome, o.telefone, enderecoCompleto(o), poloDe(o.endereco.cidade), o.concluidaEm ?? '',
      num(o.valorServico), num(o.valorDeslocamento), num(valorTotal(o)), num(parte(o)), SITUACAO_META[situacaoDe(o)].label, o.faturada ? 'Sim' : 'Não'])
    return [cab, ...rows].map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n')
  }
  const baixarCSV = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['﻿' + montarCSV()], { type: 'text/csv;charset=utf-8' }))
    a.download = `financeiro_${periodoLabel.replace(/\s+/g, '_')}.csv`
    a.click()
    setMenu(null)
  }

  const c = (k: ColOpc) => cols.has(k)
  const antesDoTotal = 3 + (c('categoria') ? 1 : 0) + (escopo === 'luan' ? 1 : 0) + (c('tecnico') ? 1 : 0) + (c('telefone') ? 1 : 0) + (c('endereco') ? 1 : 0) + (c('polo') ? 1 : 0) + (c('conclusao') ? 1 : 0) + 1 + (c('deslocamento') ? 1 : 0)
  const nCols = antesDoTotal + 1 + (c('parte') ? 1 : 0) + 4

  return (
    <Card
      pad={false}
      title={<span className="flex items-center gap-2"><FileText size={15} className="text-brand" />{escopo === 'rt' ? 'Ordens de serviço da equipe' : 'Ordens de serviço do período'}</span>}
      actions={
        <>
          {aviso && <span className="text-[12px] text-[var(--verde-valor)]">{aviso}</span>}
          <select id="fat-situacao" aria-label="Situação" className="input input-sm w-[170px]" value={situacao} onChange={(e) => onSituacao(e.target.value as Situacao | '')}>
            <option value="">Todas as situações</option>
            <option value="a_faturar">A faturar</option>
            <option value="faturada">Faturadas</option>
            <option value="em_aberto">Em aberto</option>
            <option value="vencida">Vencidas</option>
          </select>
          <div className="relative" data-menu>
            <button className="btn btn-secondary btn-sm" onClick={() => setMenu(menu === 'cols' ? null : 'cols')}><SlidersHorizontal size={14} /> Colunas</button>
            {menu === 'cols' && (
              <div className="menu-flut right-0 top-9">
                <div className="card-tit px-2 py-1.5">Exibir colunas</div>
                {(Object.keys(COL_LABEL) as ColOpc[]).map((k) => (
                  <label key={k} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-surface-2 text-[13px] cursor-pointer">
                    <input type="checkbox" className="accent-[var(--brand)]" checked={cols.has(k)} onChange={() => setCols((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n })} />
                    {COL_LABEL[k]}
                  </label>
                ))}
                <button className="!text-[var(--verde-valor)] font-semibold justify-center mt-1" onClick={() => setCols(new Set(COLS_PADRAO))}>Restaurar padrão</button>
              </div>
            )}
          </div>
          <div className="relative" data-menu>
            <button className="btn btn-secondary btn-sm" disabled={!linhas.length} onClick={() => setMenu(menu === 'csv' ? null : 'csv')}><Download size={14} /> CSV <ChevronDown size={13} /></button>
            {menu === 'csv' && (
              <div className="menu-flut right-0 top-9">
                <button onClick={baixarCSV}><Download /> Baixar CSV</button>
                <button onClick={async () => { setMenu(null); await copiarComAviso(montarCSV(), 'CSV copiado') }}><Copy /> Copiar CSV</button>
              </div>
            )}
          </div>
        </>
      }
    >
      {linhas.length === 0 ? (
        <Empty title="Nenhuma O.S. neste período" text="Troque o período, a carteira, a situação ou os filtros." />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="table table-compact min-w-[1250px] [&_th]:whitespace-nowrap">
              <thead>
                <tr>
                  <th className="w-8" />
                  {th('ref', 'O.S.')}
                  {th('cliente', 'Cliente')}
                  {c('categoria') && <th>Categoria</th>}
                  {escopo === 'luan' && <th>Origem</th>}
                  {c('tecnico') && <th>Técnico</th>}
                  {c('telefone') && <th>Telefone</th>}
                  {c('endereco') && <th>Endereço</th>}
                  {c('polo') && <th>Polo</th>}
                  {c('conclusao') && th('conclusao', 'Conclusão')}
                  <th className="text-right">Valor da O.S.</th>
                  {c('deslocamento') && <th className="text-right">Deslocamento</th>}
                  {th('total', escopo === 'luan' ? 'Valor total' : 'Total', 'text-right')}
                  {c('parte') && <th className="text-right">{escopo === 'rt' ? `Repasse ${repTxt}` : 'Sua parte'}</th>}
                  <th>Status</th>
                  <th className="text-center">Texto pronto</th>
                  <th>Faturada</th>
                  <th className="text-right pr-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((o) => {
                  const sit = situacaoDe(o)
                  const S = SITUACAO_META[sit]
                  const exp = aberto === o.id
                  const concluida = sit === 'a_faturar' || sit === 'faturada'
                  return (
                    <Fragment key={o.id}>
                      <tr onClick={() => setAberto(exp ? null : o.id)} aria-expanded={exp}>
                        <td className="text-muted">{exp ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</td>
                        <td className="tnum font-medium whitespace-nowrap text-[12.5px]"><span className="flex items-center gap-1.5">{concluida && <Check size={13} className="text-[var(--verde-valor)]" />}{o.referencia}</span></td>
                        <td className="font-medium whitespace-nowrap max-w-[210px] truncate" title={o.proponente}>{o.proponente}</td>
                        {c('categoria') && <td><TipologiaChip t={o.tipologia} /></td>}
                        {escopo === 'luan' && <td>{o.responsavel === 'luan' ? <span className="chip chip-v !h-[22px]">Meu</span> : <span className="chip chip-rt !h-[22px]">Participação RT</span>}</td>}
                        {c('tecnico') && <td className="whitespace-nowrap text-[12.5px]"><span className="flex items-center gap-2"><Avatar resp={o.responsavel} size={20} />{config.responsaveis[o.responsavel].curto}</span></td>}
                        {c('telefone') && <td onClick={(e) => e.stopPropagation()}>{o.telefone ? <button className="tnum text-[12.5px] hover:text-[var(--verde-valor)]" title="Clique para copiar" onClick={() => copiarComAviso(o.telefone, 'Telefone copiado')}>{o.telefone}</button> : <span className="text-muted">-</span>}</td>}
                        {c('endereco') && <td onClick={(e) => e.stopPropagation()} className="max-w-[230px]"><button className="text-[12.5px] truncate max-w-[230px] block text-left hover:text-[var(--verde-valor)]" title={`${enderecoCompleto(o)} (clique para copiar)`} onClick={() => copiarComAviso(enderecoCompleto(o), 'Endereço copiado')}>{enderecoCompleto(o)}</button></td>}
                        {c('polo') && <td className="text-[12.5px]">{poloDe(o.endereco.cidade)}</td>}
                        {c('conclusao') && <td className="tnum text-[12.5px] whitespace-nowrap">{estaFinalizada(o) && o.concluidaEm ? dataMedia(o.concluidaEm) : <span className="text-muted">—</span>}</td>}
                        <td className="text-right tnum">{brl(o.valorServico)}</td>
                        {c('deslocamento') && <td className="text-right tnum text-muted">{brl(o.valorDeslocamento)}</td>}
                        <td className="text-right tnum font-bold">{brl(valorTotal(o))}</td>
                        {c('parte') && <td className="text-right tnum font-semibold text-[var(--verde-valor)]">{brl(parte(o))}</td>}
                        <td><span className={clsx('chip', S.cls)}>{S.icon}{S.label}</span></td>
                        <td className="text-center" onClick={(e) => e.stopPropagation()}>
                          <button className="btn btn-ghost btn-icon" title="Copiar texto pronto" aria-label="Copiar texto pronto" onClick={() => copiarComAviso(textoPronto(o, config.contrato.rrt), 'Texto pronto copiado')}><ClipboardCopy size={15} strokeWidth={1.75} /></button>
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          {!concluida ? <span className="text-muted text-[12px]">—</span> : o.faturada
                            ? <button className="chip chip-v" title="Clique para desmarcar" onClick={() => marcarFaturada(o.id, false)}><Check size={13} />Faturada</button>
                            : <button className="btn btn-secondary btn-sm !h-[26px]" onClick={() => marcarFaturada(o.id, true)}><Receipt size={13} /> Marcar</button>}
                        </td>
                        <td onClick={(e) => e.stopPropagation()} className="whitespace-nowrap text-right pr-3">
                          <Link to={`/os/${o.id}`} className="btn btn-ghost btn-icon" aria-label="Abrir O.S." title="Abrir O.S."><FileText size={15} strokeWidth={1.75} /></Link>
                          <span className="relative inline-block" data-menu>
                            <button className="btn btn-ghost btn-icon" aria-label="Mais ações" onClick={() => setMenu(menu === o.id ? null : o.id)}><Ellipsis size={16} /></button>
                            {menu === o.id && (
                              <div className="menu-flut right-0 top-9 text-left">
                                <button onClick={() => nav(`/os/${o.id}`)}><FileText /> Abrir O.S.</button>
                                <button onClick={async () => { setMenu(null); await copiarComAviso(o.referencia, 'Número copiado') }}><Copy /> Copiar número da O.S.</button>
                                <button onClick={async () => { setMenu(null); await copiarComAviso(textoPronto(o, config.contrato.rrt), 'Texto pronto copiado') }}><ClipboardCopy /> Copiar texto pronto</button>
                              </div>
                            )}
                          </span>
                        </td>
                      </tr>
                      {exp && (
                        <tr className="!cursor-default">
                          <td />
                          <td colSpan={nCols - 1} className="!bg-surface-2">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-[13px] py-1">
                              <Det l="Endereço" v={enderecoLinha(o)} />
                              <Det l="Categoria" v={`${o.tipologia} · ${TIPOLOGIAS[o.tipologia]}`} />
                              <Det l="Recebimento · prazo" v={`${dataMedia(o.emissao)} · ${dataMedia(o.prazo)}`} />
                              <Det l="Entrega do laudo" v={o.entregaEm ? dataMedia(o.entregaEm) : '—'} />
                              <Det l="Técnico" v={`${config.responsaveis[o.responsavel].nome}${config.responsaveis[o.responsavel].registro ? ' · ' + config.responsaveis[o.responsavel].registro : ''}`} />
                              <Det l="Polo" v={poloDe(o.endereco.cidade)} />
                              <Det l={o.responsavel === 'rt' ? `Sua parte (${repTxt})` : 'Sua parte'} v={brl(parte(o))} />
                              <Det l="Nota fiscal" v={o.faturada ? `faturada em ${o.faturadaEm ? dataMedia(o.faturadaEm) : '—'}` : concluida ? 'a faturar' : 'O.S. em aberto'} />
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="font-semibold">
                  <td colSpan={antesDoTotal} className="!bg-surface-2 card-tit">{linhas.length} O.S. · total do filtro</td>
                  <td className="!bg-surface-2 text-right tnum">{brl(somaTotal)}</td>
                  {c('parte') && <td className="!bg-surface-2 text-right tnum text-[var(--verde-valor)]">{brl(somaParte)}</td>}
                  <td colSpan={4} className="!bg-surface-2" />
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-t border-border text-[12.5px] text-muted">
            <span>{ordenadas.length} registros · Página {pag + 1} de {paginas}</span>
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

function Det({ l, v }: { l: string; v: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] uppercase tracking-[.06em] text-muted font-bold">{l}</div>
      <div className="truncate" title={v}>{v}</div>
    </div>
  )
}
