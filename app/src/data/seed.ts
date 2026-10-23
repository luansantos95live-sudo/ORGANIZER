import { addDays, format, subDays, subMonths } from 'date-fns'
import type { Config, DocKey, OS, Origem, Responsavel, Rota, Status, Tipologia } from '../types'
import { IMPORTACAO_VAZIA, POLOS, TIPOLOGIAS_COM_FICHA, TIPOLOGIAS_SEM_VISTORIA, centroDaCidade, prazoDaTipologia } from '../lib/os'
import { KANBAN_PADRAO } from '../lib/kanban'

// Dados fictícios no formato do sistema real (docs/05-SISTEMA-REAL.md). Gerador determinístico: abre sempre igual.
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

/** Agência da Caixa que aparece no Nº da O.S. e em "Solicitante". */
const AGENCIA: Record<string, string> = { ARIQUEMES: '1831', 'MONTE NEGRO': '1831', CACAULANDIA: '1831', 'JI-PARANA': '1823', 'OURO PRETO DO OESTE': '1823', JARU: '2976', CACOAL: '2783', 'ROLIM DE MOURA': '3564', 'PIMENTA BUENO': '2783' }

const BAIRROS: Record<string, string[]> = {
  ARIQUEMES: ['SETOR INSTITUCIONAL', 'SETOR 01', 'SETOR 02', 'JARDIM JORGE TEIXEIRA', 'BNH', 'MARECHAL RONDON', 'JARDIM PARANA', 'AREAS DE CHACARA', 'JARDIM RIO DE JANEIRO'],
  'MONTE NEGRO': ['CENTRO', 'SETOR 02'],
  CACAULANDIA: ['CENTRO'],
  'JI-PARANA': ['CENTRO', 'NOVA BRASILIA', 'JARDIM DOS MIGRANTES', 'URUPA', 'DOIS DE ABRIL', 'TRIANON', 'CAPELASSO', 'CASA PRETA'],
  'OURO PRETO DO OESTE': ['JARDIM TROPICAL', 'INCRA', 'CENTRO'],
  JARU: ['SETOR 02', 'JARDIM DOS ESTADOS (EXPANSAO)', 'SETOR 05'],
  CACOAL: ['CENTRO', 'VISTA ALEGRE', 'JARDIM CLODOALDO', 'NOVO CACOAL', 'TEIXEIRAO'],
  'ROLIM DE MOURA': ['CENTRO', 'BEIRA RIO', 'CIDADE ALTA'],
  'PIMENTA BUENO': ['CENTRO', 'PIONEIROS'],
}

const RUAS = ['TANCREDO NEVES', '13 DE MAIO', 'RIO AMAZONAS', 'AV. BRASIL', 'MANOEL FRANCO', 'CURITIBA', 'TRANSCONTINENTAL', 'PADRE ADOLFO', 'JAMARI', 'ALAGOAS', 'GOIANIA', 'MARECHAL RONDON', 'PIAUI', 'RIO BRANCO', 'PRESIDENTE VARGAS', 'CEREJEIRAS', 'BAHIA', 'MACHADINHO', 'CEARA', 'DOM PEDRO I', 'PASSARO PRETO', 'LARANJEIRAS', 'LIRIO']

const NOMES = ['ANA PAULA RIBEIRO', 'CARLOS EDUARDO LIMA', 'MARIA DAS GRACAS SOUZA', 'JOAO BATISTA FERREIRA', 'FERNANDA ALVES COSTA', 'RAFAEL NASCIMENTO', 'LUCIANA PEREIRA ROCHA', 'MARCOS VINICIUS SILVA', 'PATRICIA GOMES ANDRADE', 'RODRIGO MARTINS DIAS', 'JULIANA CARVALHO', 'ANDERSON OLIVEIRA', 'CRISTIANE BARBOSA', 'EVERTON SANTOS', 'DEBORA CARDOSO', 'WESLEY MOURA', 'SIMONE TEIXEIRA', 'GUSTAVO HENRIQUE RAMOS', 'TATIANE FREITAS', 'LEANDRO AZEVEDO', 'VANESSA LOPES', 'PAULO ROBERTO NUNES', 'CAMILA DUARTE', 'DIEGO FERNANDES', 'ELAINE CRISTINA MENDES', 'FABIO CORREIA', 'GABRIELA MONTEIRO', 'HUGO LEONARDO PIRES', 'ISABELA REZENDE', 'JONAS VIEIRA']

