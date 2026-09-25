import { RotateCcw } from 'lucide-react'
import { Card, Field, PageHeader, Segmented } from '../components/ui'
import { TIPO_META } from '../lib/os'
import { useStore } from '../store/useStore'
import type { Responsavel, TipoServico } from '../types'

export function ConfigPage() {
  const config = useStore((s) => s.config)
  const setConfig = useStore((s) => s.setConfig)
  const resetarDados = useStore((s) => s.resetarDados)

  const setResp = (r: Responsavel, k: 'nome' | 'curto' | 'registro', v: string) =>
    setConfig({ responsaveis: { ...config.responsaveis, [r]: { ...config.responsaveis[r], [k]: v } } })

  return (
    <>
      <PageHeader title="Configurações" subtitle="Tudo aqui fica salvo no seu navegador." />
      <div className="grid md:grid-cols-2 gap-4">
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
              <div key={r} className="grid grid-cols-[1fr_90px_130px] gap-2">
                <Field label={r === 'luan' ? 'Você' : 'Responsável técnico parceiro'}><input className="input" value={config.responsaveis[r].nome} onChange={(e) => setResp(r, 'nome', e.target.value)} /></Field>
                <Field label="Apelido"><input className="input" value={config.responsaveis[r].curto} onChange={(e) => setResp(r, 'curto', e.target.value)} /></Field>
                <Field label="Registro"><input className="input" value={config.responsaveis[r].registro} onChange={(e) => setResp(r, 'registro', e.target.value)} /></Field>
              </div>
            ))}
          </div>
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

        <Card title="Dados do laboratório" className="md:col-span-2">
          <p className="text-[13px] text-muted mb-3">Os dados são fictícios e ficam no <code>localStorage</code> do navegador. Restaurar recria as O.S. com datas relativas a hoje.</p>
          <button className="btn btn-secondary" onClick={() => { if (confirm('Apagar as alterações e recriar os dados de exemplo?')) resetarDados() }}><RotateCcw size={14} /> Restaurar dados de exemplo</button>
        </Card>
      </div>
    </>
  )
}
