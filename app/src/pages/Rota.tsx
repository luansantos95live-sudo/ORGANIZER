import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import clsx from 'clsx'
import { addDays, format, isSameMonth, parseISO, startOfMonth } from 'date-fns'
import { CircleAlert, ExternalLink, GripVertical, Home, Lasso, MapPin, MessageCircle, Plus, Route, Sparkles, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MapaOS, type PontoMapa } from '../components/MapaOS'
import { Abas, Avatar, Empty, FiltroPeriodo, Filtro, Info2, Modal, MultiSelect, PageHeader, TipologiaChip } from '../components/ui'
import { intervalo, type Periodo } from '../lib/faturamento'
import { centroDaCidade, codigoOS, dataMedia, enderecoMaps, temCoordenada, telefoneWhats } from '../lib/os'
import { distanciaRota, elegivelParaRota, fmtKm, fmtMin, horariosEstimados, ordemOtimizada, rotaAtiva, toMin } from '../lib/rota'
import { filtrarEscopo, useStore } from '../store/useStore'
import type { OS, Rota, StatusRota } from '../types'

const STATUS_ROTA: Record<StatusRota, { label: string; cls: string }> = {
  rascunho: { label: 'Rascunho', cls: 'status-cancelada !no-underline' },
  confirmada: { label: 'Confirmada', cls: 'status-recebida' },
  concluida: { label: 'Concluída', cls: 'status-concluida' },
  cancelada: { label: 'Cancelada', cls: 'farol-urgent' },
}

const pontoOS = (o: OS) => (temCoordenada(o) ? { lat: o.endereco.lat!, lng: o.endereco.lng! } : undefined)

export function RotasPage() {
  const [sp, setSp] = useSearchParams()
  const aba = sp.get('aba') === 'rotas' ? 'rotas' : 'roteirizador'
  const rotaAberta = sp.get('rota')
  const setParam = (k: string, v: string) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); setSp(n, { replace: true }) }
  const abrirRota = (id: string) => { const n = new URLSearchParams(sp); n.set('aba', 'rotas'); n.set('rota', id); setSp(n, { replace: true }) }

  return (
    <>
      <PageHeader title="Rotas" subtitle="Planeje rotas a partir das OS georreferenciadas" />
      <Abas abas={[{ id: 'roteirizador', label: 'Roteirizador' }, { id: 'rotas', label: 'Rotas' }]} valor={aba} onChange={(v) => setParam('aba', v === 'rotas' ? 'rotas' : '')} />
      {aba === 'roteirizador' ? <Roteirizador onCriada={abrirRota} /> : <ListaRotas abrir={abrirRota} />}
      {rotaAberta && <DetalheRota id={rotaAberta} onClose={() => setParam('rota', '')} />}
    </>
  )
}

