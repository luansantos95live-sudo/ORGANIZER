import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { DocKey, OS, Responsavel, Status, TipoServico } from '../types'

export const STATUS_META: Record<Status, { label: string; curto: string; ordem: number; descricao: string }> = {
  convocada: { label: 'Convocada', curto: 'Convocada', ordem: 0, descricao: 'Aguardando aceite (24h)' },
  emitida: { label: 'Emitida', curto: 'A agendar', ordem: 1, descricao: 'Aceita, sem dia de vistoria' },
  agendada: { label: 'Agendada', curto: 'Agendada', ordem: 2, descricao: 'Com dia e hora de vistoria' },
  vistoriada: { label: 'Vistoriada', curto: 'Laudo pendente', ordem: 3, descricao: 'Campo feito, laudo em elaboração' },
  laudo_enviado: { label: 'Laudo enviado', curto: 'Enviado', ordem: 4, descricao: 'Aguardando análise da Caixa' },
  diligencia: { label: 'Em diligência', curto: 'Diligência', ordem: 5, descricao: 'Caixa pediu correção' },
  finalizada: { label: 'Finalizada', curto: 'Finalizada', ordem: 6, descricao: 'Laudo aceito' },
  conferida: { label: 'Conferida', curto: 'Conferida', ordem: 7, descricao: 'No extrato mensal / RRT' },
  cancelada: { label: 'Cancelada', curto: 'Cancelada', ordem: 8, descricao: 'Recusada ou cancelada' },
}

export const STATUS_ORDER = (Object.keys(STATUS_META) as Status[]).sort((a, b) => STATUS_META[a].ordem - STATUS_META[b].ordem)

export const STATUS_ABERTOS: Status[] = ['convocada', 'emitida', 'agendada', 'vistoriada', 'laudo_enviado', 'diligencia']

export const TIPO_META: Record<TipoServico, { label: string; curto: string }> = {
  AVALIACAO: { label: 'Avaliação de imóvel', curto: 'Avaliação' },
  VISTORIA_RAE: { label: 'Vistoria de obra (RAE)', curto: 'Vistoria RAE' },
  PCI_PLS: { label: 'Planilha PCI / PLS', curto: 'PCI/PLS' },
  REAVALIACAO: { label: 'Reavaliação', curto: 'Reavaliação' },
}

export const DOC_META: Record<DocKey, string> = {
  matricula: 'Matrícula do imóvel',
  escritura: 'Escritura / contrato',
  planta: 'Planta / Habite-se',
  siopi: 'Documento SIOPI',
  pci: 'Planilha PCI',
  laudo: 'Laudo de avaliação',
  pls: 'Planilha PLS',
  rrt: 'RRT / ART',
  projetos: 'Projetos',
  alvara: 'Alvará',
  declaracao: 'Declaração de elementos construtivos',
}

export const RESP_META: Record<Responsavel, { cor: string; soft: string }> = {
  luan: { cor: 'var(--brand)', soft: 'var(--brand-soft)' },
  rt: { cor: 'var(--rt)', soft: 'var(--rt-soft)' },
}

export type Farol = 'ok' | 'warn' | 'urgent' | 'late' | 'none'

export function diasParaPrazo(os: OS, hoje = new Date()): number | null {
  if (!STATUS_ABERTOS.includes(os.status)) return null
  return differenceInCalendarDays(parseISO(os.prazo), hoje)
}

export function farolDe(os: OS, hoje = new Date()): { farol: Farol; texto: string; dias: number | null } {
  const dias = diasParaPrazo(os, hoje)
  if (dias === null) return { farol: 'none', texto: '—', dias }
  if (dias < 0) return { farol: 'late', texto: dias === -1 ? 'venceu ontem' : `venceu há ${-dias} d`, dias }
  if (dias === 0) return { farol: 'urgent', texto: 'vence hoje', dias }
  if (dias === 1) return { farol: 'urgent', texto: 'vence amanhã', dias }
  if (dias <= 3) return { farol: 'warn', texto: `faltam ${dias} d`, dias }
  return { farol: 'ok', texto: `faltam ${dias} d`, dias }
}

export function refCurta(ref: string) {
  // 7886.1831.00012345/2026.09.10.01.01 → 12345
  const m = ref.match(/\.(\d{8})\//)
  return m ? String(Number(m[1])) : ref
}

export const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function dataCurta(iso: string) {
  return format(parseISO(iso), 'dd/MM', { locale: ptBR })
}
export function dataLonga(iso: string) {
  return format(parseISO(iso), "EEEE, d 'de' MMMM", { locale: ptBR })
}
export function dataMedia(iso: string) {
  return format(parseISO(iso), 'dd/MM/yyyy', { locale: ptBR })
}
export function dataHora(iso: string) {
  return format(parseISO(iso), 'dd/MM HH:mm', { locale: ptBR })
}

export function enderecoLinha(os: OS) {
  const e = os.endereco
  return `${e.logradouro}, ${e.numero} · ${e.bairro} · ${e.cidade}/${e.uf}`
}

export function enderecoMaps(os: OS) {
  const e = os.endereco
  return `${e.logradouro} ${e.numero === 'SN' ? '' : e.numero}, ${e.bairro}, ${e.cidade} - ${e.uf}, ${e.cep}`.replace(/\s+/g, ' ')
}

export function docsFaltando(os: OS): DocKey[] {
  return (Object.keys(DOC_META) as DocKey[]).filter((k) => !os.docs[k])
}

export function telefoneWhats(tel: string) {
  return '55' + tel.replace(/\D/g, '')
}
