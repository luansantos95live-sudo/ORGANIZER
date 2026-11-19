import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { format } from 'date-fns'
import type { Config, Escopo, OS, Origem, PassoKey, Responsavel, Rota, Status, Pept, TipoContato, TipoPept } from '../types'
import { CONFIG_PADRAO, exemploParaAriquemes, gerarSeed } from '../data/seed'
import { emailInterage, desdeParaSincronizar, ehDaCaixa, emailPeptResolvida, refPeptResolvida, emailSimulado, emailsExemplo, lerArquivoCaixaDeEntrada, lerRespostaPonte, mesclarEmails, urlPonteGmail, type Email } from '../lib/emails'
import { separarDocumento, lerSiopiTxt } from '../lib/siopi'
import { poloDe, STATUS_META, corrigirPrazoAntigo, migrarOS, montarOS, type NovaOSInput } from '../lib/os'
import { ETAPA_DO_PASSO, PASSO_LABEL, voltarParaPasso } from '../lib/passos'
import { novoCodigoRota, vistoriaFeitaPelaRota, vistoriasDasRotasConcluidas } from '../lib/rota'
import { completarColunas } from '../lib/kanban'
import { ORIGEM_RESOLUCAO, TIPO_PEPT, abrirPept, editarDatasPeptNaOS, editarPeptNaOS, encerrarPeptNaOS, etapaAoFinalizarPept, peptAberta, podeConcluir, reabrirPeptNaOS, resolverPeptNaOS } from '../lib/pept'

export interface Fechamento { extratoTotal?: number; extratoQtd?: number; dataRelatorio?: string; valorNF?: number }

const hojeISO = () => format(new Date(), 'yyyy-MM-dd')
/** yyyy-mm-dd → dd/mm (para a linha do tempo) */
const br = (d?: string) => (d ? d.split('-').reverse().slice(0, 2).join('/') : '')

interface State {
  os: OS[]
  rotas: Rota[]
  config: Config
  escopo: Escopo
  fechamentos: Record<string, Fechamento>
  notificacoesLidas: string[]
  emails: Email[] // caixa de entrada (só @caixa) vinda do Gmail
  marcarEmailLido: (id: string, lido?: boolean) => void
  marcarTodosEmailsLidos: () => void
  importarDoEmail: (id: string) => { ok: boolean; texto: string }
  importarEmails: (json: string) => { ok: boolean; texto: string } // arquivo emails.json da Caixa de entrada (ponte Claude → sistema)
  gmailUltimaSinc?: string // ISO da última sincronização com o script do Gmail
  gmailUltimoErro?: string
  sincronizarGmail: (fetchFn?: typeof fetch) => Promise<{ ok: boolean; texto: string }> // busca no script do Gmail (Configurações › Gmail)
  receberEmails: (lista: Email[], criarOs: boolean) => { ok: boolean; texto: string; novos: number; criadas: number }
  simularEmail: () => void
  simularPeptResolvida: () => string
  aplicarPeptsResolvidas: () => void
  // O.S.
  criarOS: (input: NovaOSInput, evento?: string) => string
  importarOS: (inputs: NovaOSInput[], origem: Origem) => { criadas: number; ignoradas: number }
  removerOS: (id: string) => void
  setEscopo: (e: Escopo) => void
  atualizarOS: (id: string, patch: Partial<OS>, evento?: string) => void
  mudarStatus: (id: string, status: Status, evento?: string) => void
  registrarContato: (id: string, tipo: TipoContato, respondeu: boolean, obs: string) => void
  pausar: (id: string, tipo: TipoPept, motivo?: string, desde?: string) => void
  resolverPept: (id: string, dia: string, origem: 'email' | 'manual') => void
  finalizarPept: (id: string, dia: string) => void
  editarPept: (id: string, peptId: string, patch: Partial<Pick<Pept, 'motivo' | 'tipo'>>) => void
  editarDatasPept: (id: string, peptId: string, datas: { inicio?: string; resolvidaEm?: string; fim?: string }) => boolean
  reabrirPept: (id: string, dia: string) => void
  agendar: (id: string, data: string, hora: string) => void
  marcarVistoriaFeita: (id: string) => void
  marcarPasso: (id: string, passo: PassoKey, como: 'feito' | 'pulado' | 'desfazer') => void
  voltarPasso: (id: string, passo: PassoKey) => void
  colocarNaColunaLivre: (id: string, colunaId: string | null, titulo?: string) => void
  toggleDoc: (id: string, doc: keyof OS['docs']) => void
  marcarFaturada: (id: string, faturada: boolean) => void
  marcarFicha: (id: string, fornecida: boolean) => void
  definirLocalizacao: (id: string, lat: number, lng: number) => void
  // rotas
  criarRota: (osIds: string[], dados?: Partial<Rota>) => string
  atualizarRota: (id: string, patch: Partial<Rota>) => void
  avancarRota: (id: string) => void
  cancelarRota: (id: string) => void
  excluirRota: (id: string) => void
  // fechamento mensal (extra do laboratório)
  setFechamento: (mes: string, patch: Partial<Fechamento>) => void
  // notificações
  marcarNotificacoesLidas: (ids: string[]) => void
  // config
  setConfig: (patch: Partial<Config>) => void
  // Pasta de dados no OneDrive (10/11): nome da pasta lembrada e quando este navegador gravou por último; aviso para a tela
  pastaDados?: { nome: string; salvoEm?: string }
  pastaAviso?: { tipo: 'permissao' | 'erro' | 'ok' | 'gravando'; texto: string }
  setPasta: (p: { pastaDados?: State['pastaDados']; pastaAviso?: State['pastaAviso'] }) => void
  // pasta das O.S. no OneDrive (12/11): '1 - ORDENS DE SERVIÇO', onde o sistema cria a pasta de cada O.S. nova
  pastaOS?: { nome: string }
  pastaOSAviso?: { tipo: 'permissao' | 'erro' | 'ok'; texto: string }
  setPastaOS: (p: { pastaOS?: State['pastaOS']; pastaOSAviso?: State['pastaOSAviso'] }) => void
  resetarDados: () => void
  restaurarDados: (d: { os: OS[]; rotas: Rota[]; config: Partial<Config>; fechamentos: Record<string, Fechamento> }) => void
}

