import type { ItemAnotacao } from '../types'

// Quadro de post-its (23/11): lembretes simples, só texto e cor, sem O.S. O mais novo fica primeiro.

export const CORES_POSTIT = ['amarelo', 'verde', 'azul', 'rosa', 'laranja', 'lilas', 'turquesa', 'salmao', 'lima', 'areia'] as const
export type CorPostit = (typeof CORES_POSTIT)[number]
export const NOME_COR: Record<CorPostit, string> = {
  amarelo: 'Amarelo', verde: 'Verde', azul: 'Azul', rosa: 'Rosa', laranja: 'Laranja',
  lilas: 'Lilás', turquesa: 'Turquesa', salmao: 'Salmão', lima: 'Lima', areia: 'Areia',
}

/** Cor do próximo post-it: a primeira que ainda não está no quadro; com todas usadas, a menos usada (não repete à toa). */
export function proximaCor(lista: Pick<ItemAnotacao, 'cor'>[] = []): CorPostit {
  const usos = new Map<string, number>(CORES_POSTIT.map((c) => [c, 0]))
  for (const i of lista) usos.set(corDe(i), (usos.get(corDe(i)) ?? 0) + 1)
  return CORES_POSTIT.reduce((melhor, c) => ((usos.get(c) ?? 0) < (usos.get(melhor) ?? 0) ? c : melhor), CORES_POSTIT[0])
}

/** Cor do post-it; sem cor (ou cor desconhecida) = amarelo. */
export const corDe = (i: Pick<ItemAnotacao, 'cor'>): CorPostit => (CORES_POSTIT as readonly string[]).includes(i.cor ?? '') ? (i.cor as CorPostit) : 'amarelo'

/** Cola um post-it novo no começo do quadro (pode nascer vazio para escrever nele); sem cor, usa a próxima que não repete. */
export function novoPostit(lista: ItemAnotacao[] = [], texto = '', cor: string = proximaCor(lista), agora = new Date()): ItemAnotacao[] {
  const id = `an-${agora.getTime().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
  return [{ id, texto: texto.trim(), cor, criadaEm: agora.toISOString() }, ...lista]
}

export const editarPostit = (lista: ItemAnotacao[] = [], id: string, patch: { texto?: string; cor?: string }) =>
  lista.map((i) => (i.id === id ? { ...i, ...patch } : i))

export const removerItem = (lista: ItemAnotacao[] = [], id: string) => lista.filter((i) => i.id !== id)

/** Post-its que o quadro já traz (23/11): 4 em branco, um de cada cor (ids fixos para não repetir). */
export const POSTITS_PADRAO: ItemAnotacao[] = (['amarelo', 'verde', 'azul', 'rosa'] as const).map((cor) => ({ id: `postit-${cor}`, texto: '', cor, criadaEm: '2026-11-23T12:00:00.000Z' }))

/** Põe os post-its padrão uma única vez (marca `postitsPadrao`); depois o usuário pode apagar à vontade. */
export function comPostitsPadrao(c: { lembretes?: ItemAnotacao[]; postitsPadrao?: boolean }): { lembretes: ItemAnotacao[]; postitsPadrao: true } {
  const atuais = c.lembretes ?? []
  if (c.postitsPadrao) return { lembretes: atuais, postitsPadrao: true }
  return { lembretes: [...atuais, ...POSTITS_PADRAO.filter((p) => !atuais.some((a) => a.id === p.id))], postitsPadrao: true }
}

/** Quadro sem cores repetidas (23/11): enquanto houver cor livre, o post-it mais novo com cor repetida ganha uma cor que
 *  ninguém usa (o mais antigo mantém a sua). Com as 10 cores em uso, repetir é inevitável e nada muda. */
export function semCoresRepetidas(lista: ItemAnotacao[] = []): ItemAnotacao[] {
  const usadas = new Set(lista.map(corDe))
  const vistas = new Set<string>()
  let mudou = false
  const out = [...lista]
  for (let k = out.length - 1; k >= 0; k--) { // do mais antigo (fim) para o mais novo (começo)
    const c = corDe(out[k])
    if (vistas.has(c)) {
      const livre = CORES_POSTIT.find((x) => !usadas.has(x))
      if (livre) { out[k] = { ...out[k], cor: livre }; usadas.add(livre); vistas.add(livre); mudou = true; continue }
    }
    vistas.add(c)
  }
  return mudou ? out : lista
}

/** Cores que este post-it não pode escolher porque outro já usa. Com mais post-its que cores, repetir é inevitável: libera todas. */
export function coresBloqueadas(lista: ItemAnotacao[] = [], id: string): Set<CorPostit> {
  if (lista.length > CORES_POSTIT.length) return new Set()
  return new Set(lista.filter((i) => i.id !== id).map(corDe))
}

/** Leve inclinação de cada post-it (sempre a mesma para o mesmo post-it), para parecer colado à mão. */
export function inclinacao(id: string): number {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0
  return [-2, -1, 0, 1, 2][Math.abs(h) % 5] * 0.8
}
