import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Config, DocKey, Importacao, OS, Origem, Pept, Responsavel, Status, TipoContato, Tipologia } from '../types'

export type NovaOSInput = Pick<OS, 'referencia' | 'tipologia' | 'responsavel' | 'proponente' | 'contato' | 'telefone' | 'endereco' | 'valorServico' | 'valorDeslocamento' | 'emissao' | 'prazo'> &
  Partial<Pick<OS, 'status' | 'origem' | 'mesReferencia' | 'propriedade' | 'descricao' | 'observacoes' | 'documento' | 'clienteTelefone' | 'clienteEmail' | 'whatsapp' | 'contatoEmail' | 'matricula' | 'importacao' | 'vistoria' | 'entregaEm' | 'concluidaEm'>>

// ---------------------------------------------------------------- etapas (iguais ao sistema real)
export const STATUS_META: Record<Status, { label: string; coluna: string; ordem: number; descricao: string }> = {
  recebida: { label: 'Recebida', coluna: 'Recebidas', ordem: 0, descricao: 'Chegou da Caixa, ainda sem vistoria' },
  em_andamento: { label: 'Em Andamento', coluna: 'Em Andamento', ordem: 1, descricao: 'Vistoria marcada ou feita, laudo em elaboração' },
  assinatura_pendente: { label: 'Assinatura Pendente', coluna: 'Assinatura Pendente', ordem: 2, descricao: 'Laudo pronto, esperando a assinatura do RT' },
  assinatura_concluida: { label: 'Assinatura Concluída', coluna: 'Assinatura Concluída', ordem: 3, descricao: 'Assinado, falta entregar à Caixa' },
  concluida: { label: 'Concluída', coluna: 'Concluídas', ordem: 4, descricao: 'Laudo entregue e aceito' },
  cancelada: { label: 'Cancelada', coluna: 'Canceladas', ordem: 5, descricao: 'Cancelada' },
}

export const STATUS_ORDER = (Object.keys(STATUS_META) as Status[]).sort((a, b) => STATUS_META[a].ordem - STATUS_META[b].ordem)

export const STATUS_ABERTOS: Status[] = ['recebida', 'em_andamento', 'assinatura_pendente', 'assinatura_concluida']

/** Etapas do sistema antigo do laboratório → etapas do sistema real (dados salvos e backups antigos). */
const STATUS_ANTIGO: Record<string, Status> = {
  convocada: 'recebida', emitida: 'recebida', agendada: 'em_andamento', vistoriada: 'em_andamento', diligencia: 'em_andamento',
  laudo_enviado: 'assinatura_pendente', finalizada: 'concluida', conferida: 'concluida', cancelada: 'cancelada',
  devolvida: 'concluida', // etapa que existiu no laboratório e saiu (a Caixa não devolve laudo)
}

/** Etapa conhecida, no formato atual ou no antigo. */
export const statusReconhecido = (s: unknown) => typeof s === 'string' && (s in STATUS_META || s in STATUS_ANTIGO)

// ---------------------------------------------------------------- tipologias e polos
export const TIPOLOGIAS: Record<Tipologia, string> = {
  E004: 'Acompanhamento de obra + Alteração de projeto',
  E401: 'Acompanhamento de Obra de Imóvel Urbano',
  E005: 'Acompanhamento de obras + Reprogramação',
  G012: 'Alteração de Projeto',
  B438: 'Análise de Proposta/Projeto de Construção do Imóvel',
  B437: 'Avaliação de Construção em Terreno Próprio',
  A413: 'Avaliação do Imóvel como um Todo (sem subsídio CAIXA)',
  G416: 'Nova Vistoria para Verificação/Correção de Pendências',
  G014: 'Reanálise ou Análises Complementares (antes da contratação)',
  G402: 'Reedição de Laudo de Avaliação (sem vistoria)',
}
export const TIPOLOGIA_ORDEM = Object.keys(TIPOLOGIAS) as Tipologia[]

