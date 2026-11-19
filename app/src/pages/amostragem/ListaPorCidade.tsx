import { CalendarClock, ChevronDown, ClipboardList, Layers, MapPin } from 'lucide-react'
import { useState } from 'react'
import type { ResearchSample } from '../../lib/amostragem/types'
import { dadoVazio, fmtData, situacao, validoAte } from '../../lib/amostragem/calculo'
import { nomeTipo } from '../../lib/amostragem/catalogo'
import { abrangenciaDe } from './CamposCabecalho'
import { ChipValidade, IconeTipo } from './pecas'

const VARIAS = 'Várias cidades'
const SEM = 'Sem cidade'

/** Cidade da amostragem para agrupar: "Brasília/DF"; composta de várias cidades vai para "Várias cidades". */
export const cidadeDe = (a: { city?: string | null; state?: string | null }) =>
  !a.city ? SEM : /[,;]/.test(a.city) ? VARIAS : `${a.city.trim()}${a.state ? `/${a.state}` : ''}`

const cidadesDe = (a: ResearchSample) => (a.city ?? '').split(/[,;]/).map((c) => c.trim()).filter(Boolean)
const listaOS = (a: ResearchSample) => (a.serviceOrderRef ?? '').split(/[,;]/).map((c) => c.trim()).filter(Boolean)

/** Uma amostragem: card com tipo, título, dados usados, data-base e validade. */
function CardAmostra({ a, mista, onAbrir }: { a: ResearchSample; mista: boolean; onAbrir: () => void }) {
  const dados = a.items.filter((d) => !dadoVazio(d))
  const ativos = dados.filter((d) => d.active).length
  const temVencido = dados.some((d) => situacao(d.collectedAt, a.validityMonths) === 'vencida')
  const oss = listaOS(a)
  const pct = dados.length ? Math.round((ativos / dados.length) * 100) : 0
  return (
    <li>
      <button type="button" className="card-amostra" onClick={onAbrir}>
        <div className="flex items-start gap-3">
          <IconeTipo tipo={a.propertyType} size={20} />
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-semibold uppercase tracking-wide text-[var(--verde-valor)]">
              {nomeTipo(a.propertyType)} · {a.purpose === 'ALUGUEL' ? 'Aluguel' : 'Venda'}
            </div>
            <div className="mt-0.5 text-[16px] font-semibold leading-snug">{a.title}</div>
            <div className="mt-1 text-[13px] text-muted">
              {mista ? (
                <span className="flex flex-wrap gap-1">
                  {cidadesDe(a).map((c) => <span key={c} className="pilula-cidade"><MapPin size={11} /> {c}</span>)}
                </span>
              ) : abrangenciaDe(a.scope) === 'CIDADE' ? (
                'Cidade toda'
              ) : (
                a.region || 'Bairro'
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <div className="text-[22px] font-semibold leading-none tnum">
              {ativos}
              <span className="text-[14px] font-normal text-muted"> de {dados.length} dados</span>
            </div>
            <div className="barra-uso mt-1.5" aria-hidden><span style={{ width: `${pct}%` }} /></div>
            <div className="mt-1 text-[12px] text-muted">usados no cálculo</div>
          </div>
          {temVencido && <span className="selo-atualizar">dado a atualizar</span>}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-3 text-[13px]">
          <span className="flex items-center gap-1.5">
            <CalendarClock size={14} className="text-muted" />
            <span className="text-muted">Data-base</span> <b className="tnum">{fmtData(a.referenceDate)}</b>
          </span>
          <span className="flex items-center gap-1.5">
            <ChipValidade data={a.referenceDate} meses={a.validityMonths} detalhe />
            <span className="text-[12px] text-muted">até {fmtData(validoAte(a.referenceDate, a.validityMonths))}</span>
          </span>
        </div>
        {oss.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1">
            <ClipboardList size={13} className="text-muted" />
            {oss.map((o) => <span key={o} className="pilula-os">{o}</span>)}
          </div>
        )}
      </button>
    </li>
  )
}

/** Lista de amostragens agrupada por cidade: cada cidade é um card que abre e fecha. */
export function ListaPorCidade({ lista, onAbrir }: { lista: ResearchSample[]; onAbrir: (id: string) => void }) {
  const [fechadas, setFechadas] = useState<Set<string>>(new Set())
  const m = new Map<string, ResearchSample[]>()
  for (const a of lista) m.set(cidadeDe(a), [...(m.get(cidadeDe(a)) ?? []), a])
  const peso = (k: string) => (k === SEM ? 2 : k === VARIAS ? 1 : 0)
  const grupos = [...m.entries()].sort(([x], [y]) => peso(x) - peso(y) || x.localeCompare(y, 'pt-BR'))
  const alternar = (k: string) => {
    const s = new Set(fechadas)
    if (s.has(k)) s.delete(k)
    else s.add(k)
    setFechadas(s)
  }
  return (
    <div className="flex flex-col gap-4">
      {grupos.map(([cidade, itens]) => {
        const dados = itens.reduce((s, a) => s + a.items.filter((d) => !dadoVazio(d)).length, 0)
        const porTipo = new Map<string, number>()
        for (const a of itens) porTipo.set(a.propertyType, (porTipo.get(a.propertyType) ?? 0) + 1)
        const aberta = !fechadas.has(cidade)
        const [nome, uf] = cidade.split('/')
        return (
          <section key={cidade} className="card card-cidade">
            <button type="button" className="cab-cidade" aria-expanded={aberta} onClick={() => alternar(cidade)}>
              <span className="ic-cidade">{cidade === VARIAS ? <Layers size={20} /> : <MapPin size={20} />}</span>
              <span className="min-w-0">
                <span className="block text-[19px] font-semibold leading-tight">
                  {nome}
                  {uf && <span className="ml-1.5 text-[14px] font-medium text-muted">{uf}</span>}
                </span>
                <span className="mt-0.5 block text-[13px] text-muted">
                  {cidade === VARIAS ? 'Amostragens mistas, com dados de mais de uma cidade' : 'Amostragens desta cidade'}
                </span>
              </span>
              <span className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
                {[...porTipo.entries()].map(([t, n]) => (
                  <span key={t} className="pilula-tipo">
                    <IconeTipo tipo={t} size={13} /> {n} {nomeTipo(t).split(' /')[0]!.toLowerCase().replace(/^(\S+)/, (w) => (n > 1 ? `${w}s` : w))}
                  </span>
                ))}
                <span className="pilula-total">{dados} dados</span>
              </span>
              <ChevronDown size={18} className="seta" />
            </button>
            {aberta && (
              <ul className="grade-amostras">
                {itens.map((a) => <CardAmostra key={a.id} a={a} mista={cidade === VARIAS} onAbrir={() => onAbrir(a.id)} />)}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}
