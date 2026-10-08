import { format } from 'date-fns'
import { ArrowRight, Route as RouteIcon } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Avatar, Card, Empty, FarolChip, Kpi, PageHeader, StatusChip } from '../components/ui'
import { STATUS_ABERTOS, STATUS_META, cap, dataLonga, enderecoLinha, farolDe, refCurta } from '../lib/os'
import { fmtMin, resumoRota } from '../lib/rota'
import { filtrarEscopo, useStore } from '../store/useStore'
import type { Status } from '../types'

export function Painel() {
  const todas = useStore((s) => s.os)
  const escopo = useStore((s) => s.escopo)
  const usuario = useStore((s) => s.usuario)
  const config = useStore((s) => s.config)
  const rotas = useStore((s) => s.rotas)
  const nav = useNavigate()
  const hoje = format(new Date(), 'yyyy-MM-dd')

  const os = useMemo(() => filtrarEscopo(todas, escopo), [todas, escopo])
  const abertas = os.filter((o) => STATUS_ABERTOS.includes(o.status))

  const kpis = useMemo(() => {
    const f = abertas.map((o) => ({ o, ...farolDe(o) }))
    return {
      vencidas: f.filter((x) => x.farol === 'late').length,
      hoje: f.filter((x) => x.dias === 0 || x.dias === 1).length,
      tresDias: f.filter((x) => x.farol === 'warn').length,
      convocadas: abertas.filter((o) => o.status === 'convocada').length,
      aAgendar: abertas.filter((o) => o.status === 'emitida').length,
      laudoPendente: abertas.filter((o) => o.status === 'vistoriada').length,
      diligencia: abertas.filter((o) => o.status === 'diligencia').length,
    }
  }, [abertas])

  const prioridades = useMemo(
    () => abertas.map((o) => ({ o, f: farolDe(o) })).filter((x) => x.f.dias !== null && x.f.dias <= 3).sort((a, b) => a.f.dias! - b.f.dias!).slice(0, 8),
    [abertas],
  )

  const respRota = escopo === 'rt' ? 'rt' : usuario
  const rota = rotas.find((r) => r.id === `${hoje}_${respRota}`) ?? { paradas: [] as { osId: string; inicio: string; duracao: number; deslocamento: number }[] }
  const paradasHoje = rota.paradas.map((p) => ({ p, o: todas.find((o) => o.id === p.osId)! })).filter((x) => x.o).sort((a, b) => a.p.inicio.localeCompare(b.p.inicio))
  const resumo = resumoRota(rota.paradas)

  const porStatus = STATUS_ABERTOS.map((st) => ({ st, n: os.filter((o) => o.status === st).length }))
  const maxStatus = Math.max(1, ...porStatus.map((x) => x.n))

  const irFiltrado = (status?: Status, farol?: string) => nav(`/os?${status ? `status=${status}` : ''}${farol ? `&farol=${farol}` : ''}`)

  return (
    <>
      <PageHeader
        title={`Bom dia${escopo === 'luan' ? `, ${config.responsaveis.luan.curto}` : ''}`}
        subtitle={cap(dataLonga(hoje))}
        actions={<Link to="/rota" className="btn btn-primary"><RouteIcon size={15} /> Montar rota de hoje</Link>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3 mb-5">
        <Kpi label="Vencidas" value={kpis.vencidas} tone="farol-late" onClick={() => irFiltrado(undefined, 'late')} hint="prazo passou" />
        <Kpi label="Vence hoje/amanhã" value={kpis.hoje} tone="farol-urgent" onClick={() => irFiltrado(undefined, 'urgent')} />
        <Kpi label="Em 2–3 dias" value={kpis.tresDias} tone="farol-warn" onClick={() => irFiltrado(undefined, 'warn')} />
        <Kpi label="Convocadas" value={kpis.convocadas} tone="status-convocada" onClick={() => irFiltrado('convocada')} hint="aceitar em 24h" />
        <Kpi label="A agendar" value={kpis.aAgendar} tone="status-emitida" onClick={() => irFiltrado('emitida')} />
        <Kpi label="Laudo pendente" value={kpis.laudoPendente} tone="status-vistoriada" onClick={() => irFiltrado('vistoriada')} />
        <Kpi label="Em diligência" value={kpis.diligencia} tone="status-diligencia" onClick={() => irFiltrado('diligencia')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
        <Card title="Prioridades — próximos 3 dias" actions={<Link to="/os" className="btn btn-ghost btn-sm">Ver carteira <ArrowRight size={14} /></Link>} pad={false}>
          {prioridades.length === 0 ? (
            <Empty title="Nada urgente" text="Nenhuma O.S. aberta vence nos próximos 3 dias." />
          ) : (
            <ul className="divide-y divide-border">
              {prioridades.map(({ o }) => (
                <li key={o.id}>
                  <Link to={`/os/${o.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2">
                    <FarolChip os={o} className="w-[104px] justify-center" />
                    <span className="tnum text-muted w-12">#{refCurta(o.referencia)}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-medium truncate">{o.proponente}</span>
                      <span className="block text-[12px] text-muted truncate">{enderecoLinha(o)}</span>
                    </span>
                    <StatusChip status={o.status} curto />
                    {escopo === 'todas' && <Avatar resp={o.responsavel} size={22} />}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="flex flex-col gap-4">
          <Card
            title={<span className="flex items-center gap-2">Rota de hoje <Avatar resp={respRota} size={18} /></span>}
            actions={<Link to="/rota" className="btn btn-ghost btn-sm">Abrir <ArrowRight size={14} /></Link>}
            pad={false}
          >
            {paradasHoje.length === 0 ? (
              <Empty title="Sem rota montada" text="Monte a rota do dia a partir das O.S. a agendar." action={<Link to="/rota" className="btn btn-secondary btn-sm mt-1">Montar rota</Link>} />
            ) : (
              <>
                <ul className="divide-y divide-border">
                  {paradasHoje.map(({ p, o }, i) => (
                    <li key={o.id}>
                      <Link to={`/os/${o.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2">
                        <span className="tnum font-semibold w-12">{p.inicio}</span>
                        <span className="w-5 h-5 rounded-full bg-brand-soft text-brand-strong text-[11px] font-semibold flex items-center justify-center">{i + 1}</span>
                        <span className="flex-1 min-w-0">
                          <span className="block font-medium truncate">{o.proponente}</span>
                          <span className="block text-[12px] text-muted truncate">{o.endereco.bairro} · {o.endereco.cidade}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="px-4 py-2.5 text-[12px] text-muted border-t border-border flex gap-3 tnum">
                  <span>{resumo.inicio}–{resumo.fim}</span>
                  <span>{paradasHoje.length} paradas</span>
                  <span>{fmtMin(resumo.deslocMin)} de deslocamento</span>
                </div>
              </>
            )}
          </Card>

          <Card title="Carteira aberta por etapa">
            <ul className="flex flex-col gap-2">
              {porStatus.map(({ st, n }) => (
                <li key={st} className="flex items-center gap-3 text-[12.5px]">
                  <button className="w-[120px] text-left text-muted hover:text-text" onClick={() => irFiltrado(st)}>{STATUS_META[st].curto}</button>
                  <div className="flex-1 h-5 rounded-md bg-surface-2 overflow-hidden">
                    <div className={`h-full status-${st} rounded-md`} style={{ width: `${(n / maxStatus) * 100}%`, minWidth: n ? 6 : 0 }} />
                  </div>
                  <span className="tnum w-6 text-right font-medium">{n}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  )
}
