// Modelo de dados igual ao do FluxoGestor real (docs/05-SISTEMA-REAL.md), mais alguns campos do laboratório
// (documentos, fotos, histórico, conferência e RRT) usados nas melhorias.

export type Responsavel = 'luan' | 'rt'
export type Escopo = Responsavel | 'todas'

/** Tipologias da Caixa que aparecem no sistema real. */
export type Tipologia = 'E004' | 'E401' | 'E005' | 'G012' | 'B438' | 'B437' | 'A413' | 'G416' | 'G014' | 'G402'

/** Etapas da O.S. no sistema real (a Caixa não devolve laudo: não existe etapa Devolvida). */
export type Status = 'recebida' | 'em_andamento' | 'assinatura_pendente' | 'assinatura_concluida' | 'concluida' | 'cancelada'

/** Como a O.S. entrou no sistema. */
export type Origem = 'manual' | 'arquivo' | 'texto' | 'email'

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
  numero: string // "0" ou "SN" quando sem número
  bairro: string
  cidade: string
  uf: string
  cep: string
  lat?: number
  lng?: number
}

export interface Evento {
  data: string // ISO datetime
  texto: string
}

/** Tentativa de contato com o cliente (melhoria: vira justificativa para pedir pausa ou prazo). */
export type TipoContato = 'ligacao' | 'whatsapp' | 'conversou' | 'recado'
export interface Contato {
  data: string // ISO datetime
  tipo: TipoContato
  respondeu: boolean
  obs: string
}


/** Passos do serviço Caixa (checklist da O.S.). */
export type PassoKey = 'recebida' | 'baixar_docs' | 'analisar_docs' | 'pept' | 'marcar_vistoria' | 'fazer_vistoria' | 'avaliacao' | 'simil' | 'baixar_laudo' | 'assinar' | 'enviar'

export interface Vistoria {
  data: string // yyyy-mm-dd
  hora: string // HH:mm
  duracao: number // minutos
  feita?: boolean // marcada como feita antes do fim do dia
}

/** Aba "Importação" do sistema real: códigos que vêm no .txt da Caixa. */
export interface Importacao {
  codProduto: string
  codLinha: string
  codFonte: string
  cartorio: string // ofício
  livro: string
  localRetirada: string
  solicitante: string
  executante: string
}

export interface OS {
  id: string
  numero: number // identificador curto: OS-12
  referencia: string // Nº da Caixa: 7886.1831.001122004/2026.01.01
  tipologia: Tipologia
  status: Status
  responsavel: Responsavel // técnico
  origem: Origem
  mesReferencia: string // yyyy-MM
  propriedade: string
  descricao: string
  observacoes: string
  // Cliente
  proponente: string
  documento: string
  clienteTelefone: string
  clienteEmail: string
  // Contato
  contato: string
  telefone: string
  whatsapp: string
  contatoEmail: string
  contatos: Contato[] // tentativas de contato registradas
  endereco: Endereco
  matricula: string // Nº registro
  // Datas
  emissao: string // data de recebimento, yyyy-mm-dd
  prazo: string // yyyy-mm-dd
  entregaEm?: string // data de entrega do laudo
  vistoria?: Vistoria
  concluidaEm?: string // yyyy-mm-dd
  pausadoEm?: string // yyyy-mm-dd enquanto a O.S. está pausada
  pepts?: Pept[] // registro de cada PEPT (tipo, pendência, início e fim); a em aberto não tem `fim`
  diasPausado: number // dias de pausas já encerradas (empurram o prazo efetivo)
  passos?: Partial<Record<PassoKey, string>> // checklist: data em que cada passo foi feito, ou 'pulado'
  colunaLivre?: string // id da coluna livre do Kanban onde o usuário pôs o cartão (não muda a etapa)
  // Valores
  valorServico: number
  valorDeslocamento: number
  importacao: Importacao
  // Financeiro e fichas
  faturada: boolean
  faturadaEm?: string
  fichaFornecida: boolean
  txtOriginal?: string // texto do .txt da Caixa (vai para o OS.txt da pasta da O.S.)
  pasta?: string // caminho da pasta criada no OneDrive (12/11): '1 - …/2026/NOVEMBRO/OS-28 - …'
  nova?: boolean // criada sozinha (e-mail da Caixa) e ainda não aberta: selo NOVA e aviso no sininho
  // Laboratório
  docs: Record<DocKey, boolean>
  fotos: number
  historico: Evento[]
  conferida: boolean
  rrt: boolean
}

export type StatusRota = 'rascunho' | 'confirmada' | 'concluida' | 'cancelada'

export interface Parada {
  osId: string
  hora?: string // HH:mm combinada com o cliente (passo Agendar da rota)
  avisado?: boolean // cliente avisado pelo WhatsApp (passo Agendar da rota)
  confirmado?: boolean // cliente confirmou o horário; a rota só é criada depois das confirmações
}