/** Peso de cada tipologia e faixa de valor do serviço (R$). */
const TIPOS: Array<[Tipologia, number, [number, number]]> = [
  ['A413', 30, [430, 520]], ['B438', 20, [914, 914]], ['B437', 14, [880, 960]], ['E401', 8, [210, 260]], ['E004', 6, [230, 280]],
  ['E005', 5, [230, 280]], ['G012', 4, [300, 340]], ['G416', 6, [180, 210]], ['G014', 3, [190, 220]], ['G402', 4, [150, 170]],
]

const DESCRICOES = ['MCMV - AQUISIÇÃO DE TERRENO E CONSTRUÇÃO', 'MCMV - CONSTRUÇÃO EM TERRENO PRÓPRIO', 'AQUISIÇÃO DE IMÓVEL RESIDENCIAL USADO', 'REFORMA E AMPLIAÇÃO', 'CONSTRUÇÃO INDIVIDUAL - ACOMPANHAMENTO DE OBRA', 'GARANTIA DE IMÓVEL - HOME EQUITY']

const DOC_KEYS: DocKey[] = ['matricula', 'escritura', 'planta', 'siopi', 'pci', 'laudo', 'pls', 'rrt', 'projetos', 'alvara', 'declaracao']

export const CONFIG_PADRAO: Config = {
  tema: 'escuro',
  kanban: KANBAN_PADRAO,
  menuRecolhido: true,
  // Vazios ou genéricos de propósito: o repositório é público. Preencha em Configurações.
  responsaveis: {
    luan: { nome: 'Luan', curto: 'Luan', registro: '', email: '', papel: 'Proprietário', ativo: true },
    rt: { nome: 'Marco (RT)', curto: 'Marco', registro: '', email: '', papel: 'Membro', ativo: true },
  },
  repasseRT: 0.4,
  repasseBase: 'total',
  metaMensal: 12000,
  prazoPadraoDias: 15,
  duracaoVistoria: 40,
  base: { endereco: 'Centro, Ariquemes/RO', lat: -9.9133, lng: -63.0408 },
  velocidadeMedia: 30,
  mensagemWhatsApp: 'Olá, {contato}! Sou o avaliador da Caixa. A vistoria do imóvel em {endereco} está prevista para {data} por volta de {hora}. Posso confirmar?',
  polosAtendidos: ['ARIQUEMES', 'CACOAL', 'JI-PARANA'],
  contrato: { numero: '', edital: '', processo: '', rrt: '' },
  empresa: { fantasia: '', razao: '', cnpj: '', telefone: '', responsavel: '', municipio: '' },
}

const d = (x: Date) => format(x, 'yyyy-MM-dd')

