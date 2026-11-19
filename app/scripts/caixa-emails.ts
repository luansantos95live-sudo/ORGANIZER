/**
 * Ponte Gmail → sistema (pedido de 10/11): junta os e-mails brutos da Caixa que o Claude baixou do Gmail
 * no arquivo emails.json da pasta "Caixa de entrada", que o usuário importa na aba E-mails.
 *
 *   node scripts/caixa-emails.ts <pasta com os brutos> <emails.json de saída>
 *
 * Cada bruto é um .json como o `get_message` do Gmail devolve no formato RAW: { id, internalDate, raw } (raw em base64url).
 * E-mails já presentes no emails.json (mesmo id) não são repetidos. Nada aqui vai para o repositório:
 * a pasta "Caixa de entrada" está no .gitignore (dados reais de clientes).
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { emailDoGmail } from '../src/lib/mime.ts'
import type { Email } from '../src/lib/emails.ts'

const [pasta, saida] = process.argv.slice(2)
if (!pasta || !saida) {
  console.error('Uso: node scripts/caixa-emails.ts <pasta com os brutos> <emails.json de saída>')
  process.exit(1)
}

const atuais: Email[] = existsSync(saida) ? (JSON.parse(readFileSync(saida, 'utf8')) as Email[]) : []
const ids = new Set(atuais.map((e) => e.id))
const novos: Email[] = []
let ignorados = 0
type Bruto = { id?: string; internalDate?: string | number; raw?: string }
for (const nome of readdirSync(pasta).filter((n) => n.toLowerCase().endsWith('.json'))) {
  // cada arquivo é um bruto ou uma lista de brutos (lote)
  const lido = JSON.parse(readFileSync(join(pasta, nome), 'utf8')) as Bruto | Bruto[]
  for (const bruto of Array.isArray(lido) ? lido : [lido]) {
    if (!bruto.id || !bruto.raw) { console.warn(`${nome}: item sem id/raw, pulado`); continue }
    const e = emailDoGmail(bruto.id, bruto.raw, bruto.internalDate)
    if (ids.has(e.id)) { ignorados++; continue }
    ids.add(e.id)
    novos.push(e)
  }
}
const todos = [...novos, ...atuais].sort((a, b) => b.recebidoEm.localeCompare(a.recebidoEm))
mkdirSync(dirname(saida), { recursive: true })
writeFileSync(saida, JSON.stringify(todos, null, 2), 'utf8')
console.log(`${novos.length} novo(s), ${ignorados} já estavam · ${todos.length} no arquivo → ${saida}`)
for (const e of novos) console.log(`  + ${e.recebidoEm.slice(0, 10)} ${e.de} · ${e.assunto}${e.anexo ? ' · com .txt' : ''}`)
