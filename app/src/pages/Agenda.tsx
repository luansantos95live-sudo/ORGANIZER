import clsx from 'clsx'
import { addDays, format, isSameDay, parseISO, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar, PageHeader } from '../components/ui'
import { refCurta } from '../lib/os'
import { toMin } from '../lib/rota'
import { filtrarEscopo, useStore } from '../store/useStore'

const H0 = 7, H1 = 19, PX_H = 56

export function Agenda() {
  const todas = useStore((s) => s.os)
  const escopo = useStore((s) => s.escopo)
  const [ref, setRef] = useState(new Date())
  const ini = startOfWeek(ref, { weekStartsOn: 1 })
  const dias = Array.from({ length: 6 }, (_, i) => addDays(ini, i))
  const hoje = new Date()

  const eventos = useMemo(
    () => filtrarEscopo(todas, escopo).filter((o) => o.vistoria && ['agendada', 'vistoriada', 'laudo_enviado', 'diligencia', 'finalizada'].includes(o.status)),
    [todas, escopo],
  )

  return (
    <>
      <PageHeader
        title="Agenda"
        subtitle={`Semana de ${format(ini, "d 'de' MMMM", { locale: ptBR })} · ${eventos.filter((o) => dias.some((d) => isSameDay(d, parseISO(o.vistoria!.data)))).length} vistorias`}
        actions={
          <div className="flex items-center gap-1">
            <button className="btn btn-secondary btn-icon" onClick={() => setRef(addDays(ref, -7))} aria-label="Semana anterior"><ChevronLeft size={16} /></button>
            <button className="btn btn-secondary btn-sm" onClick={() => setRef(new Date())}>Hoje</button>
            <button className="btn btn-secondary btn-icon" onClick={() => setRef(addDays(ref, 7))} aria-label="Próxima semana"><ChevronRight size={16} /></button>
          </div>
        }
      />
      <div className="card overflow-auto">
        <div className="grid min-w-[860px]" style={{ gridTemplateColumns: `56px repeat(${dias.length}, 1fr)` }}>
          <div className="border-b border-border bg-surface-2 sticky top-0 z-10" />
          {dias.map((d) => (
            <div key={d.toISOString()} className={clsx('border-b border-l border-border bg-surface-2 px-3 py-2 sticky top-0 z-10', isSameDay(d, hoje) && 'text-brand-strong')}>
              <div className="text-[11px] uppercase font-semibold tracking-wide capitalize">{format(d, 'EEE', { locale: ptBR })}</div>
              <div className={clsx('text-lg font-semibold tnum leading-none', isSameDay(d, hoje) && 'inline-block bg-brand text-white rounded-md px-1.5 py-0.5')}>{format(d, 'd')}</div>
            </div>
          ))}
          <div className="relative" style={{ height: (H1 - H0) * PX_H }}>
            {Array.from({ length: H1 - H0 }, (_, i) => i === 0 ? null : (
              <div key={i} className="absolute right-2 text-[11px] text-muted tnum -translate-y-1/2" style={{ top: i * PX_H }}>{String(H0 + i).padStart(2, '0')}:00</div>
            ))}
          </div>
          {dias.map((d) => {
            const doDia = eventos.filter((o) => isSameDay(parseISO(o.vistoria!.data), d))
            return (
              <div key={d.toISOString()} className="relative border-l border-border" style={{ height: (H1 - H0) * PX_H, backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px)', backgroundSize: `100% ${PX_H}px` }}>
                {doDia.map((o) => {
                  const top = ((toMin(o.vistoria!.hora) - H0 * 60) / 60) * PX_H
                  const h = Math.max(28, (o.vistoria!.duracao / 60) * PX_H)
                  const cor = o.responsavel === 'luan' ? 'var(--brand)' : 'var(--rt)'
                  const soft = o.responsavel === 'luan' ? 'var(--brand-soft)' : 'var(--rt-soft)'
                  const feita = o.status !== 'agendada'
                  return (
                    <Link
                      key={o.id}
                      to={`/os/${o.id}`}
                      className="absolute left-1 right-1 rounded-md px-2 py-1 overflow-hidden text-[12px] leading-tight hover:brightness-95"
                      style={{ top, height: h, background: soft, borderLeft: `3px solid ${cor}`, opacity: feita ? 0.6 : 1 }}
                      title={`${o.vistoria!.hora} · ${o.proponente} · ${o.endereco.bairro}`}
                    >
                      <div className="flex items-center gap-1">
                        <span className="tnum font-semibold">{o.vistoria!.hora}</span>
                        {escopo === 'todas' && <Avatar resp={o.responsavel} size={14} />}
                        <span className="text-muted tnum">#{refCurta(o.referencia)}</span>
                      </div>
                      <div className={clsx('font-medium truncate', feita && 'line-through')}>{o.proponente}</div>
                      <div className="text-muted truncate">{o.endereco.bairro} · {o.endereco.cidade}</div>
                    </Link>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
