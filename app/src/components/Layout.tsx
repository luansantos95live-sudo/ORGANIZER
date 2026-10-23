import clsx from 'clsx'
import { Bell, ChartColumn, ClipboardList, FileSearch, House, Mail, Moon, PanelLeftClose, Route, Search, Settings, Sun, UserRound, Users } from 'lucide-react'
import { Fragment, useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useStore } from '../store/useStore'
import { Avatar, Dica, Segmented, StatusChip, useFora } from './ui'
import { Logo } from './Logo'
import { notificaveis, tipoEmail } from '../lib/emails'
import type { Escopo, OS } from '../types'
import { STATUS_META, cap, codigoOS, enderecoLinha, farolDe, temEquipe } from '../lib/os'

// Menu igual ao do sistema real, na ordem dele, com os grupos da lateral do FLUXO ARQ.
const GRUPOS = [
  { titulo: 'Geral', itens: [
    { to: '/', label: 'Início', icon: House, end: true },
    { to: '/os', label: 'Ordens de Serviço', icon: ClipboardList },
    { to: '/rotas', label: 'Rotas', icon: Route },
    { to: '/financeiro', label: 'Financeiro', icon: ChartColumn },
    { to: '/fichas', label: 'Fichas de Pesquisa', icon: FileSearch },
    { to: '/emails', label: 'E-mails da Caixa', icon: Mail },
  ] },
  { titulo: 'Sistema', itens: [
    { to: '/configuracoes', label: 'Configurações', icon: Settings },
  ] },
]
const NAV = GRUPOS.flatMap((g) => g.itens)

