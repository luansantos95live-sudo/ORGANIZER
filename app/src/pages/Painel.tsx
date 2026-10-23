import clsx from 'clsx'
import { differenceInCalendarDays, format, isSameDay, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AlertTriangle, CalendarPlus, Check, CircleCheck, Inbox, ChevronLeft, ChevronRight, FileText, MessageCircle, PauseCircle, Phone, Plus, type LucideIcon } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { NovaOS } from '../components/NovaOS'
import { PausarOS } from '../components/PausarOS'
import { TIPOLOGIAS, cap, codigoOS, dataMedia, enderecoLinha, farolDe, prazoAtual, telefoneWhats, TIPOLOGIAS_SEM_VISTORIA } from '../lib/os'
import { diasDaSemana } from '../lib/faturamento'
import { alertas, emPept, porTipologia } from '../lib/inicio'
import { estadoPassos, passosDaOS, proximoPasso } from '../lib/passos'
import type { PassoKey, Tipologia } from '../types'
import { filtrarEscopo, useStore } from '../store/useStore'
import type { OS } from '../types'

const saudacao = (h: number) => (h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite')
// Nome curto de cada passo, para a trilha do cartão de prioridade.
const CURTO: Record<PassoKey, string> = { recebida: 'Recebida', baixar_docs: 'Docs', analisar_docs: 'Análise', pept: 'PEPT', marcar_vistoria: 'Agendar', fazer_vistoria: 'Vistoria', avaliacao: 'Avaliação', simil: 'SIMIL', baixar_laudo: 'Laudo', assinar: 'Assinar', enviar: 'Enviar' }
/** Selo do cartão de prioridade: sempre o prazo da O.S. (vence hoje, amanhã, em N dias ou venceu). */
function textoPrazo(o: OS) {
  const p = prazoAtual(o)
  const d = differenceInCalendarDays(parseISO(p), new Date())
  if (d < 0) return `Venceu há ${-d} ${d === -1 ? 'dia' : 'dias'}`
  if (d === 0) return 'Vence hoje'
  if (d === 1) return 'Vence amanhã'
  return `Vence em ${d} dias · ${format(parseISO(p), 'dd/MM')}`
}
const nomeDoDia = (d: Date) => cap(format(d, 'EEEE', { locale: ptBR }).replace('-feira', ''))

/** Em que passo a O.S. está, do jeito que o credenciado fala. */
function passo(o: OS, hojeStr: string): 'agendar' | 'vistoria' | 'laudo' | null {
  if (o.status === 'concluida' || o.status === 'cancelada' || o.pausadoEm) return null
  if (TIPOLOGIAS_SEM_VISTORIA.includes(o.tipologia)) return 'laudo'
  if (!o.vistoria) return o.status === 'recebida' ? 'agendar' : 'laudo'
  return o.vistoria.data > hojeStr ? 'vistoria' : 'laudo'
}

/**
 * Início em blocos (direção B escolhida pelo usuário em 20/10/2026): a próxima vistoria em destaque,
 * blocos de Vencidas, Para agendar, Laudos a fazer e Em PEPT, a semana em barras e o que chegou por e-mail.
 */
export function Painel() {
  const todas = useStore((s) => s.os)
  const escopoGlobal = useStore((s) => s.escopo)
  const config = useStore((s) => s.config)
  const [novaOpen, setNovaOpen] = useState(false)
  const hoje = new Date()
  const hojeStr = format(hoje, 'yyyy-MM-dd')
  // O escopo vem da barra de cima (Minhas · Marco · Todas).
  const escopo = escopoGlobal
  const os = useMemo(() => filtrarEscopo(todas, escopo), [todas, escopo])
  const ativas = os.filter((o) => passo(o, hojeStr))
  const porPrazo = (l: OS[]) => [...l].sort((a, b) => prazoAtual(a).localeCompare(prazoAtual(b)))
  const diasAte = (iso: string) => differenceInCalendarDays(parseISO(iso), hoje)

  // Blocos, na ordem pedida pelo usuário: em aberto (recebidas), em andamento, em PEPT e finalizadas no mês.
  const emAberto = porPrazo(ativas.filter((o) => o.status === 'recebida'))
  const emAndamento = porPrazo(ativas.filter((o) => o.status !== 'recebida'))
  const mes = hojeStr.slice(0, 7)
  const finalizadas = os.filter((o) => o.status === 'concluida' && o.concluidaEm?.startsWith(mes)).sort((a, b) => b.concluidaEm!.localeCompare(a.concluidaEm!))
  const passoCurto = (o: OS) => proximoPasso(o, hojeStr).label.replace('Baixar as documentações', 'baixar docs').replace('Analisar documentos', 'analisar docs').toLowerCase()
  const pept = emPept(os, hoje)
  const avisos = alertas(os, hoje)
  // A semana: quais O.S. vencem em cada dia (as em PEPT ficam de fora, o prazo está pausado).
  const semana = diasDaSemana(hoje).map((d) => {
    const data = format(d, 'yyyy-MM-dd')
    return { d, vencem: ativas.filter((o) => prazoAtual(o) === data) }
  })
  const prazoTxt = (o: OS) => { const d = diasAte(prazoAtual(o)); return d < 0 ? `há ${-d} ${d === -1 ? 'dia' : 'dias'}` : d === 0 ? 'hoje' : `${d} ${d === 1 ? 'dia' : 'dias'}` }

  return (
    <div className="xl:h-[calc(100vh-97px)] flex flex-col">
      <header className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <div className="text-[13px] font-semibold text-muted">
            {config.empresa.fantasia || config.empresa.razao
              ? <span className="text-[var(--text)] uppercase tracking-[.04em]">{config.empresa.fantasia || config.empresa.razao}</span>
              : <Link to="/configuracoes" className="uppercase tracking-[.04em] underline decoration-dotted underline-offset-2 hover:text-[var(--verde-valor)]" title="Preencha o nome da empresa em Configurações › Empresa">Nome da empresa</Link>}
            , {cap(format(hoje, "EEEE", { locale: ptBR }))}, {format(hoje, "d 'de' MMMM", { locale: ptBR })}
          </div>
          <h1 className="text-[32px] font-bold tracking-[-0.03em] leading-tight mt-0.5">{saudacao(hoje.getHours())}, {config.responsaveis.luan.curto}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button className="btn btn-primary !h-12 !rounded-full !px-6 !text-[15px]" onClick={() => setNovaOpen(true)}><Plus size={19} /> Nova O.S.</button>
        </div>
      </header>
      <NovaOS open={novaOpen} onClose={() => setNovaOpen(false)} />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 xl:grid-rows-[auto_auto_1fr] gap-4 flex-1 min-h-0">
        <Prioridade lista={porPrazo(ativas)} hojeStr={hojeStr} mensagem={config.mensagemWhatsApp} />

        <Bloco cor="var(--laranja-txt)" fundo="var(--laranja-soft)" Icone={Inbox} rotulo="O.S. em aberto" numero={emAberto.length} para="/os?visao=lista&fase=aberto&periodo=todos"
          itens={emAberto.slice(0, 3).map((o) => ({ os: o, direita: prazoTxt(o) }))} vazio="Nenhuma O.S. em aberto." />
        <Bloco cor="var(--azul)" fundo="var(--azul-soft)" Icone={FileText} rotulo="O.S. em andamento" numero={emAndamento.length} para="/os?visao=lista&fase=andamento&periodo=todos"
          itens={emAndamento.slice(0, 3).map((o) => ({ os: o, direita: passoCurto(o) }))} vazio="Nenhuma O.S. em andamento." />
        <Bloco cor="var(--rt)" fundo="var(--rt-soft)" Icone={PauseCircle} rotulo="O.S. em PEPT" numero={pept.length} para="/os?visao=lista&fase=pept&periodo=todos"
          itens={pept.slice(0, 3).map((p) => ({ os: p.os, direita: `${p.dias} ${p.dias === 1 ? 'dia' : 'dias'}` }))} vazio="Nenhuma O.S. com prazo pausado." />
        <Bloco cor="var(--verde-valor)" fundo="var(--brand-soft)" Icone={CircleCheck} rotulo="Finalizadas no mês" numero={finalizadas.length} para="/os?visao=lista&fase=finalizada"
          itens={[]} conteudo={<PizzaTipologia lista={os} mes={mes} />} vazio="Nenhuma finalizada neste mês." />

        {/* a semana: vencimentos de O.S. por dia */}
        <section className="bloco md:col-span-2 p-5 flex flex-col min-h-0">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="text-[17px] font-bold">Sua semana</h2>
            <span className="text-[12.5px] text-muted">{semana.reduce((n, s) => n + s.vencem.length, 0)} O.S. vencem nesta semana</span>
          </div>
          <div className="grid grid-cols-7 gap-1.5 flex-1">
            {semana.map(({ d, vencem }) => {
              const eHoje = isSameDay(d, hoje)
              const passou = !eHoje && d < hoje
              return (
                <Link key={d.toISOString()} to={`/os?dia=${format(d, 'yyyy-MM-dd')}`} title={format(d, "EEEE, d 'de' MMMM", { locale: ptBR })}
                  className={clsx('rounded-xl px-2 py-2 min-h-[132px] h-full flex flex-col gap-1 border transition hover:border-[var(--brand)]',
                    eHoje ? 'border-[var(--brand)] bg-[var(--brand-soft)]' : 'border-border bg-[var(--surface-2)]', passou && 'opacity-60')}>
                  <span className={clsx('text-[12px] font-semibold', eHoje && 'text-[var(--verde-valor)]')}>{nomeDoDia(d)}</span>
                  <span className="text-[24px] font-bold tnum leading-none" style={{ color: vencem.length ? (passou ? 'var(--vermelho)' : 'var(--laranja-txt)') : 'var(--fraco)' }}>{vencem.length}</span>
                  <span className="text-[10.5px] text-muted">{vencem.length === 1 ? 'vence' : 'vencem'}</span>
                  {vencem.slice(0, 2).map((o) => <span key={o.id} className="text-[11px] font-semibold truncate leading-tight" title={o.proponente}>{codigoOS(o)} · {o.proponente.split(' ')[0]}</span>)}
                  {vencem.length > 2 && <span className="text-[10.5px] text-muted">+{vencem.length - 2}</span>}
                </Link>
              )
            })}
          </div>
        </section>

        {/* alertas: o que precisa de atenção antes de virar problema */}
        <section className="bloco md:col-span-2 p-5 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[17px] font-bold">Alertas</h2>
            <span className="text-[12.5px] text-muted">{avisos.length ? `${avisos.length} ${avisos.length === 1 ? 'alerta' : 'alertas'}` : 'tudo em dia'}</span>
          </div>
          {avisos.length === 0 ? <p className="text-[13px] text-muted py-2">Nenhum alerta agora. Prazos e PEPTs sob controle.</p> : (
            // a lista rola dentro do cartão (não vaza para fora); todos os alertas ficam acessíveis
            <ul className="flex flex-col flex-1 min-h-0 overflow-y-auto -mr-2 pr-2">
              {avisos.map((a, n) => {
                const cor = a.nivel === 'critico' ? 'var(--vermelho)' : a.nivel === 'atencao' ? 'var(--laranja-txt)' : 'var(--azul)'
                const fundo = a.nivel === 'critico' ? 'var(--vermelho-soft)' : a.nivel === 'atencao' ? 'var(--laranja-soft)' : 'var(--azul-soft)'
                const Ic = a.os.pausadoEm ? PauseCircle : a.nivel === 'info' ? CalendarPlus : AlertTriangle
                return (
                  <li key={n}>
                    <Link to={`/os/${a.os.id}`} className="flex items-start gap-3 py-2 border-t border-border first:border-t-0 hover:bg-[rgba(58,184,30,.05)] rounded-lg">
                      <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: fundo, color: cor }}><Ic size={16} /></span>
                      <span className="text-[13px] leading-snug pt-1.5">{a.texto}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

/**
 * Bloco grande em destaque: a prioridade número 1 (a O.S. mais urgente agora), o que falta nela e as ações
 * para destravar: ligar, WhatsApp, pedir pausa (PEPT) e o próximo passo. As setas passam para a próxima.
 */
function Prioridade({ lista, hojeStr, mensagem }: { lista: OS[]; hojeStr: string; mensagem: string }) {
  const marcarPasso = useStore((s) => s.marcarPasso)
  const [i, setI] = useState(0)
  const [pedindo, setPedindo] = useState(false)
  const base = 'heroi md:col-span-2 xl:row-span-2 rounded-[22px] p-6 flex flex-col gap-5 text-white min-h-[300px] bg-[linear-gradient(160deg,#10241A_0%,#173B26_100%)] shadow-[0_12px_32px_-18px_rgba(16,36,26,.6)]'
  if (!lista.length) {
    return (
      <article className={base}>
        <span className="text-[12.5px] font-bold uppercase tracking-[.06em] opacity-70">Prioridade agora</span>
        <div className="my-auto"><div className="text-[26px] font-bold leading-tight">Tudo em dia</div><p className="text-[14px] opacity-70 mt-1">Nenhuma O.S. esperando por você agora.</p></div>
      </article>
    )
  }
  const k = Math.min(i, lista.length - 1)
  const o = lista[k]
  const f = farolDe(o)
  const pp = proximoPasso(o, hojeStr)
  const marcarVistoria = pp.key === 'marcar_vistoria' && !o.vistoria
  const fone = telefoneWhats(o.whatsapp || o.telefone)
  const texto = mensagem.replace('{contato}', o.contato || o.proponente).replace('{cliente}', o.proponente).replace('{endereco}', enderecoLinha(o))
    .replace('{data}', o.vistoria ? dataMedia(o.vistoria.data) : '').replace('{hora}', o.vistoria?.hora ?? '').replace('{os}', codigoOS(o))
  const corPrazo = f.farol === 'late' ? 'bg-[#e2665c] text-white' : f.farol === 'urgent' || f.farol === 'warn' ? 'bg-[#f0b46e] text-[#2b1a05]' : 'bg-white/15 text-white'
  const mudar = (n: number) => { setI((k + n + lista.length) % lista.length); setPedindo(false) }
  const botao = 'h-10 px-4 rounded-full font-semibold flex items-center gap-2 border border-white/30 text-white hover:bg-white/10'
  return (
    <article className={base}>
      <div className="flex items-center justify-between">
        <span className="text-[12.5px] font-bold uppercase tracking-[.06em] opacity-70">Prioridade agora</span>
        <span className="flex items-center gap-1 text-[12.5px] font-semibold">
          <button type="button" aria-label="Anterior" className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center" onClick={() => mudar(-1)}><ChevronLeft size={17} /></button>
          <span className="tnum opacity-80">{k + 1} de {lista.length}</span>
          <button type="button" aria-label="Próxima" className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center" onClick={() => mudar(1)}><ChevronRight size={17} /></button>
        </span>
      </div>
      <div>
        <span className={'inline-block px-3 py-1 rounded-full text-[13px] font-bold ' + corPrazo}>{textoPrazo(o)}</span>
        <Link to={`/os/${o.id}`} className="block text-[30px] font-bold tracking-[-0.02em] leading-tight mt-3 hover:underline">{o.proponente}</Link>
        <div className="text-[14px] opacity-75 mt-1">{codigoOS(o)} · {o.tipologia} · {cap(o.endereco.cidade.toLowerCase())} · {o.endereco.bairro}</div>
      </div>
      <div className="rounded-2xl bg-white/[.08] px-4 py-3 text-[14px] leading-relaxed">
        <div className="text-[12px] font-bold uppercase tracking-[.06em] opacity-60">Agora</div>
        <div className="text-[18px] font-bold leading-tight mt-0.5">{pp.label}</div>
        {/* trilha do serviço: feitos com ✓, o atual em destaque, os próximos apagados */}
        <ol className="flex flex-wrap gap-1 mt-3" aria-label="Passos do serviço">
          {passosDaOS(o).filter((p) => !p.opcional).map((p) => {
            const e = estadoPassos(o, hojeStr)[p.key].estado
            const atual = p.key === pp.key
            return (
              <li key={p.key} title={p.label} className={'px-2 h-6 rounded-full text-[11px] font-semibold flex items-center gap-1 ' +
                (atual ? 'bg-[#7be05c] text-[#0d2214]' : e === 'pendente' ? 'bg-white/[.06] text-white/45' : 'bg-white/15 text-white/85')}>
                {e !== 'pendente' && !atual && <Check size={11} strokeWidth={3} />}{CURTO[p.key]}
              </li>
            )
          })}
        </ol>
        {o.vistoria && !o.vistoria.feita && o.vistoria.data > hojeStr && <div className="opacity-75 text-[13px] mt-2">Vistoria marcada para {dataMedia(o.vistoria.data)} às {o.vistoria.hora}.</div>}
      </div>
      <div className="mt-auto">
        {/* Pausar abre a mesma janela de PEPT do resto do sistema (tipo da pendência, pendência e dia) */}
        {pedindo && <PausarOS os={o} onClose={() => setPedindo(false)} />}
        {(
          <div className="flex flex-wrap gap-2">
            {marcarVistoria
              ? <Link to="/rotas" className="h-10 px-4 rounded-full bg-[#7be05c] text-[#0d2214] font-bold flex items-center gap-2 hover:brightness-105"><CalendarPlus size={16} />Marcar vistoria</Link>
              : pp.key && <button type="button" onClick={() => marcarPasso(o.id, pp.key!, 'feito')} className="h-10 px-4 rounded-full bg-[#7be05c] text-[#0d2214] font-bold flex items-center gap-2 hover:brightness-105"><Check size={16} />Feito</button>}
            <Link to={`/os/${o.id}`} className={botao}><FileText size={16} />Abrir O.S.</Link>
            {o.telefone && <a href={`tel:${o.telefone.replace(/\D/g, '')}`} className={botao}><Phone size={16} />Ligar</a>}
            {fone && <a href={`https://wa.me/${fone}?text=${encodeURIComponent(texto)}`} target="_blank" rel="noreferrer" className={botao}><MessageCircle size={16} />WhatsApp</a>}
            <button type="button" className={botao} onClick={() => setPedindo(true)}><PauseCircle size={16} />Pausar (PEPT)</button>
          </div>
        )}
      </div>
    </article>
  )
}

/** Bloco pequeno: rótulo, número grande, ícone e até 3 O.S. */
function Bloco({ cor, fundo, Icone, rotulo, numero, para, itens, rodape, vazio, conteudo }: {
  cor: string; fundo: string; Icone: LucideIcon; rotulo: string; numero: number; para: string
  itens: { os: OS; direita: string; para?: string }[]; rodape?: ReactNode; vazio: string; conteudo?: ReactNode
}) {
  const nav = useNavigate()
  return (
    <section className="bloco p-5 flex flex-col gap-3 cursor-pointer hover:border-[var(--brand)] transition" onClick={() => nav(para)} title="Abrir a lista com estas O.S.">
      <Link to={para} className="flex items-start justify-between group" onClick={(e) => e.stopPropagation()}>
        <span>
          <span className="block text-[13px] font-semibold text-muted group-hover:text-[var(--text)]">{rotulo}</span>
          <span className="block text-[40px] font-bold tracking-[-0.03em] leading-[1.1] tnum" style={{ color: numero ? cor : 'var(--fraco)' }}>{numero}</span>
        </span>
        <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: fundo, color: cor }}><Icone size={20} /></span>
      </Link>
      {conteudo ?? (itens.length ? (
        <ul>
          {itens.map(({ os: o, direita, para: p }) => (
            <li key={o.id}>
              <Link to={p ?? `/os/${o.id}`} onClick={(e) => e.stopPropagation()} className="flex justify-between gap-2 text-[13px] py-1.5 border-t border-border hover:text-[var(--verde-valor)]">
                <b className="font-semibold truncate">{o.proponente}</b><span className="text-muted whitespace-nowrap">{direita}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : <p className="text-[12.5px] text-muted">{vazio}</p>)}
      {rodape && <p className="text-[12.5px] text-muted mt-auto">{rodape}</p>}
    </section>
  )
}



/**
 * Pizza das O.S. recebidas no mês por tipologia. Cada linha: código, barrinha (parte cheia = já finalizadas),
 * total recebido e quantas ainda não foram finalizadas.
 */
function PizzaTipologia({ lista, mes }: { lista: OS[]; mes: string }) {
  const dados = porTipologia(lista, mes)
  const total = dados.reduce((n, d) => n + d.recebidas, 0)
  if (!total) return <p className="text-[12.5px] text-muted">Nenhuma O.S. recebida neste mês.</p>
  let acc = 0
  const fatias = dados.map(({ tipologia, recebidas }) => {
    const ini = (acc / total) * 360
    acc += recebidas
    return `var(--t-${tipologia}-cor) ${ini}deg ${(acc / total) * 360}deg`
  })
  // Cabe no cartão: as 3 que mais receberam e o resto somado em "Outras".
  const linhas = dados.slice(0, 3).map((d) => ({ ...d, cor: `var(--t-${d.tipologia}-cor)`, titulo: TIPOLOGIAS[d.tipologia] as string }))
  const resto = dados.slice(3)
  if (resto.length) linhas.push({ tipologia: 'Outras' as Tipologia, recebidas: resto.reduce((n, d) => n + d.recebidas, 0), abertas: resto.reduce((n, d) => n + d.abertas, 0), cor: 'var(--fraco)', titulo: resto.map((d) => d.tipologia).join(', ') })
  const abertas = dados.reduce((n, d) => n + d.abertas, 0)
  return (
    <div className="flex items-center gap-4 pt-3 border-t border-border">
      <div className="w-[84px] h-[84px] shrink-0 rounded-full relative" style={{ background: `conic-gradient(${fatias.join(', ')})` }}
        role="img" aria-label={dados.map((d) => `${d.tipologia}: ${d.recebidas} recebidas`).join(', ')}>
        <span className="absolute inset-[13px] rounded-full bg-[var(--surface)] flex flex-col items-center justify-center leading-none">
          <b className="text-[17px] tnum">{total}</b><span className="text-[9.5px] text-muted mt-1">recebidas</span>
        </span>
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        {linhas.map(({ tipologia, recebidas, abertas: ab, cor, titulo }) => (
          <div key={tipologia} className="grid grid-cols-[58px_1fr_auto] items-center gap-2.5 text-[12.5px]" title={`${titulo}: ${recebidas} recebidas, ${ab} não finalizadas`}>
            <span className="flex items-center gap-1.5 font-semibold"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: cor }} />{tipologia}</span>
            <span className="h-1.5 rounded-full bg-[var(--seg)] overflow-hidden"><span className="block h-full rounded-full" style={{ width: `${((recebidas - ab) / recebidas) * 100}%`, background: cor }} /></span>
            <span className="tnum whitespace-nowrap flex items-center justify-end gap-1.5"><b className="w-5 text-right">{recebidas}</b><span className={clsx('min-w-[22px] text-center rounded-full px-1.5 text-[11px] font-bold', ab ? 'chip-l' : 'text-[var(--fraco)]')}>{ab}</span></span>
          </div>
        ))}
        <div className="text-[11px] text-muted mt-0.5 truncate" title="Barra cheia = já finalizadas; número laranja = ainda não finalizadas"><b className="text-[var(--laranja-txt)]">{abertas}</b> de {total} ainda não finalizadas</div>
      </div>
    </div>
  )
}
