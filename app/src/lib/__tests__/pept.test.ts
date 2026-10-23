import { describe, expect, it } from 'vitest'
import { abrirPept, editarDatasPeptNaOS, encerrarPeptNaOS, etapaAoFinalizarPept, fecharPept, motivoDoHistorico, peptAberta, peptEmAnalise, peptsDaOS, periodosDaPept, prazosDaPept, reabrirPeptNaOS, resolverPeptNaOS, resumoPept, ultimaFinalizada } from '../pept'
import type { OS } from '../../types'

// sem data de recebimento: os testes de registro não dependem da regra dos 2 dias (ela tem testes próprios abaixo)
const mk = (extra: Partial<OS> = {}) => ({ id: 'x', status: 'em_andamento', tipologia: 'E401', prazo: '2026-10-30', diasPausado: 0, historico: [], ...extra }) as OS

describe('registro de PEPT', () => {
  it('abrir guarda tipo, pendência e início, e pausa o prazo', () => {
    const p = abrirPept(mk(), { tipo: 'documental', motivo: 'Falta ART/RRT', desde: '2026-10-10' }, 'p1')
    expect(p.pausadoEm).toBe('2026-10-10')
    expect(p.pepts).toEqual([{ id: 'p1', tipo: 'documental', motivo: 'Falta ART/RRT', inicio: '2026-10-10' }])
  })
  it('resolver fecha a PEPT em aberto com os dias parados e como foi resolvida', () => {
    const o = mk({ pausadoEm: '2026-10-10', pepts: [{ id: 'p1', tipo: 'vistoria', motivo: 'Sem acesso', inicio: '2026-10-10' }] })
    const r = fecharPept(o, new Date(2026, 9, 15), 'email')
    // o dia do cadastro e o da resolução contam como prazo: 11, 12, 13 e 14 ficam parados
    expect(r).toMatchObject({ pausadoEm: undefined, diasPausado: 4 })
    expect(r.pepts![0]).toMatchObject({ fim: '2026-10-15', dias: 4, resolvidaPor: 'email' })
  })
  it('B438 segura o prazo no máximo 21 dias', () => {
    const o = mk({ tipologia: 'B438', pausadoEm: '2026-09-01' })
    expect(fecharPept(o, new Date(2026, 9, 20), 'manual').diasPausado).toBe(21)
  })
  it('dado antigo (só pausadoEm) vira PEPT em aberto com a pendência da linha do tempo', () => {
    const o = mk({ pausadoEm: '2026-10-18', historico: [{ data: '2026-10-18T10:00:00Z', texto: 'Pausa solicitada: aguardando documento do cliente' }] })
    expect(peptsDaOS(o)).toEqual([{ id: 'pept-2026-10-18', motivo: 'aguardando documento do cliente', inicio: '2026-10-18' }])
    expect(peptAberta(o)?.inicio).toBe('2026-10-18')
    expect(peptAberta(mk())).toBeUndefined()
  })
  it('O.S. reaberta no dia informado encerra a PEPT nesse dia', () => {
    const o = mk({ pausadoEm: '2026-10-10', pepts: [{ id: 'p1', tipo: 'documental', motivo: 'Falta ART', inicio: '2026-10-10' }] })
    expect(fecharPept(o, new Date(2026, 9, 14), 'reaberta').pepts![0]).toMatchObject({ fim: '2026-10-14', dias: 3, resolvidaPor: 'reaberta' })
  })
  it('editar as datas recalcula os dias parados e o prazo', () => {
    const o = mk({ diasPausado: 3, pepts: [{ id: 'p1', motivo: 'x', inicio: '2026-10-01', fim: '2026-10-05', dias: 3, resolvidaPor: 'reaberta' }] })
    // reaberta em 10/10 em vez de 05/10: 02 a 09 parados = 8 dias
    expect(editarDatasPeptNaOS(o, 'p1', { fim: '2026-10-10' })).toMatchObject({ diasPausado: 8, pepts: [{ fim: '2026-10-10', dias: 8 }] })
    // em aberto: mudar a abertura muda o dia em que o prazo parou
    const a = mk({ pausadoEm: '2026-10-10', pepts: [{ id: 'p2', motivo: 'y', inicio: '2026-10-10' }] })
    expect(editarDatasPeptNaOS(a, 'p2', { inicio: '2026-10-08' })).toMatchObject({ pausadoEm: '2026-10-08', pepts: [{ inicio: '2026-10-08' }] })
    // encerramento antes da abertura não vale
    expect(editarDatasPeptNaOS(o, 'p1', { fim: '2026-09-20' })).toBeNull()
  })
  it('reabrir a PEPT finalizada: volta a ficar em aberto com o mesmo motivo, desde o dia informado', () => {
    const o = mk({ diasPausado: 3, pepts: [{ id: 'p1', tipo: 'documental', motivo: 'Falta ART', inicio: '2026-10-01', fim: '2026-10-05', dias: 3, resolvidaPor: 'manual' }] })
    expect(ultimaFinalizada(o)?.id).toBe('p1')
    const r = reabrirPeptNaOS(o, '2026-10-12', 'p2')!
    expect(r).toMatchObject({ pausadoEm: '2026-10-12', diasPausado: 3 })
    expect(r.pepts[1]).toEqual({ id: 'p2', tipo: 'documental', motivo: 'Falta ART', inicio: '2026-10-12', reabertaDe: 'p1' })
    expect(peptAberta({ ...o, ...r })?.motivo).toBe('Falta ART')
    expect(reabrirPeptNaOS(o, '2026-10-03', 'p3')).toBeNull() // antes de ter sido finalizada
  })
  it('reabrir a PEPT em aberto: o período anterior fecha no dia e ela continua aberta com o mesmo motivo', () => {
    const o = mk({ pausadoEm: '2026-10-10', pepts: [{ id: 'p1', tipo: 'vistoria', motivo: 'Sem acesso', inicio: '2026-10-10' }] })
    const r = reabrirPeptNaOS(o, '2026-10-15', 'p2')!
    // 11 a 14 parados no período anterior = 4 dias; a PEPT segue aberta desde 15/10
    expect(r).toMatchObject({ pausadoEm: '2026-10-15', diasPausado: 4 })
    expect(r.pepts[0]).toMatchObject({ fim: '2026-10-15', dias: 4, resolvidaPor: 'reaberta' })
    expect(r.pepts[1]).toEqual({ id: 'p2', tipo: 'vistoria', motivo: 'Sem acesso', inicio: '2026-10-15', reabertaDe: 'p1' })
  })
  it('prazo antes e depois da PEPT', () => {
    // prazo da Caixa 30/10; uma PEPT antiga já empurrou 2 dias (prazo antes desta = 01/11)
    const antiga = { id: 'v', motivo: 'velha', inicio: '2026-09-01', fim: '2026-09-04', dias: 2, resolvidaPor: 'manual' as const }
    // finalizada: esta parou 5 dias → depois = 06/11 (é o que vale no cartão)
    const fin = mk({ diasPausado: 7, pepts: [antiga, { id: 'p1', motivo: 'x', inicio: '2026-10-10', fim: '2026-10-16', dias: 5, resolvidaPor: 'manual' }] })
    expect(prazosDaPept(fin)).toEqual({ antes: '2026-11-01', depois: '2026-11-06', dias: 5, aberta: false })
    // reaberta: o período anterior (3 dias) e o atual em aberto contam juntos; "depois" = se finalizar hoje (22/10: 3 dias)
    const reab = mk({ diasPausado: 5, pausadoEm: '2026-10-18', pepts: [antiga, { id: 'p1', motivo: 'x', inicio: '2026-10-10', fim: '2026-10-14', dias: 3, resolvidaPor: 'reaberta' }, { id: 'p2', motivo: 'x', inicio: '2026-10-18', reabertaDe: 'p1' }] })
    expect(prazosDaPept(reab, new Date(2026, 9, 22))).toEqual({ antes: '2026-11-01', depois: '2026-11-07', dias: 6, aberta: true })
    // A413 em aberto: depois indeterminado
    expect(prazosDaPept(mk({ tipologia: 'A413', pausadoEm: '2026-10-20' }), new Date(2026, 9, 22))?.depois).toBeNull()
    expect(prazosDaPept(mk())).toBeNull()
  })
  it('lê a pendência do texto novo da linha do tempo', () => {
    expect(motivoDoHistorico({ historico: [{ data: '', texto: 'Pausa (PEPT documental): Falta ART/RRT (desde 10/10)' }] })).toBe('Falta ART/RRT')
  })
  it('resumo: em aberto há quantos dias, limite da tipologia e total parado', () => {
    const o = mk({ tipologia: 'B437', pausadoEm: '2026-10-10', diasPausado: 3, pepts: [{ id: 'a', motivo: '', inicio: '2026-09-01', fim: '2026-09-05', dias: 3 }, { id: 'b', tipo: 'vistoria', motivo: 'x', inicio: '2026-10-10' }] })
    expect(resumoPept(o, new Date(2026, 9, 22))).toMatchObject({ total: 2, diasParados: 3, aberta: { dias: 12, limite: 21, restam: 9, indeterminado: false } })
    expect(resumoPept(mk({ tipologia: 'A413', pausadoEm: '2026-10-20' }), new Date(2026, 9, 22)).aberta).toMatchObject({ indeterminado: true, limite: undefined })
  })
})

