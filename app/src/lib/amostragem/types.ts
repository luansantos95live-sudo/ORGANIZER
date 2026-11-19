/** Tipo de dado de uma variável da ficha de pesquisa. */
export type TipoVariavel =
  | 'numero'
  | 'moeda'
  | 'texto'
  | 'opcao'
  | 'simnao'
  | 'data';

/** Variável escolhida para a amostragem (do catálogo ou criada pelo avaliador). */
export type VariavelAmostra = {
  key: string;
  label: string;
  type: TipoVariavel;
  unit?: string;
  options?: string[];
  group: string;
  /** Criada pelo usuário (não está no catálogo do tipo). */
  custom?: boolean;
  /** Obrigatória do tipo: não pode ser desmarcada. */
  fixed?: boolean;
};

export type ValorDado = string | number | boolean | null;

/** Um dado de mercado coletado (uma linha da ficha). */
export type DadoAmostra = {
  id: string;
  /** yyyy-MM-dd */
  collectedAt: string;
  /** Dado usado no tratamento (false = descartado no saneamento). */
  active: boolean;
  values: Record<string, ValorDado>;
  /** Amostragem de onde o dado veio (amostragem composta). */
  origem?: string;
};

export type Finalidade = 'VENDA' | 'ALUGUEL';

/** Abrangência da pesquisa: só a cidade, só bairro(s) ou a cidade e os bairros. */
export type Abrangencia = 'CIDADE' | 'BAIRRO' | 'CIDADE_BAIRRO';

export type ResearchSampleInput = {
  title: string;
  propertyType: string;
  purpose: Finalidade;
  scope: Abrangencia;
  state?: string | null;
  city?: string | null;
  region?: string | null;
  serviceOrderRef?: string | null;
  /** yyyy-MM-dd */
  referenceDate: string;
  validityMonths: number;
  notes?: string | null;
  variables: VariavelAmostra[];
  items: DadoAmostra[];
};

export type ResearchSample = ResearchSampleInput & {
  id: string;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ResearchSampleSummary = {
  id: string;
  title: string;
  propertyType: string;
  purpose: Finalidade;
  scope: Abrangencia;
  state: string | null;
  city: string | null;
  region: string | null;
  serviceOrderRef: string | null;
  referenceDate: string;
  validityMonths: number;
  itemCount: number;
  activeItemCount: number;
  oldestCollectedAt: string | null;
  newestCollectedAt: string | null;
  createdByName: string | null;
  updatedAt: string;
};
