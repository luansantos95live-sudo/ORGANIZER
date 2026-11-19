import { Download, FileSpreadsheet } from 'lucide-react'
import { useState } from 'react'
import { Modal } from '../../components/ui'
import type { DadoAmostra, VariavelAmostra } from '../../lib/amostragem/types'
import { TIPOS, opcoesDoTipo, ordenar, rotuloColuna, variaveisIniciais } from '../../lib/amostragem/catalogo'
import { type Destino, type PlanilhaLida, lerPlanilha, montarDados, sugerirDestinos } from '../../lib/amostragem/excel'
import { type Cabecalho, CamposCabecalho, Campo, cabecalhoVazio, validarCabecalho } from './CamposCabecalho'

export type ResultadoImportacao = {
  cabecalho?: Cabecalho & { propertyType: string }
  variables: VariavelAmostra[]
  itens: DadoAmostra[]
  substituir: boolean
}

type Existente = { propertyType: string; variables: VariavelAmostra[]; referenceDate: string }

/** Variáveis que a coluna pode receber: as da amostragem (ou todas do tipo, numa nova, mais as da planilha do FLUXO). */
const disponiveisDe = (amostragem: Existente | undefined, tipo: string, pl: PlanilhaLida | null): VariavelAmostra[] => {
  if (amostragem) return amostragem.variables
  const base = opcoesDoTipo(tipo).map((o) => o.variavel)
  if (!pl?.meta) return base
  const chaves = new Set(pl.meta.variables.map((v) => v.key))
  return [...pl.meta.variables, ...base.filter((v) => !chaves.has(v.key))]
}

/**
 * Importar amostragem do Excel (.xlsx). Planilhas exportadas pelo FLUXO voltam inteiras (variáveis e cabeçalho);
 * outras planilhas passam pelo mapeamento de colunas → variáveis (sugerido pelos títulos).
 */
