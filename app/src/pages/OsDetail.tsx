import clsx from 'clsx'
import { format } from 'date-fns'
import { CalendarPlus, Check, CircleCheck, DoorClosed, FileWarning, MapPin, MessageCircle, Pause, PauseCircle, Pencil, Phone, RotateCcw, Trash2, UserCheck } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { OsForm } from '../components/OsForm'
import { PausarOS } from '../components/PausarOS'
import { AcaoPept, type ModoPept } from '../components/PeptJanelas'
import { Abas, Avatar, FarolChip, Modal, StatusChip, TipologiaChip, useFora } from '../components/ui'
import { repasseDaOS, valorTotal } from '../lib/faturamento'
import { ORIGEM_META, STATUS_META, TIPOLOGIAS, brl, codigoOS, dataHora, dataMedia, enderecoLinha, enderecoMaps, limiteParaPausar, pausaValida, poloDe, prazoEfetivo, prazoIndeterminado, telefoneWhats, tipoEvento } from '../lib/os'
import type { TipoEvento } from '../lib/os'
import { estadoPassos, passosDaOS, proximoPasso, voltarParaPasso } from '../lib/passos'
import { COMO_RESOLVEU, ORIGEM_RESOLUCAO, TIPO_PEPT, peptAberta, peptsDaOS, prazosDaPept, resumoPept, ultimaFinalizada } from '../lib/pept'
import { lerCoordenadas, textoGMS } from '../lib/coordenadas'
import { useStore } from '../store/useStore'
import type { OS, PassoKey, TipoPept } from '../types'

// Abas compatíveis juntas (22/10): Cliente + Contato = "Cliente e contato"; Importação foi para o fim da Geral.
type Aba = 'passos' | 'geral' | 'cliente' | 'endereco' | 'vistoria' | 'valores' | 'pept' | 'historico'
const ABAS: { id: Aba; label: string }[] = [
  { id: 'passos', label: 'Passo a passo' }, { id: 'geral', label: 'Geral' }, { id: 'cliente', label: 'Cliente e contato' }, { id: 'endereco', label: 'Endereço' },
  { id: 'vistoria', label: 'Vistoria' }, { id: 'valores', label: 'Valores' },
  // Abas do laboratório (não existem no sistema real):
  { id: 'pept', label: 'PEPT' }, { id: 'historico', label: 'Linha do tempo' },
]

const dt = (iso?: string) => (iso ? dataMedia(iso) : '')

// Cor do ponto de cada evento na linha do tempo.
const COR_EVENTO: Record<TipoEvento, string> = {
  devolucao: 'var(--vermelho)', etapa: 'var(--brand)', contato: 'var(--azul)', pausa: 'var(--laranja)', vistoria: 'var(--ciano)', outro: 'var(--muted)',
}

/**
 * Detalhe da O.S. em janela, no modelo do sistema real: no topo a OS em destaque, o cliente, as etiquetas e os
 * botões (Concluir, Pausar, Editar, Excluir); abas de dados em duas colunas (nome do campo em cima, valor embaixo).
 */