describe('a PEPT só pausa o prazo se aberta até 2 dias depois do recebimento', () => {
  // O.S. recebida em 08/10: pode abrir PEPT que pausa até 10/10
  const rec = (extra: Partial<OS> = {}) => mk({ emissao: '2026-10-08', prazo: '2026-10-14', ...extra })
  it('aberta no 2º dia (10/10): pausa e empurra o prazo', async () => {
    const { prazoEfetivo, limiteParaPausar } = await import('../os')
    expect(limiteParaPausar('2026-10-08')).toBe('2026-10-10')
    const o = rec({ pausadoEm: '2026-10-10', pepts: [{ id: 'p1', motivo: 'x', inicio: '2026-10-10' }] })
    expect(prazoEfetivo(o, new Date(2026, 9, 15))).toBe('2026-10-18') // 11 a 14 parados = 4 dias
    expect(fecharPept(o, new Date(2026, 9, 15), 'manual').diasPausado).toBe(4)
  })
  it('aberta no 3º dia (11/10): fica registrada, mas o prazo continua correndo', async () => {
    const { prazoEfetivo, pausaValida } = await import('../os')
    const o = rec({ pausadoEm: '2026-10-11', pepts: [{ id: 'p1', motivo: 'x', inicio: '2026-10-11' }] })
    expect(pausaValida(o)).toBe(false)
    expect(prazoEfetivo(o, new Date(2026, 9, 20))).toBe('2026-10-14')
    expect(fecharPept(o, new Date(2026, 9, 20), 'manual')).toMatchObject({ diasPausado: 0, pepts: [{ dias: 0 }] })
  })
  it('a reabertura segue a PEPT original', async () => {
    const { pausaValida } = await import('../os')
    const o = rec({ pausadoEm: '2026-10-20', pepts: [{ id: 'p1', motivo: 'x', inicio: '2026-10-09', fim: '2026-10-12', dias: 2 }, { id: 'p2', motivo: 'x', inicio: '2026-10-20', reabertaDe: 'p1' }] })
    expect(pausaValida(o)).toBe(true)
  })
})

