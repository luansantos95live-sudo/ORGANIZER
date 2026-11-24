import { CalendarDays, Check, Copy, Flag, MapPin, MessageCircle, PauseCircle, Phone, User } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { dataCurta, peptContaPrazo, prazoAtual, telefoneWhats } from '../lib/os'
import type { OS } from '../types'

/** "CAMILA DUARTE" → "Camila Duarte" (mantém de, da, do… em minúsculas). */
const nomeProprio = (s: string) =>
  s.toLowerCase()
    .replace(/(^|\s)(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase())
    .replace(/\s(D[aeo]s?|E)\s/g, (m) => m.toLowerCase())

/** (69) 9 8570-1211 */
function formatarFone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3, 7)}-${d.slice(7)}`
}

function Linha({ icone, children }: { icone: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="shrink-0 opacity-55">{icone}</span>
      <span className="truncate">{children}</span>
    </div>
  )
}

/** Nº da Caixa completo (24/11, antes era curto), clique copia; fica na linha do código da O.S., no topo do cartão. */
export function CaixaPrioridade({ referencia }: { referencia: string }) {
  const [copiado, setCopiado] = useState(false)
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(referencia)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1500)
    } catch {
      setCopiado(false)
    }
  }
  return (
    <button type="button" onClick={() => void copiar()} title={`${referencia} · clique para copiar`}
      className="tnum inline-flex h-6 items-center gap-1.5 rounded-full bg-white/[.08] px-2.5 text-[12.5px] font-semibold hover:bg-white/15">
      <span className="opacity-60">Caixa</span>
      {referencia}
      {copiado ? <Check size={12} strokeWidth={3} /> : <Copy size={12} className="opacity-60" />}
    </button>
  )
}

/**
 * "Ficou parada N dias em PEPT": só as PEPTs já encerradas (a em aberto não tem duração definida) e só se a O.S.
 * ficou parada algum dia.
 */
function PeptPrioridade({ os }: { os: OS }) {
  const dias = Math.max(
    os.diasPausado || 0, // O.S. antigas podem ter só o total, sem o registro de cada PEPT
    (os.pepts ?? []).filter((p) => p.fim && peptContaPrazo(os, p)).reduce((s, p) => s + (p.dias ?? 0), 0),
  )
  if (dias <= 0) return null
  return (
    <div className="prio-pept flex items-center gap-2.5 font-semibold">
      <PauseCircle size={16} className="shrink-0" />
      Ficou parada {dias} {dias === 1 ? 'dia' : 'dias'} em PEPT
    </div>
  )
}

/**
 * Ficha curta da O.S. no cartão "Prioridade agora", em duas colunas para caber na altura fixa do Início:
 * contato da vistoria e endereço à esquerda; recebimento, dias parados em PEPT e prazo final à direita.
 */
export function DadosPrioridade({ os }: { os: OS }) {
  // contato da vistoria (aba Cliente e contato): nome numa linha, telefone e link do WhatsApp na de baixo
  const tel = (os.telefone ?? '').replace(/\D/g, '')
  const zap = (os.whatsapp ?? '').replace(/\D/g, '') || tel
  const e = os.endereco
  const endereco = e.logradouro ? `${nomeProprio(e.logradouro)}, ${e.numero && e.numero !== '0' ? e.numero : 'S/N'}` : ''

  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-[14px] sm:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-1">
        <Linha icone={<User size={16} />}>
          <span className="opacity-60">Contato da vistoria: </span>
          {os.contato ? nomeProprio(os.contato) : 'não informado'}
        </Linha>
        {(tel || zap) && (
          <div className="flex min-w-0 items-center gap-2.5">
            {tel && (
              <a href={`tel:${tel}`} className="tnum flex shrink-0 items-center gap-2.5 whitespace-nowrap font-semibold hover:underline">
                <Phone size={16} className="shrink-0 opacity-55" />
                {formatarFone(tel)}
              </a>
            )}
            <a href={`https://wa.me/${telefoneWhats(zap)}`} target="_blank" rel="noreferrer" title="Abrir conversa no WhatsApp"
              className="prio-zap tnum flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-bold">
              <MessageCircle size={13} />
              WhatsApp
              {zap !== tel && <span className="font-semibold">{formatarFone(zap)}</span>}
            </a>
          </div>
        )}
        {endereco && <Linha icone={<MapPin size={16} />}>{endereco}</Linha>}
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <Linha icone={<CalendarDays size={16} />}>
          <span className="opacity-60">Recebida em </span>
          {dataCurta(os.emissao)}
        </Linha>
        <PeptPrioridade os={os} />
        {/* prazo que vale agora, já recalculado com os dias parados em PEPT */}
        <Linha icone={<Flag size={16} />}>
          <span className="opacity-60">Prazo final </span>
          <b>{dataCurta(prazoAtual(os))}</b>
        </Linha>
      </div>
    </div>
  )
}
