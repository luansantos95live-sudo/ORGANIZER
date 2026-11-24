import clsx from 'clsx'
import { differenceInCalendarDays, format, isSameDay, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AlertTriangle, CalendarPlus, Check, Circle, CircleCheck, Inbox, ChevronLeft, ChevronRight, FileText, MessageCircle, PauseCircle, Phone, Plus, type LucideIcon } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CaixaPrioridade, DadosPrioridade } from '../components/DadosPrioridade'
import { NovaOS } from '../components/NovaOS'
import { PausarOS } from '../components/PausarOS'
import { TipologiaChip } from '../components/ui'
import { TIPOLOGIAS, cap, codigoOS, dataMedia, enderecoLinha, farolDe, prazoAtual, prazoIndeterminado, telefoneWhats, TIPOLOGIAS_SEM_VISTORIA } from '../lib/os'
import { peptVenceu } from '../lib/pept'
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

  // Blocos: recebidas e finalizadas no mês (só o número, 24/11), em andamento, em PEPT e finalizadas no mês.
  const nomeMes = format(hoje, 'MMMM', { locale: ptBR })
  const emAndamento = porPrazo(ativas.filter((o) => o.status !== 'recebida'))
  const mes = hojeStr.slice(0, 7)
  const finalizadas = os.filter((o) => o.status === 'concluida' && o.concluidaEm?.startsWith(mes)).sort((a, b) => b.concluidaEm!.localeCompare(a.concluidaEm!))
  const passoCurto = (o: OS) => proximoPasso(o, hojeStr).label.replace('Baixar as documentações', 'baixar docs').replace('Analisar documentos', 'analisar docs').toLowerCase()
  const recebidas = os.filter((o) => o.emissao?.startsWith(mes))
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
        <Prioridade lista={porPrazo(ativas)} hojeStr={hojeStr} mensagem={config.mensagemWhatsApp}
          emDia={{ nome: config.responsaveis.luan.curto, finalizadas: finalizadas.length, mes: format(hoje, 'MMMM', { locale: ptBR }), pept: pept.length }} />

        {/* 24/11: "O.S. em aberto" virou dois cartões só com o número, recebidas e finalizadas no mês */}
        <div className="grid grid-cols-2 gap-4">
          <Contador cor="var(--laranja-txt)" fundo="var(--laranja-soft)" Icone={Inbox} rotulo="O.S. recebidas" sub={`em ${nomeMes}`} numero={recebidas.length} para="/os?visao=lista" />
          <Contador cor="var(--verde-valor)" fundo="var(--brand-soft)" Icone={CircleCheck} rotulo="O.S. finalizadas" sub={`em ${nomeMes}`} numero={finalizadas.length} para="/os?visao=lista&fase=finalizada" />
        </div>
        <Bloco cor="var(--azul)" fundo="var(--azul-soft)" Icone={FileText} rotulo="O.S. em andamento" numero={emAndamento.length} para="/os?visao=lista&fase=andamento&periodo=todos"
          itens={emAndamento.slice(0, 3).map((o) => ({ os: o, direita: passoCurto(o) }))} vazio="Nenhuma O.S. em andamento." />
        <Bloco cor="var(--rt)" fundo="var(--rt-soft)" Icone={PauseCircle} rotulo="O.S. em PEPT" numero={pept.length} para="/os?visao=lista&fase=pept&periodo=todos"
          itens={pept.slice(0, 3).map((p) => ({ os: p.os, direita: prazoIndeterminado(p.os) ? 'sem prazo' : prazoTxt(p.os) }))} vazio="Nenhuma O.S. com prazo pausado." />
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
                    eHoje ? 'border-2 border-[var(--brand)] bg-[var(--brand-soft)] shadow-[0_6px_18px_-10px_rgba(58,184,30,.7)]' : 'border-border bg-[var(--surface-2)]', passou && 'opacity-60')}>
                  {/* 24/11: nome do dia em destaque (maior e em negrito) com a data; hoje ganha a etiqueta HOJE */}
                  <span className="flex flex-wrap items-center gap-1">
                    <span className={clsx('text-[14.5px] font-extrabold leading-tight tracking-[-0.01em]', eHoje ? 'text-[var(--verde-valor)]' : 'text-[var(--text)]')}>{nomeDoDia(d)}</span>
                    <span className="tnum text-[11px] font-semibold text-muted">{format(d, 'dd/MM')}</span>
                    {eHoje && <span className="rounded-full bg-[var(--brand)] px-1.5 py-px text-[9.5px] font-bold tracking-[.06em] text-white">HOJE</span>}
                  </span>
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
function Prioridade({ lista, hojeStr, mensagem, emDia }: { lista: OS[]; hojeStr: string; mensagem: string; emDia: { nome: string; finalizadas: number; mes: string; pept: number } }) {
  const marcarPasso = useStore((s) => s.marcarPasso)
  const voltarPasso = useStore((s) => s.voltarPasso)
  const [i, setI] = useState(0)
  // passo escolhido na trilha (23/11): clicar num passo seleciona; sem escolha, vale o passo atual da O.S.
  const [escolha, setEscolha] = useState<{ os: string; passo: PassoKey } | null>(null)
  const [pedindo, setPedindo] = useState(false)
  const base = 'heroi md:col-span-2 xl:row-span-2 rounded-[22px] p-6 flex flex-col gap-5 text-white min-h-[300px] bg-[linear-gradient(160deg,#10241A_0%,#173B26_100%)] shadow-[0_12px_32px_-18px_rgba(16,36,26,.6)]'
  if (!lista.length) {
    return (
      // Tudo em dia (23/11, pedido do usuário: "uma saudação mais legal, tipo parabéns, com um design mais bonito")
      <article className={base + ' relative overflow-hidden'}>
        {/* enfeites: anéis de brilho à direita e confetes */}
        <span aria-hidden className="emdia-anel" style={{ width: 420, height: 420, right: -120, top: -90 }} />
        <span aria-hidden className="emdia-anel" style={{ width: 280, height: 280, right: -50, top: -20 }} />
        {[['#7be05c', '12%', '68%', 8, 0], ['#f0c94a', '78%', '22%', 7, 1], ['#7be05c', '86%', '64%', 6, 2], ['#9cd3ff', '64%', '12%', 5, 3], ['#f39a8e', '70%', '78%', 6, 4], ['#f0c94a', '52%', '84%', 5, 5]].map(([cor, x, y, t, i]) => (
          <span key={i as number} aria-hidden className="emdia-confete" style={{ background: cor as string, left: x as string, top: y as string, width: t as number, height: t as number, animationDelay: `${(i as number) * 0.35}s` }} />
        ))}
        <span className="relative text-[12.5px] font-bold uppercase tracking-[.06em] opacity-70">Prioridade agora</span>
        <div className="relative my-auto flex flex-wrap items-center gap-5">
          <div className="emdia-selo shrink-0 w-[76px] h-[76px] rounded-full flex items-center justify-center"><CircleCheck size={40} strokeWidth={2.2} /></div>
          <div className="min-w-0">
            <div className="emdia-rotulo text-[13px] font-bold uppercase tracking-[.08em]">Tudo em dia</div>
            <div className="text-[30px] font-bold tracking-[-0.02em] leading-tight mt-0.5">Parabéns, {emDia.nome}!</div>
            <p className="emdia-texto text-[16px] mt-1">Você está com todas as demandas em dia.</p>
            <p className="emdia-nota text-[13.5px] mt-0.5">Nenhuma O.S. esperando por você agora. Aproveite o respiro.</p>
            <div className="flex flex-wrap gap-2 mt-4">
              {emDia.finalizadas > 0 && <span className="emdia-chip"><Check size={14} strokeWidth={3} />{emDia.finalizadas} {emDia.finalizadas === 1 ? 'O.S. finalizada' : 'O.S. finalizadas'} em {emDia.mes}</span>}
              {emDia.pept > 0 && <Link to="/os?visao=lista&fase=pept" className="emdia-chip emdia-chip-pept"><PauseCircle size={14} />{emDia.pept} em PEPT aguardando o cliente</Link>}
              <Link to="/os" className="emdia-chip emdia-chip-link"><FileText size={14} />Ver ordens de serviço</Link>
            </div>
          </div>
        </div>
      </article>
    )
  }
  const k = Math.min(i, lista.length - 1)
  const o = lista[k]
  const f = farolDe(o)
  const pp = proximoPasso(o, hojeStr)
  const estados = estadoPassos(o, hojeStr)
  const sel: PassoKey | null = escolha?.os === o.id ? escolha.passo : pp.key
  const selFeito = !!sel && estados[sel].estado !== 'pendente'
  const marcarVistoria = sel === 'marcar_vistoria' && !selFeito && !o.vistoria
  const fone = telefoneWhats(o.whatsapp || o.telefone)
  const texto = mensagem.replace('{contato}', o.contato || o.proponente).replace('{cliente}', o.proponente).replace('{endereco}', enderecoLinha(o))
    .replace('{data}', o.vistoria ? dataMedia(o.vistoria.data) : '').replace('{hora}', o.vistoria?.hora ?? '').replace('{os}', codigoOS(o))
  // vencida ou vencendo hoje: vermelha (pedido de 16/11)
  const corPrazo = f.farol === 'late' || f.dias === 0 ? 'bg-[#e2665c] text-white' : f.farol === 'urgent' || f.farol === 'warn' ? 'bg-[#f0b46e] text-[#2b1a05]' : 'bg-white/15 text-white'
  const mudar = (n: number) => { setI((k + n + lista.length) % lista.length); setPedindo(false); setEscolha(null) }
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
        {/* 24/11: PEPT bateu o limite de dias parados e saiu sozinha; dá para finalizar negando garantia */}
        {peptVenceu(o) && <span className="ml-2 inline-block px-3 py-1 rounded-full text-[13px] font-bold bg-[#dc2626] text-white" title="A PEPT chegou ao limite de dias parados: a O.S. saiu da PEPT e pode ser finalizada negando garantia">PEPT vencida · pode finalizar</span>}
        <Link to={`/os/${o.id}`} className="block text-[30px] font-bold tracking-[-0.02em] leading-tight mt-3 hover:underline">{o.proponente}</Link>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px]">
          <span className="opacity-75">{codigoOS(o)}</span>
          {/* etiqueta da tipologia igual à das Ordens de Serviço (cor do cadastro) */}
          <TipologiaChip t={o.tipologia} className="shrink-0 !h-[22px] !text-[11.5px] !px-2" />
          <span className="opacity-75">{cap(o.endereco.cidade.toLowerCase())} · {o.endereco.bairro}</span>
          {o.referencia && <CaixaPrioridade referencia={o.referencia} />}
        </div>
      </div>
      <div className="rounded-2xl bg-white/[.08] px-4 py-3 text-[14px] leading-relaxed">
        <div className="text-[12px] font-bold uppercase tracking-[.06em] opacity-60">{sel === pp.key ? 'Agora' : 'Passo escolhido'}</div>
        <div className="text-[18px] font-bold leading-tight mt-0.5">{sel ? passosDaOS(o).find((p) => p.key === sel)?.label ?? pp.label : pp.label}</div>
        {/* trilha do serviço (23/11): cada passo é clicável e fica em destaque quando escolhido; feitos com ✓, pendentes apagados */}
        <ol className="flex flex-wrap gap-1 mt-3" aria-label="Passos do serviço">
          {passosDaOS(o).filter((p) => !p.opcional).map((p) => {
            const e = estados[p.key].estado
            const escolhido = p.key === sel
            return (
              <li key={p.key}>
                <button type="button" title={`${p.label}${e === 'pendente' ? ' (a fazer)' : ' (feito)'}`} aria-pressed={escolhido}
                  onClick={() => setEscolha({ os: o.id, passo: p.key })}
                  className={'px-2 h-6 rounded-full text-[11px] font-semibold flex items-center gap-1 transition ' +
                    (escolhido ? 'bg-[#7be05c] text-[#0d2214]' : e === 'pendente' ? 'bg-white/[.06] text-white/45 hover:bg-white/[.12] hover:text-white/75' : 'bg-white/15 text-white/85 hover:bg-white/25')}>
                  {e !== 'pendente' && <Check size={11} strokeWidth={3} />}{CURTO[p.key]}
                </button>
              </li>
            )
          })}
        </ol>
        {o.vistoria && !o.vistoria.feita && o.vistoria.data > hojeStr && <div className="opacity-75 text-[13px] mt-2">Vistoria marcada para {dataMedia(o.vistoria.data)} às {o.vistoria.hora}.</div>}
      </div>
      <DadosPrioridade os={o} />
      <div className="mt-auto">
        {/* Pausar abre a mesma janela de PEPT do resto do sistema (tipo da pendência, pendência e dia) */}
        {pedindo && <PausarOS os={o} onClose={() => setPedindo(false)} />}
        {(
          <div className="flex flex-wrap gap-2">
            {marcarVistoria
              ? <Link to="/rotas" className="h-10 px-4 rounded-full bg-[#7be05c] text-[#0d2214] font-bold flex items-center gap-2 hover:brightness-105"><CalendarPlus size={16} />Marcar vistoria</Link>
              // "Feito" só quando o passo escolhido já está feito (clicar desfaz); senão "Fazer" (clicar marca como feito) — 23/11
              : sel && (selFeito
                ? <button type="button" title="Passo já feito: clique para desfazer" onClick={() => { voltarPasso(o.id, sel); setEscolha({ os: o.id, passo: sel }) }} className="h-10 px-4 rounded-full bg-[#7be05c] text-[#0d2214] font-bold flex items-center gap-2 hover:brightness-105"><Check size={16} />Feito</button>
                : <button type="button" title="Marcar este passo como feito" onClick={() => { marcarPasso(o.id, sel, 'feito'); setEscolha(null) }} className="h-10 px-4 rounded-full bg-[#7be05c] text-[#0d2214] font-bold flex items-center gap-2 hover:brightness-105"><Circle size={16} strokeWidth={2.5} />Fazer</button>)}
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

/** Cartão só com o número, grande (pedido de 24/11): "O.S. recebidas" e "O.S. finalizadas" lado a lado, no lugar do antigo "O.S. em aberto". */
function Contador({ cor, fundo, Icone, rotulo, sub, numero, para }: { cor: string; fundo: string; Icone: LucideIcon; rotulo: string; sub: string; numero: number; para: string }) {
  return (
    <Link to={para} title="Abrir a lista com estas O.S." className="bloco group p-5 flex flex-col justify-between gap-3 min-w-0 hover:border-[var(--brand)] transition">
      <span className="flex items-start justify-between gap-2">
        <span className="min-w-0 leading-tight">
          <span className="block text-[13px] font-semibold text-muted group-hover:text-[var(--text)]">{rotulo}</span>
          <span className="block text-[11.5px] text-muted">{sub}</span>
        </span>
        <span className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center" style={{ background: fundo, color: cor }}><Icone size={18} /></span>
      </span>
      <span className="block text-[64px] font-bold tracking-[-0.04em] leading-none tnum" style={{ color: numero ? cor : 'var(--fraco)' }}>{numero}</span>
    </Link>
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
              <Link to={p ?? `/os/${o.id}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-2 text-[13px] py-1.5 border-t border-border hover:text-[var(--verde-valor)]">
                {/* número da O.S. e etiqueta da tipologia antes do nome (pedido de 19/11), como no Kanban: OS | tipologia */}
                <span className="tnum font-semibold text-muted whitespace-nowrap shrink-0">{codigoOS(o)}</span>
                <TipologiaChip t={o.tipologia} className="shrink-0 !h-[18px] !text-[10.5px] !px-1.5" />
                <b className="font-semibold truncate min-w-0 flex-1">{o.proponente}</b><span className="text-muted whitespace-nowrap shrink-0">{direita}</span>
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
