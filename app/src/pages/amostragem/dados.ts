import type { ResearchSampleInput } from '../../lib/amostragem/types'
import { baixar, exportarAmostragem, montarIdentidade, nomeArquivo } from '../../lib/amostragem/excel'
import { useStore } from '../../store/useStore'

const mascaraDoc = (v: string) => {
  const d = v.replace(/\D/g, '')
  if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
  if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
  return v
}
const mascaraFone = (v: string) => {
  const d = v.replace(/\D/g, '')
  if (d.length === 11) return d.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
  if (d.length === 10) return d.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3')
  return v
}

/**
 * Exporta a amostragem em .xlsx com a identidade da empresa cadastrada em Configurações (nome fantasia, razão social,
 * CNPJ e telefone) e o rodapé do FLUXO. Sem dados = modelo em branco para preencher.
 */
export function useExportar() {
  const empresa = useStore((s) => s.config.empresa)
  return async (a: ResearchSampleInput & { createdByName?: string | null }, nome?: string) => {
    const e = empresa ?? { fantasia: '', razao: '', cnpj: '', telefone: '' }
    const id = montarIdentidade(
      {
        nome: e.fantasia || e.razao || 'Minha empresa',
        razaoSocial: e.razao || undefined,
        cnpj: e.cnpj.replace(/\D/g, '').length >= 11 ? mascaraDoc(e.cnpj) : undefined,
        telefone: e.telefone.replace(/\D/g, '').length >= 8 ? mascaraFone(e.telefone) : undefined,
      },
      null,
    )
    baixar(await exportarAmostragem(a, id), nome ?? nomeArquivo(a))
  }
}
