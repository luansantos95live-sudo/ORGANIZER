import type {
  TipoVariavel,
  VariavelAmostra,
} from './types';

/**
 * Catálogo das Fichas de Pesquisa (amostragem de dados de mercado para avaliação de imóveis).
 *
 * Referências usadas para escolher as variáveis de cada tipo:
 * - ABNT NBR 14653-1 (procedimentos gerais) e NBR 14653-2 (imóveis urbanos): identificação completa de cada dado
 *   (endereço, fonte, natureza oferta/transação, data), variáveis físicas, de localização e econômicas;
 * - ABNT NBR 14653-3 (imóveis rurais): área, capacidade de uso das terras, acesso, recursos hídricos, benfeitorias;
 * - ABNT NBR 12721: padrão construtivo baixo/normal/alto;
 * - Método de Ross-Heidecke: estados de conservação usados na depreciação.
 * As "recomendadas" já vêm marcadas; o avaliador escolhe as que vai usar e pode criar variáveis próprias.
 */

export const GRUPOS = [
  'Identificação',
  'Valor',
  'Físicas',
  'Construtivas',
  'Localização',
  'Infraestrutura',
  'Condomínio',
  'Legislação',
  'Rurais',
  'Personalizadas',
] as const;

type Def = Omit<VariavelAmostra, 'key' | 'fixed' | 'custom'>;

const sn = (label: string, group: string): Def => ({
  label,
  type: 'simnao',
  group,
});
const num = (label: string, group: string, unit?: string): Def => ({
  label,
  type: 'numero',
  group,
  unit,
});
const opc = (label: string, group: string, options: string[]): Def => ({
  label,
  type: 'opcao',
  group,
  options,
});

export const CONSERVACAO_ROSS_HEIDECKE = [
  'Novo',
  'Entre novo e regular',
  'Regular',
  'Entre regular e reparos simples',
  'Reparos simples',
  'Entre reparos simples e importantes',
  'Reparos importantes',
  'Entre reparos importantes e sem valor',
];

