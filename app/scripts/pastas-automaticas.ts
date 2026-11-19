/**
 * Pastas automáticas das O.S. (12/11/2026, "faça acontecer sozinho" até existir o agente da versão web).
 * Roda no PC do usuário pela tarefa agendada do Windows (a cada 5 min, escondida; ferramentas/pastas-automaticas.vbs):
 *   1. busca no script do Gmail (Dados/gmail.json) as convocações da Caixa depois de `ativoDesde`, do polo escolhido;
 *   2. vê quais referências já têm pasta (procura a referência nos OS.txt das pastas do técnico);
 *   3. para cada convocação nova cria <técnico>/<ano>/<MÊS>/OS-<próximo nº> - TIP - CIDADE - BAIRRO - RUA com o OS.txt
 *      (texto da Caixa) e as subpastas DOCUMENTOS SIOPI, FOTOS VISTORIA e LAUDO.
 * O número segue a mesma regra do sistema (o maior número do técnico + 1, em ordem de chegada dos e-mails).
 * Nunca apaga nem sobrescreve. Caminhos e senha vêm de Dados/ (fora do repositório).
 *
 *   npx vite-node scripts/pastas-automaticas.ts            (cria)
 *   npx vite-node scripts/pastas-automaticas.ts --teste    (só mostra)
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { lerSiopiTxt } from '../src/lib/siopi.ts'
import { poloDe } from '../src/lib/os.ts'
import { anoMesDaOS, MESES, nomePastaOS, pastaExistente, SUBPASTAS } from '../src/lib/pastasOS.ts'

const DADOS = resolve(import.meta.dirname ?? '.', '..', '..', 'Dados')
const teste = process.argv.includes('--teste')
const log = (t: string) => { console.log(t); if (!teste) appendFileSync(join(DADOS, 'pastas-automaticas.log'), `${new Date().toISOString()} ${t}\n`) }

// Dados/pastas.json: { "tecnico": "<caminho da pasta do técnico>", "inicio": "2026-10" } (numeração conta a partir deste mês)
const cfg = JSON.parse(readFileSync(join(DADOS, 'pastas.json'), 'utf8')) as { tecnico: string; inicio: string }
const g = JSON.parse(readFileSync(join(DADOS, 'gmail.json'), 'utf8')) as { url: string; token: string; ativoDesde: string; polos?: string[] }

/** Pastas "OS-N …" do técnico, do mês de início em diante: número, referência do OS.txt. */
function pastasDoTecnico() {
  const r: { numero: number; ref: string; mesDir: string }[] = []
  for (const ano of readdirSync(cfg.tecnico).filter((a) => /^\d{4}$/.test(a))) {
    for (const mes of readdirSync(join(cfg.tecnico, ano))) {
      const i = MESES.indexOf(mes)
      if (i < 0 || `${ano}-${String(i + 1).padStart(2, '0')}` < cfg.inicio) continue
      const dirMes = join(cfg.tecnico, ano, mes)
      for (const n of readdirSync(dirMes)) {
        const m = n.match(/^OS-(\d+)\b/)
        if (!m || !statSync(join(dirMes, n)).isDirectory()) continue
        let ref = ''
        try { ref = readFileSync(join(dirMes, n, 'OS.txt'), 'latin1').match(/\d{4}\.\d{4}\.\d{6,9}\/\d{4}\.\d{2}\.\d{2}/)?.[0] ?? '' } catch { /* sem OS.txt */ }
        r.push({ numero: Number(m[1]), ref, mesDir: dirMes })
      }
    }
  }
  return r
}

try {
  const resp = await fetch(`${g.url}?token=${encodeURIComponent(g.token)}&desde=${encodeURIComponent(g.ativoDesde)}`, { redirect: 'follow' })
  const j = (await resp.json()) as { ok?: boolean; erro?: string; emails?: { recebidoEm: string; anexo?: { texto: string } }[] }
  if (!j.emails) throw new Error(j.erro ?? 'resposta sem e-mails')
  const novos = j.emails.filter((e) => e.anexo && e.recebidoEm >= g.ativoDesde).sort((a, b) => a.recebidoEm.localeCompare(b.recebidoEm))
  const existentes = pastasDoTecnico()
  const refs = new Set(existentes.map((p) => p.ref).filter(Boolean))
  let ultimo = Math.max(0, ...existentes.map((p) => p.numero))
  for (const e of novos) {
    const x = lerSiopiTxt(e.anexo!.texto)
    if (!x.referencia || refs.has(x.referencia)) continue
    if (g.polos?.length && !g.polos.includes(poloDe(x.endereco.cidade))) continue // outro polo: o sistema ignora
    const numero = ++ultimo
    const o = { numero, tipologia: x.tipologia, endereco: x.endereco, emissao: x.emissao }
    const [ano, mes] = anoMesDaOS(o)
    const dirMes = join(cfg.tecnico, ano, mes)
    if (existsSync(dirMes) && pastaExistente(readdirSync(dirMes), numero)) { log(`OS-${numero} já tem pasta em ${mes}, pulei ${x.referencia}`); continue }
    const nome = nomePastaOS(o as Parameters<typeof nomePastaOS>[0])
    refs.add(x.referencia)
    if (teste) { log(`(teste) criaria ${ano}/${mes}/${nome}`); continue }
    const d = join(dirMes, nome)
    for (const s of SUBPASTAS) mkdirSync(join(d, s), { recursive: true })
    writeFileSync(join(d, 'OS.txt'), e.anexo!.texto)
    log(`criada ${ano}/${mes}/${nome} (${x.referencia})`)
  }
} catch (e) {
  log(`ERRO: ${e instanceof Error ? e.message : String(e)}`)
}
