import { CircleAlert, Clock, Database, Info, Link as LinkIcon, MoveHorizontal, Sigma, type LucideIcon } from 'lucide-react'
import { fmtMoeda, fmtNum, type resumo } from '../../lib/amostragem/calculo'

type Resumo = ReturnType<typeof resumo>

function Kpi({ Icone, rotulo, valor, sub, amarelo }: { Icone: LucideIcon; rotulo: string; valor: string; sub?: string; amarelo?: boolean }) {
  return (
    <div className={`card kpi-ficha ${amarelo ? 'kpi-amarelo' : ''}`}>
      <span className="kpi-ic"><Icone size={16} /></span>
      <div className="min-w-0">
        <div className="card-tit truncate">{rotulo}</div>
        <div className="v">{valor}</div>
        {sub && <div className="s">{sub}</div>}
      </div>
    </div>
  )
}

/** Indicadores da amostragem: dados usados, média e faixa do valor unitário e os dados a atualizar. */
export function Indicadores({ r, total, unidade, meses }: { r: Resumo; total: number; unidade: string; meses: number }) {
  return (
    <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      <Kpi Icone={Database} rotulo="Dados usados" valor={`${r.usados} de ${total}`} sub={r.inativos ? `${r.inativos} descartados no saneamento` : 'entram no cálculo'} />
      <Kpi Icone={Sigma} rotulo={`Média (${unidade})`} valor={fmtMoeda(r.est?.media)} />
      <Kpi Icone={MoveHorizontal} rotulo="Mínimo – máximo" valor={r.est ? `${fmtNum(r.est.min, 0)} – ${fmtNum(r.est.max, 0)}` : '—'} sub={unidade} />
      <Kpi Icone={Clock} rotulo="A atualizar" valor={String(r.vencidos)} sub={`coleta com mais de ${meses} meses`} amarelo={r.vencidos > 0} />
    </section>
  )
}

export type Aviso = { tom: 'amarelo' | 'vermelho' | 'info'; texto: string; fonte?: boolean }
const ICONE = { amarelo: Clock, vermelho: CircleAlert, info: Info } as const

/** Avisos da amostragem em faixas coloridas (amarelo = atualizar, vermelho = corrigir, cinza = informação). */
export function Avisos({ itens }: { itens: (Aviso | false)[] }) {
  const lista = itens.filter((x): x is Aviso => !!x)
  if (!lista.length) return null
  return (
    <div className="flex flex-col gap-1.5">
      {lista.map((a, i) => {
        const Icone = a.fonte ? LinkIcon : ICONE[a.tom]
        return (
          <div key={i} className={`aviso-ficha aviso-${a.tom}`}>
            <Icone size={15} />
            <span>{a.texto}</span>
          </div>
        )
      })}
    </div>
  )
}
