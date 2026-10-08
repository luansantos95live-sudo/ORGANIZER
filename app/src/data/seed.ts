import { addDays, format, subDays } from 'date-fns'
import type { Config, DocKey, OS, Responsavel, Rota, Status, TipoServico, Tipologia } from '../types'

// Gerador determinístico para que o laboratório abra sempre igual.
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

const CIDADES: Record<string, { cep: string; bairros: string[] }> = {
  'Ji-Paraná': { cep: '76900', bairros: ['Centro', 'Nova Brasília', 'Jardim dos Migrantes', 'Urupá', 'Dois de Abril', 'Riachuelo', 'Jardim Presidencial', 'Casa Preta', 'Cafezinho', 'Orleans'] },
  'Ariquemes': { cep: '76870', bairros: ['Setor 01', 'Setor 02', 'Jardim Jorge Teixeira', 'BNH', 'Marechal Rondon', 'Setor Institucional', 'Jardim Paraná'] },
  'Cacoal': { cep: '76960', bairros: ['Centro', 'Vista Alegre', 'Jardim Clodoaldo', 'Novo Cacoal', 'Teixeirão'] },
  'Rolim de Moura': { cep: '76940', bairros: ['Centro', 'Beira Rio', 'Boa Esperança', 'Jardim Tropical', 'Cidade Alta'] },
  'Ouro Preto do Oeste': { cep: '76920', bairros: ['Jardim Tropical', 'Incra', 'Centro'] },
  'Jaru': { cep: '76890', bairros: ['Setor 02', 'Jardim Novo Horizonte', 'Setor 05'] },
}

const LOGRADOUROS = ['Rua Rio Amazonas', 'Av. Brasil', 'Rua Manoel Franco', 'Rua Curitiba', 'Av. Transcontinental', 'Rua Tancredo Neves', 'Rua Padre Adolfo', 'Rua Jamari', 'Rua Alagoas', 'Rua Goiânia', 'Av. Marechal Rondon', 'Rua Piauí', 'Rua Rio Branco', 'Rua Presidente Vargas', 'Rua Cerejeiras', 'Rua Bahia', 'Av. Jamari', 'Rua Machadinho', 'Rua Ceará', 'Rua Dom Pedro I']

const NOMES = ['Ana Paula Ribeiro', 'Carlos Eduardo Lima', 'Maria das Graças Souza', 'João Batista Ferreira', 'Fernanda Alves Costa', 'Rafael Nascimento', 'Luciana Pereira Rocha', 'Marcos Vinícius Silva', 'Patrícia Gomes Andrade', 'Rodrigo Martins Dias', 'Juliana Carvalho', 'Anderson Oliveira', 'Cristiane Barbosa', 'Everton Santos', 'Débora Cardoso', 'Wesley Moura', 'Simone Teixeira', 'Gustavo Henrique Ramos', 'Tatiane Freitas', 'Leandro Azevedo', 'Vanessa Lopes', 'Paulo Roberto Nunes', 'Camila Duarte', 'Diego Fernandes', 'Elaine Cristina Mendes', 'Fábio Correia', 'Gabriela Monteiro', 'Hugo Leonardo Pires', 'Isabela Rezende', 'Jonas Vieira']

const TIPOS: TipoServico[] = ['AVALIACAO', 'AVALIACAO', 'AVALIACAO', 'VISTORIA_RAE', 'VISTORIA_RAE', 'PCI_PLS', 'REAVALIACAO']

/** Tipologia (código da Caixa) mais provável para cada tipo de serviço. */
const TIPOLOGIA_POR_TIPO: Record<TipoServico, Tipologia[]> = {
  AVALIACAO: ['A413', 'A413', 'M112'],
  VISTORIA_RAE: ['E004', 'E004', 'C021'],
  PCI_PLS: ['C021'],
  REAVALIACAO: ['R017'],
}

const DOC_KEYS: DocKey[] = ['matricula', 'escritura', 'planta', 'siopi', 'pci', 'laudo', 'pls', 'rrt', 'projetos', 'alvara', 'declaracao']