export interface Rota {
  id: string
  codigo: string // ROTA-27E9
  responsavel: Responsavel
  status: StatusRota
  data: string // yyyy-mm-dd (início)
  hora: string // HH:mm de saída
  partida: { endereco: string; lat: number; lng: number }
  velocidadeMedia: number // km/h
  descricao: string
  paradas: Parada[]
  etapa?: number // último passo do planejador liberado (13/11: os passos abrem um depois do outro)
  ordemManual?: boolean // o usuário arrastou as paradas: ao adicionar O.S., não reordena por bairro sozinho
}

export interface Membro {
  nome: string
  curto: string
  registro: string
  email: string
  papel: 'Proprietário' | 'Membro'
  ativo: boolean
  foto?: string // foto de perfil (Configurações › Meu Perfil), quadrada e reduzida, em data URL; sem ela, a inicial
  fotoOriginal?: string // a imagem escolhida (reduzida a 800 px), para poder reajustar o enquadramento depois
  fotoEnq?: { zoom: number; x: number; y: number } // enquadramento: zoom (1 = cobre o círculo) e deslocamento em fração da janela
}

/** PEPT (pendência que pausa o prazo): documental (problema em documento) ou de vistoria (impedimento na vistoria). */
export type TipoPept = 'documental' | 'vistoria'
/** Como a PEPT terminou: finalizada, O.S. reaberta (no dia informado), pelo e-mail da Caixa ou porque a O.S. foi concluída. */
export type ComoResolveu = 'manual' | 'reaberta' | 'email' | 'conclusao'
export interface Pept {
  id: string
  tipo?: TipoPept // vazio só em PEPT antiga, de antes de existir o tipo
  motivo: string // a pendência
  inicio: string // yyyy-mm-dd (o prazo para nesse dia)
  resolvidaEm?: string // yyyy-mm-dd em que o cliente resolveu (o prazo volta a contar); a PEPT segue aberta, em análise
  resolucao?: 'email' | 'manual' // como a resolução do cliente foi registrada
  fim?: string // yyyy-mm-dd em que foi resolvida
  dias?: number // dias que empurraram o prazo (calculado ao resolver)
  resolvidaPor?: ComoResolveu
  reabertaDe?: string // id da PEPT finalizada que foi reaberta (mesmo motivo e tipo, novo período parado)
}

/**
 * Coluna do Kanban de O.S., editável em "Colunas": de etapa (as do sistema real, mais PEPT), livre (o usuário cria e
 * arrasta os cartões para ela) ou por passo (junta sozinha as O.S. que estão naquele passo do serviço).
 */
export type KanbanColuna =
  | { id: string; tipo: 'etapa'; etapa: Status | 'pept'; titulo?: string; oculta?: boolean }
  | { id: string; tipo: 'livre'; titulo: string; cor: string; oculta?: boolean }
  | { id: string; tipo: 'passo'; passo: PassoKey; titulo?: string; cor: string; oculta?: boolean }

/** Nota fiscal de um mês (a empresa emite uma no fim de cada mês, com as O.S. finalizadas). Histórico do Financeiro. */
export interface NotaFiscal {
  mes: string // yyyy-MM (competência)
  valor: number // soma das notas do mês, em R$
  numeros: string[] // números das notas somadas (evita importar a mesma duas vezes)
}

export interface Config {
  tema: 'claro' | 'escuro'
  notasFiscais?: NotaFiscal[] // notas fiscais dos meses anteriores, digitadas ou importadas do XML (Financeiro › Últimos 6 meses)
  kanban: KanbanColuna[] // colunas do Kanban, na ordem; ocultas não aparecem
  menuRecolhido: boolean // menu lateral só com ícones, como no FLUXO ARQ
  capaInicio?: string // imagem de capa do Início (como no FLUXO ARQ), reduzida, em data URL
  capaInicioY?: number // enquadramento vertical da capa (0 a 100)
  responsaveis: Record<Responsavel, Membro>
  repasseRT: number // fração do RT que vem para você (0.4 = 40%)
  repasseBase: 'total' | 'servico' // o repasse incide sobre serviço + deslocamento ou só sobre o serviço
  metaMensal: number // meta de faturamento consolidado por mês (R$)
  prazoPadraoDias: number // prazo padrão de uma O.S. nova, em dias corridos
  duracaoVistoria: number // minutos por vistoria (estimativa da rota)
  base: { endereco: string; lat: number; lng: number } // endereço base das rotas
  velocidadeMedia: number // km/h usada para estimar o tempo das rotas
  mensagemWhatsApp: string // mensagem enviada ao contato quando a rota é confirmada
  polosAtendidos: string[]
  contrato: { numero: string; edital: string; processo: string; rrt: string } // contrato de credenciamento com a Caixa
  empresa: { fantasia: string; razao: string; cnpj: string; telefone: string; responsavel: string; municipio: string } // quem emite a nota
  /** Ligação com o Gmail pelo Google Apps Script (10/11): endereço do script publicado, senha (token) e se a O.S. é criada sozinha. */
  gmail: { url: string; token: string; criarOs: boolean; ativoDesde?: string; polos?: string[] } // ativoDesde: e-mails antes disso só ficam para consulta; polos: de quais polos a O.S. entra sozinha (vazio = todos)
}
