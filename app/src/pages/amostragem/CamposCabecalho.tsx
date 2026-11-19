import { format } from 'date-fns'
import { useMemo, useState, type ReactNode } from 'react'
import type { Abrangencia, Finalidade } from '../../lib/amostragem/types'
import { fmtData, validoAte } from '../../lib/amostragem/calculo'
import { codigoOS } from '../../lib/os'
import { useStore } from '../../store/useStore'

/** Cabeçalho editável da amostragem (sem tipo, variáveis e dados). */
export type Cabecalho = {
  title: string
  purpose: Finalidade
  scope: Abrangencia
  state: string
  city: string
  region: string
  serviceOrderRef: string
  referenceDate: string
  validityMonths: number
  notes: string
}

export const VALIDADES = [3, 6, 12, 24]
export const ABRANGENCIAS: { v: Abrangencia; rotulo: string }[] = [
  { v: 'CIDADE', rotulo: 'Cidade' },
  { v: 'BAIRRO', rotulo: 'Bairro' },
]
/** Abrangência mostrada: só Cidade ou Bairro (as antigas "cidade e bairros" contam como Bairro). */
export const abrangenciaDe = (a?: Abrangencia | null): Abrangencia => (a === 'CIDADE' ? 'CIDADE' : 'BAIRRO')
const temBairro = (a: Abrangencia) => abrangenciaDe(a) === 'BAIRRO'

export const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']

/** "Brasília/DF (cidade toda)", "Setor 02 · Ariquemes/RO" para a lista, o cabeçalho e o Excel. */
export function textoAbrangencia(a: { scope?: Abrangencia | null; city?: string | null; state?: string | null; region?: string | null }) {
  const cid = a.city ? `${a.city}${a.state ? `/${a.state}` : ''}` : ''
  if (abrangenciaDe(a.scope) === 'CIDADE') return cid ? `${cid} (cidade toda)` : 'Cidade toda'
  return [a.region, cid].filter(Boolean).join(' · ')
}

export function Campo({ rotulo, className, dica, children }: { rotulo: string; className?: string; dica?: string; children: ReactNode }) {
  return (
    <label className={`flex flex-col gap-1 ${className ?? ''}`}>
      <span className="text-[12px] font-medium text-muted">{rotulo}</span>
      {children}
      {dica && <span className="text-[11.5px] text-muted">{dica}</span>}
    </label>
  )
}

const plural = (m: number) => `${m} ${m === 1 ? 'mês' : 'meses'}`

/** Prazo de validade: atalhos (3, 6, 12, 24 meses) ou outro prazo em meses (1 a 60). Mostra até quando vale. */
function PrazoValidade({ meses, dataBase, onChange }: { meses: number; dataBase: string; onChange: (m: number) => void }) {
  const [outro, setOutro] = useState(!VALIDADES.includes(meses))
  return (
    <div className="sm:col-span-6 rounded-xl border border-border p-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-[12px] font-medium text-muted">Prazo de validade da amostragem</span>
        <div className="seg seg-baixo w-fit">
          {VALIDADES.map((m) => (
            <button key={m} type="button" aria-pressed={!outro && meses === m} onClick={() => { setOutro(false); onChange(m) }}>
              {plural(m)}
            </button>
          ))}
          <button type="button" aria-pressed={outro} onClick={() => setOutro(true)}>Outro</button>
        </div>
        {outro && (
          <label className="flex items-center gap-2 text-[13px]">
            <input
              type="number"
              min={1}
              max={60}
              className="input input-sm w-[80px] text-right"
              aria-label="Prazo de validade em meses"
              defaultValue={meses}
              onChange={(e) => {
                const n = Math.round(Number(e.currentTarget.value))
                if (n >= 1 && n <= 60) onChange(n)
              }}
            />
            meses
          </label>
        )}
      </div>
      <p className="mt-2 text-[12px] text-muted">
        {dataBase ? (
          <>
            A amostragem vale até <b className="text-[var(--text)]">{fmtData(validoAte(dataBase, meses))}</b> ({plural(meses)} após a data-base). Cada dado
            também fica válido por {plural(meses)} a partir da data da coleta; depois disso, a linha fica amarela para atualizar.
          </>
        ) : (
          'Informe a data-base para ver até quando vale.'
        )}
      </p>
    </div>
  )
}

