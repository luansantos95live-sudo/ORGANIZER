import clsx from 'clsx'
import { format, parseISO } from 'date-fns'
import { CircleCheck, RotateCcw, UserCheck } from 'lucide-react'
import { useState } from 'react'
import { codigoOS, dataMedia, diasDePausa, limiteParaPausar, pausaValida } from '../lib/os'
import { peptAberta, periodosDaPept, ultimaFinalizada } from '../lib/pept'
import { useStore } from '../store/useStore'
import type { OS } from '../types'
import { Modal } from './ui'

export type ModoPept = 'resolver' | 'reabrir' | 'finalizar'

/**
 * Tela única da PEPT (pedido do usuário: tudo na mesma tela, sempre com a data). As opções seguem a situação:
 *  - pausada (aguardando o cliente): "Cliente resolveu" (o prazo volta a contar) ou "Validar e finalizar";
 *  - resolvida pelo cliente, em análise: "Reabrir" (não resolveu tudo: o prazo para de novo) ou "Validar e finalizar"
 *    (o prazo não muda);
 *  - encerrada: "Reabrir".
 * `depois` roda depois de confirmar (ex.: o Kanban termina de mover o cartão).
 */
export function AcaoPept({ os, modo: modoInicial, onClose, depois }: { os: OS; modo: ModoPept; onClose: () => void; depois?: () => void }) {
  const resolverPept = useStore((s) => s.resolverPept)
  const finalizarPept = useStore((s) => s.finalizarPept)
  const reabrirPept = useStore((s) => s.reabrirPept)
  const hoje = format(new Date(), 'yyyy-MM-dd')
  const aberta = peptAberta(os)
  const pausada = !!os.pausadoEm
  const encerrada = !aberta ? ultimaFinalizada(os) : undefined
  // a tela mostra sempre as três opções (como o usuário aprovou: Finalizar e Reabrir lado a lado, mais Cliente resolveu);
  // as que não valem na situação ficam apagadas
  const opcoes: ModoPept[] = ['resolver', 'reabrir', 'finalizar']
  // a resolução do cliente é obrigatória: só depois dela dá para Reabrir ou Finalizar a PEPT
  const falta = 'Registre antes o dia em que o cliente resolveu'
  const desativada: Partial<Record<ModoPept, string>> = {
    ...(!pausada ? { resolver: aberta?.resolvidaEm ? `O cliente já resolveu em ${dataMedia(aberta.resolvidaEm)}` : 'A PEPT não está aberta' } : {}),
    ...(pausada ? { reabrir: falta, finalizar: falta } : !aberta ? { finalizar: 'A PEPT já está encerrada' } : {}),
  }
  const validas = opcoes.filter((m) => !desativada[m])
  const [modo, setModo] = useState<ModoPept>(validas.includes(modoInicial) ? modoInicial : validas[0] ?? 'reabrir')
  const [dia, setDia] = useState(hoje)
  const base = aberta ?? encerrada
  if (!base) return null
  // a PEPT e as reaberturas dela, da primeira abertura até a atual
  const periodos = periodosDaPept(os, base)
  // primeiro dia aceito: pausada → a abertura; em análise → a resolução do cliente; encerrada → o encerramento
  const min = pausada ? os.pausadoEm! : aberta ? aberta.resolvidaEm ?? aberta.inicio : encerrada!.fim!
  const valido = !!dia && dia >= min && dia <= hoje
  const empurra = pausada && valido && pausaValida(os) ? diasDePausa(os.tipologia, os.pausadoEm!, parseISO(dia)) : 0
  const ok = () => {
    if (!valido) return
    if (modo === 'resolver') resolverPept(os.id, dia, 'manual')
    else if (modo === 'finalizar') finalizarPept(os.id, dia)
    else reabrirPept(os.id, dia)
    depois?.()
    onClose()
  }
  const INFO: Record<ModoPept, { Ic: typeof CircleCheck; titulo: string; sub: string; rotulo: string; botao: string }> = {
    resolver: { Ic: UserCheck, titulo: 'Cliente resolveu', sub: 'Informe o dia: o prazo volta a contar.', rotulo: 'Resolvida em', botao: 'Registrar resolução' },
    reabrir: { Ic: RotateCcw, titulo: 'Reabrir PEPT', sub: 'Informe o dia: fica aberta com o mesmo motivo.', rotulo: 'Reaberta em', botao: 'Reabrir PEPT' },
    finalizar: { Ic: CircleCheck, titulo: 'Finalizar PEPT', sub: 'Informe o dia em que a PEPT foi finalizada.', rotulo: 'Finalizada em', botao: 'Finalizar PEPT' },
  }
  const i = INFO[modo]
  return (
    <Modal open onClose={onClose} title={`PEPT da ${codigoOS(os)}`} width={600}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" disabled={!valido} onClick={ok}><i.Ic size={15} /> {i.botao}</button>
      </>}>
      {/* só a linha do tempo da PEPT (abertura, resolução, reabertura, encerramento), sem o texto do motivo */}
      <div className="rounded-[12px] border border-border mb-4 overflow-hidden">
        <div className="px-3 py-1.5 bg-[var(--surface-2)] text-[11px] uppercase tracking-[.07em] text-muted font-bold">
          Linha do tempo da PEPT{periodos.length > 1 ? <span className="normal-case tracking-normal text-[var(--laranja-txt)]"> · reaberta ({periodos.length}ª vez)</span> : null}
        </div>
        <ol className="divide-y divide-[var(--border)] text-[12.5px]">
          {/* primeiro registro: o recebimento da O.S. (antes da 1ª abertura da PEPT) */}
          <li className="px-3 py-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <b className="w-[74px] shrink-0">Recebida</b>
            <span className="tnum">O.S. recebida {dataMedia(os.emissao)}</span>
            <span className="ml-auto text-muted tnum">a PEPT pausa se aberta até {dataMedia(limiteParaPausar(os.emissao))}</span>
          </li>
          {periodos.map((p, i) => (
            <li key={p.id} className="px-3 py-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <b className="w-[74px] shrink-0">{i === 0 ? '1ª abertura' : `${i + 1}ª (reab.)`}</b>
              <span className="tnum">{i === 0 ? 'aberta' : 'reaberta'} {dataMedia(p.inicio)}</span>
              <span className="text-muted">→</span>
              {p.resolvidaEm
                ? <span className="tnum">cliente resolveu {dataMedia(p.resolvidaEm)}{p.resolucao === 'email' ? ' (e-mail)' : ''}</span>
                : p.fim ? <span className="text-muted">encerrada {dataMedia(p.fim)}</span> : <span className="text-[var(--laranja-txt)] font-semibold">aguardando o cliente</span>}
              {p.resolvidaEm && !p.fim && <><span className="text-muted">→</span><span className="text-[var(--verde-valor)] font-semibold">em análise</span></>}
              {p.fim && p.resolvidaEm && <><span className="text-muted">→</span><span className="tnum">{p.resolvidaPor === 'reaberta' ? 'reaberta' : p.resolvidaPor === 'conclusao' ? 'O.S. concluída' : 'finalizada'} {dataMedia(p.fim)}</span></>}
              <span className="ml-auto text-muted tnum">{p.resolvidaEm || p.fim ? `${p.dias ?? 0} ${(p.dias ?? 0) === 1 ? 'dia parado' : 'dias parados'}` : 'parada agora'}</span>
            </li>
          ))}
        </ol>
      </div>      <div className="grid grid-cols-3 gap-2 mb-4" role="radiogroup" aria-label="O que aconteceu com a PEPT">
        {opcoes.map((m) => {
          const x = INFO[m]
          return (
            <button key={m} type="button" role="radio" aria-checked={modo === m} disabled={!!desativada[m]} title={desativada[m]} onClick={() => setModo(m)}
              className={clsx('text-left rounded-[12px] border px-3 py-2.5 transition disabled:opacity-40 disabled:cursor-not-allowed', modo === m ? 'border-[var(--brand)] bg-[var(--brand-soft)]' : 'border-border hover:border-[var(--fraco)]')}>
              <span className="flex items-center gap-2 font-semibold text-[14px]"><x.Ic size={16} className={modo === m ? 'text-[var(--verde-valor)]' : 'text-muted'} />{x.titulo}</span>
              <span className="block text-[12px] text-muted mt-0.5 leading-snug">{x.sub}</span>
            </button>
          )
        })}
      </div>
      {pausada && <p className="text-[12.5px] text-muted -mt-2 mb-3">Reabrir e Finalizar ficam liberados depois que você registrar o dia em que o cliente resolveu.</p>}
      <label className="flex flex-col gap-1 mb-2">
        <span className="text-[12px] font-semibold text-muted">{i.rotulo}</span>
        <input type="date" className="input w-[180px]" min={min} max={hoje} value={dia} autoFocus onChange={(e) => setDia(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') ok() }} />
      </label>
      <p className="text-[12.5px] text-muted">
        {!valido ? <span className="text-[var(--vermelho)]">O dia precisa ser entre {dataMedia(min)} e hoje.</span>
          : modo === 'reabrir' ? <>O prazo para de novo em <b className="text-[var(--text)]">{dataMedia(dia)}</b>{aberta?.resolvidaEm ? <>; de {dataMedia(aberta.resolvidaEm)} até lá, os dias contam no prazo</> : null}.</>
            : pausada ? <>O prazo volta a contar em <b className="text-[var(--text)]">{dataMedia(dia)}</b> e é empurrado <b className="text-[var(--text)]">{empurra} {empurra === 1 ? 'dia' : 'dias'}</b>.</>
              : <>A PEPT é encerrada; o prazo continua como está (já contando desde {dataMedia(aberta!.resolvidaEm ?? aberta!.inicio)}).</>}
      </p>
    </Modal>
  )
}
