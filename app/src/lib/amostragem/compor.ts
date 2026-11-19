import type {
  DadoAmostra,
  ResearchSample,
  VariavelAmostra,
} from './types';

import { novoId } from './calculo';
import { VARIAVEIS, inserirNoGrupo } from './catalogo';

/** Um dado candidato à amostragem composta, com a amostragem de origem. */
export type Candidato = {
  chave: string;
  dado: DadoAmostra;
  origem: ResearchSample;
  cidade: string;
};

/** Cidade do dado: a variável "Cidade" do dado ou, sem ela, a cidade da amostragem de origem. */
export const cidadeDoDado = (d: DadoAmostra, origem: ResearchSample) =>
  String(d.values.cidade ?? '').trim() || origem.city?.trim() || 'Sem cidade';

export function candidatos(origens: ResearchSample[]): Candidato[] {
  return origens.flatMap(o =>
    o.items.map(d => ({
      chave: `${o.id}:${d.id}`,
      dado: d,
      origem: o,
      cidade: cidadeDoDado(d, o),
    })),
  );
}

/**
 * Variáveis da amostragem composta: as da primeira origem, na ordem dela, mais as que só as outras têm (no grupo
 * certo), e sempre a "Cidade" (para cada dado dizer de onde é).
 */
export function juntarVariaveis(origens: ResearchSample[]): VariavelAmostra[] {
  let vars: VariavelAmostra[] = [...(origens[0]?.variables ?? [])];
  for (const o of origens.slice(1))
    for (const v of o.variables) vars = inserirNoGrupo(vars, v);
  if (!vars.some(v => v.key === 'cidade'))
    vars = inserirNoGrupo(vars, { key: 'cidade', ...VARIAVEIS.cidade! });
  return vars.filter(v => v.key !== 'obs');
}

/** Copia os dados escolhidos (id novo), preenchendo a cidade e guardando de qual amostragem vieram. */
export const copiarDados = (escolhidos: Candidato[]): DadoAmostra[] =>
  escolhidos.map(c => ({
    id: novoId(),
    collectedAt: c.dado.collectedAt,
    active: true,
    values: { ...c.dado.values, cidade: c.cidade },
    origem: c.origem.title,
  }));