describe('fluxo do usuário: abre → cliente resolve → reabre → cliente resolve → valida', () => {
  it('o prazo só para quando a PEPT é aberta/reaberta e volta a contar quando o cliente resolve', async () => {
    const { prazoEfetivo } = await import('../os')
    // prazo da Caixa 30/10; PEPT aberta em 10/10
    let o = mk({ ...abrirPept(mk(), { tipo: 'documental', motivo: 'Falta ART', desde: '2026-10-10' }, 'p1') })
    // cliente resolve em 14/10 (e-mail): 11, 12 e 13 parados = 3 dias; a PEPT fica aberta, em análise
    o = { ...o, ...resolverPeptNaOS(o, '2026-10-14', 'email')! }
    expect(o.pausadoEm).toBeUndefined()
    expect(o.diasPausado).toBe(3)
    expect(peptEmAnalise(o)).toBe(true)
    expect(peptAberta(o)).toMatchObject({ resolvidaEm: '2026-10-14', resolucao: 'email', dias: 3 })
    expect(prazoEfetivo(o, new Date(2026, 9, 16))).toBe('2026-11-02') // contando de novo
    // analiso e reabro em 18/10 (não resolveu tudo): de 14 a 18 os dias contam no prazo; para de novo em 18/10
    o = { ...o, ...reabrirPeptNaOS(o, '2026-10-18', 'p2')! }
    expect(o.pausadoEm).toBe('2026-10-18')
    expect(o.diasPausado).toBe(3)
    expect(o.pepts![0]).toMatchObject({ fim: '2026-10-18', resolvidaPor: 'reaberta' })
    expect(o.pepts![1]).toMatchObject({ inicio: '2026-10-18', motivo: 'Falta ART', reabertaDe: 'p1' })
    // cliente resolve de novo em 22/10 (à mão): 19, 20 e 21 parados = +3
    o = { ...o, ...resolverPeptNaOS(o, '2026-10-22', 'manual')! }
    expect(o.diasPausado).toBe(6)
    // valido em 25/10: a PEPT encerra e o prazo NÃO muda
    const antes = prazoEfetivo(o, new Date(2026, 9, 25))
    o = { ...o, ...encerrarPeptNaOS(o, '2026-10-25', 'manual') }
    expect(peptAberta(o)).toBeUndefined()
    expect(o.diasPausado).toBe(6)
    expect(prazoEfetivo(o, new Date(2026, 9, 25))).toBe(antes)
    expect(antes).toBe('2026-11-05')
  })
  it('validar sem o cliente ter resolvido: o dia da validação vale como resolução', () => {
    const o = mk({ pausadoEm: '2026-10-10', pepts: [{ id: 'p1', motivo: 'x', inicio: '2026-10-10' }] })
    expect(encerrarPeptNaOS(o, '2026-10-15', 'manual')).toMatchObject({ diasPausado: 4, pepts: [{ resolvidaEm: '2026-10-15', fim: '2026-10-15', dias: 4 }] })
  })
  it('editar a data de resolução recalcula os dias parados', () => {
    const o = mk({ diasPausado: 3, pepts: [{ id: 'p1', motivo: 'x', inicio: '2026-10-10', resolvidaEm: '2026-10-14', dias: 3 }] })
    expect(editarDatasPeptNaOS(o, 'p1', { resolvidaEm: '2026-10-16' })).toMatchObject({ diasPausado: 5, pepts: [{ resolvidaEm: '2026-10-16', dias: 5 }] })
    expect(editarDatasPeptNaOS(o, 'p1', { resolvidaEm: '2026-10-08' })).toBeNull()
  })
})

