import { Lightbulb, Pencil } from 'lucide-react'
import type { ReactNode } from 'react'
import type { VariavelAmostra } from '../../lib/amostragem/types'
import { fmtData, validoAte } from '../../lib/amostragem/calculo'
import { GRUPOS, rotuloColuna, tipoPorId } from '../../lib/amostragem/catalogo'
import { type Cabecalho, textoAbrangencia } from './CamposCabecalho'
import { IconeTipo, plural } from './pecas'

/** Caixa explicativa no topo de cada passo do assistente. */
export function Explica({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="explica mb-4">
      <Lightbulb size={16} />
      <div>
        <b className="block text-[14px]">{titulo}</b>
        <span className="text-[12.5px] text-muted">{children}</span>
      </div>
    </div>
  )
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-[.06em] text-muted">{rotulo}</dt>
      <dd className="font-medium">{valor || <span className="text-muted">—</span>}</dd>
    </div>
  )
}

/** Resumo ao lado do assistente: acompanha o que já foi escolhido, passo a passo. */
export function ResumoNova({ tipoId, cab, vars, passo }: { tipoId: string; cab: Cabecalho; vars: VariavelAmostra[]; passo: number }) {
  const t = tipoId ? tipoPorId(tipoId) : null
  return (
    <aside className="resumo-nova">
      <div className="card-tit mb-2">Sua amostragem</div>
      {!t ? (
        <p className="text-[12.5px] text-muted">Escolha o tipo de imóvel.</p>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <IconeTipo tipo={tipoId} />
            <div>
              <b className="block text-[13px] leading-tight">{t.nome}</b>
              <span className="text-[11.5px] text-muted">{cab.purpose === 'ALUGUEL' ? 'Aluguel' : 'Venda'} · {t.unidade}</span>
            </div>
          </div>
          <dl className="mt-3 flex flex-col gap-2 text-[12.5px]">
            <Linha rotulo="Título" valor={cab.title} />
            <Linha rotulo="Onde" valor={textoAbrangencia(cab)} />
            <Linha
              rotulo="Validade"
              valor={cab.referenceDate ? `${plural(cab.validityMonths, 'mês', 'meses')} · até ${fmtData(validoAte(cab.referenceDate, cab.validityMonths))}` : ''}
            />
            {passo >= 3 && <Linha rotulo="Variáveis" valor={plural(vars.length, 'coluna', 'colunas')} />}
          </dl>
          <div className="dica-nova mt-3">
            <b>Quantos dados coletar?</b> Pela NBR 14653-2, no tratamento por fatores: no mínimo 3, bom a partir de 5 e o ideal é 12 ou mais dados
            semelhantes ao avaliando.
          </div>
        </>
      )}
    </aside>
  )
}

function Bloco({ titulo, onEditar, children }: { titulo: string; onEditar: () => void; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border p-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="card-tit">{titulo}</span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onEditar}><Pencil size={13} /> Editar</button>
      </div>
      <div className="text-[13px]">{children}</div>
    </section>
  )
}

/** Passo final: o que vai ser criado, com atalho para editar cada parte, e o que fazer depois. */
export function Revisao({ tipoId, cab, vars, irPara }: { tipoId: string; cab: Cabecalho; vars: VariavelAmostra[]; irPara: (passo: number) => void }) {
  const grupos = GRUPOS.map((g) => ({ g, vs: vars.filter((v) => v.group === g) })).filter((x) => x.vs.length)
  return (
    <div className="space-y-3">
      <Bloco titulo="Tipo de imóvel" onEditar={() => irPara(1)}>
        {tipoPorId(tipoId).nome} · {cab.purpose === 'ALUGUEL' ? 'Aluguel (valor mensal)' : 'Venda'}
      </Bloco>
      <Bloco titulo="Dados da pesquisa" onEditar={() => irPara(2)}>
        <b>{cab.title}</b>
        <br />
        {textoAbrangencia(cab) || '—'} · data-base {fmtData(cab.referenceDate)} · vale {plural(cab.validityMonths, 'mês', 'meses')} (até{' '}
        {fmtData(validoAte(cab.referenceDate, cab.validityMonths))})
      </Bloco>
      <Bloco titulo={`Variáveis (${vars.length})`} onEditar={() => irPara(3)}>
        {grupos.map((g) => (
          <div key={g.g} className="mt-1">
            <span className="text-[11px] font-semibold uppercase tracking-[.06em] text-muted">{g.g}:</span> {g.vs.map(rotuloColuna).join(' · ')}
          </div>
        ))}
      </Bloco>
      <div className="dica-nova">
        <b>Depois de criar</b>
        <ol className="ml-4 mt-1 list-decimal space-y-0.5">
          <li>Lance os dados na planilha ou importe do Excel.</li>
          <li>Todo dado precisa do <b>link ou endereço da fonte</b>; sem ela, não entra no cálculo.</li>
          <li>
            Quando a coleta passar de {plural(cab.validityMonths, 'mês', 'meses')}, a linha fica <span className="selo-atualizar">amarela</span> para atualizar.
          </li>
          <li>Exporte o Excel com a identidade da sua empresa.</li>
        </ol>
      </div>
    </div>
  )
}
