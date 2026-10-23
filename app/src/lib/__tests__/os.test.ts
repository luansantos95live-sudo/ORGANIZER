import { describe, expect, it } from 'vitest'
import { diasDePausa, prazoIndeterminado, temEquipe, membrosAtivos, codigoOS, enderecoCompleto, farolDe, migrarOS, normCidade, poloDe, prazoEfetivo, precisaConfirmar, refCurta, resumoContatos, tipoEvento } from '../os'
import type { OS } from '../../types'

const HOJE = new Date(2026, 9, 9, 12)
const mk = (extra: Partial<OS> = {}) => ({ numero: 12, status: 'em_andamento', prazo: '2026-10-17', diasPausado: 0, ...extra }) as OS

describe('prazo efetivo', () => {
  it('soma as pausas encerradas e a pausa em curso', () => {
    expect(prazoEfetivo(mk(), HOJE)).toBe('2026-10-17')
    expect(prazoEfetivo(mk({ diasPausado: 4 }), HOJE)).toBe('2026-10-21')
    // PEPT cadastrada dia 07, hoje é 09: o dia 07 e o dia 09 contam; só o dia 08 fica parado.
    expect(prazoEfetivo(mk({ diasPausado: 4, pausadoEm: '2026-10-07' }), HOJE)).toBe('2026-10-22')
  })
})

describe('farol do prazo', () => {
  it('no prazo, atenção, vence amanhã, vence hoje e vencida', () => {
    expect(farolDe(mk(), HOJE)).toMatchObject({ farol: 'ok', selo: 'No prazo', texto: '8 dias restantes' })
    expect(farolDe(mk({ prazo: '2026-10-12' }), HOJE).farol).toBe('warn')
    expect(farolDe(mk({ prazo: '2026-10-10' }), HOJE)).toMatchObject({ farol: 'urgent', selo: 'Vence amanhã' })
    expect(farolDe(mk({ prazo: '2026-10-09' }), HOJE).texto).toBe('Vence hoje')
    expect(farolDe(mk({ prazo: '2026-10-06' }), HOJE)).toMatchObject({ farol: 'late', texto: 'Venceu há 3 dias' })
  })
  it('pausada e concluída não contam prazo', () => {
    expect(farolDe(mk({ pausadoEm: '2026-10-08' }), HOJE).farol).toBe('pausa')
    expect(farolDe(mk({ status: 'concluida' }), HOJE)).toMatchObject({ farol: 'none', texto: 'Concluída' })
  })
})

describe('identificação', () => {
  it('código curto e número da Caixa', () => {
    expect(codigoOS({ numero: 12 })).toBe('OS-12')
    expect(refCurta('7886.1831.001122004/2026.01.01')).toBe('1122004')
  })
  it('polo pela cidade, com ou sem acento', () => {
    expect(normCidade('Ji-Paraná')).toBe('JI-PARANA')
    expect(poloDe('Ji-Paraná')).toBe('JI-PARANA')
    expect(poloDe('JARU')).toBe('JI-PARANA')
    expect(poloDe('Monte Negro')).toBe('ARIQUEMES')
    expect(poloDe('Porto Velho')).toBe('OUTROS')
  })
  it('endereço no formato do sistema real', () => {
    const o = { endereco: { logradouro: 'TANCREDO NEVES', numero: '0', bairro: 'SETOR INSTITUCIONAL', cidade: 'ARIQUEMES', uf: 'RO', cep: '76870-970' } } as OS
    expect(enderecoCompleto(o)).toBe('TANCREDO NEVES, 0 - SETOR INSTITUCIONAL - ARIQUEMES/RO - 76870-970')
  })
})

describe('conversão do formato antigo', () => {
  it('troca etapas e tipologias antigas e completa os campos novos', () => {
    const antiga = { id: 'x', numero: 3, referencia: '7886.1831.00012345/2026.09.10.01.01', status: 'laudo_enviado', tipologia: 'R017', responsavel: 'rt', proponente: 'Ana', contato: 'Ana', telefone: '', endereco: { logradouro: 'Rua A', numero: '1', bairro: 'Centro', cidade: 'Jaru', uf: 'RO', cep: '' }, valorServico: 300, valorDeslocamento: 20, emissao: '2026-09-10', prazo: '2026-09-22', enviadoEm: '2026-09-20', conferida: true }
    const o = migrarOS(antiga)
    expect(o.status).toBe('assinatura_pendente')
    expect(o.tipologia).toBe('G402')
    expect(o.entregaEm).toBe('2026-09-20')
    expect(o.faturada).toBe(true)
    expect(o.diasPausado).toBe(0)
    expect(o.importacao.codProduto).toBe('')
    expect(migrarOS({ ...antiga, status: 'finalizada' }).status).toBe('concluida')
    expect(migrarOS({ ...antiga, status: 'emitida' }).status).toBe('recebida')
  })
})

describe('confirmação ao mudar de etapa', () => {
  it('avançar uma etapa segue direto; voltar, pular e cancelar pedem confirmação', () => {
    expect(precisaConfirmar('recebida', 'em_andamento')).toBe(false)
    expect(precisaConfirmar('assinatura_concluida', 'concluida')).toBe(false)
    expect(precisaConfirmar('em_andamento', 'recebida')).toBe(true)
    expect(precisaConfirmar('recebida', 'assinatura_pendente')).toBe(true)
    expect(precisaConfirmar('em_andamento', 'cancelada')).toBe(true)
  })
  it('O.S. salva como "devolvida" (etapa que saiu) vira concluída', () => {
    expect(migrarOS({ id: 'x', status: 'devolvida', emissao: '2026-10-01', prazo: '2026-10-20' }).status).toBe('concluida')
  })
})

