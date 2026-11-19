import { format } from 'date-fns'
import { ArrowLeft, ClipboardPaste, Download, Pencil, Plus, RefreshCw, Save, SlidersHorizontal, Trash2, Upload } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Empty, Modal } from '../../components/ui'
import type { DadoAmostra, ResearchSample, ResearchSampleInput, VariavelAmostra } from '../../lib/amostragem/types'
import { converter, dadoVazio, dadoVencido, fmtData, lerData, novoId, resumo, temAreaReferencia, validoAte } from '../../lib/amostragem/calculo'
import { VARIAVEIS, inserirNoGrupo, moverVariavel, tipoPorId } from '../../lib/amostragem/catalogo'
import { useAmostragens } from '../../store/amostragens'
import { AdicionarColuna } from './AdicionarColuna'
import { type Cabecalho, CamposCabecalho, abrangenciaDe, daCabecalho, textoAbrangencia, validarCabecalho } from './CamposCabecalho'
import { useExportar } from './dados'
import { ImportarExcel } from './ImportarExcel'
import { Avisos, Indicadores } from './Indicadores'
import { ChipValidade, IconeTipo, plural } from './pecas'
import { Planilha } from './Planilha'
import { SeletorVariaveis } from './SeletorVariaveis'

type NomeJanela = '' | 'coluna' | 'cabecalho' | 'variaveis' | 'importar' | 'excluir' | 'renovar'
const hoje = () => format(new Date(), 'yyyy-MM-dd')
const copia = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T

/** A fonte (link ou endereço) é obrigatória em todo dado: amostragens sem a coluna ganham ela com o nome atual. */
function preparar(d: ResearchSample): ResearchSample {
  const a = copia(d)
  const fonte: VariavelAmostra = { key: 'link', ...VARIAVEIS.link!, fixed: true }
  const i = a.variables.findIndex((v) => v.key === 'link')
  if (i >= 0) a.variables[i] = { ...a.variables[i]!, ...fonte }
  else {
    let fim = -1
    a.variables.forEach((v, j) => { if (v.group === 'Identificação') fim = j })
    a.variables.splice(fim + 1, 0, fonte)
  }
  return a
}

const paraCabecalho = (a: ResearchSample): Cabecalho => ({
  title: a.title,
  purpose: a.purpose,
  scope: abrangenciaDe(a.scope),
  state: a.state ?? '',
  city: a.city ?? '',
  region: a.region ?? '',
  serviceOrderRef: a.serviceOrderRef ?? '',
  referenceDate: a.referenceDate,
  validityMonths: a.validityMonths,
  notes: a.notes ?? '',
})

const novoDado = (base?: DadoAmostra): DadoAmostra => ({ id: novoId(), collectedAt: base?.collectedAt ?? hoje(), active: true, values: base ? { ...base.values } : {} })

