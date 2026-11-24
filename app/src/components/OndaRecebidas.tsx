import clsx from 'clsx'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChartSpline } from 'lucide-react'
import { useState, type PointerEvent } from 'react'
import { caminhoOnda, tetoDoEixo } from '../lib/onda'

export interface SerieOnda { id: string; nome: string; cor: string; valores: number[] }

const mesCurto = (m: string) => format(parseISO(`${m}-01`), 'MMM', { locale: ptBR }).replace('.', '')
const mesLongo = (m: string) => format(parseISO(`${m}-01`), "MMMM 'de' yyyy", { locale: ptBR })

/**
 * "Recebidas mês a mês" (pedido de 24/11): curva suave das O.S. recebidas nos últimos meses, uma linha por pessoa.
 * Em "Todas" compara o dono e o RT; com uma pessoa escolhida, só a dela. Passar o mouse mostra os números do mês.
 * A cor acompanha a pessoa (dono verde, RT roxo), nunca a posição.
 */
export function OndaRecebidas({ meses, series }: { meses: string[]; series: SerieOnda[] }) {
  const [foco, setFoco] = useState<number | null>(null)
  const n = meses.length
  const teto = tetoDoEixo(Math.max(0, ...series.flatMap((s) => s.valores)))
  const x = (i: number) => (n < 2 ? 50 : (i / (n - 1)) * 100)
  const y = (v: number) => 100 - (v / teto) * 100
  const linha = (s: SerieOnda) => caminhoOnda(s.valores.map((v, i) => [x(i), y(v)]))
  const sozinha = series.length === 1
  const atual = n - 1
  const mover = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    setFoco(Math.max(0, Math.min(n - 1, Math.round(((e.clientX - r.left) / r.width) * (n - 1)))))
  }
  const pontos = (i: number) => series.map((s) => (
    <span key={s.id} className="pointer-events-none absolute w-2 h-2 rounded-full -translate-x-1/2 -translate-y-1/2 border-2 border-[var(--surface)] box-content"
      style={{ left: `${x(i)}%`, top: `${y(s.valores[i] ?? 0)}%`, background: s.cor }} />
  ))

  return (
    <section className="bloco p-5 flex flex-col gap-2 min-w-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 leading-tight">
          <h2 className="text-[13px] font-semibold text-muted">Recebidas mês a mês</h2>
          <span className="text-[11.5px] text-muted">últimos {n} meses{sozinha ? ` · ${series[0]?.nome ?? ''}` : ''}</span>
        </div>
        <span className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center bg-[var(--brand-soft)] text-[var(--verde-valor)]"><ChartSpline size={18} /></span>
      </div>

      {/* legenda: quem é cada linha e quantas recebeu no mês atual */}
      {!sozinha && (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {series.map((s) => (
            <span key={s.id} className="flex items-center gap-1.5 text-[12px]">
              <span className="w-3.5 h-[3px] rounded-full" style={{ background: s.cor }} />
              <span className="font-semibold">{s.nome}</span>
              <span className="tnum text-muted">{s.valores[atual] ?? 0}</span>
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-[18px_1fr] gap-x-1.5 flex-1 min-h-0">
        {/* eixo: teto, metade e zero */}
        <div className="relative min-h-[96px] text-[10px] leading-none text-muted tnum">
          <span className="absolute right-0 top-0 -translate-y-1/2">{teto}</span>
          <span className="absolute right-0 top-1/2 -translate-y-1/2">{teto / 2}</span>
          <span className="absolute right-0 bottom-0 translate-y-1/2">0</span>
        </div>
        <div className="relative min-h-[96px] cursor-crosshair touch-none" role="img"
          aria-label={`O.S. recebidas por mês: ${series.map((s) => `${s.nome}: ${s.valores.join(', ')}`).join('; ')}`}
          onPointerMove={mover} onPointerDown={mover} onPointerLeave={() => setFoco(null)}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full overflow-visible">
            <defs>
              {series.map((s) => (
                <linearGradient key={s.id} id={`onda-${s.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.cor} stopOpacity={sozinha ? 0.28 : 0.12} />
                  <stop offset="100%" stopColor={s.cor} stopOpacity="0" />
                </linearGradient>
              ))}
            </defs>
            {[0, 50, 100].map((g) => (
              <line key={g} x1="0" x2="100" y1={g} y2={g} stroke="var(--border)" strokeWidth="1" strokeDasharray={g === 100 ? undefined : '3 4'} vectorEffect="non-scaling-stroke" />
            ))}
            {series.map((s) => <path key={`a-${s.id}`} d={`${linha(s)} L100,100 L0,100 Z`} fill={`url(#onda-${s.id})`} />)}
            {series.map((s) => (
              <path key={`l-${s.id}`} d={linha(s)} fill="none" stroke={s.cor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            ))}
          </svg>

          {/* ponto do mês atual em cada linha; passando o mouse, a linha do mês, os pontos e os números */}
          {foco === null ? pontos(atual) : (
            <>
              <span className="pointer-events-none absolute top-0 bottom-0 w-px bg-[var(--muted)] opacity-40" style={{ left: `${x(foco)}%` }} />
              {pontos(foco)}
              <div className="pointer-events-none absolute top-0 z-10 min-w-[118px] rounded-lg border border-border bg-[var(--surface)] px-2.5 py-1.5 text-[11.5px] shadow-lg"
                style={{ left: `${x(foco)}%`, transform: foco === 0 ? 'translateX(4px)' : foco === n - 1 ? 'translateX(calc(-100% - 4px))' : 'translateX(-50%)' }}>
                <div className="mb-0.5 font-semibold capitalize">{mesLongo(meses[foco])}</div>
                {series.map((s) => (
                  <div key={s.id} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: s.cor }} />
                    <span className="flex-1 text-muted">{s.nome}</span>
                    <b className="tnum">{s.valores[foco] ?? 0}</b>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <span />
        <div className="mt-1.5 flex justify-between text-[10.5px] text-muted">
          {meses.map((m, i) => (
            <span key={m} className={clsx('w-0 whitespace-nowrap text-center capitalize', i === atual && 'font-bold text-[var(--text)]')}
              style={{ transform: i === 0 ? 'translateX(0)' : i === n - 1 ? 'translateX(-100%)' : 'translateX(-50%)' }}>{mesCurto(m)}</span>
          ))}
        </div>
      </div>

      {/* a mesma informação em tabela, para leitor de tela */}
      <table className="sr-only">
        <caption>O.S. recebidas por mês</caption>
        <thead><tr><th>Mês</th>{series.map((s) => <th key={s.id}>{s.nome}</th>)}</tr></thead>
        <tbody>
          {meses.map((m, i) => <tr key={m}><td>{mesLongo(m)}</td>{series.map((s) => <td key={s.id}>{s.valores[i]}</td>)}</tr>)}
        </tbody>
      </table>
    </section>
  )
}