/** Biblioteca de variáveis (chave → definição). As chaves são estáveis: vão no Excel exportado. */
export const VARIAVEIS: Record<string, Def> = {
  // Identificação do dado (NBR 14653-2: a amostra deve permitir identificar e conferir cada dado)
  endereco: { label: 'Endereço', type: 'texto', group: 'Identificação' },
  bairro: { label: 'Bairro', type: 'texto', group: 'Identificação' },
  cidade: { label: 'Cidade', type: 'texto', group: 'Identificação' },
  fonte: {
    label: 'Fonte / informante',
    type: 'texto',
    group: 'Identificação',
  },
  contato: {
    label: 'Telefone / contato',
    type: 'texto',
    group: 'Identificação',
  },
  link: {
    label: 'Link ou endereço da fonte',
    type: 'texto',
    group: 'Identificação',
  },
  natureza: opc('Natureza do evento', 'Identificação', [
    'Oferta',
    'Transação',
    'Opinião de corretor',
  ]),
  latitude: num('Latitude', 'Identificação'),
  longitude: num('Longitude', 'Identificação'),
  matricula: { label: 'Matrícula', type: 'texto', group: 'Identificação' },

  // Valor
  valor: { label: 'Valor', type: 'moeda', group: 'Valor', unit: 'R$' },
  valor_venal_m2: {
    label: 'Valor venal (IPTU)',
    type: 'moeda',
    group: 'Valor',
    unit: 'R$/m²',
  },
  forma_pagamento: opc('Forma de pagamento', 'Valor', [
    'À vista',
    'Financiado',
    'Permuta',
    'Não informado',
  ]),

  // Físicas
  area_terreno: num('Área do terreno', 'Físicas', 'm²'),
  area_construida: num('Área construída', 'Físicas', 'm²'),
  area_privativa: num('Área privativa', 'Físicas', 'm²'),
  area_total: num('Área total', 'Físicas', 'm²'),
  area_vaga: num('Área da vaga', 'Físicas', 'm²'),
  frente: num('Testada (frente)', 'Físicas', 'm'),
  profundidade: num('Profundidade', 'Físicas', 'm'),
  n_frentes: num('Número de frentes', 'Físicas'),
  topografia: opc('Topografia', 'Físicas', [
    'Plano',
    'Aclive suave',
    'Aclive acentuado',
    'Declive suave',
    'Declive acentuado',
    'Irregular',
  ]),
  situacao_quadra: opc('Situação na quadra', 'Físicas', [
    'Meio de quadra',
    'Esquina',
    'Encravado',
    'Fundos / vila',
    'Quadra inteira',
  ]),
  formato: opc('Formato do lote', 'Físicas', ['Regular', 'Irregular']),
  nivel_rua: opc('Nível em relação à rua', 'Físicas', [
    'No nível',
    'Acima da rua',
    'Abaixo da rua',
  ]),
  fechamento: opc('Fechamento do lote', 'Físicas', [
    'Sem muro',
    'Muro em parte',
    'Murado',
    'Cercado',
  ]),
  ocupacao: opc('Ocupação do lote', 'Físicas', [
    'Vago',
    'Com construção a demolir',
    'Com benfeitorias',
  ]),
  superficie: opc('Superfície (solo)', 'Físicas', [
    'Seco',
    'Alagável',
    'Brejoso',
  ]),
  quartos: num('Quartos', 'Físicas'),
  suites: num('Suítes', 'Físicas'),
  banheiros: num('Banheiros', 'Físicas'),
  vagas: num('Vagas de garagem', 'Físicas'),
  pavimentos: num('Pavimentos', 'Físicas'),
  andar: num('Andar', 'Físicas'),
  posicao: opc('Posição na edificação', 'Físicas', [
    'Frente',
    'Fundos',
    'Lateral',
    'Cobertura',
  ]),
  tipo_casa: opc('Tipo de casa', 'Físicas', [
    'Térrea',
    'Sobrado',
    'Geminada',
    'Assobradada',
  ]),
  piscina: sn('Piscina', 'Físicas'),
  area_gourmet: sn('Área gourmet / churrasqueira', 'Físicas'),
  sacada: sn('Sacada / varanda', 'Físicas'),
  mobiliado: opc('Mobiliado', 'Físicas', ['Não', 'Semimobiliado', 'Mobiliado']),
  frente_loja: num('Frente da loja', 'Físicas', 'm'),
  pe_direito: num('Pé-direito', 'Físicas', 'm'),
  mezanino: sn('Mezanino', 'Físicas'),
  docas: num('Docas', 'Físicas'),
  area_escritorio: num('Área de escritório', 'Físicas', 'm²'),
  acesso_carreta: sn('Acesso para carreta', 'Físicas'),
  piso_industrial: sn('Piso industrial', 'Físicas'),

  // Vaga de garagem
  cobertura_vaga: opc('Cobertura da vaga', 'Físicas', [
    'Coberta',
    'Descoberta',
  ]),
  uso_vaga: opc('Uso da vaga', 'Físicas', [
    'Livre',
    'Presa (depende de manobra)',
  ]),
  tipo_vaga: opc('Tipo de vaga (registro)', 'Físicas', [
    'Autônoma (matrícula própria)',
    'Vinculada à unidade',
    'Fração ideal',
  ]),
  local_vaga: opc('Localização da vaga', 'Físicas', [
    'Subsolo',
    'Térreo',
    'Pavimento superior',
    'Edifício-garagem',
  ]),
  veiculo_vaga: opc('Porte da vaga', 'Físicas', [
    'Carro pequeno',
    'Carro médio/grande',
    'Moto',
    'Carro + moto',
  ]),
  acesso_vaga: opc('Acesso à vaga', 'Físicas', [
    'Rampa',
    'Elevador de veículos',
    'Direto da rua',
  ]),
  uso_edificio: opc('Uso do edifício', 'Físicas', [
    'Residencial',
    'Comercial',
    'Misto',
  ]),

  // Construtivas
  padrao: opc('Padrão construtivo (NBR 12721)', 'Construtivas', [
    'Baixo',
    'Normal',
    'Alto',
  ]),
  conservacao: opc(
    'Estado de conservação (Ross-Heidecke)',
    'Construtivas',
    CONSERVACAO_ROSS_HEIDECKE,
  ),
  idade: num('Idade aparente', 'Construtivas', 'anos'),
  ano_construcao: num('Ano de construção', 'Construtivas'),

  // Localização
  distancia_polo: num('Distância ao polo valorizante', 'Localização', 'm'),
  padrao_regiao: opc('Padrão da região', 'Localização', [
    'Baixo',
    'Médio',
    'Alto',
  ]),
  tipo_via: opc('Tipo de via', 'Localização', [
    'Local',
    'Coletora',
    'Arterial',
    'Rodovia',
  ]),
  zoneamento: { label: 'Zoneamento', type: 'texto', group: 'Localização' },
  dist_centro: num('Distância ao centro', 'Localização', 'm'),
  uso_vizinhanca: opc('Uso predominante da vizinhança', 'Localização', [
    'Residencial',
    'Comercial',
    'Misto',
    'Industrial',
  ]),
  transporte_publico: sn('Transporte público próximo', 'Localização'),

  // Infraestrutura (melhoramentos públicos)
  pavimentacao: sn('Pavimentação', 'Infraestrutura'),
  rede_agua: sn('Rede de água', 'Infraestrutura'),
  rede_esgoto: sn('Rede de esgoto', 'Infraestrutura'),
  energia: sn('Energia elétrica', 'Infraestrutura'),
  iluminacao: sn('Iluminação pública', 'Infraestrutura'),
  drenagem: sn('Drenagem pluvial', 'Infraestrutura'),
  meio_fio: sn('Meio-fio / sarjeta', 'Infraestrutura'),
  calcada: sn('Calçada', 'Infraestrutura'),
  coleta_lixo: sn('Coleta de lixo', 'Infraestrutura'),

  // Legislação e documentação
  coef_aproveitamento: num('Coeficiente de aproveitamento', 'Legislação'),
  taxa_ocupacao: num('Taxa de ocupação', 'Legislação', '%'),
  restricao_ambiental: sn('Restrição ambiental (APP)', 'Legislação'),
  documentacao_urbana: opc('Documentação', 'Legislação', [
    'Matrícula / escritura',
    'Contrato de compra e venda',
    'Posse',
    'Em regularização',
  ]),

  // Condomínio
  condominio_fechado: sn('Em condomínio fechado', 'Condomínio'),
  taxa_condominio: {
    label: 'Taxa de condomínio',
    type: 'moeda',
    group: 'Condomínio',
    unit: 'R$/mês',
  },
  elevador: sn('Elevador', 'Condomínio'),
  pavimentos_predio: num('Pavimentos do prédio', 'Condomínio'),
  lazer: opc('Lazer do condomínio', 'Condomínio', [
    'Sem lazer',
    'Básico',
    'Completo',
  ]),

  // Rurais (NBR 14653-3)
  area_ha: num('Área total', 'Rurais', 'ha'),
  area_aberta: num('Área aberta / aproveitável', 'Rurais', '%'),
  classe_uso: opc('Capacidade de uso das terras', 'Rurais', [
    'I',
    'II',
    'III',
    'IV',
    'V',
    'VI',
    'VII',
    'VIII',
  ]),
  relevo: opc('Relevo', 'Rurais', [
    'Plano',
    'Suave ondulado',
    'Ondulado',
    'Forte ondulado',
    'Montanhoso',
  ]),
  acesso_rural: opc('Acesso', 'Rurais', [
    'Asfalto',
    'Cascalhado',
    'Estrada de terra',
    'Precário',
  ]),
  dist_asfalto: num('Distância ao asfalto', 'Rurais', 'km'),
  dist_sede: num('Distância à sede do município', 'Rurais', 'km'),
  recursos_hidricos: opc('Recursos hídricos', 'Rurais', [
    'Rio / córrego',
    'Nascente',
    'Açude / represa',
    'Poço',
    'Sem água',
  ]),
  uso_atual: opc('Uso atual', 'Rurais', [
    'Pastagem',
    'Lavoura',
    'Mata nativa',
    'Reflorestamento',
    'Misto',
  ]),
  reserva_legal: num('Reserva legal / APP', 'Rurais', '%'),
  benfeitorias: { label: 'Benfeitorias', type: 'texto', group: 'Rurais' },
  valor_benfeitorias: {
    label: 'Valor das benfeitorias',
    type: 'moeda',
    group: 'Rurais',
    unit: 'R$',
  },
  documentacao: opc('Documentação', 'Rurais', [
    'Matrícula / escritura',
    'Posse',
    'Título do INCRA',
  ]),
};