export function DetalheOS({ id, abaInicial, onClose }: { id: string; abaInicial?: Aba; onClose: () => void }) {
  const nav = useNavigate()
  const os = useStore((s) => s.os.find((o) => o.id === id))
  const config = useStore((s) => s.config)
  const mudarStatus = useStore((s) => s.mudarStatus)
  const removerOS = useStore((s) => s.removerOS)
  const marcarFaturada = useStore((s) => s.marcarFaturada)
  const [aba, setAba] = useState<Aba>(abaInicial ?? 'passos')
  const [editando, setEditando] = useState(false)
  const [pausando, setPausando] = useState(false)
  const [acaoPept, setAcaoPept] = useState<ModoPept | null>(null)
  const [confirma, setConfirma] = useState<'excluir' | 'concluir' | null>(null)

  useEffect(() => { setAba(abaInicial ?? 'passos'); setConfirma(null) }, [id, abaInicial])

  if (!os) return null
  const aberta = os.status !== 'concluida' && os.status !== 'cancelada'
  const empresa = [config.empresa.razao || config.empresa.fantasia, config.empresa.cnpj && `CNPJ: ${config.empresa.cnpj}`].filter(Boolean).join(' | ')

  const header = (
    <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
      {/* o número e o cliente nunca ficam espremidos: com muitos botões, os botões descem para a linha de baixo */}
      <div className="min-w-[240px] flex-1">
        <div className="text-[22px] font-bold leading-tight tnum text-[var(--verde-valor)]">{codigoOS(os)}</div>
        <div className="text-[14px] text-muted truncate">{os.proponente}</div>
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <FarolChip os={os} selo />
          <TipologiaChip t={os.tipologia} />
          <StatusChip status={os.status} />
          {os.faturada && <span className="chip chip-v !h-[22px]"><Check size={12} />Faturada</span>}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2 mt-1">
        {aberta && <button className="btn btn-primary" onClick={() => setConfirma('concluir')}><CircleCheck size={15} /> Concluir</button>}
        {/* Cliente resolveu / Finalizar PEPT / Reabrir PEPT ficam só dentro da aba PEPT (pedido de 23/10);
            no topo, só Pausar (PEPT) quando não há PEPT em aberto */}
        {aberta && !peptAberta(os) && <button className="btn btn-secondary" onClick={() => setPausando(true)}><Pause size={15} /> Pausar (PEPT)</button>}
        <button className="btn btn-secondary" onClick={() => setEditando(true)}><Pencil size={14} /> Editar</button>
        <button className="btn btn-ghost text-[var(--vermelho)]" onClick={() => setConfirma('excluir')}><Trash2 size={14} /> Excluir</button>
      </div>
    </div>
  )

  // o rodapé só aparece para confirmar (concluir ou excluir)
  const footer = confirma === 'excluir' ? (
    <>
      <span className="text-[13px] mr-auto">Excluir {codigoOS(os)} de vez? Não dá para desfazer.</span>
      <button className="btn btn-secondary" onClick={() => setConfirma(null)}>Não</button>
      <button className="btn" style={{ background: 'var(--vermelho)', color: '#fff' }} onClick={() => { removerOS(os.id); onClose() }}>Sim, excluir</button>
    </>
  ) : confirma === 'concluir' ? (
    <>
      <span className="text-[13px] mr-auto">Concluir {codigoOS(os)} hoje? Ela passa para o Financeiro como "a faturar".</span>
      <button className="btn btn-secondary" onClick={() => setConfirma(null)}>Não</button>
      <button className="btn btn-primary" onClick={() => { mudarStatus(os.id, 'concluida'); setConfirma(null) }}>Concluir</button>
    </>
  ) : undefined

  return (
    <>
      {/* tamanho fixo: a janela não muda de altura ao trocar de aba; as abas ficam presas no topo e o conteúdo rola */}
      <Modal open={!editando} onClose={onClose} header={header} width={860} footer={footer} altura="min(720px, calc(100vh - 48px))"
        fixo={<Abas linha abas={ABAS} valor={aba} onChange={setAba} />}>
        {pausando && <PausarOS os={os} onClose={() => setPausando(false)} />}
        {acaoPept && <AcaoPept os={os} modo={acaoPept} onClose={() => setAcaoPept(null)} />}

        {aba === 'passos' && <PassoAPasso os={os} onAgendar={() => nav('/rotas')} onPept={() => setPausando(true)} />}

        {/* Abas de dados no modelo do sistema real: duas colunas, nome do campo em cima e valor embaixo; vazio = "-" */}
        {aba === 'geral' && (
          <Grade>
            <Dado l="OS" v={codigoOS(os)} />
            <Dado l="Nº" v={<span className="tnum">{os.referencia}</span>} />
            <Dado l="Tipologia" v={TIPOLOGIAS[os.tipologia]} />
            <Dado l="Código" v={os.tipologia} />
            <Dado l="Polo" v={poloDe(os.endereco.cidade)} />
            <Dado l="Mês referência" v={os.mesReferencia} />
            <Dado l="Origem" v={ORIGEM_META[os.origem]} />
            <Dado l="Referência" v={empresa || <span className="text-muted font-normal">Preencha a empresa em Configurações</span>} />
            <Dado l="Técnico" v={
              // sem troca de técnico: a O.S. vem vinculada ao RT do polo (pedido do usuário em 22/10)
              <span className="flex items-center gap-2"><Avatar resp={os.responsavel} size={20} />{config.responsaveis[os.responsavel].nome}</span>} />
            <Dado l="Propriedade" v={os.propriedade} />
            <Dado l="Observação" v={os.observacoes} largo />
            <Dado l="Descrição" v={os.descricao} largo />
          </Grade>
        )}
        {/* Geral também tem as datas da O.S. (a aba Datas virou Vistoria) e, no fim, a Importação (dados do .txt da Caixa) */}
        {aba === 'geral' && (
          <>
            <Subtitulo>Datas</Subtitulo>
            <Grade>
              <Dado l="Data recebimento" v={dt(os.emissao)} />
              <Dado l="Prazo" v={dt(os.prazo)} />
              <Dado l="Prazo efetivo" v={prazoIndeterminado(os) ? <span className="text-[var(--laranja-txt)]" title="A413 em PEPT: o prazo fica parado até a pendência ser resolvida">Indeterminado (PEPT)</span> : <span className={clsx(prazoEfetivo(os) !== os.prazo && 'text-[var(--laranja-txt)]')}>{dt(prazoEfetivo(os))}</span>} />
              <Dado l="Data entrega" v={dt(os.entregaEm)} />
              <Dado l="Data conclusão" v={dt(os.concluidaEm)} />
              <Dado l="Pausado em" v={dt(os.pausadoEm)} />
              <Dado l="Dias pausado" v={os.diasPausado || ''} />
            </Grade>
            <Subtitulo>Importação</Subtitulo>
            <Grade>
              <Dado l="Cód. produto" v={os.importacao.codProduto} />
              <Dado l="Cód. linha" v={os.importacao.codLinha} />
              <Dado l="Cód. fonte" v={os.importacao.codFonte} />
              <Dado l="Nº registro" v={os.matricula} />
              <Dado l="Cartório" v={os.importacao.cartorio} />
              <Dado l="Livro" v={os.importacao.livro} />
              <Dado l="Local retirada" v={os.importacao.localRetirada} />
              <Dado l="Solicitante" v={os.importacao.solicitante} />
              <Dado l="Executante" v={os.importacao.executante} />
            </Grade>
          </>
        )}

        {/* Cliente e contato numa aba só (antes eram duas) */}
        {aba === 'cliente' && (
          <>
            <Subtitulo primeiro>Cliente</Subtitulo>
            <Grade>
              <Dado l="Nome" v={os.proponente} />
              <Dado l="Documento" v={os.documento && <span className="tnum">{os.documento}</span>} />
              <Dado l="Telefone" v={os.clienteTelefone && <Fone numero={os.clienteTelefone} nome={os.proponente} os={os} />} />
              <Dado l="E-mail" v={os.clienteEmail} />
            </Grade>
            <Subtitulo>Contato para a vistoria</Subtitulo>
            <Grade>
              <Dado l="Nome" v={os.contato} />
              <Dado l="Telefone" v={os.telefone && <Fone numero={os.telefone} nome={os.contato} os={os} />} />
              <Dado l="WhatsApp" v={os.whatsapp && <Fone numero={os.whatsapp} nome={os.contato} os={os} soWhats />} />
              <Dado l="E-mail" v={os.contatoEmail} />
            </Grade>
          </>
        )}

        {aba === 'endereco' && (
          <>
            <Grade>
              <Dado l="Logradouro" v={os.endereco.logradouro} />
              <Dado l="Número" v={os.endereco.numero} />
              <Dado l="Bairro" v={os.endereco.bairro} />
              <Dado l="Cidade" v={os.endereco.cidade} />
              <Dado l="Estado" v={os.endereco.uf} />
              <Dado l="CEP" v={os.endereco.cep && <span className="tnum">{os.endereco.cep}</span>} />
            </Grade>
            <p className="text-[12.5px] text-muted mt-5">As coordenadas do imóvel ficam na aba <button type="button" className="font-semibold text-[var(--verde-valor)] hover:underline" onClick={() => setAba('vistoria')}>Vistoria</button>.</p>
          </>
        )}

        {/* Vistoria: só para ver as datas da vistoria e cadastrar as coordenadas; a vistoria é marcada no módulo de Rotas */}
        {aba === 'vistoria' && (
          <>
            <Subtitulo primeiro>Datas da vistoria</Subtitulo>
            <Grade>
              <Dado l="Situação" v={!os.vistoria ? <span className="text-muted">Ainda não marcada</span> : os.vistoria.feita ? <span className="text-[var(--verde-valor)]">Feita</span> : 'Marcada'} />
              <Dado l="Data e hora" v={os.vistoria && `${dt(os.vistoria.data)} às ${os.vistoria.hora}`} />
            </Grade>
            <p className="text-[12.5px] text-muted mt-3">As vistorias são marcadas no módulo de <Link to="/rotas" className="font-semibold text-[var(--verde-valor)] hover:underline">Rotas</Link>.</p>

            <Subtitulo>Local e coordenadas</Subtitulo>
            <Grade className="mb-4">
              <Dado l="Endereço" v={enderecoLinha(os)} />
              <Dado l="Polo" v={poloDe(os.endereco.cidade)} />
            </Grade>
            <CoordenadasOS os={os} />
          </>
        )}

        {aba === 'valores' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Cartao l="Valor" v={brl(os.valorServico)} />
              <Cartao l="Deslocamento" v={brl(os.valorDeslocamento)} />
              <Cartao l="Total" v={brl(valorTotal(os))} destaque />
            </div>
            {(os.responsavel === 'rt' || os.status === 'concluida') && (
              <Grade className="mt-5">
                {os.responsavel === 'rt' && <Dado l={`Sua parte (${Math.round(config.repasseRT * 100)}%)`} v={<span className="tnum text-[var(--verde-valor)]">{brl(repasseDaOS(os, config.repasseRT, config.repasseBase))}</span>} />}
                {os.status === 'concluida' && (
                  <Dado l="Faturada" v={
                    <span className="flex items-center gap-2">{os.faturada ? `Sim, em ${dt(os.faturadaEm)}` : 'Ainda não'}
                      <button className="btn btn-secondary btn-sm !h-6" onClick={() => marcarFaturada(os.id, !os.faturada)}>{os.faturada ? 'Desmarcar' : 'Marcar'}</button>
                    </span>} />
                )}
              </Grade>
            )}
          </>
        )}

        {aba === 'pept' && <AbaPept os={os} aberta={aberta} onPausar={() => setPausando(true)} onAcaoPept={setAcaoPept} />}

        {aba === 'historico' && (
          <ol className="relative flex flex-col gap-3 pl-5 before:absolute before:left-[5px] before:top-1.5 before:bottom-1.5 before:w-px before:bg-[var(--border)]">
            {[...os.historico].reverse().map((h, i) => (
              <li key={i} className="relative flex flex-col sm:flex-row sm:gap-3 text-[13px]">
                <span className="absolute -left-5 top-[4px] w-[11px] h-[11px] rounded-full border-2 border-[var(--surface)]" style={{ background: COR_EVENTO[tipoEvento(h.texto)] }} />
                <span className="tnum text-muted sm:w-[92px] shrink-0">{dataHora(h.data)}</span>
                <span>{h.texto}</span>
              </li>
            ))}
          </ol>
        )}
      </Modal>
      <OsForm open={editando} modo={{ tipo: 'editar', os }} onClose={() => setEditando(false)} />
    </>
  )
}

