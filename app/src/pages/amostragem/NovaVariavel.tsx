import { Plus } from 'lucide-react'
import { useState } from 'react'
import type { TipoVariavel, VariavelAmostra } from '../../lib/amostragem/types'
import { GRUPOS, TIPOS_VARIAVEL, chavePersonalizada } from '../../lib/amostragem/catalogo'

/** Formulário de variável personalizada (nome, tipo, unidade ou opções). Usado no seletor e no "+ coluna". */
export function NovaVariavel({ existentes, onCriar, autofoco, grupo, onCancelar }: {
  existentes: VariavelAmostra[]
  onCriar: (v: VariavelAmostra) => void
  autofoco?: boolean
  /** Grupo da variável (Físicas, Localização...). Sem ele, aparece a escolha do grupo. */
  grupo?: string
  onCancelar?: () => void
}) {
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<TipoVariavel>('numero')
  const [unidade, setUnidade] = useState('')
  const [opcoes, setOpcoes] = useState('')
  const [grupoEscolhido, setGrupoEscolhido] = useState('Personalizadas')
  const [erro, setErro] = useState('')

  const criar = () => {
    const n = nome.trim()
    if (!n) return setErro('Dê um nome para a variável.')
    if (existentes.some((v) => v.label.toLowerCase() === n.toLowerCase())) return setErro('Já existe uma variável com esse nome.')
    const ops = opcoes.split(/[;,|\n]/).map((s) => s.trim()).filter(Boolean)
    if (tipo === 'opcao' && ops.length < 2) return setErro('Informe ao menos duas opções, separadas por vírgula.')
    onCriar({
      key: chavePersonalizada(n, existentes.map((x) => x.key)),
      label: n,
      type: tipo,
      group: grupo ?? grupoEscolhido,
      custom: true,
      ...(unidade.trim() && tipo === 'numero' ? { unit: unidade.trim() } : {}),
      ...(tipo === 'opcao' ? { options: ops } : {}),
    })
    setNome('')
    setUnidade('')
    setOpcoes('')
    setErro('')
  }

  return (
    <div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex min-w-[180px] flex-1 flex-col gap-1">
          <span className="text-[12px] font-medium text-muted">Nome</span>
          <input
            autoFocus={autofoco}
            className="input input-sm"
            value={nome}
            placeholder="Ex.: Vista para o lago"
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); criar() } }}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[12px] font-medium text-muted">Tipo</span>
          <select className="input input-sm w-[150px]" value={tipo} onChange={(e) => setTipo(e.target.value as TipoVariavel)}>
            {TIPOS_VARIAVEL.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>
        {tipo === 'numero' && (
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-muted">Unidade</span>
            <input className="input input-sm w-[90px]" placeholder="m, km, %" value={unidade} onChange={(e) => setUnidade(e.target.value)} />
          </label>
        )}
        {tipo === 'opcao' && (
          <label className="flex min-w-[200px] flex-1 flex-col gap-1">
            <span className="text-[12px] font-medium text-muted">Opções (separadas por vírgula)</span>
            <input className="input input-sm" placeholder="Ruim, Regular, Boa" value={opcoes} onChange={(e) => setOpcoes(e.target.value)} />
          </label>
        )}
        {!grupo && (
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-muted">Grupo</span>
            <select className="input input-sm w-[150px]" value={grupoEscolhido} onChange={(e) => setGrupoEscolhido(e.target.value)}>
              {GRUPOS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </label>
        )}
        <button type="button" className="btn btn-secondary btn-sm" onClick={criar}><Plus size={14} /> Criar</button>
        {onCancelar && <button type="button" className="btn btn-ghost btn-sm" onClick={onCancelar}>Cancelar</button>}
      </div>
      {erro && <p className="mt-1.5 text-[12px] text-[var(--vermelho)]">{erro}</p>}
    </div>
  )
}