/** Cadastro de tipologias do sistema real: prazo em dias, cor e descrição. */
export const TIPOLOGIA_INFO: Record<Tipologia, { prazo: number; cor: string; descricao: string }> = {
  E004: { prazo: 6, cor: '#328f00', descricao: 'ATIVIDADE EDITAL E401 + ATIVIDADE EDITAL G012 - Acompanhamento e alteração de projeto: vistoria presencial para verificação da evolução e conformidade da obra, com registro fotográfico, incluindo análise de alterações do projeto e seus impactos técnicos, orçamentários e no cronograma.' },
  E401: { prazo: 6, cor: '#0FC273', descricao: 'Acompanhamento técnico de obra de imóvel urbano com vistoria presencial para verificar andamento, conformidade e evolução da construção, incluindo registro fotográfico e relatório técnico.' },
  E005: { prazo: 6, cor: '#15adc1', descricao: 'E401 + ATIVIDADE EDITAL G014 - REPROGRAMAÇÃO' },
  G012: { prazo: 10, cor: '#AA00FF', descricao: 'Análise de alterações propostas em relação ao projeto original, verificando impactos em orçamento, cronograma e viabilidade técnica da construção.' },
  B438: { prazo: 15, cor: '#D50000', descricao: 'Análise técnica da proposta ou projeto de construção de imóvel urbano, verificando viabilidade, orçamento, conformidade com normas e compatibilidade com a avaliação do imóvel.' },
  B437: { prazo: 15, cor: '#2962FF', descricao: 'Avaliação técnica de construção realizada em terreno próprio, considerando estágio físico da obra, materiais aplicados e conformidade com o projeto aprovado, para fins de financiamento.' },
  A413: { prazo: 6, cor: '#FFD600', descricao: 'Avaliação completa do imóvel urbano, contemplando terreno e construção, para operações de financiamento sem subsídio CAIXA, com emissão de laudo de avaliação.' },
  G416: { prazo: 5, cor: '#FF6347', descricao: 'Nova vistoria para verificação de correção de pendências apontadas em laudo anterior, com atualização das informações e confirmação do atendimento às exigências.' },
  G014: { prazo: 15, cor: '#AA00FF', descricao: 'Reanálise de documentos, propostas ou alterações de projeto, bem como análises complementares solicitadas pelo agente financeiro antes da contratação definitiva.' },
  G402: { prazo: 3, cor: '#00B0FF', descricao: 'Reedição de laudo de avaliação já emitido, sem necessidade de nova vistoria presencial, baseada em ajustes, complementações ou atualizações documentais.' },
}

/** Tipologias de avaliação, que pedem ficha de pesquisa de mercado. */
export const TIPOLOGIAS_COM_FICHA: Tipologia[] = ['A413', 'B437', 'B438']

/** Tipologias que não têm vistoria (não entram na rota). */
export const TIPOLOGIAS_SEM_VISTORIA: Tipologia[] = ['G402', 'G014']

/** Antigos códigos do laboratório → tipologia real mais próxima. */
const TIPOLOGIA_ANTIGA: Record<string, Tipologia> = { C021: 'E005', M112: 'A413', R017: 'G402' }

/** Cidade no padrão do sistema real: maiúsculas e sem acento ("Ji-Paraná" → "JI-PARANA"). */
export const normCidade = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim()

export const POLOS: Record<string, string[]> = {
  ARIQUEMES: ['ARIQUEMES', 'MONTE NEGRO', 'CACAULANDIA'],
  CACOAL: ['CACOAL', 'ROLIM DE MOURA', 'PIMENTA BUENO'],
  'JI-PARANA': ['JI-PARANA', 'OURO PRETO DO OESTE', 'JARU'],
}

export function poloDe(cidade: string) {
  const c = normCidade(cidade)
  for (const [polo, cidades] of Object.entries(POLOS)) if (cidades.includes(c)) return polo
  return 'OUTROS'
}

/** Centro aproximado das cidades atendidas (para O.S. sem coordenada exata). */
const CENTROS: Record<string, { lat: number; lng: number }> = {
  'JI-PARANA': { lat: -10.8777, lng: -61.9322 },
  'OURO PRETO DO OESTE': { lat: -10.7167, lng: -62.2565 },
  JARU: { lat: -10.4318, lng: -62.4788 },
  ARIQUEMES: { lat: -9.9133, lng: -63.0408 },
  'MONTE NEGRO': { lat: -10.2459, lng: -63.2899 },
  CACAULANDIA: { lat: -10.3389, lng: -62.9047 },
  CACOAL: { lat: -11.4386, lng: -61.4472 },
  'ROLIM DE MOURA': { lat: -11.7271, lng: -61.7714 },
  'PIMENTA BUENO': { lat: -11.6725, lng: -61.1936 },
}
export const centroDaCidade = (cidade: string) => CENTROS[normCidade(cidade)]

