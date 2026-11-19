import {
  addMonths,
  differenceInCalendarDays,
  format,
  parseISO,
} from 'date-fns';

import type {
  DadoAmostra,
  ValorDado,
  VariavelAmostra,
} from './types';

import { tipoPorId } from './catalogo';

// ---------- Validade ----------

export type SituacaoValidade = 'vigente' | 'vencendo' | 'vencida';

/** Dias antes do vencimento em que a amostragem passa a "vencendo". */
export const AVISO_DIAS = 30;

const hojeISO = () => format(new Date(), 'yyyy-MM-dd');

/** Data-limite: data (yyyy-MM-dd) + meses de validade. */
export const validoAte = (data: string, meses: number) =>
  format(addMonths(parseISO(data), meses), 'yyyy-MM-dd');

export function situacao(
  data: string | null | undefined,
  meses: number,
  hoje = hojeISO(),
): SituacaoValidade {
  if (!data) return 'vencida';
  const dias = differenceInCalendarDays(
    parseISO(validoAte(data, meses)),
    parseISO(hoje),
  );
  if (dias < 0) return 'vencida';
  return dias <= AVISO_DIAS ? 'vencendo' : 'vigente';
}

export const diasRestantes = (data: string, meses: number, hoje = hojeISO()) =>
  differenceInCalendarDays(parseISO(validoAte(data, meses)), parseISO(hoje));

export const ROTULO_SITUACAO: Record<SituacaoValidade, string> = {
  vigente: 'Vigente',
  vencendo: 'Vence em breve',
  vencida: 'Vencida',
};

/** Dado sem fonte: todo dado precisa do link do anúncio ou do endereço/contato de onde veio. */
export const semFonte = (d: DadoAmostra) => !String(d.values.link ?? '').trim();

/** Linha ainda vazia (criada para colar/digitar): não conta em avisos nem no total. */
export const dadoVazio = (d: DadoAmostra) =>
  !Object.values(d.values).some(
    v => v != null && v !== '' && !(typeof v === 'string' && !v.trim()),
  );

/** Dado fora da validade: a coleta tem mais que os meses de validade da amostragem. */
export const dadoVencido = (d: DadoAmostra, meses: number, hoje = hojeISO()) =>
  situacao(d.collectedAt, meses, hoje) === 'vencida';

// ---------- Números ----------

/** Lê número de célula/campo: aceita 1.234,56 · 1234.56 · R$ 1.234 · 12% · número já pronto. */
export function lerNumero(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  let s = v.replace(/[R$\s%]|m²|m2|ha/gi, '').trim();
  if (!s) return null;
  const temVirgula = s.includes(',');
  const temPonto = s.includes('.');
  if (temVirgula && temPonto) {
    // o separador que aparece por último é o decimal
    s =
      s.lastIndexOf(',') > s.lastIndexOf('.')
        ? s.replace(/\./g, '').replace(',', '.')
        : s.replace(/,/g, '');
  } else if (temVirgula) {
    s = s.replace(',', '.');
  } else if (temPonto && /^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, ''); // 1.234.567 = milhar
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const fmt = (min: number, max: number) =>
  new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  });
export const fmtNum = (n: number | null | undefined, casas = 2) =>
  n == null || !Number.isFinite(n) ? '—' : fmt(0, casas).format(n);
export const fmtMoeda = (n: number | null | undefined) =>
  n == null || !Number.isFinite(n) ? '—' : `R$ ${fmt(2, 2).format(n)}`;
export const fmtData = (iso: string | null | undefined) =>
  iso ? format(parseISO(iso), 'dd/MM/yyyy') : '—';

/** Valor de uma variável para mostrar em texto (tela e Excel). */
export function textoValor(v: VariavelAmostra, x: ValorDado): string {
  if (x == null || x === '') return '';
  if (v.type === 'simnao')
    return x === true ? 'Sim' : x === false ? 'Não' : String(x);
  if (v.type === 'moeda') return fmtMoeda(lerNumero(x));
  if (v.type === 'numero') return fmtNum(lerNumero(x), 6);
  if (
    v.type === 'data' &&
    typeof x === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(x)
  )
    return fmtData(x);
  return String(x);
}