export function Layout() {
  const emailsNaoLidos = useStore((s) => notificaveis(s.emails).length)
  const emails = useStore((s) => s.emails)
  const aplicarPepts = useStore((s) => s.aplicarPeptsResolvidas)
  useEffect(() => { aplicarPepts() }, [emails, aplicarPepts]) // e-mail de PEPT resolvida tira a O.S. da pausa
  const escopo = useStore((s) => s.escopo)
  const setEscopo = useStore((s) => s.setEscopo)
  const config = useStore((s) => s.config)
  const setConfig = useStore((s) => s.setConfig)
  const [busca, setBusca] = useState(false)
  const recolhido = config.menuRecolhido
  // Só um técnico ativo: não há o que separar, então o seletor some e tudo fica em "Minhas".
  const equipe = temEquipe(config)
  useEffect(() => { if (!equipe && escopo !== 'luan') setEscopo('luan') }, [equipe, escopo, setEscopo])

  useEffect(() => {
    document.documentElement.dataset.theme = config.tema === 'escuro' ? 'dark' : 'light'
  }, [config.tema])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setBusca((v) => !v) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const opcoesEscopo: { value: Escopo; label: React.ReactNode }[] = [
    { value: 'luan', label: <span className="flex items-center gap-1.5"><Avatar resp="luan" size={16} />Minhas</span> },
    { value: 'rt', label: <span className="flex items-center gap-1.5"><Avatar resp="rt" size={16} />{config.responsaveis.rt.curto}</span> },
    { value: 'todas', label: 'Todas' },
  ]

  return (
    <div className="min-h-full flex">
      <aside className={clsx('lateral hidden md:flex shrink-0 flex-col sticky top-0 h-screen z-30', recolhido && 'recolhida')}>
        <div className="marca flex items-center gap-3 px-[18px] pt-5 pb-3">
          <Logo size={38} className="shrink-0" />
          <div className="marca-txt flex flex-col leading-tight">
            <b>Fluxo Caixa</b>
            <small>O.S. Caixa · laboratório</small>
          </div>
        </div>
        <nav className="abas flex-1 overflow-y-auto flex flex-col gap-px px-3 pb-3">
          {GRUPOS.map((g) => (
            <Fragment key={g.titulo}>
              <div className="lat-sec">{g.titulo}</div>
              {g.itens.map((n) => (
                <NavLink key={n.to} to={n.to} end={n.end} className="aba relative" title={recolhido ? n.label : undefined}>
                  <n.icon strokeWidth={1.75} />
                  <span>{n.label}</span>
                  {n.to === '/emails' && emailsNaoLidos > 0 && <b className="absolute top-0.5 left-7 min-w-[16px] h-4 px-1 rounded-full bg-[var(--vermelho)] text-white text-[10px] font-bold leading-4 text-center not-italic" aria-label={`${emailsNaoLidos} não lidos`}>{emailsNaoLidos}</b>}
                </NavLink>
              ))}
            </Fragment>
          ))}
        </nav>
        <div className="flex flex-col gap-2 px-3 pb-4 pt-2 border-t border-white/[.06]">
          {/* Escopo em coluna (teste de 20/10), num cartão próprio perto de "Recolher menu" */}
          {equipe && <div className="lat-escopo flex flex-col gap-px p-1.5 rounded-[12px] border border-white/[.08] bg-white/[.04]">
            <div className="lat-escopo-topo flex items-center gap-1.5 px-2 pt-0.5 pb-1">
              <span className="lat-escopo-tit text-[10.5px] font-semibold tracking-[.1em] uppercase text-[#646b62]">Ver</span>
              <Dica>
                <b className="block text-[12.5px] mb-1">Quais O.S. você quer ver?</b>
                <span className="block text-[#b9c0b6]">Escolha uma opção e todas as telas do sistema passam a mostrar só essas ordens de serviço.</span>
                <span className="flex gap-2 mt-2"><Avatar resp="luan" size={16} /><span><b>Minhas</b> — as O.S. que estão no seu nome.</span></span>
                <span className="flex gap-2 mt-1"><Avatar resp="rt" size={16} /><span><b>{config.responsaveis.rt.curto}</b> — as O.S. que estão no nome do {config.responsaveis.rt.curto}.</span></span>
                <span className="flex gap-2 mt-1"><Users size={16} strokeWidth={1.75} className="shrink-0" /><span><b>Todas</b> — as duas juntas, para ver o trabalho de todos.</span></span>
                <span className="block mt-2 pt-2 border-t border-white/10 text-[#b9c0b6]">A opção em verde é a que está valendo agora.</span>
              </Dica>
            </div>
            {([
              { value: 'luan' as Escopo, label: 'Minhas', icone: <Avatar resp="luan" size={20} /> },
              { value: 'rt' as Escopo, label: config.responsaveis.rt.curto, icone: <Avatar resp="rt" size={20} /> },
              { value: 'todas' as Escopo, label: 'Todas', icone: <Users size={17} strokeWidth={1.75} /> },
            ]).map((e) => (
              <button key={e.value} type="button" className="aba w-full text-left" aria-current={escopo === e.value ? 'page' : undefined}
                onClick={() => setEscopo(e.value)} title={recolhido ? e.label : undefined}>
                <div className="w-[20px] flex justify-center shrink-0">{e.icone}</div>
                <span>{e.label}</span>
              </button>
            ))}
          </div>}
          <button className="lat-recolher" onClick={() => setConfig({ menuRecolhido: !recolhido })} title={recolhido ? 'Expandir menu' : undefined}>
            <PanelLeftClose strokeWidth={1.75} />
            <span>Recolher menu</span>
          </button>
          {/* o ícone da conta fica só no canto superior direito (menu com Meu perfil e Configurações) — pedido em 22/10 */}
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="topo-app h-[61px] sticky top-0 z-20 flex items-center gap-3 px-4 md:px-6">
          {equipe && <div className="md:hidden"><Segmented value={escopo} onChange={setEscopo} options={opcoesEscopo} /></div>}
          <div className="ml-auto flex items-center gap-2">
            <button className="ic-btn" onClick={() => setBusca(true)}>
              <Search strokeWidth={1.75} /> <span className="hidden sm:inline">Buscar O.S.</span>
            </button>
            <button className="ic-btn" title="Alternar tema" aria-label="Alternar tema" onClick={() => setConfig({ tema: config.tema === 'claro' ? 'escuro' : 'claro' })}>
              {config.tema === 'claro' ? <Moon strokeWidth={1.75} /> : <Sun strokeWidth={1.75} />}
            </button>
            <Notificacoes />
            <MenuUsuario />
            <span className="hidden xl:inline text-[12.5px] text-[#c9d1c6] ml-1">{cap(format(new Date(), "EEE, d 'de' MMM", { locale: ptBR }))}</span>
          </div>
        </header>
        <main className="area flex-1 px-3 md:px-5 py-4 w-full pb-24 md:pb-5">
          <div className="max-w-[2400px] mx-auto">
            <Outlet />
          </div>
        </main>
        <nav className="nav-baixo md:hidden fixed bottom-0 inset-x-0 h-16 flex items-stretch z-20">
          {NAV.filter((n) => n.to !== '/configuracoes').map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className="flex-1 flex flex-col items-center justify-center gap-1 text-[10px]">
              <n.icon size={20} strokeWidth={1.75} />
              {n.label.split(' ')[0]}
            </NavLink>
          ))}
        </nav>
      </div>
      {busca && <CommandBar onClose={() => setBusca(false)} />}
    </div>
  )
}

