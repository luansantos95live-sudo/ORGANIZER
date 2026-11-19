import { Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Modal } from '../../components/ui'
import type { VariavelAmostra } from '../../lib/amostragem/types'
import { GRUPOS, normalizar, opcoesDoTipo, rotuloColuna } from '../../lib/amostragem/catalogo'
import { NovaVariavel } from './NovaVariavel'

/**
 * "+ coluna" da planilha: escolhe uma variável do catálogo do tipo que ainda não está na amostragem (com busca) ou cria
 * uma personalizada em qualquer grupo. A coluna entra na hora; dá para adicionar várias sem fechar.
 */
export function AdicionarColuna({ aberta, onClose, tipoId, vars, onAdicionar }: {
  aberta: boolean
  onClose: () => void
  tipoId: string
  vars: VariavelAmostra[]
  onAdicionar: (v: VariavelAmostra) => void
}) {
  const [busca, setBusca] = useState('')
  const [criandoEm, setCriandoEm] = useState<string | null>(null)
  const grupos = useMemo(() => {
    const usadas = new Set(vars.map((v) => v.key))
    const t = normalizar(busca)
    const disponiveis = opcoesDoTipo(tipoId)
      .filter((o) => !usadas.has(o.variavel.key))
      .filter((o) => !t || normalizar(`${o.variavel.label} ${o.variavel.group}`).includes(t))
    const doTipo = new Set([...opcoesDoTipo(tipoId).map((o) => o.variavel.group), ...vars.map((v) => v.group)])
    return GRUPOS.filter((g) => g !== 'Personalizadas' && doTipo.has(g))
      .map((g) => ({ g, itens: disponiveis.filter((o) => o.variavel.group === g) }))
      .filter((x) => !busca.trim() || x.itens.length)
  }, [vars, tipoId, busca])
  const fechar = () => { setBusca(''); setCriandoEm(null); onClose() }

  return (
    <Modal open={aberta} onClose={fechar} width={640} title="Adicionar coluna" footer={<button type="button" className="btn btn-primary" onClick={fechar}>Pronto</button>}>
      <div className="space-y-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input autoFocus className="input w-full !pl-9" placeholder="Buscar variável (ex.: testada, esgoto, zoneamento)" aria-label="Buscar variável" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        {grupos.length ? (
          grupos.map((gr) => (
            <section key={gr.g}>
              <h4 className="card-tit mb-1.5">{gr.g}</h4>
              <div className="flex flex-wrap gap-1.5">
                {gr.itens.map((o) => (
                  <button key={o.variavel.key} type="button" className="var-pilula" title={o.variavel.options?.join(' · ')} onClick={() => onAdicionar(o.variavel)}>
                    <Plus size={12} />
                    {rotuloColuna(o.variavel)}
                    {o.recomendada && <span className="selo-rec">rec.</span>}
                  </button>
                ))}
                <button type="button" className="var-pilula var-nova" aria-pressed={criandoEm === gr.g} title={`Criar uma variável sua no grupo ${gr.g}`} onClick={() => setCriandoEm(criandoEm === gr.g ? null : gr.g)}>
                  <Plus size={12} /> Personalizada
                </button>
              </div>
              {criandoEm === gr.g && (
                <div className="mt-2 rounded-xl border border-dashed border-border p-3">
                  <NovaVariavel existentes={vars} grupo={gr.g} autofoco onCancelar={() => setCriandoEm(null)} onCriar={(v) => { onAdicionar(v); setCriandoEm(null) }} />
                </div>
              )}
            </section>
          ))
        ) : (
          <p className="text-[13px] text-muted">
            {busca ? 'Nenhuma variável com esse nome.' : 'Todas as variáveis do catálogo já estão na planilha.'} Crie uma personalizada abaixo, escolhendo o grupo.
          </p>
        )}
        <section className="rounded-xl border border-dashed border-border p-3">
          <h4 className="card-tit mb-2">Criar variável personalizada <span className="suave">em qualquer grupo</span></h4>
          <NovaVariavel existentes={vars} onCriar={onAdicionar} />
        </section>
      </div>
    </Modal>
  )
}
