import { describe, expect, it } from 'vitest'
import { anoMesDaOS, limparNome, nomePastaOS, pastaDoTecnico, pastaExistente, precisaPasta, textoOsTxt } from '../pastasOS'
import type { OS } from '../../types'

const base = { numero: 28, tipologia: 'A413', endereco: { logradouro: 'Rua das Flores', numero: '10', bairro: 'Setor 03', cidade: 'JARU', uf: 'RO', cep: '' }, emissao: '2026-11-12' } as unknown as OS

describe('pasta da O.S. no OneDrive (12/11)', () => {
  it('nome como o usuário já usa', () => {
    expect(nomePastaOS(base)).toBe('OS-28 - A413 - JARU - SETOR 03 - RUA DAS FLORES')
    expect(limparNome('A/B: "C"?')).toBe('A B C')
  })
  it('ano e mês pelo recebimento', () => {
    expect(anoMesDaOS(base)).toEqual(['2026', 'NOVEMBRO'])
    expect(anoMesDaOS({ emissao: '2026-03-02' })).toEqual(['2026', 'MARÇO'])
  })
  it('acha a pasta do técnico e não repete pasta de O.S.', () => {
    expect(pastaDoTecnico(['1 - FULANO RT', '2 - OUTRO RT'], 'luan')).toBe('1 - FULANO RT')
    expect(pastaExistente(['OS-28 - A413 - X', 'OS-280 - B438'], 28)).toBe('OS-28 - A413 - X')
    expect(pastaExistente(['OS-280 - B438'], 28)).toBeUndefined()
  })
  it('só O.S. novas do dono da conta', () => {
    const o = { ...base, id: 'os-abc-luan-28', responsavel: 'luan', status: 'recebida' } as OS
    expect(precisaPasta(o)).toBe(true)
    expect(precisaPasta({ ...o, pasta: 'x' })).toBe(false)
    expect(precisaPasta({ ...o, id: 'pasta-luan-28' })).toBe(false)
    expect(precisaPasta({ ...o, id: 'os-3' })).toBe(false)
    expect(precisaPasta({ ...o, responsavel: 'rt' })).toBe(false)
  })
  it('OS.txt com o texto da Caixa ou a referência', () => {
    expect(textoOsTxt({ txtOriginal: 'TEXTO', referencia: 'R' })).toBe('TEXTO')
    expect(textoOsTxt({ referencia: 'R' })).toBe('R')
  })
})
