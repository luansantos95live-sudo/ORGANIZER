import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import clsx from 'clsx'
import { addDays, format, isSameMonth, parseISO, startOfMonth } from 'date-fns'
import { ArrowLeft, ArrowRight, Check, CircleAlert, Copy, ExternalLink, GripVertical, Home, Lasso, MapPin, MessageCircle, Navigation, Pencil, Plus, Smartphone, Sparkles, Trash2, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MapaOS, type PontoMapa } from '../components/MapaOS'
import { Avatar, Empty, FiltroPeriodo, Filtro, Modal, MultiSelect, PageHeader, TipologiaChip } from '../components/ui'
import { copiar } from '../lib/clipboard'
import { lerCoordenadas, textoGMS } from '../lib/coordenadas'
import { intervalo, type Periodo } from '../lib/faturamento'
import { codigoOS, dataMedia, enderecoLinha, enderecoMaps, poloDe, temCoordenada, telefoneWhats } from '../lib/os'
import { distanciaKm, distanciaRota, elegivelParaRota, fmtKm, fmtMin, horariosEstimados, linkWaze, linksGoogleMaps, ordemPorBairro, rotaAtiva, textoRoteiro, toMin, type Distancia, type Ponto } from '../lib/rota'
import { buscarMatriz, buscarTrajeto, distanciaPelaMatriz, horariosPorTempos, minutosPorParada, type Matriz, type Trajeto } from '../lib/trajeto'
import { filtrarEscopo, useStore } from '../store/useStore'
import type { OS, Parada, Rota, StatusRota } from '../types'

const STATUS_ROTA: Record<StatusRota, { label: string; cls: string }> = {
  rascunho: { label: 'Planejando', cls: 'status-cancelada !no-underline' },
  confirmada: { label: 'Criada', cls: 'status-recebida' },
  concluida: { label: 'Concluída', cls: 'status-concluida' },
  cancelada: { label: 'Cancelada', cls: 'farol-urgent' },
}

const pontoOS = (o: OS) => (temCoordenada(o) ? { lat: o.endereco.lat!, lng: o.endereco.lng! } : undefined)
const bairroDe = (o?: OS) => (o?.endereco.bairro || '').trim().toUpperCase()
const amanha = () => format(addDays(new Date(), 1), 'yyyy-MM-dd')

/**
 * Módulo de Rotas (reestruturado em 06/11/2026 com o usuário): uma tela só com o mapa grande e, ao lado, o painel em
 * 3 passos: 1 Escolher (todas as O.S. em aberto, com caixa de marcar e o campo de coordenadas sempre à mostra) →
 * 2 Organizar (as escolhidas por bairro e proximidade da partida, arrastáveis) → 3 Celular (links do Google Maps/Waze,
 * avisar o cliente e confirmar a rota).
 */
export function RotasPage() {
  const [sp, setSp] = useSearchParams()
  const aba = sp.get('aba') === 'rotas' ? 'rotas' : 'planejar'
  const setParams = (patch: Record<string, string>) => { const n = new URLSearchParams(sp); for (const [k, v] of Object.entries(patch)) { if (v) n.set(k, v); else n.delete(k) } setSp(n, { replace: true }) }

  return (
    <>
      <PageHeader title="Rotas" />
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="seg seg-baixo" role="tablist">
          <button role="tab" aria-pressed={aba === 'planejar'} onClick={() => setParams({ aba: '' })}>Planejar</button>
          <button role="tab" aria-pressed={aba === 'rotas'} onClick={() => setParams({ aba: 'rotas' })}>Rotas salvas</button>
        </div>
      </div>
      {aba === 'planejar' ? <Planejador rotaId={sp.get('rota')} escolher={(id) => setParams({ rota: id })} /> : <ListaRotas abrir={(id) => setParams({ aba: '', rota: id })} />}
    </>
  )
}

