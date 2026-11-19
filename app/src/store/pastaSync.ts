/**
 * Liga o estado do sistema à "Pasta de dados no OneDrive" (lib/pastaDados.ts).
 *
 * - Ao abrir: se há pasta lembrada e o Chrome ainda permite, lê o arquivo; se ele é mais novo do que o que este
 *   navegador gravou, substitui os dados daqui (o mais novo vence). Se o Chrome pede confirmação, a tela mostra
 *   "Reconectar" (precisa de um clique).
 * - Depois: qualquer mudança em O.S., rotas, configurações, fechamentos ou e-mails grava o arquivo (1,5 s depois
 *   da última mudança), para o outro PC ler.
 */
import { useStore } from './useStore'
import { arquivoMaisNovo, escolherPasta, gravarArquivoNaPasta, guardarHandle, handleGuardado, lerArquivoDaPasta, lerDados, montarDados, permissaoDaPasta, suportaPasta, type PastaHandle } from '../lib/pastaDados'

let handle: PastaHandle | null = null
let permitido = false
let timer: ReturnType<typeof setTimeout> | undefined
let ignorarMudancas = false // enquanto restauramos do arquivo, não gravar de volta
let iniciado = false

const quemSalva = () => `${navigator.platform || 'PC'} · ${navigator.userAgent.includes('Edg') ? 'Edge' : 'Chrome'}`
const aviso = (a: ReturnType<typeof useStore.getState>['pastaAviso']) => useStore.getState().setPasta({ pastaAviso: a })

function dadosAtuais() {
  const s = useStore.getState()
  return { os: s.os, rotas: s.rotas, config: s.config, fechamentos: s.fechamentos, emails: s.emails }
}

/** Grava o estado atual no arquivo da pasta (quando há pasta e permissão). */
export async function gravarAgora(): Promise<boolean> {
  if (!handle || !permitido) return false
  const salvoEm = new Date().toISOString()
  try {
    aviso({ tipo: 'gravando', texto: 'Gravando na pasta do OneDrive…' })
    await gravarArquivoNaPasta(handle, montarDados(dadosAtuais(), salvoEm, quemSalva()))
    useStore.getState().setPasta({ pastaDados: { nome: handle.name, salvoEm }, pastaAviso: { tipo: 'ok', texto: `Dados gravados na pasta "${handle.name}" às ${new Date(salvoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.` } })
    return true
  } catch (e) {
    aviso({ tipo: 'erro', texto: `Não consegui gravar na pasta do OneDrive: ${e instanceof Error ? e.message : String(e)}` })
    return false
  }
}

function agendarGravacao() {
  if (!handle || !permitido || ignorarMudancas) return
  clearTimeout(timer)
  timer = setTimeout(() => void gravarAgora(), 1500)
}

/** Lê o arquivo da pasta e, se for mais novo que o último gravado por aqui, substitui os dados do navegador. */
async function lerEAplicar(): Promise<'restaurado' | 'igual' | 'vazio'> {
  if (!handle) return 'vazio'
  const texto = await lerArquivoDaPasta(handle)
  if (texto === null) return 'vazio'
  const r = lerDados(texto)
  if (!r.ok) throw new Error(r.erro)
  const s = useStore.getState()
  if (!arquivoMaisNovo(r.dados.salvoEm, s.pastaDados?.salvoEm)) return 'igual'
  ignorarMudancas = true
  try {
    s.restaurarDados({ os: r.dados.os, rotas: r.dados.rotas, config: r.dados.config, fechamentos: r.dados.fechamentos })
    useStore.setState({ emails: r.dados.emails })
    s.aplicarPeptsResolvidas()
    useStore.getState().setPasta({ pastaDados: { nome: handle.name, salvoEm: r.dados.salvoEm }, pastaAviso: { tipo: 'ok', texto: `Dados atualizados pela pasta do OneDrive (${r.resumo}).` } })
  } finally {
    setTimeout(() => { ignorarMudancas = false }, 2000)
  }
  return 'restaurado'
}

/** Depois de ter a pasta com permissão: lê o que há nela e, se nada mais novo, grava o estado atual. */
async function sincronizar() {
  const r = await lerEAplicar()
  if (r !== 'restaurado') await gravarAgora()
}

/** Chamado uma vez quando o sistema abre. */
export async function iniciarPasta() {
  if (iniciado) return
  iniciado = true
  useStore.subscribe((s, antes) => {
    if (s.os !== antes.os || s.rotas !== antes.rotas || s.config !== antes.config || s.fechamentos !== antes.fechamentos || s.emails !== antes.emails) agendarGravacao()
  })
  if (!suportaPasta()) return
  try {
    handle = await handleGuardado()
    if (!handle) { if (useStore.getState().pastaDados) useStore.getState().setPasta({ pastaDados: undefined, pastaAviso: undefined }); return }
    const p = await permissaoDaPasta(handle, false)
    if (p === 'granted') { permitido = true; await sincronizar() }
    else aviso({ tipo: 'permissao', texto: `O Chrome precisa da sua confirmação para usar a pasta "${handle.name}" do OneDrive.` })
  } catch (e) {
    aviso({ tipo: 'erro', texto: `Pasta do OneDrive: ${e instanceof Error ? e.message : String(e)}` })
  }
}

/** Botão "Reconectar" (precisa de clique): pede a permissão ao Chrome e sincroniza. */
export async function reconectarPasta() {
  if (!handle) handle = await handleGuardado()
  if (!handle) return
  try {
    const p = await permissaoDaPasta(handle, true)
    if (p !== 'granted') { aviso({ tipo: 'permissao', texto: 'Permissão negada. Clique em Reconectar e escolha "Permitir" na janela do Chrome.' }); return }
    permitido = true
    await sincronizar()
  } catch (e) {
    aviso({ tipo: 'erro', texto: `Pasta do OneDrive: ${e instanceof Error ? e.message : String(e)}` })
  }
}

/** Botão "Escolher pasta" (precisa de clique): abre a janela do Chrome, lembra a pasta e sincroniza. */
export async function conectarPasta() {
  try {
    handle = await escolherPasta()
    permitido = true
    useStore.getState().setPasta({ pastaDados: { nome: handle.name, salvoEm: useStore.getState().pastaDados?.salvoEm } })
    await sincronizar()
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return // o usuário cancelou a janela
    aviso({ tipo: 'erro', texto: `Não consegui usar a pasta: ${e instanceof Error ? e.message : String(e)}` })
  }
}

/** Para de usar a pasta (os dados deste navegador e o arquivo continuam como estão). */
export async function desconectarPasta() {
  clearTimeout(timer)
  handle = null
  permitido = false
  await guardarHandle(null)
  useStore.getState().setPasta({ pastaDados: undefined, pastaAviso: undefined })
}
