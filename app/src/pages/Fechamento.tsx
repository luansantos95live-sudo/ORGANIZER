import clsx from 'clsx'
import { addMonths, format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Check, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar, Card, Empty, Kpi, PageHeader, StatusChip } from '../components/ui'
import { brl, dataCurta, refCurta } from '../lib/os'
import { filtrarEscopo, useStore } from '../store/useStore'

export function Fechamento() {
  const todas = useStore((s) => s.os)
  const escopo = useStore((s) => s.escopo)
  const config = useStore((s) => s.config)
  const atualizarOS = useStore((s) => s.atualizarOS)
  const mudarStatus = useStore((s) => s.mudarStatus)
  const [mes, setMes] = useState(new Date())
  const chave = format(mes, 'yyyy-MM')

  const lista = useMemo(
    () => filtrarEscopo(todas, escopo)
      .filter((o) => ['finalizada', 'conferida'].includes(o.status))
      .filter((o) => (o.enviadoEm ?? o.emissao).startsWith(chave))
      .sort((a, b) => a.referencia.localeCompare(b.referencia)),
    [todas, escopo, chave],
  )
  const somaServ = lista.reduce((s, o) => s + o.valorServico, 0)
  const somaDesl = lista.reduce((s, o) => s + o.valorDeslocamento, 0)
  const conferidas = lista.filter((o) => o.conferida).length
  const rrts = lista.filter((o) => o.rrt).length

  const exportarCSV = () => {
    const cab = ['Documento', 'Cliente', 'Telefone_Contato', 'Logradouro', 'Numero', 'Bairro', 'Cidade', 'UF', 'CEP', 'Valor_Servico', 'Valor_Deslocamento', 'Valor_Total', 'Endereco_N', 'Status']
    const linhas = lista.map((o) => [o.referencia, o.proponente, o.telefone, o.endereco.logradouro, o.endereco.numero, o.endereco.bairro, o.endereco.cidade, o.endereco.uf, o.endereco.cep, o.valorServico.toFixed(2).replace('.', ','), o.valorDeslocamento.toFixed(2).replace('.', ','), (o.valorServico + o.valorDeslocamento).toFixed(2).replace('.', ','), '', o.rrt ? 'concluído' : 'pendente'])
    const csv = [cab, ...linhas].map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `tracker_rrt_${format(mes, 'MM_yyyy')}.csv`
    a.click()
  }

  return (
    <>
      <PageHeader
        title="Fechamento mensal"
        subtitle="Conferência das O.S. contra o extrato da Caixa e controle do RRT Múltiplo Mensal."
        actions={
          <div className="flex items-center gap-1">
            <button className="btn btn-secondary btn-icon" onClick={() => setMes(addMonths(mes, -1))} aria-label="Mês anterior"><ChevronLeft size={16} /></button>
            <span className="btn btn-secondary btn-sm capitalize min-w-[150px] justify-center">{format(mes, 'MMMM yyyy', { locale: ptBR })}</span>
            <button className="btn btn-secondary btn-icon" onClick={() => setMes(addMonths(mes, 1))} aria-label="Próximo mês"><ChevronRight size={16} /></button>
            <button className="btn btn-primary btn-sm ml-2" onClick={exportarCSV} disabled={!lista.length}><Download size={14} /> Exportar tracker RRT</button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Kpi label="O.S. no mês" value={lista.length} />
        <Kpi label="Serviços" value={brl(somaServ)} />
        <Kpi label="Deslocamento" value={brl(somaDesl)} />
        <Kpi label="Total previsto" value={brl(somaServ + somaDesl)} tone="status-finalizada" hint={`${conferidas}/${lista.length} conferidas · ${rrts}/${lista.length} no RRT`} />
      </div>

      <Card pad={false}>
        {lista.length === 0 ? (
          <Empty title="Nenhuma O.S. finalizada neste mês" text="As O.S. aparecem aqui quando o laudo é aceito." />
        ) : (
          <div className="overflow-auto">
            <table className="table min-w-[1080px]">
              <thead>
                <tr>
                  <th>Documento</th>
                  <th>Cliente</th>
                  <th>Endereço</th>
                  <th className="text-right">Serviço</th>
                  <th className="text-right">Desloc.</th>
                  <th className="text-right">Total</th>
                  <th>Enviado</th>
                  <th>Status</th>
                  <th className="text-center">Extrato</th>
                  <th className="text-center">RRT</th>
                  {escopo === 'todas' && <th>Resp.</th>}
                </tr>
              </thead>
              <tbody>
                {lista.map((o) => (
                  <tr key={o.id} className="!cursor-default">
                    <td className="tnum"><Link to={`/os/${o.id}`} className="hover:underline">#{refCurta(o.referencia)}</Link><div className="text-[11px] text-muted">{o.referencia}</div></td>
                    <td className="font-medium whitespace-nowrap">{o.proponente}</td>
                    <td className="text-[12.5px] whitespace-nowrap">{o.endereco.logradouro}, {o.endereco.numero}<div className="text-muted">{o.endereco.bairro} · {o.endereco.cidade}</div></td>
                    <td className="text-right tnum">{brl(o.valorServico)}</td>
                    <td className="text-right tnum">{brl(o.valorDeslocamento)}</td>
                    <td className="text-right tnum font-semibold">{brl(o.valorServico + o.valorDeslocamento)}</td>
                    <td className="tnum text-[12.5px]">{o.enviadoEm ? dataCurta(o.enviadoEm) : '—'}</td>
                    <td><StatusChip status={o.status} curto /></td>
                    <td className="text-center">
                      <Toggle on={o.conferida} onClick={() => (o.conferida ? atualizarOS(o.id, { conferida: false }) : mudarStatus(o.id, 'conferida'))} />
                    </td>
                    <td className="text-center">
                      <Toggle on={o.rrt} onClick={() => atualizarOS(o.id, { rrt: !o.rrt }, o.rrt ? 'Removida do RRT mensal' : 'Endereço lançado no RRT Múltiplo Mensal')} />
                    </td>
                    {escopo === 'todas' && <td><Avatar resp={o.responsavel} size={22} /></td>}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-surface-2 font-semibold">
                  <td colSpan={3} className="text-[12px] text-muted uppercase tracking-wide">Total · deve bater com o Relatório de Conferência</td>
                  <td className="text-right tnum">{brl(somaServ)}</td>
                  <td className="text-right tnum">{brl(somaDesl)}</td>
                  <td className="text-right tnum">{brl(somaServ + somaDesl)}</td>
                  <td colSpan={escopo === 'todas' ? 5 : 4} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
      <p className="text-[12px] text-muted mt-3 px-1">
        A exportação gera o CSV no formato do tracker do RRT Múltiplo Mensal (colunas Documento, Cliente, Telefone, Endereço, Valores, Endereco_N, Status), pronto para o lançamento no CAU. Referência do mês: data de envio do laudo. Contratante {`CAIXA ECONÔMICA FEDERAL`} · contratada {config.responsaveis.luan.nome.split(' ')[0]} / LFX Arquitetura. Data base: {format(parseISO(chave + '-01'), 'MM/yyyy')}.
      </p>
    </>
  )
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={clsx('w-6 h-6 rounded-md border inline-flex items-center justify-center transition', on ? 'bg-brand border-brand text-white' : 'border-border hover:bg-surface-2')} aria-pressed={on}>
      {on && <Check size={14} />}
    </button>
  )
}
