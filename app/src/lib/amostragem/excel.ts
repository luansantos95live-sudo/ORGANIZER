import { format, parseISO } from 'date-fns';

import type {
  DadoAmostra,
  ResearchSampleInput,
  VariavelAmostra,
} from './types';

import {
  ROTULO_SITUACAO,
  converter,
  dadoVencido,
  lerData,
  lerNumero,
  novoId,
  resumo,
  situacao,
  validoAte,
} from './calculo';
import {
  VARIAVEIS,
  nomeTipo,
  normalizar,
  rotuloColuna,
  tipoPorId,
} from './catalogo';
import ExcelJSPadrao, { type Workbook, type Worksheet, type Cell, type Borders } from 'exceljs';

/** Identidade visual da empresa que vai no Excel exportado. */
export type Identidade = {
  nome: string;
  razaoSocial?: string;
  cnpj?: string;
  telefone?: string;
  /** PNG em data-URL (já convertido) e o tamanho em px para caber no cabeçalho. */
  logo?: { dataUrl: string; largura: number; altura: number };
  /** Cor principal (hex sem #), tirada do logo. */
  cor: string;
  /** Cor clarinha para faixas e zebra (hex sem #). */
  corClara: string;
};

export const RODAPE_FLUXO = 'Desenvolvido usando o FLUXO · fluxogestor.tech';
const MARCA_META = 'FLUXO-AMOSTRAGEM-v1';
const COR_PADRAO = '2F3B45';

// Aqui o sistema vira um único HTML (Dados/Fluxo_Caixa.html), que não carrega arquivos à parte: o ExcelJS vai embutido.
const carregarExcel = async () => ExcelJSPadrao;

// ---------- Identidade visual a partir do logo ----------

