import clsx from 'clsx'
import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Play, CheckCheck, Download, ExternalLink, FileText, Mail, MailOpen, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../components/ui'
import { caixaDeEntrada, TIPO_EMAIL, tipoEmail, type Email } from '../lib/emails'
import { useStore } from '../store/useStore'

const COR_TIPO = { os: 'chip-v', pept: 'chip-rt', cancelamento: 'chip-r', prazo: 'chip-l', aviso: 'farol-pausa' } as const

const quando = (iso: string) => {
  const d = parseISO(iso), n = differenceInCalendarDays(new Date(), d)
  return n === 0 ? format(d, 'HH:mm') : n === 1 ? 'ontem' : format(d, 'dd/MM')
}

/** E-mails da Caixa: só os de endereços @caixa, vindos do Gmail. Do anexo .txt dá para importar a O.S. */
export function EmailsPage() {
  const todos = useStore((s) => s.emails)
  const os = useStore((s) => s.os)
  const marcarLido = useStore((s) => s.marcarEmailLido)
  const marcarTodos = useStore((s) => s.marcarTodosEmailsLidos)
  const importar = useStore((s) => s.importarDoEmail)
  const simular = useStore((s) => s.simularEmail)
  const simularPept = useStore((s) => s.simularPeptResolvida)
  const [sp, setSp] = useSearchParams()
  const [filtro, setFiltro] = useState<'todos' | 'nao_lidos'>('todos')
  const [aviso, setAviso] = useState<string | null>(null)
  const lista = caixaDeEntrada(todos)
  const naoLidos = lista.filter((e) => !e.lido).length
  const visiveis = filtro === 'nao_lidos' ? lista.filter((e) => !e.lido) : lista
  // Só abre (e marca como lido) o e-mail que você clicar.
  const aberto = lista.find((e) => e.id === sp.get('id'))

  // Abrir um e-mail marca como lido.
  useEffect(() => { if (aberto && !aberto.lido) marcarLido(aberto.id) }, [aberto?.id])
  useEffect(() => setAviso(null), [aberto?.id])

  const abrir = (e: Email) => { const n = new URLSearchParams(sp); n.set('id', e.id); setSp(n, { replace: true }) }
  const importada = aberto?.importadaId ? os.find((o) => o.id === aberto.importadaId) : undefined

  return (
    <>
      <PageHeader title="E-mails da Caixa" subtitle={<>Só os e-mails de endereços <b>@caixa</b> que chegam no seu Gmail.{naoLidos ? <> <b className="text-[var(--text)]">{naoLidos} não {naoLidos === 1 ? 'lido' : 'lidos'}</b>.</> : ''}</>}
        actions={<>
          <button className="btn btn-secondary" onClick={() => simular()} title="Só no laboratório: cria um e-mail da Caixa para testar a notificação"><Plus size={15} /> Simular novo e-mail</button>
          <button className="btn btn-secondary" onClick={() => setAviso(simularPept())} title="Só no laboratório: a Caixa avisa que a PEPT de uma O.S. pausada foi resolvida"><Plus size={15} /> Simular PEPT resolvida</button>
          <button className="btn btn-secondary" disabled={!naoLidos} onClick={marcarTodos}><CheckCheck size={15} /> Marcar todos como lidos</button>
        </>} />

      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-3 items-start">
        <section className="bloco overflow-hidden">
          <div className="flex gap-1 p-2 border-b border-border">
            {([['todos', `Todos ${lista.length}`], ['nao_lidos', `Não lidos ${naoLidos}`]] as const).map(([k, l]) => (
              <button key={k} className={clsx('btn btn-sm !rounded-full', filtro === k ? 'btn-primary' : 'btn-ghost')} onClick={() => setFiltro(k)}>{l}</button>
            ))}
          </div>
          {visiveis.length === 0 ? <p className="text-[13px] text-muted text-center py-10">Nenhum e-mail {filtro === 'nao_lidos' ? 'não lido' : 'da Caixa'}.</p> : (
            <ul className="max-h-[calc(100vh-230px)] overflow-y-auto">
              {visiveis.map((e) => {
                const t = tipoEmail(e)
                return (
                  <li key={e.id}>
                    <button onClick={() => abrir(e)} className={clsx('w-full text-left px-4 py-3 border-b border-border flex gap-3 hover:bg-[rgba(58,184,30,.06)]', aberto?.id === e.id && 'bg-[var(--brand-soft)]')}>
                      <span className={clsx('mt-1.5 w-2 h-2 rounded-full shrink-0', e.lido ? 'bg-transparent' : 'bg-[var(--brand)]')} aria-label={e.lido ? undefined : 'não lido'} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className={clsx('truncate text-[13.5px]', e.lido ? 'font-medium' : 'font-bold')}>{e.nome}</span>
                          <span className="ml-auto text-[11.5px] text-muted shrink-0">{quando(e.recebidoEm)}</span>
                        </span>
                        <span className={clsx('block truncate text-[13px]', !e.lido && 'font-semibold')}>{e.assunto}</span>
                        <span className="flex items-center gap-1.5 mt-1">
                          <span className={clsx('chip !h-[20px] text-[11px]', COR_TIPO[t])}>{TIPO_EMAIL[t]}</span>
                          {e.anexo && <span className="text-[11px] text-muted flex items-center gap-1"><FileText size={11} />.txt</span>}
                          {e.importadaId && <span className="text-[11px] text-[var(--verde-valor)] font-semibold">importada</span>}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="bloco p-6 min-h-[420px]">
          {!aberto ? <div className="h-full flex flex-col items-center justify-center text-center gap-2 py-16 text-muted"><MailOpen size={30} /><p className="text-[13.5px]">Escolha um e-mail à esquerda para ler.</p></div> : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-[19px] font-bold leading-snug">{aberto.assunto}</h2>
                  <p className="text-[13px] text-muted mt-1">{aberto.nome} &lt;{aberto.de}&gt; · {format(parseISO(aberto.recebidoEm), "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR })}</p>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => marcarLido(aberto.id, false)} title="Marcar como não lido"><Mail size={14} /> Não lido</button>
              </div>
              <div className="mt-5 text-[14px] leading-relaxed whitespace-pre-line">{aberto.corpo}</div>
              {aberto.anexo && (
                <div className="mt-6 rounded-2xl border border-border p-4 flex flex-wrap items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-[var(--brand-soft)] text-[var(--verde-valor)] flex items-center justify-center"><FileText size={19} /></span>
                  <span className="flex-1 min-w-[180px]"><b className="block text-[13.5px]">{aberto.anexo.nome}</b><span className="text-[12px] text-muted">Arquivo da O.S. (SIOPI)</span></span>
                  {importada
                    ? <Link to={`/os/${importada.id}`} className="btn btn-secondary"><ExternalLink size={14} /> Abrir OS-{importada.numero}</Link>
                    : <button className="btn btn-primary" onClick={() => setAviso(importar(aberto.id).texto)}><Download size={15} /> Importar O.S.</button>}
                </div>
              )}
              {aviso && <p className="mt-3 text-[13px] font-semibold text-[var(--verde-valor)]">{aviso}</p>}
              {tipoEmail(aberto) === 'pept' && (() => {
                const alvo = os.find((o) => o.id === aberto.peptOsId)
                return (
                  <div className="mt-6 rounded-2xl border border-border p-4 flex flex-wrap items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-[var(--rt-soft)] text-[var(--rt)] flex items-center justify-center"><Play size={18} /></span>
                    <span className="flex-1 min-w-[180px]">
                      <b className="block text-[13.5px]">{alvo ? `PEPT da OS-${alvo.numero} finalizada` : 'PEPT resolvida'}</b>
                      <span className="text-[12px] text-muted">{alvo ? 'O sistema tirou a O.S. da pausa no dia deste e-mail e o prazo voltou a contar.' : 'Não achei essa O.S. no sistema.'}</span>
                    </span>
                    {alvo && <Link to={`/os/${alvo.id}`} className="btn btn-secondary"><ExternalLink size={14} /> Abrir OS-{alvo.numero}</Link>}
                  </div>
                )
              })()}
              {!aberto.anexo && tipoEmail(aberto) !== 'pept' && <p className="mt-6 text-[12.5px] text-muted flex items-center gap-1.5"><MailOpen size={14} />E-mail só de aviso, sem O.S. para importar.</p>}
            </>
          )}
        </section>
      </div>
    </>
  )
}
