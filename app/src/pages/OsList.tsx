import clsx from 'clsx'
import { format, parseISO, startOfMonth } from 'date-fns'
import { CalendarCheck, CalendarDays, Check, ChevronDown, CircleCheck, ChevronUp, Clock, SlidersHorizontal, Ellipsis, Eye, Kanban as IconeKanban, List, MapPin, PauseCircle, Pencil, Plus, Sparkles, Tag, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ConfirmarEtapa } from '../components/ConfirmarEtapa'
import { NovaOS } from '../components/NovaOS'
import { OsForm } from '../components/OsForm'
import { PausarOS } from '../components/PausarOS'
import { AcaoPept } from '../components/PeptJanelas'
import { FarolChip, FiltroPeriodo, Modal, MultiSelect, StatusChip, TipologiaChip, useFora } from '../components/ui'
import { DetalheOS } from './OsDetail'
import { intervalo, noPeriodoComPendencias, valorTotal, type Periodo } from '../lib/faturamento'
import { PEPT_LIMITE, prazoIndeterminado, POLOS, TIPOLOGIA_ORDEM, brl, codigoOS, dataMedia, farolDe, poloDe, prazoAtual, pausaValida, temCoordenada } from '../lib/os'
import { FASES, PASSOS, PASSO_LABEL, corPrazo, estadoPassos, faseDe, passosDaOS, proximoPasso, type Fase } from '../lib/passos'
import { CORES_COLUNA, KANBAN_PADRAO, acaoAoSoltar, colunaDaOS, corColuna, tituloColuna, tituloPadrao } from '../lib/kanban'
import { filtrarEscopo, useStore } from '../store/useStore'
import type { KanbanColuna, OS, PassoKey, Status, Tipologia } from '../types'

type Visao = 'lista' | 'kanban'
type FiltroFase = 'todas' | Exclude<Fase, 'cancelada'>
const POR_PAG = 15
const hojeStr = () => format(new Date(), 'yyyy-MM-dd')
// Links antigos (/os?status=recebida) continuam funcionando.
const FASE_DO_STATUS: Record<string, FiltroFase> = { recebida: 'aberto', em_andamento: 'andamento', concluida: 'finalizada' }
const COR_FASE: Record<Exclude<Fase, 'cancelada'>, string> = { aberto: 'var(--laranja)', andamento: 'var(--azul)', pept: 'var(--rt)', finalizada: 'var(--brand)' }

/**
 * Ordens de Serviço no conceito do Início: as fases do credenciado (em aberto, em andamento, em PEPT,
 * finalizadas), o passo a passo de cada O.S. e o botão do próximo passo, em lista ou Kanban.
 */
