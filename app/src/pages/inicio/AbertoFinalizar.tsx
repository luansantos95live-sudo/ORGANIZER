import clsx from 'clsx'
import { addDays, format } from 'date-fns'
import { ChevronRight, Route } from 'lucide-react'
import { Fragment } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FarolChip, TipologiaChip } from '../../components/ui'
import { ACAO_META, type Acao } from '../../lib/inicio'
import { codigoOS, normCidade } from '../../lib/os'
import { elegivelParaRota } from '../../lib/rota'
import { useStore } from '../../store/useStore'
import { ACAO_VISUAL, BotaoAcao, LinhaOS, Progresso, useDadosInicio, type ItemOS } from './comum'

const FUNIL: Acao[] = ['agendar', 'vistoriar', 'laudo', 'assinar', 'enviar', 'responder']

/** Ideia 4 — Em aberto × A finalizar: duas metades. À esquerda o que falta vistoriar (por cidade, para montar a viagem); à direita o que falta fechar (com o progresso). */
export function IdeiaAbertoFinalizar() {
  const { porAcao, aberto, finalizar, escopo } = useDadosInicio()
  const rotas = useStore((s) => s.rotas)
  const criarRota = useStore((s) => s.criarRota)
  const nav = useNavigate()

  // Em aberto agrupado por cidade, cidades com mais O.S. primeiro.
  const cidades = new Map<string, ItemOS[]>()
  for (const i of aberto) { const c = normCidade(i.os.endereco.cidade); cidades.set(c, [...(cidades.get(c) ?? []), i]) }
  const grupos = [...cidades.entries()].sort((a, b) => b[1].length - a[1].length)
  // Devoluções sempre no topo do "a finalizar".
  const fechar = [...finalizar].sort((a, b) => Number(b.acao === 'responder') - Number(a.acao === 'responder'))

  const montarRota = (cidade: string, itens: ItemOS[]) => {
    const ids = itens.filter((i) => i.acao === 'agendar' && elegivelParaRota(i.os, rotas)).map((i) => i.os.id)
    const id = criarRota(ids, { data: format(addDays(new Date(), 1), 'yyyy-MM-dd'), descricao: `Viagem para ${cidade}`, responsavel: escopo })
    nav(`/rotas?aba=rotas&rota=${id}`)
  }

  return (
    <>
      {/* funil: quantas O.S. em cada passo */}
      <div className="card flex flex-wrap items-stretch mb-3 overflow-hidden">
        {FUNIL.map((a, n) => {
          const { tom, Icone } = ACAO_VISUAL[a]
          const qtd = porAcao[a].length
          return (
            <Fragment key={a}>
              {n === 2 && <span className="w-px bg-[var(--border)] my-2" aria-hidden />}
              <div className={clsx('flex-1 min-w-[140px] flex items-center gap-2.5 px-3 py-2.5', `tom-${tom}`)}>
                <span className="ic-tom w-8 h-8 rounded-lg"><Icone size={16} /></span>
                <span className="min-w-0">
                  <span className="block text-[11px] text-muted leading-tight">{n < 2 ? 'Em aberto' : 'A finalizar'}</span>
                  <span className="block text-[13px] font-semibold leading-tight truncate">{ACAO_META[a].label}</span>
                </span>
                <span className="tnum font-bold text-[20px] ml-auto" style={{ color: qtd ? 'var(--tom)' : 'var(--fraco)' }}>{qtd}</span>
                {n < FUNIL.length - 2 && <ChevronRight size={14} className="text-[var(--fraco)] shrink-0" />}
              </div>
            </Fragment>
          )
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 items-start">
        <section className="card overflow-hidden">
          <header className="flex items-baseline gap-2 px-3 py-2.5 border-b border-border">
            <h2 className="card-tit">Em aberto</h2><span className="tnum font-bold">{aberto.length}</span>
            <span className="text-[12px] text-muted">antes da vistoria · por cidade</span>
          </header>
          <div className="max-h-[calc(100vh-290px)] overflow-y-auto p-1.5">
            {grupos.length === 0 && <p className="text-[13px] text-muted text-center py-8">Todas as vistorias feitas.</p>}
            {grupos.map(([cidade, itens]) => {
              const semData = itens.filter((i) => i.acao === 'agendar').length
              return (
                <div key={cidade} className="mb-1.5">
                  <div className="flex items-center gap-2 px-3 pt-2 pb-1">
                    <span className="text-[11px] font-bold uppercase tracking-[.08em] text-muted">{cidade}</span>
                    <span className="text-[11.5px] text-muted">· {itens.length} O.S.{semData ? `, ${semData} sem data` : ''}</span>
                    {semData >= 2 && <button className="btn btn-ghost btn-sm !h-6 !px-2 ml-auto text-[var(--verde-valor)]" onClick={() => montarRota(cidade, itens)}><Route size={13} /> Montar rota</button>}
                  </div>
                  {itens.map((i) => <LinhaOS key={i.os.id} item={i} />)}
                </div>
              )
            })}
          </div>
        </section>

        <section className="card overflow-hidden">
          <header className="flex items-baseline gap-2 px-3 py-2.5 border-b border-border">
            <h2 className="card-tit">A finalizar</h2><span className="tnum font-bold">{finalizar.length}</span>
            <span className="text-[12px] text-muted">depois da vistoria · até enviar à Caixa</span>
          </header>
          <ul className="max-h-[calc(100vh-290px)] overflow-y-auto p-1.5">
            {fechar.length === 0 && <p className="text-[13px] text-muted text-center py-8">Nada para finalizar.</p>}
            {fechar.map((i) => (
              <li key={i.os.id}>
                <Link to={`/os/${i.os.id}`} className={clsx('flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2 rounded-lg hover:bg-[rgba(58,184,30,.07)]', i.acao === 'responder' && 'bg-[var(--vermelho-soft)]')}>
                  <span className="tnum text-[11.5px] font-bold text-muted w-[46px] shrink-0">{codigoOS(i.os)}</span>
                  <TipologiaChip t={i.os.tipologia} className="!h-[20px] !text-[10.5px] shrink-0" />
                  <span className="min-w-[140px] flex-1">
                    <span className="block truncate text-[13px] font-medium">{i.os.proponente}</span>
                    <span className="block truncate text-[11.5px] text-muted">{i.acao === 'responder' && i.os.devolucao?.motivo ? `Devolvida: ${i.os.devolucao.motivo}` : `${i.os.endereco.bairro} · ${i.os.endereco.cidade}`}</span>
                  </span>
                  <Progresso acao={i.acao} />
                  <FarolChip os={i.os} className="!h-[22px] shrink-0" />
                  <BotaoAcao item={i} primario={i.acao === 'responder'} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  )
}
