import clsx from 'clsx'
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Crown, Info, User, Users, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { STATUS_META, TIPOLOGIAS, farolDe, type Farol } from '../lib/os'
import { PERIODOS, moverPeriodo, rotuloPeriodo, type Periodo } from '../lib/faturamento'
import type { Escopo, OS, Responsavel, Status, Tipologia } from '../types'
import { useStore } from '../store/useStore'

export function StatusChip({ status, className }: { status: Status; className?: string }) {
  return (
    <span className={clsx('chip', `status-${status}`, className)}>
      <span className="dot" />
      {STATUS_META[status].label}
    </span>
  )
}

export function TipologiaChip({ t, className }: { t: Tipologia; className?: string }) {
  return <span className={clsx('chip tnum !rounded-md !h-[22px] !px-2 font-bold', `tip-${t}`, className)} title={`${t} - ${TIPOLOGIAS[t]}`}>{t}</span>
}

export function FarolChip({ os, className, selo }: { os: OS; className?: string; selo?: boolean }) {
  const f = farolDe(os)
  return <span className={clsx('chip tnum', `farol-${f.farol}`, className)}>{selo ? f.selo : f.texto}</span>
}

export function farolClass(f: Farol) {
  return `farol-${f}`
}

export function Avatar({ resp, size = 24 }: { resp: Responsavel; size?: number }) {
  const cfg = useStore((s) => s.config.responsaveis[resp])
  const dono = resp === 'luan' // dono da conta ganha a coroinha
  const cor = dono ? 'var(--brand)' : 'var(--rt)'
  const soft = dono ? 'var(--brand-soft)' : 'var(--rt-soft)'
  return (
    <span className="relative inline-flex shrink-0" title={dono ? `${cfg.nome} (dono da conta)` : cfg.nome}>
      <span
        className="inline-flex items-center justify-center rounded-full font-semibold"
        style={{ width: size, height: size, fontSize: size * 0.5, background: soft, color: cor, border: `1px solid ${cor}` }}
      >
        {cfg.curto.charAt(0).toUpperCase()}
      </span>
      {dono && (
        <Crown aria-hidden className="absolute left-1/2 -translate-x-1/2" fill="#f2c94c" color="#c99a1d" strokeWidth={1.5}
          style={{ width: Math.max(8, size * 0.55), height: Math.max(8, size * 0.55), top: -Math.max(5, size * 0.42) }} />
      )}
    </span>
  )
}

