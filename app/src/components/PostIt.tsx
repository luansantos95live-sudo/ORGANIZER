import clsx from 'clsx'
import { StickyNote, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { proximaCor } from '../lib/anotacoes'
import { useStore } from '../store/useStore'
import { useFora } from './ui'

/** Post-it flutuante (23/11): botão no canto inferior direito, em todas as telas. Abre um post-it em branco para escrever
 *  um lembrete rápido; "Colar no quadro" (ou Ctrl+Enter) guarda no quadro de Anotações. Sem O.S. */
export function PostIt() {
  const novo = useStore((s) => s.novoLembrete)
  const cor = useStore((s) => proximaCor(s.config.lembretes)) // o post-it rápido já mostra a cor que vai ter no quadro
  const [aberto, setAberto] = useState(false)
  const [texto, setTexto] = useState('')
  const ref = useFora<HTMLDivElement>(aberto, () => setAberto(false))
  useEffect(() => {
    if (!aberto) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false) }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [aberto])
  const colar = () => { if (!texto.trim()) return; novo(texto, cor); setTexto(''); setAberto(false) }

  return (
    <div ref={ref} className="fixed right-4 bottom-20 md:right-6 md:bottom-6 z-40 flex flex-col items-end gap-3">
      {aberto && (
        <section className={`postit postit-rapido pi-${cor}`} role="dialog" aria-label="Novo lembrete">
          <button type="button" className="postit-x !opacity-100" aria-label="Fechar" title="Fechar" onClick={() => setAberto(false)}><X size={15} /></button>
          <textarea className="postit-texto" value={texto} placeholder="Escreva um lembrete…" autoFocus aria-label="Texto do lembrete"
            onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); colar() } }} />
          <div className="flex items-center gap-2 pt-1">
            <NavLink to="/anotacoes" className="text-[12px] font-semibold underline-offset-2 hover:underline opacity-75" onClick={() => setAberto(false)}>Ver quadro</NavLink>
            <button type="button" className="ml-auto h-[30px] px-3 rounded-[8px] bg-[#2a2e27] text-white text-[12.5px] font-semibold disabled:opacity-40" disabled={!texto.trim()} onClick={colar}>Colar no quadro</button>
          </div>
        </section>
      )}
      <button type="button" className={clsx('postit-botao relative', aberto && 'aberto')} onClick={() => setAberto((a) => !a)}
        aria-label="Lembretes" title="Lembretes" aria-expanded={aberto}>
        <StickyNote size={24} strokeWidth={1.9} />
      </button>
    </div>
  )
}
