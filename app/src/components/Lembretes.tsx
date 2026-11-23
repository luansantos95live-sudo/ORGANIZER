import clsx from 'clsx'
import { X } from 'lucide-react'
import { useMemo } from 'react'
import { CORES_POSTIT, NOME_COR, corDe, coresBloqueadas, inclinacao } from '../lib/anotacoes'
import { useStore } from '../store/useStore'
import type { ItemAnotacao } from '../types'

/** Um post-it do quadro (23/11): quadrado colorido, escreve direto nele; ao passar o mouse, X para apagar e as cores. */
export function Postit({ item, autoFocus }: { item: ItemAnotacao; autoFocus?: boolean }) {
  const editar = useStore((s) => s.editarLembrete)
  const apagar = useStore((s) => s.apagarLembrete)
  const lembretes = useStore((s) => s.config.lembretes)
  const bloqueadas = useMemo(() => coresBloqueadas(lembretes, item.id), [lembretes, item.id]) // cor de outro post-it não repete
  const cor = corDe(item)
  return (
    <article className={clsx('postit group', `pi-${cor}`)} style={{ ['--rot' as string]: `${inclinacao(item.id)}deg` }}>
      <button type="button" className="postit-x" aria-label="Apagar post-it" title="Apagar"
        onClick={() => { if (!item.texto.trim() || confirm('Apagar este post-it?')) apagar(item.id) }}><X size={15} /></button>
      <textarea className="postit-texto" value={item.texto} placeholder="Escreva aqui…" autoFocus={autoFocus} aria-label="Texto do post-it"
        onChange={(e) => editar(item.id, { texto: e.target.value })} />
      <div className="postit-cores">
        {CORES_POSTIT.map((c) => (
          <button key={c} type="button" className={clsx('postit-cor', `pi-${c}`, c === cor && 'ativa')} aria-label={`Cor ${NOME_COR[c]}`}
            title={bloqueadas.has(c) ? `${NOME_COR[c]} (já usada em outro post-it)` : NOME_COR[c]} disabled={bloqueadas.has(c)}
            onClick={() => editar(item.id, { cor: c })} />
        ))}
      </div>
    </article>
  )
}