export function Segmented<T extends string>({ value, onChange, options, size }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; size?: 'sm' }) {
  return (
    <div className={clsx('seg', size === 'sm' && '[&>button]:h-6 [&>button]:px-2 [&>button]:text-xs')} role="group">
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** "Só minhas · Minha equipe", como em cada tela do sistema real. Fica ligado ao escopo global. */
export function EscopoToggle({ comGeral }: { comGeral?: boolean }) {
  const escopo = useStore((s) => s.escopo)
  const setEscopo = useStore((s) => s.setEscopo)
  const opts: { value: Escopo; label: ReactNode }[] = [
    { value: 'luan', label: <><User size={14} strokeWidth={1.75} />Só minhas</> },
    { value: 'rt', label: <><Users size={14} strokeWidth={1.75} />Minha equipe</> },
  ]
  if (comGeral) opts.push({ value: 'todas', label: 'Geral' })
  const valor = !comGeral && escopo === 'todas' ? 'luan' : escopo
  return <Segmented value={valor} onChange={setEscopo} options={opts} />
}

export function Card({ children, className, title, subtitle, actions, pad = true }: { children: ReactNode; className?: string; title?: ReactNode; subtitle?: ReactNode; actions?: ReactNode; pad?: boolean }) {
  return (
    <section className={clsx('card', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 pt-3.5 pb-2.5">
          <h3 className="card-tit">{title}{subtitle && <span className="suave">{subtitle}</span>}</h3>
          <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">{actions}</div>
        </header>
      )}
      <div className={clsx(pad && 'px-4 pb-4', !title && !actions && pad && 'pt-4')}>{children}</div>
    </section>
  )
}

export function Kpi({ label, value, tone, onClick, hint }: { label: string; value: number | string; tone?: string; onClick?: () => void; hint?: string }) {
  return (
    <button type="button" onClick={onClick} className={clsx('card card-hover text-left px-4 py-3 flex flex-col gap-1', tone)}>
      <span className="card-tit">{label}</span>
      <span className="text-2xl font-semibold tnum leading-none">{value}</span>
      {hint && <span className="text-[11.5px] text-muted">{hint}</span>}
    </button>
  )
}

export function Empty({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 gap-2">
      <div className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center text-muted"><Check size={18} /></div>
      <p className="font-medium">{title}</p>
      {text && <p className="text-muted text-[13px] max-w-sm">{text}</p>}
      {action}
    </div>
  )
}

export function Modal({ open, onClose, title, children, width = 480, footer, header, altura, fixo }: {
  open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; width?: number; footer?: ReactNode; header?: ReactNode
  /** Altura fixa (ex.: janela com abas: não muda de tamanho ao trocar de aba; o conteúdo rola por dentro). */
  altura?: string
  /** Faixa presa logo abaixo do título (ex.: as abas), que não rola junto com o conteúdo. */
  fixo?: ReactNode
}) {
  const caixa = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    // com uma janela aberta por cima de outra, o Esc fecha só a de cima
    const h = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      const abertas = document.querySelectorAll('[role=dialog]')
      if (abertas[abertas.length - 1] === caixa.current) onClose()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto backdrop-blur-[3px]" style={{ background: 'rgba(8,12,9,.5)' }} onMouseDown={onClose}>
      <div ref={caixa} className="card w-full flex flex-col max-h-[calc(100vh-24px)] sm:max-h-[calc(100vh-48px)]" style={{ maxWidth: width, height: altura }} onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-border shrink-0">
          <div className="min-w-0 flex-1">{header ?? <h3 className="font-semibold text-[16px]">{title}</h3>}</div>
          <button className="btn btn-ghost btn-icon shrink-0" onClick={onClose} aria-label="Fechar"><X size={16} /></button>
        </header>
        {fixo && <div className="px-5 pt-3 pb-3 border-b border-border shrink-0">{fixo}</div>}
        <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0">{children}</div>
        {footer && <footer className="px-5 py-3 border-t border-border flex flex-wrap items-center justify-end gap-2 shrink-0">{footer}</footer>}
      </div>
    </div>
  )
}

/** Abas internas (detalhe e formulário da O.S.), no seletor escuro do FLUXO ARQ. */
export function Abas<T extends string>({ abas, valor, onChange, linha }: { abas: { id: T; label: string }[]; valor: T; onChange: (v: T) => void; /** numa linha só, ocupando a largura toda */ linha?: boolean }) {
  return (
    <div className={clsx('seg', linha ? 'seg-linha' : 'mb-4')} role="tablist">
      {abas.map((a) => (
        <button key={a.id} type="button" role="tab" aria-selected={valor === a.id} aria-pressed={valor === a.id} onClick={() => onChange(a.id)}>{a.label}</button>
      ))}
    </div>
  )
}

/** Campo de leitura do detalhe: rótulo pequeno em caixa alta e o valor. */
export function Info2({ l, v, className }: { l: string; v: ReactNode; className?: string }) {
  return (
    <div className={clsx('min-w-0', className)}>
      <div className="text-[11px] uppercase tracking-[.07em] text-muted font-bold">{l}</div>
      <div className="mt-0.5 break-words">{v === '' || v === undefined || v === null ? <span className="text-muted">-</span> : v}</div>
    </div>
  )
}

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={clsx('flex flex-col gap-1', className)}>
      <span className="text-[12px] font-medium text-muted">{label}</span>
      {children}
    </label>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 mb-3 flex-wrap">
      <div>
        <h1 className="text-[22px] font-semibold tracking-[-0.3px] leading-tight">{title}</h1>
        {subtitle && <p className="text-muted text-[13px] mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  )
}

/** Rótulo de filtro (como "Buscar", "Status", "Tipologia" do sistema real). */
export function Filtro({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={clsx('flex flex-col gap-1', className)}>
      <span className="text-[12px] font-medium text-muted">{label}</span>
      {children}
    </div>
  )
}

/** Fecha um menu flutuante ao clicar fora dele. */
export function useFora<T extends HTMLElement>(aberto: boolean, fechar: () => void) {
  const ref = useRef<T>(null)
  useEffect(() => {
    if (!aberto) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) fechar() }
    const k = (e: KeyboardEvent) => e.key === 'Escape' && fechar()
    document.addEventListener('mousedown', h)
    window.addEventListener('keydown', k)
    return () => { document.removeEventListener('mousedown', h); window.removeEventListener('keydown', k) }
  }, [aberto, fechar])
  return ref
}