// ---------------------------------------------------------------- documentos (melhoria do laboratório)
export const DOC_META: Record<DocKey, string> = {
  matricula: 'Matrícula do imóvel',
  escritura: 'Escritura / contrato',
  planta: 'Planta / Habite-se',
  siopi: 'Documento SIOPI',
  pci: 'Planilha PCI',
  laudo: 'Laudo de avaliação',
  pls: 'Planilha PLS',
  rrt: 'RRT / ART',
  projetos: 'Projetos',
  alvara: 'Alvará',
  declaracao: 'Declaração de elementos construtivos',
}

export const CONTATO_META: Record<TipoContato, { label: string; semResposta: string }> = {
  ligacao: { label: 'Ligação', semResposta: 'Ligação sem resposta' },
  whatsapp: { label: 'WhatsApp', semResposta: 'WhatsApp sem resposta' },
  conversou: { label: 'Conversou com o cliente', semResposta: 'Conversou com o cliente' },
  recado: { label: 'Recado deixado', semResposta: 'Recado deixado' },
}

export const ORIGEM_META: Record<Origem, string> = { manual: 'Criada manualmente', arquivo: 'Arquivo .txt', texto: 'Colar conteúdo', email: 'E-mail (importação automática)' }

export const RESP_META: Record<Responsavel, { cor: string; soft: string }> = {
  luan: { cor: 'var(--brand)', soft: 'var(--brand-soft)' },
  rt: { cor: 'var(--rt)', soft: 'var(--rt-soft)' },
}

// ---------------------------------------------------------------- prazo
export const codigoOS = (o: Pick<OS, 'numero'>) => `OS-${o.numero}`

// ---------------------------------------------------------------- PEPT (prazo pausado)
/** Tipologias em que a O.S. em PEPT fica com o prazo indeterminado enquanto a pendência não se resolve. */
/**
 * Prazo da O.S. pela tipologia: N dias corridos contados a partir do dia seguinte ao recebimento
 * (A413 e E401: 6 dias; B437 e B438: 15 dias). Ex.: recebida em 10/10, A413 → vence em 16/10.
 */
export function prazoDaTipologia(tipologia: Tipologia, emissao: string, padrao = 15): string {
  return format(addDays(parseISO(emissao), TIPOLOGIA_INFO[tipologia]?.prazo ?? padrao), 'yyyy-MM-dd')
}

/**
 * Corrige o prazo das O.S. de exemplo antigas, que usavam 15 dias para todas as tipologias: se o prazo salvo é
 * exatamente recebimento + 15 e a tipologia tem outro prazo, passa a valer o prazo da tipologia.
 */
export function corrigirPrazoAntigo<T extends Pick<OS, 'tipologia' | 'emissao' | 'prazo'>>(o: T): T {
  const dias = TIPOLOGIA_INFO[o.tipologia]?.prazo
  if (!dias || dias === 15 || !o.emissao || o.prazo !== format(addDays(parseISO(o.emissao), 15), 'yyyy-MM-dd')) return o
  return { ...o, prazo: prazoDaTipologia(o.tipologia, o.emissao) }
}
export const PEPT_SEM_PRAZO: Tipologia[] = ['A413']
/** Limite de dias que a PEPT pode segurar o prazo, por tipologia (B438 e B437: no máximo 21 dias). */
export const PEPT_LIMITE: Partial<Record<Tipologia, number>> = { B438: 21, B437: 21 }

/**
 * Dias que uma PEPT empurra o prazo. O dia do cadastro da PEPT e o dia da resolução contam como dias
 * de prazo; só os dias entre eles ficam parados. Com limite da tipologia (B438/B437: 21 dias).
 */
export function diasDePausa(tipologia: Tipologia | undefined, inicio: string, fim: Date): number {
  const d = Math.max(0, differenceInCalendarDays(fim, parseISO(inicio)) - 1)
  const lim = tipologia ? PEPT_LIMITE[tipologia] : undefined
  return lim !== undefined ? Math.min(d, lim) : d
}