export function OsList() {
  const todas = useStore((s) => s.os)
  const escopo = useStore((s) => s.escopo)
  const config = useStore((s) => s.config)
  const { id: abertaId } = useParams()
  const [sp, setSp] = useSearchParams()
  const nav = useNavigate()

  const visao: Visao = sp.get('visao') === 'lista' ? 'lista' : 'kanban' // padrão: Kanban
  const q = sp.get('q') ?? ''
  const dia = sp.get('dia') ?? ''
  const origem = sp.get('origem') ?? ''
  const [fase, setFase] = useState<FiltroFase>(() => (sp.get('fase') as FiltroFase) || FASE_DO_STATUS[sp.get('status') ?? ''] || 'todas')
  const [tipologias, setTipologias] = useState<Tipologia[]>([])
  const [polos, setPolos] = useState<string[]>([])
  const [periodo, setPeriodo] = useState<Periodo>(() => (sp.get('periodo') as Periodo) || 'mes') // ?periodo=todos vem dos cartões do Início
  // Vindo de um cartão do Início (?fase=…&periodo=…) com a tela já aberta: a fase e o período seguem o endereço.
  const faseUrl = sp.get('fase'), statusUrl = sp.get('status'), periodoUrl = sp.get('periodo')
  useEffect(() => {
    setFase((faseUrl as FiltroFase) || FASE_DO_STATUS[statusUrl ?? ''] || 'todas')
    setPeriodo((periodoUrl as Periodo) || 'mes')
  }, [faseUrl, statusUrl, periodoUrl])
  const [ref, setRef] = useState(() => startOfMonth(new Date()))
  const [especifico, setEspecifico] = useState({ ini: '', fim: '' })
  const pendencias = true // O.S. de meses anteriores ainda não finalizadas sempre aparecem
  const [pagina, setPagina] = useState(0)
  const [cols, setCols] = useState<Col[]>(VISIVEIS)
  const [novaOpen, setNovaOpen] = useState(false)
  const [editar, setEditar] = useState<OS | null>(null)
  const [trocar, setTrocar] = useState<{ os: OS; para: Status } | null>(null)
  const [pausando, setPausando] = useState<OS | null>(null)
  const [finalizando, setFinalizando] = useState<{ os: OS; depois: () => void } | null>(null)
  const [concluindo, setConcluindo] = useState<OS | null>(null)

  const setParam = (k: string, v: string) => {
    const n = new URLSearchParams(sp)
    if (v) n.set(k, v); else n.delete(k)
    setSp(n, { replace: true })
    setPagina(0)
  }

  const base = useMemo(() => filtrarEscopo(todas, escopo), [todas, escopo])
  const { ini, fim } = intervalo(periodo, ref, especifico)

  // Tudo que passa nos filtros (menos a fase); a fase separa depois, para as abas mostrarem as contagens.
  const filtradas = useMemo(() => {
    const t = q.trim().toLowerCase()
    return base
      .filter((o) => !tipologias.length || tipologias.includes(o.tipologia))
      .filter((o) => !polos.length || polos.includes(poloDe(o.endereco.cidade)))
      .filter((o) => !origem || o.origem === origem)
      .filter((o) => (dia ? prazoAtual(o) === dia || o.vistoria?.data === dia : faseDe(o) === 'pept' || noPeriodoComPendencias(o, ini, fim, pendencias)))
      // (as em PEPT sempre aparecem: a pausa empurra o prazo e elas não podem sumir da tela)
      .filter((o) => !t || [o.referencia, codigoOS(o), o.proponente, o.contato, config.responsaveis[o.responsavel].nome, o.endereco.logradouro, o.endereco.bairro, o.endereco.cidade].join(' ').toLowerCase().includes(t))
      .sort((a, b) => prazoAtual(a).localeCompare(prazoAtual(b)))
  }, [base, tipologias, polos, origem, dia, ini, fim, pendencias, q, config])
  const contagem = useMemo(() => {
    const c = { todas: 0, aberto: 0, andamento: 0, pept: 0, finalizada: 0 } as Record<FiltroFase, number>
    for (const o of filtradas) { const f = faseDe(o); c.todas++; if (f !== 'cancelada') c[f]++ }
    return c
  }, [filtradas])
  // "Todas" = as que ainda não foram finalizadas; as finalizadas ficam na aba delas.
  const lista = fase === 'todas' ? filtradas : filtradas.filter((o) => faseDe(o) === fase)

  const chips: { label: string; limpar: () => void }[] = [
    ...tipologias.map((t) => ({ label: t, limpar: () => setTipologias(tipologias.filter((x) => x !== t)) })),
    ...polos.map((p) => ({ label: p, limpar: () => setPolos(polos.filter((x) => x !== p)) })),
    ...(q ? [{ label: `"${q}"`, limpar: () => setParam('q', '') }] : []),
    ...(dia ? [{ label: `Dia ${dataMedia(dia)}`, limpar: () => setParam('dia', '') }] : []),
    ...(origem ? [{ label: 'Chegaram por e-mail', limpar: () => setParam('origem', '') }] : []),
  ]
  const limparTudo = () => {
    setTipologias([]); setPolos([]); setPagina(0)
    const n = new URLSearchParams(); if (visao === 'lista') n.set('visao', 'lista'); setSp(n, { replace: true })
  }

  const fecharDetalhe = useCallback(() => {
    const n = new URLSearchParams(sp); n.delete('aba')
    nav(`/os${n.toString() ? `?${n}` : ''}`)
  }, [nav, sp])
  const abrir = (o: OS) => nav(`/os/${o.id}${sp.toString() ? `?${sp}` : ''}`)

  return (
    <>
      {/* título no alto; embaixo, na mesma linha: Lista/Kanban à esquerda e os filtros + Nova O.S. à direita (22/10) */}
      <h1 className="text-[26px] font-bold tracking-[-0.03em] leading-tight mb-2">Ordens de Serviço</h1>
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-3">
        <div className="seg seg-baixo" role="group" aria-label="Como ver">
          <button aria-pressed={visao === 'lista'} onClick={() => setParam('visao', 'lista')}><List size={14} />Lista</button>
          <button aria-pressed={visao === 'kanban'} onClick={() => setParam('visao', '')}><IconeKanban size={14} />Kanban</button>
        </div>
        <span className="ml-auto flex flex-wrap items-center justify-end gap-2">
          {/* escolher uma fase mostra as O.S. em Lista (pedido de 23/10) */}
          <MenuFase fase={fase} setFase={(f) => { setFase(f); setPagina(0); if (visao !== 'lista') setParam('visao', 'lista') }} contagem={contagem} />
          <MultiSelect rotuloVazio="Tipologia" icon={<Tag />} largura={140} larguraMenu={190} opcoes={TIPOLOGIA_ORDEM.map((t) => ({ value: t, label: t }))} valor={tipologias} onChange={(v) => { setTipologias(v); setPagina(0) }} />
          <MultiSelect rotuloVazio="Polo" icon={<MapPin />} largura={140} larguraMenu={190} opcoes={Object.keys(POLOS).map((p) => ({ value: p, label: p }))} valor={polos} onChange={(v) => { setPolos(v); setPagina(0) }} />
          <FiltroPeriodo junto periodo={periodo} setPeriodo={(p) => { setPeriodo(p); setPagina(0) }} data={ref} setData={(d) => { setRef(d); setPagina(0) }} especifico={especifico} setEspecifico={setEspecifico} />
          {visao === 'lista'
            ? <SeletorColunas cols={cols} setCols={setCols} />
            : <ColunasKanban colunas={config.kanban} setColunas={(kanban) => useStore.getState().setConfig({ kanban })} />}
          <button className="btn btn-primary !h-9 !rounded-full !px-4" onClick={() => setNovaOpen(true)}><Plus size={16} /> Nova O.S.</button>
        </span>
      </header>
      <NovaOS open={novaOpen} onClose={() => setNovaOpen(false)} />
      {editar && <OsForm open modo={{ tipo: 'editar', os: editar }} onClose={() => setEditar(null)} />}
      {trocar && <ConfirmarEtapa os={trocar.os} para={trocar.para} onClose={() => setTrocar(null)} />}
      {pausando && <PausarOS os={pausando} onClose={() => setPausando(null)} />}
      {finalizando && <AcaoPept os={finalizando.os} modo={finalizando.os.pausadoEm ? 'resolver' : 'finalizar'} depois={finalizando.depois} onClose={() => setFinalizando(null)} />}
      <Modal open={!!concluindo} onClose={() => setConcluindo(null)} title={concluindo ? `Concluir ${codigoOS(concluindo)}?` : ''} width={440}
        footer={<>
          <button className="btn btn-secondary" onClick={() => setConcluindo(null)}>Não</button>
          <button className="btn btn-primary" onClick={() => { if (concluindo) useStore.getState().mudarStatus(concluindo.id, 'concluida'); setConcluindo(null) }}><CircleCheck size={15} /> Concluir O.S.</button>
        </>}>
        {concluindo && <p className="text-[13.5px]"><b>{concluindo.proponente}</b> será finalizada hoje{concluindo.pausadoEm ? ' (a PEPT em curso é encerrada)' : ''} e passa para o Financeiro como "a faturar".</p>}
      </Modal>
      {abertaId && <DetalheOS id={abertaId} abaInicial={((sp.get('aba') === 'datas' ? 'vistoria' : sp.get('aba')) as 'vistoria' | null) ?? undefined} onClose={fecharDetalhe} />}

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {chips.map((c) => (
            <span key={c.label} className="chip chip-v !h-[26px] !pr-1.5">{c.label}<button className="rounded-full hover:bg-black/10 p-0.5" aria-label={`Remover filtro ${c.label}`} onClick={c.limpar}><X size={12} /></button></span>
          ))}
          <button className="text-[12.5px] font-semibold text-muted hover:text-[var(--vermelho)] ml-1" onClick={limparTudo}>Limpar filtros</button>
        </div>
      )}

      {visao === 'lista'
        ? <Lista lista={lista} cols={cols} pagina={pagina} setPagina={setPagina} abrir={abrir} editar={setEditar} />
        : <KanbanOS lista={lista} colunas={config.kanban} abrir={abrir} concluir={setConcluindo} soltar={(o, destino, origem) => {
          const a = acaoAoSoltar(o, destino, origem)
          if (a.tipo === 'nada') return
          // soltar na coluna PEPT pede o motivo e o dia (a mesma janela de "Pausar"); ao pausar, o cartão vai para lá
          if (a.tipo === 'pausar') { setPausando(o); return }
          const terminar = () => {
            const st = useStore.getState()
            if ((o.colunaLivre ?? null) !== a.colunaLivre) st.colocarNaColunaLivre(o.id, a.colunaLivre, tituloColuna(destino))
            // no Kanban a O.S. muda de coluna livremente (sem confirmação); só cancelar pede confirmação
            if (a.status) {
              if (a.status === 'cancelada') setTrocar({ os: o, para: a.status })
              else st.mudarStatus(o.id, a.status)
            }
          }
          // tirou da coluna PEPT: abre a tela da PEPT (cliente resolveu / finalizar / reabrir, com a data); depois termina de mover
          if (a.retomar) setFinalizando({ os: o, depois: terminar })
          else terminar()
        }} />}
    </>
  )
}