/** Converte o que veio digitado/importado para o formato guardado da variável. */
export function converter(v: VariavelAmostra, x: unknown): ValorDado {
  if (x == null) return null;
  if (typeof x === 'string' && !x.trim()) return null;
  switch (v.type) {
    case 'numero':
    case 'moeda':
      return lerNumero(x);
    case 'simnao': {
      if (typeof x === 'boolean') return x;
      const s = String(x)
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .trim()
        .toLowerCase();
      if (['sim', 's', 'x', 'yes', 'true', '1'].includes(s)) return true;
      if (['nao', 'n', 'no', 'false', '0', '-'].includes(s)) return false;
      return null;
    }
    case 'data':
      return lerData(x);
    case 'opcao': {
      const s = String(x).trim();
      const achada = v.options?.find(o => o.toLowerCase() === s.toLowerCase());
      return achada ?? s;
    }
    default:
      return x instanceof Date ? format(x, 'yyyy-MM-dd') : String(x).trim();
  }
}

/** Data de célula/campo → yyyy-MM-dd (aceita Date, dd/mm/aaaa, aaaa-mm-dd e número serial do Excel). */
export function lerData(x: unknown): string | null {
  if (x instanceof Date && !Number.isNaN(x.getTime()))
    return format(
      new Date(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()),
      'yyyy-MM-dd',
    );
  if (typeof x === 'number' && x > 20000 && x < 80000) {
    const d = new Date(Date.UTC(1899, 11, 30) + x * 86400000);
    return lerData(d);
  }
  if (typeof x !== 'string') return null;
  const s = x.trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (m) {
    const ano = m[3]!.length === 2 ? `20${m[3]}` : m[3]!;
    return `${ano}-${m[2]!.padStart(2, '0')}-${m[1]!.padStart(2, '0')}`;
  }
  return null;
}

// ---------- Valor unitário e estatística ----------

/** Valor unitário do dado: valor ÷ área do tipo (R$/m², R$/ha) ou o próprio valor (R$/vaga). */
export function valorUnitario(d: DadoAmostra, tipoId: string): number | null {
  const valor = lerNumero(d.values.valor);
  if (valor == null || valor <= 0) return null;
  const { areaKey } = tipoPorId(tipoId);
  if (!areaKey) return valor;
  const area = lerNumero(d.values[areaKey]);
  return area && area > 0 ? valor / area : null;
}

/** A área de referência do tipo está entre as variáveis escolhidas? (senão o unitário não é calculado) */
export const temAreaReferencia = (tipoId: string, vars: VariavelAmostra[]) => {
  const { areaKey } = tipoPorId(tipoId);
  return !areaKey || vars.some(v => v.key === areaKey);
};

export type Estatistica = {
  n: number;
  media: number;
  mediana: number;
  desvio: number;
  /** Coeficiente de variação, em %. */
  cv: number;
  min: number;
  max: number;
};

export function estatistica(valores: number[]): Estatistica | null {
  const v = valores.filter(Number.isFinite).sort((a, b) => a - b);
  const n = v.length;
  if (!n) return null;
  const media = v.reduce((s, x) => s + x, 0) / n;
  const mediana = n % 2 ? v[(n - 1) / 2]! : (v[n / 2 - 1]! + v[n / 2]!) / 2;
  const desvio =
    n > 1
      ? Math.sqrt(v.reduce((s, x) => s + (x - media) ** 2, 0) / (n - 1))
      : 0;
  return {
    n,
    media,
    mediana,
    desvio,
    cv: media ? (desvio / media) * 100 : 0,
    min: v[0]!,
    max: v[n - 1]!,
  };
}

// Função erro complementar (Abramowitz-Stegun 7.1.26), precisão ~1e-7: suficiente para o critério de Chauvenet.
function erfc(x: number) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y =
    t *
    (0.254829592 +
      t *
        (-0.284496736 +
          t * (1.421413741 + t * (-1.453152027 + t * 1.061405429)))) *
    Math.exp(-x * x);
  return x >= 0 ? y : 2 - y;
}