/**
 * A PEPT só pausa o prazo se for aberta até 2 dias depois do recebimento da O.S. (chegou dia 08 → até dia 10).
 * Aberta depois disso, ela fica registrada, mas o prazo continua correndo. Reaberturas seguem a PEPT original.
 */
export const DIAS_PARA_ABRIR_PEPT = 2
export const limiteParaPausar = (emissao: string) => format(addDays(parseISO(emissao), DIAS_PARA_ABRIR_PEPT), 'yyyy-MM-dd')
export const peptPausaPrazo = (emissao: string | undefined, inicio: string) => !emissao || inicio <= limiteParaPausar(emissao)

type ComPeptS = { emissao?: string; pausadoEm?: string; pepts?: Pept[] }
/** Se esta PEPT (ou a em aberto, sem `pept`) pausa o prazo: decide a abertura da PEPT original da cadeia de reaberturas. */
export function peptContaPrazo(o: ComPeptS, pept?: Pept): boolean {
  const lista = o.pepts ?? []
  let p = pept ?? lista.find((x) => !x.fim)
  if (!p) return o.pausadoEm ? peptPausaPrazo(o.emissao, o.pausadoEm) : false
  for (let i = 0; p.reabertaDe && i < 50; i++) { const b = lista.find((x) => x.id === p!.reabertaDe); if (!b) break; p = b }
  return peptPausaPrazo(o.emissao, p.inicio)
}
/** A PEPT em aberto está segurando o prazo (aberta no prazo de 2 dias do recebimento). */
export const pausaValida = (o: ComPeptS) => !!o.pausadoEm && peptContaPrazo(o)

/** O.S. em PEPT de tipologia sem prazo (A413): enquanto a PEPT válida estiver aberta, o prazo fica indeterminado. */
export const prazoIndeterminado = (o: Pick<OS, 'pausadoEm' | 'tipologia'> & ComPeptS) => !!o.pausadoEm && PEPT_SEM_PRAZO.includes(o.tipologia) && pausaValida(o)

type ComPrazo = Pick<OS, 'prazo' | 'diasPausado' | 'pausadoEm'> & { tipologia?: Tipologia } & ComPeptS

/** Prazo efetivo: o prazo da Caixa mais os dias parados nas PEPTs (as encerradas e a em curso, como se resolvesse hoje). */
export function prazoEfetivo(o: ComPrazo, hoje = new Date()): string {
  // a PEPT em aberto só empurra o prazo se foi aberta até 2 dias depois do recebimento
  const emCurso = o.pausadoEm && pausaValida(o) ? diasDePausa(o.tipologia, o.pausadoEm, hoje) : 0
  return format(addDays(parseISO(o.prazo), (o.diasPausado || 0) + emCurso), 'yyyy-MM-dd')
}

export type Farol = 'ok' | 'warn' | 'urgent' | 'late' | 'pausa' | 'none'

/** Prazo que vale agora (o prazo efetivo, já com as pausas). */
export function prazoAtual(o: ComPrazo, hoje = new Date()): string {
  return prazoEfetivo(o, hoje)
}

export function diasParaPrazo(os: OS, hoje = new Date()): number | null {
  if (!STATUS_ABERTOS.includes(os.status)) return null
  return differenceInCalendarDays(parseISO(prazoAtual(os, hoje)), hoje)
}

/** Farol do prazo. Vermelho só para vencida ou vencendo hoje/amanhã. */
export function farolDe(os: OS, hoje = new Date()): { farol: Farol; texto: string; selo: string; dias: number | null } {
  if (os.pausadoEm && STATUS_ABERTOS.includes(os.status)) return { farol: 'pausa', texto: 'Pausada', selo: 'Pausada', dias: null }
  const dias = diasParaPrazo(os, hoje)
  if (dias === null) return { farol: 'none', texto: os.status === 'concluida' ? 'Concluída' : '—', selo: STATUS_META[os.status].label, dias }
  if (dias < 0) return { farol: 'late', texto: dias === -1 ? 'Venceu ontem' : `Venceu há ${-dias} dias`, selo: 'Vencida', dias }
  if (dias === 0) return { farol: 'urgent', texto: 'Vence hoje', selo: 'Vence hoje', dias }
  if (dias === 1) return { farol: 'urgent', texto: '1 dia restante', selo: 'Vence amanhã', dias }
  if (dias <= 3) return { farol: 'warn', texto: `${dias} dias restantes`, selo: 'Atenção', dias }
  return { farol: 'ok', texto: `${dias} dias restantes`, selo: 'No prazo', dias }
}