/** Comuns a todo tipo: identificação + valor. */
/** Todo dado tem de dizer de onde veio: link do anúncio ou endereço/contato da fonte ('link'). */
const FIXAS_BASE = [
  'endereco',
  'bairro',
  'fonte',
  'contato',
  'link',
  'natureza',
  'valor',
];
const IDENT_OPCIONAIS = [
  'cidade',
  'latitude',
  'longitude',
  'matricula',
  'forma_pagamento',
];
const INFRA = [
  'pavimentacao',
  'rede_agua',
  'rede_esgoto',
  'energia',
  'iluminacao',
  'drenagem',
];
const LOCAL = ['distancia_polo', 'padrao_regiao', 'tipo_via', 'zoneamento'];

export type TipoImovel = {
  id: string;
  nome: string;
  descricao: string;
  /** Variável que divide o valor no valor unitário; sem ela o unitário é o próprio valor (ex.: R$/vaga). */
  areaKey?: string;
  /** Unidade do valor unitário (R$/m², R$/ha, R$/vaga). */
  unidade: string;
  /** Variáveis que não podem ser desmarcadas, além das de identificação. */
  fixas: string[];
  recomendadas: string[];
  opcionais: string[];
};

export const TIPOS: TipoImovel[] = [
  {
    id: 'TERRENO',
    nome: 'Terreno / lote urbano',
    descricao: 'Lotes vagos urbanos (NBR 14653-2)',
    areaKey: 'area_terreno',
    unidade: 'R$/m²',
    fixas: ['area_terreno'],
    recomendadas: [
      'frente',
      'profundidade',
      'topografia',
      'situacao_quadra',
      'superficie',
      'pavimentacao',
      'rede_agua',
      'rede_esgoto',
      'energia',
      'padrao_regiao',
      'distancia_polo',
      'documentacao_urbana',
    ],
    opcionais: [
      'n_frentes',
      'formato',
      'nivel_rua',
      'fechamento',
      'ocupacao',
      'iluminacao',
      'drenagem',
      'meio_fio',
      'calcada',
      'coleta_lixo',
      'transporte_publico',
      'uso_vizinhanca',
      'dist_centro',
      'tipo_via',
      'zoneamento',
      'coef_aproveitamento',
      'taxa_ocupacao',
      'restricao_ambiental',
      'condominio_fechado',
      'valor_venal_m2',
    ],
  },
  {
    id: 'CASA',
    nome: 'Casa',
    descricao: 'Casas térreas, sobrados e geminadas',
    areaKey: 'area_construida',
    unidade: 'R$/m²',
    fixas: ['area_construida'],
    recomendadas: [
      'area_terreno',
      'quartos',
      'suites',
      'banheiros',
      'vagas',
      'padrao',
      'conservacao',
      'idade',
    ],
    opcionais: [
      'tipo_casa',
      'pavimentos',
      'piscina',
      'area_gourmet',
      'topografia',
      'situacao_quadra',
      'condominio_fechado',
      'taxa_condominio',
      'ano_construcao',
      ...LOCAL,
      ...INFRA,
    ],
  },
  {
    id: 'APARTAMENTO',
    nome: 'Apartamento',
    descricao: 'Unidades autônomas residenciais em condomínio',
    areaKey: 'area_privativa',
    unidade: 'R$/m²',
    fixas: ['area_privativa'],
    recomendadas: [
      'quartos',
      'suites',
      'banheiros',
      'vagas',
      'andar',
      'padrao',
      'conservacao',
      'idade',
      'taxa_condominio',
    ],
    opcionais: [
      'area_total',
      'posicao',
      'sacada',
      'mobiliado',
      'elevador',
      'pavimentos_predio',
      'lazer',
      'ano_construcao',
      ...LOCAL,
    ],
  },
  {
    id: 'VAGA_GARAGEM',
    nome: 'Vaga de garagem',
    descricao: 'Vagas autônomas ou vinculadas, box e edifício-garagem',
    unidade: 'R$/vaga',
    fixas: [],
    recomendadas: [
      'cobertura_vaga',
      'uso_vaga',
      'tipo_vaga',
      'local_vaga',
      'uso_edificio',
    ],
    opcionais: [
      'area_vaga',
      'veiculo_vaga',
      'acesso_vaga',
      'taxa_condominio',
      'idade',
      'padrao_regiao',
    ],
  },
  {
    id: 'SALA_COMERCIAL',
    nome: 'Sala comercial',
    descricao: 'Salas e conjuntos em edifício comercial',
    areaKey: 'area_privativa',
    unidade: 'R$/m²',
    fixas: ['area_privativa'],
    recomendadas: [
      'banheiros',
      'vagas',
      'andar',
      'padrao',
      'conservacao',
      'idade',
      'taxa_condominio',
    ],
    opcionais: [
      'area_total',
      'posicao',
      'elevador',
      'pavimentos_predio',
      'mobiliado',
      'ano_construcao',
      ...LOCAL,
    ],
  },
  {
    id: 'LOJA',
    nome: 'Loja / ponto comercial',
    descricao: 'Lojas de rua, galerias e pontos comerciais',
    areaKey: 'area_construida',
    unidade: 'R$/m²',
    fixas: ['area_construida'],
    recomendadas: [
      'frente_loja',
      'pe_direito',
      'tipo_via',
      'situacao_quadra',
      'padrao',
      'conservacao',
      'idade',
    ],
    opcionais: [
      'area_terreno',
      'mezanino',
      'banheiros',
      'vagas',
      'taxa_condominio',
      'ano_construcao',
      'distancia_polo',
      'padrao_regiao',
      'zoneamento',
    ],
  },
  {
    id: 'GALPAO',
    nome: 'Galpão / barracão',
    descricao: 'Galpões industriais, logísticos e barracões',
    areaKey: 'area_construida',
    unidade: 'R$/m²',
    fixas: ['area_construida'],
    recomendadas: [
      'area_terreno',
      'pe_direito',
      'docas',
      'acesso_carreta',
      'padrao',
      'conservacao',
      'idade',
    ],
    opcionais: [
      'area_escritorio',
      'piso_industrial',
      'tipo_via',
      'ano_construcao',
      'distancia_polo',
      'zoneamento',
      ...INFRA,
    ],
  },
  {
    id: 'RURAL',
    nome: 'Imóvel rural',
    descricao: 'Fazendas, sítios e glebas (NBR 14653-3)',
    areaKey: 'area_ha',
    unidade: 'R$/ha',
    fixas: ['area_ha'],
    recomendadas: [
      'area_aberta',
      'classe_uso',
      'relevo',
      'acesso_rural',
      'dist_sede',
      'recursos_hidricos',
      'uso_atual',
    ],
    opcionais: [
      'dist_asfalto',
      'reserva_legal',
      'energia',
      'benfeitorias',
      'valor_benfeitorias',
      'documentacao',
    ],
  },
  {
    id: 'OUTRO',
    nome: 'Outro (personalizado)',
    descricao: 'Comece só com a identificação e monte as suas variáveis',
    areaKey: 'area_total',
    unidade: 'R$/m²',
    fixas: [],
    recomendadas: ['area_total'],
    opcionais: Object.keys(VARIAVEIS).filter(
      k => !FIXAS_BASE.includes(k) && !IDENT_OPCIONAIS.includes(k),
    ),
  },
];

