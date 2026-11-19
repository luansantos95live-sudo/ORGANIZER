/**
 * Importa para o sistema as O.S. das pastas do OneDrive (pedido de 12/11/2026).
 *
 *   node scripts/importar-pastas.ts <pasta "1 - ORDENS DE SERVIÇO"> <backup.json de saída> [complementos.json] [meses]
 *
 * Estrutura que já existe (não é criada nada): <técnico>/<ano>/<MÊS>/OS-<nº> - <tipologia> - <cidade> - <bairro> - <rua>/OS.txt
 *   técnicos: "1 - <NOME> RT" (luan) e "2 - <NOME DO RT> RT" (rt); o nome da pasta do luan vem de Dados/pastas.json; meses padrão: 2026/OUTUBRO,2026/NOVEMBRO.
 * O número da O.S. é o da pasta. Os dados vêm do OS.txt (leitor do SIOPI). A etapa sai do que a pasta tem
 * (laudo em PDF → Concluída; fotos da vistoria → Em Andamento; senão Recebida), a menos que o arquivo de
 * complementos diga outra coisa. Complementos (opcional) = { "<luan|rt>-<nº>": { status, proponente, ... } } para as
 * O.S. sem OS.txt completo. A saída é um backup só com O.S. (sem configurações): importado em Configurações › Backup,
 * troca as O.S. e mantém as configurações do navegador. Saída e complementos têm dados reais: deixe-os na pasta Dados
 * (fora do repositório).
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { lerSiopiTxt } from '../src/lib/siopi.ts'
import { montarOS, type NovaOSInput } from '../src/lib/os.ts'
import { montarBackup } from '../src/lib/backup.ts'
import type { OS, Responsavel, Status } from '../src/types.ts'

const [raiz, saida, arqComplementos, mesesArg] = process.argv.slice(2)
if (!raiz || !saida) {
  console.error('Uso: node scripts/importar-pastas.ts <pasta "1 - ORDENS DE SERVIÇO"> <saida.json> [complementos.json] [2026/OUTUBRO,2026/NOVEMBRO]')
  process.exit(1)
}
// Por enquanto só as O.S. do Luan (12/11: "não tem nada cadastrado pro Marco"); para incluir o Marco, acrescente
// ['<nome da pasta do Marco>', 'rt']. O nome da pasta do Luan sai de Dados/pastas.json (fora do repositório público).
const DADOS = join(dirname(fileURLToPath(import.meta.url)), '../../Dados')
const pastaLuan = basename((JSON.parse(readFileSync(join(DADOS, 'pastas.json'), 'utf8')) as { tecnico: string }).tecnico)
const TECNICOS: [string, Responsavel][] = [[pastaLuan, 'luan']]
const MESES = (mesesArg ?? '2026/OUTUBRO,2026/NOVEMBRO').split(',')
type Complemento = Partial<NovaOSInput> & { status?: Status; vistoria?: OS['vistoria']; concluidaEm?: string }
const complementos: Record<string, Complemento> = arqComplementos && existsSync(arqComplementos) ? JSON.parse(readFileSync(arqComplementos, 'utf8')) : {}

const dia = (ms: number) => new Date(ms).toISOString().slice(0, 10)
/** Arquivos (com data de modificação) dentro de uma pasta, procurando nas subpastas. */
function arquivos(p: string): { nome: string; mtime: number }[] {
  if (!existsSync(p)) return []
  const r: { nome: string; mtime: number }[] = []
  for (const n of readdirSync(p)) {
    const c = join(p, n), s = statSync(c)
    if (s.isDirectory()) r.push(...arquivos(c))
    else if (!/^desktop\.ini$|^\./i.test(n)) r.push({ nome: n, mtime: s.mtimeMs })
  }
  return r
}
/** OS.txt da Caixa: UTF-8 ou ISO-8859-1. */
function lerTxt(p: string): string {
  const b = readFileSync(p)
  const u = b.toString('utf8')
  return u.includes('�') ? b.toString('latin1') : u
}