interface Aviso { id: string; texto: string; sub: string; os: OS; tom: 'late' | 'urgent' | 'novo' | 'assinar' }

/** Avisos gerados a partir das O.S.: vencidas, vencendo, recém-chegadas do e-mail e laudos para assinar. */
function avisosDe(lista: OS[], hoje = new Date()): Aviso[] {
  const out: Aviso[] = []
  for (const o of lista) {
    const f = farolDe(o, hoje)
    if (f.farol === 'late') out.push({ id: `venc-${o.id}`, texto: `${codigoOS(o)} venceu`, sub: `${o.proponente} · ${f.texto}`, os: o, tom: 'late' })
    else if (f.farol === 'urgent') out.push({ id: `urg-${o.id}-${f.dias}`, texto: `${codigoOS(o)} ${f.selo.toLowerCase()}`, sub: o.proponente, os: o, tom: 'urgent' })
    if (o.origem === 'email' && o.status === 'recebida' && differenceInCalendarDays(hoje, parseISO(o.emissao)) <= 2) out.push({ id: `novo-${o.id}`, texto: `Nova O.S. da Caixa: ${codigoOS(o)}`, sub: `${o.proponente} · ${o.endereco.cidade}`, os: o, tom: 'novo' })
    if (o.status === 'assinatura_pendente') out.push({ id: `ass-${o.id}`, texto: `Laudo de ${codigoOS(o)} esperando assinatura`, sub: o.proponente, os: o, tom: 'assinar' })
  }
  return out
}

