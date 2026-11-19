/**
 * Registra nas O.S. reais o histórico de PEPT lido dos prints do SIOPI (pedido de 12/11/2026).
 *
 *   npx vite-node scripts/aplicar-pepts.ts ../Dados/os-reais.json ../Dados/pepts-reais.json
 *
 * pepts-reais.json = [{ os, tipo, motivo, aberta, resolvida?, resolucao?, reaberta? }] (datas yyyy-mm-dd; `os` = id da O.S.).
 * Usa as mesmas regras do sistema (abrir → cliente resolveu → reabrir; dias parados e prazo pela tipologia).
 * Grava as O.S. de volta em os-reais.json e a lista de atualizações em Dados/atualizacoes.json: o sistema de produção
 * (Dados/Fluxo_Caixa.html) aplica cada atualização uma vez só e apenas em O.S. que ainda não têm PEPT registrada,
 * sem mexer no resto do que o usuário já alterou. Os arquivos ficam em Dados (fora do repositório: dados reais).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { abrirPept, reabrirPeptNaOS, resolverPeptNaOS } from '../src/lib/pept.ts'
import type { OS, TipoPept } from '../src/types.ts'

const [arqOs, arqPepts] = process.argv.slice(2)
if (!arqOs || !arqPepts) {
  console.error('Uso: npx vite-node scripts/aplicar-pepts.ts <os-reais.json> <pepts-reais.json>')
  process.exit(1)
}
// corrigir: marca de correção (ex.: 'v2') — a atualização substitui a PEPT já registrada no navegador, uma vez
type Registro = { os: string; tipo: TipoPept; motivo: string; aberta: string; resolvida?: string; resolucao?: 'email' | 'manual'; reaberta?: string; corrigir?: string }
const backup = JSON.parse(readFileSync(arqOs, 'utf8')) as { os: OS[] }
const registros = JSON.parse(readFileSync(arqPepts, 'utf8')) as Registro[]
const atualizacoes: { id: string; osId: string; campos: Partial<OS>; forcar?: boolean }[] = []

for (const r of registros) {
  const i = backup.os.findIndex((o) => o.id === r.os)
  if (i < 0) { console.log(`NÃO ACHEI a O.S. ${r.os}`); continue }
  let o: OS = { ...backup.os[i], pepts: [], pausadoEm: undefined, diasPausado: 0 } // a PEPT é refeita do zero a partir do registro
  o = { ...o, ...abrirPept(o, { tipo: r.tipo, motivo: r.motivo, desde: r.aberta }, `pept-${r.os}-1`) }
  if (r.resolvida) {
    const p = resolverPeptNaOS(o, r.resolvida, r.resolucao ?? 'manual')
    if (!p) { console.log(`${r.os}: data de resolução inválida`); continue }
    o = { ...o, ...p }
  }
  if (r.reaberta) {
    const p = reabrirPeptNaOS(o, r.reaberta, `pept-${r.os}-2`)
    if (!p) { console.log(`${r.os}: data de reabertura inválida`); continue }
    o = { ...o, ...p }
  }
  const textoPausa = `Pausa: ${r.motivo} (desde ${r.aberta.split('-').reverse().slice(0, 2).join('/')})`
  o.historico = [...(o.historico ?? []).filter((h) => h.texto !== textoPausa), { data: `${r.aberta}T12:00:00.000Z`, texto: textoPausa }]
  backup.os[i] = o
  const campos: Partial<OS> = { pepts: o.pepts, diasPausado: o.diasPausado, historico: o.historico }
  ;(campos as Record<string, unknown>).pausadoEm = o.pausadoEm ?? null // null = sem pausa (undefined some no JSON)
  atualizacoes.push({ id: `pept-${r.os}-${r.aberta}${r.corrigir ? `-${r.corrigir}` : ''}`, osId: r.os, campos, ...(r.corrigir ? { forcar: true } : {}) })
  const a = o.pepts!.at(-1)!
  console.log(`${r.os}: ${o.pepts!.length} período(s); ${o.pausadoEm ? `pausada desde ${o.pausadoEm}` : `prazo contando (resolvida ${a.resolvidaEm ?? '-'})`}; dias parados ${o.diasPausado}`)
}
writeFileSync(arqOs, JSON.stringify(backup, null, 2))
writeFileSync(join(dirname(arqOs), 'atualizacoes.json'), JSON.stringify(atualizacoes, null, 2))
console.log(`${atualizacoes.length} atualização(ões) gravadas`)
