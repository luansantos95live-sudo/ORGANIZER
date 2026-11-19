import { describe, expect, it } from 'vitest';

import type { ResearchSampleInput } from '../types';

import {
  converter,
  estatistica,
  grauPorQuantidade,
  lerData,
  lerNumero,
  resumo,
  situacao,
  suspeitosChauvenet,
  validoAte,
  valorUnitario,
} from '../calculo';
import {
  opcoesDoTipo,
  variaveisIniciais,
  chavePersonalizada,
} from '../catalogo';
import {
  corDoLogo,
  exportarAmostragem,
  lerPlanilha,
  montarDados,
  montarIdentidade,
  sugerirDestinos,
} from '../excel';

describe('catálogo', () => {
  it('terreno traz identificação, valor e área como obrigatórias', () => {
    const fixas = opcoesDoTipo('TERRENO')
      .filter(o => o.fixa)
      .map(o => o.variavel.key);
    expect(fixas).toEqual(
      expect.arrayContaining([
        'endereco',
        'fonte',
        'natureza',
        'valor',
        'area_terreno',
      ]),
    );
    expect(variaveisIniciais('TERRENO').map(v => v.key)).toContain(
      'topografia',
    );
  });
  it('vaga de garagem não tem área obrigatória (unitário por vaga)', () => {
    expect(variaveisIniciais('VAGA_GARAGEM').map(v => v.key)).not.toContain(
      'area_vaga',
    );
  });
  it('chave personalizada é única', () => {
    expect(chavePersonalizada('Vista p/ lago', ['p_vista_p_lago'])).toBe(
      'p_vista_p_lago_2',
    );
  });
});

describe('números e datas', () => {
  it('lê formatos brasileiros', () => {
    expect(lerNumero('R$ 350.000,00')).toBe(350000);
    expect(lerNumero('1.234,5')).toBe(1234.5);
    expect(lerNumero('350.000')).toBe(350000);
    expect(lerNumero('12.5')).toBe(12.5);
    expect(lerNumero('360 m²')).toBe(360);
    expect(lerNumero('abc')).toBeNull();
  });
  it('lê datas', () => {
    expect(lerData('05/03/2026')).toBe('2026-03-05');
    expect(lerData('2026-03-05T00:00')).toBe('2026-03-05');
    expect(lerData(new Date(Date.UTC(2026, 2, 5)))).toBe('2026-03-05');
  });
  it('converte sim/não e opções', () => {
    const sn = {
      key: 'x',
      label: 'X',
      type: 'simnao' as const,
      group: 'Físicas',
    };
    expect(converter(sn, 'Sim')).toBe(true);
    expect(converter(sn, 'não')).toBe(false);
    const op = {
      key: 't',
      label: 'T',
      type: 'opcao' as const,
      group: 'Físicas',
      options: ['Plano', 'Irregular'],
    };
    expect(converter(op, 'plano')).toBe('Plano');
  });
});

describe('validade', () => {
  it('data-base + meses', () => {
    expect(validoAte('2026-01-31', 1)).toBe('2026-02-28');
    expect(situacao('2026-06-01', 6, '2026-11-18')).toBe('vencendo');
    expect(situacao('2026-01-01', 6, '2026-11-18')).toBe('vencida');
    expect(situacao('2026-11-01', 6, '2026-11-18')).toBe('vigente');
  });
});

describe('estatística', () => {
  it('média, mediana, CV', () => {
    const e = estatistica([100, 200, 300])!;
    expect(e.media).toBe(200);
    expect(e.mediana).toBe(200);
    expect(e.desvio).toBeCloseTo(100);
    expect(e.cv).toBeCloseTo(50);
  });
  it('Chauvenet aponta o discrepante', () => {
    const vals = [500, 510, 495, 505, 498, 502, 507, 1500];
    expect([...suspeitosChauvenet(vals)]).toEqual([7]);
  });
  it('grau por quantidade de dados', () => {
    expect(grauPorQuantidade(12, 3).fatores).toBe('III');
    expect(grauPorQuantidade(5, 3).fatores).toBe('II');
    expect(grauPorQuantidade(24, 3).regressao).toBe('III');
    expect(grauPorQuantidade(12, 3).regressao).toBe('I');
  });
  it('unitário divide pela área do tipo', () => {
    const d = {
      id: 'a',
      collectedAt: '2026-11-01',
      active: true,
      values: { valor: 90000, area_terreno: 360 },
    };
    expect(valorUnitario(d, 'TERRENO')).toBe(250);
    expect(
      valorUnitario({ ...d, values: { valor: 45000 } }, 'VAGA_GARAGEM'),
    ).toBe(45000);
  });
});