// ---------------------------------------------------------------- Planejador (painel + mapa)
function Planejador({ rotaId, escolher }: { rotaId: string | null; escolher: (id: string) => void }) {
  const todas = useStore((s) => s.os)
  const rotas = useStore((s) => s.rotas)
  const escopo = useStore((s) => s.escopo)
  const config = useStore((s) => s.config)
  const criarRota = useStore((s) => s.criarRota)
  const atualizarRota = useStore((s) => s.atualizarRota)
  const [laco, setLaco] = useState<'mais' | 'menos' | null>(null)
  const [trocarBase, setTrocarBase] = useState(false)

  // ocupa a altura toda até o rodapé (como o Kanban)
  const caixa = useRef<HTMLDivElement>(null)
  const [altura, setAltura] = useState<number>()
  useLayoutEffect(() => {
    // tela larga: ocupa até o rodapé; tela estreita (celular/tablet): painel com 65% da altura e mapa embaixo, a página rola
    const medir = () => { if (caixa.current) setAltura(window.innerWidth < 1024 ? undefined : Math.max(440, window.innerHeight - caixa.current.getBoundingClientRect().top - 16)) }
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [])

  const responsavel = escopo === 'rt' ? 'rt' : 'luan'
  // a rota em planejamento: a escolhida, senão a rota ativa mais próxima do técnico
  const ativas = useMemo(() => rotas.filter((r) => rotaAtiva(r) && (escopo === 'todas' || r.responsavel === escopo)).sort((a, b) => a.data.localeCompare(b.data)), [rotas, escopo])
  const rota = (rotaId && rotas.find((r) => r.id === rotaId)) || ativas[0]
  const osDe = (osId: string) => todas.find((o) => o.id === osId)
  const paradas = useMemo(() => (rota ? rota.paradas.filter((p) => todas.some((o) => o.id === p.osId)) : []), [rota, todas])
  const naRota = useMemo(() => new Set(paradas.map((p) => p.osId)), [paradas])
  const editavel = !!rota && rotaAtiva(rota)
  const partida = rota?.partida ?? config.base

  // todas as O.S. em aberto do técnico que podem entrar em rota (as da rota atual incluídas)
  const emAberto = useMemo(() => {
    const resp = rota?.responsavel ?? responsavel
    return filtrarEscopo(todas, escopo).filter((o) => o.responsavel === resp && elegivelParaRota(o, rotas, rota?.id))
      .sort((a, b) => a.endereco.cidade.localeCompare(b.endereco.cidade) || bairroDe(a).localeCompare(bairroDe(b)))
  }, [todas, escopo, rotas, rota?.id, rota?.responsavel, responsavel])

  // Caminho pelas ruas (pedido de 06/11): distâncias e tempos vêm do OSRM (lib/trajeto), não da linha reta.
  // 1) matriz partida ↔ todas as O.S. em aberto, para ordenar as paradas pelo caminho real
  const pontosMatriz = useMemo(() => [partida as Ponto, ...emAberto.filter(temCoordenada).map((o) => pontoOS(o)!)], [partida, emAberto])
  const chaveMatriz = pontosMatriz.map((p) => `${p.lat},${p.lng}`).join(';')
  const [matriz, setMatriz] = useState<{ chave: string; m: Matriz } | null>(null)
  useEffect(() => {
    let vivo = true
    buscarMatriz(pontosMatriz).then((m) => { if (vivo && m) setMatriz({ chave: chaveMatriz, m }) })
    return () => { vivo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveMatriz])
  const dist: Distancia = useMemo(() => (matriz?.chave === chaveMatriz ? distanciaPelaMatriz(pontosMatriz, matriz.m) : distanciaKm), [matriz, chaveMatriz, pontosMatriz])

  // 2) trajeto da rota atual (partida → paradas → partida): km, tempos por trecho e a linha para o mapa
  const ptsRota = useMemo(() => paradas.map((p) => { const o = osDe(p.osId); return o ? pontoOS(o) : undefined }).filter((p): p is Ponto => !!p), [paradas, todas]) // eslint-disable-line react-hooks/exhaustive-deps
  const chaveTrajeto = `${partida.lat},${partida.lng}|` + ptsRota.map((p) => `${p.lat},${p.lng}`).join(';')
  const [trajeto, setTrajeto] = useState<{ chave: string; t: Trajeto } | null>(null)
  const [buscando, setBuscando] = useState(false)
  useEffect(() => {
    if (!ptsRota.length) { setBuscando(false); return }
    let vivo = true
    setBuscando(true)
    const timer = setTimeout(() => buscarTrajeto(partida, ptsRota).then((t) => { if (!vivo) return; setBuscando(false); if (t) setTrajeto({ chave: chaveTrajeto, t }) }), 300)
    return () => { vivo = false; clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveTrajeto])
  const trajetoAtual = trajeto?.chave === chaveTrajeto ? trajeto.t : null

  // ordena por bairro e proximidade da partida (a menos que o usuário tenha arrastado à mão)
  const ordenar = (lista: Parada[], r: Rota) => ordemPorBairro(r.partida, lista, (p) => { const o = osDe(p.osId); return o ? pontoOS(o) : undefined }, (p) => bairroDe(osDe(p.osId)), dist)
  // quando a matriz chega, a sugestão (ainda não mexida à mão) é refeita pelo caminho real
  useEffect(() => {
    if (!rota || rota.status !== 'rascunho' || rota.ordemManual || matriz?.chave !== chaveMatriz) return
    const nova = ordenar(rota.paradas, rota)
    if (nova.map((p) => p.osId).join() !== rota.paradas.map((p) => p.osId).join()) atualizarRota(rota.id, { paradas: nova })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matriz])

  // Rota sugerida (pedido de 06/11): por padrão o sistema já monta uma rota com as O.S. em aberto, ordenada por bairro e
  // proximidade da base; o usuário só desmarca o que não entra. Também é o que o botão "Nova" faz (com as que sobraram).
  const sugerirRota = (lista: OS[]) => {
    const ordem = ordemPorBairro(config.base, lista, pontoOS, bairroDe, dist)
    return criarRota(ordem.map((o) => o.id), { responsavel, data: amanha(), descricao: ordem.length ? 'Sugestão com as O.S. em aberto' : '' })
  }
  // O.S. em aberto do técnico que não estão em nenhuma rota ativa: só com elas é que se cria outra rota (pedido de 06/11);
  // sem nenhuma, o jeito é editar uma rota existente
  const livres = useMemo(() => todas.filter((o) => o.responsavel === responsavel && elegivelParaRota(o, rotas)), [todas, responsavel, rotas])
  const sugerindo = useRef(false)
  useEffect(() => {
    if (rota) { sugerindo.current = false; return }
    if (sugerindo.current || !livres.length) return
    sugerindo.current = true
    escolher(sugerirRota(livres))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rota])
  const adicionar = (ids: string[]) => {
    const novos = ids.filter((id) => !naRota.has(id))
    if (!novos.length) return
    if (!rota || !editavel) {
      const id = criarRota([], { responsavel, data: amanha() })
      const r = useStore.getState().rotas.find((x) => x.id === id)!
      atualizarRota(id, { paradas: ordenar(novos.map((osId) => ({ osId })), r) })
      escolher(id)
      return
    }
    const lista = [...rota.paradas, ...novos.map((osId) => ({ osId }))]
    atualizarRota(rota.id, { paradas: rota.ordemManual ? lista : ordenar(lista, rota) })
  }
  const remover = (ids: string[]) => { if (rota && editavel) atualizarRota(rota.id, { paradas: rota.paradas.filter((p) => !ids.includes(p.osId)) }) }
  const alternar = (id: string) => (naRota.has(id) ? remover([id]) : adicionar([id]))

  const pontos: PontoMapa[] = useMemo(() => {
    const ordem = new Map(paradas.map((p, i) => [p.osId, i + 1]))
    return emAberto.filter(temCoordenada).map((o) => {
      const n = ordem.get(o.id)
      return n
        ? { id: o.id, lat: o.endereco.lat!, lng: o.endereco.lng!, rotulo: `${n}. ${codigoOS(o)} · ${o.proponente}`, titulo: `${o.endereco.bairro} · ${o.endereco.cidade} — clique para tirar da rota`, selecionado: true, ordem: n }
        : { id: o.id, lat: o.endereco.lat!, lng: o.endereco.lng!, rotulo: `${codigoOS(o)} · ${o.proponente}`, titulo: `${o.endereco.bairro} · ${o.endereco.cidade} — clique para pôr na rota` }
    })
  }, [emAberto, paradas])

  return (
    <>
      {/* tela larga: painel + mapa lado a lado; estreita: painel em cima (rola por dentro) e mapa embaixo */}
      <div ref={caixa} className="grid grid-cols-1 lg:grid-cols-[430px_minmax(0,1fr)] gap-3" style={{ height: altura }}>
        <PainelRota key={rota?.id ?? 'nova'} rota={rota} ativas={ativas} escolher={escolher} paradas={paradas} emAberto={emAberto} naRota={naRota} osDe={osDe} editavel={editavel}
          trajeto={trajetoAtual} buscando={buscando} dist={dist}
          podeNova={livres.length > 0} onAlternar={alternar} onTrocarBase={() => setTrocarBase(true)} onNova={() => { if (livres.length) escolher(sugerirRota(livres)) }} />
        <div className="h-[360px] lg:h-full min-h-0">
          <MapaOS pontos={pontos} base={partida} modoLaco={editavel || !rota ? laco : null} rota trajeto={trajetoAtual?.linha} onClique={alternar}
            onLaco={(ids, modo) => (modo === 'mais' ? adicionar(ids) : remover(ids))}>
            <button className={clsx('btn btn-sm', laco === 'mais' ? 'btn-primary' : 'btn-secondary')} title="Arraste no mapa para pôr na rota as O.S. de dentro do contorno" onClick={() => setLaco(laco === 'mais' ? null : 'mais')}><Lasso size={14} /> Laço +</button>
            <button className={clsx('btn btn-sm', laco === 'menos' ? 'btn-primary' : 'btn-secondary')} title="Arraste no mapa para tirar da rota as O.S. de dentro do contorno" onClick={() => setLaco(laco === 'menos' ? null : 'menos')}><Lasso size={14} /> Laço −</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setTrocarBase(true)}><Home size={14} /> Partida</button>
          </MapaOS>
        </div>
      </div>
      {trocarBase && <TrocarBase rota={editavel ? rota : undefined} onClose={() => setTrocarBase(false)} />}
    </>
  )
}

// ---------------------------------------------------------------- Painel da rota em 5 passos
// 1 Selecionar as O.S. → 2 Montar a rota (ordem) → 3 Agendar com os clientes → 4 Confirmar (cliente respondeu) e criar → 5 Exportar para o celular.
// Agendar e Confirmar são abas separadas (pedido de 06/11): agendamento não é confirmação.
type Passo = 1 | 2 | 3 | 4 | 5
const PASSOS: { n: Passo; label: string; dica: string }[] = [
  { n: 1, label: 'Selecionar', dica: 'Marque as O.S. que você vai vistoriar nesta viagem. Também dá para marcar clicando no ponto do mapa ou com o Laço.' },
  { n: 2, label: 'Montar', dica: 'Confira a ordem das paradas (já vem por bairro, do mais perto da partida ao mais longe). Arraste para mudar e siga para Agendar.' },
  { n: 3, label: 'Agendar', dica: 'Mande a mensagem com o horário para cada cliente pelo WhatsApp (a hora prevista já vai na mensagem). Com todos agendados, siga para Confirmar.' },
  { n: 4, label: 'Confirmar', dica: 'Quando cada cliente responder que o horário está bom, marque Cliente confirmou. Com todos confirmados, clique em Criar rota.' },
  { n: 5, label: 'Exportar', dica: 'Rota criada e com todos os agendamentos confirmados: leve a rota completa para o celular (o Google Maps abre todas as paradas na ordem).' },
]

function PainelRota({ rota, ativas, escolher, paradas, emAberto, naRota, osDe, editavel, trajeto, buscando, dist, podeNova, onAlternar, onTrocarBase, onNova }: {
  rota?: Rota; ativas: Rota[]; escolher: (id: string) => void; paradas: Parada[]; emAberto: OS[]; naRota: Set<string>; osDe: (id: string) => OS | undefined; editavel: boolean
  trajeto: Trajeto | null; buscando: boolean; dist: Distancia; podeNova: boolean
  onAlternar: (id: string) => void; onTrocarBase: () => void; onNova: () => void
}) {
  const config = useStore((s) => s.config)
  const atualizarRota = useStore((s) => s.atualizarRota)
  const avancarRota = useStore((s) => s.avancarRota)
  const cancelarRota = useStore((s) => s.cancelarRota)
  const excluirRota = useStore((s) => s.excluirRota)
  const agendar = useStore((s) => s.agendar)
  // rascunho abre em Selecionar (a sugestão vem toda marcada; o usuário tira o que não entra); criada (confirmada/concluída) abre em Exportar
  // (ou em Confirmar, se algum cliente ainda não confirmou)
  const [passo, setPasso] = useState<Passo>(() => (!rota || rota.status === 'rascunho' ? (Math.min(5, Math.max(1, rota?.etapa ?? 1)) as Passo) : paradas.length > 0 && paradas.every((p) => p.confirmado) ? 5 : 4))
  const [copiado, setCopiado] = useState<string | null>(null)
  const [confirmaExcluir, setConfirmaExcluir] = useState(false)
  const sensores = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))
  const copiarLink = async (chave: string, texto: string) => { if (await copiar(texto)) { setCopiado(chave); setTimeout(() => setCopiado((c) => (c === chave ? null : c)), 2000) } }

  const pts = paradas.map((p) => pontoOS(osDe(p.osId)!))
  // pelas ruas (OSRM) quando o trajeto chegou; senão a estimativa em linha reta × 1,3
  const km = trajeto ? trajeto.km : rota ? distanciaRota(rota.partida, pts) : 0
  const chegadas = !rota ? [] : trajeto ? horariosPorTempos(rota.hora, minutosPorParada(trajeto.trechos, pts), config.duracaoVistoria) : horariosEstimados(rota.hora, rota.partida, pts, rota.velocidadeMedia, config.duracaoVistoria)
  const comoMediu = trajeto ? 'pelas ruas' : buscando ? 'calculando pelas ruas…' : 'em linha reta (sem internet)'
  const fimMin = rota && paradas.length ? toMin(chegadas[chegadas.length - 1]) + config.duracaoVistoria : 0
  const semCoord = paradas.filter((p) => !temCoordenada(osDe(p.osId)!)).length
  const set = (patch: Partial<Rota>) => rota && atualizarRota(rota.id, patch)
  // rota completa para o celular: partida → todas as paradas na ordem → volta (em partes se passar de 9 paradas)
  const linksMaps = rota ? linksGoogleMaps(rota.partida, paradas.map((p) => osDe(p.osId)!).map((o) => (temCoordenada(o) ? `${o.endereco.lat},${o.endereco.lng}` : enderecoMaps(o)))) : []
  const roteiro = () => rota ? textoRoteiro(`${rota.codigo} · ${dataMedia(rota.data)} · saída ${rota.hora} de ${rota.partida.endereco}`, paradas.map((p, i) => { const o = osDe(p.osId)!; return { hora: p.hora ?? chegadas[i], nome: `${o.proponente} (${codigoOS(o)})`, endereco: enderecoLinha(o) } }), linksMaps) : ''
  const aoArrastar = (e: DragEndEvent) => {
    const { active, over } = e
    if (!rota || !over || active.id === over.id) return
    set({ paradas: arrayMove(rota.paradas, rota.paradas.findIndex((p) => p.osId === active.id), rota.paradas.findIndex((p) => p.osId === over.id)), ordemManual: true })
  }
  const ordenarPorBairro = () => rota && set({ paradas: ordemPorBairro(rota.partida, rota.paradas, (p) => { const o = osDe(p.osId); return o ? pontoOS(o) : undefined }, (p) => bairroDe(osDe(p.osId)), dist), ordemManual: false })
  // nova origem: a ordem sugerida é refeita a partir dela (a menos que o usuário já tenha arrastado as paradas);
  // a matriz da nova origem chega em seguida e o Planejador refaz a ordem pelo caminho real
  const mudarPartida = (partida: Rota['partida']) => rota && set({ partida, ...(rota.ordemManual ? {} : { paradas: ordemPorBairro(partida, rota.paradas, (p) => { const o = osDe(p.osId); return o ? pontoOS(o) : undefined }, (p) => bairroDe(osDe(p.osId)), dist) }) })
  // passo 3: hora combinada com o cliente (muda a vistoria marcada quando a rota já foi criada)
  const mudarParada = (osId: string, patch: Partial<Parada>) => {
    if (!rota) return
    set({ paradas: rota.paradas.map((p) => (p.osId === osId ? { ...p, ...patch } : p)) })
    if (patch.hora && rota.status === 'confirmada') agendar(osId, rota.data, patch.hora)
  }
  // Criar a rota (pedido de 06/11): só depois que os clientes confirmaram o horário; marca as vistorias e libera Exportar.
  // "Só com os confirmados" tira da rota quem não confirmou (volta para as O.S. em aberto) e cria com o resto.
  const confirmados = paradas.filter((p) => p.confirmado).length
  // só exporta a rota criada (confirmada) e com todos os agendamentos confirmados (pedido de 06/11)
  const exportavel = !!rota && rota.status !== 'rascunho' && paradas.length > 0 && confirmados === paradas.length
  const porQueNaoExporta = !rota || rota.status === 'rascunho' ? 'Crie a rota primeiro (passo 4, depois dos agendamentos confirmados)' : paradas.length === 0 ? 'A rota não tem paradas' : `${paradas.length - confirmados === 1 ? '1 cliente ainda não confirmou' : `${paradas.length - confirmados} clientes ainda não confirmaram`} o agendamento`
  const criarRota = (soConfirmados = false) => {
    if (!rota) return
    if (soConfirmados) set({ paradas: rota.paradas.filter((p) => p.confirmado) })
    avancarRota(rota.id)
    set({ etapa: 5 })
    setPasso(5)
  }
  const mensagem = (o: OS, hora: string) => config.mensagemWhatsApp.replace('{contato}', o.contato || o.proponente).replace('{cliente}', o.proponente).replace('{endereco}', enderecoLinha(o))
    .replace('{data}', rota ? dataMedia(rota.data) : '').replace('{hora}', hora).replace('{os}', codigoOS(o))

  // em aberto agrupadas por cidade (passo 1)
  const porCidade = useMemo(() => { const m = new Map<string, OS[]>(); for (const o of emAberto) m.set(o.endereco.cidade, [...(m.get(o.endereco.cidade) ?? [])  , o]); return [...m.entries()] }, [emAberto])
  const podeMarcar = editavel || !rota
  const avisados = paradas.filter((p) => p.avisado).length
  // aba Confirmar só abre depois de algum agendamento; aba Exportar só com a rota criada e todos confirmados
  // passos abrem um depois do outro (13/11): só se chega ao passo seguinte terminando o atual pelo botão do rodapé
  const liberado = rota ? (rota.etapa ?? (rota.status !== 'rascunho' ? 5 : paradas.some((p) => p.confirmado) ? 4 : avisados > 0 ? 3 : 1)) : 1
  const ir = (n: Passo) => { setPasso(n); if (rota && n > liberado) set({ etapa: n }) }
  const abaBloqueada = (n: Passo) => n > liberado || (n === 4 && avisados === 0) || (n === 5 && !exportavel)
  const porQueBloqueada = (n: Passo) => (n > liberado ? `${PASSOS[n - 1].label}: termine o passo ${n - 1} (${PASSOS[n - 2].label}) antes` : n === 4 ? 'Confirmar: agende com pelo menos um cliente antes (passo 3)' : `Exportar: ${porQueNaoExporta}`)

  return (
    <section className="card flex flex-col min-h-0 overflow-hidden h-[65vh] lg:h-auto">
      {/* cabeçalho: qual rota */}
      <div className="px-3.5 pt-3 pb-2.5 border-b border-border flex flex-col gap-2.5 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          {rota ? (
            <>
              {/* as rotas ativas aparecem pela data (pedido de 06/11), não pelo código */}
              {ativas.length > 1 ? (
                <select className="input input-sm !h-8 !px-1.5 font-bold tnum min-w-0 w-[150px] shrink-0" value={rota.id} onChange={(e) => escolher(e.target.value)} title="Trocar de rota (em ordem de data)">
                  {ativas.map((r) => <option key={r.id} value={r.id}>{dataMedia(r.data)} · {r.hora} ({r.paradas.length})</option>)}
                  {!ativas.some((r) => r.id === rota.id) && <option value={rota.id}>{dataMedia(rota.data)} · {rota.hora} ({rota.paradas.length})</option>}
                </select>
              ) : <span className="tnum font-bold text-[14px]">{dataMedia(rota.data)} · {rota.hora}</span>}
              <span className={clsx('chip !h-[22px] shrink-0', STATUS_ROTA[rota.status].cls)}>{STATUS_ROTA[rota.status].label}</span>
              <Avatar resp={rota.responsavel} size={22} />
              <span className="text-[11.5px] text-muted tnum truncate min-w-0" title="Código da rota">{rota.codigo}</span>
            </>
          ) : <span className="font-bold text-[14px]">Nova rota</span>}
          <button className="btn btn-secondary btn-sm ml-auto" disabled={!podeNova} onClick={onNova} title={podeNova ? 'Monta outra rota com as O.S. em aberto que ainda não estão em nenhuma rota' : 'Todas as O.S. em aberto já estão em rota: edite uma rota existente'}><Plus size={14} /> Nova</button>
        </div>
        <div className="seg seg-linha seg-passos" role="tablist">
          {PASSOS.map((p) => (
            <button key={p.n} role="tab" aria-pressed={passo === p.n} disabled={abaBloqueada(p.n)} onClick={() => setPasso(p.n)} title={abaBloqueada(p.n) ? porQueBloqueada(p.n) : p.label}>
              {p.n < passo ? <Check size={13} /> : <span className="n">{p.n}</span>}<span className="truncate">{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* corpo do passo (rola por dentro), no fundo das colunas do Kanban */}
      <div className="flex-1 min-h-0 overflow-y-auto lista-rota pb-2">
        <div className="faixa-resumo bg-[var(--surface)] px-3.5 py-2 text-[12.5px] leading-relaxed border-b border-border">
          <b>{passo}. {PASSOS[passo - 1].label}.</b> {PASSOS[passo - 1].dica}
        </div>

        {passo === 1 && (
          emAberto.length === 0 ? <Empty title="Nenhuma O.S. em aberto para rota" text="As O.S. recebidas e em andamento aparecem aqui." /> : (
            porCidade.map(([cidade, lista]) => {
              return (
                <div key={cidade}>
                  <div className="px-3.5 pt-3 pb-1">
                    <span className="card-tit">{cidade} <span className="suave">{lista.length} O.S.</span></span>
                  </div>
                  <ul className="flex flex-col gap-2 px-3">
                    {lista.map((o) => <LinhaEscolha key={o.id} os={o} marcada={naRota.has(o.id)} podeMarcar={podeMarcar} onAlternar={() => onAlternar(o.id)} />)}
                  </ul>
                </div>
              )
            })
          )
        )}

        {passo === 2 && rota && (
          <>
            <div className="px-3 pt-3 pb-2 flex flex-col gap-2">
              <CampoOrigem rota={rota} editavel={editavel} onSalvar={mudarPartida} onPadrao={onTrocarBase} />
              <label className="flex items-center gap-2 px-0.5"><span className="card-tit w-[52px]">Saída</span>
                <input type="date" className="input input-sm !h-8 !px-2 tnum flex-1 min-w-0" value={rota.data} disabled={!editavel} onChange={(e) => set({ data: e.target.value })} />
                <input type="time" className="input input-sm !h-8 !px-2 tnum w-[84px]" value={rota.hora} disabled={!editavel} onChange={(e) => set({ hora: e.target.value })} />
              </label>
            </div>
            {paradas.length === 0 ? (
              <Empty title="Nenhuma O.S. selecionada" text="Volte ao passo 1 e marque as O.S. da viagem." action={<button className="btn btn-secondary btn-sm" onClick={() => setPasso(1)}><ArrowLeft size={14} /> Selecionar</button>} />
            ) : (
              <>
                <div className="flex items-center gap-2 px-3.5 pb-1">
                  <span className="card-tit">Ordem das paradas <span className="suave">arraste para mudar</span></span>
                  {editavel && paradas.length > 1 && <button className="btn btn-secondary btn-sm !h-7 ml-auto" onClick={ordenarPorBairro} title="Agrupa por bairro, começando pelo mais perto da partida"><Sparkles size={13} /> Por bairro</button>}
                </div>
                {semCoord > 0 && <div className="mx-3.5 mb-2 rounded-lg bg-[var(--laranja-soft)] text-[var(--laranja-txt)] px-2.5 py-1.5 text-[12px] flex items-center gap-1.5"><CircleAlert size={13} /> {semCoord === 1 ? '1 parada sem coordenadas' : `${semCoord} paradas sem coordenadas`}: cole as do Maps para criar a rota.</div>}
                <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={aoArrastar}>
                  <SortableContext items={paradas.map((p) => p.osId)} strategy={verticalListSortingStrategy}>
                    <ul className="flex flex-col gap-2 px-3">
                      {paradas.map((p, i) => (
                        <LinhaParada key={p.osId} os={osDe(p.osId)!} i={i} chegada={chegadas[i]} editavel={editavel}
                          novoBairro={i === 0 || bairroDe(osDe(paradas[i - 1].osId)) !== bairroDe(osDe(p.osId))} onRemover={() => onAlternar(p.osId)} />
                      ))}
                    </ul>
                  </SortableContext>
                </DndContext>
              </>
            )}
          </>
        )}

        {/* passos 3 (Agendar) e 4 (Confirmar): a mesma lista de clientes, cada aba com a sua ação */}
        {(passo === 3 || passo === 4) && rota && (
          paradas.length === 0 ? <Empty title="Nenhuma O.S. na rota" text="Volte ao passo 1 e marque as O.S. da viagem." /> : (
            <>
              {rota.status === 'rascunho' && semCoord > 0 && <div className="mx-3.5 mt-3 rounded-lg bg-[var(--laranja-soft)] text-[var(--laranja-txt)] px-2.5 py-1.5 text-[12px] flex items-center gap-1.5"><CircleAlert size={13} className="shrink-0" /> <span>{semCoord === 1 ? '1 parada sem coordenadas' : `${semCoord} paradas sem coordenadas`}: cole as do Maps no passo <button className="font-semibold underline" onClick={() => setPasso(2)}>Montar</button> antes de criar a rota.</span></div>}
              {passo === 3 && rota.status === 'rascunho' && (
                avisados === paradas.length
                  ? <div className="mx-3.5 mt-3 rounded-lg bg-[rgba(58,184,30,.12)] text-[var(--verde-valor)] px-2.5 py-1.5 text-[12px] flex items-center gap-1.5"><Check size={13} className="shrink-0" /> <span>Todos os clientes agendados. Siga para <b>Confirmar</b> e marque quem respondeu que o horário está bom.</span></div>
                  : <div className="mx-3.5 mt-3 rounded-lg bg-[var(--laranja-soft)] text-[var(--laranja-txt)] px-2.5 py-1.5 text-[12px] flex items-center gap-1.5"><CircleAlert size={13} className="shrink-0" /> <span>{paradas.length - avisados === 1 ? '1 cliente' : `${paradas.length - avisados} clientes`} sem agendar. Agendar é só mandar o horário; a confirmação do cliente vem no passo 4.</span></div>
              )}
              {passo === 3 && rota.status !== 'rascunho' && <div className="mx-3.5 mt-3 rounded-lg bg-[rgba(58,184,30,.12)] text-[var(--verde-valor)] px-2.5 py-1.5 text-[12px] flex items-center gap-1.5"><Check size={13} className="shrink-0" /> <span>Rota criada: os agendamentos já foram feitos. Mudar uma hora aqui remarca a vistoria (reenvie a mensagem ao cliente).</span></div>}
              {passo === 4 && rota.status === 'rascunho' && (
                confirmados === paradas.length
                  ? <div className="mx-3.5 mt-3 rounded-lg bg-[rgba(58,184,30,.12)] text-[var(--verde-valor)] px-2.5 py-1.5 text-[12px] flex items-center gap-1.5"><Check size={13} className="shrink-0" /> <span>Todos os agendamentos confirmados. Clique em <b>Criar rota</b> para marcar as vistorias e liberar a exportação.</span></div>
                  : <div className="mx-3.5 mt-3 rounded-lg bg-[var(--laranja-soft)] text-[var(--laranja-txt)] px-2.5 py-1.5 text-[12px] flex flex-wrap items-center gap-1.5"><CircleAlert size={13} /> <span className="flex-1">{avisados < paradas.length ? `${paradas.length - avisados === 1 ? '1 cliente' : `${paradas.length - avisados} clientes`} sem agendar · ` : ''}aguardando {paradas.length - confirmados === 1 ? '1 cliente' : `${paradas.length - confirmados} clientes`} confirmar. A rota só é criada depois.</span>
                    {confirmados > 0 && <button className="btn btn-secondary btn-sm !h-7" title="Tira da rota quem não confirmou (volta para as O.S. em aberto) e cria a rota com os confirmados" onClick={() => criarRota(true)}>Criar só com {confirmados === 1 ? 'o confirmado' : `os ${confirmados} confirmados`}</button>}
                  </div>
              )}
              {passo === 4 && rota.status !== 'rascunho' && (
                exportavel
                  ? <div className="mx-3.5 mt-3 rounded-lg bg-[rgba(58,184,30,.12)] text-[var(--verde-valor)] px-2.5 py-1.5 text-[12px] flex items-center gap-1.5"><Check size={13} className="shrink-0" /> <span>Rota criada e confirmada: as vistorias estão marcadas e a rota pode ser exportada. Mudar uma hora aqui remarca a vistoria.</span></div>
                  : <div className="mx-3.5 mt-3 rounded-lg bg-[var(--laranja-soft)] text-[var(--laranja-txt)] px-2.5 py-1.5 text-[12px] flex items-center gap-1.5"><CircleAlert size={13} className="shrink-0" /> <span>Rota criada, mas {porQueNaoExporta}. A exportação fica bloqueada até todos confirmarem.</span></div>
              )}
              <div className="flex items-center gap-2 px-3.5 pt-3 pb-1">
                {passo === 3
                  ? <span className="card-tit">Agendamento com cada cliente <span className="suave">{avisados} de {paradas.length} agendados</span></span>
                  : <span className="card-tit">Confirmação de cada cliente <span className="suave">{confirmados} de {paradas.length} confirmados</span></span>}
              </div>
              <ul className="flex flex-col gap-2 px-3">
                {paradas.map((p, i) => {
                  const o = osDe(p.osId)!
                  const hora = p.hora ?? chegadas[i]
                  const fone = telefoneWhats(o.whatsapp || o.telefone)
                  const etapa: 0 | 1 | 2 = p.confirmado ? 2 : p.avisado ? 1 : 0
                  const linkZap = fone ? `https://wa.me/${fone}?text=${encodeURIComponent(mensagem(o, hora))}` : ''
                  return (
                    <li key={p.osId} className={clsx('bloco card-kanban card-agenda !rounded-[16px] overflow-hidden flex flex-col', `etapa-${etapa}`)}>
                      {/* quem e a que horas */}
                      <div className="px-3 pt-2.5 pb-2 flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-[var(--brand)] text-white text-[11.5px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-semibold truncate">{o.proponente}</span>
                          <span className="block text-[11.5px] text-muted truncate">{o.contato && o.contato !== o.proponente ? `${o.contato} · ` : ''}{o.telefone || 'sem telefone'} · {o.endereco.bairro || 'Sem bairro'}</span>
                        </span>
                        <label className="flex flex-col items-end gap-0.5 shrink-0" title={`Chegada prevista ~${chegadas[i]}`}>
                          <input type="time" className="input input-sm !h-8 !px-2 tnum w-[92px]" value={hora} disabled={!editavel} onChange={(e) => e.target.value && mudarParada(p.osId, { hora: e.target.value })} />
                          <span className="text-[10.5px] text-muted">prevista ~{chegadas[i]}</span>
                        </label>
                      </div>
                      {/* o fluxo do agendamento, passo a passo: 1 agendar (aba 3) → 2 cliente confirma (aba 4) → confirmado */}
                      <div className="trilha-agenda">
                        <span className={clsx('passo', etapa >= 1 && 'feito', etapa === 0 && 'atual')}>{etapa >= 1 ? <Check size={11} /> : '1'} Agendar</span>
                        <span className="seta" />
                        <span className={clsx('passo', etapa === 2 && 'feito', etapa === 1 && 'atual')}>{etapa === 2 ? <Check size={11} /> : '2'} Cliente confirmou?</span>
                        {/* "Confirmado" só aparece quando o cliente de fato confirmou (pedido de 06/11) */}
                        {etapa === 2 && <><span className="seta" /><span className="passo feito"><Check size={11} /> Confirmado</span></>}
                      </div>
                      {passo === 3 ? (
                        /* aba Agendar: só manda o horário; a confirmação fica para a aba 4 */
                        <div className="acao-agenda">
                          {etapa === 0 && (
                            <>
                              <span className="texto">Ainda não agendado. Mande a mensagem com o horário:</span>
                              {linkZap
                                ? <a className="btn btn-primary btn-sm !h-7" target="_blank" rel="noreferrer" href={linkZap} title="Abre o WhatsApp com a mensagem pronta e marca como agendado" onClick={() => mudarParada(p.osId, { avisado: true })}><MessageCircle size={13} /> Agendar pelo WhatsApp</a>
                                : <span className="chip farol-warn !h-[22px]">sem telefone</span>}
                              <button className="link" disabled={!editavel} onClick={() => mudarParada(p.osId, { avisado: true })} title="Se combinou por ligação ou pessoalmente">já agendei por telefone</button>
                            </>
                          )}
                          {etapa === 1 && (
                            <>
                              <span className="texto"><b>Agendado</b> para {hora}. A resposta do cliente é marcada no passo <button className="font-semibold underline" onClick={() => setPasso(4)}>Confirmar</button>.</span>
                              {linkZap && <a className="btn btn-secondary btn-sm !h-7" target="_blank" rel="noreferrer" href={linkZap} title="Mandar a mensagem de novo"><MessageCircle size={13} /> Reenviar</a>}
                              <button className="link" disabled={!editavel} onClick={() => mudarParada(p.osId, { avisado: false, confirmado: false })} title="Voltar para 'não agendado'">desfazer</button>
                            </>
                          )}
                          {etapa === 2 && (
                            <>
                              <span className="texto"><Check size={13} className="inline -mt-0.5" /> <b>Agendado e confirmado</b> pelo cliente para {hora}.</span>
                              {linkZap && <a className="btn btn-secondary btn-sm !h-7" target="_blank" rel="noreferrer" href={linkZap} title="Mandar a mensagem de novo"><MessageCircle size={13} /> Reenviar</a>}
                            </>
                          )}
                        </div>
                      ) : (
                        /* aba Confirmar: marca a resposta do cliente */
                        <div className="acao-agenda">
                          {etapa === 0 && (
                            <>
                              <span className="texto">Ainda não agendado: volte ao passo <button className="font-semibold underline" onClick={() => setPasso(3)}>Agendar</button> e mande o horário antes.</span>
                            </>
                          )}
                          {etapa === 1 && (
                            <>
                              <span className="texto"><b>Agendado.</b> O cliente respondeu que o horário {hora} está bom?</span>
                              <button className="btn btn-primary btn-sm !h-7" disabled={!editavel} onClick={() => mudarParada(p.osId, { confirmado: true })} title="O cliente respondeu que o horário está confirmado"><Check size={13} /> Cliente confirmou</button>
                              {linkZap && <a className="btn btn-secondary btn-sm !h-7 !px-2" target="_blank" rel="noreferrer" href={linkZap} title="Mandar a mensagem de novo"><MessageCircle size={13} /></a>}
                            </>
                          )}
                          {etapa === 2 && (
                            <>
                              <span className="texto"><Check size={13} className="inline -mt-0.5" /> <b>Agendamento confirmado pelo cliente</b> para {hora}.</span>
                              <button className="link" disabled={!editavel} onClick={() => mudarParada(p.osId, { confirmado: false })} title="O cliente desmarcou ou pediu outro horário">desfazer</button>
                            </>
                          )}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </>
          )
        )}

        {passo === 5 && rota && (
          !exportavel ? (
            <Empty title="Ainda não dá para exportar" text={`${porQueNaoExporta}. Só a rota criada, com todos os agendamentos confirmados, é exportada para o Maps ou o Waze.`}
              action={<button className="btn btn-secondary btn-sm" onClick={() => setPasso(paradas.length ? 4 : 1)}><ArrowLeft size={14} /> {paradas.length ? 'Confirmar' : 'Selecionar'}</button>} />
          ) : (
            <div className="flex flex-col gap-3 px-3.5 py-3">
              <div className="grid grid-cols-3 gap-2">
                <Cartao l="Paradas" v={paradas.length} />
                <Cartao l="Ida e volta" v={fmtKm(km)} sub={comoMediu} />
                <Cartao l="Tempo" v={fmtMin(fimMin - toMin(rota.hora))} sub={`saída ${rota.hora}`} />
              </div>
              <div>
                <div className="card-tit mb-1.5 flex items-center gap-1.5"><Smartphone size={12} /> Google Maps · rota completa</div>
                <p className="text-[12px] text-muted mb-2">Partida → {paradas.length} {paradas.length === 1 ? 'parada' : 'paradas'} na ordem → volta. Copie o link e cole no WhatsApp (para você mesmo); no celular ele abre o Maps com a rota inteira.{linksMaps.length > 1 && <> O Maps aceita 9 paradas por link, então a rota vai em <b>{linksMaps.length} partes</b> emendadas.</>}</p>
                <div className="flex flex-col gap-1.5">
                  {linksMaps.map((l, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <button className="btn btn-primary btn-sm flex-1" onClick={() => copiarLink(`maps${i}`, l)}>{copiado === `maps${i}` ? <><Check size={14} /> Link copiado</> : <><Copy size={14} /> Copiar link do Google Maps{linksMaps.length > 1 ? ` · parte ${i + 1}` : ''}</>}</button>
                      <a className="btn btn-secondary btn-sm" target="_blank" rel="noreferrer" href={l} title="Abre a rota completa no Google Maps"><ExternalLink size={14} /> Abrir</a>
                    </div>
                  ))}
                  <button className="btn btn-secondary btn-sm" onClick={() => copiarLink('roteiro', roteiro())} title="Copia a lista das paradas com hora e endereço mais o link do Maps, para mandar no WhatsApp">{copiado === 'roteiro' ? <><Check size={14} /> Roteiro copiado</> : <><Copy size={14} /> Copiar roteiro em texto (paradas + horas + link)</>}</button>
                </div>
              </div>
              <div>
                <div className="card-tit mb-1.5 flex items-center gap-1.5"><Navigation size={12} /> Waze</div>
                <p className="text-[12px] text-muted mb-2">O Waze não aceita uma rota com várias paradas num link: ele navega para um destino por vez. Siga a ordem abaixo, abrindo a próxima parada ao terminar cada vistoria.</p>
                <ul className="divide-y divide-border border-y border-border">
                  {paradas.map((p, i) => {
                    const o = osDe(p.osId)!
                    const w = temCoordenada(o) ? linkWaze({ lat: o.endereco.lat!, lng: o.endereco.lng! }) : ''
                    return (
                      <li key={p.osId} className="flex items-center gap-2 py-2">
                        <span className="w-6 h-6 rounded-full bg-[var(--brand)] text-white text-[11.5px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-semibold truncate">{o.proponente}</span>
                          <span className="block text-[11.5px] text-muted truncate">{p.hora ?? chegadas[i]} · {o.endereco.bairro || 'Sem bairro'} · {o.endereco.cidade}</span>
                        </span>
                        {w ? (
                          <>
                            <a className="btn btn-secondary btn-sm !h-7 !px-2" target="_blank" rel="noreferrer" href={w} title="Abrir no Waze"><Navigation size={13} /> Waze</a>
                            <button className="btn btn-ghost btn-sm !h-7 !px-2" onClick={() => copiarLink(p.osId, w)} title="Copiar o link do Waze">{copiado === p.osId ? <Check size={13} className="text-[var(--verde-valor)]" /> : <Copy size={13} />}</button>
                          </>
                        ) : <span className="chip farol-warn !h-[20px]">sem coordenadas</span>}
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          )
        )}
      </div>

      {/* rodapé: avançar nos passos e situação da rota */}
      <div className="border-t border-border px-3.5 py-2.5 flex items-center gap-1.5">
        {confirmaExcluir && rota ? (
          <>
            <span className="text-[12.5px] mr-auto">Excluir {rota.codigo}?</span>
            <button className="btn btn-secondary btn-sm" onClick={() => setConfirmaExcluir(false)}>Não</button>
            <button className="btn btn-sm !text-white" style={{ background: 'var(--vermelho)' }} onClick={() => { excluirRota(rota.id); setConfirmaExcluir(false) }}>Excluir</button>
          </>
        ) : (
          <>
            {passo > 1 && <button className="btn btn-secondary btn-sm" onClick={() => setPasso((passo - 1) as Passo)} title="Passo anterior"><ArrowLeft size={14} /></button>}
            <span className="text-[12.5px] text-muted mr-auto">
              {paradas.length === 0 ? 'Nenhuma O.S. marcada' : <><b className="text-[var(--txt)] tnum">{paradas.length}</b> {paradas.length === 1 ? 'parada' : 'paradas'} · <b className="text-[var(--txt)] tnum" title={comoMediu}>{fmtKm(km)}</b>{rota && paradas.length > 0 && <> · <b className="text-[var(--txt)] tnum" title={comoMediu}>{fmtMin(fimMin - toMin(rota.hora))}</b></>}{!trajeto && <span className="ml-1 text-[11px]">({comoMediu})</span>}</>}
            </span>
            {passo === 1 && <button className="btn btn-primary btn-sm" disabled={!paradas.length} onClick={() => ir(2)}>Montar rota <ArrowRight size={14} /></button>}
            {passo === 2 && <button className="btn btn-primary btn-sm" disabled={!paradas.length || semCoord > 0} title={semCoord ? 'Cole as coordenadas de todas as paradas antes' : 'Combinar o horário com cada cliente'} onClick={() => ir(3)}>Agendar <ArrowRight size={14} /></button>}
            {passo === 3 && <button className="btn btn-primary btn-sm" disabled={!avisados} title={!avisados ? 'Agende com pelo menos um cliente antes' : avisados < paradas.length ? `${paradas.length - avisados === 1 ? '1 cliente' : `${paradas.length - avisados} clientes`} ainda sem agendar; dá para confirmar os já agendados` : 'Marcar a resposta de cada cliente'} onClick={() => ir(4)}>Confirmar <ArrowRight size={14} /></button>}
            {passo === 4 && rota?.status === 'rascunho' && <button className="btn btn-primary btn-sm" disabled={!paradas.length || semCoord > 0 || confirmados < paradas.length} title={semCoord ? 'Cole as coordenadas de todas as paradas antes' : confirmados < paradas.length ? `Falta ${paradas.length - confirmados === 1 ? '1 cliente' : `${paradas.length - confirmados} clientes`} confirmar o agendamento` : 'Cria a rota, marca a vistoria de cada parada no dia e libera a exportação'} onClick={() => criarRota()}><Check size={14} /> Criar rota</button>}
            {passo === 4 && rota && rota.status !== 'rascunho' && <button className="btn btn-primary btn-sm" disabled={!exportavel} title={exportavel ? 'Levar a rota completa para o celular' : porQueNaoExporta} onClick={() => ir(5)}>Exportar <ArrowRight size={14} /></button>}
            {passo === 5 && rota?.status === 'confirmada' && <button className="btn btn-primary btn-sm" onClick={() => { avancarRota(rota.id); escolher('') }} title="Marca a rota como feita: as vistorias ficam feitas e a rota sai do planejamento"><Check size={14} /> Concluir rota</button>}
            {passo === 5 && rota?.status === 'confirmada' && <button className="btn btn-ghost btn-sm" onClick={() => cancelarRota(rota.id)}>Cancelar</button>}
            {rota && <button className="btn btn-ghost btn-icon !w-8 !h-8" onClick={() => setConfirmaExcluir(true)} title="Excluir a rota"><Trash2 size={14} /></button>}
          </>
        )}
      </div>
    </section>
  )
}

function Cartao({ l, v, sub }: { l: string; v: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-[12px] border border-border px-3 py-2">
      <div className="card-tit">{l}</div>
      <div className="text-[17px] font-bold tnum leading-tight">{v}</div>
      {sub && <div className="text-[11px] text-muted">{sub}</div>}
    </div>
  )
}

/** Miolo do cartão da O.S., igual ao cartão aprovado do Kanban: OS | tipologia, cliente, etiqueta do polo, cidade e rua. */
function MioloOS({ os, direita }: { os: OS; direita?: React.ReactNode }) {
  return (
    <>
      <div className="flex items-center gap-2">
        <b className="text-[13px] tnum px-2 h-[22px] inline-flex items-center rounded-md bg-[var(--surface-2)]">{codigoOS(os)}</b>
        <span className="w-px h-4 bg-[var(--border)]" />
        <TipologiaChip t={os.tipologia} className="!h-[22px] !text-[11.5px] !px-2" />
        {direita && <span className="ml-auto flex items-center gap-1">{direita}</span>}
      </div>
      <div className="text-[14px] font-bold leading-tight mt-1 truncate" title={os.proponente}>{os.proponente}</div>
      <div className="mt-1" title={`Polo: ${poloDe(os.endereco.cidade)} · ${os.endereco.cidade} — ${os.endereco.logradouro}, ${os.endereco.numero}`}>
        <span className="polo-kanban inline-flex items-center gap-1 h-[17px] px-1.5 rounded-[5px] text-[9.5px] font-semibold uppercase tracking-[.04em]">
          <MapPin size={9} /><span className="opacity-75">Polo</span><b>{poloDe(os.endereco.cidade)}</b>
        </span>
        <div className="flex items-center gap-1.5 text-[11.5px] text-muted mt-1 min-w-0 leading-tight">
          <b className="shrink-0 text-[12px] uppercase tracking-[.03em] cidade-kanban">{os.endereco.cidade}</b>
          <span className="truncate">· {os.endereco.bairro || 'sem bairro'} · {os.endereco.logradouro}, {os.endereco.numero}</span>
        </div>
      </div>
    </>
  )
}

/** Passo 1: cartão da O.S. em aberto, com caixa de marcar e as coordenadas sempre à mostra. */
function LinhaEscolha({ os, marcada, podeMarcar, onAlternar }: { os: OS; marcada: boolean; podeMarcar: boolean; onAlternar: () => void }) {
  return (
    <li>
      <article className={clsx('bloco card-kanban card-rota !rounded-[16px] px-3 py-2.5 flex gap-2.5', marcada && 'marcado', podeMarcar && 'cursor-pointer')} onClick={() => podeMarcar && onAlternar()}>
        <input type="checkbox" className="accent-[var(--brand)] w-4 h-4 shrink-0 mt-[3px]" checked={marcada} disabled={!podeMarcar} onChange={onAlternar} onClick={(e) => e.stopPropagation()} aria-label={`Pôr ${codigoOS(os)} na rota`} />
        <div className="min-w-0 flex-1" onClick={(e) => { if ((e.target as HTMLElement).closest('input, a, button')) e.stopPropagation() }}>
          <MioloOS os={os} direita={marcada && <span className="chip chip-v !h-[22px] !text-[11px] !px-2">Na rota</span>} />
          <CampoCoordenadas os={os} />
        </div>
      </article>
    </li>
  )
}

/** Passo 2: cartão da parada (arrastável), com número, hora prevista e as coordenadas sempre à mostra. */
function LinhaParada({ os, i, chegada, editavel, novoBairro, onRemover }: { os: OS; i: number; chegada: string; editavel: boolean; novoBairro: boolean; onRemover: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: os.id, disabled: !editavel })
  const bairro = os.endereco.bairro || 'Sem bairro'
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={clsx(isDragging && 'relative z-10')}>
      {/* etiqueta do bairro só na primeira parada de cada bairro: mostra a rota agrupada */}
      {novoBairro && <div className={clsx('pb-1 text-[10.5px] font-bold uppercase tracking-[.08em] text-[var(--verde-valor)]', i > 0 && 'pt-1.5')}><MapPin size={10} className="inline -mt-0.5 mr-0.5" />{bairro} · {os.endereco.cidade}</div>}
      <article className={clsx('bloco card-kanban card-rota !rounded-[16px] px-3 py-2.5 flex gap-2.5', isDragging && 'shadow-lg marcado')}>
        <div className="flex flex-col items-center gap-1 shrink-0">
          <span className="w-6 h-6 rounded-full bg-[var(--brand)] text-white text-[11.5px] font-bold flex items-center justify-center">{i + 1}</span>
          {editavel && <button className="text-muted cursor-grab touch-none" aria-label="Arrastar para mudar a ordem" title="Arraste para mudar a ordem" {...attributes} {...listeners}><GripVertical size={16} /></button>}
        </div>
        <div className="min-w-0 flex-1">
          <MioloOS os={os} direita={<>
            <span className="chip !h-[22px] !text-[11px] !px-2 bg-[var(--surface-2)] tnum" title="Chegada prevista">~{chegada}</span>
            {editavel && <button className="btn btn-ghost btn-icon !w-6 !h-6" aria-label="Tirar da rota" title="Tirar da rota" onClick={onRemover}><X size={13} /></button>}
          </>} />
          <CampoCoordenadas os={os} />
        </div>
      </article>
    </li>
  )
}

/** Coordenadas sempre à mostra (pedido de 06/11): mostra as atuais no formato do Maps; colar outras salva ao sair/Enter. */
function CampoCoordenadas({ os, recuo }: { os: OS; recuo?: boolean }) {
  const definirLocalizacao = useStore((s) => s.definirLocalizacao)
  const atual = textoGMS(os.endereco.lat, os.endereco.lng)
  const [v, setV] = useState(atual)
  useEffect(() => { setV(atual) }, [atual])
  const c = lerCoordenadas(v)
  // mudou de verdade? compara no mesmo formato (o texto do Maps arredonda a décimos de segundo)
  const mudou = !!c && textoGMS(c.lat, c.lng) !== atual
  const salvar = () => { if (c && mudou) definirLocalizacao(os.id, c.lat, c.lng) }
  const tem = temCoordenada(os)
  // campo sempre visível e claramente editável (pedido de 06/11): rótulo explica que é para o ponto da rota ficar certo
  return (
    <div className={clsx('mt-2', recuo && 'pl-[26px]')}>
      <div className="flex items-center gap-1.5 mb-0.5">
        <MapPin size={11} className={clsx('shrink-0', tem ? 'text-[var(--verde-valor)]' : 'text-[var(--laranja)]')} />
        <span className="card-tit !text-[10.5px]">Coordenadas do imóvel <span className="suave normal-case tracking-normal font-medium">{tem ? '· editável: corrija o ponto da rota' : '· cole do Google Maps (ponto da rota)'}</span></span>
      </div>
      <div className="flex items-center gap-1.5">
        <input className={clsx('input campo-coord !h-7 !px-2 !text-[12px] tnum flex-1 min-w-0', !tem && 'sem-coord')} placeholder="Cole aqui as coordenadas do Google Maps" value={v}
          onChange={(e) => setV(e.target.value)} onBlur={salvar} onKeyDown={(e) => { if (e.key === 'Enter') { salvar(); (e.target as HTMLInputElement).blur() } }} title="Editável: no Google Maps, clique com o botão direito no imóvel e copie a primeira linha (as coordenadas); cole aqui e dê Enter" />
        {mudou ? <button className="chip chip-l !h-[22px]" onClick={salvar}>salvar</button> : !c && v.trim() ? <span className="chip farol-warn !h-[22px]">não entendi</span> : <Pencil size={12} className="text-muted shrink-0" aria-hidden />}
        <a className="text-muted hover:text-[var(--verde-valor)] shrink-0" target="_blank" rel="noreferrer" href={tem ? `https://www.google.com/maps/search/?api=1&query=${os.endereco.lat},${os.endereco.lng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enderecoMaps(os))}`} title="Abrir no Google Maps para conferir ou copiar as coordenadas"><ExternalLink size={12} /></a>
      </div>
    </div>
  )
}

/** Origem da rota (de onde sai e para onde volta): nome do lugar + coordenadas coladas do Google Maps, editáveis na hora. */
function CampoOrigem({ rota, editavel, onSalvar, onPadrao }: { rota: Rota; editavel: boolean; onSalvar: (p: Rota['partida']) => void; onPadrao: () => void }) {
  const atual = rota.partida
  const atualGMS = textoGMS(atual.lat, atual.lng)
  const [nome, setNome] = useState(atual.endereco)
  const [v, setV] = useState(atualGMS)
  useEffect(() => { setNome(atual.endereco) }, [atual.endereco])
  useEffect(() => { setV(atualGMS) }, [atualGMS])
  const c = lerCoordenadas(v)
  const mudou = nome.trim() !== atual.endereco || (!!c && textoGMS(c.lat, c.lng) !== atualGMS)
  const salvar = () => { if (editavel && mudou && c && nome.trim()) onSalvar({ endereco: nome.trim(), lat: c.lat, lng: c.lng }) }
  const aoEnter = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { salvar(); (e.target as HTMLInputElement).blur() } }
  return (
    <div className="bloco card-kanban card-origem !rounded-[16px] pl-4 pr-3 py-3 flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className="ico-origem"><Home size={14} /></span>
        <span className="card-tit">Origem <span className="suave">de onde a rota sai e volta</span></span>
        {editavel && <button className="ml-auto text-[11.5px] font-semibold text-[var(--verde-valor)]" onClick={onPadrao} title="Trocar a origem e, se quiser, guardar como base padrão das próximas rotas">base padrão</button>}
      </div>
      <input className="input nome-origem !px-2.5" placeholder="Nome do lugar (ex.: Escritório, Casa)" value={nome} disabled={!editavel}
        onChange={(e) => setNome(e.target.value)} onBlur={salvar} onKeyDown={aoEnter} />
      <div className="flex items-center gap-1.5">
        <MapPin size={12} className={clsx('shrink-0', c ? 'text-[var(--verde-valor)]' : 'text-[var(--laranja)]')} />
        <input className={clsx('input !h-7 !px-1.5 !text-[12px] tnum flex-1 min-w-0 !bg-transparent', !mudou && '!border-transparent hover:!border-border focus:!border-border')} placeholder="Cole aqui as coordenadas do Google Maps" value={v} disabled={!editavel}
          onChange={(e) => setV(e.target.value)} onBlur={salvar} onKeyDown={aoEnter} title="Coordenadas da origem (no Google Maps, clique com o botão direito no ponto e copie a primeira linha)" />
        {mudou && c && nome.trim() ? <button className="chip chip-l !h-[22px]" onClick={salvar}>salvar</button> : !c && v.trim() ? <span className="chip farol-warn !h-[22px]">não entendi</span> : null}
        <a className="text-muted hover:text-[var(--verde-valor)] shrink-0" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${atual.lat},${atual.lng}`} title="Ver no Google Maps"><ExternalLink size={12} /></a>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- Rotas salvas
function ListaRotas({ abrir }: { abrir: (id: string) => void }) {
  const rotas = useStore((s) => s.rotas)
  const todas = useStore((s) => s.os)
  const escopo = useStore((s) => s.escopo)
  const config = useStore((s) => s.config)
  const [status, setStatus] = useState<StatusRota[]>([])
  const [periodo, setPeriodo] = useState<Periodo>('todos')
  const [ref, setRef] = useState(() => startOfMonth(new Date()))
  const [especifico, setEspecifico] = useState({ ini: '', fim: '' })
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
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        <Numero n={elegiveis} t="OS em aberto para rota" />
        <Numero n={ativasHoje} t="Rotas em aberto" />
        <Numero n={concluidasMes} t="Rotas concluídas (mês)" />
      </div>

      {porTecnico.length === 0 ? (
        <div className="card"><Empty title="Nenhuma rota com esses filtros" text="Monte uma rota em Planejar." /></div>
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
                    <span className="text-[13px] min-w-[150px]">{r.descricao || config.responsaveis[r.responsavel].nome}</span>
                    <span className="text-[13px] text-muted">{r.paradas.length} {r.paradas.length === 1 ? 'parada' : 'paradas'}</span>
                    <span className="text-[13px] text-muted tnum">{dataMedia(r.data)}</span>
                    <span className="text-[13px] text-muted tnum">{fmtKm(distanciaRota(r.partida, pts))}</span>
                    <span className="ml-auto text-[12.5px] font-semibold text-[var(--verde-valor)]">Abrir no mapa</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
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

// ---------------------------------------------------------------- Trocar base / partida
function TrocarBase({ rota, onClose }: { rota?: Rota; onClose: () => void }) {
  const config = useStore((s) => s.config)
  const setConfig = useStore((s) => s.setConfig)
  const atualizarRota = useStore((s) => s.atualizarRota)
  const atual = rota?.partida ?? config.base
  const [endereco, setEndereco] = useState(atual.endereco)
  const [coord, setCoord] = useState(textoGMS(atual.lat, atual.lng))
  const [padrao, setPadrao] = useState(!rota)
  const c = lerCoordenadas(coord)
  const valido = endereco.trim() && c
  const salvar = () => {
    if (!c) return
    const base = { endereco: endereco.trim(), lat: c.lat, lng: c.lng }
    if (rota) atualizarRota(rota.id, { partida: base })
    if (padrao || !rota) setConfig({ base })
    onClose()
  }
  return (
    <Modal open onClose={onClose} title={rota ? 'Partida da rota' : 'Base das rotas'} width={480}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-primary" disabled={!valido} onClick={salvar}>Salvar</button></>}>
      <p className="text-[12.5px] text-muted mb-3">De onde a rota sai e para onde volta. Cole as coordenadas como o Google Maps copia.</p>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1"><span className="text-[12px] text-muted font-medium">Endereço</span><input className="input" value={endereco} onChange={(e) => setEndereco(e.target.value)} /></label>
        <label className="flex flex-col gap-1"><span className="text-[12px] text-muted font-medium">Coordenadas</span>
          <span className="flex items-center gap-2"><input className="input tnum flex-1" value={coord} placeholder={'9°52\'45.8"S 63°02\'23.5"W'} onChange={(e) => setCoord(e.target.value)} />{c ? <span className="chip chip-v !h-[22px]">ok</span> : coord.trim() ? <span className="chip farol-warn !h-[22px]">não entendi</span> : null}</span>
        </label>
        {rota && <label className="flex items-center gap-2 text-[12.5px]"><input type="checkbox" className="accent-[var(--brand)]" checked={padrao} onChange={(e) => setPadrao(e.target.checked)} /> Usar como base padrão das próximas rotas</label>}
      </div>
    </Modal>
  )
}
