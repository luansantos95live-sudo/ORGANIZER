import clsx from 'clsx'
import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Bell, CircleCheckBig, Inbox, Mails, Play, CheckCheck, Download, ExternalLink, FileText, FolderInput, Mail, MailOpen, RefreshCw, Settings, TimerReset } from 'lucide-react'
import { Fragment, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../components/ui'
import { caixaDeEntrada, GRUPOS_EMAIL, grupoEmail, poloDoEmail, porPolo, TIPO_EMAIL, tipoEmail, type Email, type GrupoEmail } from '../lib/emails'
import { useStore } from '../store/useStore'

/** Filtros da caixa de entrada (24/11): ícone e cor de cada aba. */
const ICONE_ABA = { todos: Mails, recebidas: Inbox, finalizadas: CircleCheckBig, pept: TimerReset, gerais: Bell } as const

const COR_TIPO = { os: 'chip-v', finalizada: 'chip-fin', pept: 'chip-rt', cancelamento: 'chip-r', prazo: 'chip-l', aviso: 'farol-pausa' } as const

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
  const importarEmails = useStore((s) => s.importarEmails)
  const gmail = useStore((s) => s.config.gmail)
  const sincronizarGmail = useStore((s) => s.sincronizarGmail)
  const ultimaSinc = useStore((s) => s.gmailUltimaSinc)
  const ultimoErro = useStore((s) => s.gmailUltimoErro)
  const [sincronizando, setSincronizando] = useState(false)
  const [sp, setSp] = useSearchParams()
  // abas (24/11): Todos, O.S. recebidas, O.S. finalizadas, PEPT resolvidas e Notificações gerais; "Não lidos" filtra dentro da aba
  const [aba, setAba] = useState<'todos' | GrupoEmail>('todos')
  const [soNaoLidos, setSoNaoLidos] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [avisoImportacao, setAvisoImportacao] = useState<{ ok: boolean; texto: string } | null>(null)
  const arquivoRef = useRef<HTMLInputElement>(null)
  // Importar e-mails (10/11): o arquivo emails.json que o Claude monta a partir do Gmail (pasta "Caixa de entrada")
  const aoEscolherArquivo = async (f: File | undefined) => {
    if (f) setAvisoImportacao(importarEmails(await f.text()))
    if (arquivoRef.current) arquivoRef.current.value = ''
  }
  // Ligação com o Gmail (10/11): com o script configurado, busca ao abrir e a cada 5 minutos enquanto a tela estiver aberta
  const ligado = !!gmail.url.trim()
  const sincronizar = async (mostrar = true) => {
    if (!ligado || sincronizando) return
    setSincronizando(true)
    const r = await sincronizarGmail()
    setSincronizando(false)
    if (mostrar || !r.ok) setAvisoImportacao(r)
  }
  useEffect(() => {
    if (!ligado) return
    void sincronizar(false)
    const t = setInterval(() => void sincronizar(false), 5 * 60 * 1000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ligado])
  const lista = caixaDeEntrada(todos)
  const naoLidos = lista.filter((e) => !e.lido).length
  const daAba = (g: 'todos' | GrupoEmail) => (g === 'todos' ? lista : lista.filter((e) => grupoEmail(e) === g))
  const visiveis = soNaoLidos ? daAba(aba).filter((e) => !e.lido) : daAba(aba)
  const rotuloAba = GRUPOS_EMAIL.find((g) => g.id === aba)?.rotulo.toLowerCase()
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
          {ligado
            ? <button className="btn btn-primary" disabled={sincronizando} onClick={() => sincronizar(true)} title="Busca agora os e-mails novos da Caixa no seu Gmail (o sistema também busca sozinho a cada 5 minutos)"><RefreshCw size={15} className={clsx(sincronizando && 'animate-spin')} /> {sincronizando ? 'Buscando…' : 'Buscar no Gmail'}</button>
            : <Link to="/config?secao=gmail" className="btn btn-secondary" title="Ligue o sistema ao seu Gmail para os e-mails da Caixa entrarem sozinhos"><Settings size={15} /> Ligar ao Gmail</Link>}
          <label className={clsx('btn cursor-pointer', ligado ? 'btn-secondary' : 'btn-primary')} title="Escolha o arquivo emails.json da pasta 'Caixa de entrada' (o Claude monta esse arquivo a partir do seu Gmail). Só entram os e-mails que ainda não estão aqui.">
            <FolderInput size={15} /> Importar e-mails
            <input ref={arquivoRef} type="file" accept=".json,application/json" className="sr-only" onChange={(e) => aoEscolherArquivo(e.target.files?.[0])} />
          </label>
          <button className="btn btn-secondary" disabled={!naoLidos} onClick={marcarTodos}><CheckCheck size={15} /> Marcar todos como lidos</button>
        </>} />

      {ligado && (
        <p className={clsx('mb-2 text-[12.5px] flex items-center gap-1.5', ultimoErro ? 'text-[var(--laranja-txt)]' : 'text-muted')}>
          <RefreshCw size={12} className={clsx(sincronizando && 'animate-spin')} />
          {ultimoErro
            ? ultimoErro
            : ultimaSinc ? <>Gmail ligado · última busca {format(parseISO(ultimaSinc), "dd/MM 'às' HH:mm")} · o sistema busca sozinho a cada 5 min{gmail.criarOs ? ' · O.S. criadas automaticamente' : ''}</> : 'Gmail ligado · buscando os e-mails da Caixa…'}
        </p>
      )}
      {avisoImportacao && (
        <p className={clsx('mb-3 rounded-lg px-3 py-2 text-[13px] font-semibold', avisoImportacao.ok ? 'bg-[rgba(58,184,30,.12)] text-[var(--verde-valor)]' : 'bg-[var(--laranja-soft)] text-[var(--laranja-txt)]')}>
          {avisoImportacao.texto}
        </p>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-3 items-start">
        <section className="bloco overflow-hidden">
          {/* Filtros (24/11, redesenho): Todos numa linha, as 4 abas em grade 2×2 e a chave "Só não lidos" */}
          <div className="filtro-email">
            {[{ id: 'todos' as const, rotulo: 'Todos os e-mails' }, ...GRUPOS_EMAIL].map((g) => {
              const doGrupo = daAba(g.id)
              const novos = doGrupo.filter((e) => !e.lido).length
              const Icone = ICONE_ABA[g.id]
              return (
                <button key={g.id} type="button" className={clsx('fe-item', `fe-${g.id}`, aba === g.id && 'ativo')} aria-pressed={aba === g.id}
                  title={novos ? `${novos} não ${novos === 1 ? 'lido' : 'lidos'}` : undefined} onClick={() => setAba(g.id)}>
                  <span className="fe-ic"><Icone size={14} /></span>
                  <span className="fe-rot">{g.rotulo}</span>
                  {novos > 0 && <span className="fe-novo" aria-label={`${novos} não lidos`} />}
                </button>
              )
            })}
            <button type="button" className="fe-chave" role="switch" aria-checked={soNaoLidos} onClick={() => setSoNaoLidos((v) => !v)}>
              <span className={clsx('fe-trilho', soNaoLidos && 'ligado')}><span /></span>
              Só não lidos <b className="tnum">{naoLidos}</b>
            </button>
          </div>
          {visiveis.length === 0 ? <p className="text-[13px] text-muted text-center py-10">{aba === 'todos' ? `Nenhum e-mail${soNaoLidos ? ' não lido' : ' da Caixa'}.` : `Nada em ${rotuloAba}${soNaoLidos ? ' sem ler' : ''}.`}</p> : (
            <ul className="max-h-[calc(100vh-230px)] overflow-y-auto">
              {(aba === 'recebidas' ? porPolo(visiveis) : [{ polo: '', emails: visiveis }]).map((g) => (
                <Fragment key={g.polo || 'todos'}>
                {/* O.S. recebidas separadas por polo (24/11) */}
                {g.polo && <li className="polo-cab"><span>Polo {g.polo === 'OUTROS' || g.polo === 'SEM POLO' ? g.polo.toLowerCase() : g.polo}</span><span className="tnum">{g.emails.length}</span></li>}
                {g.emails.map((e) => {
                const t = tipoEmail(e)
                const polo = poloDoEmail(e)
                return (
                  <li key={e.id}>
                    <button onClick={() => abrir(e)} className={clsx('w-full text-left px-4 py-3 border-b border-border flex gap-3 hover:bg-[rgba(58,184,30,.06)]', aberto?.id === e.id ? 'bg-[var(--brand-soft)]' : e.lido && 'email-lido')}>
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
                          {polo && aba !== 'recebidas' && <span className="text-[11px] text-muted">· polo {polo}</span>}
                          {e.importadaId && <span className="text-[11px] text-[var(--verde-valor)] font-semibold">importada</span>}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
                </Fragment>
              ))}
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
