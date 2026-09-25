export type Responsavel = 'luan' | 'rt'
export type Escopo = Responsavel | 'todas'

export type TipoServico = 'AVALIACAO' | 'VISTORIA_RAE' | 'PCI_PLS' | 'REAVALIACAO'

export type Status =
  | 'convocada'
  | 'emitida'
  | 'agendada'
  | 'vistoriada'
  | 'laudo_enviado'
  | 'diligencia'
  | 'finalizada'
  | 'conferida'
  | 'cancelada'

export type DocKey =
  | 'matricula'
  | 'escritura'
  | 'planta'
  | 'siopi'
  | 'pci'
  | 'laudo'
  | 'pls'
  | 'rrt'
  | 'projetos'
  | 'alvara'
  | 'declaracao'

export interface Endereco {
  logradouro: string
  numero: string // "SN" quando sem número
  bairro: string
  cidade: string
  uf: string
  cep: string
}

export interface Evento {
  data: string // ISO datetime
  texto: string
}

export interface Vistoria {
  data: string // yyyy-mm-dd
  hora: string // HH:mm
  duracao: number // minutos
}

export interface OS {
  id: string
  numero: number
  referencia: string
  tipo: TipoServico
  status: Status
  responsavel: Responsavel
  proponente: string
  contato: string
  telefone: string
  endereco: Endereco
  matricula: string
  valorServico: number
  valorDeslocamento: number
  emissao: string // yyyy-mm-dd
  prazo: string // yyyy-mm-dd
  vistoria?: Vistoria
  enviadoEm?: string
  docs: Record<DocKey, boolean>
  fotos: number
  observacoes: string
  historico: Evento[]
  conferida: boolean
  rrt: boolean
}

export interface Parada {
  osId: string
  inicio: string // HH:mm
  duracao: number // min
  deslocamento: number // min até a próxima parada
}

export interface Rota {
  id: string // `${data}_${responsavel}`
  data: string
  responsavel: Responsavel
  partida: string // HH:mm
  paradas: Parada[]
}

export interface Config {
  tema: 'claro' | 'escuro'
  responsaveis: Record<Responsavel, { nome: string; curto: string; registro: string }>
  duracaoPadrao: Record<TipoServico, number>
  deslocamentoMesmoBairro: number
  deslocamentoOutroBairro: number
  deslocamentoOutraCidade: number
  partidaPadrao: string
}