export function gerarSeed(hoje = new Date()): { os: OS[]; rotas: Rota[] } {
  const r = rng(20261009)
  const pick = <T,>(arr: T[]) => arr[Math.floor(r() * arr.length)]
  const entre = (a: number, b: number) => Math.round(a + r() * (b - a))
  const tipologiaSorteada = (): [Tipologia, [number, number]] => {
    const total = TIPOS.reduce((s, t) => s + t[1], 0)
    let x = r() * total
    for (const [t, peso, faixa] of TIPOS) { if ((x -= peso) <= 0) return [t, faixa] }
    return ['A413', [430, 520]]
  }
  const os: OS[] = []
  let n = 0
  let seq = 1076000

  function nova(responsavel: Responsavel, status: Status, datas: { emissao: Date; vistoria?: { data: Date; hora: string }; concluida?: Date; entrega?: Date }, extra: Partial<OS> = {}): OS {
    n++
    seq += 1 + Math.floor(r() * 9000)
    // Luan atende mais o polo de Ariquemes; o RT, Ji-Paraná e Cacoal.
    const polo = responsavel === 'luan' ? (r() < 0.75 ? 'ARIQUEMES' : pick(['JI-PARANA', 'CACOAL'])) : (r() < 0.55 ? 'JI-PARANA' : pick(['CACOAL', 'ARIQUEMES']))
    const cidade = r() < 0.7 ? POLOS[polo][0] : pick(POLOS[polo])
    const bairro = pick(BAIRROS[cidade])
    const [tipologia, faixa] = tipologiaSorteada()
    const centro = centroDaCidade(cidade)
    const semCoord = n === 4 || n === 17 // duas O.S. sem localização, como no aviso do roteirizador
    const lat = semCoord ? undefined : +(centro.lat + (r() - 0.5) * 0.045).toFixed(5)
    const lng = semCoord ? undefined : +(centro.lng + (r() - 0.5) * 0.045).toFixed(5)
    const desloc = cidade === POLOS[polo][0] ? entre(15, 20) : entre(120, 380)
    const nome = pick(NOMES)
    const contatoProprio = r() < 0.6
    const agencia = AGENCIA[cidade] ?? '1831'
    const emissao = datas.emissao
    // prazo pela tipologia, contando a partir do dia seguinte ao recebimento (A413/E401: 6 dias; B437/B438: 15)
    const origem: Origem = r() < 0.6 ? 'email' : pick<Origem>(['texto', 'arquivo', 'manual'])
    const hist: OS['historico'] = [{ data: emissao.toISOString(), texto: origem === 'email' ? 'Importada automaticamente do e-mail da Caixa' : 'O.S. recebida' }]
    if (datas.vistoria) hist.push({ data: emissao.toISOString(), texto: `Vistoria marcada para ${format(datas.vistoria.data, 'dd/MM')} às ${datas.vistoria.hora}` })
    if (['assinatura_pendente', 'assinatura_concluida', 'concluida'].includes(status)) hist.push({ data: addDays(emissao, 6).toISOString(), texto: 'Laudo pronto, enviado para assinatura do RT' })
    if (['assinatura_concluida', 'concluida'].includes(status)) hist.push({ data: addDays(emissao, 7).toISOString(), texto: 'Laudo assinado pelo RT' })
    if (status === 'concluida' && datas.concluida) hist.push({ data: datas.concluida.toISOString(), texto: 'O.S. concluída' })
    const ok = status === 'concluida' || status === 'assinatura_concluida'
    const o: OS = {
      id: `os-${n}`,
      numero: n,
      referencia: `7886.${agencia}.${String(seq).padStart(9, '0')}/${emissao.getFullYear()}.01.01`,
      tipologia,
      status,
      responsavel,
      origem,
      mesReferencia: format(emissao, 'yyyy-MM'),
      propriedade: `${cidade}/RO`,
      descricao: pick(DESCRICOES),
      observacoes: r() < 0.25 ? pick(['Cliente só pode à tarde.', 'Portão azul, fundos.', 'Ligar antes: cachorro solto.', 'Obra em fase de acabamento.', 'Chave com o corretor.']) : '',
      proponente: nome,
      documento: `${entre(100, 999)}.${entre(100, 999)}.${entre(100, 999)}-${entre(10, 99)}`,
      clienteTelefone: r() < 0.4 ? `699${entre(8000, 9999)}${entre(1000, 9999)}` : '',
      clienteEmail: '',
      contato: contatoProprio ? nome : pick(NOMES),
      telefone: `699${entre(8000, 9999)}${entre(1000, 9999)}`,
      whatsapp: '',
      contatoEmail: '',
      contatos: [],
      endereco: { logradouro: pick(RUAS), numero: r() < 0.5 ? '0' : String(entre(10, 3800)), bairro, cidade, uf: 'RO', cep: `${cidade === 'ARIQUEMES' ? '7687' : cidade === 'CACOAL' ? '7696' : '7690'}${entre(0, 9)}-${String(entre(0, 999)).padStart(3, '0')}`, lat, lng },
      matricula: String(entre(4000, 34000)),
      emissao: d(emissao),
      prazo: prazoDaTipologia(tipologia, d(emissao)),
      entregaEm: datas.entrega ? d(datas.entrega) : undefined,
      vistoria: TIPOLOGIAS_SEM_VISTORIA.includes(tipologia) ? undefined : datas.vistoria ? { data: d(datas.vistoria.data), hora: datas.vistoria.hora, duracao: 40 } : undefined,
      concluidaEm: datas.concluida ? d(datas.concluida) : undefined,
      diasPausado: 0,
      valorServico: entre(faixa[0], faixa[1]),
      valorDeslocamento: desloc,
      importacao: { ...IMPORTACAO_VAZIA, codProduto: pick(['0173', '0172', '0210']), codLinha: pick(['0067', '0061']), codFonte: '0030', cartorio: pick(['01', '02']), livro: String(entre(1000, 19999)), localRetirada: `${agencia} - ${cidade}, RO`, solicitante: `${agencia} - ${cidade}, RO`, executante: 'EMPRESA EXECUTANTE EXEMPLO LTDA' },
      faturada: false,
      fichaFornecida: TIPOLOGIAS_COM_FICHA.includes(tipologia) && ok && r() < 0.5,
      docs: Object.fromEntries(DOC_KEYS.map((k) => [k, r() < (ok ? 0.97 : 0.65)])) as Record<DocKey, boolean>,
      fotos: datas.vistoria && datas.vistoria.data < hoje ? 8 + Math.floor(r() * 16) : 0,
      historico: hist,
      conferida: false,
      rrt: false,
      ...extra,
    }
    os.push(o)
    return o
  }

  const resp = (): Responsavel => (r() < 0.55 ? 'luan' : 'rt')
  const horas = ['08:00', '08:45', '09:30', '10:15', '11:00', '13:30', '14:15', '15:00', '16:00']

  // Recebidas: chegaram nos últimos dias e ainda não têm vistoria marcada.
  for (let i = 0; i < 14; i++) nova(resp(), 'recebida', { emissao: subDays(hoje, 1 + Math.floor(r() * 9)) })
  // Em andamento: vistoria marcada (sempre do dia seguinte em diante) ou já feita, laudo por terminar.
  for (let i = 0; i < 11; i++) {
    const emissao = subDays(hoje, 3 + Math.floor(r() * 9))
    const quando = i < 6 ? addDays(hoje, 1 + (i % 4)) : subDays(hoje, 1 + Math.floor(r() * 3))
    nova(i < 6 ? (i % 2 ? 'rt' : 'luan') : resp(), 'em_andamento', { emissao, vistoria: { data: quando, hora: pick(horas) } })
  }
  // Laudo pronto esperando assinatura; assinado esperando entrega.
  for (let i = 0; i < 4; i++) { const e = subDays(hoje, 7 + Math.floor(r() * 6)); nova(resp(), 'assinatura_pendente', { emissao: e, vistoria: { data: addDays(e, 3), hora: '09:00' } }) }
  for (let i = 0; i < 2; i++) { const e = subDays(hoje, 8 + Math.floor(r() * 5)); nova(resp(), 'assinatura_concluida', { emissao: e, vistoria: { data: addDays(e, 3), hora: '10:00' } }) }
  // Concluídas no mês: as mais antigas já com nota; algumas paradas há mais de 5 dias sem nota.
  for (let i = 0; i < 12; i++) {
    const dia = Math.max(1, Math.min(hoje.getDate(), 1 + Math.floor(r() * hoje.getDate())))
    const concluida = new Date(hoje.getFullYear(), hoje.getMonth(), dia, 12)
    const e = subDays(concluida, 9 + Math.floor(r() * 4))
    const o = nova(resp(), 'concluida', { emissao: e, vistoria: { data: addDays(e, 3), hora: '09:00' }, concluida, entrega: concluida })
    if (i % 4 === 0) { o.faturada = true; o.faturadaEm = d(addDays(concluida, 2)); o.conferida = true }
  }
  nova(resp(), 'cancelada', { emissao: subDays(hoje, 6) })



  // Uma O.S. pausada agora e outra que já ficou 4 dias pausada (o prazo efetivo anda junto).
  const abertas = os.filter((o) => o.status === 'recebida' || o.status === 'em_andamento')
  // Cada PEPT fica registrada (tipo, pendência, início e fim) e aparece na aba PEPT da O.S.
  // A PEPT só pausa o prazo se aberta até 2 dias depois do recebimento: nos exemplos, abre 1 dia depois.
  const umDiaDepois = (o: OS) => { const x = addDays(new Date(`${o.emissao}T12:00:00`), 1); return x > hoje ? hoje : x }
  if (abertas[2]) {
    const ini = umDiaDepois(abertas[2])
    abertas[2].pausadoEm = d(ini)
    abertas[2].pepts = [{ id: 'pept-s1', tipo: 'documental', motivo: 'Falta documento do cliente', inicio: d(ini) }]
    abertas[2].historico.push({ data: ini.toISOString(), texto: 'Pausa (PEPT documental): Falta documento do cliente' })
  }
  if (abertas[5]) {
    abertas[5].diasPausado = 4
    abertas[5].pepts = [{ id: 'pept-s2', tipo: 'vistoria', motivo: 'Contato não atende', inicio: d(subDays(hoje, 9)), fim: d(subDays(hoje, 4)), dias: 4, resolvidaPor: 'manual' }]
  }
  // Checklist: parte das recebidas já com documentos baixados e analisados; em andamento com avaliação/SIMIL feitos.
  os.filter((x) => x.status === 'recebida').forEach((o, i) => {
    if (i % 3 !== 0) o.passos = { baixar_docs: d(subDays(hoje, 1)), ...(i % 3 === 2 ? { analisar_docs: d(hoje) } : {}) }
  })
  os.filter((x) => x.status === 'em_andamento' && x.vistoria && x.vistoria.data < d(hoje)).forEach((o, i) => {
    o.passos = { baixar_docs: o.emissao, analisar_docs: o.emissao, ...(i % 2 ? { avaliacao: d(subDays(hoje, 1)) } : {}) }
  })
  // Mais duas em PEPT, com pendências diferentes.
  for (const [i, tipo, motivo] of [[7, 'vistoria', 'Sem acesso ao imóvel: aguardando chave com o proprietário'], [9, 'documental', 'Matrícula desatualizada: aguardando certidão']] as const) {
    const o = abertas[i]
    if (o && !o.pausadoEm) {
      const ini = umDiaDepois(o)
      o.pausadoEm = d(ini)
      o.pepts = [...(o.pepts ?? []), { id: `pept-s${i}`, tipo, motivo, inicio: d(ini) }]
      o.historico.push({ data: ini.toISOString(), texto: `Pausa (PEPT ${tipo === 'vistoria' ? 'de vistoria' : 'documental'}): ${motivo}` })
    }
  }
  // Uma O.S. recebida já vencida, para testar o farol.
  const r0 = os.find((o) => o.status === 'recebida' && !o.pausadoEm)
  if (r0) { r0.emissao = d(subDays(hoje, 17)); r0.prazo = d(subDays(hoje, 2)) }

  // Histórico: O.S. concluídas e faturadas nos 5 meses anteriores, para o Financeiro ter série.
  for (let m = 1; m <= 5; m++) {
    const qtd = 10 + Math.floor(r() * 8)
    for (let i = 0; i < qtd; i++) {
      const base = subMonths(hoje, m)
      const concluida = new Date(base.getFullYear(), base.getMonth(), 1 + Math.floor(r() * 27), 12)
      const e = subDays(concluida, 9 + Math.floor(r() * 4))
      const o = nova(r() < 0.55 ? 'luan' : 'rt', 'concluida', { emissao: e, vistoria: { data: addDays(e, 3), hora: '09:00' }, concluida, entrega: concluida })
      o.faturada = true
      o.faturadaEm = d(addDays(concluida, 3))
      o.conferida = true
      o.rrt = true
      if (TIPOLOGIAS_COM_FICHA.includes(o.tipologia)) o.fichaFornecida = true
    }
  }

  // Rotas: um rascunho do Luan com as recebidas dele, uma confirmada do RT para amanhã e uma concluída.
  const doLuan = os.filter((o) => o.responsavel === 'luan' && o.status === 'recebida' && !TIPOLOGIAS_SEM_VISTORIA.includes(o.tipologia)).slice(0, 2)
  const doRT = os.filter((o) => o.responsavel === 'rt' && o.status === 'em_andamento' && o.vistoria && o.vistoria.data > d(hoje)).slice(0, 3)
  const partida = { ...CONFIG_PADRAO.base }
  const rotas: Rota[] = [
    { id: 'rota-1', codigo: 'ROTA-27E9', responsavel: 'luan', status: 'rascunho', data: d(addDays(hoje, 1)), hora: '08:00', partida, velocidadeMedia: 30, descricao: 'Vistorias da semana', paradas: doLuan.map((o) => ({ osId: o.id })) },
    { id: 'rota-2', codigo: 'ROTA-4B1C', responsavel: 'rt', status: 'confirmada', data: d(addDays(hoje, 1)), hora: '07:30', partida: { endereco: 'Centro, Ji-Paraná/RO', lat: -10.8777, lng: -61.9322 }, velocidadeMedia: 30, descricao: 'Ji-Paraná e região', paradas: doRT.map((o) => ({ osId: o.id, hora: o.vistoria?.hora })) },
    { id: 'rota-3', codigo: 'ROTA-9D03', responsavel: 'luan', status: 'concluida', data: d(subDays(hoje, 6)), hora: '08:00', partida, velocidadeMedia: 30, descricao: 'Ariquemes', paradas: os.filter((o) => o.responsavel === 'luan' && o.status === 'assinatura_pendente').slice(0, 2).map((o) => ({ osId: o.id })) },
  ]
  return { os, rotas }
}