/**
 * Critério de Chauvenet (saneamento da amostra): o dado é suspeito quando n · P(|Z| ≥ z) < 0,5.
 * Devolve os índices (na lista recebida) dos valores suspeitos. Precisa de ao menos 3 valores.
 */
export function suspeitosChauvenet(valores: (number | null)[]): Set<number> {
  const ok = valores.filter(
    (x): x is number => x != null && Number.isFinite(x),
  );
  const e = estatistica(ok);
  const fora = new Set<number>();
  if (!e || e.n < 3 || !e.desvio) return fora;
  valores.forEach((x, i) => {
    if (x == null) return;
    const z = Math.abs(x - e.media) / e.desvio;
    if (e.n * erfc(z / Math.SQRT2) < 0.5) fora.add(i);
  });
  return fora;
}

export type Grau = 'III' | 'II' | 'I' | 'Insuficiente';

/**
 * Indicativo do grau de fundamentação pela QUANTIDADE de dados (NBR 14653-2, tabelas de fundamentação):
 * - tratamento por fatores: III ≥ 12 · II ≥ 5 · I ≥ 3 dados;
 * - regressão linear: III ≥ 6(k+1) · II ≥ 4(k+1) · I ≥ 3(k+1), k = nº de variáveis independentes.
 * É só o item "quantidade de dados"; o grau final depende dos demais itens da norma.
 */
export function grauPorQuantidade(n: number, k: number) {
  const fatores: Grau =
    n >= 12 ? 'III' : n >= 5 ? 'II' : n >= 3 ? 'I' : 'Insuficiente';
  const kk = Math.max(1, k);
  const regressao: Grau =
    n >= 6 * (kk + 1)
      ? 'III'
      : n >= 4 * (kk + 1)
        ? 'II'
        : n >= 3 * (kk + 1)
          ? 'I'
          : 'Insuficiente';
  return {
    fatores,
    regressao,
    minimos: { III: 6 * (kk + 1), II: 4 * (kk + 1), I: 3 * (kk + 1) },
  };
}

/** Variáveis que entram como independentes numa regressão: numéricas/opções/sim-não, fora identificação e valor. */
export const variaveisIndependentes = (vars: VariavelAmostra[]) =>
  vars.filter(
    v =>
      !['Identificação', 'Valor'].includes(v.group) &&
      ['numero', 'moeda', 'opcao', 'simnao'].includes(v.type),
  );

/** Resumo da amostragem usado na tela e no Excel. */
export function resumo(
  tipoId: string,
  vars: VariavelAmostra[],
  itens: DadoAmostra[],
  meses: number,
  hoje = hojeISO(),
) {
  const unitarios = itens.map(d => valorUnitario(d, tipoId));
  const usados = itens
    .map((d, i) => ({ d, u: unitarios[i] }))
    .filter(
      x =>
        x.d.active &&
        x.u != null &&
        !dadoVencido(x.d, meses, hoje) &&
        !semFonte(x.d),
    );
  const est = estatistica(usados.map(x => x.u!));
  const suspeitosIdx = suspeitosChauvenet(usados.map(x => x.u));
  const suspeitos = new Set([...suspeitosIdx].map(i => usados[i]!.d.id));
  const k = variaveisIndependentes(vars).length;
  return {
    unitarios: new Map(itens.map((d, i) => [d.id, unitarios[i] ?? null])),
    est,
    suspeitos,
    usados: usados.length,
    vencidos: itens.filter(d => !dadoVazio(d) && dadoVencido(d, meses, hoje))
      .length,
    semFonte: itens.filter(d => !dadoVazio(d) && semFonte(d)).length,
    vazios: itens.filter(dadoVazio).length,
    inativos: itens.filter(d => !d.active).length,
    k,
    grau: grauPorQuantidade(usados.length, k),
  };
}

/** Novo id de dado (curto, único o bastante dentro da amostragem). */
export const novoId = () =>
  `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