function Notificacoes() {
  const os = useStore((s) => s.os)
  const lidas = useStore((s) => s.notificacoesLidas)
  const marcar = useStore((s) => s.marcarNotificacoesLidas)
  const nav = useNavigate()
  const [aberto, setAberto] = useState(false)
  const ref = useFora<HTMLDivElement>(aberto, () => setAberto(false))
  const avisos = useMemo(() => avisosDe(os), [os])
  const novos = avisos.filter((a) => !lidas.includes(a.id))
  // E-mails novos da Caixa (Gmail) também viram notificação.
  const emails = useStore((s) => s.emails)
  const marcarEmail = useStore((s) => s.marcarEmailLido)
  const marcarEmails = useStore((s) => s.marcarTodosEmailsLidos)
  const osTodas = useStore((s) => s.os)
  const emailsNovos = notificaveis(emails)
  const total = novos.length + emailsNovos.length
  return (
    <div className="relative" ref={ref}>
      <button className="ic-btn relative" aria-label="Abrir notificações" title="Notificações" onClick={() => setAberto((a) => !a)}>
        <Bell strokeWidth={1.75} />
        {total > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--vermelho)] text-white text-[10.5px] font-bold flex items-center justify-center">{total > 9 ? '9+' : total}</span>}
      </button>
      {aberto && (
        <div className="menu-flut right-0 top-[42px] !w-[340px] !p-0 text-[var(--text)]">
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border">
            <b className="text-[13.5px]">Notificações</b>
            <button className="!w-auto !p-0 !bg-transparent text-[12px] font-semibold text-[var(--verde-valor)]" onClick={() => { marcar(avisos.map((a) => a.id)); marcarEmails() }}>Marcar todas como lidas</button>
          </div>
          <div className="max-h-[380px] overflow-y-auto p-1.5">
            {emailsNovos.map((e) => (
              <button key={e.id} className="!items-start" onClick={() => { marcarEmail(e.id); setAberto(false); nav(`/emails?id=${e.id}`) }}>
                <Mail size={15} className="mt-0.5 shrink-0 text-[var(--verde-valor)]" />
                <span className="min-w-0">
                  <span className="block font-medium leading-tight">{tipoEmail(e) === 'pept' ? `PEPT resolvida pelo cliente${e.peptOsId ? `: OS-${osTodas.find((o) => o.id === e.peptOsId)?.numero ?? ''}` : ''} — o prazo voltou a contar` : `Nova O.S. por e-mail: ${e.nome}`}</span>
                  <span className="block text-[12px] text-muted truncate">{e.assunto}</span>
                </span>
              </button>
            ))}
            {total === 0 && <p className="text-muted text-[13px] text-center py-6">Nenhuma notificação por enquanto</p>}
            {novos.map((a) => (
              <button key={a.id} className="!items-start" onClick={() => { marcar([a.id]); setAberto(false); nav(`/os/${a.os.id}`) }}>
                <span className={clsx('mt-1.5 w-2 h-2 rounded-full shrink-0', a.tom === 'late' || a.tom === 'urgent' ? 'bg-[var(--vermelho)]' : a.tom === 'assinar' ? 'bg-[var(--rt)]' : 'bg-[var(--brand)]')} />
                <span className="min-w-0">
                  <span className="block font-medium leading-tight">{a.texto}</span>
                  <span className="block text-[12px] text-muted truncate">{a.sub}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MenuUsuario() {
  const config = useStore((s) => s.config)
  const nav = useNavigate()
  const [aberto, setAberto] = useState(false)
  const ref = useFora<HTMLDivElement>(aberto, () => setAberto(false))
  const u = config.responsaveis.luan
  const ir = (to: string) => { setAberto(false); nav(to) }
  return (
    <div className="relative" ref={ref}>
      <button className="ic-btn !rounded-full !p-0 !w-[34px]" aria-label="Abrir menu do usuário" onClick={() => setAberto((a) => !a)}>
        <span className="w-[30px] h-[30px] rounded-full bg-brand text-white flex items-center justify-center font-semibold text-[13px]">{u.curto.slice(0, 1).toUpperCase()}</span>
      </button>
      {aberto && (
        <div className="menu-flut right-0 top-[42px] !w-[230px] text-[var(--text)]">
          <div className="px-2.5 py-2 border-b border-border mb-1">
            <b className="block text-[13.5px]">{u.nome}</b>
            <span className="block text-[12px] text-muted truncate">{u.email || 'e-mail em Configurações'}</span>
          </div>
          <button onClick={() => ir('/configuracoes?secao=perfil')}><UserRound /> Meu perfil</button>
          <button onClick={() => ir('/configuracoes')}><Settings /> Configurações</button>
        </div>
      )}
    </div>
  )
}

function CommandBar({ onClose }: { onClose: () => void }) {
  const os = useStore((s) => s.os)
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [i, setI] = useState(0)
  const res = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return os.filter((o) => o.status !== 'concluida' && o.status !== 'cancelada').slice(0, 8)
    return os.filter((o) => [o.referencia, codigoOS(o), o.proponente, o.contato, enderecoLinha(o), STATUS_META[o.status].label].join(' ').toLowerCase().includes(t)).slice(0, 10)
  }, [q, os])

  useEffect(() => setI(0), [q])
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const go = (id: string) => { nav(`/os/${id}`); onClose() }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4" style={{ background: 'rgba(8,12,9,.55)' }} onClick={onClose}>
      <div className="card w-full max-w-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 h-12 border-b border-border">
          <Search size={16} className="text-muted" />
          <input
            autoFocus
            className="flex-1 bg-transparent outline-none text-[14px]"
            placeholder="Buscar cliente ou nº da OS…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setI((v) => Math.min(v + 1, res.length - 1)) }
              if (e.key === 'ArrowUp') { e.preventDefault(); setI((v) => Math.max(v - 1, 0)) }
              if (e.key === 'Enter' && res[i]) go(res[i].id)
            }}
          />
          <span className="kbd">esc</span>
        </div>
        <ul className="max-h-[50vh] overflow-auto py-1">
          {res.length === 0 && <li className="px-4 py-6 text-muted text-center text-[13px]">Nada encontrado.</li>}
          {res.map((o, k) => (
            <li key={o.id}>
              <button
                className={`w-full text-left px-4 py-2.5 flex items-center gap-3 ${k === i ? 'bg-surface-2' : ''}`}
                onMouseEnter={() => setI(k)}
                onClick={() => go(o.id)}
              >
                <Avatar resp={o.responsavel} size={22} />
                <span className="tnum text-muted w-14">{codigoOS(o)}</span>
                <span className="flex-1 min-w-0">
                  <span className="block truncate font-medium">{o.proponente}</span>
                  <span className="block truncate text-[12px] text-muted">{enderecoLinha(o)}</span>
                </span>
                <StatusChip status={o.status} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