export const CONFIG_PADRAO: Config = {
  tema: 'claro',
  responsaveis: {
    luan: { nome: 'Luan dos Santos Felix', curto: 'Luan', registro: 'CAU A277949-8' },
    rt: { nome: 'Marco Aurélio (RT)', curto: 'Marco', registro: 'CREA-RO' },
  },
  duracaoPadrao: { AVALIACAO: 45, VISTORIA_RAE: 30, PCI_PLS: 30, REAVALIACAO: 40 },
  deslocamentoMesmoBairro: 10,
  deslocamentoOutroBairro: 20,
  deslocamentoOutraCidade: 60,
  partidaPadrao: '08:00',
  repasseRT: 0.4,
}

const d = (x: Date) => format(x, 'yyyy-MM-dd')

export function gerarSeed(hoje = new Date()): { os: OS[]; rotas: Rota[] } {
  const r = rng(20260925)
  const pick = <T,>(arr: T[]) => arr[Math.floor(r() * arr.length)]
  const cidades = Object.keys(CIDADES)
  const os: OS[] = []

  // distribuição de status realista para ~44 O.S. (mês atual + cauda do anterior)
  const plano: Array<[Status, number]> = [
    ['convocada', 3], ['emitida', 8], ['agendada', 7], ['vistoriada', 6],
    ['laudo_enviado', 5], ['diligencia', 2], ['finalizada', 9], ['conferida', 5], ['cancelada', 1],
  ]
  let n = 0
  const dias3 = [0, 1, 2]
  for (const [status, qtd] of plano) {
    for (let i = 0; i < qtd; i++) {
      n++
      // Luan fica com ~60%, RT com ~40%
      const responsavel: Responsavel = r() < 0.6 ? 'luan' : 'rt'
      const cidade = r() < 0.55 ? 'Ji-Paraná' : pick(cidades)
      const info = CIDADES[cidade]
      const bairro = pick(info.bairros)
      const tipo = pick(TIPOS)

      // datas por status
      let emissao: Date
      let prazo: Date
      let vistoria: OS['vistoria']
      let enviadoEm: string | undefined
      let concluidaEm: string | undefined
      switch (status) {
        case 'convocada': emissao = subDays(hoje, Math.floor(r() * 2)); prazo = addDays(emissao, 12); break
        case 'emitida': emissao = subDays(hoje, 1 + Math.floor(r() * 6)); prazo = addDays(emissao, 12); break
        case 'agendada': {
          emissao = subDays(hoje, 2 + Math.floor(r() * 5)); prazo = addDays(emissao, 12)
          const off = pick([...dias3, 0, 0, 1, 3, 4])
          vistoria = { data: d(addDays(hoje, off)), hora: pick(['08:00', '08:45', '09:30', '10:15', '11:00', '13:30', '14:15', '15:00', '16:00']), duracao: CONFIG_PADRAO.duracaoPadrao[tipo] }
          break
        }
        case 'vistoriada': emissao = subDays(hoje, 5 + Math.floor(r() * 6)); prazo = addDays(emissao, 12); vistoria = { data: d(subDays(hoje, 1 + Math.floor(r() * 3))), hora: '09:00', duracao: 45 }; break
        case 'laudo_enviado': emissao = subDays(hoje, 8 + Math.floor(r() * 6)); prazo = addDays(emissao, 12); vistoria = { data: d(subDays(hoje, 4)), hora: '10:00', duracao: 45 }; enviadoEm = d(subDays(hoje, 1 + Math.floor(r() * 3))); break
        case 'diligencia': emissao = subDays(hoje, 10 + Math.floor(r() * 5)); prazo = addDays(hoje, 1 + Math.floor(r() * 3)); vistoria = { data: d(subDays(hoje, 7)), hora: '14:00', duracao: 45 }; enviadoEm = d(subDays(hoje, 4)); break
        case 'finalizada': { const dia = Math.min(hoje.getDate(), 1 + Math.floor(r() * hoje.getDate())); const conclusao = new Date(hoje.getFullYear(), hoje.getMonth(), dia, 12); emissao = subDays(conclusao, 9); prazo = addDays(emissao, 12); vistoria = { data: d(addDays(emissao, 3)), hora: '09:00', duracao: 45 }; enviadoEm = d(subDays(conclusao, 3)); concluidaEm = d(conclusao); break }
        case 'conferida': emissao = subDays(hoje, 30 + Math.floor(r() * 20)); prazo = addDays(emissao, 12); vistoria = { data: d(addDays(emissao, 3)), hora: '09:00', duracao: 45 }; enviadoEm = d(addDays(emissao, 6)); concluidaEm = d(addDays(emissao, 9)); break
        default: emissao = subDays(hoje, 6); prazo = addDays(emissao, 12)
      }
      // uma O.S. emitida vencida de propósito, para testar o farol
      if (status === 'emitida' && i === 0) prazo = subDays(hoje, 1)
      if (status === 'vistoriada' && i === 0) prazo = hoje

      const docs = Object.fromEntries(DOC_KEYS.map((k) => [k, r() < (status === 'finalizada' || status === 'conferida' ? 0.98 : 0.7)])) as Record<DocKey, boolean>
      const vs = tipo === 'VISTORIA_RAE' ? 180 + Math.round(r() * 40) : tipo === 'PCI_PLS' ? 150 : 330 + Math.round(r() * 120)
      const vd = cidade === 'Ji-Paraná' ? 0 : 60 + Math.round(r() * 120)
      const seq = String(12000 + n * 7 + Math.floor(r() * 5)).padStart(8, '0')
      const referencia = `7886.1831.${seq}/${format(emissao, 'yyyy.MM.dd')}.01.01`
      const nome = pick(NOMES)
      const hist: OS['historico'] = [{ data: emissao.toISOString(), texto: 'Convocação recebida do SIOPI' }]
      if (status !== 'convocada') hist.push({ data: addDays(emissao, 0).toISOString(), texto: 'Aceite registrado' })
      if (vistoria) hist.push({ data: emissao.toISOString(), texto: `Vistoria agendada para ${vistoria.data.split('-').reverse().slice(0, 2).join('/')} às ${vistoria.hora}` })
      if (['vistoriada', 'laudo_enviado', 'diligencia', 'finalizada', 'conferida'].includes(status)) hist.push({ data: addDays(emissao, 3).toISOString(), texto: 'Vistoria realizada' })
      if (enviadoEm) hist.push({ data: enviadoEm + 'T17:00:00', texto: 'Laudo enviado no SIOPI' })
      if (status === 'diligencia') hist.push({ data: subDays(hoje, 1).toISOString(), texto: 'Caixa solicitou correção: divergência de área na matrícula' })
      if (status === 'finalizada' || status === 'conferida') hist.push({ data: addDays(emissao, 9).toISOString(), texto: 'Laudo aceito — O.S. finalizada' })
      if (status === 'conferida') hist.push({ data: subDays(hoje, 3).toISOString(), texto: 'Conferida no Relatório de Conferência das O.S.' })

      os.push({
        id: `os-${n}`,
        numero: n,
        referencia,
        tipo,
        status,
        responsavel,
        proponente: nome,
        contato: r() < 0.7 ? nome.split(' ')[0] : pick(NOMES).split(' ')[0] + ' (corretor)',
        telefone: `(69) 9${String(8000 + Math.floor(r() * 1999))}-${String(1000 + Math.floor(r() * 8999))}`,
        endereco: {
          logradouro: pick(LOGRADOUROS),
          numero: r() < 0.12 ? 'SN' : String(100 + Math.floor(r() * 3800)),
          bairro,
          cidade,
          uf: 'RO',
          cep: `${info.cep}-${String(Math.floor(r() * 900)).padStart(3, '0')}`,
        },
        matricula: String(4000 + Math.floor(r() * 30000)),
        valorServico: vs,
        valorDeslocamento: vd,
        emissao: d(emissao),
        prazo: d(prazo),
        vistoria,
        enviadoEm,
        concluidaEm,
        tipologia: pick(TIPOLOGIA_POR_TIPO[tipo]),
        docs,
        fotos: ['finalizada', 'conferida', 'laudo_enviado', 'vistoriada', 'diligencia'].includes(status) ? 6 + Math.floor(r() * 20) : 0,
        observacoes: r() < 0.3 ? pick(['Cliente só pode à tarde.', 'Portão azul, fundos.', 'Ligar antes — cachorro solto.', 'Obra em fase de acabamento.', 'Chave com o corretor.']) : '',
        historico: hist,
        conferida: status === 'conferida',
        rrt: status === 'conferida' && r() < 0.6,
      })
    }
  }


  // Histórico: O.S. já finalizadas e conferidas nos 5 meses anteriores, para o faturamento ter série.
  for (let m = 1; m <= 5; m++) {
    const qtd = 9 + Math.floor(r() * 8)
    const ref = subDays(hoje, 30 * m)
    for (let i = 0; i < qtd; i++) {
      n++
      const responsavel: Responsavel = r() < 0.58 ? 'luan' : 'rt'
      const cidade = r() < 0.55 ? 'Ji-Paraná' : pick(cidades)
      const info = CIDADES[cidade]
      const tipo = pick(TIPOS)
      const conclusao = addDays(ref, -Math.floor(r() * 26))
      const emissao = subDays(conclusao, 8 + Math.floor(r() * 5))
      const vs = tipo === 'VISTORIA_RAE' ? 180 + Math.round(r() * 40) : tipo === 'PCI_PLS' ? 150 : 330 + Math.round(r() * 120)
      const vd = cidade === 'Ji-Paraná' ? 0 : 60 + Math.round(r() * 120)
      const seq = String(11000 + n * 7).padStart(8, '0')
      const nome = pick(NOMES)
      os.push({
        id: `os-${n}`, numero: n, referencia: `7886.1831.${seq}/${format(emissao, 'yyyy.MM.dd')}.01.01`, tipo, status: 'conferida', responsavel,
        proponente: nome, contato: nome.split(' ')[0], telefone: `(69) 9${String(8000 + Math.floor(r() * 1999))}-${String(1000 + Math.floor(r() * 8999))}`,
        endereco: { logradouro: pick(LOGRADOUROS), numero: String(100 + Math.floor(r() * 3800)), bairro: pick(info.bairros), cidade, uf: 'RO', cep: `${info.cep}-${String(Math.floor(r() * 900)).padStart(3, '0')}` },
        matricula: String(4000 + Math.floor(r() * 30000)), valorServico: vs, valorDeslocamento: vd,
        emissao: d(emissao), prazo: d(addDays(emissao, 12)), vistoria: { data: d(addDays(emissao, 3)), hora: '09:00', duracao: 45 },
        enviadoEm: d(subDays(conclusao, 3)), concluidaEm: d(conclusao), tipologia: pick(TIPOLOGIA_POR_TIPO[tipo]),
        docs: Object.fromEntries(DOC_KEYS.map((k) => [k, true])) as Record<DocKey, boolean>, fotos: 8 + Math.floor(r() * 16), observacoes: '',
        historico: [
          { data: emissao.toISOString(), texto: 'Convocação recebida do SIOPI' },
          { data: subDays(conclusao, 3).toISOString(), texto: 'Laudo enviado no SIOPI' },
          { data: conclusao.toISOString(), texto: 'Laudo aceito — O.S. finalizada' },
        ],
        conferida: true, rrt: true,
      })
    }
  }

  // Rota de hoje pré-montada para o Luan com as agendadas de hoje
  const hojeStr = d(hoje)
  const rotas: Rota[] = []
  for (const resp of ['luan', 'rt'] as Responsavel[]) {
    const doDia = os.filter((o) => o.responsavel === resp && o.status === 'agendada' && o.vistoria?.data === hojeStr)
    if (doDia.length) {
      rotas.push({
        id: `${hojeStr}_${resp}`,
        data: hojeStr,
        responsavel: resp,
        partida: '08:00',
        paradas: doDia
          .sort((a, b) => a.vistoria!.hora.localeCompare(b.vistoria!.hora))
          .map((o) => ({ osId: o.id, inicio: o.vistoria!.hora, duracao: o.vistoria!.duracao, deslocamento: 20 })),
      })
    }
  }
  return { os, rotas }
}