/** Checklist do serviço Caixa: o que já foi feito, o próximo passo e o botão para marcar. */
function PassoAPasso({ os, onAgendar, onPept }: { os: NonNullable<ReturnType<typeof useStore.getState>['os'][number]>; onAgendar: () => void; onPept: () => void }) {
  const marcarPasso = useStore((s) => s.marcarPasso)
  const voltarPasso = useStore((s) => s.voltarPasso)
  const hojeStr = format(new Date(), 'yyyy-MM-dd')
  const est = estadoPassos(os, hojeStr)
  const prox = proximoPasso(os, hojeStr)
  const aberta = os.status !== 'concluida' && os.status !== 'cancelada'
  // Clicar no visto de um passo feito pergunta se quer desmarcar: ele e os seguintes voltam a ficar pendentes.
  const [pergunta, setPergunta] = useState<PassoKey | null>(null)
  const refPergunta = useFora<HTMLDivElement>(!!pergunta, () => setPergunta(null))
  const podeVoltar = (k: PassoKey) => os.status !== 'cancelada' && k !== 'recebida' && est[k].estado !== 'pendente' && !(k === 'pept' && os.pausadoEm)
  const resumoVolta = (k: PassoKey) => {
    const lista = passosDaOS(os)
    const depois = lista.slice(lista.findIndex((p) => p.key === k) + 1).filter((p) => est[p.key].estado !== 'pendente').length
    const etapa = voltarParaPasso(os, k, hojeStr).status
    return [depois > 0 && `${depois === 1 ? 'O passo seguinte também volta' : `Os ${depois} passos seguintes também voltam`}.`,
      etapa && `A etapa volta para ${STATUS_META[etapa].label}.`].filter(Boolean).join(' ')
  }
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="text-[13px]"><b className="text-[15px]">Passo {Math.min(prox.feitos + 1, prox.total)} de {prox.total}</b>
          <span className="text-muted"> · {prox.key ? `próximo: ${prox.label.toLowerCase()}` : 'todos os passos feitos (para finalizar, use Concluir)'}</span></div>
        <div className="h-2 w-[220px] rounded-full bg-[var(--seg)] overflow-hidden"><div className="h-full rounded-full bg-[var(--brand)]" style={{ width: `${(prox.feitos / prox.total) * 100}%` }} /></div>
      </div>
      <ol className="flex flex-col">
        {passosDaOS(os).map((p) => {
          const e = est[p.key]
          const eProx = p.key === prox.key
          return (
            <li key={p.key} className={clsx('relative flex items-center gap-3 px-3 py-2.5 rounded-lg border-b border-border last:border-b-0', eProx && 'bg-[var(--brand-soft)]')}>
              <button type="button" disabled={!podeVoltar(p.key)} onClick={() => setPergunta(pergunta === p.key ? null : p.key)}
                title={podeVoltar(p.key) ? 'Desmarcar este passo' : undefined}
                className={clsx('w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 disabled:cursor-default enabled:hover:opacity-75 enabled:cursor-pointer',
                e.estado === 'feito' ? 'bg-[var(--brand)] border-[var(--brand)] text-white' : e.estado === 'pulado' ? 'border-[var(--fraco)] text-[var(--fraco)]' : eProx ? 'border-[var(--brand)]' : 'border-[var(--border)]')}>
                {e.estado === 'feito' ? <Check size={13} strokeWidth={3} /> : e.estado === 'pulado' ? '–' : null}
              </button>
              {pergunta === p.key && (
                <div ref={refPergunta} className="absolute left-2 top-[calc(100%-4px)] z-20 w-[300px] bloco !rounded-[12px] shadow-lg p-3">
                  <div className="text-[13px] font-semibold">Desmarcar “{p.label}”?</div>
                  {resumoVolta(p.key) && <div className="text-[12px] text-muted mt-1">{resumoVolta(p.key)}</div>}
                  <div className="flex justify-end gap-1.5 mt-2.5">
                    <button className="btn btn-ghost btn-sm" onClick={() => setPergunta(null)}>Cancelar</button>
                    <button className="btn btn-primary btn-sm" onClick={() => { voltarPasso(os.id, p.key); setPergunta(null) }}>Desmarcar</button>
                  </div>
                </div>
              )}
              <span className={clsx('flex-1 text-[13.5px]', e.estado === 'feito' && 'text-muted', eProx && 'font-semibold')}>
                {p.label}{e.estado === 'pulado' && <span className="text-muted"> (não precisou)</span>}{eProx && <span className="text-[var(--verde-valor)] text-[12px] font-semibold"> ← próximo</span>}
              </span>
              <span className="text-[12px] text-muted tnum w-[86px] text-right">{e.em && e.em.length >= 10 ? dataMedia(e.em.slice(0, 10)) : ''}</span>
              <span className="w-[200px] flex justify-end gap-1.5">
                {aberta && e.estado === 'pendente' && p.key !== 'recebida' && (
                  p.key === 'pept' ? <>
                    <button className="btn btn-secondary btn-sm" onClick={onPept}><Pause size={13} />Abrir PEPT</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => marcarPasso(os.id, 'pept', 'pulado')}>Não precisa</button>
                  </> : p.key === 'marcar_vistoria' && !os.vistoria
                    ? <button className={clsx('btn btn-sm', eProx ? 'btn-primary' : 'btn-secondary')} onClick={onAgendar}><CalendarPlus size={13} />Marcar data</button>
                    : <button className={clsx('btn btn-sm', eProx ? 'btn-primary' : 'btn-secondary')} onClick={() => marcarPasso(os.id, p.key, 'feito')}><Check size={13} />Feito</button>
                )}
              </span>
            </li>
          )
        })}
      </ol>
      <p className="text-[12px] text-muted mt-3">Fazer vistoria, Baixar o laudo e Assinar também andam a etapa da O.S. sozinhos. Terminar os passos (inclusive Enviar) não finaliza a O.S.: para isso use o botão Concluir. Para desfazer, clique no visto do passo: ele e os seguintes voltam a ficar pendentes.</p>
    </div>
  )
}