describe('linha do tempo e contatos', () => {
  it('classifica os eventos pela cor do ponto', () => {
    expect(tipoEvento('Caixa devolveu o laudo: área (responder até 12/10)')).toBe('devolucao')
    expect(tipoEvento('Contato: Ligação sem resposta')).toBe('contato')
    expect(tipoEvento('Pausa solicitada: aguardando documento')).toBe('pausa')
    expect(tipoEvento('Vistoria marcada para 10/10 às 08:00')).toBe('vistoria')
    expect(tipoEvento('Etapa: Em Andamento')).toBe('etapa')
    expect(tipoEvento('Resposta à exigência enviada à Caixa')).toBe('etapa')
    expect(tipoEvento('Transferida para Marco')).toBe('outro')
  })
  it('conta as tentativas seguidas sem resposta desde a última conversa', () => {
    const c = (data: string, respondeu: boolean) => ({ data: `${data}T10:00:00`, tipo: 'ligacao' as const, respondeu, obs: '' })
    expect(resumoContatos({ contatos: [] }, HOJE)).toMatchObject({ total: 0, texto: 'Nenhuma tentativa registrada' })
    expect(resumoContatos({ contatos: [c('2026-10-05', true), c('2026-10-06', false), c('2026-10-07', false)] }, HOJE))
      .toMatchObject({ total: 3, semResposta: 2, texto: '2 tentativas sem resposta · última há 2 dias' })
    expect(resumoContatos({ contatos: [c('2026-10-06', false), c('2026-10-08', true)] }, HOJE).texto).toBe('Última conversa ontem')
  })
})

describe('equipe', () => {
  const m = (ativo: boolean) => ({ nome: 'x', curto: 'x', registro: '', email: '', papel: 'Membro' as const, ativo })
  it('só mostra o seletor de equipe com mais de um técnico ativo', () => {
    expect(temEquipe({ responsaveis: { luan: m(true), rt: m(true) } })).toBe(true)
    expect(temEquipe({ responsaveis: { luan: m(true), rt: m(false) } })).toBe(false)
    expect(membrosAtivos({ responsaveis: { luan: m(true), rt: m(false) } })).toEqual(['luan'])
  })
})

describe('PEPT por tipologia', () => {
  it('o dia do cadastro e o da resolução contam; só os dias entre eles param o prazo', () => {
    expect(diasDePausa('E401', '2026-10-01', new Date(2026, 9, 1))).toBe(0)
    expect(diasDePausa('E401', '2026-10-01', new Date(2026, 9, 2))).toBe(0)
    expect(diasDePausa('E401', '2026-10-01', new Date(2026, 9, 6))).toBe(4)
  })
  it('B438 e B437: no máximo 21 dias', () => {
    expect(diasDePausa('B438', '2026-09-01', new Date(2026, 9, 20))).toBe(21)
    expect(diasDePausa('B437', '2026-10-01', new Date(2026, 9, 11))).toBe(9)
    expect(diasDePausa('E004', '2026-09-01', new Date(2026, 9, 20))).toBe(48)
  })
  it('A413 em PEPT fica com prazo indeterminado (G416 não)', () => {
    expect(prazoIndeterminado({ tipologia: 'A413', pausadoEm: '2026-10-01' })).toBe(true)
    expect(prazoIndeterminado({ tipologia: 'A413', pausadoEm: undefined })).toBe(false)
    expect(prazoIndeterminado({ tipologia: 'G416', pausadoEm: '2026-10-01' })).toBe(false)
    expect(prazoIndeterminado({ tipologia: 'B438', pausadoEm: '2026-10-01' })).toBe(false)
  })
})

describe('prazo pela tipologia (conta a partir do dia seguinte ao recebimento)', () => {
  it('A413 e E401: 6 dias; B437 e B438: 15 dias', async () => {
    const { prazoDaTipologia } = await import('../os')
    expect(prazoDaTipologia('A413', '2026-10-10')).toBe('2026-10-16')
    expect(prazoDaTipologia('E401', '2026-10-10')).toBe('2026-10-16')
    expect(prazoDaTipologia('B437', '2026-10-10')).toBe('2026-10-25')
    expect(prazoDaTipologia('B438', '2026-10-28')).toBe('2026-11-12')
  })
  it('corrige só o prazo antigo de 15 dias das tipologias que não são de 15 dias', async () => {
    const { corrigirPrazoAntigo } = await import('../os')
    expect(corrigirPrazoAntigo({ tipologia: 'A413', emissao: '2026-10-12', prazo: '2026-10-27' }).prazo).toBe('2026-10-18')
    expect(corrigirPrazoAntigo({ tipologia: 'B438', emissao: '2026-10-12', prazo: '2026-10-27' }).prazo).toBe('2026-10-27')
    expect(corrigirPrazoAntigo({ tipologia: 'A413', emissao: '2026-10-12', prazo: '2026-10-20' }).prazo).toBe('2026-10-20') // prazo vindo da Caixa: não mexe
  })
})