/** Trilha curtinha dos passos: feitos em verde, o atual em destaque, os próximos apagados. */
function Trilha({ os: o }: { os: OS }) {
  const h = hojeStr()
  const est = estadoPassos(o, h)
  const prox = proximoPasso(o, h)
  return (
    <span className="flex gap-[3px]" title={`${prox.feitos} de ${prox.total} passos feitos`}>
      {passosDaOS(o).filter((p) => !p.opcional).map((p) => (
        <span key={p.key} title={p.label} className={clsx('h-1.5 flex-1 min-w-[8px] rounded-full',
          p.key === prox.key ? 'bg-[var(--laranja)]' : est[p.key].estado === 'pendente' ? 'bg-[var(--seg)]' : 'bg-[var(--brand)]')} />
      ))}
    </span>
  )
}

/** Prazo ou pausa da O.S., em um selo só. */
function SeloPrazo({ os: o, className }: { os: OS; className?: string }) {
  if (o.pausadoEm && o.status !== 'concluida') {
    const d = Math.max(0, Math.round((Date.now() - parseISO(o.pausadoEm).getTime()) / 864e5))
    const lim = PEPT_LIMITE[o.tipologia]
    const dica = prazoIndeterminado(o) ? 'Prazo indeterminado enquanto a PEPT não for resolvida' : lim ? `A PEPT segura o prazo por no máximo ${lim} dias` : 'Os dias parados empurram o prazo'
    return <span className={clsx('chip farol-pausa !h-[22px] tnum', className)} title={dica}><PauseCircle size={12} />PEPT há {d} {d === 1 ? 'dia' : 'dias'}{prazoIndeterminado(o) ? ' · sem prazo' : lim ? ` · máx. ${lim}` : ''}</span>
  }
  if (o.status === 'concluida') return <span className={clsx('chip chip-v !h-[22px] tnum', className)}><Check size={12} />{o.concluidaEm ? dataMedia(o.concluidaEm) : 'finalizada'}</span>
  return <FarolChip os={o} className={clsx('!h-[22px]', className)} />
}


