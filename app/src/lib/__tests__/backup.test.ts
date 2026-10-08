import { describe, expect, it } from 'vitest'
import { lerBackup, montarBackup } from '../backup'
import type { OS } from '../../types'

const os = (ref: string, extra: Record<string, unknown> = {}) => ({ id: 'id-' + ref, referencia: ref, status: 'emitida', valorServico: 100, valorDeslocamento: 0, endereco: { bairro: 'Centro' }, ...extra }) as unknown as OS

describe('backup', () => {
  it('exporta e reimporta sem perder nada', () => {
    const dados = { os: [os('A'), os('B', { status: 'finalizada' })], rotas: [], config: { metaMensal: 9000 }, fechamentos: { '2026-10': { extratoTotal: 1234.5 } } }
    const r = lerBackup(montarBackup(dados))
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.dados.os).toHaveLength(2)
      expect(r.dados.config.metaMensal).toBe(9000)
      expect(r.dados.fechamentos['2026-10'].extratoTotal).toBe(1234.5)
      expect(r.resumo).toContain('2 O.S.')
    }
  })
  it('recusa JSON inválido', () => {
    expect(lerBackup('{ nao é json')).toEqual({ ok: false, erro: 'O arquivo não é um JSON válido.' })
  })
  it('recusa versão desconhecida e arquivo sem O.S.', () => {
    expect(lerBackup(JSON.stringify({ versao: 99, os: [] })).ok).toBe(false)
    expect(lerBackup(JSON.stringify({ versao: 1 })).ok).toBe(false)
    expect(lerBackup('[]').ok).toBe(false)
  })
  it('recusa status desconhecido, valor inválido e referência repetida', () => {
    const base = (lista: unknown[]) => JSON.stringify({ versao: 1, os: lista })
    expect(lerBackup(base([os('A', { status: 'xpto' })])).ok).toBe(false)
    expect(lerBackup(base([os('A', { valorServico: 'cem' })])).ok).toBe(false)
    expect(lerBackup(base([os('A'), os('A', { id: 'outro' })])).ok).toBe(false)
    expect(lerBackup(base([os('A', { endereco: null })])).ok).toBe(false)
  })
  it('config e fechamentos ausentes viram vazios', () => {
    const r = lerBackup(JSON.stringify({ versao: 1, os: [os('A')] }))
    expect(r.ok && r.dados.config).toEqual({})
    expect(r.ok && r.dados.fechamentos).toEqual({})
  })
})
