import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ImportarOS } from './ImportarOS'
import { OsForm } from './OsForm'
import { Abas } from './ui'

/**
 * "Nova OS": abre direto na janela grande, com as abas Arquivo · Manual · E-mail.
 * Arquivo e E-mail são a importação; Manual é o formulário com as abas da O.S. (mesma janela, mesma largura).
 */
export function NovaOS({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nav = useNavigate()
  const [aba, setAba] = useState<'arquivo' | 'manual' | 'email'>('arquivo')
  const fechar = () => { setAba('arquivo'); onClose() }
  const topoManual = (
    <Abas abas={[{ id: 'arquivo' as const, label: 'Arquivo' }, { id: 'manual' as const, label: 'Manual' }, { id: 'email' as const, label: 'E-mail' }]} valor="manual" onChange={setAba} />
  )
  return (
    <>
      <ImportarOS open={open && aba !== 'manual'} onClose={fechar} onManual={() => setAba('manual')} abaInicial={aba === 'email' ? 'email' : 'arquivo'} />
      <OsForm open={open && aba === 'manual'} modo={{ tipo: 'criar' }} onClose={fechar} onSalvo={(id) => nav(`/os/${id}`)} topo={topoManual} largura={1034} />
    </>
  )
}
