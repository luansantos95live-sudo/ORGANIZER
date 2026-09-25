import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import clsx from 'clsx'
import { addDays, format, parseISO } from 'date-fns'
import { ArrowDownAZ, Check, ChevronLeft, ChevronRight, Clock, Copy, GripVertical, MapPin, MessageCircle, Plus, Save, Trash2, Wand2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Avatar, Card, Empty, FarolChip, PageHeader, StatusChip } from '../components/ui'
import { TIPO_META, dataCurta, dataLonga, enderecoMaps, refCurta } from '../lib/os'
import { agruparPorBairro, conflitos, fmtMin, ordenarPorHora, preencherHorarios, resumoRota, toHHMM, toMin } from '../lib/rota'
import { useStore } from '../store/useStore'
import type { OS, Parada, Responsavel } from '../types'

export function RotaPage() {
  const todas = useStore((s) => s.os)
  const escopo = useStore((s) => s.escopo)
  const usuario = useStore((s) => s.usuario)
  const config = useStore((s) => s.config)
  const rotas = useStore((s) => s.rotas)
  const salvarRota = useStore((s) => s.salvarRota)
  const adicionarParada = useStore((s) => s.adicionarParada)
  const removerParada = useStore((s) => s.removerParada)
  const setParadas = useStore((s) => s.setParadas)
  const aplicarRotaNasOS = useStore((s) => s.aplicarRotaNasOS)
  const [sp, setSp] = useSearchParams()
  const [salvo, setSalvo] = useState(false)
  const [copiado, setCopiado] = useState(false)

  const data = sp.get('data') ?? format(new Date(), 'yyyy-MM-dd')
  const resp = (sp.get('resp') as Responsavel | null) ?? (escopo === 'rt' ? 'rt' : usuario)
  const setData = (d: string) => { const n = new URLSearchParams(sp); n.set('data', d); setSp(n, { replace: true }) }
  const setResp = (r: Responsavel) => { const n = new URLSearchParams(sp); n.set('resp', r); setSp(n, { replace: true }) }

  const rota = useMemo(() => rotas.find((r) => r.id === `${data}_${resp}`) ?? { id: `${data}_${resp}`, data, responsavel: resp, partida: config.partidaPadrao, paradas: [] }, [rotas, data, resp, config.partidaPadrao])
  const byId = (id: string) => todas.find((o) => o.id === id)
  const paradas = rota.paradas
  const ids = new Set(paradas.map((p) => p.osId))

  // O.S. disponíveis para entrar na rota
  const [filtroCidade, setFiltroCidade] = useState('')
  const [q, setQ] = useState('')
  const disponiveis = useMemo(() => {
    const t = q.trim().toLowerCase()
    return todas
      .filter((o) => o.responsavel === resp && ['emitida', 'agendada', 'diligencia'].includes(o.status) && !ids.has(o.id))
      .filter((o) => !filtroCidade || o.endereco.cidade === filtroCidade)
      .filter((o) => !t || [o.proponente, o.endereco.bairro, o.endereco.logradouro, refCurta(o.referencia)].join(' ').toLowerCase().includes(t))
      .sort((a, b) => (a.vistoria?.data === data ? -1 : 0) - (b.vistoria?.data === data ? -1 : 0) || a.endereco.cidade.localeCompare(b.endereco.cidade) || a.endereco.bairro.localeCompare(b.endereco.bairro))
  }, [todas, resp, filtroCidade, q, data, paradas.length])
  const cidades = [...new Set(todas.filter((o) => o.responsavel === resp).map((o) => o.endereco.cidade))].sort()
  const agendadasForaDaRota = disponiveis.filter((o) => o.vistoria?.data === data)

  // agrupamento por cidade > bairro na lista lateral
  const gruposDisp = useMemo(() => {
    const m = new Map<string, OS[]>()
    for (const o of disponiveis) {
      const k = `${o.endereco.cidade} · ${o.endereco.bairro}`
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(o)
    }
    return [...m.entries()]
  }, [disponiveis])

  const confs = conflitos(paradas)
  const resumo = resumoRota(paradas)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const from = paradas.findIndex((p) => p.osId === active.id)
    const to = paradas.findIndex((p) => p.osId === over.id)
    setParadas(data, resp, arrayMove(paradas, from, to))
  }

  const atualizarParada = (osId: string, patch: Partial<Parada>) => setParadas(data, resp, paradas.map((p) => (p.osId === osId ? { ...p, ...patch } : p)))

  const acaoAgrupar = () => setParadas(data, resp, agruparPorBairro(paradas, byId))
  const acaoOrdenarHora = () => setParadas(data, resp, ordenarPorHora(paradas))
  const acaoCascata = () => setParadas(data, resp, preencherHorarios(paradas, rota.partida))
  const acaoSalvar = () => { aplicarRotaNasOS(data, resp); setSalvo(true); setTimeout(() => setSalvo(false), 1800) }

  const linkMaps = () => {
    const ends = paradas.map((p) => byId(p.osId)).filter(Boolean).map((o) => encodeURIComponent(enderecoMaps(o!)))
    if (!ends.length) return '#'
    if (ends.length === 1) return `https://www.google.com/maps/search/?api=1&query=${ends[0]}`
    const origin = ends[0], destination = ends[ends.length - 1], way = ends.slice(1, -1).join('|')
    return `https://www.google.com/maps/dir/?api=1&travelmode=driving&origin=${origin}&destination=${destination}${way ? `&waypoints=${way}` : ''}`
  }
  const textoWhats = () => {
    const linhas = paradas.map((p, i) => {
      const o = byId(p.osId)!
      return `${i + 1}. ${p.inicio} — ${o.proponente}\n   ${o.endereco.logradouro}, ${o.endereco.numero} · ${o.endereco.bairro} · ${o.endereco.cidade}\n   ${o.contato} ${o.telefone}`
    })
    return `Rota ${dataCurta(data)} — ${config.responsaveis[resp].curto}\n\n${linhas.join('\n\n')}`
  }
  const copiar = async () => { try { await navigator.clipboard.writeText(textoWhats()); setCopiado(true); setTimeout(() => setCopiado(false), 1500) } catch { /* sem clipboard */ } }

  return (
    <>
      <PageHeader
        title="Rota do dia"
        subtitle="Escolha as O.S., defina a hora de cada parada e ordene como preferir. O sistema só sugere; você decide."
        actions={
          <>
            <div className="seg">
              {(['luan', 'rt'] as Responsavel[]).map((r) => (
                <button key={r} aria-pressed={resp === r} onClick={() => setResp(r)} className="flex items-center gap-1.5"><Avatar resp={r} size={16} />{config.responsaveis[r].curto}</button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <button className="btn btn-secondary btn-icon" onClick={() => setData(format(addDays(parseISO(data), -1), 'yyyy-MM-dd'))} aria-label="Dia anterior"><ChevronLeft size={16} /></button>
              <input type="date" className="input tnum" value={data} onChange={(e) => e.target.value && setData(e.target.value)} />
              <button className="btn btn-secondary btn-icon" onClick={() => setData(format(addDays(parseISO(data), 1), 'yyyy-MM-dd'))} aria-label="Próximo dia"><ChevronRight size={16} /></button>
            </div>
          </>
        }
      />

      <div className="grid lg:grid-cols-[320px_1fr] gap-4 items-start">
        {/* Disponíveis */}
        <Card title="Disponíveis" actions={<span className="text-[12px] text-muted">{disponiveis.length}</span>} pad={false} className="lg:sticky lg:top-[72px]">
          <div className="px-3 pb-2 flex gap-2">
            <input className="input input-sm flex-1" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
            <select className="input input-sm" value={filtroCidade} onChange={(e) => setFiltroCidade(e.target.value)}>
              <option value="">Cidades</option>
              {cidades.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          {agendadasForaDaRota.length > 0 && (
            <button className="mx-3 mb-2 btn btn-secondary btn-sm w-[calc(100%-24px)] justify-between" onClick={() => agendadasForaDaRota.forEach((o) => adicionarParada(data, resp, o.id))}>
              <span>{agendadasForaDaRota.length} agendada(s) para este dia</span><span className="text-brand">adicionar</span>
            </button>
          )}
          <div className="max-h-[calc(100vh-260px)] overflow-auto">
            {gruposDisp.length === 0 && <Empty title="Nada disponível" text="Sem O.S. a agendar para este responsável." />}
            {gruposDisp.map(([grupo, itens]) => (
              <div key={grupo}>
                <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted bg-surface-2 border-y border-border flex items-center gap-1.5"><MapPin size={11} />{grupo} · {itens.length}</div>
                {itens.map((o) => (
                  <div key={o.id} className="flex items-center gap-2 px-3 py-2 border-b border-border last:border-none">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium truncate">{o.proponente}</span>
                        <FarolChip os={o} />
                      </div>
                      <div className="text-[12px] text-muted truncate">{o.endereco.logradouro}, {o.endereco.numero} · {TIPO_META[o.tipo].curto}</div>
                      {o.vistoria && <div className="text-[11px] text-muted tnum">{o.vistoria.data === data ? `já agendada às ${o.vistoria.hora}` : `agendada ${dataCurta(o.vistoria.data)} ${o.vistoria.hora}`}</div>}
                    </div>
                    <button className="btn btn-secondary btn-icon" aria-label="Adicionar à rota" onClick={() => adicionarParada(data, resp, o.id)}><Plus size={15} /></button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Card>

        {/* Timeline */}
        <div className="flex flex-col gap-3 min-w-0">
          <Card pad={false}>
            <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
              <span className="text-[12.5px] text-muted capitalize mr-1">{dataLonga(data)}</span>
              <label className="flex items-center gap-1.5 text-[12px] text-muted">
                <Clock size={13} /> partida
                <input type="time" className="input input-sm tnum w-[112px]" value={rota.partida} step={300} onChange={(e) => e.target.value && salvarRota({ ...rota, partida: e.target.value })} />
              </label>
              <span className="flex-1" />
              <button className="btn btn-secondary btn-sm" onClick={acaoAgrupar} disabled={paradas.length < 2} title="Junta as paradas do mesmo bairro em sequência"><MapPin size={13} /> Agrupar por bairro</button>
              <button className="btn btn-secondary btn-sm" onClick={acaoOrdenarHora} disabled={paradas.length < 2} title="Reordena pela hora que você definiu"><ArrowDownAZ size={13} /> Ordenar por hora</button>
              <button className="btn btn-secondary btn-sm" onClick={acaoCascata} disabled={!paradas.length} title="Recalcula as horas em cascata a partir da partida, usando duração + deslocamento"><Wand2 size={13} /> Preencher horários</button>
            </div>
          </Card>

          {paradas.length === 0 ? (
            <Card><Empty title="Rota vazia" text="Adicione paradas pela lista à esquerda. Dica: comece pelas O.S. já agendadas para este dia." /></Card>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={paradas.map((p) => p.osId)} strategy={verticalListSortingStrategy}>
                <ol className="flex flex-col gap-2">
                  {paradas.map((p, i) => {
                    const o = byId(p.osId)
                    if (!o) return null
                    const ant = i > 0 ? byId(paradas[i - 1].osId) : undefined
                    const novoBairro = !ant || ant.endereco.bairro !== o.endereco.bairro || ant.endereco.cidade !== o.endereco.cidade
                    const conf = confs.find((c) => c.idx === i)
                    return (
                      <li key={p.osId} className="flex flex-col gap-2">
                        {novoBairro && (
                          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted mt-1">
                            <MapPin size={11} /> {o.endereco.bairro} · {o.endereco.cidade}
                            <span className="flex-1 h-px bg-border" />
                          </div>
                        )}
                        <ParadaCard
                          index={i}
                          parada={p}
                          os={o}
                          conflito={conf?.minutos}
                          ultima={i === paradas.length - 1}
                          onChange={(patch) => atualizarParada(p.osId, patch)}
                          onRemove={() => removerParada(data, resp, p.osId)}
                        />
                      </li>
                    )
                  })}
                </ol>
              </SortableContext>
            </DndContext>
          )}

          <Card pad={false}>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 text-[12.5px]">
              <span className="tnum"><b>{resumo.inicio}</b> – <b>{resumo.fim}</b></span>
              <span className="text-muted">{paradas.length} parada(s)</span>
              <span className="text-muted">{fmtMin(resumo.vistoriaMin)} em vistoria</span>
              <span className="text-muted">{fmtMin(resumo.deslocMin)} na estrada</span>
              {confs.length > 0 && <span className="chip farol-warn">{confs.length} sobreposição(ões)</span>}
              <span className="flex-1" />
              <a className="btn btn-secondary btn-sm" target="_blank" rel="noreferrer" href={linkMaps()} aria-disabled={!paradas.length}><MapPin size={13} /> Abrir no Maps</a>
              <button className="btn btn-secondary btn-sm" onClick={copiar} disabled={!paradas.length}>{copiado ? <Check size={13} /> : <Copy size={13} />} {copiado ? 'Copiado' : 'Copiar rota'}</button>
              <a className="btn btn-secondary btn-sm" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(textoWhats())}`}><MessageCircle size={13} /> WhatsApp</a>
              <button className="btn btn-primary btn-sm" onClick={acaoSalvar} disabled={!paradas.length}>{salvo ? <Check size={13} /> : <Save size={13} />} {salvo ? 'Salvo nas O.S.' : 'Salvar nas O.S.'}</button>
            </div>
          </Card>
          <p className="text-[12px] text-muted px-1">
            "Salvar nas O.S." grava dia e hora de cada parada na ordem de serviço e muda o status para <b>Agendada</b>. Deslocamentos padrão: {config.deslocamentoMesmoBairro} min no mesmo bairro, {config.deslocamentoOutroBairro} min entre bairros, {config.deslocamentoOutraCidade} min entre cidades (ajuste em Configurações ou direto em cada parada).
          </p>
        </div>
      </div>
    </>
  )
}

function ParadaCard({ index, parada, os, conflito, ultima, onChange, onRemove }: { index: number; parada: Parada; os: OS; conflito?: number; ultima: boolean; onChange: (p: Partial<Parada>) => void; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: parada.osId })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const fim = toHHMM(toMin(parada.inicio) + parada.duracao)
  return (
    <div ref={setNodeRef} style={style} className={clsx('card p-3 flex gap-3 items-start', isDragging && 'opacity-60 shadow-lg', conflito && 'ring-2 ring-[var(--f-warn-fg)]/40')}>
      <button className="text-muted hover:text-text cursor-grab active:cursor-grabbing mt-1.5 touch-none" {...attributes} {...listeners} aria-label="Arrastar"><GripVertical size={16} /></button>
      <span className="w-6 h-6 rounded-full bg-brand-soft text-brand-strong text-[12px] font-semibold flex items-center justify-center mt-1 shrink-0">{index + 1}</span>
      <div className="flex flex-col gap-1 shrink-0">
        <input type="time" className="input input-sm tnum w-[112px] font-semibold" value={parada.inicio} step={300} onChange={(e) => e.target.value && onChange({ inicio: e.target.value })} />
        <span className="text-[11px] text-muted tnum text-center">até {fim}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link to={`/os/${os.id}`} className="font-medium hover:underline">{os.proponente}</Link>
          <span className="text-[12px] text-muted tnum">#{refCurta(os.referencia)}</span>
          <StatusChip status={os.status} curto />
          <FarolChip os={os} />
        </div>
        <div className="text-[12.5px] text-muted mt-0.5">{os.endereco.logradouro}, {os.endereco.numero} · {os.endereco.bairro} · {os.endereco.cidade}</div>
        <div className="text-[12px] text-muted mt-0.5">{TIPO_META[os.tipo].curto} · {os.contato} <span className="tnum">{os.telefone}</span>{os.observacoes && <> · <i>{os.observacoes}</i></>}</div>
        {conflito && <div className="chip farol-warn mt-1.5">começa {conflito} min antes de dar tempo de chegar</div>}
      </div>
      <div className="flex flex-col gap-1 items-end shrink-0 text-[11px] text-muted">
        <label className="flex items-center gap-1">dur. <input type="number" className="input input-sm tnum w-[64px]" min={5} step={5} value={parada.duracao} onChange={(e) => onChange({ duracao: Math.max(5, Number(e.target.value) || 0) })} /> min</label>
        {!ultima && <label className="flex items-center gap-1">→ próx. <input type="number" className="input input-sm tnum w-[64px]" min={0} step={5} value={parada.deslocamento} onChange={(e) => onChange({ deslocamento: Math.max(0, Number(e.target.value) || 0) })} /> min</label>}
        <button className="btn btn-ghost btn-sm mt-1" onClick={onRemove}><Trash2 size={13} /> tirar</button>
      </div>
    </div>
  )
}
