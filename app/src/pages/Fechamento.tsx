import clsx from 'clsx'
import { addMonths, format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Check, ChevronLeft, ChevronRight, ClipboardCopy, Copy, Download } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar, Card, Empty, Field, Kpi, PageHeader, StatusChip } from '../components/ui'
import { copiar } from '../lib/clipboard'
import { SERVICO_NF, TOMADOR, conferirExtrato, descricaoNF, descricaoRRT, mesDaEmissao } from '../lib/fechamento'
import { brl, cap, dataCurta, refCurta } from '../lib/os'
import { filtrarEscopo, useStore } from '../store/useStore'

export function Fechamento() {
  const todas = useStore((s) => s.os)
  const escopo = useStore((s) => s.escopo)
  const config = useStore((s) => s.config)
  const atualizarOS = useStore((s) => s.atualizarOS)
  const mudarStatus = useStore((s) => s.mudarStatus)
  const fechamentos = useStore((s) => s.fechamentos)
  const setFechamento = useStore((s) => s.setFechamento)
  const [mes, setMes] = useState(new Date())
  const [copiado, setCopiado] = useState<string | null>(null)
  const chave = format(mes, 'yyyy-MM')
  const fech = fechamentos[chave] ?? {}

  // O extrato e a nota da Caixa cobrem as duas carteiras (a sua e a do RT), seja qual for o escopo da tela.
  const doMes = useMemo(
    () => todas.filter((o) => ['finalizada', 'conferida'].includes(o.status)).filter((o) => (o.enviadoEm ?? o.emissao).startsWith(chave)),
    [todas, chave],
  )
  const totalSistema = doMes.reduce((s, o) => s + o.valorServico + o.valorDeslocamento, 0)
  const conferencia = conferirExtrato(totalSistema, fech.extratoTotal)
  const nOS = fech.extratoQtd && fech.extratoQtd > 0 ? fech.extratoQtd : doMes.length
  const valorNF = fech.valorNF ?? (fech.extratoTotal && fech.extratoTotal > 0 ? fech.extratoTotal : totalSistema)
  const textoNF = descricaoNF(chave, fech.dataRelatorio, config.contrato)
  const textoRRT = (o: (typeof todas)[number]) => descricaoRRT(o.referencia, nOS, o.valorServico + o.valorDeslocamento, config.contrato.rrt)
  const num = (v: string) => (v.trim() === '' ? undefined : Math.max(0, Number(v.replace(',', '.')) || 0))

  const copiarTexto = async (chaveCopia: string, texto: string) => {
    if (await copiar(texto)) {
      setCopiado(chaveCopia)
      setTimeout(() => setCopiado((c) => (c === chaveCopia ? null : c)), 1400)
    }
  }

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

  const montarCSV = () => {
    const cab = ['Documento', 'Cliente', 'Telefone_Contato', 'Logradouro', 'Numero', 'Bairro', 'Cidade', 'UF', 'CEP', 'Valor_Servico', 'Valor_Deslocamento', 'Valor_Total', 'Endereco_N', 'Status']
    const linhas = lista.map((o) => [o.referencia, o.proponente, o.telefone, o.endereco.logradouro, o.endereco.numero, o.endereco.bairro, o.endereco.cidade, o.endereco.uf, o.endereco.cep, o.valorServico.toFixed(2).replace('.', ','), o.valorDeslocamento.toFixed(2).replace('.', ','), (o.valorServico + o.valorDeslocamento).toFixed(2).replace('.', ','), '', o.rrt ? 'concluído' : 'pendente'])
    return [cab, ...linhas].map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n')
  }
  const exportarCSV = () => {
    const blob = new Blob(['\ufeff' + montarCSV()], { type: 'text/csv;charset=utf-8' })
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
          <div className="flex flex-wrap items-center gap-1">
            <button className="btn btn-secondary btn-icon" onClick={() => setMes(addMonths(mes, -1))} aria-label="Mês anterior"><ChevronLeft size={16} /></button>
            <span className="btn btn-secondary btn-sm min-w-[150px] justify-center">{cap(format(mes, 'MMMM yyyy', { locale: ptBR }))}</span>
            <button className="btn btn-secondary btn-icon" onClick={() => setMes(addMonths(mes, 1))} aria-label="Próximo mês"><ChevronRight size={16} /></button>
            <button id="fech-copiar-todas" className="btn btn-secondary btn-sm ml-2" onClick={() => copiarTexto('todas', lista.map(textoRRT).join('\n\n'))} disabled={!lista.length}>{copiado === 'todas' ? <Check size={14} /> : <ClipboardCopy size={14} />} {copiado === 'todas' ? 'Copiado' : 'Copiar textos do RRT'}</button>
            <button id="fech-copiar-csv" className="btn btn-secondary btn-sm" onClick={() => copiarTexto('csv', montarCSV())} disabled={!lista.length}>{copiado === 'csv' ? <Check size={14} /> : <Copy size={14} />} {copiado === 'csv' ? 'Copiado' : 'Copiar tracker'}</button>
            <button className="btn btn-primary btn-sm" onClick={exportarCSV} disabled={!lista.length}><Download size={14} /> Exportar tracker RRT</button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Kpi label="O.S. no mês" value={lista.length} />
        <Kpi label="Serviços" value={brl(somaServ)} />
        <Kpi label="Deslocamento" value={brl(somaDesl)} />
        <Kpi label="Total previsto" value={brl(somaServ + somaDesl)} tone="status-finalizada" hint={`${conferidas}/${lista.length} conferidas · ${rrts}/${lista.length} no RRT`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card title="Conferência com o Relatório da Caixa">
          <p className="text-[12.5px] text-muted mb-3">Soma das duas carteiras ({doMes.length} O.S. finalizadas no mês). Digite o total que consta no Relatório de Conferência para comparar.</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Total do relatório (R$)"><input id="fech-extrato-total" className="input tnum" inputMode="decimal" value={fech.extratoTotal ?? ''} onChange={(e) => setFechamento(chave, { extratoTotal: num(e.target.value) })} placeholder="0,00" /></Field>
            <Field label="O.S. no relatório"><input id="fech-extrato-qtd" className="input tnum" inputMode="numeric" value={fech.extratoQtd ?? ''} onChange={(e) => setFechamento(chave, { extratoQtd: num(e.target.value) })} placeholder={String(doMes.length)} /></Field>
          </div>
          <div className="flex items-center justify-between mt-3 text-[13px]"><span className="text-muted">Total no sistema</span><b className="tnum">{brl(totalSistema)}</b></div>
          <div id="fech-conferencia" className={clsx('mt-2 rounded-[10px] px-3 py-2 text-[13px]', conferencia.tipo === 'bate' ? 'kpi-sage' : conferencia.tipo === 'diferente' ? 'farol-warn' : 'kpi-stone')}>
            {conferencia.tipo === 'sem-extrato' && 'Informe o total do relatório para conferir.'}
            {conferencia.tipo === 'bate' && <>Bate com o relatório. {fech.extratoQtd && fech.extratoQtd !== doMes.length ? `Atenção: o relatório tem ${fech.extratoQtd} O.S. e o sistema ${doMes.length}.` : ''}</>}
            {conferencia.tipo === 'diferente' && <>Diferença de <b className="tnum">{brl(Math.abs(conferencia.dif))}</b>: o relatório está {conferencia.dif > 0 ? 'acima' : 'abaixo'} do sistema. {conferencia.dif > 0 ? 'Pode faltar O.S. no sistema ou algum valor está menor aqui.' : 'Confira se alguma O.S. está a mais ou com valor maior no sistema.'}</>}
          </div>
        </Card>

        <Card title="Nota fiscal do mês (rascunho)">
          <dl className="grid grid-cols-[96px_1fr] gap-y-1 text-[12.5px] mb-3">
            <dt className="text-muted">Prestador</dt><dd>{config.empresa.razao || <span className="text-muted">preencha em Configurações</span>}{config.empresa.cnpj ? ` · ${config.empresa.cnpj}` : ''}</dd>
            <dt className="text-muted">Tomador</dt><dd>{TOMADOR.razao} · {TOMADOR.cnpj}</dd>
            <dt className="text-muted">Serviço</dt><dd>{SERVICO_NF.codigoTributacao}{config.empresa.municipio ? ` · ${config.empresa.municipio}` : ''}</dd>
            <dt className="text-muted">Emitir em</dt><dd className="tnum">{cap(format(parseISO(mesDaEmissao(chave) + '-01'), "MMMM 'de' yyyy", { locale: ptBR }))}, serviços de {chave.split('-').reverse().join('/')}</dd>
          </dl>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Relatório recebido em"><input id="fech-data-relatorio" type="date" className="input tnum" value={fech.dataRelatorio ?? ''} onChange={(e) => setFechamento(chave, { dataRelatorio: e.target.value || undefined })} /></Field>
            <Field label="Valor da nota (R$)"><input id="fech-valor-nf" className="input tnum" inputMode="decimal" value={fech.valorNF ?? ''} placeholder={valorNF.toFixed(2).replace('.', ',')} onChange={(e) => setFechamento(chave, { valorNF: num(e.target.value) })} /></Field>
          </div>
          {!config.contrato.numero.trim() && <p id="fech-aviso-contrato" className="mt-3 rounded-[10px] px-3 py-2 text-[12.5px] farol-warn">O contrato, o edital e o processo estão vazios, então a descrição sai com espaços em branco. Preencha em Configurações, uma vez só.</p>}
          <textarea id="fech-texto-nf" readOnly className="input w-full mt-3 min-h-[104px] text-[12px]" value={textoNF} />
          <div className="flex flex-wrap gap-2 mt-2">
            <button id="fech-copiar-nf" className="btn btn-secondary btn-sm" onClick={() => copiarTexto('nf', textoNF)}>{copiado === 'nf' ? <Check size={14} /> : <Copy size={14} />} {copiado === 'nf' ? 'Copiado' : 'Copiar descrição'}</button>
            <button className="btn btn-secondary btn-sm" onClick={() => copiarTexto('valor', valorNF.toFixed(2).replace('.', ','))}>{copiado === 'valor' ? <Check size={14} /> : <Copy size={14} />} {copiado === 'valor' ? 'Copiado' : `Copiar valor ${brl(valorNF)}`}</button>
          </div>
          <p className="text-[11.5px] text-muted mt-2">Rascunho para conferir antes de emitir no Emissor Nacional. Nada é emitido por aqui. Contrato, edital e processo ficam em Configurações.</p>
        </Card>
      </div>

      <Card pad={false}>
        {lista.length === 0 ? (
          <Empty title="Nenhuma O.S. finalizada neste mês" text="As O.S. aparecem aqui quando o laudo é aceito." />
        ) : (
          <div className="overflow-auto">
            <table className="table table-compact min-w-[1100px]">
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
                  <th className="text-center">Texto RRT</th>
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
                    <td className="text-center"><button className="btn btn-ghost btn-icon" aria-label={`Copiar texto do RRT da O.S. ${refCurta(o.referencia)}`} title={textoRRT(o)} onClick={() => copiarTexto(o.id, textoRRT(o))}>{copiado === o.id ? <Check size={14} /> : <Copy size={14} />}</button></td>
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
                  <td colSpan={escopo === 'todas' ? 6 : 5} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
      <p className="text-[12px] text-muted mt-3 px-1">
        A exportação gera o CSV no formato do tracker do RRT Múltiplo Mensal (colunas Documento, Cliente, Telefone, Endereço, Valores, Endereco_N, Status), pronto para o lançamento no CAU. Referência do mês: data de envio do laudo. Contratante {`CAIXA ECONÔMICA FEDERAL`} · contratada {config.empresa.razao || config.responsaveis.luan.nome}. Data base: {format(parseISO(chave + '-01'), 'MM/yyyy')}.
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
