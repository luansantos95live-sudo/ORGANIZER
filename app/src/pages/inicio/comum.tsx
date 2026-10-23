import clsx from 'clsx'
import { addDays, format, parseISO } from 'date-fns'
import { CalendarClock, CalendarPlus, Camera, Check, FilePen, FileText, FileWarning, Inbox, Lightbulb, Send, type LucideIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FarolChip, TipologiaChip } from '../../components/ui'
import { ACAO_META, ACOES, PASSOS, porUrgencia, proximaAcao, type Acao } from '../../lib/inicio'
import { codigoOS } from '../../lib/os'
import { elegivelParaRota, sugestaoDeViagem } from '../../lib/rota'
import { filtrarEscopo, useStore } from '../../store/useStore'
import type { OS } from '../../types'

// Cor e ícone de cada passo, pelo significado (mesmas cores do resto do sistema).
export const ACAO_VISUAL: Record<Acao, { tom: string; Icone: LucideIcon }> = {
  agendar: { tom: 'laranja', Icone: CalendarPlus },
  vistoriar: { tom: 'ciano', Icone: Camera },
  laudo: { tom: 'azul', Icone: FileText },
  assinar: { tom: 'rt', Icone: FilePen },
  enviar: { tom: 'verde', Icone: Send },
  responder: { tom: 'vermelho', Icone: FileWarning },
}

export interface ItemOS { os: OS; acao: Acao }

/** Dados que todas as ideias do Início usam: O.S. abertas do escopo, cada uma com o próximo passo, da mais urgente para a menos. */
export function useDadosInicio() {
  const todas = useStore((s) => s.os)
  const escopoGlobal = useStore((s) => s.escopo)
  // O Início do sistema real tem só "Só minhas" e "Minha equipe".
  const escopo = escopoGlobal === 'todas' ? 'luan' : escopoGlobal
  return useMemo(() => {
    const hoje = new Date()
    const os = filtrarEscopo(todas, escopo)
    const itens: ItemOS[] = porUrgencia(os, hoje).flatMap((o) => { const acao = proximaAcao(o, hoje); return acao ? [{ os: o, acao }] : [] })
    const porAcao = Object.fromEntries(ACOES.map((a) => [a, itens.filter((i) => i.acao === a)])) as Record<Acao, ItemOS[]>
    const aberto = itens.filter((i) => ACAO_META[i.acao].grupo === 'aberto')
    const finalizar = itens.filter((i) => ACAO_META[i.acao].grupo === 'finalizar')
    return { hoje, escopo, os, itens, porAcao, aberto, finalizar }
  }, [todas, escopo])
}

/** Faz o próximo passo: os que só avançam a etapa são feitos aqui; agendar e responder abrem a O.S. no lugar certo. */
export function useFazerAcao() {
  const nav = useNavigate()
  const mudarStatus = useStore((s) => s.mudarStatus)
  const marcarVistoriaFeita = useStore((s) => s.marcarVistoriaFeita)
  return (o: OS, acao: Acao) => {
    if (acao === 'agendar') nav(`/os/${o.id}?aba=vistoria`)
    else if (acao === 'responder') nav(`/os/${o.id}`)
    else if (acao === 'vistoriar') marcarVistoriaFeita(o.id)
    else if (acao === 'laudo') mudarStatus(o.id, 'assinatura_pendente', 'Laudo pronto, enviado para assinatura do RT')
    else if (acao === 'assinar') mudarStatus(o.id, 'assinatura_concluida', 'Laudo assinado pelo RT')
    else mudarStatus(o.id, 'concluida', 'Laudo enviado à Caixa. O.S. concluída')
  }
}

export function BotaoAcao({ item, primario, className }: { item: ItemOS; primario?: boolean; className?: string }) {
  const fazer = useFazerAcao()
  const m = ACAO_META[item.acao]
  return (
    <button className={clsx('btn btn-sm shrink-0', primario ? 'btn-primary' : 'btn-secondary', className)} title={m.descricao}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); fazer(item.os, item.acao) }}>
      {item.acao === 'vistoriar' || item.acao === 'assinar' ? <Check size={13} /> : null}{m.botao}
    </button>
  )
}

/** Selo colorido com o nome do próximo passo. */
export function SeloAcao({ acao }: { acao: Acao }) {
  const { tom, Icone } = ACAO_VISUAL[acao]
  return (
    <span className={clsx('inline-flex items-center gap-1 h-[22px] px-2 rounded-md text-[11.5px] font-semibold whitespace-nowrap', `tom-${tom}`)} style={{ background: 'var(--tom-bg)', color: 'var(--tom)' }}>
      <Icone size={12} />{ACAO_META[acao].label}
    </span>
  )
}

