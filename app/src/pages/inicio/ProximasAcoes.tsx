import clsx from 'clsx'
import { useState } from 'react'
import { Segmented } from '../../components/ui'
import { farolDe } from '../../lib/os'
import { AgendaHoje, ChegaramDaCaixa, LinhaOS, SugestaoViagem, useDadosInicio } from './comum'

type Filtro = 'todas' | 'aberto' | 'finalizar' | 'vencidas'

/** Ideia 2 — Próximas ações: uma lista só, da mais urgente para a menos, cada O.S. com o próximo passo e o botão. */
export function IdeiaProximasAcoes() {
  const { itens, aberto, finalizar, os, escopo } = useDadosInicio()
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const vencidas = itens.filter((i) => farolDe(i.os).farol === 'late')
  const lista = filtro === 'aberto' ? aberto : filtro === 'finalizar' ? finalizar : filtro === 'vencidas' ? vencidas : itens
  const opc = (v: Filtro, l: string, n: number) => ({ value: v, label: <>{l}<span className={clsx('tnum text-[12px] font-bold', v === 'vencidas' && n ? 'text-[var(--vermelho)]' : 'opacity-70')}>{n}</span></> })

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-3 items-start">
      <section className="card overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 border-b border-border">
          <h2 className="card-tit">Próximas ações <span className="suave">da mais urgente para a menos</span></h2>
          <Segmented<Filtro> value={filtro} onChange={setFiltro} options={[
            opc('todas', 'Todas', itens.length), opc('aberto', 'Em aberto', aberto.length),
            opc('finalizar', 'A finalizar', finalizar.length), opc('vencidas', 'Vencidas', vencidas.length),
          ]} />
        </header>
        {lista.length === 0 ? <p className="text-[13px] text-muted text-center py-10">Nada pendente aqui.</p> : (
          <ol className="flex flex-col p-1.5 max-h-[calc(100vh-235px)] overflow-y-auto">
            {lista.map((i, n) => (
              <li key={i.os.id} className={clsx('flex items-center', n > 0 && 'border-t border-border/60')}>
                <span className={clsx('w-[3px] self-stretch rounded-full my-1.5', { late: 'bg-[var(--vermelho)]', urgent: 'bg-[var(--laranja)]', warn: 'bg-[var(--laranja)]/60', ok: 'bg-[var(--brand)]/50', pausa: 'bg-[var(--azul)]', none: 'bg-[var(--seg)]' }[farolDe(i.os).farol])} />
                <LinhaOS item={i} className="flex-1 min-w-0" />
              </li>
            ))}
          </ol>
        )}
        <footer className="px-3 py-2 border-t border-border text-[11.5px] text-muted">
          Cada botão avança a O.S. um passo: <b className="text-[var(--text)]">Vistoria feita → Laudo pronto → Assinado → Concluir</b>. Agendar e Responder abrem a O.S.
        </footer>
      </section>
      <aside className="flex flex-col gap-2.5">
        <AgendaHoje itens={itens} />
        <SugestaoViagem itens={aberto} escopo={escopo} />
        <ChegaramDaCaixa os={os} />
      </aside>
    </div>
  )
}