export const tipoPorId = (id: string): TipoImovel =>
  TIPOS.find(t => t.id === id) ?? TIPOS[TIPOS.length - 1]!;

export const nomeTipo = (id: string) => tipoPorId(id).nome;

const montar = (key: string, fixed = false): VariavelAmostra => ({
  key,
  ...VARIAVEIS[key]!,
  ...(fixed ? { fixed: true } : {}),
});

/** Opções do passo "Variáveis": todas as do tipo, com a marcação inicial (obrigatórias + recomendadas). */
export function opcoesDoTipo(tipoId: string) {
  const t = tipoPorId(tipoId);
  const fixas = new Set([...FIXAS_BASE, ...t.fixas]);
  const recomendadas = new Set(t.recomendadas);
  const chaves = [
    ...new Set([
      ...FIXAS_BASE,
      ...t.fixas,
      ...t.recomendadas,
      ...IDENT_OPCIONAIS,
      ...t.opcionais,
    ]),
  ].filter(k => VARIAVEIS[k]);
  return chaves.map(k => ({
    variavel: montar(k, fixas.has(k)),
    fixa: fixas.has(k),
    recomendada: recomendadas.has(k),
  }));
}

/** Variáveis iniciais do tipo (obrigatórias + recomendadas), na ordem dos grupos. */
export function variaveisIniciais(tipoId: string): VariavelAmostra[] {
  return ordenar(
    opcoesDoTipo(tipoId)
      .filter(o => o.fixa || o.recomendada)
      .map(o => o.variavel),
  );
}