// ---------------------------------------------------------------- Roteirizador
function Roteirizador({ onCriada }: { onCriada: (id: string) => void }) {
  const todas = useStore((s) => s.os)
  const rotas = useStore((s) => s.rotas)
  const escopo = useStore((s) => s.escopo)
  const config = useStore((s) => s.config)
  const criarRota = useStore((s) => s.criarRota)
  const [sel, setSel] = useState<string[]>([])
  const [laco, setLaco] = useState<'mais' | 'menos' | null>(null)
  const [semLocal, setSemLocal] = useState(false)
  const [trocarBase, setTrocarBase] = useState(false)
  const [data, setData] = useState(() => format(addDays(new Date(), 1), 'yyyy-MM-dd'))

  // "Mapa das OS sem vistoria": elegíveis e ainda sem vistoria marcada.
  const elegiveis = useMemo(() => filtrarEscopo(todas, escopo).filter((o) => elegivelParaRota(o, rotas) && !o.vistoria), [todas, escopo, rotas])
  const comLocal = elegiveis.filter(temCoordenada)
  const semCoord = elegiveis.filter((o) => !temCoordenada(o))
  const pontos: PontoMapa[] = comLocal.map((o) => ({ id: o.id, lat: o.endereco.lat!, lng: o.endereco.lng!, rotulo: `${codigoOS(o)} · ${o.proponente}`, titulo: `${o.endereco.bairro} · ${o.endereco.cidade}`, selecionado: sel.includes(o.id) }))
  const alternar = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  const porCidade = useMemo(() => {
    const m = new Map<string, OS[]>()
    for (const o of comLocal) m.set(o.endereco.cidade, [...(m.get(o.endereco.cidade) ?? []), o])
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length)
  }, [comLocal])

  const criar = () => {
    const escolhidas = comLocal.filter((o) => sel.includes(o.id))
    const ordem = ordemOtimizada(config.base, escolhidas, pontoOS)
    const id = criarRota(ordem.map((o) => o.id), { data, responsavel: escopo === 'rt' ? 'rt' : 'luan', descricao: [...new Set(ordem.map((o) => o.endereco.cidade))].join(', ') })
    setSel([])
    onCriada(id)
  }

  return (
    <>
      {semCoord.length > 0 && (
        <button className="w-full card faixa-resumo !border-l-[var(--laranja)] px-4 py-2.5 mb-3 flex items-center gap-2 text-left text-[13px]" onClick={() => setSemLocal(true)}>
          <CircleAlert size={16} className="text-[var(--laranja)] shrink-0" />
          <span><b>{semCoord.length} OS sem localização</b> não entram na roteirização. Toque para definir a localização.</span>
        </button>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-3 items-start">
        <section className="card p-3">
          <div className="flex items-center justify-between px-1 mb-2">
            <h3 className="card-tit">OS disponíveis ({comLocal.length})</h3>
            {sel.length > 0 && <button className="text-[12px] font-semibold text-[var(--verde-valor)]" onClick={() => setSel([])}>Limpar</button>}
          </div>
          {comLocal.length === 0 ? <p className="text-[13px] text-muted px-1 py-4">Nenhuma OS elegível com coordenadas.</p> : (
            <div className="flex flex-col gap-2.5 max-h-[calc(100vh-250px)] overflow-y-auto pr-1">
              {porCidade.map(([cidade, lista]) => (
                <div key={cidade}>
                  <div className="flex items-center justify-between px-1 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-[.08em] text-muted">{cidade} · {lista.length}</span>
                    <button className="text-[11.5px] font-semibold text-[var(--verde-valor)]" onClick={() => setSel((s) => [...new Set([...s, ...lista.map((o) => o.id)])])}>todas</button>
                  </div>
                  {lista.map((o) => (
                    <label key={o.id} className={clsx('flex items-start gap-2 px-2 py-1.5 rounded-lg cursor-pointer border', sel.includes(o.id) ? 'border-[var(--brand)] bg-[rgba(58,184,30,.07)]' : 'border-transparent hover:bg-surface-2')}>
                      <input type="checkbox" className="accent-[var(--brand)] mt-1" checked={sel.includes(o.id)} onChange={() => alternar(o.id)} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5"><span className="tnum text-[11.5px] font-bold text-muted">{codigoOS(o)}</span><TipologiaChip t={o.tipologia} className="!h-[18px] !text-[10.5px]" /></span>
                        <span className="block text-[12.5px] font-medium truncate">{o.proponente}</span>
                        <span className="block text-[11.5px] text-muted truncate">{o.endereco.bairro}</span>
                      </span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card p-3">
          <div className="flex flex-wrap items-center gap-2 mb-3 px-1">
            <h3 className="card-tit mr-auto">Mapa das OS sem vistoria</h3>
            <button className={clsx('btn btn-sm', laco === 'mais' ? 'btn-primary' : 'btn-secondary')} onClick={() => setLaco(laco === 'mais' ? null : 'mais')}><Lasso size={14} /> Laço +</button>
            <button className={clsx('btn btn-sm', laco === 'menos' ? 'btn-primary' : 'btn-secondary')} onClick={() => setLaco(laco === 'menos' ? null : 'menos')}><Lasso size={14} /> Laço −</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setSel([])}>Limpar</button>
            <span className="chip chip-v">{sel.length} {sel.length === 1 ? 'selecionada' : 'selecionadas'}</span>
            <button className="btn btn-secondary btn-sm" onClick={() => setTrocarBase(true)}><Home size={14} /> Trocar base</button>
          </div>
          {comLocal.length === 0 ? (
            <Empty title="Nenhuma OS elegível com coordenadas" text="Defina a localização das OS para vê-las no mapa." />
          ) : (
            <MapaOS pontos={pontos} base={config.base} modoLaco={laco} onClique={alternar} altura={380}
              onLaco={(ids, modo) => setSel((s) => (modo === 'mais' ? [...new Set([...s, ...ids])] : s.filter((x) => !ids.includes(x))))} />
          )}
          <p className="text-[12px] text-muted mt-2 px-1">{laco ? 'Arraste no mapa para contornar as OS.' : 'Use o laço para selecionar OS no mapa; a listagem à esquerda acompanha a seleção. Também dá para clicar no ponto.'}</p>
          {sel.length > 0 && (
            <div className="flex flex-wrap items-end gap-3 mt-3 pt-3 border-t border-border px-1">
              <div className="flex flex-col gap-1"><span className="text-[12px] text-muted font-medium">Dia da rota</span><input type="date" className="input" value={data} onChange={(e) => setData(e.target.value)} /></div>
              <button className="btn btn-primary" onClick={criar}><Route size={15} /> Criar rota com {sel.length} OS</button>
              <span className="text-[12px] text-muted">A ordem sai otimizada a partir da base; dá para mudar depois.</span>
            </div>
          )}
        </section>
      </div>
      {semLocal && <DefinirLocalizacao lista={semCoord} onClose={() => setSemLocal(false)} />}
      {trocarBase && <TrocarBase onClose={() => setTrocarBase(false)} />}
    </>
  )
}

// ---------------------------------------------------------------- Lista de rotas
function ListaRotas({ abrir }: { abrir: (id: string) => void }) {
  const rotas = useStore((s) => s.rotas)
  const todas = useStore((s) => s.os)
  const escopo = useStore((s) => s.escopo)
  const config = useStore((s) => s.config)
  const [status, setStatus] = useState<StatusRota[]>([])
  const [periodo, setPeriodo] = useState<Periodo>('todos')
  const [ref, setRef] = useState(() => startOfMonth(new Date()))
  const [especifico, setEspecifico] = useState({ ini: '', fim: '' })
  const [criando, setCriando] = useState(false)
  const hoje = new Date()
  const { ini, fim } = intervalo(periodo, ref, especifico)

  const minhas = rotas.filter((r) => escopo === 'todas' || r.responsavel === escopo)
  const filtradas = minhas
    .filter((r) => !status.length || status.includes(r.status))
    .filter((r) => { const d = parseISO(r.data); return d >= ini && d <= fim })
    .sort((a, b) => b.data.localeCompare(a.data))
  const elegiveis = filtrarEscopo(todas, escopo).filter((o) => elegivelParaRota(o, rotas)).length
  const ativasHoje = minhas.filter(rotaAtiva).length
  const concluidasMes = minhas.filter((r) => r.status === 'concluida' && isSameMonth(parseISO(r.data), hoje)).length
  const porTecnico = (['luan', 'rt'] as const).map((t) => ({ t, lista: filtradas.filter((r) => r.responsavel === t) })).filter((g) => g.lista.length)

  return (
    <>
      <div className="flex flex-wrap items-end gap-3 mb-3">
        <Filtro label="Status"><MultiSelect rotuloVazio="Todos os status" largura={180} opcoes={(Object.keys(STATUS_ROTA) as StatusRota[]).map((s) => ({ value: s, label: STATUS_ROTA[s].label }))} valor={status} onChange={setStatus} /></Filtro>
        <Filtro label="Período"><FiltroPeriodo periodo={periodo} setPeriodo={setPeriodo} data={ref} setData={setRef} especifico={especifico} setEspecifico={setEspecifico} /></Filtro>
        <button className="btn btn-primary ml-auto" onClick={() => setCriando(true)}><Plus size={16} /> Criar nova rota</button>
      </div>

      <div className="card faixa-resumo px-4 py-3 mb-3 text-[13px] leading-relaxed">
        <b>Como funciona:</b> aparecem para seleção as OS que não estejam concluídas nem em outra rota ativa. OS sem coordenadas podem entrar na rota — você define a localização no detalhe da rota antes de confirmá-la.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        <Numero n={elegiveis} t="OS elegíveis para rota" />
        <Numero n={ativasHoje} t="Rotas ativas hoje" />
        <Numero n={concluidasMes} t="Rotas concluídas (mês)" />
      </div>

      {porTecnico.length === 0 ? (
        <div className="card"><Empty title="Nenhuma rota com esses filtros" text="Crie uma rota pelo Roteirizador ou em Criar nova rota." /></div>
      ) : porTecnico.map(({ t, lista }) => (
        <section key={t} className="card mb-3 overflow-hidden">
          <header className="px-4 py-3 flex items-center gap-2 border-b border-border">
            <Avatar resp={t} size={22} />
            <b className="text-[14px]">{config.responsaveis[t].nome}</b>
            <span className="text-[12.5px] text-muted">({lista.length} {lista.length === 1 ? 'rota' : 'rotas'})</span>
          </header>
          <ul className="divide-y divide-border">
            {lista.map((r) => {
              const pts = r.paradas.map((p) => todas.find((o) => o.id === p.osId)).map((o) => (o ? pontoOS(o) : undefined))
              return (
                <li key={r.id}>
                  <button className="w-full text-left px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1 hover:bg-[rgba(58,184,30,.06)]" onClick={() => abrir(r.id)}>
                    <span className="tnum font-bold text-[13.5px] w-[92px]">{r.codigo}</span>
                    <span className={clsx('chip', STATUS_ROTA[r.status].cls)}>{STATUS_ROTA[r.status].label}</span>
                    <span className="text-[13px] min-w-[150px]">{config.responsaveis[r.responsavel].nome}</span>
                    <span className="text-[13px] text-muted">{r.paradas.length} {r.paradas.length === 1 ? 'parada' : 'paradas'}</span>
                    <span className="text-[13px] text-muted tnum">{dataMedia(r.data)}</span>
                    <span className="text-[13px] text-muted tnum">{fmtKm(distanciaRota(r.partida, pts))}</span>
                    <span className="ml-auto text-[12.5px] font-semibold text-[var(--verde-valor)]">Detalhes</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
      {criando && <CriarRota onClose={() => setCriando(false)} onCriada={(id) => { setCriando(false); abrir(id) }} />}
    </>
  )
}

function Numero({ n, t }: { n: number; t: string }) {
  return (
    <div className="card px-4 py-3">
      <div className="text-[24px] font-bold tnum leading-tight">{n}</div>
      <div className="text-[12.5px] text-muted">{t}</div>
    </div>
  )
}

// ---------------------------------------------------------------- Criar nova rota
function CriarRota({ onClose, onCriada }: { onClose: () => void; onCriada: (id: string) => void }) {
  const todas = useStore((s) => s.os)
  const rotas = useStore((s) => s.rotas)
  const escopo = useStore((s) => s.escopo)
  const config = useStore((s) => s.config)
  const criarRota = useStore((s) => s.criarRota)
  const [resp, setResp] = useState<'luan' | 'rt'>(escopo === 'rt' ? 'rt' : 'luan')
  const [data, setData] = useState(() => format(addDays(new Date(), 1), 'yyyy-MM-dd'))
  const [sel, setSel] = useState<string[]>([])
  const elegiveis = todas.filter((o) => o.responsavel === resp && elegivelParaRota(o, rotas)).sort((a, b) => a.endereco.cidade.localeCompare(b.endereco.cidade))
  const criar = () => onCriada(criarRota(sel, { responsavel: resp, data, partida: { ...config.base } }))
  return (
    <Modal open onClose={onClose} title="Criar nova rota" width={640}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-primary" disabled={!sel.length} onClick={criar}>Criar rota com {sel.length} OS</button></>}>
      <div className="flex flex-wrap gap-3 mb-3">
        <label className="flex flex-col gap-1"><span className="text-[12px] text-muted font-medium">Técnico</span>
          <select className="input" value={resp} onChange={(e) => { setResp(e.target.value as 'luan' | 'rt'); setSel([]) }}>
            <option value="luan">{config.responsaveis.luan.nome}</option><option value="rt">{config.responsaveis.rt.nome}</option>
          </select>
        </label>
        <label className="flex flex-col gap-1"><span className="text-[12px] text-muted font-medium">Dia</span><input type="date" className="input" value={data} onChange={(e) => setData(e.target.value)} /></label>
      </div>
      {elegiveis.length === 0 ? <p className="text-muted text-[13px]">Nenhuma OS elegível para esse técnico.</p> : (
        <div className="flex flex-col gap-1 max-h-[50vh] overflow-y-auto">
          {elegiveis.map((o) => (
            <label key={o.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-surface-2 cursor-pointer">
              <input type="checkbox" className="accent-[var(--brand)]" checked={sel.includes(o.id)} onChange={() => setSel((s) => (s.includes(o.id) ? s.filter((x) => x !== o.id) : [...s, o.id]))} />
              <span className="tnum text-[12px] font-bold text-muted w-[52px]">{codigoOS(o)}</span>
              <span className="flex-1 min-w-0 truncate text-[13px]">{o.proponente}</span>
              <span className="text-[12px] text-muted">{o.endereco.cidade}</span>
              {!temCoordenada(o) && <span className="chip farol-warn !h-[20px]">sem local</span>}
            </label>
          ))}
        </div>
      )}
    </Modal>
  )
}

// ---------------------------------------------------------------- Detalhe da rota
function DetalheRota({ id, onClose }: { id: string; onClose: () => void }) {
  const rota = useStore((s) => s.rotas.find((r) => r.id === id))
  const todas = useStore((s) => s.os)
  const rotas = useStore((s) => s.rotas)
  const config = useStore((s) => s.config)
  const atualizarRota = useStore((s) => s.atualizarRota)
  const avancarRota = useStore((s) => s.avancarRota)
  const cancelarRota = useStore((s) => s.cancelarRota)
  const excluirRota = useStore((s) => s.excluirRota)
  const [definir, setDefinir] = useState<OS[] | null>(null)
  const [confirmaExcluir, setConfirmaExcluir] = useState(false)
  const [adicionar, setAdicionar] = useState('')
  const sensores = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  if (!rota) return null
  const editavel = rota.status === 'rascunho' || rota.status === 'confirmada'
  const osDe = (osId: string) => todas.find((o) => o.id === osId)
  const paradas = rota.paradas.filter((p) => osDe(p.osId))
  const pts = paradas.map((p) => pontoOS(osDe(p.osId)!))
  const km = distanciaRota(rota.partida, pts)
  const chegadas = horariosEstimados(rota.hora, rota.partida, pts, rota.velocidadeMedia, config.duracaoVistoria)
  const fimMin = paradas.length ? toMin(chegadas[chegadas.length - 1]) + config.duracaoVistoria : toMin(rota.hora)
  const semCoord = paradas.map((p) => osDe(p.osId)!).filter((o) => !temCoordenada(o))
  const disponiveis = todas.filter((o) => o.responsavel === rota.responsavel && elegivelParaRota(o, rotas, rota.id) && !rota.paradas.some((p) => p.osId === o.id))
  const set = (patch: Partial<Rota>) => atualizarRota(rota.id, patch)

  const aoArrastar = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const de = rota.paradas.findIndex((p) => p.osId === active.id)
    const para = rota.paradas.findIndex((p) => p.osId === over.id)
    set({ paradas: arrayMove(rota.paradas, de, para) })
  }
  const otimizar = () => set({ paradas: ordemOtimizada(rota.partida, rota.paradas, (p) => { const o = osDe(p.osId); return o ? pontoOS(o) : undefined }) })
  const linkMaps = () => {
    const destinos = paradas.map((p) => osDe(p.osId)!).map((o) => (temCoordenada(o) ? `${o.endereco.lat},${o.endereco.lng}` : enderecoMaps(o)))
    const origem = `${rota.partida.lat},${rota.partida.lng}`
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origem)}&destination=${encodeURIComponent(origem)}&waypoints=${encodeURIComponent(destinos.join('|'))}&travelmode=driving`
  }
  const mapa: PontoMapa[] = paradas.map((p, i) => ({ o: osDe(p.osId)!, i })).filter(({ o }) => temCoordenada(o)).map(({ o, i }) => ({ id: o.id, lat: o.endereco.lat!, lng: o.endereco.lng!, rotulo: `${i + 1}. ${codigoOS(o)} · ${o.proponente}`, titulo: `${o.endereco.bairro} · ${o.endereco.cidade}`, selecionado: true, ordem: i + 1 }))

  const header = (
    <div>
      <div className="flex flex-wrap items-center gap-2"><span className="tnum font-bold text-[13px] text-muted">{rota.codigo}</span><span className={clsx('chip', STATUS_ROTA[rota.status].cls)}>{STATUS_ROTA[rota.status].label}</span></div>
      <h3 className="font-semibold text-[17px] mt-1">{config.responsaveis[rota.responsavel].nome}</h3>
    </div>
  )
  const footer = confirmaExcluir ? (
    <><span className="text-[13px] mr-auto">Excluir {rota.codigo}? As O.S. voltam a ficar livres.</span><button className="btn btn-secondary" onClick={() => setConfirmaExcluir(false)}>Não</button><button className="btn !text-white" style={{ background: 'var(--vermelho)' }} onClick={() => { excluirRota(rota.id); onClose() }}>Excluir</button></>
  ) : (
    <>
      {paradas.length > 0 && <a className="btn btn-ghost mr-auto" target="_blank" rel="noreferrer" href={linkMaps()}><ExternalLink size={14} /> Google Maps</a>}
      {rota.status === 'rascunho' && <button className="btn btn-primary" disabled={!paradas.length || semCoord.length > 0} title={semCoord.length ? 'Defina a localização de todas as OS antes de confirmar' : undefined} onClick={() => avancarRota(rota.id)}>Avançar para Confirmada</button>}
      {rota.status === 'confirmada' && <button className="btn btn-primary" onClick={() => avancarRota(rota.id)}>Marcar como concluída</button>}
      {rota.status === 'confirmada' && <button className="btn btn-secondary" onClick={() => cancelarRota(rota.id)}>Cancelar rota</button>}
      <button className="btn btn-ghost" onClick={() => setConfirmaExcluir(true)}><Trash2 size={14} /> Excluir</button>
      <button className="btn btn-secondary" onClick={onClose}>Fechar</button>
    </>
  )

  return (
    <>
      <Modal open={!definir} onClose={onClose} header={header} width={900} footer={footer}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-5 gap-y-3.5 mb-3">
          <Info2 l="Status" v={STATUS_ROTA[rota.status].label} />
          <Info2 l="Distância estimada" v={paradas.length ? fmtKm(km) : '-'} />
          <Info2 l="Início" v={editavel ? <span className="flex gap-1.5"><input type="date" className="input input-sm w-[140px]" value={rota.data} onChange={(e) => set({ data: e.target.value })} /><input type="time" className="input input-sm w-[96px]" value={rota.hora} onChange={(e) => set({ hora: e.target.value })} /></span> : `${dataMedia(rota.data)} ${rota.hora}`} className="col-span-2" />
          <Info2 l="OS na rota" v={paradas.length} />
          <Info2 l="Velocidade média" v={editavel ? <span className="flex items-center gap-1"><input type="number" min={10} max={110} className="input input-sm w-[72px]" value={rota.velocidadeMedia} onChange={(e) => set({ velocidadeMedia: Number(e.target.value) || 30 })} /> km/h</span> : `${rota.velocidadeMedia} km/h`} />
          <Info2 l="Duração estimada" v={paradas.length ? `${fmtMin(fimMin - toMin(rota.hora))} até a última vistoria` : '-'} />
          <Info2 l="Partida" v={rota.partida.endereco} />
          <Info2 l="Descrição" v={editavel ? <input className="input input-sm w-full" value={rota.descricao} onChange={(e) => set({ descricao: e.target.value })} placeholder="Ex.: Ji-Paraná e região" /> : rota.descricao} className="col-span-2 sm:col-span-4" />
        </div>

        {semCoord.length > 0 && (
          <button className="w-full rounded-lg bg-[var(--laranja-soft)] text-[var(--laranja-txt)] px-3 py-2 mb-3 text-[12.5px] text-left flex items-center gap-2" onClick={() => setDefinir(semCoord)}>
            <CircleAlert size={14} /> {semCoord.length} OS sem localização. Defina antes de confirmar a rota.
          </button>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h4 className="card-tit mr-auto">Ordem de visitação ({paradas.length}) <span className="suave">arraste para reordenar</span></h4>
              {editavel && paradas.length > 2 && <button className="btn btn-secondary btn-sm" onClick={otimizar}><Sparkles size={14} /> Otimizar ordem</button>}
            </div>
            <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={aoArrastar}>
              <SortableContext items={paradas.map((p) => p.osId)} strategy={verticalListSortingStrategy}>
                <ul className="flex flex-col gap-1.5">
                  {paradas.map((p, i) => (
                    <ParadaItem key={p.osId} os={osDe(p.osId)!} i={i} chegada={chegadas[i]} editavel={editavel}
                      onLocal={() => setDefinir([osDe(p.osId)!])}
                      onRemover={() => set({ paradas: rota.paradas.filter((x) => x.osId !== p.osId) })} />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
            {editavel && disponiveis.length > 0 && (
              <div className="flex gap-2 mt-3">
                <select className="input input-sm flex-1" value={adicionar} onChange={(e) => setAdicionar(e.target.value)}>
                  <option value="">Adicionar OS à rota…</option>
                  {disponiveis.map((o) => <option key={o.id} value={o.id}>{codigoOS(o)} · {o.proponente} · {o.endereco.cidade}</option>)}
                </select>
                <button className="btn btn-secondary btn-sm" disabled={!adicionar} onClick={() => { set({ paradas: [...rota.paradas, { osId: adicionar }] }); setAdicionar('') }}><Plus size={14} /> Adicionar</button>
              </div>
            )}
          </div>
          <div>
            {mapa.length > 0 ? <MapaOS pontos={mapa} base={rota.partida} rota altura={380} legenda={false} /> : <div className="rounded-[12px] border border-border p-6 text-center text-[13px] text-muted">Sem OS com localização para desenhar.</div>}
            <p className="text-[11.5px] text-muted mt-1.5">Linha reta entre as paradas; a distância usa um fator de estrada de 1,3.</p>
          </div>
        </div>
      </Modal>
      {definir && <DefinirLocalizacao lista={definir} onClose={() => setDefinir(null)} />}
    </>
  )
}

function ParadaItem({ os, i, chegada, editavel, onLocal, onRemover }: { os: OS; i: number; chegada: string; editavel: boolean; onLocal: () => void; onRemover: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: os.id, disabled: !editavel })
  const hoje = format(new Date(), 'yyyy-MM-dd')
  const feita = os.vistoria && os.vistoria.data < hoje && os.status !== 'recebida'
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={clsx('flex items-center gap-2.5 rounded-[11px] border border-border bg-[var(--surface)] px-2.5 py-2', isDragging && 'shadow-lg relative z-10 border-[var(--brand)]')}>
      {editavel && <button className="text-muted cursor-grab touch-none" aria-label="Arrastar" {...attributes} {...listeners}><GripVertical size={16} /></button>}
      <span className="w-6 h-6 rounded-full bg-[var(--brand)] text-white text-[11.5px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
      <span className="min-w-0 flex-1">
        <span className="block tnum text-[11.5px] text-muted">{os.referencia}</span>
        <span className="block text-[13px] font-semibold truncate">{os.proponente}</span>
        <span className="block text-[11.5px] text-muted truncate">{os.endereco.bairro} · {os.endereco.cidade}</span>
      </span>
      <span className="text-right shrink-0">
        <span className="block tnum text-[12.5px] font-semibold" title="Chegada estimada">~{chegada}</span>
        {temCoordenada(os)
          ? (os.telefone ? <a className="text-[11.5px] text-[var(--verde-valor)] inline-flex items-center gap-1" target="_blank" rel="noreferrer" href={`https://wa.me/${telefoneWhats(os.whatsapp || os.telefone)}`} onClick={(e) => e.stopPropagation()}><MessageCircle size={11} />avisar</a> : null)
          : <button className="text-[11.5px] font-semibold text-[var(--laranja-txt)] inline-flex items-center gap-1" onClick={onLocal}><MapPin size={11} />Definir localização</button>}
      </span>
      <span className={clsx('chip !h-[22px] shrink-0', feita ? 'chip-v' : 'status-cancelada !no-underline')}>{feita ? 'Feita' : 'Pendente'}</span>
      {editavel && <button className="btn btn-ghost btn-icon !w-7 !h-7" aria-label="Tirar da rota" onClick={onRemover}><X size={14} /></button>}
    </li>
  )
}

// ---------------------------------------------------------------- Definir localização e trocar base
function DefinirLocalizacao({ lista, onClose }: { lista: OS[]; onClose: () => void }) {
  const definirLocalizacao = useStore((s) => s.definirLocalizacao)
  const [valores, setValores] = useState<Record<string, { lat: string; lng: string }>>(() => Object.fromEntries(lista.map((o) => [o.id, { lat: o.endereco.lat?.toString() ?? '', lng: o.endereco.lng?.toString() ?? '' }])))
  const ok = (v: { lat: string; lng: string }) => v.lat !== '' && v.lng !== '' && !Number.isNaN(Number(v.lat)) && !Number.isNaN(Number(v.lng))
  const salvar = () => { for (const o of lista) { const v = valores[o.id]; if (ok(v)) definirLocalizacao(o.id, Number(v.lat), Number(v.lng)) } onClose() }
  return (
    <Modal open onClose={onClose} title="Definir localização" width={720}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-primary" onClick={salvar}>Salvar localizações</button></>}>
      <p className="text-[12.5px] text-muted mb-3">Cole a latitude e a longitude do Google Maps (clique com o botão direito no ponto e copie os números) ou use o centro da cidade como aproximação.</p>
      <div className="flex flex-col gap-2">
        {lista.map((o) => {
          const v = valores[o.id]
          const centro = centroDaCidade(o.endereco.cidade)
          return (
            <div key={o.id} className="rounded-[11px] border border-border px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="tnum text-[12px] font-bold text-muted">{codigoOS(o)}</span>
                <b className="text-[13px]">{o.proponente}</b>
                <a className="text-[12px] text-[var(--verde-valor)] inline-flex items-center gap-1 ml-auto" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enderecoMaps(o))}`}><ExternalLink size={12} />Ver no Maps</a>
              </div>
              <div className="text-[12px] text-muted mb-2">{o.endereco.logradouro}, {o.endereco.numero} · {o.endereco.bairro} · {o.endereco.cidade}</div>
              <div className="flex flex-wrap items-center gap-2">
                <input className="input input-sm w-[130px] tnum" placeholder="Latitude" value={v.lat} onChange={(e) => setValores((x) => ({ ...x, [o.id]: { ...x[o.id], lat: e.target.value.replace(',', '.') } }))} />
                <input className="input input-sm w-[130px] tnum" placeholder="Longitude" value={v.lng} onChange={(e) => setValores((x) => ({ ...x, [o.id]: { ...x[o.id], lng: e.target.value.replace(',', '.') } }))} />
                {centro && <button className="btn btn-secondary btn-sm" onClick={() => setValores((x) => ({ ...x, [o.id]: { lat: String(centro.lat), lng: String(centro.lng) } }))}><MapPin size={13} /> Centro da cidade</button>}
                {ok(v) && <span className="chip chip-v !h-[22px]">ok</span>}
              </div>
            </div>
          )
        })}
      </div>
    </Modal>
  )
}

function TrocarBase({ onClose }: { onClose: () => void }) {
  const config = useStore((s) => s.config)
  const setConfig = useStore((s) => s.setConfig)
  const [b, setB] = useState({ endereco: config.base.endereco, lat: String(config.base.lat), lng: String(config.base.lng) })
  const valido = b.endereco.trim() && !Number.isNaN(Number(b.lat)) && !Number.isNaN(Number(b.lng)) && b.lat !== '' && b.lng !== ''
  return (
    <Modal open onClose={onClose} title="Trocar base" width={480}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-primary" disabled={!valido} onClick={() => { setConfig({ base: { endereco: b.endereco.trim(), lat: Number(b.lat), lng: Number(b.lng) } }); onClose() }}>Salvar base</button></>}>
      <p className="text-[12.5px] text-muted mb-3">De onde as rotas saem e para onde voltam. Também fica em Configurações › Meu Perfil.</p>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1"><span className="text-[12px] text-muted font-medium">Endereço</span><input className="input" value={b.endereco} onChange={(e) => setB({ ...b, endereco: e.target.value })} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1"><span className="text-[12px] text-muted font-medium">Latitude</span><input className="input tnum" value={b.lat} onChange={(e) => setB({ ...b, lat: e.target.value.replace(',', '.') })} /></label>
          <label className="flex flex-col gap-1"><span className="text-[12px] text-muted font-medium">Longitude</span><input className="input tnum" value={b.lng} onChange={(e) => setB({ ...b, lng: e.target.value.replace(',', '.') })} /></label>
        </div>
      </div>
    </Modal>
  )
}
