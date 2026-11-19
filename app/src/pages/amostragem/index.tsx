import { format } from 'date-fns'
import { Building2, Combine, MapPin, Plus, Search, Tag, Upload } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Empty, MultiSelect, PageHeader } from '../../components/ui'
import type { ResearchSample, ResearchSampleInput } from '../../lib/amostragem/types'
import { type SituacaoValidade, situacao } from '../../lib/amostragem/calculo'
import { TIPOS, nomeTipo, tipoPorId } from '../../lib/amostragem/catalogo'
import { useAmostragens } from '../../store/amostragens'
import { useStore } from '../../store/useStore'
import { daCabecalho } from './CamposCabecalho'
import { ComporAmostragem } from './ComporAmostragem'
import { useExportar } from './dados'
import { ImportarExcel } from './ImportarExcel'
import { ListaPorCidade } from './ListaPorCidade'
import { NovaAmostragem } from './NovaAmostragem'
import './amostragem.css'

type FiltroSituacao = 'todas' | SituacaoValidade

const bairrosDe = (a: ResearchSample) => (a.region ?? '').split(/[,;]/).map((b) => b.trim()).filter(Boolean)
const opcoes = (l: string[]) => [...new Set(l)].sort((x, y) => x.localeCompare(y, 'pt-BR')).map((v) => ({ value: v, label: v }))

/**
 * Amostragem (18/11/2026): amostragens de dados de mercado para avaliação de imóveis (casas, terrenos, apartamentos,
 * vagas...), agrupadas por cidade, com validade controlada e Excel na identidade da empresa.
 */