describe('histórico da PEPT reaberta', () => {
  it('lista os períodos da primeira abertura até a reabertura atual', () => {
    const o = mk({ pausadoEm: '2026-10-17', pepts: [
      { id: 'a', motivo: 'x', inicio: '2026-10-05', resolvidaEm: '2026-10-08', fim: '2026-10-10', dias: 2, resolvidaPor: 'reaberta' },
      { id: 'b', motivo: 'x', inicio: '2026-10-10', resolvidaEm: '2026-10-12', fim: '2026-10-17', dias: 1, resolvidaPor: 'reaberta', reabertaDe: 'a' },
      { id: 'c', motivo: 'x', inicio: '2026-10-17', reabertaDe: 'b' },
      { id: 'z', motivo: 'outra', inicio: '2026-09-01', fim: '2026-09-03', dias: 1 },
    ] })
    expect(periodosDaPept(o, o.pepts![2]).map((p) => p.id)).toEqual(['a', 'b', 'c'])
    expect(periodosDaPept(o, o.pepts![3]).map((p) => p.id)).toEqual(['z'])
  })
})

describe('PEPT finalizada: a O.S. volta para Em Andamento', () => {
  it('recebida vai para em andamento; etapas à frente não voltam', () => {
    expect(etapaAoFinalizarPept('recebida')).toBe('em_andamento')
    expect(etapaAoFinalizarPept('em_andamento')).toBe('em_andamento')
    expect(etapaAoFinalizarPept('assinatura_pendente')).toBe('assinatura_pendente')
  })
})