const hex = (r: number, g: number, b: number) =>
  [r, g, b]
    .map(x => Math.round(x).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
const misturar = (c: number[], alvo: number, t: number) =>
  c.map(x => x + (alvo - x) * t);
const luminancia = ([r, g, b]: number[]) =>
  (0.2126 * r! + 0.7152 * g! + 0.0722 * b!) / 255;

/** Escolhe a cor de marca do logo: a mais presente entre as saturadas, escurecida até dar contraste com texto branco. */
export function corDoLogo(px: Uint8ClampedArray): number[] | null {
  const baldes = new Map<string, { n: number; soma: number[]; sat: number }>();
  for (let i = 0; i < px.length; i += 16) {
    const [r, g, b, a] = [px[i]!, px[i + 1]!, px[i + 2]!, px[i + 3]!];
    if (a < 128 || (r > 225 && g > 225 && b > 225)) continue;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max ? (max - min) / max : 0;
    const k = `${r >> 4},${g >> 4},${b >> 4}`;
    const bal = baldes.get(k) ?? { n: 0, soma: [0, 0, 0], sat };
    bal.n++;
    bal.soma = [bal.soma[0]! + r, bal.soma[1]! + g, bal.soma[2]! + b];
    baldes.set(k, bal);
  }
  let melhor: number[] | null = null;
  let pontos = 0;
  for (const b of baldes.values()) {
    const p = b.n * (0.25 + b.sat);
    if (p > pontos) {
      pontos = p;
      melhor = b.soma.map(x => x / b.n);
    }
  }
  if (!melhor) return null;
  let c = melhor;
  for (let i = 0; i < 8 && luminancia(c) > 0.5; i++) c = misturar(c, 0, 0.15);
  return c;
}

/** Converte o logo (qualquer formato que o navegador abra) em PNG e tira a cor de marca. */
export async function prepararLogo(blob: Blob) {
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((ok, erro) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = erro;
      i.src = url;
    });
    const escala = Math.min(1, 360 / img.naturalWidth, 160 / img.naturalHeight);
    const w = Math.max(1, Math.round(img.naturalWidth * escala));
    const h = Math.max(1, Math.round(img.naturalHeight * escala));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    const cor = corDoLogo(ctx.getImageData(0, 0, w, h).data);
    // no Excel o logo ocupa até 64 px de altura e 220 px de largura
    const caber = Math.min(220 / w, 64 / h);
    return {
      logo: {
        dataUrl: canvas.toDataURL('image/png'),
        largura: Math.round(w * caber),
        altura: Math.round(h * caber),
      },
      cor,
    };
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function montarIdentidade(
  empresa: {
    nome: string;
    razaoSocial?: string;
    cnpj?: string;
    telefone?: string;
  },
  logo: Awaited<ReturnType<typeof prepararLogo>>,
): Identidade {
  const c = logo?.cor;
  return {
    ...empresa,
    logo: logo?.logo,
    cor: c ? hex(c[0]!, c[1]!, c[2]!) : COR_PADRAO,
    corClara: c
      ? hex(...(misturar(c, 255, 0.9) as [number, number, number]))
      : 'EEF1F3',
  };
}

// ---------- Exportar ----------

const fill = (cor: string) => ({
  type: 'pattern' as const,
  pattern: 'solid' as const,
  fgColor: { argb: `FF${cor}` },
});
const linha = (cor = 'D0D5DA'): Partial<Borders> => {
  const b = { style: 'thin' as const, color: { argb: `FF${cor}` } };
  return { top: b, left: b, bottom: b, right: b };
};
const colLetra = (n: number) => {
  let s = '';
  for (let x = n; x > 0; x = Math.floor((x - 1) / 26))
    s = String.fromCharCode(65 + ((x - 1) % 26)) + s;
  return s;
};

const largura = (v: VariavelAmostra) => {
  if (v.type === 'simnao') return 10;
  if (v.type === 'moeda') return 16;
  if (v.type === 'numero') return Math.max(11, rotuloColuna(v).length * 0.55);
  if (v.type === 'data') return 12;
  if (v.key === 'endereco') return 34;
  if (v.key === 'link') return 30;
  return Math.min(26, Math.max(14, rotuloColuna(v).length * 0.7));
};

const formatoNumero = (v: VariavelAmostra) =>
  v.type === 'moeda'
    ? '"R$" #,##0.00'
    : v.type === 'data'
      ? 'dd/mm/yyyy'
      : v.key === 'latitude' || v.key === 'longitude'
        ? '0.000000'
        : '#,##0.##';

function valorCelula(v: VariavelAmostra, x: DadoAmostra['values'][string]) {
  if (x == null || x === '') return null;
  if (v.type === 'numero' || v.type === 'moeda') return lerNumero(x);
  if (v.type === 'simnao')
    return x === true ? 'Sim' : x === false ? 'Não' : String(x);
  if (v.type === 'data' && typeof x === 'string') {
    const d = lerData(x);
    return d ? parseISO(d) : x;
  }
  return String(x);
}

/** Gera o .xlsx da amostragem com a identidade visual da empresa e o rodapé do FLUXO. */
export async function exportarAmostragem(
  a: ResearchSampleInput & { createdByName?: string | null },
  id: Identidade,
): Promise<Blob> {
  const ExcelJS = await carregarExcel();
  const wb: Workbook = new ExcelJS.Workbook();
  wb.creator = `${id.nome} · FLUXO`;
  wb.company = id.nome;
  wb.created = new Date();
  wb.title = a.title;

  const tipo = tipoPorId(a.propertyType);
  const vars = a.variables;
  const r = resumo(a.propertyType, vars, a.items, a.validityMonths);
  const nCols = 3 + vars.length + 2;
  const ultima = colLetra(Math.max(nCols, 8));
  const branco = { argb: 'FFFFFFFF' };

  const ws: Worksheet = wb.addWorksheet('Amostragem', {
    properties: { tabColor: { argb: `FF${id.cor}` } },
    pageSetup: {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.4,
        right: 0.4,
        top: 0.5,
        bottom: 0.6,
        header: 0.2,
        footer: 0.25,
      },
    },
    headerFooter: {
      oddFooter: `&L&8${id.nome.replace(/&/g, '&&')}&C&8Página &P de &N&R&8${RODAPE_FLUXO}`,
      evenFooter: `&L&8${id.nome.replace(/&/g, '&&')}&C&8Página &P de &N&R&8${RODAPE_FLUXO}`,
    },
    views: [{ showGridLines: false }],
  });

  ws.columns = [
    { width: 6 },
    { width: 13 },
    { width: 12 },
    ...vars.map(v => ({ width: largura(v) })),
    { width: 16 },
    { width: 10 },
  ];
  for (let c = nCols + 1; c <= 8; c++) ws.getColumn(c).width = 12;

  // Cabeçalho da empresa
  const colTexto = id.logo ? 4 : 1;
  const ini = colLetra(colTexto);
  for (let rr = 1; rr <= 4; rr++) ws.getRow(rr).height = 18;
  if (id.logo) {
    const img = wb.addImage({ base64: id.logo.dataUrl, extension: 'png' });
    ws.addImage(img, {
      tl: { col: 0.15, row: 0.3 },
      ext: { width: id.logo.largura, height: id.logo.altura },
    });
  }
  ws.mergeCells(`${ini}1:${ultima}2`);
  const nome = ws.getCell(`${ini}1`);
  nome.value = id.nome;
  nome.font = { bold: true, size: 16, color: { argb: `FF${id.cor}` } };
  nome.alignment = { vertical: 'middle' };
  ws.mergeCells(`${ini}3:${ultima}3`);
  ws.getCell(`${ini}3`).value = [
    id.razaoSocial && id.razaoSocial !== id.nome ? id.razaoSocial : '',
    id.cnpj ? `CNPJ/CPF ${id.cnpj}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
  ws.getCell(`${ini}3`).font = { size: 9, color: { argb: 'FF555F69' } };
  ws.mergeCells(`${ini}4:${ultima}4`);
  ws.getCell(`${ini}4`).value = id.telefone ? `Telefone ${id.telefone}` : '';
  ws.getCell(`${ini}4`).font = { size: 9, color: { argb: 'FF555F69' } };

  // faixa na cor da empresa
  ws.getRow(5).height = 5;
  for (let c = 1; c <= Math.max(nCols, 8); c++)
    ws.getRow(5).getCell(c).fill = fill(id.cor);

  // Título
  let lin = 7;
  ws.mergeCells(`A${lin}:${ultima}${lin}`);
  const tit = ws.getCell(`A${lin}`);
  tit.value = `FICHA DE PESQUISA DE MERCADO · ${tipo.nome.toUpperCase()}`;
  tit.font = { bold: true, size: 13, color: branco };
  tit.fill = fill(id.cor);
  tit.alignment = { vertical: 'middle', indent: 1 };
  ws.getRow(lin).height = 24;
  lin++;

  // Dados da amostragem (rótulo A:B, valor C:última)
  const venc = validoAte(a.referenceDate, a.validityMonths);
  const sit = situacao(a.referenceDate, a.validityMonths);
  const info: [string, string][] = [
    ['Amostragem', a.title],
    [
      'Tipo / finalidade',
      `${tipo.nome} · ${a.purpose === 'ALUGUEL' ? 'Aluguel (valor mensal)' : 'Venda'}`,
    ],
    [
      a.scope === 'CIDADE' ? 'Abrangência: cidade' : 'Abrangência: bairro',
      [
        a.city && a.state ? `${a.city}/${a.state}` : (a.city ?? a.state ?? ''),
        a.scope === 'CIDADE' ? '' : a.region ? `Bairros: ${a.region}` : '',
      ]
        .filter(Boolean)
        .join(' · ') || '—',
    ],
    [
      'Data-base e validade',
      `${format(parseISO(a.referenceDate), 'dd/MM/yyyy')} · ${a.validityMonths} ${a.validityMonths === 1 ? 'mês' : 'meses'} (até ${format(parseISO(venc), 'dd/MM/yyyy')}) · ${ROTULO_SITUACAO[sit]}`,
    ],
  ];
  if (a.serviceOrderRef) info.push(['O.S. / laudo', a.serviceOrderRef]);
  info.push([
    'Emissão',
    `${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}${a.createdByName ? ` · Responsável: ${a.createdByName}` : ''}`,
  ]);
  if (a.notes) info.push(['Observações', a.notes]);
  for (const [rot, val] of info) {
    ws.mergeCells(`A${lin}:B${lin}`);
    ws.mergeCells(`C${lin}:${ultima}${lin}`);
    const c1 = ws.getCell(`A${lin}`);
    c1.value = rot;
    c1.font = { bold: true, size: 9, color: { argb: `FF${id.cor}` } };
    c1.fill = fill(id.corClara);
    c1.alignment = { vertical: 'middle', indent: 1 };
    const c2 = ws.getCell(`C${lin}`);
    c2.value = val;
    c2.font = {
      size: 10,
      bold: rot === 'Amostragem',
      color:
        rot === 'Data-base e validade' && sit !== 'vigente'
          ? { argb: 'FFC0392B' }
          : undefined,
    };
    c2.alignment = { vertical: 'middle', wrapText: true, indent: 1 };
    c1.border = c2.border = linha('E1E5E9');
    if (rot === 'Observações')
      ws.getRow(lin).height = Math.min(90, 15 * Math.ceil(val.length / 120));
    lin++;
  }
  lin++;

  // Tabela de dados
  const cab = ws.getRow(lin);
  const titulos = [
    'Nº',
    'Data da coleta',
    'Situação',
    ...vars.map(rotuloColuna),
    `Valor unitário (${tipo.unidade})`,
    'Usado no cálculo',
  ];
  titulos.forEach((t, i) => {
    const c = cab.getCell(i + 1);
    c.value = t;
    c.font = { bold: true, size: 9, color: branco };
    c.fill = fill(id.cor);
    c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    c.border = linha(id.cor);
  });
  cab.height = 32;
  const linCab = lin;
  lin++;

  a.items.forEach((d, i) => {
    const row = ws.getRow(lin);
    const vencido = dadoVencido(d, a.validityMonths);
    const usado = d.active && !vencido && r.unitarios.get(d.id) != null;
    const vals: (string | number | Date | null)[] = [
      i + 1,
      d.collectedAt ? parseISO(d.collectedAt) : null,
      vencido ? 'Vencido' : 'Válido',
      ...vars.map(v => valorCelula(v, d.values[v.key] ?? null)),
      r.unitarios.get(d.id) ?? null,
      usado ? 'Sim' : 'Não',
    ];
    vals.forEach((v, c) => {
      const cell: Cell = row.getCell(c + 1);
      cell.value = v as Cell['value'];
      cell.border = linha();
      cell.font = {
        size: 9,
        italic: !d.active,
        color: !d.active ? { argb: 'FF8A939B' } : undefined,
      };
      cell.alignment = {
        vertical: 'middle',
        wrapText: c >= 3 && c < 3 + vars.length,
      };
      if (i % 2) cell.fill = fill(id.corClara);
    });
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(2).numFmt = 'dd/mm/yyyy';
    row.getCell(3).font = {
      size: 9,
      bold: true,
      color: { argb: vencido ? 'FFC0392B' : 'FF2E7D32' },
    };
    vars.forEach((v, j) => {
      if (['numero', 'moeda', 'data'].includes(v.type))
        row.getCell(4 + j).numFmt = formatoNumero(v);
    });
    const cu = row.getCell(4 + vars.length);
    cu.numFmt = '"R$" #,##0.00';
    cu.font = {
      size: 9,
      bold: true,
      color: r.suspeitos.has(d.id) ? { argb: 'FFC0392B' } : undefined,
    };
    lin++;
  });
  if (!a.items.length) {
    ws.mergeCells(`A${lin}:${colLetra(nCols)}${lin}`);
    ws.getCell(`A${lin}`).value =
      'Sem dados cadastrados. Preencha a partir desta linha e importe no FLUXO.';
    ws.getCell(`A${lin}`).font = {
      italic: true,
      size: 9,
      color: { argb: 'FF8A939B' },
    };
    lin++;
  }
  ws.autoFilter = {
    from: { row: linCab, column: 1 },
    to: { row: lin - 1, column: nCols },
  };
  ws.views = [{ state: 'frozen', ySplit: linCab, showGridLines: false }];
  lin++;

  // Resumo estatístico
  if (a.items.length) {
    ws.mergeCells(`A${lin}:${ultima}${lin}`);
    const rt = ws.getCell(`A${lin}`);
    rt.value = `RESUMO ESTATÍSTICO · valor unitário (${tipo.unidade}) dos dados ativos e dentro da validade`;
    rt.font = { bold: true, size: 10, color: branco };
    rt.fill = fill(id.cor);
    rt.alignment = { indent: 1, vertical: 'middle' };
    ws.getRow(lin).height = 20;
    lin++;
    const e = r.est;
    const linhas: [string, number | string | null, string?][] = [
      ['Dados usados', r.usados],
      ['Média', e?.media ?? null, '"R$" #,##0.00'],
      ['Mediana', e?.mediana ?? null, '"R$" #,##0.00'],
      ['Desvio padrão', e?.desvio ?? null, '"R$" #,##0.00'],
      ['Coeficiente de variação', e ? e.cv / 100 : null, '0.0%'],
      ['Mínimo', e?.min ?? null, '"R$" #,##0.00'],
      ['Máximo', e?.max ?? null, '"R$" #,##0.00'],
      ['Suspeitos (Chauvenet)', r.suspeitos.size],
      ['Fundamentação (fatores)*', `Grau ${r.grau.fatores}`],
      [`Fundamentação (regressão, k=${r.k})*`, `Grau ${r.grau.regressao}`],
    ];
    for (const [rot, val, fmt] of linhas) {
      ws.mergeCells(`A${lin}:C${lin}`);
      const c1 = ws.getCell(`A${lin}`);
      c1.value = rot;
      c1.font = { size: 9, bold: true };
      c1.fill = fill(id.corClara);
      c1.alignment = { indent: 1 };
      const c2 = ws.getCell(`D${lin}`);
      c2.value = val;
      c2.font = { size: 10 };
      if (fmt) c2.numFmt = fmt;
      c1.border = c2.border = linha('E1E5E9');
      lin++;
    }
    ws.mergeCells(`A${lin}:${ultima}${lin}`);
    ws.getCell(`A${lin}`).value =
      '* Indicativo apenas pela quantidade de dados (ABNT NBR 14653-2). O grau final depende dos demais itens da norma.';
    ws.getCell(`A${lin}`).font = {
      italic: true,
      size: 8,
      color: { argb: 'FF8A939B' },
    };
    lin += 2;
  }

  // Rodapé com a referência ao FLUXO
  ws.mergeCells(`A${lin}:${ultima}${lin}`);
  const rod = ws.getCell(`A${lin}`);
  rod.value = RODAPE_FLUXO;
  rod.font = { italic: true, size: 8, color: { argb: 'FF8A939B' } };
  rod.alignment = { horizontal: 'center' };
  rod.border = { top: { style: 'thin', color: { argb: `FF${id.cor}` } } };

  // Dicionário de variáveis
  const wv = wb.addWorksheet('Variáveis', {
    properties: { tabColor: { argb: `FF${id.cor}` } },
    views: [{ state: 'frozen', ySplit: 1, showGridLines: false }],
    headerFooter: { oddFooter: `&R&8${RODAPE_FLUXO}` },
  });
  wv.columns = [
    { header: 'Coluna na ficha', width: 38 },
    { header: 'Grupo', width: 16 },
    { header: 'Tipo', width: 14 },
    { header: 'Unidade', width: 10 },
    { header: 'Opções', width: 60 },
    { header: 'Chave', width: 22 },
  ];
  wv.getRow(1).eachCell(c => {
    c.font = { bold: true, color: branco, size: 9 };
    c.fill = fill(id.cor);
  });
  const nomeTipoVar: Record<string, string> = {
    numero: 'Número',
    moeda: 'Valor (R$)',
    texto: 'Texto',
    opcao: 'Lista de opções',
    simnao: 'Sim / Não',
    data: 'Data',
  };
  vars.forEach(v =>
    wv
      .addRow([
        rotuloColuna(v),
        v.group,
        nomeTipoVar[v.type] ?? v.type,
        v.unit ?? '',
        v.options?.join(' | ') ?? '',
        v.key,
      ])
      .eachCell(c => {
        c.font = { size: 9 };
        c.border = linha('E1E5E9');
      }),
  );
  wv.addRow([]);
  wv.addRow([RODAPE_FLUXO]).getCell(1).font = {
    italic: true,
    size: 8,
    color: { argb: 'FF8A939B' },
  };

  // Metadados para reimportar sem perder nada (aba oculta)
  const wm = wb.addWorksheet('_fluxo', { state: 'veryHidden' });
  const meta = JSON.stringify({
    title: a.title,
    propertyType: a.propertyType,
    purpose: a.purpose,
    scope: a.scope,
    state: a.state,
    city: a.city,
    region: a.region,
    serviceOrderRef: a.serviceOrderRef,
    referenceDate: a.referenceDate,
    validityMonths: a.validityMonths,
    notes: a.notes,
    variables: vars,
    ids: a.items.map(d => d.id),
  });
  wm.getCell('A1').value = MARCA_META;
  for (let i = 0, rr = 2; i < meta.length; i += 30000, rr++)
    wm.getCell(`A${rr}`).value = meta.slice(i, i + 30000);

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export const nomeArquivo = (a: {
  title: string;
  propertyType: string;
  referenceDate: string;
}) =>
  `Ficha de Pesquisa - ${nomeTipo(a.propertyType)} - ${a.title}`
    .replace(/[\\/:*?"<>|]+/g, '-')
    .slice(0, 120) + ` - ${a.referenceDate}.xlsx`;

export function baixar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// ---------- Importar ----------

export type MetaFluxo = Omit<ResearchSampleInput, 'items'> & { ids?: string[] };

export type PlanilhaLida = {
  aba: string;
  meta: MetaFluxo | null;
  colunas: string[];
  linhas: unknown[][];
};

/** Valor "simples" da célula do ExcelJS (fórmula → resultado, link → texto, rich text → texto). */
function simples(v: unknown): unknown {
  if (v == null) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if ('result' in o) return simples(o.result);
    if ('richText' in o && Array.isArray(o.richText))
      return (o.richText as { text: string }[]).map(t => t.text).join('');
    if ('text' in o) return simples(o.text);
    if ('hyperlink' in o) return o.hyperlink;
    if ('error' in o) return null;
    return null;
  }
  return v;
}

const vazio = (x: unknown) => x == null || (typeof x === 'string' && !x.trim());

export async function lerPlanilha(arquivo: File): Promise<PlanilhaLida> {
  const ExcelJS = await carregarExcel();
  const wb = new ExcelJS.Workbook();
  const nome = arquivo.name.toLowerCase();
  if (nome.endsWith('.csv')) {
    throw new Error('Salve a planilha como .xlsx (Excel) para importar.');
  }
  if (nome.endsWith('.xls')) {
    throw new Error(
      'Arquivo .xls (Excel 97-2003): abra no Excel e salve como .xlsx.',
    );
  }
  await wb.xlsx.load(await arquivo.arrayBuffer());

  let meta: MetaFluxo | null = null;
  const wm = wb.getWorksheet('_fluxo');
  if (wm && simples(wm.getCell('A1').value) === MARCA_META) {
    let json = '';
    for (let r = 2; r <= wm.rowCount; r++)
      json += String(simples(wm.getCell(`A${r}`).value) ?? '');
    try {
      meta = JSON.parse(json) as MetaFluxo;
    } catch {
      meta = null;
    }
  }

  const ws =
    wb.getWorksheet('Amostragem') ??
    wb.worksheets.find(w => w.state === 'visible' && w.name !== '_fluxo') ??
    wb.worksheets[0];
  if (!ws) throw new Error('A planilha está vazia.');

  const grade: unknown[][] = [];
  const total = Math.min(ws.rowCount, 5000);
  const nCols = Math.min(ws.columnCount, 200);
  for (let r = 1; r <= total; r++) {
    const row = ws.getRow(r);
    const vals: unknown[] = [];
    for (let c = 1; c <= nCols; c++) vals.push(simples(row.getCell(c).value));
    grade.push(vals);
  }

  // Linha do cabeçalho: a das primeiras 40 com mais textos reconhecidos (ou "Nº | Data da coleta" do FLUXO)
  const conhecidos = new Set([
    ...Object.values(VARIAVEIS).map(v => normalizar(v.label)),
    ...Object.values(VARIAVEIS).map(v => normalizar(rotuloColuna(v))),
    ...Object.keys(SINONIMOS),
    'data da coleta',
    'n',
    'no',
  ]);
  let melhor = -1;
  let pontos = 0;
  grade.slice(0, 40).forEach((vals, i) => {
    const textos = vals.filter(
      v => typeof v === 'string' && v.trim(),
    ) as string[];
    if (textos.length < 2) return;
    const reconhecidos = textos.filter(t =>
      conhecidos.has(normalizar(t).replace(/\s*\(.*\)$/, '')),
    ).length;
    const p =
      reconhecidos * 3 +
      textos.length +
      (normalizar(String(vals[1] ?? '')) === 'data da coleta' ? 50 : 0);
    if (p > pontos) {
      pontos = p;
      melhor = i;
    }
  });
  if (melhor < 0)
    throw new Error('Não achei a linha de títulos das colunas na planilha.');

  const cab = grade[melhor]!;
  let ultimaCol = cab.length;
  while (ultimaCol > 0 && vazio(cab[ultimaCol - 1])) ultimaCol--;
  const colunas = cab
    .slice(0, ultimaCol)
    .map((x, i) => (vazio(x) ? `Coluna ${i + 1}` : String(x).trim()));

  const linhas: unknown[][] = [];
  for (let r = melhor + 1; r < grade.length; r++) {
    const vals = grade[r]!.slice(0, ultimaCol);
    if (vals.every(vazio)) break; // a tabela termina na primeira linha em branco
    linhas.push(vals);
  }
  return { aba: ws.name, meta, colunas, linhas };
}

/** Destino de uma coluna importada. */
export type Destino =
  | { tipo: 'ignorar' }
  | { tipo: 'data' }
  | { tipo: 'ativo' }
  | { tipo: 'variavel'; key: string }
  | { tipo: 'nova'; variavel: VariavelAmostra };

const SINONIMOS: Record<string, string> = {
  preco: 'valor',
  'valor total': 'valor',
  'valor pedido': 'valor',
  'valor de oferta': 'valor',
  'valor ofertado': 'valor',
  'preco pedido': 'valor',
  'valor (r$)': 'valor',
  aluguel: 'valor',
  telefone: 'contato',
  fone: 'contato',
  celular: 'contato',
  whatsapp: 'contato',
  corretor: 'fonte',
  imobiliaria: 'fonte',
  anunciante: 'fonte',
  informante: 'fonte',
  fonte: 'fonte',
  logradouro: 'endereco',
  rua: 'endereco',
  localizacao: 'endereco',
  url: 'link',
  site: 'link',
  anuncio: 'link',
  lat: 'latitude',
  long: 'longitude',
  lng: 'longitude',
  dormitorios: 'quartos',
  dorms: 'quartos',
  garagem: 'vagas',
  'idade (anos)': 'idade',
  condominio: 'taxa_condominio',
  testada: 'frente',
  natureza: 'natureza',
  'oferta/transacao': 'natureza',
};

const CHAVES_DATA = [
  'data da coleta',
  'data',
  'data coleta',
  'data da pesquisa',
  'data pesquisa',
  'coleta',
];
const IGNORAR = [
  'n',
  'no',
  'n.',
  'nº',
  'item',
  '#',
  'situacao',
  'validade',
  'dado',
];

/** Sugere o destino de cada coluna pelo título (variáveis da amostragem, catálogo e sinônimos). */
export function sugerirDestinos(
  colunas: string[],
  linhas: unknown[][],
  vars: VariavelAmostra[],
  tipoId: string,
): Destino[] {
  const usadas = new Set<string>();
  const areaKey = tipoPorId(tipoId).areaKey;
  const porRotulo = new Map<string, string>();
  for (const v of vars) {
    porRotulo.set(normalizar(rotuloColuna(v)), v.key);
    porRotulo.set(normalizar(v.label), v.key);
    porRotulo.set(normalizar(v.key), v.key);
  }
  for (const [k, v] of Object.entries(VARIAVEIS)) {
    if (!porRotulo.has(normalizar(rotuloColuna(v))))
      porRotulo.set(normalizar(rotuloColuna(v)), k);
    if (!porRotulo.has(normalizar(v.label)))
      porRotulo.set(normalizar(v.label), k);
  }

  return colunas.map((titulo, i) => {
    const t = normalizar(titulo);
    const semUnidade = t.replace(/\s*\(.*\)$/, '');
    if (CHAVES_DATA.includes(t) || CHAVES_DATA.includes(semUnidade))
      return { tipo: 'data' };
    if (semUnidade.startsWith('usado no calculo') || semUnidade === 'ativo')
      return { tipo: 'ativo' };
    if (IGNORAR.includes(t) || semUnidade.startsWith('valor unitario'))
      return { tipo: 'ignorar' };
    let key =
      porRotulo.get(t) ??
      porRotulo.get(semUnidade) ??
      SINONIMOS[t] ??
      SINONIMOS[semUnidade] ??
      (areaKey &&
      /^area\b/.test(semUnidade) &&
      !/(terreno|construida|privativa|total)/.test(semUnidade)
        ? areaKey
        : undefined);
    if (key && !usadas.has(key)) {
      usadas.add(key);
      return { tipo: 'variavel', key };
    }
    // coluna desconhecida: vira variável personalizada (número se quase tudo for número)
    const cheios = linhas.map(l => l[i]).filter(x => !vazio(x));
    const numericos = cheios.filter(x => lerNumero(x as string) != null).length;
    const tipo =
      cheios.length && numericos / cheios.length >= 0.8 ? 'numero' : 'texto';
    key = `p_${semUnidade.replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') || `coluna_${i + 1}`}`;
    while (usadas.has(key) || vars.some(v => v.key === key)) key += '_';
    usadas.add(key);
    return {
      tipo: 'nova',
      variavel: {
        key,
        label: titulo.replace(/\s*\(.*\)$/, '').trim() || `Coluna ${i + 1}`,
        type: tipo,
        unit: titulo.match(/\(([^)]+)\)\s*$/)?.[1],
        group: 'Personalizadas',
        custom: true,
      },
    };
  });
}