/** Ordena pelos grupos do catálogo, mantendo a ordem relativa dentro do grupo. */
export function ordenar(vars: VariavelAmostra[]): VariavelAmostra[] {
  const pos = (g: string) => {
    const i = (GRUPOS as readonly string[]).indexOf(g);
    return i < 0 ? GRUPOS.length : i;
  };
  return vars
    .map((v, i) => ({ v, i }))
    .sort((a, b) => pos(a.v.group) - pos(b.v.group) || a.i - b.i)
    .map(x => x.v);
}

/**
 * Acrescenta a variável sem mexer na ordem que o usuário arrumou: entra logo depois da última do mesmo grupo
 * (ou no fim, se o grupo ainda não tem coluna).
 */
export function inserirNoGrupo(
  vars: VariavelAmostra[],
  v: VariavelAmostra,
): VariavelAmostra[] {
  if (vars.some(x => x.key === v.key)) return vars;
  let ultima = -1;
  vars.forEach((x, i) => {
    if (x.group === v.group) ultima = i;
  });
  if (ultima < 0) return [...vars, v];
  return [...vars.slice(0, ultima + 1), v, ...vars.slice(ultima + 1)];
}

/** Move a coluna `de` para a posição `para` (índices da lista). */
export function moverVariavel(
  vars: VariavelAmostra[],
  de: number,
  para: number,
): VariavelAmostra[] {
  if (de === para || de < 0 || de >= vars.length) return vars;
  const l = [...vars];
  const [x] = l.splice(de, 1);
  l.splice(Math.max(0, Math.min(para, l.length)), 0, x!);
  return l;
}

/** Chave para variável personalizada a partir do nome (sem acento, minúscula, única). */
export function chavePersonalizada(nome: string, existentes: string[]) {
  const base =
    'p_' +
    (normalizar(nome)
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '') || 'variavel');
  let k = base;
  for (let n = 2; existentes.includes(k); n++) k = `${base}_${n}`;
  return k;
}

export const normalizar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

export const TIPOS_VARIAVEL: { value: TipoVariavel; label: string }[] = [
  { value: 'numero', label: 'Número' },
  { value: 'moeda', label: 'Valor (R$)' },
  { value: 'texto', label: 'Texto' },
  { value: 'opcao', label: 'Lista de opções' },
  { value: 'simnao', label: 'Sim / Não' },
  { value: 'data', label: 'Data' },
];

/** Rótulo da coluna com a unidade, como vai para a tela e para o Excel: "Área do terreno (m²)". */
export const rotuloColuna = (v: Pick<VariavelAmostra, 'label' | 'unit'>) =>
  v.unit ? `${v.label} (${v.unit})` : v.label;