export function ImportarExcel({ aberta, onClose, amostragem, onConcluir, baixarModelo }: {
  aberta: boolean
  onClose: () => void
  /** Sem amostragem = cria uma nova a partir da planilha. */
  amostragem?: Existente
  onConcluir: (r: ResultadoImportacao) => void
  baixarModelo: (tipoId: string, vars: VariavelAmostra[]) => Promise<void>
}) {
  const nova = !amostragem
  const [planilha, setPlanilha] = useState<PlanilhaLida | null>(null)
  const [nomeArquivo, setNomeArquivo] = useState('')
  const [destinos, setDestinos] = useState<Destino[]>([])
  const [tipo, setTipo] = useState('TERRENO')
  const [cab, setCab] = useState<Cabecalho>(cabecalhoVazio)
  const [substituir, setSubstituir] = useState(false)
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const tipoAtual = amostragem?.propertyType ?? tipo
  const disponiveis = disponiveisDe(amostragem, tipo, planilha)

  const abrirArquivo = async (f: File | undefined) => {
    if (!f) return
    setErro('')
    setOcupado(true)
    try {
      const pl = await lerPlanilha(f)
      if (!pl.linhas.length) throw new Error('Não há dados abaixo dos títulos das colunas.')
      setNomeArquivo(f.name)
      let t = tipo
      if (nova && pl.meta) {
        const m = pl.meta
        t = TIPOS.some((x) => x.id === m.propertyType) ? m.propertyType : 'OUTRO'
        setTipo(t)
        setCab({
          title: m.title ?? '',
          purpose: m.purpose === 'ALUGUEL' ? 'ALUGUEL' : 'VENDA',
          scope: m.scope === 'CIDADE' ? 'CIDADE' : 'BAIRRO',
          state: m.state ?? '',
          city: m.city ?? '',
          region: m.region ?? '',
          serviceOrderRef: m.serviceOrderRef ?? '',
          referenceDate: m.referenceDate ?? cab.referenceDate,
          validityMonths: m.validityMonths ?? 6,
          notes: m.notes ?? '',
        })
      } else if (nova && !cab.title) {
        setCab((c) => ({ ...c, title: f.name.replace(/\.xlsx$/i, '').slice(0, 160) }))
      }
      setPlanilha(pl)
      setDestinos(sugerirDestinos(pl.colunas, pl.linhas, disponiveisDe(amostragem, t, pl), amostragem?.propertyType ?? t))
    } catch (e) {
      setPlanilha(null)
      setErro(e instanceof Error && e.message ? e.message : 'Não foi possível ler a planilha.')
    } finally {
      setOcupado(false)
    }
  }

  const valorDestino = (d: Destino) => (d.tipo === 'variavel' ? `v:${d.key}` : d.tipo === 'nova' ? 'nova' : d.tipo)
  const trocarDestino = (i: number, valor: string) => {
    const pl = planilha!
    let d: Destino
    if (valor.startsWith('v:')) d = { tipo: 'variavel', key: valor.slice(2) }
    else if (valor === 'nova') {
      const sug = sugerirDestinos([pl.colunas[i]!], pl.linhas.map((l) => [l[i]]), [], tipoAtual)[0]!
      d = sug.tipo === 'nova' ? sug : { tipo: 'nova', variavel: { key: `p_coluna_${i + 1}`, label: pl.colunas[i]!, type: 'texto', group: 'Personalizadas', custom: true } }
    } else d = { tipo: valor as 'ignorar' | 'data' | 'ativo' }
    // a mesma variável não recebe duas colunas: a anterior vira "ignorar"
    setDestinos((atual) =>
      atual.map((x, j) =>
        j === i ? d : d.tipo === 'variavel' && x.tipo === 'variavel' && x.key === d.key ? { tipo: 'ignorar' } : d.tipo === 'data' && x.tipo === 'data' ? { tipo: 'ignorar' } : x,
      ),
    )
  }
  const amostraColuna = (i: number) =>
    planilha!.linhas
      .map((l) => l[i])
      .filter((x) => x != null && String(x).trim())
      .slice(0, 2)
      .map((x) => (x instanceof Date ? x.toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : String(x)))
      .join(' · ')
      .slice(0, 60)
  const semData = !destinos.some((d) => d.tipo === 'data')
  const semValor = !destinos.some((d) => d.tipo === 'variavel' && d.key === 'valor')

  const fechar = () => {
    onClose()
    setTimeout(() => { setPlanilha(null); setDestinos([]); setNomeArquivo(''); setErro(''); setSubstituir(false); setCab(cabecalhoVazio()) }, 200)
  }

  const concluir = () => {
    const pl = planilha
    if (!pl) return
    if (nova) {
      const e = validarCabecalho(cab)
      if (e) return setErro(e)
    }
    const dataPadrao = amostragem?.referenceDate ?? cab.referenceDate
    const { itens, novas } = montarDados(pl.linhas, destinos, disponiveis, dataPadrao, nova || substituir ? pl.meta?.ids : undefined)
    let variables: VariavelAmostra[]
    if (amostragem) variables = [...amostragem.variables, ...novas.filter((v) => !amostragem.variables.some((x) => x.key === v.key))]
    else if (pl.meta) variables = [...pl.meta.variables, ...novas.filter((v) => !pl.meta!.variables.some((x) => x.key === v.key))]
    else {
      // nova sem metadados: obrigatórias do tipo + as que receberam coluna + as criadas
      const usadas = new Set(destinos.flatMap((d) => (d.tipo === 'variavel' ? [d.key] : [])))
      const fixas = opcoesDoTipo(tipo).filter((o) => o.fixa).map((o) => o.variavel)
      variables = ordenar([...fixas, ...disponiveis.filter((v) => usadas.has(v.key) && !fixas.some((f) => f.key === v.key)), ...novas])
    }
    onConcluir({ cabecalho: nova ? { ...cab, propertyType: tipo } : undefined, variables, itens, substituir })
    fechar()
  }

  return (
    <Modal
      open={aberta}
      onClose={fechar}
      width={820}
      title={nova ? 'Importar amostragem do Excel' : 'Importar dados do Excel'}
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <span className="text-[12.5px] text-[var(--vermelho)]">{erro}</span>
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost" onClick={fechar}>Cancelar</button>
            <button type="button" className="btn btn-primary" disabled={!planilha || ocupado} onClick={concluir}>
              {ocupado ? 'Aguarde…' : `Importar ${planilha?.linhas.length ?? 0} ${planilha?.linhas.length === 1 ? 'dado' : 'dados'}`}
            </button>
          </div>
        </div>
      }>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-border p-3">
          <span className="icone-tipo"><FileSpreadsheet size={18} /></span>
          <div className="min-w-[200px] flex-1 text-[13px]">
            {planilha ? (
              <>
                <b>{nomeArquivo}</b>
                <p className="text-[12px] text-muted">
                  Aba “{planilha.aba}” · {planilha.linhas.length} linhas · {planilha.colunas.length} colunas
                  {planilha.meta ? ' · exportada pelo FLUXO (variáveis reconhecidas)' : ''}
                </p>
              </>
            ) : (
              <>
                <b>Escolha a planilha (.xlsx)</b>
                <p className="text-[12px] text-muted">Uma linha por dado de mercado, com os títulos das colunas na primeira linha da tabela.</p>
              </>
            )}
          </div>
          <label className="btn btn-secondary btn-sm cursor-pointer">
            {planilha ? 'Trocar arquivo' : 'Escolher arquivo'}
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => { void abrirArquivo(e.currentTarget.files?.[0]); e.currentTarget.value = '' }}
            />
          </label>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            title="Planilha em branco com as colunas certas, na identidade da empresa"
            onClick={() => void baixarModelo(tipoAtual, amostragem?.variables ?? variaveisIniciais(tipo))}>
            <Download size={14} /> Baixar modelo
          </button>
        </div>

        {nova && (
          <Campo rotulo="Tipo de imóvel">
            <select
              className="input w-full sm:w-[280px]"
              value={tipo}
              onChange={(e) => {
                const t = e.target.value
                setTipo(t)
                if (planilha) setDestinos(sugerirDestinos(planilha.colunas, planilha.linhas, disponiveisDe(undefined, t, planilha), t))
              }}>
              {TIPOS.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </Campo>
        )}

        {planilha && (
          <>
            {nova && <CamposCabecalho valor={cab} set={(k, v) => setCab((c) => ({ ...c, [k]: v }))} />}
            {!nova && (
              <div className="seg seg-baixo w-fit">
                <button type="button" aria-pressed={!substituir} onClick={() => setSubstituir(false)}>Adicionar aos dados atuais</button>
                <button type="button" aria-pressed={substituir} onClick={() => setSubstituir(true)}>Substituir os dados atuais</button>
              </div>
            )}
            <section>
              <h4 className="card-tit mb-1">Colunas da planilha → variáveis</h4>
              <p className="mb-2 text-[12px] text-muted">Conferimos pelos títulos. Ajuste o que não bateu; colunas desconhecidas viram variáveis personalizadas.</p>
              <div className="overflow-hidden rounded-xl border border-border">
                <table className="w-full text-[12.5px]">
                  <thead className="bg-[var(--surface-2)] text-[11px] text-muted">
                    <tr>
                      <th className="px-3 py-1.5 text-left font-semibold">Coluna</th>
                      <th className="px-3 py-1.5 text-left font-semibold">Exemplo</th>
                      <th className="px-3 py-1.5 text-left font-semibold">Vai para</th>
                    </tr>
                  </thead>
                  <tbody>
                    {planilha.colunas.map((c, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="px-3 py-1 font-medium">{c}</td>
                        <td className="max-w-[220px] truncate px-3 py-1 text-muted">{amostraColuna(i)}</td>
                        <td className="px-3 py-1">
                          <select
                            aria-label={`Destino da coluna ${c}`}
                            className={`input input-sm w-full min-w-[220px] ${destinos[i]?.tipo === 'ignorar' ? 'text-muted' : ''}`}
                            value={destinos[i] ? valorDestino(destinos[i]!) : 'ignorar'}
                            onChange={(e) => trocarDestino(i, e.target.value)}>
                            <option value="ignorar">Ignorar coluna</option>
                            <option value="data">Data da coleta</option>
                            <option value="ativo">Usado no cálculo (Sim/Não)</option>
                            <option value="nova">Nova variável: {c.slice(0, 40)}</option>
                            <optgroup label="Variáveis">
                              {disponiveis.map((v) => <option key={v.key} value={`v:${v.key}`}>{rotuloColuna(v)}</option>)}
                            </optgroup>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {(semData || semValor) && (
                <p className="mt-2 text-[12px] text-[var(--laranja-txt)]">
                  {semValor && 'Nenhuma coluna foi ligada ao Valor: o valor unitário não será calculado. '}
                  {semData && 'Sem coluna de data: os dados entram com a data-base da amostragem.'}
                </p>
              )}
            </section>
          </>
        )}
      </div>
    </Modal>
  )
}