/** Barrinha Vistoria → Laudo → Assinatura → Envio, com o passo atual em destaque. */
export function Progresso({ acao, className }: { acao: Acao; className?: string }) {
  const atual = ACAO_META[acao].passo - 1 // agendar/vistoriar = antes do 1º passo concluído
  return (
    <span className={clsx('inline-flex items-center gap-1', className)} title={ACAO_META[acao].descricao}>
      {PASSOS.map((p, i) => (
        <span key={p} className="flex flex-col items-center gap-0.5">
          <span className={clsx('h-[5px] w-[34px] rounded-full', i < atual ? 'bg-[var(--brand)]' : i === atual ? (acao === 'responder' ? 'bg-[var(--vermelho)]' : 'bg-[var(--laranja)]') : 'bg-[var(--seg)]')} />
          <span className={clsx('text-[9.5px] leading-none', i === atual ? 'text-[var(--text)] font-semibold' : 'text-muted')}>{p}</span>
        </span>
      ))}
    </span>
  )
}

/** Linha de O.S. com prazo e próximo passo; clicar abre a O.S. */
export function LinhaOS({ item, selo = true, acao = true, extra, className }: { item: ItemOS; selo?: boolean; acao?: boolean; extra?: React.ReactNode; className?: string }) {
  const o = item.os
  return (
    <Link to={`/os/${o.id}`} className={clsx('flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[rgba(58,184,30,.07)]', className)}>
      <span className="tnum text-[11.5px] font-bold text-muted w-[46px] shrink-0">{codigoOS(o)}</span>
      <TipologiaChip t={o.tipologia} className="!h-[20px] !text-[10.5px] shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium">{o.proponente}</span>
        <span className="block truncate text-[11.5px] text-muted">{o.endereco.bairro} · {o.endereco.cidade}{item.acao === 'vistoriar' && o.vistoria ? ` · vistoria ${format(new Date(`${o.vistoria.data}T12:00`), 'dd/MM')} ${o.vistoria.hora}` : ''}</span>
      </span>
      {extra}
      {selo && <SeloAcao acao={item.acao} />}
      <FarolChip os={o} className="!h-[22px] shrink-0" />
      {acao && <BotaoAcao item={item} />}
    </Link>
  )
}

/** Cartão compacto para colunas (quadro, prazos, semana). */
export function CartaoOS({ item, selo, acao = true, arrastavel }: { item: ItemOS; selo?: boolean; acao?: boolean; arrastavel?: boolean }) {
  const o = item.os
  return (
    <Link to={`/os/${o.id}`} draggable={arrastavel} onDragStart={arrastavel ? (e) => e.dataTransfer.setData('text/os', o.id) : undefined}
      className={clsx('block rounded-[10px] border border-border bg-[var(--campo)] px-2.5 py-2 hover:border-[var(--brand)]', arrastavel && 'cursor-grab active:cursor-grabbing')}>
      <div className="flex items-center gap-1.5">
        <span className="tnum text-[11px] font-bold text-muted">{codigoOS(o)}</span>
        <TipologiaChip t={o.tipologia} className="!h-[18px] !text-[10px] !px-1.5" />
        <FarolChip os={o} className="!h-[19px] !text-[10.5px] !px-1.5 ml-auto" />
      </div>
      <div className="text-[12.5px] font-semibold truncate mt-1">{o.proponente}</div>
      <div className="text-[11px] text-muted truncate">{o.endereco.bairro} · {o.endereco.cidade}</div>
      {(selo || acao) && (
        <div className="flex items-center gap-1.5 mt-1.5">
          {selo && <SeloAcao acao={item.acao} />}
          {acao && <BotaoAcao item={item} className="!h-[24px] !px-2 !text-[11.5px] ml-auto" />}
        </div>
      )}
    </Link>
  )
}

