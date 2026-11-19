/**
 * Pasta de cada O.S. no OneDrive (pedido de 12/11/2026: "quando cadastrar uma O.S. nova ela deve criar a pasta").
 * Segue a estrutura que o usuário já usa (não cria outra):
 *   <pasta "1 - ORDENS DE SERVIÇO">/<técnico>/<ano>/<MÊS>/OS-<nº> - <tipologia> - <cidade> - <bairro> - <rua>/
 *     OS.txt · DOCUMENTOS SIOPI/{OUTROS,PLS,ULTIMA RAE} · FOTOS VISTORIA · LAUDO/{LAUDO,MODELO DE REGRESSÃO,RAE}
 * Regras puras aqui; a gravação na pasta fica em store/pastasOS.ts.
 */
import type { OS, Responsavel } from '../types'

export const MESES = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO']

export const SUBPASTAS = ['DOCUMENTOS SIOPI/OUTROS', 'DOCUMENTOS SIOPI/PLS', 'DOCUMENTOS SIOPI/ULTIMA RAE', 'FOTOS VISTORIA', 'LAUDO/LAUDO', 'LAUDO/MODELO DE REGRESSÃO', 'LAUDO/RAE']

/** A pasta de cada técnico começa pelo número dele, como no OneDrive ("1 - …" = dono da conta, "2 - …" = RT). */
export const PREFIXO_TECNICO: Record<Responsavel, string> = { luan: '1 - ', rt: '2 - ' }
/** Por enquanto só as O.S. do dono da conta ganham pasta (pedido: não mexer na pasta do RT). */
export const TECNICOS_COM_PASTA: Responsavel[] = ['luan']

/** Tira o que o Windows não aceita em nome de pasta e espaços repetidos. */
export const limparNome = (s: string) => s.replace(/[\/:*?"<>|\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().replace(/[. ]+$/, '')

export function nomePastaOS(o: Pick<OS, 'numero' | 'tipologia' | 'endereco'>): string {
  const partes = [`OS-${o.numero}`, o.tipologia, o.endereco.cidade, o.endereco.bairro, o.endereco.logradouro].map((p) => limparNome(String(p ?? '')).toUpperCase()).filter(Boolean)
  return partes.join(' - ').slice(0, 150).trim()
}

/** Ano e mês da pasta: o mês em que a O.S. foi recebida. */
export function anoMesDaOS(o: Pick<OS, 'emissao'>): [string, string] {
  const [ano, mes] = o.emissao.split('-')
  return [ano, MESES[Number(mes) - 1] ?? 'SEM MES']
}

/** O.S. que ainda precisa da pasta: nova no sistema (não veio das pastas nem é exemplo), do técnico com pasta, não cancelada. */
export const precisaPasta = (o: OS) =>
  !o.pasta && !o.id.startsWith('pasta-') && !/^os-\d+$/.test(o.id) && o.status !== 'cancelada' && TECNICOS_COM_PASTA.includes(o.responsavel)

/** Nome da pasta do técnico entre as que existem na raiz. */
export const pastaDoTecnico = (nomes: string[], resp: Responsavel) => nomes.find((n) => n.startsWith(PREFIXO_TECNICO[resp]))

/** Já existe pasta desta O.S. no mês (qualquer nome que comece por "OS-<nº> ")? Nunca criar repetida. */
export const pastaExistente = (nomes: string[], numero: number) => nomes.find((n) => n === `OS-${numero}` || n.startsWith(`OS-${numero} `))

/** Conteúdo do OS.txt: o texto do .txt da Caixa; sem ele, a referência (como nas pastas antigas). */
export const textoOsTxt = (o: Pick<OS, 'txtOriginal' | 'referencia'>) => (o.txtOriginal?.trim() ? o.txtOriginal : o.referencia)