export function Amostragem() {
  const nav = useNavigate()
  const todas = useAmostragens((s) => s.amostras)
  const criar = useAmostragens((s) => s.criar)
  const autor = useStore((s) => s.config.responsaveis.luan?.nome)
  const exportar = useExportar()
  const [busca, setBusca] = useState('')
  const [tipos, setTipos] = useState<string[]>([])
  const [cidades, setCidades] = useState<string[]>([])
  const [bairros, setBairros] = useState<string[]>([])
  const [sit, setSit] = useState<FiltroSituacao>('todas')
  const [janela, setJanela] = useState<'' | 'nova' | 'importar' | 'compor'>('')

  const sitDe = (a: ResearchSample) => situacao(a.referenceDate, a.validityMonths)
  const vigentes = todas.filter((a) => sitDe(a) === 'vigente').length
  const opcoesCidade = useMemo(() => opcoes(todas.flatMap((a) => (a.city ? [a.city] : []))), [todas])
  const opcoesBairro = useMemo(() => opcoes(todas.filter((a) => !cidades.length || cidades.includes(a.city ?? '')).flatMap(bairrosDe)), [todas, cidades])
  const lista = useMemo(() => {
    const t = busca.trim().toLowerCase()
    return todas
      .filter((a) => !tipos.length || tipos.includes(a.propertyType))
      .filter((a) => !cidades.length || cidades.includes(a.city ?? ''))
      .filter((a) => !bairros.length || bairrosDe(a).some((b) => bairros.includes(b)))
      .filter((a) => sit === 'todas' || sitDe(a) === sit)
      .filter((a) => !t || [a.title, a.city, a.region, a.serviceOrderRef, nomeTipo(a.propertyType)].join(' ').toLowerCase().includes(t))
      .sort((a, b) => b.referenceDate.localeCompare(a.referenceDate))
  }, [todas, tipos, cidades, bairros, sit, busca])
  const podeCompor = todas.some((a) => a.items.length > 0)

  const criarEAbrir = (a: ResearchSampleInput) => nav(`/amostragem/${criar(a, autor).id}`)

  return (
    <>
      <PageHeader title="Amostragem" subtitle="Amostragens de mercado para avaliação de imóveis, com validade controlada e Excel na identidade da empresa" />

      <div className="mb-3 grid grid-cols-2 gap-2">
        <button type="button" className="card kpi-ficha text-left" onClick={() => setSit('todas')}>
          <div>
            <div className="card-tit">Amostragens</div>
            <div className="v">{todas.length}</div>
          </div>
        </button>
        <button type="button" className={`card kpi-ficha text-left ${sit === 'vigente' ? 'ring-2 ring-[var(--brand)]' : ''}`} onClick={() => setSit(sit === 'vigente' ? 'todas' : 'vigente')}>
          <div>
            <div className="card-tit">Vigentes</div>
            <div className="v text-[var(--verde-valor)]">{vigentes}</div>
          </div>
        </button>
      </div>

      <div className="mb-3 flex flex-wrap items-end gap-3">
        <label className="flex min-w-[200px] max-w-[320px] flex-1 flex-col gap-1">
          <span className="text-[12px] font-medium text-muted">Buscar</span>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input className="input w-full !pl-9" placeholder="Título, cidade, região ou O.S." value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
        </label>
        <div className="flex flex-col gap-1">
          <span className="text-[12px] font-medium text-muted">Tipo de imóvel</span>
          <MultiSelect rotuloVazio="Todos os tipos" icon={<Tag size={15} />} largura={200} valor={tipos} onChange={setTipos} opcoes={TIPOS.map((t) => ({ value: t.id, label: t.nome }))} />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[12px] font-medium text-muted">Cidade</span>
          <MultiSelect rotuloVazio="Todas as cidades" icon={<Building2 size={15} />} largura={180} valor={cidades} onChange={setCidades} opcoes={opcoesCidade} />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[12px] font-medium text-muted">Bairro</span>
          <MultiSelect rotuloVazio="Todos os bairros" icon={<MapPin size={15} />} largura={180} valor={bairros} onChange={setBairros} opcoes={opcoesBairro} />
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-[12px] font-medium text-muted">Validade</span>
          <select className="input w-[170px]" value={sit} onChange={(e) => setSit(e.target.value as FiltroSituacao)}>
            <option value="todas">Todas</option>
            <option value="vigente">Vigentes</option>
            <option value="vencendo">Vencem em 30 dias</option>
            <option value="vencida">Vencidas</option>
          </select>
        </label>
        <div className="ml-auto flex flex-wrap gap-2">
          <button type="button" className="btn btn-secondary" title="Nova amostragem com dados escolhidos de amostragens já cadastradas" disabled={!podeCompor} onClick={() => setJanela('compor')}>
            <Combine size={15} /> Compor amostragem
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setJanela('importar')}><Upload size={15} /> Importar Excel</button>
          <button type="button" className="btn btn-primary" onClick={() => setJanela('nova')}><Plus size={16} /> Nova amostragem</button>
        </div>
      </div>

      {lista.length ? (
        <ListaPorCidade lista={lista} onAbrir={(id) => nav(`/amostragem/${id}`)} />
      ) : (
        <section className="card overflow-hidden">
          <Empty
            title={todas.length ? 'Nenhuma amostragem com esses filtros' : 'Nenhuma amostragem ainda'}
            text={todas.length ? 'Troque o tipo, a cidade, a validade ou a busca.' : 'Crie a primeira amostragem de mercado ou importe uma planilha do Excel.'}
            action={!todas.length ? <button className="btn btn-primary btn-sm" onClick={() => setJanela('nova')}><Plus size={14} /> Nova amostragem</button> : undefined}
          />
        </section>
      )}

      <NovaAmostragem
        aberta={janela === 'nova'}
        onClose={() => setJanela('')}
        onImportar={() => setJanela('importar')}
        onCompor={() => setJanela('compor')}
        podeCompor={podeCompor}
        onCriar={(d) => criarEAbrir({ ...daCabecalho(d), propertyType: d.propertyType, variables: d.variables, items: [] })}
      />
      <ComporAmostragem aberta={janela === 'compor'} onClose={() => setJanela('')} amostras={todas} onCriar={criarEAbrir} />
      <ImportarExcel
        aberta={janela === 'importar'}
        onClose={() => setJanela('')}
        baixarModelo={(tipoId, vars) =>
          exportar(
            { title: 'Modelo para preencher', propertyType: tipoId, purpose: 'VENDA', scope: 'BAIRRO', referenceDate: format(new Date(), 'yyyy-MM-dd'), validityMonths: 6, variables: vars, items: [] },
            `Modelo - Amostragem - ${tipoPorId(tipoId).nome.replace(/[\/:*?"<>|]+/g, "-")}.xlsx`,
          )
        }
        onConcluir={(r) => {
          const c = r.cabecalho!
          criarEAbrir({ ...daCabecalho(c), propertyType: c.propertyType, variables: r.variables, items: r.itens })
        }}
      />
    </>
  )
}

export { FichaAmostragem } from './Detalhe'
