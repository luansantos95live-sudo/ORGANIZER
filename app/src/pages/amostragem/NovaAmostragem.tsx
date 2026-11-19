import { Combine, FileSpreadsheet, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Modal } from '../../components/ui'
import type { VariavelAmostra } from '../../lib/amostragem/types'
import { TIPOS, tipoPorId, variaveisIniciais } from '../../lib/amostragem/catalogo'
import { type Cabecalho, CamposCabecalho, cabecalhoVazio, validarCabecalho } from './CamposCabecalho'
import { Explica, ResumoNova, Revisao } from './GuiaNova'
import { IconeTipo } from './pecas'
import { SeletorVariaveis } from './SeletorVariaveis'

export type NovaAmostragemDados = Cabecalho & { propertyType: string; variables: VariavelAmostra[] }

const PASSOS = ['Como começar', 'Tipo de imóvel', 'Dados da pesquisa', 'Variáveis', 'Revisão'] as const

/**
 * Assistente de nova amostragem, didático: como começar (do zero, Excel ou compor), tipo, dados da pesquisa
 * (abrangência e prazo de validade), variáveis e revisão. Cada passo explica o porquê e o resumo ao lado acompanha.
 */
export function NovaAmostragem({ aberta, onClose, onCriar, onImportar, onCompor, podeCompor }: {
  aberta: boolean
  onClose: () => void
  onCriar: (d: NovaAmostragemDados) => void
  onImportar: () => void
  onCompor: () => void
  podeCompor: boolean
}) {
  const [passo, setPasso] = useState(0)
  const [tipo, setTipo] = useState('')
  const [cab, setCab] = useState<Cabecalho>(cabecalhoVazio)
  const [vars, setVars] = useState<VariavelAmostra[]>([])
  const [erro, setErro] = useState('')
  const set = <K extends keyof Cabecalho>(k: K, v: Cabecalho[K]) => setCab((c) => ({ ...c, [k]: v }))

  const escolherTipo = (id: string) => {
    if (id !== tipo) setVars(variaveisIniciais(id))
    if (!cab.title.trim() || cab.title === tipoPorId(tipo || id).nome) set('title', tipoPorId(id).nome)
    setTipo(id)
    setPasso(2)
  }
  const avancar = () => {
    if (passo === 2) {
      const e = validarCabecalho(cab)
      if (e) return setErro(e)
    }
    setErro('')
    setPasso(passo + 1)
  }
  const fechar = () => {
    onClose()
    setTimeout(() => { setPasso(0); setTipo(''); setCab(cabecalhoVazio()); setVars([]); setErro('') }, 200)
  }
  const outroCaminho = (abrir: () => void) => { fechar(); setTimeout(abrir, 220) }

  return (
    <Modal
      open={aberta}
      onClose={fechar}
      width={1040}
      altura="min(800px, calc(100vh - 48px))"
      title="Nova amostragem"
      fixo={
        <div>
          <ol className="flex flex-wrap gap-1.5 text-[12.5px]">
            {PASSOS.map((t, i) => (
              <li key={t} className={`passo-ficha ${passo === i ? 'ativo' : ''} ${passo > i ? 'feito' : ''}`}>
                <button type="button" disabled={i > passo || (i > 1 && !tipo)} onClick={() => setPasso(i)}>
                  <span className="n">{i + 1}</span> {t}
                </button>
              </li>
            ))}
          </ol>
          <div className="barra-progresso mt-2" aria-hidden="true">
            <span style={{ width: `${(passo / (PASSOS.length - 1)) * 100}%` }} />
          </div>
        </div>
      }
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <span className="text-[12.5px] text-[var(--vermelho)]">{erro}</span>
          <div className="flex gap-2">
            {passo > 0 && <button type="button" className="btn btn-ghost" onClick={() => setPasso(passo - 1)}>Voltar</button>}
            {(passo === 2 || passo === 3) && <button type="button" className="btn btn-primary" onClick={avancar}>Continuar</button>}
            {passo === 4 && (
              <button type="button" className="btn btn-primary" onClick={() => { onCriar({ ...cab, propertyType: tipo, variables: vars }); fechar() }}>
                Criar amostragem
              </button>
            )}
          </div>
        </div>
      }>
      <div className={`grid items-start gap-4 ${passo > 0 ? 'lg:grid-cols-[minmax(0,1fr)_250px]' : ''}`}>
        <div className="min-w-0">
          {passo === 0 && (
            <>
              <Explica titulo="Como você quer começar?">
                A amostragem reúne os dados de mercado (ofertas e vendas) que servem de base para avaliar um imóvel. Comece do zero, traga uma planilha
                que você já tem ou junte dados de amostragens já cadastradas.
              </Explica>
              <div className="grid gap-2 sm:grid-cols-3">
                <button type="button" className="tipo-ficha" onClick={() => setPasso(1)}>
                  <span className="icone-tipo"><Sparkles size={18} /></span>
                  <span className="text-[14px] font-semibold">Começar do zero</span>
                  <span className="text-[12px] text-muted">Escolha o tipo de imóvel e as variáveis; depois digite os dados na planilha.</span>
                  <span className="mt-auto text-[11px] font-semibold text-[var(--verde-valor)]">Recomendado para uma pesquisa nova</span>
                </button>
                <button type="button" className="tipo-ficha" onClick={() => outroCaminho(onImportar)}>
                  <span className="icone-tipo"><FileSpreadsheet size={18} /></span>
                  <span className="text-[14px] font-semibold">Importar do Excel</span>
                  <span className="text-[12px] text-muted">Traga uma planilha (.xlsx); as colunas são reconhecidas pelos títulos.</span>
                  <span className="mt-auto text-[11px] font-semibold text-[var(--verde-valor)]">Já tem os dados numa planilha</span>
                </button>
                <button type="button" className="tipo-ficha" disabled={!podeCompor} onClick={() => outroCaminho(onCompor)}>
                  <span className="icone-tipo"><Combine size={18} /></span>
                  <span className="text-[14px] font-semibold">Compor com dados cadastrados</span>
                  <span className="text-[12px] text-muted">Escolha dados de outras amostragens, de uma ou várias cidades.</span>
                  <span className="mt-auto text-[11px] font-semibold text-[var(--verde-valor)]">
                    {podeCompor ? 'Reaproveita o que já foi pesquisado' : 'Precisa de amostragens com dados'}
                  </span>
                </button>
              </div>
            </>
          )}
          {passo === 1 && (
            <>
              <Explica titulo="Qual imóvel você vai pesquisar?">
                Os dados precisam ser parecidos com o imóvel avaliado. Cada tipo já traz as variáveis usuais da NBR 14653 e calcula o valor unitário certo
                (R$/m², R$/ha ou R$/vaga).
              </Explica>
              <div className="grid gap-2 sm:grid-cols-3">
                {TIPOS.map((t) => (
                  <button key={t.id} type="button" className="tipo-ficha" aria-pressed={tipo === t.id} onClick={() => escolherTipo(t.id)}>
                    <IconeTipo tipo={t.id} />
                    <span className="text-[14px] font-semibold">{t.nome}</span>
                    <span className="text-[12px] text-muted">{t.descricao}</span>
                    <span className="mt-auto text-[11px] font-semibold text-[var(--verde-valor)]">Unitário em {t.unidade}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          {passo === 2 && (
            <>
              <Explica titulo="Onde e quando é a pesquisa?">
                A <b>abrangência</b> diz se os dados são da cidade inteira ou de bairros. A <b>data-base</b> é a data de referência dos valores, e o{' '}
                <b>prazo de validade</b> avisa quando a amostragem e cada dado precisam ser atualizados.
              </Explica>
              <CamposCabecalho valor={cab} set={set} />
            </>
          )}
          {passo === 3 && (
            <>
              <Explica titulo="O que você vai anotar de cada imóvel?">
                Cada variável vira uma coluna da planilha. As travadas são obrigatórias (identificação, valor, área e a fonte). As recomendadas já vêm
                marcadas. Use “+ Personalizada” para criar as suas em qualquer grupo. Depois dá para mudar e arrastar as colunas.
              </Explica>
              <SeletorVariaveis tipoId={tipo} valor={vars} onChange={setVars} />
            </>
          )}
          {passo === 4 && (
            <>
              <Explica titulo="Tudo certo? Confira antes de criar.">
                Você ainda pode voltar a qualquer passo. Depois de criada, a amostragem abre na planilha para você lançar os dados.
              </Explica>
              <Revisao tipoId={tipo} cab={cab} vars={vars} irPara={setPasso} />
            </>
          )}
        </div>
        {passo > 0 && <ResumoNova tipoId={tipo} cab={cab} vars={vars} passo={passo} />}
      </div>
    </Modal>
  )
}
