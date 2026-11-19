import { describe, expect, it } from 'vitest'
import { arquivoMaisNovo, lerDados, montarDados } from '../pastaDados'
import { gerarSeed, CONFIG_PADRAO } from '../../data/seed'
import { emailsExemplo } from '../emails'

describe('pasta de dados no OneDrive', () => {
  const seed = gerarSeed()
  const dados = { os: seed.os.slice(0, 3), rotas: [], config: CONFIG_PADRAO, fechamentos: {}, emails: emailsExemplo().slice(0, 2) }

  it('monta o arquivo com os e-mails e a hora e lê de volta', () => {
    const texto = montarDados(dados, '2026-11-10T15:00:00.000Z', 'PC de teste')
    const r = lerDados(texto)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.dados.os).toHaveLength(3)
    expect(r.dados.emails).toHaveLength(2)
    expect(r.dados.salvoEm).toBe('2026-11-10T15:00:00.000Z')
    expect(r.dados.salvoPor).toBe('PC de teste')
    expect(r.resumo).toMatch(/3 O\.S\./)
  })

  it('recusa arquivo sem a hora de gravação ou inválido', () => {
    const semHora = JSON.stringify({ versao: 2, os: [], rotas: [], config: {}, fechamentos: {} })
    expect(lerDados(semHora).ok).toBe(false)
    expect(lerDados('{').ok).toBe(false)
  })

  it('o arquivo da pasta só substitui os dados quando é mais novo que o último gravado aqui', () => {
    expect(arquivoMaisNovo('2026-11-10T15:00:00.000Z', undefined)).toBe(true)
    expect(arquivoMaisNovo('2026-11-10T15:00:00.000Z', '2026-11-10T14:00:00.000Z')).toBe(true)
    expect(arquivoMaisNovo('2026-11-10T15:00:00.000Z', '2026-11-10T15:00:00.000Z')).toBe(false)
    expect(arquivoMaisNovo('2026-11-10T14:00:00.000Z', '2026-11-10T15:00:00.000Z')).toBe(false)
    expect(arquivoMaisNovo('lixo', undefined)).toBe(false)
  })
})
