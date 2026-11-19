import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ResearchSample, ResearchSampleInput } from '../lib/amostragem/types'

/**
 * Amostragens de mercado (18/11/2026). Ficam neste navegador, numa chave própria ("fluxocaixa-amostragens"),
 * separadas das O.S. (fluxocaixa-v3): nada do que já existe muda de lugar.
 */
interface EstadoAmostragens {
  amostras: ResearchSample[]
  criar: (a: ResearchSampleInput, autor?: string) => ResearchSample
  atualizar: (id: string, a: ResearchSampleInput) => ResearchSample | undefined
  excluir: (id: string) => void
}

const novoId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `am-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`

const copia = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T

export const useAmostragens = create<EstadoAmostragens>()(
  persist(
    (set, get) => ({
      amostras: [],
      criar: (a, autor) => {
        const agora = new Date().toISOString()
        const nova: ResearchSample = { ...copia(a), id: novoId(), createdByName: autor ?? null, createdAt: agora, updatedAt: agora }
        set({ amostras: [nova, ...get().amostras] })
        return nova
      },
      atualizar: (id, a) => {
        let salva: ResearchSample | undefined
        set({
          amostras: get().amostras.map((x) => {
            if (x.id !== id) return x
            salva = { ...x, ...copia(a), id, updatedAt: new Date().toISOString() }
            return salva
          }),
        })
        return salva
      },
      excluir: (id) => set({ amostras: get().amostras.filter((x) => x.id !== id) }),
    }),
    { name: 'fluxocaixa-amostragens', version: 1 },
  ),
)