/** Duas colunas, como no sistema real. */
function Grade({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5', className)}>{children}</div>
}

/** Campo das abas de dados: nome em cima (pequeno, caixa alta) e valor embaixo; vazio mostra "-". */
function Dado({ l, v, largo }: { l: string; v: ReactNode; largo?: boolean }) {
  return (
    <div className={clsx('min-w-0', largo && 'sm:col-span-2')}>
      <div className="text-[11px] uppercase tracking-[.07em] text-muted font-bold">{l}</div>
      <div className="mt-1 text-[14px] font-semibold break-words">{v || v === 0 ? v : <span className="text-muted font-normal">-</span>}</div>
    </div>
  )
}

/** Cartão de valor (aba Valores e resumo da PEPT); o de destaque fica verde, como o Total do sistema real. */
function Cartao({ l, v, sub, destaque }: { l: string; v: ReactNode; sub?: ReactNode; destaque?: boolean }) {
  return (
    <div className={clsx('rounded-[12px] border px-4 py-3', destaque ? 'bg-[var(--brand)] border-[var(--brand)] text-white' : 'border-border bg-[var(--surface-2)]')}>
      <div className={clsx('text-[11px] uppercase tracking-[.07em] font-bold', destaque ? 'text-white/80' : 'text-muted')}>{l}</div>
      <div className="mt-1 text-[20px] font-bold tnum leading-tight">{v}</div>
      {sub && <div className={clsx('text-[12px] mt-0.5', destaque ? 'text-white/80' : 'text-muted')}>{sub}</div>}
    </div>
  )
}

const ICONE_PEPT: Record<TipoPept, typeof FileWarning> = { documental: FileWarning, vistoria: DoorClosed }
const TipoPeptChip = ({ tipo }: { tipo?: TipoPept }) => {
  if (!tipo) return <span className="chip !h-[22px] bg-[var(--seg)] text-muted">Não informado</span>
  const Ic = ICONE_PEPT[tipo]
  return <span className={clsx('chip !h-[22px]', tipo === 'documental' ? 'chip-l' : 'bg-[var(--azul-soft)] text-[var(--azul)]')}><Ic size={12} />{TIPO_PEPT[tipo].label}</span>
}

/**
 * Aba PEPT: a PEPT em aberto (tipo, pendência, há quantos dias, limite da tipologia) com o botão de resolver,
 * o resumo (quantas PEPTs, dias parados, prazo efetivo) e o histórico de todas as PEPTs da O.S.
 */
function AbaPept({ os, aberta, onPausar, onAcaoPept }: { os: OS; aberta: boolean; onPausar: () => void; onAcaoPept: (modo: ModoPept) => void }) {
  const finalizada = ultimaFinalizada(os)
  const editarDatasPept = useStore((s) => s.editarDatasPept)
  const [erro, setErro] = useState('')
  const r = resumoPept(os)
  const pz = prazosDaPept(os)
  const lista = [...peptsDaOS(os)].reverse()
  const a = r.aberta
  const hoje = format(new Date(), 'yyyy-MM-dd')
  // muda uma data da PEPT; se as datas ficarem fora de ordem, avisa e não grava
  const mudarData = (peptId: string, datas: { inicio?: string; resolvidaEm?: string; fim?: string }) => {
    if (!datas.inicio && !datas.resolvidaEm && !datas.fim) return
    setErro(editarDatasPept(os.id, peptId, datas) ? '' : 'Datas fora de ordem: a abertura vem antes da resolução do cliente, e a resolução antes do encerramento.')
  }
  const campoData = (valor: string, onChange: (v: string) => void, min?: string, rotulo?: string) => (
    <input type="date" className="input !h-8 !px-1.5 !text-[12.5px] w-[124px] tnum" value={valor} min={min} max={hoje} aria-label={rotulo}
      onChange={(e) => { if (e.target.value) onChange(e.target.value) }} />
  )
  return (
    <div className="flex flex-col gap-5">
      {a ? (
        <section className={clsx('rounded-[14px] border px-4 py-3.5', a.emAnalise ? 'border-[var(--brand)] bg-[var(--brand-soft)]' : 'border-[var(--laranja)] bg-[var(--laranja-soft)]')}>
          <div className="flex flex-wrap items-center gap-2">
            {a.emAnalise
              ? <span className="chip !h-[22px] chip-v"><UserCheck size={12} />Resolvida pelo cliente · em análise</span>
              : <span className="chip !h-[22px] chip-l"><PauseCircle size={12} />PEPT aberta · aguardando o cliente</span>}
            <TipoPeptChip tipo={a.pept.tipo} />
            <span className="ml-auto flex flex-wrap items-center gap-2 text-[12.5px] text-muted">
              Aberta em {campoData(a.pept.inicio, (v) => mudarData(a.pept.id, { inicio: v }), os.emissao, 'Data de abertura da PEPT')}
              {a.pept.resolvidaEm && <>Resolvida em {campoData(a.pept.resolvidaEm, (v) => mudarData(a.pept.id, { resolvidaEm: v }), a.pept.inicio, 'Data em que o cliente resolveu')}</>}
            </span>
          </div>
          {/* motivo editável: escreve e salva sozinho ao sair da caixa */}
          <MotivoPept os={os} peptId={a.pept.id} motivo={a.pept.motivo} />
          <div className="text-[13px] mt-2">
            {a.emAnalise
              ? <>O cliente resolveu em <b>{dt(a.pept.resolvidaEm)}</b> ({a.pept.resolucao ? ORIGEM_RESOLUCAO[a.pept.resolucao] : 'registrada'}): <b>o prazo voltou a contar</b>, vence em <b>{dt(prazoEfetivo(os))}</b>. Analise: valide e finalize, ou reabra se não resolveu tudo.</>
              : !pausaValida(os) ? <span className="text-[var(--vermelho)] font-semibold">Aberta depois de {dt(limiteParaPausar(os.emissao))} (mais de 2 dias do recebimento em {dt(os.emissao)}): o prazo <u>não</u> está pausado e continua correndo. Vence em {dt(prazoEfetivo(os))}.</span>
                : a.indeterminado ? <>Prazo <b>indeterminado</b> enquanto a PEPT estiver aberta ({os.tipologia}). Parado há {a.dias} {a.dias === 1 ? 'dia' : 'dias'}.</>
                  : a.limite !== undefined ? (a.restam! > 0
                    ? <>Prazo parado há {a.dias} {a.dias === 1 ? 'dia' : 'dias'}. {os.tipologia}: segura o prazo por no máximo {a.limite} dias. <b>{a.restam === 1 ? 'Falta 1 dia' : `Faltam ${a.restam} dias`}</b> para o limite.</>
                    : <span className="text-[var(--vermelho)] font-semibold">{os.tipologia}: passou do limite de {a.limite} dias da PEPT.</span>)
                    : <>Prazo parado há {a.dias} {a.dias === 1 ? 'dia' : 'dias'}. Se o cliente resolver hoje, vence em <b>{dt(prazoEfetivo(os))}</b>.</>}
          </div>
          {aberta && (
            <div className="flex flex-wrap gap-2 mt-3">
              {/* Finalizar e Reabrir sempre (como o usuário aprovou) + Cliente resolveu enquanto pausada; mesma tela, com a data */}
              {!a.emAnalise && <button className="btn btn-primary btn-sm" onClick={() => onAcaoPept('resolver')}><UserCheck size={14} /> Cliente resolveu</button>}
              <button className={clsx('btn btn-sm', a.emAnalise ? 'btn-primary' : 'btn-secondary')} disabled={!a.emAnalise} title={a.emAnalise ? undefined : 'Registre antes o dia em que o cliente resolveu'} onClick={() => onAcaoPept('finalizar')}><CircleCheck size={14} /> Finalizar PEPT</button>
              <button className="btn btn-secondary btn-sm" disabled={!a.emAnalise} title={a.emAnalise ? undefined : 'Registre antes o dia em que o cliente resolveu'} onClick={() => onAcaoPept('reabrir')}><RotateCcw size={14} /> Reabrir PEPT</button>
              {!a.emAnalise && <span className="text-[12px] text-muted self-center">Reabrir e Finalizar ficam liberados depois de registrar a resolução do cliente.</span>}
            </div>
          )}
        </section>
      ) : (
        <section className="rounded-[14px] border border-border px-4 py-3.5 flex flex-wrap items-center gap-3">
          <span className="text-[14px]"><b>Sem PEPT em aberto.</b> <span className="text-muted">O prazo está correndo normalmente.</span></span>
          {aberta && <span className="ml-auto flex flex-wrap gap-2">
            {finalizada && <button className="btn btn-primary btn-sm" onClick={() => onAcaoPept('reabrir')} title={`Volta a ficar aberta com o mesmo motivo: ${finalizada.motivo || 'sem motivo'}`}><RotateCcw size={14} /> Reabrir PEPT</button>}
            <button className="btn btn-secondary btn-sm" onClick={onPausar}><Pause size={14} /> Abrir nova PEPT</button>
          </span>}
        </section>
      )}

      {/* prazo antes e depois da PEPT: o "depois" é o que vale no cartão da O.S. */}
      {pz && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Cartao l="O.S. recebida em" v={dt(os.emissao)} sub={`prazo da Caixa: ${dt(os.prazo)}`} />
          <Cartao l="Prazo antes da PEPT" v={dt(pz.antes)} sub={pz.antes === os.prazo ? 'igual ao prazo da Caixa' : 'já com PEPTs anteriores'} />
          <Cartao l="Prazo após a PEPT" destaque v={pz.depois ? dt(pz.depois) : 'Indeterminado'}
            sub={pz.aberta ? (pz.depois ? 'se o cliente resolver hoje' : 'até o cliente resolver (A413)') : 'é o que vale no cartão da O.S.'} />
          <Cartao l="Dias parados" v={pz.dias} sub={pz.aberta ? 'nesta PEPT, até hoje' : 'nesta PEPT'} />
        </div>
      )}

      <section>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-[11px] uppercase tracking-[.07em] text-muted font-bold">Histórico de PEPT{r.total ? ` · ${r.total} ${r.total === 1 ? 'período' : 'períodos'}` : ''}</span>
          <span className="text-[12px] text-muted">as datas podem ser corrigidas aqui</span>
        </div>
        {erro && <div className="rounded-lg px-3 py-2 mb-2 text-[12.5px] bg-[var(--vermelho-soft)] text-[var(--vermelho)]">{erro}</div>}
        {lista.length === 0 ? <p className="text-[13px] text-muted">Esta O.S. nunca teve PEPT.</p> : (
          // um período por linha: abertura/reabertura e tipo | as três datas em sequência | dias parados e situação;
          // a pendência fica escondida e abre ao clicar em "Ver pendência"
          <ul className="rounded-[12px] border border-border divide-y divide-[var(--border)]">
            {lista.map((p) => {
              const situacao = p.fim ? (p.resolvidaPor ? COMO_RESOLVEU[p.resolvidaPor] : 'Encerrada') : p.resolvidaEm ? 'Em análise' : 'Aguardando cliente'
              const corSit = p.fim ? 'bg-[var(--seg)] text-muted' : p.resolvidaEm ? 'chip-v' : 'chip-l'
              const dias = p.resolvidaEm || p.fim ? p.dias ?? 0 : r.aberta?.dias ?? 0
              const rotulo = (t: string) => <span className="block text-[10.5px] uppercase tracking-[.06em] text-muted font-bold mb-0.5">{t}</span>
              return (
                <li key={p.id} className="px-3 py-2.5">
                  <div className="grid grid-cols-1 md:grid-cols-[112px_1fr_128px] gap-x-3 gap-y-2 items-center">
                    <div className="flex flex-col items-start gap-1">
                      <span className="text-[12.5px] font-bold inline-flex items-center gap-1">{p.reabertaDe ? <><RotateCcw size={12} className="text-[var(--laranja-txt)]" />Reabertura</> : 'Abertura'}</span>
                      <TipoPeptChip tipo={p.tipo} />
                    </div>
                    <div className="flex flex-wrap items-end gap-x-2 gap-y-1.5">
                      <div>{rotulo('Pausada em')}{campoData(p.inicio, (v) => mudarData(p.id, { inicio: v }), undefined, 'Data em que a PEPT foi aberta')}</div>
                      <span className="text-muted pb-1.5">→</span>
                      <div>
                        {rotulo(`Cliente resolveu${p.resolucao ? ` (${p.resolucao === 'email' ? 'e-mail' : 'à mão'})` : ''}`)}
                        {p.resolvidaEm ? campoData(p.resolvidaEm, (v) => mudarData(p.id, { resolvidaEm: v }), p.inicio, 'Data em que o cliente resolveu')
                          : <span className={clsx('inline-flex h-8 items-center text-[12.5px]', p.fim ? 'text-muted' : 'text-[var(--laranja-txt)] font-semibold')}>{p.fim ? '-' : 'aguardando'}</span>}
                      </div>
                      <span className="text-muted pb-1.5">→</span>
                      <div>
                        {rotulo('Encerrada em')}
                        {p.fim ? campoData(p.fim, (v) => mudarData(p.id, { fim: v }), p.resolvidaEm ?? p.inicio, 'Data em que a PEPT foi encerrada')
                          : <span className="inline-flex h-8 items-center text-[12.5px] text-muted">em aberto</span>}
                      </div>
                    </div>
                    <div className="flex md:flex-col md:items-end items-center gap-2 md:gap-1">
                      <span className={clsx('chip !h-[22px]', corSit)}>{situacao}</span>
                      <span className="text-[12px] text-muted tnum">{dias} {dias === 1 ? 'dia parado' : 'dias parados'}</span>
                    </div>
                  </div>
                  {p.motivo && (
                    <details className="mt-1.5 group">
                      <summary className="text-[12px] font-semibold text-[var(--verde-valor)] cursor-pointer select-none list-none inline-flex items-center gap-1">
                        <span className="group-open:hidden">Ver pendência</span><span className="hidden group-open:inline">Ocultar pendência</span>
                      </summary>
                      <p className="mt-1.5 text-[12.5px] leading-relaxed whitespace-pre-line rounded-lg bg-[var(--surface-2)] px-3 py-2">{p.motivo}</p>
                    </details>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
/**
 * Telefone com conexão direta: botão WhatsApp (abre a conversa já com a mensagem de apresentação) e botão Ligar.
 * Usado nas abas Cliente e Contato da O.S.
 */
function Fone({ numero, nome, os, soWhats }: { numero: string; nome: string; os: OS; soWhats?: boolean }) {
  const config = useStore((s) => s.config)
  const zap = telefoneWhats(numero)
  const msg = `Olá ${nome}, sou ${config.responsaveis[os.responsavel].curto}, avaliador credenciado da Caixa. Sobre a vistoria do imóvel em ${os.endereco.logradouro}, ${os.endereco.numero}:`
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className="tnum">{numero}</span>
      {zap && (
        <a className="h-7 px-2.5 rounded-full inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-white bg-[#25D366] hover:brightness-95" target="_blank" rel="noreferrer"
          href={`https://wa.me/${zap}?text=${encodeURIComponent(msg)}`} title={`Abrir conversa no WhatsApp com ${nome}`}><MessageCircle size={14} />WhatsApp</a>
      )}
      {!soWhats && <a className="h-7 px-2.5 rounded-full inline-flex items-center gap-1.5 text-[12.5px] font-semibold border border-border text-muted hover:text-[var(--text)]" href={`tel:${numero.replace(/\D/g, '')}`} title={`Ligar para ${nome}`}><Phone size={13} />Ligar</a>}
    </span>
  )
}
/** Título de uma parte dentro da aba (ex.: "Contato para a vistoria", "Importação"), com linha embaixo. */
function Subtitulo({ children, primeiro }: { children: ReactNode; primeiro?: boolean }) {
  return <div className={clsx('text-[12px] font-bold uppercase tracking-[.07em] text-[var(--verde-valor)] pb-1.5 mb-4 border-b border-border', !primeiro && 'mt-7')}>{children}</div>
}
/**
 * Coordenadas do imóvel: mostra as atuais e tem o campo para colar as do Google Maps (números, graus ou o link).
 * Com coordenada, a O.S. aparece no ponto certo do mapa do Roteirizador e o "Abrir no Google Maps" vai direto ao imóvel.
 */
function CoordenadasOS({ os }: { os: OS }) {
  const definirLocalizacao = useStore((s) => s.definirLocalizacao)
  const atual = textoGMS(os.endereco.lat, os.endereco.lng) // no formato do Google Maps
  const [texto, setTexto] = useState('')
  const [aviso, setAviso] = useState<{ ok: boolean; msg: string } | null>(null)
  useEffect(() => { setTexto(''); setAviso(null) }, [os.id])
  const lido = lerCoordenadas(texto)
  const salvar = () => {
    if (!lido) { setAviso({ ok: false, msg: `Não consegui ler. Cole do jeito que o Google Maps copia, ex.: 9°52'45.8"S 63°02'23.5"W` }); return }
    definirLocalizacao(os.id, lido.lat, lido.lng)
    setTexto(''); setAviso({ ok: true, msg: 'Coordenadas salvas.' })
  }
  const linkMaps = atual ? `https://www.google.com/maps/search/?api=1&query=${os.endereco.lat},${os.endereco.lng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enderecoMaps(os))}`
  return (
    <div className="flex flex-col gap-4">
      <Grade>
        <Dado l="Coordenadas" v={atual && <span className="tnum">{atual}</span>} />
        <div className="flex items-end">
          <a className="btn btn-secondary btn-sm" target="_blank" rel="noreferrer" href={linkMaps}><MapPin size={14} /> {atual ? 'Abrir no Google Maps' : 'Procurar o endereço no Google Maps'}</a>
        </div>
      </Grade>
      <div>
        <div className="text-[11px] uppercase tracking-[.07em] text-muted font-bold mb-1.5">{atual ? 'Trocar coordenadas' : 'Colar coordenadas do Google Maps'}</div>
        <div className="flex flex-wrap gap-2">
          <input className="input flex-1 min-w-[260px] tnum" value={texto} placeholder={`Ex.: 9°52'45.8"S 63°02'23.5"W`} aria-label="Coordenadas do Google Maps"
            onChange={(e) => { setTexto(e.target.value); setAviso(null) }} onKeyDown={(e) => { if (e.key === 'Enter') salvar() }} />
          <button className="btn btn-primary" disabled={!texto.trim()} onClick={salvar}><Check size={15} /> Salvar</button>
        </div>
        {texto.trim() && !aviso && <div className={clsx('text-[12.5px] mt-1.5', lido ? 'text-[var(--verde-valor)]' : 'text-muted')}>{lido ? `Reconhecido: ${textoGMS(lido.lat, lido.lng)}` : 'Ainda não reconheci as coordenadas…'}</div>}
        {aviso && <div className={clsx('text-[12.5px] mt-1.5', aviso.ok ? 'text-[var(--verde-valor)]' : 'text-[var(--vermelho)]')}>{aviso.msg}</div>}
        <p className="text-[12px] text-muted mt-2">No Google Maps, clique em cima do imóvel e copie as coordenadas (ex.: 9°52'45.8"S 63°02'23.5"W). Depois cole aqui. Também aceita números (-9.879, -63.039) ou o link do Maps.</p>
      </div>
    </div>
  )
}
/** Motivo da PEPT em aberto, numa caixa de texto: escreva e ele salva sozinho ao sair da caixa. */
function MotivoPept({ os, peptId, motivo }: { os: OS; peptId: string; motivo: string }) {
  const editarPept = useStore((s) => s.editarPept)
  const [texto, setTexto] = useState(motivo)
  const [salvo, setSalvo] = useState(false)
  useEffect(() => { setTexto(motivo) }, [motivo, peptId])
  const salvar = () => {
    if (texto.trim() === motivo) return
    editarPept(os.id, peptId, { motivo: texto.trim() })
    setSalvo(true); setTimeout(() => setSalvo(false), 1800)
  }
  return (
    <label className="block mt-2">
      <span className="flex items-center gap-2 text-[11px] uppercase tracking-[.07em] text-muted font-bold">Motivo da PEPT{salvo && <span className="normal-case tracking-normal font-semibold text-[var(--verde-valor)]">salvo</span>}</span>
      <textarea className="input w-full mt-1 min-h-[64px] py-2 leading-snug resize-y bg-[var(--surface)]" placeholder="Descreva a pendência…" value={texto}
        onChange={(e) => setTexto(e.target.value)} onBlur={salvar} />
    </label>
  )
}