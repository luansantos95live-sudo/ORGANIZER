import clsx from 'clsx'
import { format } from 'date-fns'
import { ArrowLeft, ArrowLeftRight, Camera, Check, ExternalLink, FolderOpen, MapPin, MessageCircle, Pencil, Phone, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { OsForm } from '../components/OsForm'
import { Avatar, Card, FarolChip, Field, Modal, StatusChip } from '../components/ui'
import { DOC_META, STATUS_META, TIPO_META, brl, dataHora, dataMedia, docsFaltando, enderecoMaps, refCurta, telefoneWhats } from '../lib/os'
import { useStore } from '../store/useStore'
import type { DocKey, Status } from '../types'

export function OsDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const os = useStore((s) => s.os.find((o) => o.id === id))
  const config = useStore((s) => s.config)
  const mudarStatus = useStore((s) => s.mudarStatus)
  const agendar = useStore((s) => s.agendar)
  const transferir = useStore((s) => s.transferir)
  const toggleDoc = useStore((s) => s.toggleDoc)
  const atualizarOS = useStore((s) => s.atualizarOS)
  const removerOS = useStore((s) => s.removerOS)
  const [agendando, setAgendando] = useState(false)
  const [editando, setEditando] = useState(false)
  const [confirmaExcluir, setConfirmaExcluir] = useState(false)
  const [aba, setAba] = useState<'resumo' | 'documentos' | 'historico'>('resumo')

  if (!os) return <div className="card p-8 text-center text-muted">O.S. não encontrada. <Link className="text-brand" to="/os">Voltar</Link></div>

  const faltando = docsFaltando(os)
  const outro = os.responsavel === 'luan' ? 'rt' : 'luan'

  const acoes: { label: string; para: Status; primaria?: boolean }[] = (() => {
    switch (os.status) {
      case 'convocada': return [{ label: 'Aceitar convocação', para: 'emitida', primaria: true }, { label: 'Recusar', para: 'cancelada' }]
      case 'emitida': return []
      case 'agendada': return [{ label: 'Marcar vistoriada', para: 'vistoriada', primaria: true }]
      case 'vistoriada': return [{ label: 'Laudo enviado no SIOPI', para: 'laudo_enviado', primaria: true }]
      case 'laudo_enviado': return [{ label: 'Laudo aceito (finalizar)', para: 'finalizada', primaria: true }, { label: 'Caixa pediu correção', para: 'diligencia' }]
      case 'diligencia': return [{ label: 'Correção reenviada', para: 'laudo_enviado', primaria: true }]
      case 'finalizada': return [{ label: 'Marcar conferida no extrato', para: 'conferida', primaria: true }]
      default: return []
    }
  })()

  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <button className="btn btn-ghost btn-sm" onClick={() => nav(-1)}><ArrowLeft size={14} /> Voltar</button>
        <span className="flex-1" />
        <button id="btn-editar-os" className="btn btn-secondary btn-sm" onClick={() => setEditando(true)}><Pencil size={13} /> Editar dados</button>
        {confirmaExcluir ? (
          <>
            <span className="text-[12.5px] text-muted">Excluir esta O.S. de vez?</span>
            <button id="btn-excluir-sim" className="btn btn-sm" style={{ background: 'var(--f-late-bg)', color: '#fff' }} onClick={() => { removerOS(os.id); nav('/os') }}>Sim, excluir</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setConfirmaExcluir(false)}>Não</button>
          </>
        ) : (
          <button id="btn-excluir-os" className="btn btn-ghost btn-sm" onClick={() => setConfirmaExcluir(true)}><Trash2 size={13} /> Excluir</button>
        )}
      </div>

      <div className="card p-5 mb-4">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex-1 min-w-[260px]">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="tnum text-muted text-[12px]">O.S. #{refCurta(os.referencia)}</span>
              <StatusChip status={os.status} />
              <FarolChip os={os} />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">{os.proponente}</h1>
            <p className="text-muted text-[13px] mt-0.5">{TIPO_META[os.tipo].label} · {STATUS_META[os.status].descricao}</p>
            <p className="text-[12px] text-muted tnum mt-1 select-all">{os.referencia}</p>
          </div>
          <div className="flex items-center gap-2">
            <Avatar resp={os.responsavel} size={28} />
            <div className="text-[12.5px] leading-tight">
              <div className="font-medium">{config.responsaveis[os.responsavel].nome}</div>
              <div className="text-muted">{config.responsaveis[os.responsavel].registro}</div>
            </div>
            <button className="btn btn-ghost btn-sm" title={`Transferir para ${config.responsaveis[outro].curto}`} onClick={() => transferir(os.id, outro)}>
              <ArrowLeftRight size={14} /> {config.responsaveis[outro].curto}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
          {(os.status === 'emitida' || os.status === 'agendada') && (
            <button className={clsx('btn', os.status === 'emitida' ? 'btn-primary' : 'btn-secondary')} onClick={() => setAgendando(true)}>
              {os.status === 'emitida' ? 'Agendar vistoria' : 'Reagendar'}
            </button>
          )}
          {acoes.map((a) => (
            <button key={a.para} className={clsx('btn', a.primaria ? 'btn-primary' : 'btn-secondary')} onClick={() => mudarStatus(os.id, a.para)}>
              {a.label}
            </button>
          ))}
          <span className="flex-1" />
          <a className="btn btn-secondary" target="_blank" rel="noreferrer" href={`https://wa.me/${telefoneWhats(os.telefone)}?text=${encodeURIComponent(`Olá ${os.contato}, sou ${config.responsaveis[os.responsavel].curto}, credenciado da Caixa. Sobre a vistoria do imóvel em ${os.endereco.logradouro}, ${os.endereco.numero}:`)}`}>
            <MessageCircle size={15} /> WhatsApp
          </a>
          <a className="btn btn-secondary" href={`tel:${os.telefone.replace(/\D/g, '')}`}><Phone size={15} /> Ligar</a>
          <a className="btn btn-secondary" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enderecoMaps(os))}`}><MapPin size={15} /> Maps</a>
        </div>
      </div>

      <div className="seg mb-4">
        {(['resumo', 'documentos', 'historico'] as const).map((a) => (
          <button key={a} aria-pressed={aba === a} onClick={() => setAba(a)}>
            {a === 'resumo' ? 'Resumo' : a === 'documentos' ? `Documentos${faltando.length ? ` · ${faltando.length} faltando` : ''}` : 'Histórico'}
          </button>
        ))}
      </div>

      {aba === 'resumo' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card title="Imóvel">
            <dl className="grid grid-cols-[110px_1fr] gap-y-2 text-[13px]">
              <dt className="text-muted">Endereço</dt><dd>{os.endereco.logradouro}, {os.endereco.numero}</dd>
              <dt className="text-muted">Bairro</dt><dd>{os.endereco.bairro}</dd>
              <dt className="text-muted">Cidade</dt><dd>{os.endereco.cidade}/{os.endereco.uf} · CEP {os.endereco.cep}</dd>
              <dt className="text-muted">Matrícula</dt><dd className="tnum">{os.matricula}</dd>
              <dt className="text-muted">Contato</dt><dd>{os.contato} · <span className="tnum">{os.telefone}</span></dd>
            </dl>
          </Card>
          <Card title="Prazos e valores">
            <dl className="grid grid-cols-[110px_1fr] gap-y-2 text-[13px] tnum">
              <dt className="text-muted">Emissão</dt><dd>{dataMedia(os.emissao)}</dd>
              <dt className="text-muted">Prazo</dt><dd className="flex items-center gap-2">{dataMedia(os.prazo)} <FarolChip os={os} /></dd>
              <dt className="text-muted">Vistoria</dt><dd>{os.vistoria ? `${dataMedia(os.vistoria.data)} às ${os.vistoria.hora} · ${os.vistoria.duracao} min` : <span className="text-muted">não agendada</span>}</dd>
              <dt className="text-muted">Laudo enviado</dt><dd>{os.enviadoEm ? dataMedia(os.enviadoEm) : <span className="text-muted">—</span>}</dd>
              <dt className="text-muted">Serviço</dt><dd>{brl(os.valorServico)}</dd>
              <dt className="text-muted">Deslocamento</dt><dd>{brl(os.valorDeslocamento)}</dd>
              <dt className="text-muted font-medium">Total</dt><dd className="font-semibold">{brl(os.valorServico + os.valorDeslocamento)}</dd>
            </dl>
          </Card>
          <Card title="Observações" className="md:col-span-2">
            <textarea
              className="input w-full min-h-[80px]"
              placeholder="Portão, horário do cliente, chave com o corretor…"
              value={os.observacoes}
              onChange={(e) => atualizarOS(os.id, { observacoes: e.target.value })}
            />
          </Card>
        </div>
      )}

      {aba === 'documentos' && (
        <div className="grid grid-cols-1 md:grid-cols-[1.3fr_1fr] gap-4">
          <Card title="Checklist documental (SIOPI)" actions={<span className="text-[12px] text-muted">{11 - faltando.length}/11</span>}>
            <ul className="flex flex-col">
              {(Object.keys(DOC_META) as DocKey[]).map((k) => (
                <li key={k}>
                  <label className="flex items-center gap-3 py-2 border-b border-border last:border-none cursor-pointer">
                    <span className={clsx('w-5 h-5 rounded-md border flex items-center justify-center', os.docs[k] ? 'bg-brand border-brand text-white' : 'border-border')}>
                      {os.docs[k] && <Check size={13} />}
                    </span>
                    <input type="checkbox" className="sr-only" checked={os.docs[k]} onChange={() => toggleDoc(os.id, k)} />
                    <span className={clsx(!os.docs[k] && 'text-muted')}>{DOC_META[k]}</span>
                  </label>
                </li>
              ))}
            </ul>
          </Card>
          <div className="flex flex-col gap-4">
            <Card title="Pasta da O.S.">
              <p className="text-[12.5px] text-muted mb-3">Estrutura padrão: Documentos SIOPI / Fotos / Laudo.</p>
              <div className="flex flex-col gap-2">
                <button className="btn btn-secondary justify-start"><FolderOpen size={15} /> Abrir pasta no OneDrive <ExternalLink size={12} className="ml-auto text-muted" /></button>
                <button className="btn btn-secondary justify-start"><Camera size={15} /> Fotos ({os.fotos}) <span className={clsx('chip ml-auto', os.fotos >= 5 ? 'farol-ok' : os.fotos ? 'farol-warn' : 'farol-urgent')}>{os.fotos >= 5 ? 'OK' : os.fotos ? 'poucas' : 'nenhuma'}</span></button>
              </div>
            </Card>
            {faltando.length > 0 && (
              <Card title="Atenção">
                <p className="text-[12.5px]">Faltam <b>{faltando.length}</b> documentos para fechar o laudo sem pendência. Peça ao correspondente antes da vistoria.</p>
              </Card>
            )}
          </div>
        </div>
      )}

      {aba === 'historico' && (
        <Card title="Linha do tempo">
          <ol className="relative border-l border-border ml-2 pl-5 flex flex-col gap-4">
            {[...os.historico].reverse().map((h, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[26px] top-1 w-3 h-3 rounded-full bg-brand-soft border-2 border-brand" />
                <div className="text-[12px] text-muted tnum">{dataHora(h.data)}</div>
                <div>{h.texto}</div>
              </li>
            ))}
          </ol>
        </Card>
      )}

      <OsForm open={editando} modo={{ tipo: 'editar', os }} onClose={() => setEditando(false)} />
      <AgendarModal open={agendando} onClose={() => setAgendando(false)} osId={os.id} inicial={os.vistoria} duracaoPadrao={config.duracaoPadrao[os.tipo]} onSalvar={agendar} />
    </>
  )
}

function AgendarModal({ open, onClose, osId, inicial, duracaoPadrao, onSalvar }: { open: boolean; onClose: () => void; osId: string; inicial?: { data: string; hora: string; duracao: number }; duracaoPadrao: number; onSalvar: (id: string, data: string, hora: string, duracao: number) => void }) {
  const [data, setData] = useState(inicial?.data ?? format(new Date(), 'yyyy-MM-dd'))
  const [hora, setHora] = useState(inicial?.hora ?? '08:00')
  const [dur, setDur] = useState(inicial?.duracao ?? duracaoPadrao)
  return (
    <Modal open={open} onClose={onClose} title="Agendar vistoria">
      <div className="grid grid-cols-3 gap-3">
        <Field label="Data"><input type="date" className="input" value={data} onChange={(e) => setData(e.target.value)} /></Field>
        <Field label="Hora"><input type="time" className="input tnum" value={hora} step={300} onChange={(e) => setHora(e.target.value)} /></Field>
        <Field label="Duração (min)"><input type="number" className="input tnum" value={dur} min={10} step={5} onChange={(e) => setDur(Number(e.target.value))} /></Field>
      </div>
      <p className="text-[12px] text-muted mt-3">A O.S. entra automaticamente na rota desse dia. Você pode ajustar a hora depois, na tela Rota.</p>
      <div className="flex justify-end gap-2 mt-4">
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => { onSalvar(osId, data, hora, dur); onClose() }}>Salvar</button>
      </div>
    </Modal>
  )
}