/** Monta os dados a partir das linhas e dos destinos escolhidos. Devolve também as variáveis novas criadas. */
export function montarDados(
  linhas: unknown[][],
  destinos: Destino[],
  vars: VariavelAmostra[],
  dataPadrao: string,
  ids?: string[],
): { itens: DadoAmostra[]; novas: VariavelAmostra[] } {
  const novas = destinos.flatMap(d => (d.tipo === 'nova' ? [d.variavel] : []));
  const todas = new Map([...vars, ...novas].map(v => [v.key, v]));
  const catalogo = (key: string): VariavelAmostra | undefined =>
    todas.get(key) ??
    (VARIAVEIS[key] ? { key, ...VARIAVEIS[key]! } : undefined);
  const extras: VariavelAmostra[] = [];

  const itens = linhas.map((l, i) => {
    const d: DadoAmostra = {
      id: ids?.[i] ?? novoId(),
      collectedAt: dataPadrao,
      active: true,
      values: {},
    };
    destinos.forEach((dest, c) => {
      const x = l[c];
      if (dest.tipo === 'data') d.collectedAt = lerData(x) ?? dataPadrao;
      else if (dest.tipo === 'ativo') {
        const s = normalizar(String(x ?? ''));
        if (s === 'nao' || s === 'n' || s === 'false') d.active = false;
      } else if (dest.tipo === 'variavel' || dest.tipo === 'nova') {
        const key = dest.tipo === 'nova' ? dest.variavel.key : dest.key;
        const v = catalogo(key);
        if (!v) return;
        if (!todas.has(key) && !extras.some(e => e.key === key)) extras.push(v);
        const val = converter(v, x);
        if (val != null) d.values[key] = val;
      }
    });
    return d;
  });
  return { itens, novas: [...novas, ...extras] };
}
