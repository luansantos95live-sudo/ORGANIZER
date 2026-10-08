import { Copy, Download, RotateCcw, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { copiar } from '../lib/clipboard'
import { lerBackup, montarBackup } from '../lib/backup'
import { Card, Field, PageHeader, Segmented } from '../components/ui'
import { TIPO_META } from '../lib/os'
import { useStore } from '../store/useStore'
import type { Responsavel, TipoServico } from '../types'

export function ConfigPage() {
  const config = useStore((s) => s.config)
  const setConfig = useStore((s) => s.setConfig)
  const resetarDados = useStore((s) => s.resetarDados)
  const restaurarDados = useStore((s) => s.restaurarDados)
  const os = useStore((s) => s.os)
  const rotas = useStore((s) => s.rotas)
  const fechamentos = useStore((s) => s.fechamentos)
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null)
  const [pendente, setPendente] = useState<{ dados: Parameters<typeof restaurarDados>[0]; resumo: string } | null>(null)

  const exportar = () => {
    const blob = new Blob([montarBackup({ os, rotas, config, fechamentos })], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `fluxogestor_backup_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    setMsg({ ok: true, texto: `Backup exportado com ${os.length} O.S.` })
  }
  const [colado, setColado] = useState('')
  const copiarBackup = async () => {
    const ok = await copiar(montarBackup({ os, rotas, config, fechamentos }))
    setMsg(ok ? { ok: true, texto: `Backup copiado (${os.length} O.S.). Cole no outro computador em "Colar backup".` } : { ok: false, texto: 'O navegador não deixou copiar. Use "Exportar backup".' })
  }
  const lerColado = () => {
    const r = lerBackup(colado)
    if (!r.ok) { setPendente(null); setMsg({ ok: false, texto: r.erro }); return }
    setMsg(null); setPendente({ dados: r.dados, resumo: r.resumo }); setColado('')
  }
  const aoEscolher = async (f: File | undefined) => {
    if (!f) return
    const r = lerBackup(await f.text())
    if (fileRef.current) fileRef.current.value = ''
    if (!r.ok) { setPendente(null); setMsg({ ok: false, texto: r.erro }); return }
    setMsg(null)
    setPendente({ dados: r.dados, resumo: r.resumo })
  }

  const setResp = (r: Responsavel, k: 'nome' | 'curto' | 'registro', v: string) =>
    setConfig({ responsaveis: { ...config.responsaveis, [r]: { ...config.responsaveis[r], [k]: v } } })

  return (
    <>
      <PageHeader title="Configurações" subtitle="Tudo aqui fica salvo no seu navegador." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="Aparência">
          <Field label="Tema">
            <Segmented value={config.tema} onChange={(t) => setConfig({ tema: t })} options={[{ value: 'claro', label: 'Claro' }, { value: 'escuro', label: 'Escuro' }]} />
          </Field>
        </Card>

        <Card title="Rota — padrões de tempo">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Hora de partida"><input type="time" className="input tnum" value={config.partidaPadrao} onChange={(e) => e.target.value && setConfig({ partidaPadrao: e.target.value })} /></Field>
            <Field label="Mesmo bairro (min)"><input type="number" className="input tnum" value={config.deslocamentoMesmoBairro} onChange={(e) => setConfig({ deslocamentoMesmoBairro: Number(e.target.value) || 0 })} /></Field>
            <Field label="Entre bairros (min)"><input type="number" className="input tnum" value={config.deslocamentoOutroBairro} onChange={(e) => setConfig({ deslocamentoOutroBairro: Number(e.target.value) || 0 })} /></Field>
            <Field label="Entre cidades (min)"><input type="number" className="input tnum" value={config.deslocamentoOutraCidade} onChange={(e) => setConfig({ deslocamentoOutraCidade: Number(e.target.value) || 0 })} /></Field>
          </div>
        </Card>

        <Card title="Responsáveis">
          <div className="flex flex-col gap-4">
            {(['luan', 'rt'] as Responsavel[]).map((r) => (
              <div key={r} className="grid grid-cols-1 sm:grid-cols-[1fr_90px_130px] gap-2">
                <Field label={r === 'luan' ? 'Você' : 'Responsável técnico parceiro'}><input className="input" value={config.responsaveis[r].nome} onChange={(e) => setResp(r, 'nome', e.target.value)} /></Field>
                <Field label="Apelido"><input className="input" value={config.responsaveis[r].curto} onChange={(e) => setResp(r, 'curto', e.target.value)} /></Field>
                <Field label="Registro"><input className="input" value={config.responsaveis[r].registro} onChange={(e) => setResp(r, 'registro', e.target.value)} /></Field>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Faturamento">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Repasse do RT para você (%)">
              <input id="cfg-repasse" type="number" min={0} max={100} step={1} className="input tnum" value={Math.round(config.repasseRT * 100)} onChange={(e) => setConfig({ repasseRT: Math.min(100, Math.max(0, Number(e.target.value) || 0)) / 100 })} />
            </Field>
            <Field label="Repasse incide sobre">
              <select id="cfg-base" className="input" value={config.repasseBase} onChange={(e) => setConfig({ repasseBase: e.target.value as 'total' | 'servico' })}>
                <option value="total">Serviço + deslocamento</option>
                <option value="servico">Só o serviço</option>
              </select>
            </Field>
            <Field label="Meta mensal (R$)">
              <input id="cfg-meta" type="number" min={0} step={500} className="input tnum" value={config.metaMensal} onChange={(e) => setConfig({ metaMensal: Math.max(0, Number(e.target.value) || 0) })} />
            </Field>
            <Field label="Prazo padrão da O.S. (dias)">
              <input id="cfg-prazo" type="number" min={1} step={1} className="input tnum" value={config.prazoPadraoDias} onChange={(e) => setConfig({ prazoPadraoDias: Math.max(1, Number(e.target.value) || 1) })} />
            </Field>
          </div>
          <p className="text-[12px] text-muted mt-2">O repasse aparece na tela Faturamento. A meta alimenta o cartão "Meta do mês" na visão Só minhas. O prazo padrão vale para O.S. novas e importadas.</p>
        </Card>

        <Card title="Contrato com a Caixa e empresa">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Razão social de quem emite"><input id="cfg-razao" className="input" value={config.empresa.razao} onChange={(e) => setConfig({ empresa: { ...config.empresa, razao: e.target.value } })} /></Field>
            <Field label="CNPJ"><input id="cfg-cnpj" className="input tnum" value={config.empresa.cnpj} onChange={(e) => setConfig({ empresa: { ...config.empresa, cnpj: e.target.value } })} /></Field>
            <Field label="Município da prestação"><input id="cfg-municipio" className="input" value={config.empresa.municipio} onChange={(e) => setConfig({ empresa: { ...config.empresa, municipio: e.target.value } })} placeholder="Monte Negro/RO" /></Field>
            <span />
            <Field label="Contrato (nota fiscal)"><input id="cfg-contrato" className="input" value={config.contrato.numero} onChange={(e) => setConfig({ contrato: { ...config.contrato, numero: e.target.value } })} /></Field>
            <Field label="Contrato (texto do RRT)"><input id="cfg-contrato-rrt" className="input" value={config.contrato.rrt} onChange={(e) => setConfig({ contrato: { ...config.contrato, rrt: e.target.value } })} /></Field>
            <Field label="Edital de credenciamento"><input id="cfg-edital" className="input" value={config.contrato.edital} onChange={(e) => setConfig({ contrato: { ...config.contrato, edital: e.target.value } })} /></Field>
            <Field label="Processo administrativo"><input id="cfg-processo" className="input" value={config.contrato.processo} onChange={(e) => setConfig({ contrato: { ...config.contrato, processo: e.target.value } })} /></Field>
          </div>
          <p className="text-[12px] text-muted mt-2">Usados nos textos do RRT e da nota fiscal no Fechamento mensal. Ficam só no seu navegador e no seu backup, não vão para o código.</p>
        </Card>

        <Card title="Duração padrão por tipo de serviço">
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(TIPO_META) as TipoServico[]).map((t) => (
              <Field key={t} label={TIPO_META[t].label}>
                <input type="number" className="input tnum" value={config.duracaoPadrao[t]} step={5} onChange={(e) => setConfig({ duracaoPadrao: { ...config.duracaoPadrao, [t]: Number(e.target.value) || 0 } })} />
              </Field>
            ))}
          </div>
        </Card>

        <Card title="Seus dados" className="md:col-span-2">
          <p className="text-[13px] text-muted mb-3">As O.S., rotas, fechamentos e configurações ficam salvos neste navegador. Exporte um backup de vez em quando e use-o para levar os dados a outro computador ou recuperar tudo.</p>
          <div className="flex flex-wrap items-center gap-2">
            <button id="cfg-exportar" className="btn btn-primary" onClick={exportar}><Download size={14} /> Exportar backup (.json)</button>
            <label className="btn btn-secondary cursor-pointer"><Upload size={14} /> Importar backup
              <input id="cfg-importar" ref={fileRef} type="file" accept=".json,application/json" className="sr-only" onChange={(e) => aoEscolher(e.target.files?.[0])} />
            </label>
            <button id="cfg-copiar-backup" className="btn btn-secondary" onClick={copiarBackup}><Copy size={14} /> Copiar backup</button>
            <button className="btn btn-ghost" onClick={() => { if (confirm('Apagar tudo e recriar os dados de exemplo?')) resetarDados() }}><RotateCcw size={14} /> Restaurar dados de exemplo</button>
          </div>
          <details className="mt-3">
            <summary className="cursor-pointer text-[13px] text-muted">Colar backup (para levar os dados a outro computador)</summary>
            <textarea id="cfg-colar-backup" className="input w-full mt-2 min-h-[100px] text-[12px] tnum" value={colado} onChange={(e) => setColado(e.target.value)} placeholder="Cole aqui o texto copiado com Copiar backup" />
            <button id="cfg-ler-colado" className="btn btn-secondary btn-sm mt-2" disabled={!colado.trim()} onClick={lerColado}>Ler backup colado</button>
          </details>
          {pendente && (
            <div id="cfg-confirmar-backup" className="mt-3 rounded-[10px] px-3 py-3 farol-warn text-[13px]">
              <p>Este backup tem <b>{pendente.resumo}</b>. Importar <b>substitui</b> todos os dados atuais. Exporte antes se quiser guardar o que está aí.</p>
              <div className="flex gap-2 mt-2">
                <button id="cfg-substituir" className="btn btn-primary btn-sm" onClick={() => { restaurarDados(pendente.dados); setPendente(null); setMsg({ ok: true, texto: `Backup restaurado: ${pendente.resumo}.` }) }}>Substituir meus dados</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setPendente(null)}>Cancelar</button>
              </div>
            </div>
          )}
          {msg && <div id="cfg-msg" className={`mt-3 rounded-[10px] px-3 py-2 text-[13px] ${msg.ok ? 'kpi-sage' : 'farol-urgent'}`}>{msg.texto}</div>}
        </Card>
      </div>
    </>
  )
}
