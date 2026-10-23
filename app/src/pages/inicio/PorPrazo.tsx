import clsx from 'clsx'
import { FAIXAS, FAIXA_META, faixaDePrazo, type Faixa } from '../../lib/inicio'
import { CartaoOS, useDadosInicio, type ItemOS } from './comum'

const COR: Record<(typeof FAIXA_META)[Faixa]['tom'], string> = { vermelho: 'var(--vermelho)', laranja: 'var(--laranja)', neutro: 'var(--border)', azul: 'var(--azul)' }

/** Ideia 3 — Por prazo: as O.S. abertas em colunas pelo quando vencem; o que vence primeiro fica à esquerda. */
export function IdeiaPorPrazo() {
  const { itens, hoje } = useDadosInicio()
  const grupos = Object.fromEntries(FAIXAS.map((f) => [f, [] as ItemOS[]])) as Record<Faixa, ItemOS[]>
  for (const i of itens) grupos[faixaDePrazo(i.os, hoje)].push(i)
  const urgentes = grupos.vencidas.length + grupos.hoje.length + grupos.amanha.length
  // Pausadas só aparecem quando existem.
  const faixas = FAIXAS.filter((f) => f !== 'pausadas' || grupos.pausadas.length)

  return (
    <>
      <p className={clsx('card faixa-resumo px-4 py-2.5 mb-3 text-[13.5px]', urgentes && '!border-l-[var(--vermelho)]')}>
        {urgentes
          ? <>Comece pela esquerda: <b className="text-[var(--vermelho)]">{grupos.vencidas.length} vencidas</b>, <b className="text-[var(--laranja-txt)]">{grupos.hoje.length} vencem hoje</b> e <b className="text-[var(--laranja-txt)]">{grupos.amanha.length} amanhã</b>.</>
          : <>Nenhuma O.S. vencida ou vencendo até amanhã. {grupos.semana.length} vencem nos próximos 7 dias.</>}
      </p>
      <div className="flex gap-2.5 overflow-x-auto pb-2">
        {faixas.map((f) => (
          <section key={f} className="card flex flex-col flex-1 min-w-[230px] max-h-[calc(100vh-235px)]" style={{ borderTop: `3px solid ${COR[FAIXA_META[f].tom]}` }}>
            <header className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
              <span className="font-semibold text-[13.5px]">{FAIXA_META[f].label}</span>
              <span className="tnum font-bold text-[15px] ml-auto" style={{ color: grupos[f].length && FAIXA_META[f].tom !== 'neutro' ? COR[FAIXA_META[f].tom] : 'var(--muted)' }}>{grupos[f].length}</span>
            </header>
            <div className="flex flex-col gap-1.5 p-2 overflow-y-auto">
              {grupos[f].length === 0
                ? <p className="text-[12px] text-muted text-center py-5">Nada aqui</p>
                : grupos[f].map((i) => <CartaoOS key={i.os.id} item={i} selo />)}
            </div>
          </section>
        ))}
      </div>
    </>
  )
}
