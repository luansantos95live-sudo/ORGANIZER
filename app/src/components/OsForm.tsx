import { addDays, format, parseISO } from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import { TIPOLOGIAS } from '../lib/faturamento'
import { TIPO_META, type NovaOSInput } from '../lib/os'
import { REFERENCIA_VALIDA } from '../lib/siopi'
import { useStore } from '../store/useStore'
import type { OS, Responsavel, Tipologia, TipoServico } from '../types'
import { Field, Modal } from './ui'

type Modo = { tipo: 'criar' } | { tipo: 'editar'; os: OS }

const vazio = (resp: Responsavel, prazoDias: number): NovaOSInput => {
  const hoje = format(new Date(), 'yyyy-MM-dd')
  return {
    referencia: '', tipo: 'AVALIACAO', tipologia: 'A413', responsavel: resp, proponente: '', contato: '', telefone: '', matricula: '',
    endereco: { logradouro: '', numero: 'SN', bairro: '', cidade: 'Ji-Paraná', uf: 'RO', cep: '' },
    valorServico: 0, valorDeslocamento: 0, emissao: hoje, prazo: format(addDays(parseISO(hoje), prazoDias), 'yyyy-MM-dd'), status: 'emitida',
  }
}

export function OsForm({ open, modo, onClose, onSalvo }: { open: boolean; modo: Modo; onClose: () => void; onSalvo?: (id: string) => void }) {
  const todas = useStore((s) => s.os)
  const config = useStore((s) => s.config)
  const escopo = useStore((s) => s.escopo)
  const criarOS = useStore((s) => s.criarOS)
  const atualizarOS = useStore((s) => s.atualizarOS)

  const inicial = useMemo<NovaOSInput>(() => {
    if (modo.tipo === 'editar') {
      const o = modo.os
      return { referencia: o.referencia, tipo: o.tipo, tipologia: o.tipologia, responsavel: o.responsavel, proponente: o.proponente, contato: o.contato, telefone: o.telefone, matricula: o.matricula, endereco: { ...o.endereco }, valorServico: o.valorServico, valorDeslocamento: o.valorDeslocamento, emissao: o.emissao, prazo: o.prazo }
    }
    return vazio(escopo === 'rt' ? 'rt' : 'luan', config.prazoPadraoDias)
  }, [modo, escopo, config.prazoPadraoDias])

  const [f, setF] = useState<NovaOSInput>(inicial)
  const [tentou, setTentou] = useState(false)
  useEffect(() => { if (open) { setF(inicial); setTentou(false) } }, [open, inicial])

  const set = <K extends keyof NovaOSInput>(k: K, v: NovaOSInput[K]) => setF((x) => ({ ...x, [k]: v }))
  const setEnd = (k: keyof NovaOSInput['endereco'], v: string) => setF((x) => ({ ...x, endereco: { ...x.endereco, [k]: v } }))
  const num = (v: string) => Math.max(0, Number(v.replace(',', '.')) || 0)

  const erros = useMemo(() => {
    const e: Record<string, string> = {}
    if (!REFERENCIA_VALIDA(f.referencia)) e.referencia = 'Use o formato 7886.1831.00012345/2026.09.10.01.01'
    else if (todas.some((o) => o.referencia === f.referencia && !(modo.tipo === 'editar' && o.id === modo.os.id))) e.referencia = 'Já existe uma O.S. com esta referência'
    if (!f.proponente.trim()) e.proponente = 'Informe o proponente'
    if (!f.endereco.logradouro.trim()) e.logradouro = 'Informe a rua'
    if (!f.endereco.bairro.trim()) e.bairro = 'Informe o bairro'
    if (!f.endereco.cidade.trim()) e.cidade = 'Informe a cidade'
    if (f.valorServico <= 0) e.valorServico = 'Informe o valor do serviço'
    if (f.prazo < f.emissao) e.prazo = 'O prazo não pode ser antes da emissão'
    return e
  }, [f, todas, modo])
  const temErro = Object.keys(erros).length > 0
  const err = (k: string) => (tentou && erros[k] ? <span className="text-[11.5px] text-[var(--f-urgent-fg)]">{erros[k]}</span> : null)
  const bad = (k: string) => (tentou && erros[k] ? 'border-[var(--f-urgent-fg)]' : '')

  const salvar = () => {
    setTentou(true)
    if (temErro) return
    if (modo.tipo === 'criar') {
      const id = criarOS(f)
      onSalvo?.(id)
    } else {
      atualizarOS(modo.os.id, { ...f }, 'Dados da O.S. editados')
      onSalvo?.(modo.os.id)
    }
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={modo.tipo === 'criar' ? 'Nova O.S.' : 'Editar O.S.'} width={720}>
      <div className="grid sm:grid-cols-6 gap-3">
        <Field label="Referência (SIOPI)" className="sm:col-span-4">
          <input id="os-ref" className={`input tnum ${bad('referencia')}`} value={f.referencia} onChange={(e) => set('referencia', e.target.value.trim())} placeholder="7886.1831.00012345/2026.09.10.01.01" />
          {err('referencia')}
        </Field>
        <Field label="Responsável" className="sm:col-span-2">
          <select id="os-resp" className="input" value={f.responsavel} onChange={(e) => set('responsavel', e.target.value as Responsavel)}>
            <option value="luan">{config.responsaveis.luan.curto}</option>
            <option value="rt">{config.responsaveis.rt.curto}</option>
          </select>
        </Field>
        <Field label="Tipo de serviço" className="sm:col-span-3">
          <select id="os-tipo" className="input" value={f.tipo} onChange={(e) => set('tipo', e.target.value as TipoServico)}>
            {(Object.keys(TIPO_META) as TipoServico[]).map((t) => <option key={t} value={t}>{TIPO_META[t].label}</option>)}
          </select>
        </Field>
        <Field label="Tipologia" className="sm:col-span-3">
          <select id="os-tipologia" className="input" value={f.tipologia} onChange={(e) => set('tipologia', e.target.value as Tipologia)}>
            {(Object.keys(TIPOLOGIAS) as Tipologia[]).map((t) => <option key={t} value={t}>{t} · {TIPOLOGIAS[t]}</option>)}
          </select>
        </Field>

        <Field label="Proponente" className="sm:col-span-6">
          <input id="os-proponente" className={`input ${bad('proponente')}`} value={f.proponente} onChange={(e) => set('proponente', e.target.value)} />
          {err('proponente')}
        </Field>
        <Field label="Contato" className="sm:col-span-3"><input id="os-contato" className="input" value={f.contato} onChange={(e) => set('contato', e.target.value)} /></Field>
        <Field label="Telefone" className="sm:col-span-3"><input id="os-telefone" className="input tnum" value={f.telefone} onChange={(e) => set('telefone', e.target.value)} placeholder="(69) 99999-9999" /></Field>

        <Field label="Rua" className="sm:col-span-4">
          <input id="os-rua" className={`input ${bad('logradouro')}`} value={f.endereco.logradouro} onChange={(e) => setEnd('logradouro', e.target.value)} />
          {err('logradouro')}
        </Field>
        <Field label="Número (SN se não tiver)" className="sm:col-span-2"><input id="os-numero" className="input tnum" value={f.endereco.numero} onChange={(e) => setEnd('numero', e.target.value.toUpperCase() || 'SN')} /></Field>
        <Field label="Bairro" className="sm:col-span-2">
          <input id="os-bairro" className={`input ${bad('bairro')}`} value={f.endereco.bairro} onChange={(e) => setEnd('bairro', e.target.value)} />
          {err('bairro')}
        </Field>
        <Field label="Cidade" className="sm:col-span-2">
          <input id="os-cidade" className={`input ${bad('cidade')}`} value={f.endereco.cidade} onChange={(e) => setEnd('cidade', e.target.value)} />
          {err('cidade')}
        </Field>
        <Field label="UF" className="sm:col-span-1"><input id="os-uf" className="input" maxLength={2} value={f.endereco.uf} onChange={(e) => setEnd('uf', e.target.value.toUpperCase())} /></Field>
        <Field label="CEP" className="sm:col-span-1"><input id="os-cep" className="input tnum" value={f.endereco.cep} onChange={(e) => setEnd('cep', e.target.value)} /></Field>

        <Field label="Matrícula" className="sm:col-span-2"><input id="os-matricula" className="input tnum" value={f.matricula} onChange={(e) => set('matricula', e.target.value)} /></Field>
        <Field label="Serviço (R$)" className="sm:col-span-2">
          <input id="os-vserv" className={`input tnum ${bad('valorServico')}`} inputMode="decimal" value={f.valorServico || ''} onChange={(e) => set('valorServico', num(e.target.value))} />
          {err('valorServico')}
        </Field>
        <Field label="Deslocamento (R$)" className="sm:col-span-2"><input id="os-vdesl" className="input tnum" inputMode="decimal" value={f.valorDeslocamento || ''} onChange={(e) => set('valorDeslocamento', num(e.target.value))} /></Field>

        <Field label="Emissão" className="sm:col-span-3"><input id="os-emissao" type="date" className="input tnum" value={f.emissao} onChange={(e) => set('emissao', e.target.value)} /></Field>
        <Field label="Prazo" className="sm:col-span-3">
          <input id="os-prazo" type="date" className={`input tnum ${bad('prazo')}`} value={f.prazo} onChange={(e) => set('prazo', e.target.value)} />
          {err('prazo')}
        </Field>
      </div>
      {tentou && temErro && <p className="text-[12.5px] mt-3 text-[var(--f-urgent-fg)]">Corrija os campos destacados para salvar.</p>}
      <div className="flex justify-end gap-2 mt-5">
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button id="os-salvar" className="btn btn-primary" onClick={salvar}>{modo.tipo === 'criar' ? 'Cadastrar O.S.' : 'Salvar alterações'}</button>
      </div>
    </Modal>
  )
}