const seed = gerarSeed()

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      os: seed.os,
      rotas: seed.rotas,
      config: CONFIG_PADRAO,
      escopo: 'luan',
      fechamentos: {},
      notificacoesLidas: [],
      emails: emailsExemplo(),

      marcarEmailLido: (id, lido = true) => set((s) => ({ emails: s.emails.map((e) => (e.id === id ? { ...e, lido } : e)) })),
      marcarTodosEmailsLidos: () => set((s) => ({ emails: s.emails.map((e) => ({ ...e, lido: true })) })),
      simularEmail: () => set((s) => ({ emails: [emailSimulado(s.emails.length + 1), ...s.emails] })),
      // Importar e-mails (10/11): o Claude lê o Gmail e salva emails.json na pasta "Caixa de entrada"; aqui entra no sistema.
      importarEmails: (json) => {
        const r = lerArquivoCaixaDeEntrada(json)
        if (r.erro) return { ok: false, texto: r.erro }
        return get().receberEmails(r.emails, false)
      },
      // junta e-mails recebidos (arquivo ou script), aplica as PEPTs e, se pedido, cria as O.S. dos .txt novos
      receberEmails: (lista, criarOs) => {
        const atuais = new Set(get().emails.map((e) => e.id))
        const m = mesclarEmails(get().emails, lista)
        set({ emails: m.emails })
        get().aplicarPeptsResolvidas()
        let criadas = 0
        if (criarOs) {
          const novosIds = new Set(m.emails.filter((e) => !atuais.has(e.id)).map((e) => e.id))
          const { ativoDesde, polos } = get().config.gmail
          for (const e of m.emails.filter((x) => novosIds.has(x.id) && x.anexo && !x.importadaId && ehDaCaixa(x.de) && emailInterage(x, ativoDesde))) {
            // O.S. de outro polo: o sistema ignora (o e-mail fica na caixa de entrada)
            const cidade = lerSiopiTxt(e.anexo!.texto).endereco.cidade
            if (polos?.length && !polos.includes(poloDe(cidade))) continue
            if (get().importarDoEmail(e.id).ok) criadas++
          }
        }
        const daCaixa = lista.filter((e) => ehDaCaixa(e.de)).length
        const texto = m.novos === 0
          ? `Nenhum e-mail novo (${lista.length === 1 ? 'o 1 encontrado já estava' : `os ${lista.length} encontrados já estavam`} aqui).`
          : `${m.novos} ${m.novos === 1 ? 'e-mail novo' : 'e-mails novos'} na caixa de entrada${criadas ? ` · ${criadas} ${criadas === 1 ? 'O.S. criada' : 'O.S. criadas'}` : ''}${daCaixa < lista.length ? ` (${lista.length - daCaixa} de fora da Caixa ficam escondidos)` : ''}.`
        return { ok: true, texto, novos: m.novos, criadas }
      },
      // Ligação com o Gmail (10/11): busca no Google Apps Script publicado (Configurações › Gmail) e entra no sistema sozinho.
      sincronizarGmail: async (fetchFn = fetch) => {
        const { url, token, criarOs } = get().config.gmail
        if (!url.trim()) return { ok: false, texto: 'Ligação com o Gmail não configurada (Configurações › Gmail).' }
        try {
          const resp = await fetchFn(urlPonteGmail(url, token, desdeParaSincronizar(get().gmailUltimaSinc)), { redirect: 'follow' })
          if (!resp.ok) throw new Error(`o script respondeu ${resp.status}`)
          const r = lerRespostaPonte(await resp.text())
          if (r.erro) throw new Error(r.erro)
          const res = get().receberEmails(r.emails, criarOs)
          set({ gmailUltimaSinc: new Date().toISOString(), gmailUltimoErro: undefined })
          return { ok: true, texto: res.texto }
        } catch (e) {
          const texto = `Não consegui falar com o script do Gmail: ${e instanceof Error ? e.message : String(e)}`
          set({ gmailUltimoErro: texto })
          return { ok: false, texto }
        }
      },
      simularPeptResolvida: () => {
        const o = get().os.find((x) => x.pausadoEm && x.status !== 'concluida' && x.status !== 'cancelada')
        if (!o) return 'Nenhuma O.S. em PEPT para simular.'
        set((s) => ({ emails: [emailPeptResolvida(o.referencia, o.proponente, o.endereco.cidade), ...s.emails] }))
        get().aplicarPeptsResolvidas()
        return `E-mail de PEPT resolvida da OS-${o.numero} recebido: o prazo voltou a contar.`
      },
      // A Caixa avisa por e-mail que a PEPT foi resolvida: a O.S. sai da pausa no dia do e-mail e o prazo volta a contar.
      aplicarPeptsResolvidas: () => {
        for (const e of get().emails) {
          if (e.peptOsId || !ehDaCaixa(e.de) || !emailInterage(e, get().config.gmail.ativoDesde)) continue
          const ref = refPeptResolvida(e)
          if (!ref) continue
          const o = get().os.find((x) => x.referencia === ref)
          if (!o) continue
          // e-mail de PEPT resolvida = o cliente resolveu: o prazo volta a contar no dia do e-mail (a PEPT fica em análise)
          if (o.pausadoEm) get().resolverPept(o.id, format(new Date(e.recebidoEm), 'yyyy-MM-dd'), 'email')
          set((s) => ({ emails: s.emails.map((x) => (x.id === e.id ? { ...x, peptOsId: o.id } : x)) }))
        }
      },
      importarDoEmail: (id) => {
        const e = get().emails.find((x) => x.id === id)
        if (!e?.anexo) return { ok: false, texto: 'Este e-mail não tem o arquivo da O.S.' }
        const r = lerSiopiTxt(e.anexo.texto, get().config.prazoPadraoDias)
        if (!r.referencia) return { ok: false, texto: 'Não achei a referência da O.S. no anexo.' }
        const ja = get().os.find((o) => o.referencia === r.referencia)
        if (ja) { set((s) => ({ emails: s.emails.map((x) => (x.id === id ? { ...x, importadaId: ja.id } : x)) })); return { ok: true, texto: `Esta O.S. já estava no sistema (OS-${ja.numero}).` } }
        get().importarOS([{
          txtOriginal: e.anexo.texto, nova: true, referencia: r.referencia, tipologia: r.tipologia, responsavel: 'luan', proponente: (r.proponente || r.contato || 'SEM NOME').toUpperCase(), documento: r.documento,
          contato: (r.contato || r.proponente).toUpperCase(), telefone: r.telefone, endereco: r.endereco, matricula: r.matricula, valorServico: r.valorServico,
          valorDeslocamento: r.valorDeslocamento, emissao: r.emissao, prazo: r.prazo, descricao: r.descricao, importacao: r.importacao, status: 'recebida',
        }], 'email')
        const nova = get().os.find((o) => o.referencia === r.referencia)
        set((s) => ({ emails: s.emails.map((x) => (x.id === id ? { ...x, importadaId: nova?.id } : x)) }))
        return { ok: true, texto: `O.S. importada${nova ? ` (OS-${nova.numero})` : ''}.` }
      },

      setEscopo: (escopo) => set({ escopo }),

      criarOS: (input, evento = 'O.S. criada manualmente') => {
        const s = get()
        const id = `os-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
        const numero = s.os.filter((o) => o.responsavel === input.responsavel).reduce((m, o) => Math.max(m, o.numero), 0) + 1
        set({ os: [montarOS(input, id, numero, evento), ...s.os] })
        return id
      },

      importarOS: (inputs, origem) => {
        const s = get()
        const existentes = new Set(s.os.map((o) => o.referencia))
        // numeração própria de cada técnico, como nas pastas do OneDrive (12/11)
        const ultimo: Record<string, number> = {}
        for (const o of s.os) ultimo[o.responsavel] = Math.max(ultimo[o.responsavel] ?? 0, o.numero)
        const novas: OS[] = []
        let ignoradas = 0
        const evento = origem === 'email' ? 'Importada automaticamente do e-mail da Caixa' : origem === 'texto' ? 'Importada colando o conteúdo do .txt da Caixa' : 'Importada do arquivo .txt da Caixa'
        for (const inp of inputs) {
          if (!inp.referencia || existentes.has(inp.referencia)) { ignoradas++; continue }
          existentes.add(inp.referencia)
          const numero = (ultimo[inp.responsavel] = (ultimo[inp.responsavel] ?? 0) + 1)
          novas.push(montarOS({ ...inp, origem }, `os-${Date.now().toString(36)}-${inp.responsavel}-${numero}`, numero, evento))
        }
        if (novas.length) set({ os: [...novas, ...s.os] })
        return { criadas: novas.length, ignoradas }
      },

      removerOS: (id) =>
        set((s) => ({
          os: s.os.filter((o) => o.id !== id),
          rotas: s.rotas.map((r) => ({ ...r, paradas: r.paradas.filter((p) => p.osId !== id) })),
        })),

      atualizarOS: (id, patch, evento) =>
        set((s) => ({
          os: s.os.map((o) =>
            o.id === id
              ? { ...o, ...patch, historico: evento ? [...o.historico, { data: new Date().toISOString(), texto: evento }] : o.historico }
              : o,
          ),
        })),

      mudarStatus: (id, status, evento) => {
        const o = get().os.find((x) => x.id === id)
        if (!o || o.status === status) return
        // Não conclui com PEPT em aberto: primeiro valide (finalize) ou reabra (pedido de 12/11).
        if (status === 'concluida' && !podeConcluir(o)) return
        const patch: Partial<OS> = { status }
        if (status === 'concluida') {
          patch.concluidaEm = hojeISO()
          patch.entregaEm = o.entregaEm ?? hojeISO()
        } else {
          patch.concluidaEm = undefined
          if (o.status === 'concluida') patch.faturada = false
        }
        get().atualizarOS(id, patch, evento ?? `Etapa: ${STATUS_META[status].label}`)
      },

      registrarContato: (id, tipo, respondeu, obs) => {
        const o = get().os.find((x) => x.id === id)
        if (!o) return
        const c = { data: new Date().toISOString(), tipo, respondeu, obs: obs.trim() }
        const nome = tipo === 'conversou' ? 'Conversou com o cliente' : tipo === 'recado' ? 'Recado deixado' : `${tipo === 'ligacao' ? 'Ligação' : 'WhatsApp'} ${respondeu ? 'com resposta' : 'sem resposta'}`
        get().atualizarOS(id, { contatos: [...(o.contatos ?? []), c] }, `Contato: ${nome}${c.obs ? ` (${c.obs})` : ''}`)
      },

      // Pausa (PEPT) a partir do dia escolhido: o prazo efetivo conta a pausa desde essa data.
      // Abre uma PEPT (documental ou de vistoria) com a pendência; o registro aparece na aba PEPT da O.S.
      pausar: (id, tipo, motivo, desde) => {
        const o = get().os.find((x) => x.id === id)
        if (!o || o.pausadoEm) return
        const dia = desde && desde <= hojeISO() ? desde : hojeISO()
        const patch = abrirPept(o, { tipo, motivo: motivo ?? '', desde: dia }, `pept-${Date.now().toString(36)}`)
        get().atualizarOS(id, patch, `Pausa (PEPT ${TIPO_PEPT[tipo].label.toLowerCase()}): ${motivo ? motivo : 'pendência'} (desde ${dia.split('-').reverse().slice(0, 2).join('/')})`)
      },

      // O cliente resolveu a PEPT (e-mail da Caixa ou registro à mão): o prazo volta a contar desse dia; a PEPT fica em análise.
      resolverPept: (id, dia, origem) => {
        const o = get().os.find((x) => x.id === id)
        if (!o?.pausadoEm) return
        const patch = resolverPeptNaOS(o, dia, origem)
        if (!patch) return
        const dias = (patch.diasPausado ?? 0) - (o.diasPausado || 0)
        get().atualizarOS(id, patch, `PEPT resolvida pelo cliente em ${br(dia)} (${ORIGEM_RESOLUCAO[origem]}): o prazo voltou a contar; ${dias} ${dias === 1 ? 'dia parado' : 'dias parados'}`)
      },

      // Validar e finalizar a PEPT no dia informado. Se o cliente ainda não tinha resolvido, esse dia vale como resolução.
      finalizarPept: (id, dia) => {
        const o = get().os.find((x) => x.id === id)
        if (!o || !peptAberta(o)) return
        const patch = encerrarPeptNaOS(o, dia, 'manual')
        const dias = (patch.diasPausado ?? o.diasPausado ?? 0) - (o.diasPausado || 0)
        // PEPT finalizada: a O.S. volta para Em Andamento (se ainda estava em Recebida)
        const etapa = etapaAoFinalizarPept(o.status)
        if (etapa !== o.status) patch.status = etapa
        get().atualizarOS(id, patch, `PEPT validada e finalizada em ${br(dia)}${o.pausadoEm ? ` (o prazo voltou a contar; ${dias} ${dias === 1 ? 'dia parado' : 'dias parados'})` : ''}${etapa !== o.status ? `; etapa: ${STATUS_META[etapa].label}` : ''}`)
      },

      // Reabrir a PEPT no dia informado: fica (de novo) em aberto com o mesmo motivo e tipo, contando desse dia.
      reabrirPept: (id, dia) => {
        const o = get().os.find((x) => x.id === id)
        if (!o) return
        const d = dia <= hojeISO() ? dia : hojeISO()
        const patch = reabrirPeptNaOS(o, d, `pept-${Date.now().toString(36)}`)
        if (!patch) return
        const p = patch.pepts.at(-1)
        get().atualizarOS(id, patch, `Pausa (PEPT reaberta em ${d.split('-').reverse().slice(0, 2).join('/')})${p?.motivo ? `: ${p.motivo}` : ''}`)
      },

      // Corrigir as datas da PEPT (abertura e reabertura/finalização): recalcula os dias parados e o prazo.
      editarDatasPept: (id, peptId, datas) => {
        const o = get().os.find((x) => x.id === id)
        if (!o) return false
        const patch = editarDatasPeptNaOS(o, peptId, datas)
        if (!patch) return false
        get().atualizarOS(id, patch, `PEPT: datas corrigidas${datas.inicio ? ` (abertura ${br(datas.inicio)})` : ''}${datas.resolvidaEm ? ` (resolução ${br(datas.resolvidaEm)})` : ''}${datas.fim ? ` (encerramento ${br(datas.fim)})` : ''}`)
        return true
      },

      // Corrigir a pendência (ou o tipo) da PEPT direto na aba PEPT.
      editarPept: (id, peptId, patch) => {
        const o = get().os.find((x) => x.id === id)
        if (!o) return
        get().atualizarOS(id, editarPeptNaOS(o, peptId, patch))
      },

      agendar: (id, data, hora) => {
        const o = get().os.find((x) => x.id === id)
        if (!o) return
        get().atualizarOS(id, { status: o.status === 'recebida' ? 'em_andamento' : o.status, vistoria: { data, hora, duracao: get().config.duracaoVistoria } }, `Vistoria marcada para ${data.split('-').reverse().slice(0, 2).join('/')} às ${hora}`)
      },

      marcarPasso: (id, passo, como) => {
        const o = get().os.find((x) => x.id === id)
        if (!o) return
        const passos = { ...(o.passos ?? {}) }
        if (como === 'desfazer') { delete passos[passo]; get().atualizarOS(id, { passos }, `Passo desfeito: ${PASSO_LABEL[passo]}`); return }
        passos[passo] = como === 'pulado' ? 'pulado' : hojeISO()
        const patch: Partial<OS> = { passos }
        if (passo === 'fazer_vistoria' && o.vistoria) patch.vistoria = { ...o.vistoria, feita: true }
        get().atualizarOS(id, patch, como === 'pulado' ? `Passo dispensado: ${PASSO_LABEL[passo]}` : `Passo feito: ${PASSO_LABEL[passo]}`)
        // Alguns passos andam a etapa do sistema real (só para frente).
        const etapa = como === 'feito' ? ETAPA_DO_PASSO[passo] : undefined
        const atual = get().os.find((x) => x.id === id)!
        // trava: marcar passos nunca finaliza a O.S. (Concluída só pelo botão Concluir)
        if (etapa && etapa !== 'concluida' && STATUS_META[etapa].ordem > STATUS_META[atual.status].ordem && atual.status !== 'cancelada') get().mudarStatus(id, etapa)
      },

      voltarPasso: (id, passo) => {
        const o = get().os.find((x) => x.id === id)
        if (!o) return
        const patch = voltarParaPasso(o, passo, hojeISO().slice(0, 10))
        if (!patch.passos) return
        get().atualizarOS(id, patch, `Voltou para o passo: ${PASSO_LABEL[passo]}${patch.status ? ` (etapa ${STATUS_META[patch.status].label})` : ''}`)
      },

      marcarVistoriaFeita: (id) => {
        const o = get().os.find((x) => x.id === id)
        if (!o?.vistoria) return
        get().atualizarOS(id, { status: o.status === 'recebida' ? 'em_andamento' : o.status, vistoria: { ...o.vistoria, feita: true } }, 'Vistoria feita')
      },

      // Coluna livre do Kanban: só guarda onde o cartão está (a etapa não muda).
      colocarNaColunaLivre: (id, colunaId, titulo) =>
        get().atualizarOS(id, { colunaLivre: colunaId ?? undefined }, colunaId ? `Kanban: colocada na coluna "${titulo ?? 'livre'}"` : undefined),

      toggleDoc: (id, doc) =>
        set((s) => ({ os: s.os.map((o) => (o.id === id ? { ...o, docs: { ...o.docs, [doc]: !o.docs[doc] } } : o)) })),

      marcarFaturada: (id, faturada) =>
        get().atualizarOS(id, { faturada, faturadaEm: faturada ? hojeISO() : undefined }, faturada ? 'Marcada como faturada' : 'Desmarcada como faturada'),

      marcarFicha: (id, fornecida) =>
        get().atualizarOS(id, { fichaFornecida: fornecida }, fornecida ? 'Ficha de pesquisa fornecida' : 'Ficha de pesquisa marcada como pendente'),

      definirLocalizacao: (id, lat, lng) => {
        const o = get().os.find((x) => x.id === id)
        if (!o) return
        get().atualizarOS(id, { endereco: { ...o.endereco, lat, lng } }, 'Localização definida')
      },

      criarRota: (osIds, dados = {}) => {
        const s = get()
        const id = `rota-${Date.now().toString(36)}`
        const resp: Responsavel = dados.responsavel ?? (s.escopo === 'rt' ? 'rt' : 'luan')
        const rota: Rota = {
          id,
          codigo: novoCodigoRota(s.rotas.map((r) => r.codigo)),
          responsavel: resp,
          status: 'rascunho',
          data: hojeISO(),
          hora: '08:00',
          partida: { ...s.config.base },
          velocidadeMedia: s.config.velocidadeMedia,
          descricao: '',
          paradas: osIds.map((osId) => ({ osId })),
          ...dados,
        }
        set({ rotas: [rota, ...s.rotas] })
        return id
      },

      atualizarRota: (id, patch) => set((s) => ({ rotas: s.rotas.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),

      avancarRota: (id) => {
        const s = get()
        const r = s.rotas.find((x) => x.id === id)
        if (!r) return
        if (r.status === 'rascunho') {
          // Confirmar a rota marca a vistoria de cada parada no dia da rota.
          r.paradas.forEach((p) => {
            const o = s.os.find((x) => x.id === p.osId)
            if (o && o.status !== 'concluida' && o.status !== 'cancelada') s.agendar(o.id, r.data, p.hora ?? o.vistoria?.hora ?? r.hora)
          })
          s.atualizarRota(id, { status: 'confirmada' })
        } else if (r.status === 'confirmada') {
          // Concluir a rota = vistorias feitas: as O.S. dela não voltam para outra rota (13/11)
          r.paradas.forEach((p) => {
            const o = get().os.find((x) => x.id === p.osId)
            const patch = o && vistoriaFeitaPelaRota(o, r, p.hora)
            if (patch) get().atualizarOS(o.id, patch, `Vistoria feita na rota ${r.codigo}`)
          })
          s.atualizarRota(id, { status: 'concluida' })
        }
      },

      cancelarRota: (id) => get().atualizarRota(id, { status: 'cancelada' }),

      excluirRota: (id) => set((s) => ({ rotas: s.rotas.filter((r) => r.id !== id) })),

      setFechamento: (mes, patch) => set((s) => ({ fechamentos: { ...s.fechamentos, [mes]: { ...s.fechamentos[mes], ...patch } } })),

      marcarNotificacoesLidas: (ids) => set((s) => ({ notificacoesLidas: [...new Set([...s.notificacoesLidas, ...ids])] })),

      setConfig: (patch) => set((s) => ({ config: { ...s.config, ...patch } })),

      setPastaOS: (p) => set((s) => ({ pastaOS: 'pastaOS' in p ? p.pastaOS : s.pastaOS, pastaOSAviso: 'pastaOSAviso' in p ? p.pastaOSAviso : s.pastaOSAviso })),
      setPasta: (p) => set((s) => ({ pastaDados: 'pastaDados' in p ? p.pastaDados : s.pastaDados, pastaAviso: 'pastaAviso' in p ? p.pastaAviso : s.pastaAviso })),

      restaurarDados: (d) =>
        set((s) => ({
          os: d.os.map((o) => migrarOS(o as unknown as Record<string, unknown>)),
          rotas: d.rotas,
          fechamentos: d.fechamentos,
          // Backup sem configurações (ex.: só as O.S. importadas das pastas): mantém as configurações deste navegador.
          config: Object.keys(d.config ?? {}).length ? mesclarConfig(d.config) : s.config,
          escopo: s.escopo,
        })),

      resetarDados: () => {
        const novo = gerarSeed()
        set({ os: novo.os, rotas: novo.rotas, config: CONFIG_PADRAO, escopo: 'luan', fechamentos: {}, notificacoesLidas: [], emails: emailsExemplo() })
      },
    }),
    {
      // v3: etapas e campos do sistema real. Dados das versões antigas não são lidos (eram fictícios); use o backup para trazer.
      name: 'fluxocaixa-v3',
      // garante campos novos de configuração em dados salvos antes deles existirem
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>
        // O.S. salvas antes do registro de contato ganham o campo vazio; a etapa "devolvida" (que saiu) vira concluída.
        // O.S. de exemplo antigas com o prazo de 15 dias para todas as tipologias passam a usar o prazo da tipologia.
        // O.S. de exemplo salvas com outras cidades passam para Ariquemes (uma por bairro), e a rota de exemplo do RT sai da base.
        // Nome do cliente salvo com o CPF na frente ("000.000.000-00 - NOME"): fica só o nome; o CPF vai para o documento.
        const os = p.os?.map((o) => semDocumentoNoNome(exemploParaAriquemes(corrigirPrazoAntigo({ ...o, contatos: o.contatos ?? [], status: (o.status as string) === 'devolvida' ? 'concluida' as const : o.status }))))
        const rotas = p.rotas?.map((r) => (r.id === 'rota-2' && r.partida.endereco.includes('Ji-Paran') ? { ...r, partida: { ...CONFIG_PADRAO.base }, descricao: 'Vistorias de amanhã' } : r))
          // rota confirmada antes de existir a confirmação por cliente: as paradas contam como agendadas e confirmadas
          .map((r) => (r.status === 'confirmada' || r.status === 'concluida' ? { ...r, paradas: r.paradas.map((x) => ({ ...x, avisado: x.avisado ?? true, confirmado: x.confirmado ?? true })) } : r))
        // rotas concluídas antes da regra de 13/11: as O.S. delas ficam com a vistoria feita (saem do planejador)
        const osFinal = os && rotas ? vistoriasDasRotasConcluidas(os, rotas) : os
        return { ...current, ...p, ...(osFinal ? { os: osFinal } : {}), ...(rotas ? { rotas } : {}), emails: p.emails ? p.emails.map((e) => (e.id === 'em-5' && /^Aviso: PEPT/.test(e.assunto) ? current.emails.find((x) => x.id === 'em-5') ?? e : e)) : current.emails, config: mesclarConfig(p.config ?? {}) }
      },
    },
  ),
)

/** Configuração salva + valores padrão para campos que ainda não existiam. */
function mesclarConfig(c: Partial<Config>): Config {
  return {
    ...CONFIG_PADRAO,
    ...c,
    responsaveis: {
      luan: { ...CONFIG_PADRAO.responsaveis.luan, ...(c.responsaveis?.luan ?? {}) },
      rt: { ...CONFIG_PADRAO.responsaveis.rt, ...(c.responsaveis?.rt ?? {}) },
    },
    base: { ...CONFIG_PADRAO.base, ...(c.base ?? {}) },
    kanban: completarColunas(c.kanban),
    contrato: { ...CONFIG_PADRAO.contrato, ...(c.contrato ?? {}) },
    empresa: { ...CONFIG_PADRAO.empresa, ...(c.empresa ?? {}) },
    gmail: { ...CONFIG_PADRAO.gmail, ...(c.gmail ?? {}) },
  }
}

/** O.S. visíveis no escopo atual. */
export function filtrarEscopo(os: OS[], escopo: Escopo) {
  return escopo === 'todas' ? os : os.filter((o) => o.responsavel === escopo)
}

/** Tira o CPF/CNPJ da frente do nome do cliente e do contato (O.S. importadas antes de 12/11/2026). */
function semDocumentoNoNome<T extends { proponente: string; contato: string; documento?: string }>(o: T): T {
  const p = separarDocumento(o.proponente ?? ''), c = separarDocumento(o.contato ?? '')
  if (!p.documento && !c.documento) return o
  return { ...o, proponente: p.nome, contato: c.nome, documento: o.documento || p.documento || c.documento }
}
