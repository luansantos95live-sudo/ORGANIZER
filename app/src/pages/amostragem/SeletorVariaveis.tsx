import { Lock, Plus, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { VariavelAmostra } from '../../lib/amostragem/types'
import { GRUPOS, TIPOS_VARIAVEL, inserirNoGrupo, opcoesDoTipo, ordenar, rotuloColuna, tipoPorId } from '../../lib/amostragem/catalogo'
import { NovaVariavel } from './NovaVariavel'

/** Variável criada pelo usuário: marcada, com o tipo e o X para tirar. */
function Propria({ v, onRemover }: { v: VariavelAmostra; onRemover: () => void }) {
  return (
    <span className="var-pilula" aria-pressed="true">
      {rotuloColuna(v)}
      <span className="text-[11px] opacity-70">{TIPOS_VARIAVEL.find((t) => t.value === v.type)?.label}</span>
      <button type="button" aria-label={`Remover ${v.label}`} className="ml-0.5 opacity-70 hover:opacity-100" onClick={onRemover}>
        <X size={13} />
      </button>
    </span>
  )
}

/**
 * Escolha das variáveis da amostragem: as do catálogo do tipo agrupadas (obrigatórias travadas, recomendadas com selo),
 * "+ Personalizada" em cada grupo e as personalizadas criadas pelo avaliador.
 */
export function SeletorVariaveis({ tipoId, valor, onChange }: { tipoId: string; valor: VariavelAmostra[]; onChange: (v: VariavelAmostra[]) => void }) {
  const opcoes = useMemo(() => opcoesDoTipo(tipoId), [tipoId])
  const marcadas = new Set(valor.map((v) => v.key))
  const doCatalogo = new Set(opcoes.map((o) => o.variavel.key))
  const extras = valor.filter((v) => !doCatalogo.has(v.key))
  const grupos = GRUPOS.filter((g) => g !== 'Personalizadas')
    .map((g) => ({ g, itens: opcoes.filter((o) => o.variavel.group === g), proprias: extras.filter((v) => v.group === g) }))
    .filter((x) => x.itens.length || x.proprias.length)
  const comGrupo = new Set<string>(grupos.map((x) => x.g))
  const soltas = extras.filter((v) => !comGrupo.has(v.group))
  const [criandoEm, setCriandoEm] = useState<string | null>(null)
  const areaKey = tipoPorId(tipoId).areaKey

  const alternar = (v: VariavelAmostra, fixa: boolean) => {
    if (fixa) return
    onChange(marcadas.has(v.key) ? valor.filter((x) => x.key !== v.key) : inserirNoGrupo(valor, v))
  }
  const remover = (v: VariavelAmostra) => onChange(valor.filter((x) => x.key !== v.key))
  const soRecomendadas = () => onChange(ordenar([...opcoes.filter((o) => o.fixa || o.recomendada).map((o) => o.variavel), ...extras]))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12.5px] text-muted">
          <b className="text-[var(--text)]">{valor.length}</b> variáveis escolhidas. <Lock size={11} className="inline" /> = obrigatória do tipo ·{' '}
          <span className="selo-rec">recomendada</span> = sugerida pela norma
        </p>
        <button type="button" className="btn btn-ghost btn-sm" onClick={soRecomendadas}>Voltar às recomendadas</button>
      </div>

      {grupos.map((gr) => (
        <section key={gr.g}>
          <h4 className="card-tit mb-1.5">{gr.g}</h4>
          <div className="flex flex-wrap gap-1.5">
            {gr.itens.map((o) => (
              <button
                key={o.variavel.key}
                type="button"
                className="var-pilula"
                aria-pressed={marcadas.has(o.variavel.key)}
                disabled={o.fixa}
                title={o.fixa ? 'Obrigatória para este tipo de amostragem' : o.variavel.options?.join(' · ')}
                onClick={() => alternar(o.variavel, o.fixa)}>
                {o.fixa && <Lock size={11} />}
                {rotuloColuna(o.variavel)}
                {o.recomendada && !o.fixa && <span className="selo-rec">rec.</span>}
                {o.variavel.key === areaKey && <span className="selo-rec">área de referência</span>}
              </button>
            ))}
            {gr.proprias.map((v) => <Propria key={v.key} v={v} onRemover={() => remover(v)} />)}
            <button
              type="button"
              className="var-pilula var-nova"
              aria-pressed={criandoEm === gr.g}
              title={`Criar uma variável sua no grupo ${gr.g}`}
              onClick={() => setCriandoEm(criandoEm === gr.g ? null : gr.g)}>
              <Plus size={12} /> Personalizada
            </button>
          </div>
          {criandoEm === gr.g && (
            <div className="mt-2 rounded-xl border border-dashed border-border p-3">
              <NovaVariavel
                existentes={valor}
                grupo={gr.g}
                autofoco
                onCancelar={() => setCriandoEm(null)}
                onCriar={(v) => { onChange(inserirNoGrupo(valor, v)); setCriandoEm(null) }}
              />
            </div>
          )}
        </section>
      ))}

      <section className="rounded-xl border border-dashed border-border p-3">
        <h4 className="card-tit mb-2">Variáveis personalizadas</h4>
        {soltas.length ? (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {soltas.map((v) => <Propria key={v.key} v={v} onRemover={() => remover(v)} />)}
          </div>
        ) : (
          <p className="mb-2 text-[12.5px] text-muted">
            Use “+ Personalizada” em cada grupo, ou crie aqui escolhendo o grupo (ex.: “Vista para o lago”, “Distância à escola”).
          </p>
        )}
        <NovaVariavel existentes={valor} onCriar={(v) => onChange(inserirNoGrupo(valor, v))} />
      </section>
    </div>
  )
}
