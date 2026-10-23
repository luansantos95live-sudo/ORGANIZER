import clsx from 'clsx'
import { addWeeks, format, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Check, ChevronLeft, ChevronRight, GripVertical } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { diasDaSemana } from '../../lib/faturamento'
import { agendaDaSemana, proximoHorario } from '../../lib/inicio'
import { cap, codigoOS, farolDe } from '../../lib/os'
import { useStore } from '../../store/useStore'
import { CartaoOS, LinhaOS, useDadosInicio } from './comum'

const nomeDoDia = (d: Date) => cap(format(d, 'EEEE', { locale: ptBR }).replace('-feira', ''))

/** Ideia 5 — Semana de trabalho: arraste as O.S. sem data para o dia da vistoria; embaixo, o que falta finalizar. */
export function IdeiaSemana() {
  const { itens, porAcao, finalizar, hoje } = useDadosInicio()
  const agendar = useStore((s) => s.agendar)
  const duracao = useStore((s) => s.config.duracaoVistoria)
  const [semana, setSemana] = useState(0)
  const [sobre, setSobre] = useState<string | null>(null)
  const dias = diasDaSemana(addWeeks(hoje, semana))
  const agenda = agendaDaSemana(itens.map((i) => i.os), dias, hoje)
  const semData = porAcao.agendar

  const soltar = (data: string, id: string) => {
    const dia = agenda.find((d) => d.data === data)
    if (id) agendar(id, data, proximoHorario(dia?.vistorias ?? [], duracao))
    setSobre(null)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[270px_1fr] gap-3 items-start">
        {/* bandeja: O.S. sem data marcada */}
        <section className="card flex flex-col max-h-[calc(100vh-200px)] lg:sticky lg:top-[76px]">
          <header className="px-3 py-2.5 border-b border-border">
            <div className="flex items-baseline gap-2"><h2 className="card-tit">Sem vistoria marcada</h2><span className="tnum font-bold text-[var(--laranja-txt)]">{semData.length}</span></div>
            <p className="text-[11.5px] text-muted mt-0.5 flex items-center gap-1"><GripVertical size={12} />Arraste para um dia para agendar</p>
          </header>
          <div className="flex flex-col gap-1.5 p-2 overflow-y-auto">
            {semData.length === 0 ? <p className="text-[12px] text-muted text-center py-5">Todas agendadas.</p>
              : semData.map((i) => <CartaoOS key={i.os.id} item={i} acao={false} arrastavel />)}
          </div>
        </section>

        <div className="flex flex-col gap-3 min-w-0">
        {/* semana */}
        <section className="card overflow-hidden">
          <header className="flex items-center gap-2 px-3 py-2 border-b border-border">
            <button className="btn btn-ghost btn-icon !w-7 !h-7" aria-label="Semana anterior" onClick={() => setSemana(semana - 1)}><ChevronLeft size={16} /></button>
            <h2 className="font-semibold text-[14px]">{semana === 0 ? 'Esta semana' : semana === 1 ? 'Semana que vem' : semana === -1 ? 'Semana passada' : 'Semana'}
              <span className="text-muted font-normal text-[12.5px] ml-2">{format(dias[0], "d 'de' MMM", { locale: ptBR })} a {format(dias[6], "d 'de' MMM", { locale: ptBR })}</span></h2>
            <button className="btn btn-ghost btn-icon !w-7 !h-7" aria-label="Próxima semana" onClick={() => setSemana(semana + 1)}><ChevronRight size={16} /></button>
            {semana !== 0 && <button className="btn btn-secondary btn-sm ml-auto" onClick={() => setSemana(0)}>Hoje</button>}
          </header>
          <div className="grid grid-cols-1 sm:grid-cols-7 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border)] min-h-[300px]">
            {agenda.map((d, n) => {
              const dia = dias[n]
              const eHoje = isSameDay(dia, hoje)
              const passou = !eHoje && dia < hoje
              return (
                <div key={d.data} title={format(dia, "EEEE, d 'de' MMMM", { locale: ptBR })}
                  onDragOver={(e) => { if (!passou) { e.preventDefault(); setSobre(d.data) } }} onDragLeave={() => setSobre(null)}
                  onDrop={(e) => { e.preventDefault(); soltar(d.data, e.dataTransfer.getData('text/os')) }}
                  className={clsx('flex flex-col p-1.5 transition', sobre === d.data && 'bg-[var(--brand-soft)]', passou && 'opacity-60')}>
                  <div className={clsx('flex items-center gap-1.5 px-1.5 py-1 rounded-md mb-1', eHoje && 'bg-[var(--brand)] text-white')}>
                    <span className="text-[12.5px] font-semibold">{nomeDoDia(dia)}</span>
                    {d.vistorias.length > 0 && <span className={clsx('tnum text-[11px] font-bold ml-auto', eHoje ? 'text-white' : 'text-muted')}>{d.vistorias.length} vist.</span>}
                  </div>
                  <div className="flex flex-col gap-1">
                    {d.vistorias.map((o) => (
                      <Link key={o.id} to={`/os/${o.id}`} className="rounded-md border border-border bg-[var(--campo)] px-1.5 py-1 hover:border-[var(--brand)]">
                        <div className="flex items-center gap-1">
                          <span className="tnum text-[11.5px] font-bold">{o.vistoria!.hora}</span>
                          {(o.vistoria!.feita || o.vistoria!.data < format(hoje, 'yyyy-MM-dd')) && <Check size={12} className="text-[var(--verde-valor)]" />}
                          <span className="tnum text-[10.5px] text-muted ml-auto">{codigoOS(o)}</span>
                        </div>
                        <div className="text-[11.5px] font-medium truncate">{o.proponente}</div>
                        <div className="text-[10.5px] text-muted truncate">{o.endereco.cidade}</div>
                      </Link>
                    ))}
                    {d.vencem.map((o) => {
                      const f = farolDe(o, hoje).farol
                      return (
                        <Link key={`v-${o.id}`} to={`/os/${o.id}`} className={clsx('chip !h-auto !py-1 !rounded-md !justify-start text-[11px] truncate', f === 'late' ? 'farol-late' : 'chip-l')}>
                          {codigoOS(o)} {f === 'late' ? 'venceu' : 'vence'}
                        </Link>
                      )
                    })}
                    {sobre === d.data && <div className="rounded-md border-2 border-dashed border-[var(--brand)] text-[11px] text-center py-2 text-[var(--verde-valor)]">Soltar: {proximoHorario(d.vistorias, duracao)}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

      {/* o que falta fechar */}
      <section className="card overflow-hidden">
        <header className="flex items-baseline gap-2 px-3 py-2.5 border-b border-border">
          <h2 className="card-tit">A finalizar</h2><span className="tnum font-bold">{finalizar.length}</span>
          <span className="text-[12px] text-muted">laudo, assinatura, envio e devoluções, do mais urgente para o menos</span>
        </header>
        {finalizar.length === 0 ? <p className="text-[13px] text-muted text-center py-6">Nada para finalizar.</p> : (
          <div className="grid grid-cols-1 2xl:grid-cols-2 gap-x-2 p-1.5">
            {finalizar.map((i) => <LinhaOS key={i.os.id} item={i} />)}
          </div>
        )}
      </section>
      </div>
    </div>
  )
}