/** Seleção de vários itens, com "Marcar todos · Limpar" (filtros de Status, Tipologia e Polo do sistema real). */
export function MultiSelect<T extends string>({ rotuloVazio, opcoes, valor, onChange, icon, largura = 200, larguraMenu = 260 }: { rotuloVazio: string; opcoes: { value: T; label: string }[]; valor: T[]; onChange: (v: T[]) => void; icon?: ReactNode; largura?: number; /** largura mínima do menu aberto */ larguraMenu?: number }) {
  const [aberto, setAberto] = useState(false)
  const ref = useFora<HTMLDivElement>(aberto, () => setAberto(false))
  const rotulo = valor.length === 0 ? rotuloVazio : valor.length === 1 ? opcoes.find((o) => o.value === valor[0])?.label.split(' - ')[0] ?? '1 selecionado' : `${valor.length} selecionados`
  const alternar = (v: T) => onChange(valor.includes(v) ? valor.filter((x) => x !== v) : [...valor, v])
  return (
    <div className="relative" ref={ref}>
      <button type="button" className={clsx('input flex items-center gap-2 text-left', valor.length && '!border-[var(--brand)]')} style={{ width: largura }} onClick={() => setAberto((a) => !a)} aria-expanded={aberto}>
        {icon && <span className="text-muted shrink-0 [&>svg]:w-[15px] [&>svg]:h-[15px]">{icon}</span>}
        <span className="flex-1 truncate">{rotulo}</span>
        <ChevronDown size={14} className="text-muted shrink-0" />
      </button>
      {aberto && (
        <div className="menu-flut left-0 top-[42px] max-w-[340px]" style={{ minWidth: larguraMenu }}>
          <div className="flex items-center justify-between px-2 py-1.5 text-[12px] font-semibold">
            <button type="button" className="!w-auto !p-0 !bg-transparent text-[var(--verde-valor)]" onClick={() => onChange(opcoes.map((o) => o.value))}>Marcar todos</button>
            <button type="button" className="!w-auto !p-0 !bg-transparent text-[var(--verde-valor)]" onClick={() => onChange([])}>Limpar</button>
          </div>
          <div className="max-h-[280px] overflow-y-auto">
            {opcoes.map((o) => (
              <label key={o.value} className="flex items-start gap-2 px-2 py-1.5 rounded-md hover:bg-surface-2 text-[13px] cursor-pointer">
                <input type="checkbox" className="accent-[var(--brand)] mt-[3px]" checked={valor.includes(o.value)} onChange={() => alternar(o.value)} />
                <span className="leading-snug">{o.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/** Seletor do período no mesmo estilo dos outros filtros (menu próprio, sem a lista nativa do navegador). */
function MenuPeriodo({ periodo, setPeriodo, className }: { periodo: Periodo; setPeriodo: (p: Periodo) => void; className?: string }) {
  const [aberto, setAberto] = useState(false)
  const ref = useFora<HTMLDivElement>(aberto, () => setAberto(false))
  return (
    <div className="relative" ref={ref}>
      <button type="button" className={clsx('input flex items-center gap-2 text-left', className)} onClick={() => setAberto((a) => !a)} aria-expanded={aberto} aria-label="Período">
        <span className="flex-1 truncate">{PERIODOS[periodo]}</span>
        <ChevronDown size={14} className="text-muted shrink-0" />
      </button>
      {aberto && (
        <div className="menu-flut left-0 top-[42px] !min-w-[180px]" role="listbox">
          {(Object.keys(PERIODOS) as Periodo[]).map((p) => (
            <button key={p} type="button" role="option" aria-selected={p === periodo} onClick={() => { setPeriodo(p); setAberto(false) }}
              className={clsx('flex items-center justify-between gap-2 w-full text-left px-2 py-1.5 rounded-md text-[13px] hover:bg-surface-2', p === periodo && 'font-semibold text-[var(--verde-valor)]')}>
              {PERIODOS[p]}{p === periodo && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Período do sistema real: Todos · Semana · Mês · Ano · Período específico, com setas. */
export function FiltroPeriodo({ periodo, setPeriodo, data, setData, especifico, setEspecifico, junto }: {
  periodo: Periodo; setPeriodo: (p: Periodo) => void; data: Date; setData: (d: Date) => void
  especifico: { ini: string; fim: string }; setEspecifico: (e: { ini: string; fim: string }) => void
  /** Seletor e navegação colados num bloco só. */
  junto?: boolean
}) {
  const colado = periodo !== 'todos' && junto
  return (
    <div className={clsx('flex flex-wrap items-center', junto ? 'gap-0' : 'gap-2')}>
      <MenuPeriodo periodo={periodo} setPeriodo={setPeriodo} className={clsx(junto ? 'w-[148px]' : 'w-[160px]', colado && '!rounded-r-none')} />
      {periodo === 'especifico' ? (
        <div className={clsx('flex items-center gap-1.5', junto && 'input !rounded-l-none !border-l-0 !px-1.5')}>
          <input type="date" className={clsx('input w-[150px]', junto && '!h-7 !border-0 !bg-transparent')} value={especifico.ini} onChange={(e) => setEspecifico({ ...especifico, ini: e.target.value })} aria-label="De" />
          <span className="text-muted text-[12px]">a</span>
          <input type="date" className={clsx('input w-[150px]', junto && '!h-7 !border-0 !bg-transparent')} value={especifico.fim} onChange={(e) => setEspecifico({ ...especifico, fim: e.target.value })} aria-label="Até" />
        </div>
      ) : periodo !== 'todos' && (
        <div className={clsx('input flex items-center justify-between gap-1 !px-1 min-w-[196px]', junto && '!rounded-l-none !border-l-0')}>
          <button type="button" className="btn btn-ghost btn-icon !w-7 !h-7" aria-label="Período anterior" onClick={() => setData(moverPeriodo(periodo, data, -1))}><ChevronLeft size={16} /></button>
          <span className="font-medium whitespace-nowrap flex items-center gap-1.5"><CalendarDays size={14} className="text-muted" />{rotuloPeriodo(periodo, data).replace(/^./, (c) => c.toUpperCase())}</span>
          <button type="button" className="btn btn-ghost btn-icon !w-7 !h-7" aria-label="Próximo período" onClick={() => setData(moverPeriodo(periodo, data, 1))}><ChevronRight size={16} /></button>
        </div>
      )}
    </div>
  )
}

/** Ícone "i" com explicação ao passar o mouse. */
export function Dica({ texto, children }: { texto?: string; children?: ReactNode }) {
  return (
    <span className="dica" tabIndex={0} aria-label={texto}>
      <Info size={14} strokeWidth={1.75} />
      <span className="dica-txt" role="tooltip">{children ?? texto}</span>
    </span>
  )
}
