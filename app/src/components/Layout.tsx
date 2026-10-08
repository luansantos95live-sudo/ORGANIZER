import { CalendarDays, ChartColumn, ClipboardList, LayoutDashboard, Moon, Route, Search, Settings, Sun, Wallet } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useStore } from '../store/useStore'
import { Avatar, Segmented } from './ui'
import type { Escopo } from '../types'
import { STATUS_META, enderecoLinha, refCurta } from '../lib/os'
import { StatusChip } from './ui'

const NAV = [
  { to: '/', label: 'Painel', icon: LayoutDashboard, end: true },
  { to: '/os', label: 'Ordens de serviço', icon: ClipboardList },
  { to: '/rota', label: 'Rota do dia', icon: Route },
  { to: '/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/faturamento', label: 'Faturamento', icon: ChartColumn },
  { to: '/fechamento', label: 'Fechamento mensal', icon: Wallet },
  { to: '/config', label: 'Configurações', icon: Settings },
]

export function Layout() {
  const escopo = useStore((s) => s.escopo)
  const setEscopo = useStore((s) => s.setEscopo)
  const config = useStore((s) => s.config)
  const setConfig = useStore((s) => s.setConfig)
  const [busca, setBusca] = useState(false)

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
      <aside className="hidden md:flex w-[232px] shrink-0 flex-col border-r border-border bg-surface px-3 py-4 gap-1 sticky top-0 h-screen">
        <div className="flex items-center gap-2 px-2 pb-4">
          <span className="w-7 h-7 rounded-lg bg-brand text-white flex items-center justify-center font-bold text-sm">F</span>
          <div className="leading-tight">
            <div className="font-semibold text-[14px]">FluxoGestor</div>
            <div className="text-[11px] text-muted">laboratório · v0.1</div>
          </div>
        </div>
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className="nav-item">
            <n.icon size={17} strokeWidth={1.8} />
            {n.label}
          </NavLink>
        ))}
        <div className="mt-auto px-2 text-[11px] text-muted leading-relaxed">
          Dados fictícios salvos no navegador. Nada aqui toca o sistema real.
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-20 flex items-center gap-3 px-4 md:px-6">
          <Segmented value={escopo} onChange={setEscopo} options={opcoesEscopo} />
          <div className="hidden sm:block text-[12px] text-muted ml-1">
            {escopo === 'todas' ? 'Mostrando as duas carteiras' : escopo === 'luan' ? 'Só as suas O.S.' : `Só as O.S. de ${config.responsaveis.rt.curto}`}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button className="btn btn-secondary btn-sm gap-2" onClick={() => setBusca(true)}>
              <Search size={14} /> <span className="hidden sm:inline">Buscar O.S.</span> <span className="kbd hidden sm:inline">⌘K</span>
            </button>
            <button className="btn btn-ghost btn-icon" title="Tema" onClick={() => setConfig({ tema: config.tema === 'claro' ? 'escuro' : 'claro' })}>
              {config.tema === 'claro' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            <span className="hidden sm:inline text-[12px] text-muted first-cap">{format(new Date(), "EEE, d 'de' MMM", { locale: ptBR })}</span>
          </div>
        </header>
        <main className="flex-1 px-4 md:px-6 py-5 max-w-[1280px] w-full mx-auto pb-24 md:pb-8">
          <Outlet />
        </main>
        <nav className="md:hidden fixed bottom-0 inset-x-0 h-16 bg-surface border-t border-border flex items-stretch z-20">
          {NAV.filter((n) => n.to !== '/fechamento' && n.to !== '/config').map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `flex-1 flex flex-col items-center justify-center gap-1 text-[10px] ${isActive ? 'text-brand-strong' : 'text-muted'}`}>
              <n.icon size={20} strokeWidth={1.8} />
              {n.label.split(' ')[0]}
            </NavLink>
          ))}
        </nav>
      </div>
      {busca && <CommandBar onClose={() => setBusca(false)} />}
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
    if (!t) return os.filter((o) => o.status !== 'conferida' && o.status !== 'cancelada').slice(0, 8)
    return os.filter((o) => [o.referencia, refCurta(o.referencia), o.proponente, o.contato, enderecoLinha(o), STATUS_META[o.status].label].join(' ').toLowerCase().includes(t)).slice(0, 10)
  }, [q, os])

  useEffect(() => setI(0), [q])
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const go = (id: string) => { nav(`/os/${id}`); onClose() }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4" style={{ background: 'rgba(20,20,10,.35)' }} onClick={onClose}>
      <div className="card w-full max-w-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 h-12 border-b border-border">
          <Search size={16} className="text-muted" />
          <input
            autoFocus
            className="flex-1 bg-transparent outline-none text-[14px]"
            placeholder="Buscar por referência, nome, endereço, bairro…"
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
                <span className="tnum text-muted w-12">#{refCurta(o.referencia)}</span>
                <span className="flex-1 min-w-0">
                  <span className="block truncate font-medium">{o.proponente}</span>
                  <span className="block truncate text-[12px] text-muted">{enderecoLinha(o)}</span>
                </span>
                <StatusChip status={o.status} curto />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
