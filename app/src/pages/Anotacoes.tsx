import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Postit } from '../components/Lembretes'
import { PageHeader } from '../components/ui'
import { useStore } from '../store/useStore'

/** Anotações (23/11): quadro de post-its simples, sem O.S. O mais novo fica primeiro; escreve direto no post-it. */
export function Anotacoes() {
  const lembretes = useStore((s) => s.config.lembretes) ?? []
  const novo = useStore((s) => s.novoLembrete)
  const [focar, setFocar] = useState('')

  return (
    <>
      <PageHeader title="Anotações" subtitle="Seu quadro de post-its"
        actions={<button className="btn btn-primary" onClick={() => setFocar(novo())}><Plus size={16} /> Novo post-it</button>} />
      <div className="quadro-postits">
        {lembretes.map((i) => <Postit key={i.id} item={i} autoFocus={i.id === focar} />)}
        <button type="button" className="postit-vazio" onClick={() => setFocar(novo())} aria-label="Novo post-it">
          <Plus size={26} strokeWidth={1.75} /><span>Novo post-it</span>
        </button>
      </div>
    </>
  )
}
