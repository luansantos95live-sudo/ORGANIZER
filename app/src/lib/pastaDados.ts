/**
 * Pasta de dados no OneDrive (10/11, pedido "editar de qualquer PC com acesso ao meu drive").
 *
 * Os dados do sistema ficam no navegador de cada PC. Para seguir o usuário de um PC para outro, o sistema grava
 * tudo num arquivo (`fluxocaixa-dados.json`) dentro de uma pasta que ele escolhe uma vez (ex.: OneDrive\FLUXO CAIXA\Dados)
 * e, ao abrir em qualquer PC, lê esse arquivo: o mais novo vence. A pasta é lembrada no navegador (IndexedDB); a cada
 * abertura o Chrome pode pedir para confirmar a permissão (um clique em "Reconectar").
 *
 * As partes puras (montar/ler/comparar) têm teste; o acesso à pasta usa a File System Access API do Chrome/Edge.
 */
import type { Config, OS, Rota } from '../types'
import { lerBackup, montarBackup, type DadosBackup } from './backup'
import { lerArquivoCaixaDeEntrada } from './emails'
import type { Email } from './emails'

export const NOME_ARQUIVO_DADOS = 'fluxocaixa-dados.json'

export interface DadosSincronizados extends DadosBackup {
  emails: Email[]
  salvoEm: string // ISO
  salvoPor?: string // nome do PC/navegador que gravou (só informativo)
}

/** Texto do arquivo de dados: o backup normal + e-mails + quando foi salvo. */
export function montarDados(d: { os: OS[]; rotas: Rota[]; config: Partial<Config>; fechamentos: DadosBackup['fechamentos']; emails: Email[] }, salvoEm = new Date().toISOString(), salvoPor = ''): string {
  const base = JSON.parse(montarBackup({ os: d.os, rotas: d.rotas, config: d.config, fechamentos: d.fechamentos })) as Record<string, unknown>
  return JSON.stringify({ ...base, emails: d.emails, salvoEm, salvoPor }, null, 2)
}

/** Lê o arquivo de dados; qualquer problema devolve erro e nada é substituído. */
export function lerDados(texto: string): { ok: true; dados: DadosSincronizados; resumo: string } | { ok: false; erro: string } {
  const r = lerBackup(texto)
  if (!r.ok) return r
  let j: Record<string, unknown> = {}
  try { j = JSON.parse(texto) as Record<string, unknown> } catch { /* já validado acima */ }
  const salvoEm = typeof j.salvoEm === 'string' && !isNaN(Date.parse(j.salvoEm)) ? j.salvoEm : ''
  if (!salvoEm) return { ok: false, erro: 'O arquivo não diz quando foi salvo (não é o arquivo de dados do Fluxo Caixa).' }
  const emails = Array.isArray(j.emails) ? lerArquivoCaixaDeEntrada(JSON.stringify(j.emails)).emails : []
  return { ok: true, dados: { ...r.dados, emails, salvoEm, salvoPor: typeof j.salvoPor === 'string' ? j.salvoPor : undefined }, resumo: `${r.resumo}, ${emails.length} e-mail(s), salvo ${new Date(salvoEm).toLocaleString('pt-BR')}` }
}

/** O arquivo da pasta é mais novo que o que este navegador gravou por último? (sem registro local, é mais novo) */
export function arquivoMaisNovo(salvoEmArquivo: string, ultimoSalvoAqui: string | undefined): boolean {
  const a = Date.parse(salvoEmArquivo), b = ultimoSalvoAqui ? Date.parse(ultimoSalvoAqui) : NaN
  if (isNaN(a)) return false
  return isNaN(b) || a > b + 1000
}

// ---------------------------------------------------------------- acesso à pasta (navegador)

