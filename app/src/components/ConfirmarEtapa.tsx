import { useState } from 'react'
import { STATUS_META, codigoOS } from '../lib/os'
import { useStore } from '../store/useStore'
import type { OS, Status } from '../types'
import { Modal, StatusChip } from './ui'

/**
 * Confirmação ao trocar de etapa quando o passo merece registro (ver precisaConfirmar em lib/os.ts):
 * voltar, pular ou cancelar. O motivo é opcional e vai para a linha do tempo da O.S.
 */
export function ConfirmarEtapa({ os, para, onClose }: { os: OS; para: Status; onClose: () => void }) {
  const mudarStatus = useStore((s) => s.mudarStatus)
  const [motivo, setMotivo] = useState('')
  const de = STATUS_META[os.status], ate = STATUS_META[para]
  const voltando = ate.ordem < de.ordem
  const pulando = !voltando && para !== 'cancelada' && ate.ordem - de.ordem > 1

  const confirmar = () => {
    mudarStatus(os.id, para, `Etapa: ${de.label} → ${ate.label}${motivo.trim() ? ` (${motivo.trim()})` : ''}`)
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={`Mudar a etapa da ${codigoOS(os)}`} width={500}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={confirmar}>Confirmar</button>
      </>}>
      <div className="flex flex-wrap items-center gap-2 mb-3 text-[13px]">
        <StatusChip status={os.status} /> <span className="text-muted">para</span> <StatusChip status={para} />
      </div>
      <p className="text-[13px] text-muted mb-3">
        {para === 'cancelada' ? 'A O.S. sai do faturamento e das rotas.'
          : voltando ? 'Você está voltando a O.S. de etapa. Se quiser, diga o motivo; ele fica na linha do tempo.'
            : pulando ? `Você está pulando ${ate.ordem - de.ordem - 1} ${ate.ordem - de.ordem - 1 === 1 ? 'etapa' : 'etapas'}. Se quiser, diga o motivo.`
              : 'Se quiser, deixe uma observação para a linha do tempo.'}
      </p>
      <label className="flex flex-col gap-1">
        <span className="text-[12px] font-medium text-muted">Motivo (opcional)</span>
        <textarea className="input min-h-[80px]" autoFocus value={motivo} onChange={(e) => setMotivo(e.target.value)} />
      </label>
    </Modal>
  )
}
