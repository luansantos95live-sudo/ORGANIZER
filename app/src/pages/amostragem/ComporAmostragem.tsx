import { useMemo, useState } from 'react'
import { Modal } from '../../components/ui'
import type { ResearchSample, ResearchSampleInput } from '../../lib/amostragem/types'
import { TIPOS, nomeTipo, tipoPorId } from '../../lib/amostragem/catalogo'
import { candidatos, copiarDados, juntarVariaveis } from '../../lib/amostragem/compor'
import { type Cabecalho, CamposCabecalho, cabecalhoVazio, validarCabecalho } from './CamposCabecalho'
import { cidadeDe } from './ListaPorCidade'
import { PassoDados } from './PassoDados'
import { ChipValidade } from './pecas'

const PASSOS = ['Amostragens de origem', 'Escolher os dados', 'Nova amostragem'] as const

/**
 * Compor amostragem: junta numa amostragem nova os dados escolhidos de amostragens já cadastradas (de uma ou várias
 * cidades). As originais não mudam; cada dado copiado guarda a cidade e de qual amostragem veio.
 */
export function ComporAmostragem({ aberta, onClose, amostras, onCriar }: {
  aberta: boolean
  onClose: () => void
  amostras: ResearchSample[]
  onCriar: (a: ResearchSampleInput) => void
}) {
  const [passo, setPasso] = useState(0)
  const tiposComDados = TIPOS.filter((t) => amostras.some((r) => r.propertyType === t.id && r.items.length))
  const [tipo, setTipo] = useState('')
  const tipoAtual = tipo || tiposComDados[0]?.id || 'TERRENO'
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set())
  const [escolhidos, setEscolhidos] = useState<Set<string>>(new Set())
  const [cab, setCab] = useState<Cabecalho>(cabecalhoVazio)
  const [erro, setErro] = useState('')

  const doTipo = amostras.filter((r) => r.propertyType === tipoAtual && r.items.length).sort((a, b) => cidadeDe(a).localeCompare(cidadeDe(b), 'pt-BR'))
  const origens = useMemo(() => amostras.filter((a) => marcadas.has(a.id)), [amostras, marcadas])
  const todos = useMemo(() => candidatos(origens), [origens])
  const selecionados = todos.filter((c) => escolhidos.has(c.chave))

  const alternarOrigem = (id: string) => {
    const s = new Set(marcadas)
    if (s.has(id)) s.delete(id)
    else s.add(id)
    setMarcadas(s)
  }
  const irParaDados = () => {
    if (!marcadas.size) return setErro('Marque ao menos uma amostragem.')
    setErro('')
    setEscolhidos(new Set())
    setPasso(1)
  }
  const irParaCabecalho = () => {
    if (!selecionados.length) return setErro('Escolha ao menos um dado.')
    setErro('')
    const cidades = [...new Set(selecionados.map((c) => c.cidade))]
    const ufs = [...new Set(selecionados.map((c) => c.origem.state).filter(Boolean))]
    setCab({
      ...cabecalhoVazio(),
      title: `${nomeTipo(tipoAtual)} · ${cidades.join(', ')}`.slice(0, 160),
      scope: cidades.length > 1 ? 'CIDADE' : 'BAIRRO',
      city: cidades.join(', ').slice(0, 120),
      state: ufs.length === 1 ? ufs[0]! : '',
      region: cidades.length > 1 ? '' : [...new Set(selecionados.map((c) => String(c.dado.values.bairro ?? '').trim()).filter(Boolean))].join(', ').slice(0, 160),
      purpose: selecionados[0]!.origem.purpose,
      validityMonths: selecionados[0]!.origem.validityMonths,
      notes: `Amostragem composta com dados de: ${[...new Set(selecionados.map((c) => c.origem.title))].join('; ')}.`.slice(0, 4000),
    })
    setPasso(2)
  }
  const fechar = () => {
    onClose()
    setTimeout(() => { setPasso(0); setMarcadas(new Set()); setEscolhidos(new Set()); setErro('') }, 200)
  }
  const criar = () => {
    const e = validarCabecalho(cab)
    if (e) return setErro(e)
    onCriar({
      title: cab.title.trim(),
      propertyType: tipoAtual,
      purpose: cab.purpose,
      scope: cab.scope,
      state: cab.state || null,
      city: cab.city.trim() || null,
      region: cab.region.trim() || null,
      serviceOrderRef: cab.serviceOrderRef.trim() || null,
      referenceDate: cab.referenceDate,
      validityMonths: cab.validityMonths,
      notes: cab.notes.trim() || null,
      variables: juntarVariaveis(origens),
      items: copiarDados(selecionados),
    })
    fechar()
  }

  return (
    <Modal
      open={aberta}
      onClose={fechar}
      width={1000}
      altura="min(800px, calc(100vh - 48px))"
      title="Compor amostragem com dados já cadastrados"
      fixo={
        <ol className="flex flex-wrap gap-1.5 text-[12.5px]">
          {PASSOS.map((t, i) => (
            <li key={t} className={`passo-ficha ${passo === i ? 'ativo' : ''} ${passo > i ? 'feito' : ''}`}>
              <button type="button" disabled={i > passo} onClick={() => setPasso(i)}>
                <span className="n">{i + 1}</span> {t}
              </button>
            </li>
          ))}
        </ol>
      }
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <span className="text-[12.5px] text-[var(--vermelho)]">{erro}</span>
          <div className="flex gap-2">
            {passo > 0 && <button type="button" className="btn btn-ghost" onClick={() => setPasso(passo - 1)}>Voltar</button>}
            {passo === 0 && <button type="button" className="btn btn-primary" onClick={irParaDados}>Ver os dados ({marcadas.size})</button>}
            {passo === 1 && (
              <button type="button" className="btn btn-primary" onClick={irParaCabecalho}>
                Usar {escolhidos.size} {escolhidos.size === 1 ? 'dado' : 'dados'}
              </button>
            )}
            {passo === 2 && <button type="button" className="btn btn-primary" onClick={criar}>Criar amostragem composta</button>}
          </div>
        </div>
      }>
      {passo === 0 && (
        <div className="space-y-3">
          <p className="text-[13px] text-muted">
            Escolha de quais amostragens vêm os dados. Só dá para juntar amostragens do mesmo tipo de imóvel; as originais não mudam.
          </p>
          <label className="flex w-fit flex-col gap-1">
            <span className="text-[12px] font-medium text-muted">Tipo de imóvel</span>
            <select className="input w-[260px]" value={tipoAtual} onChange={(e) => { setTipo(e.target.value); setMarcadas(new Set()) }}>
              {tiposComDados.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </label>
          {doTipo.length ? (
            <ul className="flex flex-col gap-1.5">
              {doTipo.map((r) => (
                <li key={r.id}>
                  <label className="linha-amostra flex cursor-pointer flex-wrap items-center gap-3 rounded-[12px] border border-border px-3 py-2">
                    <input type="checkbox" className="h-4 w-4 accent-[var(--brand)]" checked={marcadas.has(r.id)} onChange={() => alternarOrigem(r.id)} />
                    <span className="chip !h-[22px] bg-[var(--surface-2)] text-[11.5px] font-semibold">{cidadeDe(r)}</span>
                    <span className="min-w-[200px] flex-1 truncate text-[13.5px] font-semibold">{r.title}</span>
                    <span className="text-[12px] text-muted tnum">{r.items.length} dados</span>
                    <ChipValidade data={r.referenceDate} meses={r.validityMonths} />
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-muted">Nenhuma amostragem com dados para {tipoPorId(tipoAtual).nome}.</p>
          )}
        </div>
      )}
      {passo === 1 && <PassoDados todos={todos} tipoId={tipoAtual} escolhidos={escolhidos} onEscolher={setEscolhidos} />}
      {passo === 2 && (
        <>
          <p className="mb-3 text-[13px] text-muted">
            Confira os dados da nova amostragem. Ela recebe {escolhidos.size} dados de {new Set(selecionados.map((c) => c.cidade)).size} cidade(s), com a
            coluna “Cidade” preenchida.
          </p>
          <CamposCabecalho valor={cab} set={(k, v) => setCab((c) => ({ ...c, [k]: v }))} />
        </>
      )}
    </Modal>
  )
}