// A API de pastas do Chrome/Edge ainda não está nos tipos do TypeScript: o mínimo usado aqui.
type Permissao = 'granted' | 'denied' | 'prompt'
export interface PastaHandle {
  name: string
  kind: 'directory'
  queryPermission(o: { mode: 'read' | 'readwrite' }): Promise<Permissao>
  requestPermission(o: { mode: 'read' | 'readwrite' }): Promise<Permissao>
  getFileHandle(nome: string, o?: { create?: boolean }): Promise<{ getFile(): Promise<File>; createWritable(): Promise<{ write(d: string): Promise<void>; close(): Promise<void> }> }>
  getDirectoryHandle(nome: string, o?: { create?: boolean }): Promise<PastaHandle>
  values(): AsyncIterable<{ kind: 'file' | 'directory'; name: string }>
}
type JanelaComPasta = Window & { showDirectoryPicker?: (o?: { mode?: 'read' | 'readwrite'; id?: string; startIn?: string }) => Promise<PastaHandle> }

export const suportaPasta = () => typeof window !== 'undefined' && typeof (window as JanelaComPasta).showDirectoryPicker === 'function' && typeof indexedDB !== 'undefined'

/** Abre a janela do Chrome para escolher a pasta (precisa de um clique do usuário). */
export async function escolherPasta(chave = CHAVE): Promise<PastaHandle> {
  const w = window as JanelaComPasta
  if (!w.showDirectoryPicker) throw new Error('Este navegador não deixa o sistema gravar numa pasta. Use o Chrome ou o Edge.')
  const h = await w.showDirectoryPicker({ mode: 'readwrite', id: chave === CHAVE ? 'fluxocaixa-dados' : `fluxocaixa-${chave}` })
  await guardarHandle(h, chave)
  return h
}

/** Permissão de leitura e escrita na pasta lembrada; `pedir` = true abre a confirmação do Chrome (precisa de clique). */
export async function permissaoDaPasta(h: PastaHandle, pedir: boolean): Promise<Permissao> {
  let p = await h.queryPermission({ mode: 'readwrite' })
  if (p === 'prompt' && pedir) p = await h.requestPermission({ mode: 'readwrite' })
  return p
}

export async function lerArquivoDaPasta(h: PastaHandle): Promise<string | null> {
  try {
    const f = await (await h.getFileHandle(NOME_ARQUIVO_DADOS)).getFile()
    return await f.text()
  } catch (e) {
    if (e instanceof DOMException && e.name === 'NotFoundError') return null
    throw e
  }
}

export async function gravarArquivoNaPasta(h: PastaHandle, texto: string): Promise<void> {
  const w = await (await h.getFileHandle(NOME_ARQUIVO_DADOS, { create: true })).createWritable()
  await w.write(texto)
  await w.close()
}

// A "lembrança" da pasta (handle) só pode ser guardada no IndexedDB, não no localStorage.
const DB = 'fluxocaixa-pasta', LOJA = 'handles', CHAVE = 'dados'
const abrirDB = () => new Promise<IDBDatabase>((res, rej) => {
  const r = indexedDB.open(DB, 1)
  r.onupgradeneeded = () => r.result.createObjectStore(LOJA)
  r.onsuccess = () => res(r.result)
  r.onerror = () => rej(r.error)
})
const pedido = <T,>(req: IDBRequest<T>) => new Promise<T>((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error) })

export async function guardarHandle(h: PastaHandle | null, chave = CHAVE): Promise<void> {
  const db = await abrirDB()
  const tx = db.transaction(LOJA, 'readwrite')
  if (h) await pedido(tx.objectStore(LOJA).put(h, chave))
  else await pedido(tx.objectStore(LOJA).delete(chave))
  db.close()
}

export async function handleGuardado(chave = CHAVE): Promise<PastaHandle | null> {
  try {
    const db = await abrirDB()
    const h = await pedido(db.transaction(LOJA, 'readonly').objectStore(LOJA).get(chave))
    db.close()
    return (h as PastaHandle | undefined) ?? null
  } catch { return null }
}