const todas: OS[] = []
const refs = new Set<string>()
const relatorio: string[] = []
for (const [pastaTec, resp] of TECNICOS) {
  for (const mes of MESES) {
    const pastaMes = join(raiz, pastaTec, ...mes.split('/'))
    if (!existsSync(pastaMes)) continue
    for (const nome of readdirSync(pastaMes)) {
      const m = nome.match(/^OS-(\d+)\b/)
      if (!m || !statSync(join(pastaMes, nome)).isDirectory()) continue
      const numero = Number(m[1])
      const pasta = join(pastaMes, nome)
      const chave = `${resp}-${numero}`
      const extra = complementos[chave] ?? {}
      let texto = ''
      try { texto = existsSync(join(pasta, 'OS.txt')) ? lerTxt(join(pasta, 'OS.txt')) : '' } catch {
        relatorio.push(`PULEI ${chave} (${nome}): o OS.txt não abriu (o OneDrive ainda não baixou o arquivo?)`)
        continue
      }
      const r = lerSiopiTxt(texto)
      const laudos = arquivos(join(pasta, 'LAUDO')).filter((a) => /\.pdf$/i.test(a.nome))
      const fotos = arquivos(join(pasta, 'FOTOS VISTORIA'))
      const status: Status = extra.status ?? (laudos.length ? 'concluida' : fotos.length ? 'em_andamento' : 'recebida')
      const input: NovaOSInput = {
        referencia: r.referencia, tipologia: r.tipologia, responsavel: resp, proponente: (r.proponente || r.contato || 'SEM NOME').toUpperCase(), documento: r.documento,
        contato: (r.contato || r.proponente).toUpperCase(), telefone: r.telefone, endereco: r.endereco, matricula: r.matricula, valorServico: r.valorServico,
        valorDeslocamento: r.valorDeslocamento, emissao: r.emissao, prazo: r.prazo, descricao: r.descricao, importacao: r.importacao, status,
        ...extra,
      }
      if (!input.referencia) { relatorio.push(`PULEI ${chave} (${nome}): sem nº de referência`); continue }
      if (refs.has(input.referencia)) { relatorio.push(`PULEI ${chave}: referência repetida ${input.referencia}`); continue }
      refs.add(input.referencia)
      const o = montarOS(input, `pasta-${chave}`, numero, `Importada da pasta ${pastaTec}/${mes}`)
      o.status = status
      if (fotos.length && status !== 'recebida' && !o.vistoria) {
        o.vistoria = { data: dia(Math.min(...fotos.map((f) => f.mtime))), hora: '08:00', duracao: 40, feita: true }
      }
      if (extra.vistoria) o.vistoria = extra.vistoria
      if (status === 'concluida') {
        const fim = extra.concluidaEm ?? (laudos.length ? dia(Math.max(...laudos.map((a) => a.mtime))) : o.prazo)
        const hojeStr = dia(Date.now())
        o.concluidaEm = fim < o.emissao ? o.emissao : fim > hojeStr ? hojeStr : fim // nunca no futuro
        o.entregaEm = o.concluidaEm
      }
      todas.push(o)
      relatorio.push(`${chave.padEnd(8)} ${status.padEnd(13)} receb. ${o.emissao} vence ${o.prazo}${o.concluidaEm ? ` concl. ${o.concluidaEm}` : ''}${r.avisos.length && !extra.proponente ? `  [aviso: ${r.avisos.join(' ')}]` : ''}`)
    }
  }
}
todas.sort((a, b) => a.responsavel.localeCompare(b.responsavel) || a.numero - b.numero)
writeFileSync(saida, montarBackup({ os: todas, rotas: [], config: {}, fechamentos: {} }))
console.log(relatorio.join('\n'))
console.log(`\n${todas.length} O.S. gravadas em ${saida}`)