describe('Excel', () => {
  const amostra: ResearchSampleInput = {
    title: 'Terrenos Setor 02',
    propertyType: 'TERRENO',
    purpose: 'VENDA',
    scope: 'CIDADE_BAIRRO',
    state: 'RO',
    city: 'Ariquemes',
    region: 'Setor 02',
    serviceOrderRef: 'OS-12',
    referenceDate: '2026-11-01',
    validityMonths: 6,
    notes: null,
    variables: [
      ...variaveisIniciais('TERRENO'),
      {
        key: 'p_vista',
        label: 'Vista',
        type: 'simnao',
        group: 'Personalizadas',
        custom: true,
      },
    ],
    items: [
      {
        id: 'd1',
        collectedAt: '2026-10-20',
        active: true,
        values: {
          endereco: 'Rua A, 10',
          link: 'https://anuncio/1',
          valor: 90000,
          area_terreno: 360,
          topografia: 'Plano',
          pavimentacao: true,
          p_vista: false,
        },
      },
      {
        id: 'd2',
        collectedAt: '2026-10-21',
        active: false,
        values: { endereco: 'Rua B, 20', valor: 120000, area_terreno: 400 },
      },
    ],
  };

  it('exporta com identidade e volta igual (planilha do FLUXO)', async () => {
    const id = montarIdentidade(
      { nome: 'LFX Arquitetura', cnpj: '12.345.678/0001-90' },
      null,
    );
    const blob = await exportarAmostragem(amostra, id);
    const arquivo = new File([await blob.arrayBuffer()], 'ficha.xlsx');
    const pl = await lerPlanilha(arquivo);
    expect(pl.meta?.title).toBe('Terrenos Setor 02');
    expect(pl.linhas).toHaveLength(2);
    expect(pl.colunas[1]).toBe('Data da coleta');

    const destinos = sugerirDestinos(
      pl.colunas,
      pl.linhas,
      pl.meta!.variables,
      'TERRENO',
    );
    const { itens, novas } = montarDados(
      pl.linhas,
      destinos,
      pl.meta!.variables,
      '2026-11-01',
      pl.meta!.ids,
    );
    expect(novas).toHaveLength(0);
    expect(itens[0]).toMatchObject({
      id: 'd1',
      collectedAt: '2026-10-20',
      active: true,
      values: {
        endereco: 'Rua A, 10',
        link: 'https://anuncio/1',
        valor: 90000,
        area_terreno: 360,
        topografia: 'Plano',
        pavimentacao: true,
        p_vista: false,
      },
    });
    expect(itens[1]!.active).toBe(false);
  });

  it('mapeia planilha de terceiros por sinônimos e cria variável nova', () => {
    const colunas = [
      'Data',
      'Logradouro',
      'Preço',
      'Área (m²)',
      'Corretor',
      'Esquina?',
      'Link',
    ];
    const linhas = [
      [
        '10/11/2026',
        'Rua C',
        'R$ 80.000,00',
        '300',
        'Imob X',
        'sim',
        'https://x',
      ],
    ];
    const vars = opcoesDoTipo('TERRENO').map(o => o.variavel);
    const d = sugerirDestinos(colunas, linhas, vars, 'TERRENO');
    expect(d.map(x => (x.tipo === 'variavel' ? x.key : x.tipo))).toEqual([
      'data',
      'endereco',
      'valor',
      'area_terreno',
      'fonte',
      'nova',
      'link',
    ]);
    const { itens } = montarDados(linhas, d, vars, '2026-11-01');
    expect(itens[0]!.values.valor).toBe(80000);
    expect(itens[0]!.collectedAt).toBe('2026-11-10');
    const r = resumo('TERRENO', vars, itens, 6, '2026-11-18');
    expect(r.est?.media).toBeCloseTo(266.67, 1);
  });

  it('cor do logo vira tom escuro legível', () => {
    const px = new Uint8ClampedArray(64 * 4);
    for (let i = 0; i < px.length; i += 4) px.set([58, 184, 30, 255], i);
    const c = corDoLogo(px)!;
    expect(c[1]).toBeLessThan(184);
  });
});

describe('compor amostragem', () => {
  it('junta variáveis, põe a cidade e guarda a origem', async () => {
    const { candidatos, copiarDados, juntarVariaveis } =
      await import('../compor');
    const base = {
      propertyType: 'TERRENO',
      purpose: 'VENDA' as const,
      scope: 'CIDADE_BAIRRO' as const,
      referenceDate: '2026-11-01',
      validityMonths: 6,
      createdByName: null,
      createdAt: '',
      updatedAt: '',
    };
    const a = {
      ...base,
      id: 'a',
      title: 'A',
      city: 'Brasília',
      state: 'DF',
      variables: variaveisIniciais('TERRENO'),
      items: [
        {
          id: '1',
          collectedAt: '2026-10-01',
          active: true,
          values: { valor: 1 },
        },
      ],
    };
    const b = {
      ...base,
      id: 'b',
      title: 'B',
      city: 'Ariquemes',
      state: 'RO',
      variables: [
        ...variaveisIniciais('TERRENO'),
        {
          key: 'p_x',
          label: 'X',
          type: 'texto' as const,
          group: 'Físicas',
          custom: true,
        },
      ],
      items: [
        {
          id: '2',
          collectedAt: '2026-10-02',
          active: false,
          values: { valor: 2, cidade: 'Monte Negro' },
        },
      ],
    };
    const cs = candidatos([a, b]);
    expect(cs.map(c => c.cidade)).toEqual(['Brasília', 'Monte Negro']);
    const vars = juntarVariaveis([a, b]).map(v => v.key);
    expect(vars).toContain('cidade');
    expect(vars).toContain('p_x');
    const dados = copiarDados(cs);
    expect(dados[1]).toMatchObject({
      active: true,
      origem: 'B',
      values: { cidade: 'Monte Negro' },
    });
    expect(dados[0]!.id).not.toBe('1');
  });
});
