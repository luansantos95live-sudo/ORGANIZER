/**
 * Cria no OneDrive a pasta de cada O.S. nova (pedido de 12/11/2026), na estrutura que o usuário já usa.
 * O usuário escolhe uma vez a pasta "1 - ORDENS DE SERVIÇO" (Configurações › Backup e dados); o Chrome lembra.
 * Depois, toda O.S. nova do dono da conta (e-mail da Caixa, .txt ou manual) ganha a pasta com OS.txt e as subpastas.
 * Nunca apaga nem sobrescreve: se já houver pasta "OS-<nº> …" no mês, só anota o caminho.
 */
import { useStore } from './useStore'
import { escolherPasta, guardarHandle, handleGuardado, permissaoDaPasta, suportaPasta, type PastaHandle } from '../lib/pastaDados'
import { anoMesDaOS, nomePastaOS, pastaDoTecnico, pastaExistente, precisaPasta, SUBPASTAS, textoOsTxt } from '../lib/pastasOS'

const CHAVE = 'ordens'
let handle: PastaHandle | null = null
let permitido = false
let rodando = false
let deNovo = false
let iniciado = false

const aviso = (a: ReturnType<typeof useStore.getState>['pastaOSAviso']) => useStore.getState().setPastaOS({ pastaOSAviso: a })

async function nomesDe(h: PastaHandle): Promise<string[]> {
  const r: string[] = []
  for await (const e of h.values()) if (e.kind === 'directory') r.push(e.name)
  return r
}

async function subpasta(h: PastaHandle, caminho: string) {
  let atual = h
  for (const p of caminho.split('/')) atual = await atual.getDirectoryHandle(p, { create: true })
  return atual
}

/** Cria as pastas que faltam. Roda de novo sozinho se o estado mudar durante a gravação. */
export async function criarPastasPendentes(): Promise<number> {
  if (!handle || !permitido) return 0
  if (rodando) { deNovo = true; return 0 }
  rodando = true
  let criadas = 0
  try {
    const pendentes = useStore.getState().os.filter(precisaPasta)
    if (!pendentes.length) return 0
    const raiz = await nomesDe(handle)
    for (const o of pendentes) {
      const tec = pastaDoTecnico(raiz, o.responsavel)
      if (!tec) { aviso({ tipo: 'erro', texto: `Não achei a pasta do técnico dentro de "${handle.name}". Escolha a pasta "1 - ORDENS DE SERVIÇO".` }); return criadas }
      const [ano, mes] = anoMesDaOS(o)
      const dirMes = await subpasta(handle, `${tec}/${ano}/${mes}`)
      const ja = pastaExistente(await nomesDe(dirMes), o.numero)
      const nome = ja ?? nomePastaOS(o)
      if (!ja) {
        const dir = await dirMes.getDirectoryHandle(nome, { create: true })
        for (const s of SUBPASTAS) await subpasta(dir, s)
        const w = await (await dir.getFileHandle('OS.txt', { create: true })).createWritable()
        await w.write(textoOsTxt(o))
        await w.close()
        criadas++
      }
      useStore.getState().atualizarOS(o.id, { pasta: `${tec}/${ano}/${mes}/${nome}` }, ja ? `Pasta da O.S. encontrada no OneDrive: ${nome}` : `Pasta da O.S. criada no OneDrive: ${tec} › ${ano} › ${mes} › ${nome}`)
    }
    if (criadas) aviso({ tipo: 'ok', texto: `${criadas} pasta(s) de O.S. criada(s) no OneDrive.` })
    return criadas
  } catch (e) {
    aviso({ tipo: 'erro', texto: `Não consegui criar a pasta da O.S.: ${e instanceof Error ? e.message : String(e)}` })
    return criadas
  } finally {
    rodando = false
    if (deNovo) { deNovo = false; void criarPastasPendentes() }
  }
}

/** Chamado uma vez quando o sistema abre: lembra a pasta e cria as que faltam a cada O.S. nova. */
export async function iniciarPastasOS() {
  if (iniciado) return
  iniciado = true
  useStore.subscribe((s, antes) => { if (s.os !== antes.os && s.os.some(precisaPasta)) void criarPastasPendentes() })
  if (!suportaPasta()) return
  handle = await handleGuardado(CHAVE)
  if (!handle) return
  const p = await permissaoDaPasta(handle, false)
  if (p === 'granted') { permitido = true; aviso(undefined); await criarPastasPendentes() }
  else aviso({ tipo: 'permissao', texto: `O Chrome precisa da sua confirmação para criar as pastas das O.S. em "${handle.name}".` })
}

/** Botão "Escolher pasta das O.S." (precisa de clique). */
export async function conectarPastaOS() {
  try {
    handle = await escolherPasta(CHAVE)
    permitido = true
    useStore.getState().setPastaOS({ pastaOS: { nome: handle.name }, pastaOSAviso: { tipo: 'ok', texto: `Pasta "${handle.name}" ligada: as O.S. novas ganham a pasta sozinhas.` } })
    await criarPastasPendentes()
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return
    aviso({ tipo: 'erro', texto: `Não consegui usar a pasta: ${e instanceof Error ? e.message : String(e)}` })
  }
}

/** Botão "Reconectar" (precisa de clique). */
export async function reconectarPastaOS() {
  if (!handle) handle = await handleGuardado(CHAVE)
  if (!handle) return
  const p = await permissaoDaPasta(handle, true)
  if (p !== 'granted') { aviso({ tipo: 'permissao', texto: 'Permissão negada. Clique em Reconectar e escolha "Permitir".' }); return }
  permitido = true
  aviso(undefined)
  await criarPastasPendentes()
}

export async function desconectarPastaOS() {
  handle = null
  permitido = false
  await guardarHandle(null, CHAVE)
  useStore.getState().setPastaOS({ pastaOS: undefined, pastaOSAviso: undefined })
}