/** Agenda de hoje (vistorias marcadas), igual à do Início atual. */
export function AgendaHoje({ itens }: { itens: ItemOS[] }) {
  const hoje = format(new Date(), 'yyyy-MM-dd')
  const lista = itens.filter((i) => i.os.vistoria?.data === hoje).sort((a, b) => a.os.vistoria!.hora.localeCompare(b.os.vistoria!.hora))
  return (
    <section className="card px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="card-tit">Agenda de hoje</h3>
        <span className="text-[12px] text-muted">{lista.length} {lista.length === 1 ? 'vistoria' : 'vistorias'}</span>
      </div>
      {lista.length === 0 ? (
        <p className="text-[12.5px] text-muted bg-surface-2 rounded-lg px-3 py-2.5 flex items-center gap-2"><CalendarClock size={14} />Nenhuma vistoria marcada para hoje.</p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {lista.map((i) => (
            <li key={i.os.id}>
              <Link to={`/os/${i.os.id}`} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-[rgba(58,184,30,.08)]">
                <span className="tnum font-bold text-[13px] w-11">{i.os.vistoria!.hora}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">{i.os.proponente}</span>
                  <span className="block truncate text-[11.5px] text-muted">{i.os.endereco.bairro} · {i.os.endereco.cidade}</span>
                </span>
                {i.acao === 'vistoriar' ? <BotaoAcao item={i} /> : <span className="chip chip-v !h-[22px]"><Check size={12} />Feita</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** Cabeçalho de coluna/seção com ícone colorido, nome e quantidade. */
export function TituloAcao({ acao, qtd, children }: { acao: Acao; qtd: number; children?: React.ReactNode }) {
  const { tom, Icone } = ACAO_VISUAL[acao]
  return (
    <div className={clsx('flex items-center gap-2', `tom-${tom}`)}>
      <span className="ic-tom w-7 h-7 rounded-lg"><Icone size={15} /></span>
      <span className="font-semibold text-[13.5px]">{ACAO_META[acao].label}</span>
      <span className="tnum font-bold text-[15px]" style={{ color: qtd ? 'var(--tom)' : 'var(--muted)' }}>{qtd}</span>
      {children}
    </div>
  )
}

/** Sugestão de viagem: várias O.S. sem data na mesma cidade viram uma rota para amanhã. */
export function SugestaoViagem({ itens, escopo }: { itens: ItemOS[]; escopo: 'luan' | 'rt' }) {
  const rotas = useStore((s) => s.rotas)
  const config = useStore((s) => s.config)
  const criarRota = useStore((s) => s.criarRota)
  const nav = useNavigate()
  const [fechada, setFechada] = useState(false)
  const cidadeBase = (config.base.endereco.split(',').pop() ?? '').split('/')[0]
  const sugestao = fechada ? null : sugestaoDeViagem(itens.map((i) => i.os).filter((o) => elegivelParaRota(o, rotas)), cidadeBase, rotas)
  if (!sugestao) return null
  const amanha = addDays(new Date(), 1)
  const montar = () => {
    const id = criarRota(sugestao.os.map((o) => o.id), { data: format(amanha, 'yyyy-MM-dd'), descricao: `Viagem para ${sugestao.cidade}`, responsavel: escopo })
    nav(`/rotas?aba=rotas&rota=${id}`)
  }
  return (
    <section className="card faixa-resumo px-4 py-3">
      <div className="text-[10.5px] font-bold uppercase tracking-[.09em] text-[var(--verde-valor)] flex items-center gap-1.5"><Lightbulb size={13} />Sugestão</div>
      <p className="font-semibold text-[14px] mt-1">Faça as {sugestao.os.length} vistorias de {sugestao.cidade} na mesma viagem.</p>
      <p className="text-[12px] text-muted mt-1 leading-snug">{sugestao.os.map((o) => codigoOS(o)).join(', ')} ainda não têm data marcada.</p>
      <div className="flex gap-2 mt-2.5">
        <button className="btn btn-primary btn-sm" onClick={montar}>Montar rota para {format(amanha, 'dd/MM')}</button>
        <button className="btn btn-ghost btn-sm" onClick={() => setFechada(true)}>Agora não</button>
      </div>
    </section>
  )
}

/** O.S. que chegaram da Caixa pelo e-mail, as mais novas primeiro. */
export function ChegaramDaCaixa({ os }: { os: OS[] }) {
  const lista = os.filter((o) => o.origem === 'email').sort((a, b) => b.emissao.localeCompare(a.emissao)).slice(0, 5)
  return (
    <section className="card px-4 py-3">
      <div className="flex items-center justify-between mb-1">
        <h3 className="card-tit flex items-center gap-1.5"><Inbox size={13} />Chegaram da CAIXA</h3>
        <Link to="/os?origem=email" className="text-[12px] font-semibold text-[var(--verde-valor)]">Ver todas</Link>
      </div>
      {lista.length === 0 ? <p className="text-[12.5px] text-muted">Nenhuma O.S. importada do e-mail.</p> : (
        <ul className="flex flex-col gap-0.5">
          {lista.map((o) => (
            <li key={o.id}>
              <Link to={`/os/${o.id}`} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-[rgba(58,184,30,.08)]">
                <span className="tnum text-[11px] font-bold text-muted bg-surface-2 rounded-md px-1.5 py-1 shrink-0">{codigoOS(o)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">{o.proponente}</span>
                  <span className="block truncate text-[11.5px] text-muted">{o.endereco.logradouro}, {o.endereco.numero} | {o.endereco.bairro}</span>
                </span>
                <span className="text-[11px] text-muted tnum shrink-0">{format(parseISO(o.emissao), 'dd/MM')}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
