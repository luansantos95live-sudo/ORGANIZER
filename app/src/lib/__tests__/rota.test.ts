import { describe, expect, it } from 'vitest'
import { agruparPorBairro, conflitos, fmtMin, ordenarPorHora, preencherHorarios, resumoRota, toHHMM, toMin } from '../rota'
import type { OS, Parada } from '../../types'

const os = (id: string, bairro: string, cidade = 'Ji-Paraná') => ({ id, endereco: { bairro, cidade } }) as unknown as OS
const mapa: Record<string, OS> = { a: os('a', 'Centro'), b: os('b', 'Urupá'), c: os('c', 'Centro'), d: os('d', 'Setor 02', 'Jaru') }
const byId = (id: string) => mapa[id]
const p = (osId: string, inicio: string, duracao = 30, deslocamento = 20): Parada => ({ osId, inicio, duracao, deslocamento })

describe('horas', () => {
  it('converte ida e volta', () => {
    expect(toMin('08:45')).toBe(525)
    expect(toHHMM(525)).toBe('08:45')
    expect(toHHMM(1500)).toBe('01:00')
    expect(fmtMin(75)).toBe('1h15')
    expect(fmtMin(45)).toBe('45 min')
  })
})

describe('rota', () => {
  it('agrupa por bairro mantendo a ordem interna de cada bairro', () => {
    const r = agruparPorBairro([p('a', '08:00'), p('b', '09:00'), p('c', '10:00')], byId)
    expect(r.map((x) => x.osId)).toEqual(['a', 'c', 'b'])
  })
  it('mantém a mesma cidade junta e ordena cidades pela hora mais cedo, não pelo alfabeto', () => {
    // Jaru (d) às 08:00 vem antes de Ji-Paraná (a) às 09:00, mesmo que "Ji" venha depois de "Ja" só por acaso
    expect(agruparPorBairro([p('a', '09:00'), p('d', '08:00')], byId).map((x) => x.osId)).toEqual(['d', 'a'])
    // inverte as horas: agora Ji-Paraná vem primeiro, o que prova que não é ordem alfabética
    expect(agruparPorBairro([p('d', '09:00'), p('a', '08:00')], byId).map((x) => x.osId)).toEqual(['a', 'd'])
  })
  it('não separa a mesma cidade para encaixar outra no meio', () => {
    const r = agruparPorBairro([p('a', '08:00'), p('d', '09:00'), p('b', '10:00')], byId)
    expect(r.map((x) => x.osId)).toEqual(['a', 'b', 'd'])
  })
  it('ordena por hora sem mexer no original', () => {
    const orig = [p('a', '10:00'), p('b', '08:00')]
    expect(ordenarPorHora(orig).map((x) => x.osId)).toEqual(['b', 'a'])
    expect(orig[0].osId).toBe('a')
  })
  it('preenche horários em cascata com duração mais deslocamento', () => {
    const r = preencherHorarios([p('a', '00:00', 30, 20), p('b', '00:00', 45, 10)], '08:00')
    expect(r.map((x) => x.inicio)).toEqual(['08:00', '08:50'])
  })
  it('detecta sobreposição entre paradas seguidas', () => {
    const r = conflitos([p('a', '08:00', 30, 20), p('b', '08:30', 30, 0)])
    expect(r).toEqual([{ idx: 1, comIdx: 0, minutos: 20 }])
    expect(conflitos([p('a', '08:00', 30, 20), p('b', '09:00', 30, 0)])).toEqual([])
  })
  it('resume a rota', () => {
    const r = resumoRota([p('a', '08:00', 30, 20), p('b', '09:00', 45, 0)])
    expect(r).toMatchObject({ inicio: '08:00', fim: '09:45', vistoriaMin: 75, deslocMin: 20 })
    expect(resumoRota([]).totalMin).toBe(0)
  })
})
