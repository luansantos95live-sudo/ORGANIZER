import { describe, expect, it } from 'vitest'
import { CORES_POSTIT, POSTITS_PADRAO, comPostitsPadrao, corDe, coresBloqueadas, proximaCor, semCoresRepetidas, editarPostit, inclinacao, novoPostit, removerItem } from '../anotacoes'

describe('quadro de post-its', () => {
  it('cola o novo no começo, com texto limpo e cor', () => {
    const a = novoPostit(undefined, '  pagar boleto ', 'azul')
    const b = novoPostit(a, '')
    expect(b.map((i) => i.texto)).toEqual(['', 'pagar boleto'])
    expect(corDe(b[0])).toBe('amarelo')
    expect(corDe(b[1])).toBe('azul')
  })
  it('edita texto e cor e apaga', () => {
    let l = novoPostit([], 'a')
    l = editarPostit(l, l[0].id, { texto: 'b', cor: 'rosa' })
    expect(l[0]).toMatchObject({ texto: 'b', cor: 'rosa' })
    expect(removerItem(l, l[0].id)).toEqual([])
  })
  it('cor desconhecida vira amarelo e a inclinação é sempre a mesma', () => {
    expect(corDe({ cor: 'roxo' })).toBe('amarelo')
    expect(inclinacao('an-1')).toBe(inclinacao('an-1'))
    expect(Math.abs(inclinacao('xyz'))).toBeLessThanOrEqual(1.6)
  })
})

describe('post-its padrão', () => {
  it('põe 4, um de cada cor, uma vez só', () => {
    const a = comPostitsPadrao({})
    expect(a.lembretes.map((i) => i.cor)).toEqual(['amarelo', 'verde', 'azul', 'rosa'])
    expect(a.postitsPadrao).toBe(true)
    expect(comPostitsPadrao({ lembretes: [], postitsPadrao: true }).lembretes).toEqual([]) // apagou todos: não voltam
  })
  it('mantém os do usuário e não repete', () => {
    const meus = novoPostit([], 'meu')
    const b = comPostitsPadrao({ lembretes: [...meus, POSTITS_PADRAO[0]] })
    expect(b.lembretes.map((i) => i.texto || i.cor)).toEqual(['meu', 'amarelo', 'verde', 'azul', 'rosa'])
  })
})

describe('cor do próximo post-it', () => {
  it('não repete enquanto houver cor livre e, com todas usadas, pega a menos usada', () => {
    expect(proximaCor(POSTITS_PADRAO)).toBe('laranja')
    let l = [...POSTITS_PADRAO]
    for (let n = 0; n < 6; n++) l = novoPostit(l, '')
    expect(new Set(l.map(corDe)).size).toBe(10) // 10 post-its, 10 cores diferentes
    l = editarPostit(l, l[0].id, { cor: 'verde' }) // tirou a última cor usada: ela volta a ser a próxima
    expect(proximaCor(l)).toBe(corDe(novoPostit(l, '')[0]))
    expect(proximaCor([])).toBe('amarelo')
  })
})

describe('quadro sem cores repetidas', () => {
  const pi = (id: string, cor: string) => ({ id, texto: '', criadaEm: '', cor })
  it('o mais novo repetido ganha uma cor livre; o mais antigo mantém', () => {
    // caso do usuário (23/11): amarelo novo + amarelo, verde, azul, lima
    const l = semCoresRepetidas([pi('n', 'amarelo'), pi('a', 'amarelo'), pi('v', 'verde'), pi('z', 'azul'), pi('l', 'lima')])
    expect(l.map(corDe)).toEqual(['rosa', 'amarelo', 'verde', 'azul', 'lima'])
    expect(new Set(l.map(corDe)).size).toBe(5)
  })
  it('sem repetidas, devolve a mesma lista; cores de outros ficam bloqueadas enquanto houver livre', () => {
    const l = [pi('a', 'amarelo'), pi('b', 'verde')]
    expect(semCoresRepetidas(l)).toBe(l)
    expect([...coresBloqueadas(l, 'a')]).toEqual(['verde'])
    const cheio = CORES_POSTIT.map((c, k) => pi(`p${k}`, c))
    expect(coresBloqueadas(cheio, 'p0').size).toBe(9) // 10 post-its, 10 cores: cada um só fica com a sua
    expect(coresBloqueadas([...cheio, pi('extra', 'amarelo')], 'p0').size).toBe(0) // mais post-its que cores: pode repetir
  })
})