export function CamposCabecalho({ valor, set }: { valor: Cabecalho; set: <K extends keyof Cabecalho>(k: K, v: Cabecalho[K]) => void }) {
  const os = useStore((s) => s.os)
  const listaOS = useMemo(() => os.slice(0, 400).map((o) => `${codigoOS(o)} · ${o.proponente}`), [os])
  return (
    <div className="grid gap-3 sm:grid-cols-6">
      <Campo rotulo="Título da amostragem" className="sm:col-span-4">
        <input className="input" value={valor.title} maxLength={160} placeholder="Ex.: Terrenos Setor 02 · Ariquemes" onChange={(e) => set('title', e.target.value)} />
      </Campo>
      <Campo rotulo="Finalidade" className="sm:col-span-2">
        <div className="seg seg-baixo w-fit">
          {(['VENDA', 'ALUGUEL'] as Finalidade[]).map((f) => (
            <button key={f} type="button" aria-pressed={valor.purpose === f} onClick={() => set('purpose', f)}>
              {f === 'VENDA' ? 'Venda' : 'Aluguel'}
            </button>
          ))}
        </div>
      </Campo>
      <Campo rotulo="Abrangência da pesquisa" className="sm:col-span-6">
        <div className="seg seg-baixo w-fit">
          {ABRANGENCIAS.map((o) => (
            <button key={o.v} type="button" aria-pressed={abrangenciaDe(valor.scope) === o.v} onClick={() => set('scope', o.v)}>
              {o.rotulo}
            </button>
          ))}
        </div>
      </Campo>
      <Campo rotulo="UF" className="sm:col-span-1">
        <select className="input" value={valor.state} onChange={(e) => set('state', e.target.value)}>
          <option value="">—</option>
          {UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
        </select>
      </Campo>
      <Campo rotulo="Cidade" className="sm:col-span-2">
        <input className="input" value={valor.city} maxLength={120} onChange={(e) => set('city', e.target.value)} />
      </Campo>
      <Campo
        rotulo={temBairro(valor.scope) ? 'Bairro(s) pesquisado(s)' : 'Região (opcional)'}
        className="sm:col-span-3"
        dica={temBairro(valor.scope) ? 'Separe os bairros por vírgula.' : undefined}>
        <input className="input" value={valor.region} maxLength={160} placeholder="Ex.: Setor 02, Jardim Jorge Teixeira" onChange={(e) => set('region', e.target.value)} />
      </Campo>
      <Campo rotulo="Data-base" className="sm:col-span-2" dica="Data de referência dos valores.">
        <input type="date" className="input" value={valor.referenceDate} onChange={(e) => set('referenceDate', e.target.value)} />
      </Campo>
      <Campo rotulo="O.S. / laudo vinculado (opcional)" className="sm:col-span-4">
        <input className="input" list="amostragem-os" value={valor.serviceOrderRef} maxLength={60} placeholder="Ex.: OS-128" onChange={(e) => set('serviceOrderRef', e.target.value)} />
        <datalist id="amostragem-os">
          {listaOS.map((o) => <option key={o} value={o.slice(0, 60)}>{o}</option>)}
        </datalist>
      </Campo>
      <PrazoValidade meses={valor.validityMonths} dataBase={valor.referenceDate} onChange={(m) => set('validityMonths', m)} />
      <Campo rotulo="Observações" className="sm:col-span-6">
        <textarea
          className="input min-h-[64px] py-2"
          value={valor.notes}
          maxLength={4000}
          placeholder="Critérios da pesquisa, fontes consultadas, homogeneização prevista…"
          onChange={(e) => set('notes', e.target.value)}
        />
      </Campo>
    </div>
  )
}

export const cabecalhoVazio = (): Cabecalho => ({
  title: '',
  purpose: 'VENDA',
  scope: 'BAIRRO',
  state: '',
  city: '',
  region: '',
  serviceOrderRef: '',
  referenceDate: format(new Date(), 'yyyy-MM-dd'),
  validityMonths: 6,
  notes: '',
})

export const validarCabecalho = (c: Cabecalho) =>
  !c.title.trim()
    ? 'Dê um título para a amostragem.'
    : !c.city.trim()
      ? 'Informe a cidade pesquisada.'
      : temBairro(c.scope) && !c.region.trim()
        ? 'Informe o(s) bairro(s) pesquisado(s).'
        : !c.referenceDate
          ? 'Informe a data-base.'
          : ''

/** Cabeçalho do assistente → dados da amostragem. */
export const daCabecalho = (c: Cabecalho) => ({
  title: c.title.trim(),
  purpose: c.purpose,
  scope: c.scope,
  state: c.state || null,
  city: c.city.trim() || null,
  region: c.region.trim() || null,
  serviceOrderRef: c.serviceOrderRef.trim() || null,
  referenceDate: c.referenceDate,
  validityMonths: c.validityMonths,
  notes: c.notes.trim() || null,
})
