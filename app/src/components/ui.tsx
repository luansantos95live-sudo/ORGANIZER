import clsx from 'clsx'
import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { STATUS_META, farolDe, type Farol } from '../lib/os'
import type { OS, Responsavel, Status } from '../types'
import { useStore } from '../store/useStore'

export function StatusChip({ status, curto }: { status: Status; curto?: boolean }) {
  const m = STATUS_META[status]
  return (
    <span className={clsx('chip', `status-${status}`)}>
      <span className="dot" />
      {curto ? m.curto : m.label}
    </span>
  )
}

export function FarolChip({ os, className }: { os: OS; className?: string }) {
  const f = farolDe(os)
  return <span className={clsx('chip tnum', `farol-${f.farol}`, className)}>{f.texto}</span>
}

export function farolClass(f: Farol) {
  return `farol-${f}`
}

export function Avatar({ resp, size = 24 }: { resp: Responsavel; size?: number }) {
  const cfg = useStore((s) => s.config.responsaveis[resp])
  const cor = resp === 'luan' ? 'var(--brand)' : 'var(--rt)'
  const soft = resp === 'luan' ? 'var(--brand-soft)' : 'var(--rt-soft)'
  return (
    <span
      title={cfg.nome}
      className="inline-flex items-center justify-center rounded-full font-semibold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.42, background: soft, color: cor, border: `1px solid ${cor}` }}
    >
      {cfg.curto.slice(0, 2).toUpperCase()}
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

export function Card({ children, className, title, actions, pad = true }: { children: ReactNode; className?: string; title?: ReactNode; actions?: ReactNode; pad?: boolean }) {
  return (
    <section className={clsx('card', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 pt-3.5 pb-2.5">
          <h3 className="font-semibold text-[13px] tracking-tight">{title}</h3>
          <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">{actions}</div>
        </header>
      )}
      <div className={clsx(pad && 'px-4 pb-4', (title || actions) && !pad && '', !title && !actions && pad && 'pt-4')}>{children}</div>
    </section>
  )
}

export function Kpi({ label, value, tone, onClick, hint }: { label: string; value: number | string; tone?: string; onClick?: () => void; hint?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx('card text-left px-4 py-3 flex flex-col gap-1 transition hover:-translate-y-px', tone)}
      style={tone ? { border: 'none' } : undefined}
    >
      <span className="text-[11px] font-semibold uppercase tracking-wide opacity-80">{label}</span>
      <span className="text-2xl font-semibold tnum leading-none">{value}</span>
      {hint && <span className="text-[11px] opacity-75">{hint}</span>}
    </button>
  )
}

export function Empty({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 gap-2">
      <div className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center text-muted">✓</div>
      <p className="font-medium">{title}</p>
      {text && <p className="text-muted text-[13px] max-w-sm">{text}</p>}
      {action}
    </div>
  )
}

export function Modal({ open, onClose, title, children, width = 480 }: { open: boolean; onClose: () => void; title: string; children: ReactNode; width?: number }) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(20,20,10,.35)' }} onClick={onClose}>
      <div className="card w-full" style={{ maxWidth: width }} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <header className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
          <h3 className="font-semibold">{title}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Fechar"><X size={16} /></button>
        </header>
        <div className="px-5 py-4">{children}</div>
      </div>
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
    <div className="flex items-end justify-between gap-4 mb-5 flex-wrap">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-muted text-[13px] mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  )
}
