import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Config, Escopo, OS, Parada, Responsavel, Rota, Status } from '../types'
import { CONFIG_PADRAO, gerarSeed } from '../data/seed'
import { recalcularDeslocamentos } from '../lib/rota'

interface State {
  os: OS[]
  rotas: Rota[]
  config: Config
  escopo: Escopo
  usuario: Responsavel
  // ações O.S.
  setEscopo: (e: Escopo) => void
  atualizarOS: (id: string, patch: Partial<OS>, evento?: string) => void
  mudarStatus: (id: string, status: Status, evento?: string) => void
  agendar: (id: string, data: string, hora: string, duracao: number) => void
  transferir: (id: string, para: Responsavel) => void
  toggleDoc: (id: string, doc: keyof OS['docs']) => void
  // rotas
  getRota: (data: string, resp: Responsavel) => Rota
  salvarRota: (rota: Rota) => void
  adicionarParada: (data: string, resp: Responsavel, osId: string) => void
  removerParada: (data: string, resp: Responsavel, osId: string) => void
  setParadas: (data: string, resp: Responsavel, paradas: Parada[]) => void
  aplicarRotaNasOS: (data: string, resp: Responsavel) => void
  // config
  setConfig: (patch: Partial<Config>) => void
  resetarDados: () => void
}

const seed = gerarSeed()

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      os: seed.os,
      rotas: seed.rotas,
      config: CONFIG_PADRAO,
      escopo: 'luan',
      usuario: 'luan',

      setEscopo: (escopo) => set({ escopo }),

      atualizarOS: (id, patch, evento) =>
        set((s) => ({
          os: s.os.map((o) =>
            o.id === id
              ? { ...o, ...patch, historico: evento ? [...o.historico, { data: new Date().toISOString(), texto: evento }] : o.historico }
              : o,
          ),
        })),

      mudarStatus: (id, status, evento) => {
        const nomes: Record<Status, string> = {
          convocada: 'Voltou para convocada', emitida: 'Aceite registrado', agendada: 'Vistoria agendada', vistoriada: 'Vistoria realizada',
          laudo_enviado: 'Laudo enviado no SIOPI', diligencia: 'Caixa solicitou correção', finalizada: 'Laudo aceito — O.S. finalizada',
          conferida: 'Conferida no extrato mensal', cancelada: 'O.S. cancelada',
        }
        const patch: Partial<OS> = { status }
        if (status === 'laudo_enviado') patch.enviadoEm = new Date().toISOString().slice(0, 10)
        if (status === 'finalizada') patch.concluidaEm = new Date().toISOString().slice(0, 10)
        if (status === 'conferida') patch.conferida = true
        get().atualizarOS(id, patch, evento ?? nomes[status])
      },

      agendar: (id, data, hora, duracao) => {
        const s = get()
        const os = s.os.find((o) => o.id === id)
        if (!os) return
        // tira da rota antiga, se mudou de dia
        if (os.vistoria && os.vistoria.data !== data) s.removerParada(os.vistoria.data, os.responsavel, id)
        s.atualizarOS(id, { status: 'agendada', vistoria: { data, hora, duracao } }, `Vistoria agendada para ${data.split('-').reverse().slice(0, 2).join('/')} às ${hora}`)
        // garante a parada na rota do dia com a hora escolhida
        const rota = get().getRota(data, os.responsavel)
        const jaTem = rota.paradas.some((p) => p.osId === id)
        const paradas = jaTem
          ? rota.paradas.map((p) => (p.osId === id ? { ...p, inicio: hora, duracao } : p))
          : [...rota.paradas, { osId: id, inicio: hora, duracao, deslocamento: 0 }]
        get().setParadas(data, os.responsavel, paradas)
      },

      transferir: (id, para) => {
        const nome = get().config.responsaveis[para].curto
        get().atualizarOS(id, { responsavel: para }, `Transferida para ${nome}`)
      },

      toggleDoc: (id, doc) =>
        set((s) => ({ os: s.os.map((o) => (o.id === id ? { ...o, docs: { ...o.docs, [doc]: !o.docs[doc] } } : o)) })),

      getRota: (data, responsavel) => {
        const id = `${data}_${responsavel}`
        return get().rotas.find((r) => r.id === id) ?? { id, data, responsavel, partida: get().config.partidaPadrao, paradas: [] }
      },

      salvarRota: (rota) =>
        set((s) => ({ rotas: [...s.rotas.filter((r) => r.id !== rota.id), rota] })),

      adicionarParada: (data, resp, osId) => {
        const s = get()
        const rota = s.getRota(data, resp)
        if (rota.paradas.some((p) => p.osId === osId)) return
        const os = s.os.find((o) => o.id === osId)
        const duracao = os?.vistoria?.duracao ?? (os ? s.config.duracaoPadrao[os.tipo] : 45)
        const ult = rota.paradas[rota.paradas.length - 1]
        // próxima hora livre: fim da última parada + deslocamento, ou a hora já agendada, ou a partida
        let inicio = rota.partida
        if (os?.vistoria?.data === data) inicio = os.vistoria.hora
        else if (ult) {
          const [h, m] = ult.inicio.split(':').map(Number)
          const t = h * 60 + m + ult.duracao + s.config.deslocamentoOutroBairro
          inicio = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
        }
        const paradas = recalcularDeslocamentos([...rota.paradas, { osId, inicio, duracao, deslocamento: 0 }], (id) => s.os.find((o) => o.id === id), s.config)
        s.salvarRota({ ...rota, paradas })
      },

      removerParada: (data, resp, osId) => {
        const s = get()
        const rota = s.getRota(data, resp)
        const paradas = recalcularDeslocamentos(rota.paradas.filter((p) => p.osId !== osId), (id) => s.os.find((o) => o.id === id), s.config)
        s.salvarRota({ ...rota, paradas })
      },

      setParadas: (data, resp, paradas) => {
        const s = get()
        const rota = s.getRota(data, resp)
        s.salvarRota({ ...rota, paradas: recalcularDeslocamentos(paradas, (id) => s.os.find((o) => o.id === id), s.config) })
      },

      aplicarRotaNasOS: (data, resp) => {
        const s = get()
        const rota = s.getRota(data, resp)
        for (const p of rota.paradas) {
          const o = s.os.find((x) => x.id === p.osId)
          if (!o) continue
          const mudou = o.vistoria?.data !== data || o.vistoria?.hora !== p.inicio || o.vistoria?.duracao !== p.duracao
          if (mudou || o.status === 'emitida' || o.status === 'convocada') {
            s.atualizarOS(o.id, { status: o.status === 'emitida' || o.status === 'convocada' || o.status === 'agendada' ? 'agendada' : o.status, vistoria: { data, hora: p.inicio, duracao: p.duracao } }, `Rota: vistoria marcada para ${data.split('-').reverse().slice(0, 2).join('/')} às ${p.inicio}`)
          }
        }
      },

      setConfig: (patch) => set((s) => ({ config: { ...s.config, ...patch } })),

      resetarDados: () => {
        const novo = gerarSeed()
        set({ os: novo.os, rotas: novo.rotas, config: CONFIG_PADRAO, escopo: 'luan' })
      },
    }),
    {
      name: 'fluxogestor-lab-v2',
      // garante campos novos de configuração em dados salvos antes deles existirem
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>
        return { ...current, ...p, config: { ...current.config, ...(p.config ?? {}) } }
      },
    },
  ),
)

/** O.S. visíveis no escopo atual. */
export function filtrarEscopo(os: OS[], escopo: Escopo) {
  return escopo === 'todas' ? os : os.filter((o) => o.responsavel === escopo)
}
