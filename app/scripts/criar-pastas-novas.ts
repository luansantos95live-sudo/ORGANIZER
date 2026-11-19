import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { lerSiopiTxt } from '../src/lib/siopi.ts'
import { poloDe } from '../src/lib/os.ts'
import { anoMesDaOS, nomePastaOS, pastaExistente, SUBPASTAS } from '../src/lib/pastasOS.ts'

// Pasta do técnico e Gmail vêm de Dados/ (fora do repositório público): pastas.json { tecnico } e gmail.json.
const DADOS = join(dirname(fileURLToPath(import.meta.url)), '../../Dados')
const RAIZ = (JSON.parse(readFileSync(join(DADOS, 'pastas.json'), 'utf8')) as { tecnico: string }).tecnico
const g = JSON.parse(readFileSync(join(DADOS, 'gmail.json'), 'utf8'))
const r = await fetch(`${g.url}?token=${encodeURIComponent(g.token)}&desde=${encodeURIComponent(g.ativoDesde)}`, { redirect: 'follow' })
const emails = ((await r.json()).emails as { recebidoEm: string; anexo?: { texto: string } }[])
  .filter((e) => e.anexo && e.recebidoEm >= g.ativoDesde).sort((a, b) => a.recebidoEm.localeCompare(b.recebidoEm))
let numero = Number(process.argv[2])
const gravar = process.argv[3] === 'gravar'
for (const e of emails) {
  const x = lerSiopiTxt(e.anexo!.texto)
  if (poloDe(x.endereco.cidade) !== 'ARIQUEMES') { console.log('outro polo, ignorada:', x.endereco.cidade); continue }
  const o = { numero, tipologia: x.tipologia, endereco: x.endereco, emissao: x.emissao }
  const [ano, mes] = anoMesDaOS(o)
  const dirMes = join(RAIZ, ano, mes)
  const ja = existsSync(dirMes) ? pastaExistente(readdirSync(dirMes), numero) : undefined
  const nome = nomePastaOS(o as never)
  console.log(`OS-${numero}`, x.referencia, x.tipologia, ja ? `JÁ EXISTE: ${ja}` : `criar: ${mes}/${nome}`)
  if (gravar && !ja) {
    const d = join(dirMes, nome)
    for (const s of SUBPASTAS) mkdirSync(join(d, s), { recursive: true })
    writeFileSync(join(d, 'OS.txt'), e.anexo!.texto)
  }
  numero++
}