function AcoesOS({ os, abrir, editar }: { os: OS; abrir: (o: OS) => void; editar: (o: OS) => void }) {
  const removerOS = useStore((s) => s.removerOS)
  const [aberto, setAberto] = useState(false)
  const [confirma, setConfirma] = useState(false)
  const ref = useFora<HTMLDivElement>(aberto, () => { setAberto(false); setConfirma(false) })
  return (
    <div className="relative inline-block" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button className="btn btn-ghost btn-icon !rounded-full" aria-label={`Ações da OS ${os.referencia}`} onClick={() => setAberto((a) => !a)}><Ellipsis size={16} /></button>
      {aberto && (
        <div className="menu-flut right-0 top-9 text-left z-20">
          {confirma ? (
            <div className="p-2 text-[13px]">
              <p className="mb-2">Excluir {codigoOS(os)} de vez?</p>
              <div className="flex gap-2">
                <button className="!w-auto btn btn-sm !text-white" style={{ background: 'var(--vermelho)' }} onClick={() => removerOS(os.id)}>Excluir</button>
                <button className="!w-auto btn btn-secondary btn-sm" onClick={() => setConfirma(false)}>Não</button>
              </div>
            </div>
          ) : (
            <>
              <button onClick={() => { setAberto(false); abrir(os) }}><Eye /> Ver detalhes</button>
              <button onClick={() => { setAberto(false); editar(os) }}><Pencil /> Editar</button>
              <button className="!text-[var(--vermelho)]" onClick={() => setConfirma(true)}><Trash2 className="!text-[var(--vermelho)]" /> Excluir O.S.</button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// Colunas da lista, as mesmas do sistema real (e o passo atual, que é do laboratório).
type Col = 'os' | 'numero' | 'tipologia' | 'status' | 'passo' | 'rua' | 'nEnd' | 'bairro' | 'cidade' | 'uf' | 'cep' | 'polo' | 'local' | 'valor' | 'desloc' | 'total' | 'prazo' | 'rt'
const COLUNAS: Record<Col, string> = { os: 'OS', numero: 'Nº', tipologia: 'Tipologia', status: 'Status', passo: 'Passo atual', rua: 'Rua', nEnd: 'Nº', bairro: 'Bairro', cidade: 'Cidade', uf: 'UF', cep: 'CEP', polo: 'Polo', local: 'Local', valor: 'Valor OS', desloc: 'Desloc.', total: 'Total', prazo: 'Prazo', rt: 'RT' }
const PADRAO: Col[] = ['os', 'numero', 'tipologia', 'status', 'passo', 'rua', 'nEnd', 'bairro', 'cidade', 'uf', 'cep', 'polo', 'local', 'valor', 'desloc', 'total', 'prazo', 'rt']
// Começam visíveis todas menos o Nº da Caixa (liga em Colunas).
const VISIVEIS: Col[] = PADRAO.filter((c) => c !== 'numero')

function SeletorColunas({ cols, setCols }: { cols: Col[]; setCols: (c: Col[]) => void }) {
  const [aberto, setAberto] = useState(false)
  const ref = useFora<HTMLDivElement>(aberto, () => setAberto(false))
  return (
    <div className="relative" ref={ref}>
      <button className="btn btn-secondary !h-9 !rounded-full" onClick={() => setAberto((a) => !a)}><SlidersHorizontal size={14} /> Colunas</button>
      {aberto && (
        <div className="menu-flut right-0 top-10 !w-[220px] z-30">
          <div className="flex items-center justify-between px-2 py-1.5"><span className="card-tit">Exibir colunas</span><button className="!w-auto !p-0 !bg-transparent text-[12px] font-semibold text-[var(--verde-valor)]" onClick={() => setCols(VISIVEIS)}>Restaurar padrão</button></div>
          {(Object.keys(COLUNAS) as Col[]).map((c) => (
            <label key={c} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-surface-2 text-[13px] cursor-pointer">
              <input type="checkbox" className="accent-[var(--brand)]" checked={cols.includes(c)} onChange={() => setCols(cols.includes(c) ? cols.filter((x) => x !== c) : PADRAO.filter((x) => x === c || cols.includes(x)))} />
              {c === 'nEnd' ? 'Nº (endereço)' : COLUNAS[c]}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

/** Filtro de fase (Todas · Em aberto · Em andamento · Em PEPT · Finalizadas) num menu só, no estilo dos outros filtros. */
function MenuFase({ fase, setFase, contagem }: { fase: FiltroFase; setFase: (f: FiltroFase) => void; contagem: Record<FiltroFase, number> }) {
  const [aberto, setAberto] = useState(false)
  const ref = useFora<HTMLDivElement>(aberto, () => setAberto(false))
  const opcoes: { id: FiltroFase; label: string }[] = [{ id: 'todas', label: 'Todas as fases' }, ...FASES]
  const cor = (f: FiltroFase) => (f === 'todas' ? 'var(--fraco)' : COR_FASE[f])
  return (
    <div className="relative" ref={ref}>
      <button type="button" className={clsx('input flex items-center gap-2 text-left', fase !== 'todas' && '!border-[var(--brand)]')} style={{ width: 180 }} onClick={() => setAberto((a) => !a)} aria-expanded={aberto} aria-label="Fase">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cor(fase) }} />
        <span className="flex-1 truncate">{opcoes.find((f) => f.id === fase)?.label}</span>
        <span className="tnum text-[12px] px-1.5 rounded-full bg-[var(--surface-2)] text-muted">{contagem[fase]}</span>
        <ChevronDown size={14} className="text-muted shrink-0" />
      </button>
      {aberto && (
        <div className="menu-flut left-0 top-[42px] !min-w-[210px]" role="listbox">
          {opcoes.map((f) => (
            <button key={f.id} type="button" role="option" aria-selected={f.id === fase} onClick={() => { setFase(f.id); setAberto(false) }}
              className={clsx('flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-md text-[13px] hover:bg-surface-2', f.id === fase && 'font-semibold text-[var(--verde-valor)]')}>
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cor(f.id) }} />
              <span className="flex-1">{f.label}</span>
              <span className="tnum text-[12px] px-1.5 rounded-full bg-[var(--surface-2)] text-muted">{contagem[f.id]}</span>
              <Check size={14} className={f.id === fase ? '' : 'invisible'} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * "Colunas" do Kanban: mostrar/esconder, renomear e mudar a ordem; criar coluna livre (arrastar cartões para ela)
 * ou por passo (junta sozinha as O.S. naquele passo). Vale na hora e fica salvo nas Configurações (vai no backup).
 */
function ColunasKanban({ colunas, setColunas }: { colunas: KanbanColuna[]; setColunas: (c: KanbanColuna[]) => void }) {
  const [aberto, setAberto] = useState(false)
  const [tipo, setTipo] = useState<'livre' | 'passo'>('livre')
  const [nome, setNome] = useState('')
  const [passo, setPasso] = useState<PassoKey>('marcar_vistoria')
  const [cor, setCor] = useState(CORES_COLUNA[0])
  const mudar = (i: number, patch: Partial<KanbanColuna>) => setColunas(colunas.map((c, j) => (j === i ? ({ ...c, ...patch } as KanbanColuna) : c)))
  const mover = (i: number, d: number) => {
    const j = i + d
    if (j < 0 || j >= colunas.length) return
    const n = [...colunas];[n[i], n[j]] = [n[j], n[i]]
    setColunas(n)
  }
  const adicionar = () => {
    const id = `${tipo}-${Date.now().toString(36)}`
    const t = nome.trim()
    setColunas([...colunas, tipo === 'livre' ? { id, tipo, titulo: t, cor } : { id, tipo, passo, cor, ...(t ? { titulo: t } : {}) }])
    setNome('')
  }
  // um passo só pode ter uma coluna (a O.S. só aparece numa delas)
  const passoUsado = colunas.some((c) => c.tipo === 'passo' && c.passo === passo)
  const tipoTxt = (c: KanbanColuna) => (c.tipo === 'livre' ? 'Livre' : c.tipo === 'passo' ? 'Por passo' : c.etapa === 'pept' ? 'PEPT' : 'Etapa')
  return (
    <>
      <button className="btn btn-secondary !h-9 !rounded-full" onClick={() => setAberto(true)}><SlidersHorizontal size={14} /> Colunas</button>
      <Modal open={aberto} onClose={() => setAberto(false)} title="Colunas do Kanban" width={600}
        footer={<>
          <button className="btn btn-ghost mr-auto" onClick={() => setColunas(KANBAN_PADRAO.map((c) => ({ ...c })))}>Restaurar padrão</button>
          <button className="btn btn-primary" onClick={() => setAberto(false)}>Pronto</button>
        </>}>
        <p className="text-[12.5px] text-muted mb-3">Marque para mostrar, escreva para renomear e use as setas para mudar a ordem. Vale na hora.</p>
        <div className="flex flex-col gap-1.5">
          {colunas.map((c, i) => (
            <div key={c.id} className={clsx('flex items-center gap-2 rounded-xl border border-border bg-[var(--surface)] pl-1.5 pr-1 py-1', c.oculta && 'opacity-60')}>
              <span className="flex flex-col">
                <button type="button" className="text-muted hover:text-[var(--text)] disabled:opacity-25 leading-none" disabled={i === 0} onClick={() => mover(i, -1)} aria-label="Subir"><ChevronUp size={15} /></button>
                <button type="button" className="text-muted hover:text-[var(--text)] disabled:opacity-25 leading-none" disabled={i === colunas.length - 1} onClick={() => mover(i, 1)} aria-label="Descer"><ChevronDown size={15} /></button>
              </span>
              <input type="checkbox" className="accent-[var(--brand)] w-4 h-4 shrink-0" checked={!c.oculta} onChange={() => mudar(i, { oculta: !c.oculta })} title={c.oculta ? 'Mostrar no Kanban' : 'Esconder do Kanban'} aria-label={`Mostrar ${tituloColuna(c)}`} />
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: corColuna(c) }} />
              <input className="input !h-8 flex-1 min-w-0" value={c.titulo ?? ''} placeholder={tituloPadrao(c)} onChange={(e) => mudar(i, { titulo: e.target.value })} aria-label="Nome da coluna" />
              <span className="text-[11px] font-semibold text-muted w-[62px] text-center shrink-0">{tipoTxt(c)}</span>
              {c.tipo !== 'etapa'
                ? <button type="button" className="btn btn-ghost btn-icon shrink-0" onClick={() => setColunas(colunas.filter((_, j) => j !== i))} aria-label={`Excluir ${tituloColuna(c)}`} title="Excluir coluna (os cartões voltam para a coluna da etapa)"><Trash2 size={14} /></button>
                : <span className="w-9 shrink-0" />}
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-border p-3">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="card-tit mr-auto">Nova coluna</span>
            <div className="seg seg-baixo" role="group" aria-label="Tipo da coluna">
              <button type="button" aria-pressed={tipo === 'livre'} onClick={() => setTipo('livre')}>Livre</button>
              <button type="button" aria-pressed={tipo === 'passo'} onClick={() => setTipo('passo')}>Por passo</button>
            </div>
          </div>
          <p className="text-[12px] text-muted mb-2.5">{tipo === 'livre' ? 'Você arrasta os cartões para ela; a etapa da O.S. não muda. Tirando o cartão de lá, ele volta para a coluna da etapa.' : 'Junta sozinha as O.S. que estão neste passo do serviço (não dá para arrastar para ela).'}</p>
          {tipo === 'passo' && (
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {PASSOS.filter((p) => p.key !== 'recebida').map((p) => {
                const ja = colunas.some((c) => c.tipo === 'passo' && c.passo === p.key)
                return (
                  <button key={p.key} type="button" onClick={() => setPasso(p.key)} title={ja ? 'Já existe uma coluna para este passo' : undefined}
                    className={clsx('h-7 px-2.5 rounded-full text-[12px] font-semibold border transition', passo === p.key ? 'bg-[var(--brand)] text-white border-[var(--brand)]' : 'border-border text-muted hover:text-[var(--text)]', ja && 'line-through opacity-60')}>{p.label}</button>
                )
              })}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <input className="input !h-9 flex-1 min-w-[180px]" value={nome} onChange={(e) => setNome(e.target.value)} placeholder={tipo === 'livre' ? 'Nome (ex.: Aguardando cliente)' : `Nome (se vazio: ${PASSO_LABEL[passo]})`} aria-label="Nome da nova coluna"
              onKeyDown={(e) => { if (e.key === 'Enter' && (tipo === 'passo' ? !passoUsado : nome.trim())) adicionar() }} />
            <span className="flex gap-1" role="group" aria-label="Cor">
              {CORES_COLUNA.map((k) => (
                <button key={k} type="button" onClick={() => setCor(k)} aria-label={`Cor ${k}`} aria-pressed={cor === k}
                  className={clsx('w-5 h-5 rounded-full border-2', cor === k ? 'border-[var(--text)]' : 'border-transparent')} style={{ background: k }} />
              ))}
            </span>
            <button type="button" className="btn btn-primary !h-9" disabled={tipo === 'livre' ? !nome.trim() : passoUsado} onClick={adicionar}><Plus size={14} /> Adicionar</button>
          </div>
        </div>
      </Modal>
    </>
  )
}

/** Lista compacta com as colunas do sistema real; a faixinha à esquerda é a cor da fase. */
function Lista({ lista, cols, pagina, setPagina, abrir, editar }: { lista: OS[]; cols: Col[]; pagina: number; setPagina: (p: number) => void; abrir: (o: OS) => void; editar: (o: OS) => void }) {
  const config = useStore((s) => s.config)
  const total = Math.max(1, Math.ceil(lista.length / POR_PAG))
  const pag = Math.min(pagina, total - 1)
  const itens = lista.slice(pag * POR_PAG, pag * POR_PAG + POR_PAG)
  const h = hojeStr()
  const c = (k: Col) => cols.includes(k)
  if (!lista.length) return <section className="bloco p-10 text-center"><p className="font-semibold">Nenhuma O.S. aqui.</p><p className="text-[13px] text-muted mt-1">Troque a fase, o período ou os filtros.</p></section>
  const th = 'px-2.5 py-2 text-left text-[11px] font-bold uppercase tracking-[.05em] text-muted whitespace-nowrap'
  const td = 'px-2.5 py-2 align-middle'
  return (
    <section className="bloco overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px] border-collapse">
          <thead className="border-b border-border">
            <tr>
              <th className="w-1 p-0" />
              {(PADRAO.filter(c) as Col[]).map((k) => <th key={k} className={clsx(th, ['valor', 'desloc', 'total'].includes(k) && 'text-right')}>{COLUNAS[k]}</th>)}
              <th className={th} />
            </tr>
          </thead>
          <tbody>
            {itens.map((o) => {
              const f = faseDe(o)
              const prox = proximoPasso(o, h)
              return (
                <tr key={o.id} onClick={() => abrir(o)} className={clsx('linha-os border-b border-border last:border-b-0 cursor-pointer', corPrazo(o) ? `prazo-${corPrazo(o)}` : 'hover:bg-[rgba(58,184,30,.05)]')}>
                  <td className="p-0 w-1"><span className="block w-1 h-9" style={{ background: f !== 'cancelada' ? COR_FASE[f] : 'var(--fraco)' }} /></td>
                  {c('os') && <td className={clsx(td, 'font-bold whitespace-nowrap tnum')}>{codigoOS(o)}</td>}
                  {c('numero') && <td className={clsx(td, 'tnum whitespace-nowrap text-muted')}>{o.referencia}</td>}
                  {c('tipologia') && <td className={td}><TipologiaChip t={o.tipologia} className="!h-[20px] !text-[10.5px] !px-1.5" /></td>}
                  {c('status') && <td className={td}><StatusChip status={o.status} className="!h-[22px] whitespace-nowrap" /></td>}
                  {c('passo') && <td className={clsx(td, 'min-w-[150px]')}>{o.status === 'concluida' ? <span className="text-muted">Enviada</span> : o.pausadoEm ? <span className="text-[var(--azul)] font-semibold">Em PEPT</span> : <><span className="block whitespace-nowrap">{prox.label}</span><span className="flex items-center gap-1.5 mt-0.5"><Trilha os={o} /><span className="text-[10.5px] text-muted tnum">{prox.feitos}/{prox.total}</span></span></>}</td>}
                  {c('rua') && <td className={clsx(td, 'max-w-[170px] truncate')} title={o.endereco.logradouro}>{o.endereco.logradouro}</td>}
                  {c('nEnd') && <td className={clsx(td, 'tnum')}>{o.endereco.numero}</td>}
                  {c('bairro') && <td className={clsx(td, 'max-w-[150px] truncate')} title={o.endereco.bairro}>{o.endereco.bairro}</td>}
                  {c('cidade') && <td className={clsx(td, 'whitespace-nowrap')}>{o.endereco.cidade}</td>}
                  {c('uf') && <td className={td}>{o.endereco.uf}</td>}
                  {c('cep') && <td className={clsx(td, 'tnum whitespace-nowrap')}>{o.endereco.cep}</td>}
                  {c('polo') && <td className={clsx(td, 'whitespace-nowrap')}>{poloDe(o.endereco.cidade)}</td>}
                  {c('local') && <td className={clsx(td, 'text-center')} title={temCoordenada(o) ? 'Com localização' : 'Sem localização'}>{temCoordenada(o) ? <MapPin size={14} className="inline text-[var(--verde-valor)]" /> : <span className="text-muted">—</span>}</td>}
                  {c('valor') && <td className={clsx(td, 'tnum text-right whitespace-nowrap')}>{brl(o.valorServico)}</td>}
                  {c('desloc') && <td className={clsx(td, 'tnum text-right whitespace-nowrap text-muted')}>{brl(o.valorDeslocamento)}</td>}
                  {c('total') && <td className={clsx(td, 'tnum text-right whitespace-nowrap font-bold')}>{brl(valorTotal(o))}</td>}
                  {c('prazo') && <td className={td}><SeloPrazo os={o} className="whitespace-nowrap" /></td>}
                  {c('rt') && <td className={clsx(td, 'whitespace-nowrap')}>{config.responsaveis[o.responsavel].curto}</td>}
                  <td className={clsx(td, 'text-right w-10')}><AcoesOS os={o} abrir={abrir} editar={editar} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <footer className="flex items-center justify-between px-5 py-2.5 border-t border-border text-[12.5px] text-muted">
        <span>{lista.length} registros · página {pag + 1} de {total}</span>
        <span className="flex gap-2">
          <button className="btn btn-secondary btn-sm !rounded-full" disabled={pag === 0} onClick={() => setPagina(pag - 1)}>Anterior</button>
          <button className="btn btn-secondary btn-sm !rounded-full" disabled={pag >= total - 1} onClick={() => setPagina(pag + 1)}>Próxima</button>
        </span>
      </footer>
    </section>
  )
}

// Cor da faixa lateral do cartão, a mesma regra de cor da lista (corPrazo).
const FAIXA_PRAZO: Record<string, string> = { amarelo: '#eab308', vermelho: '#ef4444', cinza: '#9ca3af', verde: '#22c55e' }

/** Selo do cartão com as palavras do sistema real (Vencida, Urgente, Atenção, No prazo, PEPT) e a cor do prazo. */
function seloKanban(o: OS): { txt: string; cls: string } | null {
  if (o.status === 'cancelada') return null
  if (o.status === 'concluida') return { txt: 'Concluída', cls: 'chip-v' }
  if (o.pausadoEm) {
    const d = Math.max(0, Math.round((Date.now() - parseISO(o.pausadoEm).getTime()) / 864e5))
    return { txt: `PEPT · ${d}d`, cls: 'bg-[var(--seg)] text-muted' }
  }
  // PEPT resolvida pelo cliente, esperando validar ou reabrir (o prazo já está contando)
  if (faseDe(o) === 'pept') return { txt: 'PEPT · em análise', cls: 'chip-v' }
  // Mesma regra de cor da lista (corPrazo): amarela com 3 dias ou menos, vermelha com 1 dia ou menos e vencida.
  const cor = corPrazo(o)
  if (cor === 'vermelho') return { txt: (farolDe(o).dias ?? 0) < 0 ? 'Vencida' : 'Urgente', cls: 'chip-r' }
  if (cor === 'amarelo') return { txt: 'Atenção', cls: 'chip-l' }
  return null // no prazo: sem selo (pedido do usuário)
}

/** Caixinha "Prazo" do rodapé: texto e cor pela regra de cor do prazo (corPrazo). */
function prazoKanban(o: OS): { txt: string; cls: string } {
  const cor = corPrazo(o)
  const d = farolDe(o).dias
  // PEPT aberta depois de 2 dias do recebimento não pausa: mostra os dias que faltam, como sem PEPT
  const txt = o.status === 'cancelada' ? '—' : o.status === 'concluida' ? 'Concluída' : o.pausadoEm && pausaValida(o) ? 'Pausada'
    : d === null ? '—' : d < 0 ? `Vencida ${-d}d` : d === 0 ? 'Hoje' : d === 1 ? 'Amanhã' : `${d} dias`
  const cls = cor === 'vermelho' ? 'chip-r' : cor === 'amarelo' ? 'chip-l' : cor === 'verde' ? 'chip-v' : cor === 'cinza' ? 'bg-[var(--seg)] text-muted' : 'bg-[var(--surface-2)]'
  return { txt, cls }
}

/**
 * Kanban: as colunas vêm de Configurações → "Colunas" (etapas do sistema real + PEPT, colunas livres e colunas por
 * passo). Cartões simples, sempre na mesma ordem. Soltar o cartão numa coluna segue `acaoAoSoltar` (lib/kanban).
 */
function KanbanOS({ lista, colunas, abrir, concluir, soltar }: { lista: OS[]; colunas: KanbanColuna[]; abrir: (o: OS) => void; concluir: (o: OS) => void; soltar: (o: OS, destino: KanbanColuna, origem: KanbanColuna | undefined) => void }) {
  const [sobre, setSobre] = useState<string | null>(null)
  // Todas as colunas vão até o rodapé da tela (mesma altura, mesmo vazias); os cartões rolam dentro de cada coluna.
  const caixa = useRef<HTMLDivElement>(null)
  const [altura, setAltura] = useState<number>()
  useLayoutEffect(() => {
    const medir = () => {
      if (!caixa.current) return
      const rodape = window.innerWidth < 768 ? 88 : 16 // no celular há a barra de baixo
      setAltura(Math.max(320, window.innerHeight - caixa.current.getBoundingClientRect().top - rodape))
    }
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  })
  const visiveis = colunas.filter((c) => !c.oculta)
  const h = hojeStr()
  const daOS = useMemo(() => new Map(lista.map((o) => [o.id, colunaDaOS(o, colunas, h)])), [lista, colunas, h])
  return (
    <div ref={caixa} className="flex gap-3 overflow-x-auto pb-2 items-stretch" style={{ height: altura }}>
      {visiveis.length === 0 && <p className="text-[13px] text-muted py-10">Nenhuma coluna à mostra. Ligue as colunas em <b>Colunas</b>.</p>}
      {visiveis.map((c) => {
        const id = c.id
        const itens = lista.filter((o) => daOS.get(o.id) === id)
        const auto = c.tipo === 'passo'
        return (
          // todas as colunas aceitam o cartão: as O.S. mudam de coluna livremente
          <section key={id} onDragOver={(e) => { e.preventDefault(); setSobre(id) }} onDragLeave={() => setSobre(null)}
            onDrop={(e) => { e.preventDefault(); setSobre(null); const o = lista.find((x) => x.id === e.dataTransfer.getData('text/os')); if (o) soltar(o, c, colunas.find((x) => x.id === daOS.get(o.id))) }}
            className={clsx('w-[300px] shrink-0 rounded-[18px] flex flex-col h-full min-h-0 border transition overflow-hidden',
              sobre === id ? 'border-[var(--brand)] bg-[var(--brand-soft)]' : 'border-[var(--kb-col-borda)] bg-[var(--kb-col)]')}>
            <header className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0" title={auto ? 'Coluna por passo: junta sozinha as O.S. que estão neste passo (e as que você arrastar para cá)' : c.tipo === 'livre' ? 'Coluna livre: arraste os cartões para cá (a etapa não muda)' : undefined}>
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: corColuna(c) }} />
              <h2 className="font-bold text-[14px] truncate">{tituloColuna(c)}</h2>
              {auto && <Sparkles size={13} className="text-muted shrink-0" />}
              <span className="ml-auto text-[12px] font-bold tnum min-w-[26px] text-center px-2 py-0.5 rounded-full bg-[var(--surface)] text-muted">{itens.length}</span>
            </header>
            <div className="flex flex-col gap-2 p-2.5 overflow-y-auto flex-1 min-h-0">
              {itens.length === 0 && <p className="text-[12.5px] text-muted text-center py-8">Nenhuma O.S.</p>}
              {itens.map((o) => {
                const sl = seloKanban(o)
                const pz = prazoKanban(o)
                const faixa = FAIXA_PRAZO[corPrazo(o) ?? ''] ?? 'transparent'
                return (
                  <article key={o.id} draggable onDragStart={(e) => e.dataTransfer.setData('text/os', o.id)} onClick={() => abrir(o)}
                    className={clsx("bloco card-kanban !rounded-[16px] relative overflow-hidden shrink-0 px-3 py-2.5 cursor-pointer active:cursor-grabbing", o.status === "concluida" ? "card-finalizada" : corPrazo(o) && `prazo-${corPrazo(o)}`)}>
                    <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: faixa }} />
                    <div className="flex items-center gap-2">
                      {/* número da O.S. primeiro, tipologia depois (pedido em 22/10) */}
                      <b className="text-[13px] tnum px-2 h-[22px] inline-flex items-center rounded-md bg-[var(--surface-2)]">{codigoOS(o)}</b>
                      <span className="w-px h-4 bg-[var(--border)]" />
                      <TipologiaChip t={o.tipologia} className="!h-[22px] !text-[11.5px] !px-2" />
                      <span className="ml-auto flex items-center gap-0.5">
                        {sl && <span className={clsx('chip !h-[22px] !text-[11px] !px-2', sl.cls)}>{sl.txt}</span>}
                        {/* concluir a O.S. direto do cartão (pede confirmação); no lugar do menu de três pontinhos */}
                        {o.status !== 'concluida' && o.status !== 'cancelada' && (
                          <button type="button" className="concluir-kanban shrink-0 h-[22px] px-2 rounded-full text-[11px] font-semibold" title="Concluir O.S." aria-label={`Concluir ${codigoOS(o)}`}
                            draggable={false} onClick={(e) => { e.stopPropagation(); concluir(o) }}>Concluir</button>
                        )}
                      </span>
                    </div>
                    <div className="font-mono text-[11px] leading-tight text-muted tnum truncate mt-1.5" title={o.referencia}>{o.referencia}</div>
                    <div className="text-[14px] font-bold leading-tight mt-1 truncate" title={o.proponente}>{o.proponente}</div>
                    {/* polo em destaque, escrito "Polo"; embaixo a cidade em negrito com a rua e o número na frente */}
                    <div className="mt-1" title={`Polo: ${poloDe(o.endereco.cidade)} · ${o.endereco.cidade} — ${o.endereco.logradouro}, ${o.endereco.numero}`}>
                      <span className="polo-kanban inline-flex items-center gap-1 h-[17px] px-1.5 rounded-[5px] text-[9.5px] font-semibold uppercase tracking-[.04em]">
                        <MapPin size={9} /><span className="opacity-75">Polo</span><b>{poloDe(o.endereco.cidade)}</b>
                      </span>
                      <div className="flex items-center gap-1.5 text-[11.5px] text-muted mt-1 min-w-0 leading-tight">
                        <b className="shrink-0 text-[12px] uppercase tracking-[.03em] cidade-kanban">{o.endereco.cidade}</b>
                        <span className="truncate">· {o.endereco.logradouro}, {o.endereco.numero}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1 mt-1.5 text-center">
                      <div className={clsx('rounded-[9px] px-1 py-[3px]', pz.cls)}>
                        <div className="flex items-center justify-center gap-1 text-[10px] leading-tight opacity-80"><Clock size={10} />Prazo</div>
                        <div className="text-[12px] font-bold tnum whitespace-nowrap leading-tight">{pz.txt}</div>
                      </div>
                      <div className="rounded-[9px] px-1 py-[3px] bg-[var(--surface-2)]">
                        <div className="flex items-center justify-center gap-1 text-[10px] leading-tight text-muted"><CalendarDays size={10} />Recebida</div>
                        <div className="text-[12px] font-bold tnum leading-tight" title={dataMedia(o.emissao)}>{dataMedia(o.emissao).slice(0, 5)}</div>
                      </div>
                      <div className="rounded-[9px] px-1 py-[3px] bg-[var(--surface-2)]">
                        <div className="flex items-center justify-center gap-1 text-[10px] leading-tight text-muted"><CalendarCheck size={10} />Vence</div>
                        <div className="text-[12px] font-bold tnum leading-tight" title={prazoIndeterminado(o) ? 'Prazo indeterminado enquanto a PEPT não for resolvida' : dataMedia(prazoAtual(o))}>{prazoIndeterminado(o) ? 'Indeterm.' : dataMedia(prazoAtual(o)).slice(0, 5)}</div>
                      </div>
                    </div>
                    {/* quanto falta para a O.S. ficar pronta (passo a passo) */}
                    {o.status !== 'cancelada' && (() => {
                      const px = proximoPasso(o, hojeStr())
                      const pct = (px.feitos / px.total) * 100
                      return (
                        <div className="mt-1.5" title={px.key ? `Próximo passo: ${px.label}` : 'Todos os passos feitos'}>
                          <div className="flex items-center justify-between gap-2 text-[11.5px] leading-tight">
                            <b className="truncate">{px.key ? px.label : 'Pronta'}</b>
                            <span className="text-muted tnum whitespace-nowrap">{px.feitos} de {px.total}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-black/10 mt-[3px] overflow-hidden"><div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${pct}%`, background: o.status === 'concluida' ? '#fff' : 'var(--brand)' }} /></div>
                        </div>
                      )
                    })()}
                  </article>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