/** Uma amostragem: cabeçalho, indicadores, avisos, planilha editável dos dados, validade e Excel. */
export function FichaAmostragem() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const salva = useAmostragens((s) => s.amostras.find((x) => x.id === id))
  const { atualizar, excluir: excluirDoStore, criar } = useAmostragens.getState()
  const exportar = useExportar()
  const [a, setA] = useState<ResearchSample | null>(() => (salva ? preparar(salva) : null))
  const [sujo, setSujo] = useState(false)
  const [aviso, setAviso] = useState<{ tom: 'ok' | 'erro'; texto: string } | null>(null)
  const [janela, setJanela] = useState<NomeJanela>('')
  const [cabEd, setCabEd] = useState<Cabecalho | null>(null)
  const [varsEd, setVarsEd] = useState<VariavelAmostra[]>([])
  const [erroJanela, setErroJanela] = useState('')
  const caixa = useRef<HTMLDivElement>(null)

  // troca de amostragem: recarrega
  useEffect(() => { setA(salva ? preparar(salva) : null); setSujo(false) }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Não perder edição: ao sair da tela pelo menu, o que estiver pendente é salvo sozinho; ao fechar a janela, o
  // navegador pergunta.
  const pendente = useRef<{ sujo: boolean; a: ResearchSample | null }>({ sujo: false, a: null })
  pendente.current = { sujo, a }
  useEffect(
    () => () => {
      const p = pendente.current
      if (p.sujo && p.a) useAmostragens.getState().atualizar(p.a.id, { ...p.a, items: p.a.items.filter((d) => !dadoVazio(d)) })
    },
    [id],
  )
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (sujo) e.preventDefault() }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [sujo])

  const avisar = (tom: 'ok' | 'erro', texto: string) => {
    setAviso({ tom, texto })
    if (tom === 'ok') setTimeout(() => setAviso((x) => (x?.texto === texto ? null : x)), 3500)
  }

  const r = useMemo(() => (a ? resumo(a.propertyType, a.variables, a.items, a.validityMonths) : null), [a])
  if (!a || !r) {
    return (
      <div className="space-y-3">
        <Link to="/amostragem" className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-[var(--text)]"><ArrowLeft size={14} /> Amostragem</Link>
        <Empty title="Amostragem não encontrada" text="Ela pode ter sido excluída. Volte para a lista de amostragens." />
      </div>
    )
  }
  const tipo = tipoPorId(a.propertyType)

  const corpo = (x: ResearchSample = a): ResearchSampleInput => ({
    title: x.title,
    propertyType: x.propertyType,
    purpose: x.purpose,
    scope: abrangenciaDe(x.scope),
    state: x.state ?? null,
    city: x.city ?? null,
    region: x.region ?? null,
    serviceOrderRef: x.serviceOrderRef ?? null,
    referenceDate: x.referenceDate,
    validityMonths: x.validityMonths,
    notes: x.notes ?? null,
    variables: x.variables,
    // linhas que ficaram vazias (criadas para colar) não são guardadas
    items: x.items.filter((d) => !dadoVazio(d)),
  })
  const salvar = (msg = 'Amostragem salva.', x: ResearchSample = a) => {
    const s = atualizar(id, corpo(x))
    if (!s) return avisar('erro', 'Não foi possível salvar.')
    setA(preparar(s))
    setSujo(false)
    avisar('ok', msg)
  }

  // ----- edição da planilha -----
  const mudar = (f: (x: ResearchSample) => ResearchSample) => { setA((x) => (x ? f(x) : x)); setSujo(true) }
  const mudarItens = (f: (its: DadoAmostra[]) => DadoAmostra[]) => mudar((x) => ({ ...x, items: f(x.items) }))
  const mudarItem = (i: number, f: (d: DadoAmostra) => DadoAmostra) => mudarItens((its) => its.map((d, j) => (j === i ? f(d) : d)))
  const irParaFim = (primeira: number, focar = false) =>
    requestAnimationFrame(() => {
      const c = caixa.current
      if (!c) return
      c.scrollTop = c.scrollHeight
      c.closest('section')?.scrollIntoView({ block: 'end', behavior: 'smooth' })
      if (focar) c.querySelector<HTMLInputElement>(`tr[data-row="${primeira}"] input.primeiro`)?.focus({ preventScroll: true })
    })
  const maisLinhas = (n: number, focar = false) => {
    const primeira = a.items.length
    mudarItens((its) => [...its, ...Array.from({ length: n }, () => novoDado())])
    irParaFim(primeira, focar)
  }
  /** Colar do Excel: preenche a partir da célula, criando as linhas que faltarem (coluna 0 = data da coleta). */
  const colar = (linha: number, coluna: number, m: string[][]) => {
    const faltam = Math.max(0, linha + m.length - a.items.length)
    mudar((x) => {
      const items = [...x.items, ...Array.from({ length: faltam }, () => novoDado())].map((d) => ({ ...d, values: { ...d.values } }))
      m.forEach((cols, rr) =>
        cols.forEach((txt, k) => {
          const c = coluna + k
          const d = items[linha + rr]!
          if (c === 0) {
            const dt = lerData(txt.trim())
            if (dt) d.collectedAt = dt
          } else if (x.variables[c - 1]) d.values[x.variables[c - 1]!.key] = converter(x.variables[c - 1]!, txt)
        }),
      )
      return { ...x, items }
    })
    const ncol = Math.max(...m.map((l) => l.length))
    avisar('ok', `Colado: ${plural(m.length, 'linha', 'linhas')} × ${plural(ncol, 'coluna', 'colunas')}${faltam ? ` (${plural(faltam, 'linha nova', 'linhas novas')})` : ''}. Confira e salve.`)
  }

  // ----- ações -----
  const aplicarCabecalho = () => {
    if (!cabEd) return
    const e = validarCabecalho(cabEd)
    if (e) return setErroJanela(e)
    setErroJanela('')
    salvar('Dados da pesquisa atualizados.', { ...a, ...daCabecalho(cabEd) })
    setJanela('')
  }
  const aplicarVariaveis = () => { salvar('Variáveis atualizadas.', { ...a, variables: varsEd }); setJanela('') }
  const baixarExcel = () => exportar({ ...a, items: corpo().items }).catch(() => avisar('erro', 'Não foi possível gerar o Excel.'))
  const excluir = () => { pendente.current = { sujo: false, a: null }; setSujo(false); excluirDoStore(id); setTimeout(() => nav('/amostragem'), 0) }
  const validos = a.items.filter((d) => !dadoVazio(d) && !dadoVencido(d, a.validityMonths)).length
  const renovar = () => {
    const x = corpo()
    const nova = criar(
      {
        ...x,
        title: `${x.title.replace(/\s*\(renovada.*\)$/, '')} (renovada ${format(new Date(), 'MM/yyyy')})`.slice(0, 160),
        referenceDate: hoje(),
        items: x.items.filter((d) => !dadoVencido(d, x.validityMonths)).map((d) => ({ ...d, id: novoId() })),
      },
      a.createdByName ?? undefined,
    )
    setSujo(false)
    setJanela('')
    setTimeout(() => nav(`/amostragem/${nova.id}`), 0)
  }

  const avisos = [
    !temAreaReferencia(a.propertyType, a.variables) && { tom: 'info' as const, texto: `A área de referência (${VARIAVEIS[tipo.areaKey ?? '']?.label ?? 'área'}) não está nas variáveis: o valor unitário não é calculado. Marque-a em “Variáveis”.` },
    r.vencidos > 0 && { tom: 'amarelo' as const, texto: `${plural(r.vencidos, 'dado tem', 'dados têm')} coleta com mais de ${a.validityMonths} meses (linhas em amarelo). Atualize o valor e a data, ou use “Renovar”. Enquanto isso, não entram no cálculo.` },
    r.semFonte > 0 && { tom: 'vermelho' as const, fonte: true, texto: `${plural(r.semFonte, 'dado está', 'dados estão')} sem o link ou o endereço da fonte. Todo dado precisa dizer de onde veio; sem isso não entra no cálculo.` },
    r.suspeitos.size > 0 && { tom: 'vermelho' as const, texto: `${plural(r.suspeitos.size, 'valor unitário parece discrepante', 'valores unitários parecem discrepantes')} pelo critério de Chauvenet (em vermelho na coluna ${tipo.unidade}). Confira ou desmarque o dado.` },
  ]

  return (
    <div className="space-y-3">
      <Link to="/amostragem" className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-[var(--text)]"><ArrowLeft size={14} /> Amostragem</Link>

      <section className="card cab-amostra overflow-hidden">
        <div className="flex flex-wrap items-start gap-3 p-4">
          <IconeTipo tipo={a.propertyType} size={20} />
          <div className="min-w-[240px] flex-1">
            <h1 className="text-[20px] font-semibold leading-tight tracking-[-0.3px]">{a.title}</h1>
            <p className="mt-0.5 text-[13px] text-muted">
              {tipo.nome} · {a.purpose === 'ALUGUEL' ? 'Aluguel (valor mensal)' : 'Venda'}
              {textoAbrangencia(a) ? ` · ${textoAbrangencia(a)}` : ''}
              {a.serviceOrderRef ? ` · ${a.serviceOrderRef}` : ''}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px]">
              <ChipValidade data={a.referenceDate} meses={a.validityMonths} detalhe />
              <span><span className="text-muted">Data-base</span> <b className="tnum">{fmtData(a.referenceDate)}</b></span>
              <span>
                <span className="text-muted">Validade</span> <b>{plural(a.validityMonths, 'mês', 'meses')}</b>{' '}
                <span className="text-muted">(até {fmtData(validoAte(a.referenceDate, a.validityMonths))})</span>
              </span>
              {a.createdByName && <span className="text-muted">por {a.createdByName}</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {sujo && <button className="btn btn-primary" onClick={() => salvar()}><Save size={15} /> Salvar alterações</button>}
            <button className="btn btn-secondary" onClick={() => void baixarExcel()}><Download size={15} /> Exportar Excel</button>
            <button className="btn btn-secondary" onClick={() => setJanela('importar')}><Upload size={15} /> Importar</button>
          </div>
        </div>
        <div className="barra-acoes flex flex-wrap gap-1 px-3 py-2">
          <button className="btn btn-ghost btn-sm" onClick={() => { setCabEd(paraCabecalho(a)); setErroJanela(''); setJanela('cabecalho') }}><Pencil size={14} /> Dados da pesquisa</button>
          <button className="btn btn-ghost btn-sm" onClick={() => { setVarsEd(copia(a.variables)); setJanela('variaveis') }}><SlidersHorizontal size={14} /> Variáveis ({a.variables.length})</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setJanela('renovar')}><RefreshCw size={14} /> Renovar</button>
          <button className="btn btn-ghost btn-sm ml-auto text-[var(--vermelho)]" onClick={() => setJanela('excluir')}><Trash2 size={14} /> Excluir</button>
        </div>
      </section>

      {aviso && <div className={`aviso-ficha ${aviso.tom === 'ok' ? 'aviso-ok' : 'aviso-vermelho'}`}><span>{aviso.texto}</span></div>}

      <Indicadores r={r} total={a.items.length - r.vazios} unidade={tipo.unidade} meses={a.validityMonths} />
      <Avisos itens={avisos} />

      <section className="card overflow-hidden">
        <header className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
          <b className="text-[14px]">Dados de mercado</b>
          <span className="text-[12px] text-muted">
            {a.purpose === 'ALUGUEL' ? 'Aluguel mensal' : 'Valores de venda'} · unitário em {tipo.unidade} · <span className="text-[var(--vermelho)]">*</span> obrigatório
          </span>
          <span className="legenda-amarelo ml-auto">a atualizar</span>
          <button className="btn btn-ghost btn-sm" title="Adicionar uma variável como nova coluna" onClick={() => setJanela('coluna')}><Plus size={14} /> Coluna</button>
          <button className="btn btn-ghost btn-sm" title="Cria 10 linhas vazias para colar dados do Excel" onClick={() => maisLinhas(10)}><Plus size={14} /> 10 linhas</button>
          <button className="btn btn-secondary btn-sm" onClick={() => maisLinhas(1, true)}><Plus size={14} /> Adicionar dado</button>
        </header>
        {a.items.length ? (
          <>
            <Planilha
              vars={a.variables}
              itens={a.items}
              meses={a.validityMonths}
              r={r}
              unidade={tipo.unidade}
              caixaRef={caixa}
              onCel={(i, v, bruto) => mudarItem(i, (d) => ({ ...d, values: { ...d.values, [v.key]: converter(v, bruto) } }))}
              onData={(i, dt) => mudarItem(i, (d) => ({ ...d, collectedAt: dt || hoje() }))}
              onAtivo={(i, at) => mudarItem(i, (d) => ({ ...d, active: at }))}
              onAtualizar={(i) => mudarItem(i, (d) => ({ ...d, collectedAt: hoje() }))}
              onDuplicar={(i) => mudarItens((its) => [...its.slice(0, i + 1), novoDado(its[i]), ...its.slice(i + 1)])}
              onRemover={(i) => mudarItens((its) => its.filter((_, j) => j !== i))}
              onMover={(de, para) => mudar((x) => ({ ...x, variables: moverVariavel(x.variables, de, para) }))}
              onAdicionarColuna={() => setJanela('coluna')}
              onColar={colar}
              onNovaLinha={() => maisLinhas(1)}
              onMaisLinhas={(n) => maisLinhas(n)}
              onInserirAbaixo={(i) => mudarItens((its) => [...its.slice(0, i + 1), novoDado(), ...its.slice(i + 1)])}
            />
            <footer className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-2.5">
              <div className="guia-planilha">
                <span className="guia-item guia-destaque">
                  <ClipboardPaste size={15} />
                  <span><b>Colar do Excel:</b> clique na primeira célula vazia e aperte <kbd>Ctrl</kbd>+<kbd>V</kbd>. Faltou linha? Ela é criada sozinha.</span>
                </span>
              </div>
              {sujo && (
                <>
                  <span className="ml-auto font-semibold text-[12px] text-[var(--laranja-txt)]">Alterações não salvas</span>
                  <button className="btn btn-primary btn-sm" onClick={() => salvar()}><Save size={14} /> Salvar</button>
                </>
              )}
            </footer>
          </>
        ) : (
          <Empty
            title="Nenhum dado ainda"
            text="Adicione os dados da pesquisa aqui ou importe de uma planilha do Excel (baixe o modelo pela importação)."
            action={
              <div className="flex gap-2">
                <button className="btn btn-primary btn-sm" onClick={() => maisLinhas(1, true)}><Plus size={14} /> Adicionar dado</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setJanela('importar')}><Upload size={14} /> Importar Excel</button>
              </div>
            }
          />
        )}
      </section>

      <AdicionarColuna
        aberta={janela === 'coluna'}
        onClose={() => setJanela('')}
        tipoId={a.propertyType}
        vars={a.variables}
        onAdicionar={(v) => { mudar((x) => ({ ...x, variables: inserirNoGrupo(x.variables, v) })); avisar('ok', `Coluna “${v.label}” adicionada. Salve para guardar.`) }}
      />

      <Modal
        open={janela === 'cabecalho'}
        onClose={() => setJanela('')}
        width={760}
        title="Dados da pesquisa"
        footer={
          <>
            <span className="mr-auto text-[12.5px] text-[var(--vermelho)]">{erroJanela}</span>
            <button className="btn btn-ghost" onClick={() => setJanela('')}>Cancelar</button>
            <button className="btn btn-primary" onClick={aplicarCabecalho}>Salvar</button>
          </>
        }>
        {cabEd && <CamposCabecalho valor={cabEd} set={(k, v) => setCabEd((c) => (c ? { ...c, [k]: v } : c))} />}
      </Modal>

      <Modal
        open={janela === 'variaveis'}
        onClose={() => setJanela('')}
        width={860}
        title="Variáveis da amostragem"
        footer={
          <>
            <span className="mr-auto text-[12px] text-muted">Desmarcar só esconde a coluna: os valores digitados ficam guardados.</span>
            <button className="btn btn-ghost" onClick={() => setJanela('')}>Cancelar</button>
            <button className="btn btn-primary" onClick={aplicarVariaveis}>Aplicar</button>
          </>
        }>
        <SeletorVariaveis tipoId={a.propertyType} valor={varsEd} onChange={setVarsEd} />
      </Modal>

      <ImportarExcel
        aberta={janela === 'importar'}
        onClose={() => setJanela('')}
        amostragem={{ propertyType: a.propertyType, variables: a.variables, referenceDate: a.referenceDate }}
        baixarModelo={(_, vars) => exportar({ ...corpo(), variables: vars, items: [] }, `Modelo - ${a.title}.xlsx`.replace(/[\\/:*?"<>|]+/g, '-'))}
        onConcluir={(res) => {
          const x = { ...a, variables: res.variables, items: res.substituir ? res.itens : [...a.items, ...res.itens] }
          salvar(`${plural(res.itens.length, 'dado importado', 'dados importados')}.`, x)
        }}
      />

      <Modal
        open={janela === 'excluir'}
        onClose={() => setJanela('')}
        title="Excluir amostragem?"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setJanela('')}>Cancelar</button>
            <button className="btn btn-primary !bg-[var(--vermelho)]" onClick={excluir}>Excluir</button>
          </>
        }>
        <p className="text-[13.5px]">“{a.title}” e os {a.items.length} dados dela saem da lista de amostragens. Exporte o Excel antes se quiser guardar uma cópia.</p>
      </Modal>

      <Modal
        open={janela === 'renovar'}
        onClose={() => setJanela('')}
        title="Renovar amostragem"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setJanela('')}>Cancelar</button>
            <button className="btn btn-primary" onClick={renovar}>Criar amostragem renovada</button>
          </>
        }>
        <p className="text-[13.5px]">
          Cria uma nova amostragem com data-base de hoje, as mesmas variáveis e os <b>{validos}</b> dados ainda dentro da validade
          {a.items.length - r.vazios - validos > 0 ? ` (ficam de fora ${a.items.length - r.vazios - validos} a atualizar)` : ''}. Esta amostragem continua guardada como
          histórico.
        </p>
      </Modal>
    </div>
  )
}