export function refCurta(ref: string) {
  // 7886.1831.001122004/2026.01.01 → 1122004
  const m = ref.match(/\.(\d{8,9})\//)
  return m ? String(Number(m[1])) : ref
}

export const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function dataCurta(iso: string) {
  return format(parseISO(iso), 'dd/MM', { locale: ptBR })
}
export function dataLonga(iso: string) {
  return format(parseISO(iso), "EEEE, d 'de' MMMM", { locale: ptBR })
}
export function dataMedia(iso: string) {
  return format(parseISO(iso), 'dd/MM/yyyy', { locale: ptBR })
}
export function dataHora(iso: string) {
  return format(parseISO(iso), 'dd/MM HH:mm', { locale: ptBR })
}

export function enderecoLinha(os: OS) {
  const e = os.endereco
  return `${e.logradouro}, ${e.numero} · ${e.bairro} · ${e.cidade}/${e.uf}`
}

/** Endereço no formato do sistema real: "RUA, 0 - BAIRRO - CIDADE/UF - CEP". */
export function enderecoCompleto(os: OS) {
  const e = os.endereco
  return `${e.logradouro}, ${e.numero} - ${e.bairro} - ${e.cidade}/${e.uf}${e.cep ? ' - ' + e.cep : ''}`
}

export function enderecoMaps(os: OS) {
  const e = os.endereco
  return `${e.logradouro} ${e.numero === 'SN' || e.numero === '0' ? '' : e.numero}, ${e.bairro}, ${e.cidade} - ${e.uf}, ${e.cep}`.replace(/\s+/g, ' ')
}

export const temCoordenada = (o: OS) => typeof o.endereco.lat === 'number' && typeof o.endereco.lng === 'number'

export function docsFaltando(os: OS): DocKey[] {
  return (Object.keys(DOC_META) as DocKey[]).filter((k) => !os.docs[k])
}

export function telefoneWhats(tel: string) {
  return '55' + tel.replace(/\D/g, '')
}

export const IMPORTACAO_VAZIA: Importacao = { codProduto: '', codLinha: '', codFonte: '', cartorio: '', livro: '', localRetirada: '', solicitante: '', executante: '' }

/** Monta uma O.S. completa a partir dos dados mínimos. */
export function montarOS(input: NovaOSInput, id: string, numero: number, evento: string): OS {
  const docs = Object.fromEntries((Object.keys(DOC_META) as DocKey[]).map((k) => [k, false])) as Record<DocKey, boolean>
  return {
    origem: 'manual',
    mesReferencia: input.emissao.slice(0, 7),
    propriedade: input.endereco.cidade ? `${normCidade(input.endereco.cidade)}/${input.endereco.uf ?? 'RO'}` : '',
    descricao: '',
    observacoes: '',
    documento: '',
    clienteTelefone: '',
    clienteEmail: '',
    whatsapp: '',
    contatoEmail: '',
    matricula: '',
    importacao: IMPORTACAO_VAZIA,
    ...input,
    id,
    numero,
    status: input.status ?? 'recebida',
    diasPausado: 0,
    contatos: [],
    faturada: false,
    fichaFornecida: false,
    docs,
    fotos: 0,
    historico: [{ data: new Date().toISOString(), texto: evento }],
    conferida: false,
    rrt: false,
  }
}

/** Converte uma O.S. salva no formato antigo do laboratório para o formato atual. Mantém o que já está certo. */
export function migrarOS(bruta: Record<string, unknown>): OS {
  const o = bruta as Partial<OS> & Record<string, unknown>
  const status = (STATUS_META[o.status as Status] ? o.status : STATUS_ANTIGO[String(o.status)] ?? 'recebida') as Status
  const tipologia = (TIPOLOGIAS[o.tipologia as Tipologia] ? o.tipologia : TIPOLOGIA_ANTIGA[String(o.tipologia)] ?? 'A413') as Tipologia
  const end = (o.endereco ?? {}) as OS['endereco']
  const emissao = (o.emissao as string) ?? format(new Date(), 'yyyy-MM-dd')
  return {
    ...montarOS(
      { referencia: String(o.referencia ?? ''), tipologia, responsavel: (o.responsavel as Responsavel) ?? 'luan', proponente: String(o.proponente ?? ''), contato: String(o.contato ?? ''), telefone: String(o.telefone ?? ''), endereco: end, valorServico: Number(o.valorServico) || 0, valorDeslocamento: Number(o.valorDeslocamento) || 0, emissao, prazo: (o.prazo as string) ?? emissao },
      String(o.id),
      Number(o.numero) || 0,
      'Convertida do formato antigo',
    ),
    ...(o as Partial<OS>),
    status,
    tipologia,
    entregaEm: (o.entregaEm as string) ?? (o.enviadoEm as string | undefined),
    diasPausado: Number(o.diasPausado) || 0,
    contatos: Array.isArray(o.contatos) ? (o.contatos as OS['contatos']) : [],
    faturada: Boolean(o.faturada ?? o.conferida),
    fichaFornecida: Boolean(o.fichaFornecida),
    importacao: { ...IMPORTACAO_VAZIA, ...((o.importacao as Importacao) ?? {}) },
    historico: Array.isArray(o.historico) ? (o.historico as OS['historico']) : [],
    docs: (o.docs as OS['docs']) ?? montarOS({ referencia: '', tipologia, responsavel: 'luan', proponente: '', contato: '', telefone: '', endereco: end, valorServico: 0, valorDeslocamento: 0, emissao, prazo: emissao }, '', 0, '').docs,
  }
}

/** Primeira letra maiúscula, sem mexer no resto (datas em pt-BR vêm em minúsculas). */
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/**
 * Pede confirmação ao trocar de etapa quando o passo merece registro: voltar etapa, pular etapas,
 * ou cancelar. Avançar uma etapa por vez segue direto.
 */
export function precisaConfirmar(de: Status, para: Status): boolean {
  if (de === para) return false
  if (para === 'cancelada') return true
  const a = STATUS_META[de].ordem, b = STATUS_META[para].ordem
  return b < a || b - a > 1
}

// ---------------------------------------------------------------- linha do tempo e contatos
export type TipoEvento = 'devolucao' | 'etapa' | 'contato' | 'pausa' | 'vistoria' | 'outro'

/** Classifica um evento do histórico para dar a cor do ponto na linha do tempo. */
export function tipoEvento(texto: string): TipoEvento {
  const t = texto.toLowerCase()
  if (t.startsWith('caixa devolveu')) return 'devolucao'
  if (t.startsWith('contato:')) return 'contato'
  if (t.startsWith('pausa')) return 'pausa'
  if (t.startsWith('vistoria')) return 'vistoria'
  if (t.startsWith('etapa') || t.startsWith('resposta à exigência') || t.includes('conclu') || t.includes('assinad') || t.includes('laudo pronto')) return 'etapa'
  return 'outro'
}

/**
 * Resumo das tentativas de contato: quantas seguidas ficaram sem resposta desde a última conversa
 * e há quanto tempo foi a última. Serve para saber quando insistir ou pedir pausa.
 */
export function resumoContatos(o: Pick<OS, 'contatos'>, hoje = new Date()): { total: number; semResposta: number; texto: string } {
  const lista = o.contatos ?? []
  if (!lista.length) return { total: 0, semResposta: 0, texto: 'Nenhuma tentativa registrada' }
  let semResposta = 0
  for (let i = lista.length - 1; i >= 0 && !lista[i].respondeu; i--) semResposta++
  const dias = differenceInCalendarDays(hoje, parseISO(lista[lista.length - 1].data))
  const quando = dias <= 0 ? 'hoje' : dias === 1 ? 'ontem' : `há ${dias} dias`
  const texto = semResposta
    ? `${semResposta} ${semResposta === 1 ? 'tentativa' : 'tentativas'} sem resposta · última ${quando}`
    : `Última conversa ${quando}`
  return { total: lista.length, semResposta, texto }
}

/** Membros ativos da equipe (Configurações → Equipe). */
export const membrosAtivos = (c: Pick<Config, 'responsaveis'>) => (Object.keys(c.responsaveis) as Responsavel[]).filter((r) => c.responsaveis[r].ativo !== false)
/** O seletor Minhas · Marco · Todas só faz sentido quando a empresa tem mais de um técnico ativo. */
export const temEquipe = (c: Pick<Config, 'responsaveis'>) => membrosAtivos(c).length > 1
