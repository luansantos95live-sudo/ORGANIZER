import clsx from 'clsx'
import { format } from 'date-fns'
import { MapPin } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { IMPORTACAO_VAZIA, TIPOLOGIAS, TIPOLOGIA_ORDEM, brl, centroDaCidade, codigoOS, prazoDaTipologia, type NovaOSInput } from '../lib/os'
import { REFERENCIA_VALIDA } from '../lib/siopi'
import { lerCoordenadas, textoGMS } from '../lib/coordenadas'
import { useStore } from '../store/useStore'
import type { OS, Responsavel, Tipologia } from '../types'
import { Abas, Modal } from './ui'

// Abas iguais às da janela da O.S. (22/10): Cliente + Contato juntos; Importação no fim da Geral.
type Aba = 'geral' | 'cliente' | 'endereco' | 'datas' | 'valores'
const ABAS: { id: Aba; label: string }[] = [
  { id: 'geral', label: 'Geral' }, { id: 'cliente', label: 'Cliente e contato' }, { id: 'endereco', label: 'Endereço' },
  { id: 'datas', label: 'Datas' }, { id: 'valores', label: 'Valores' },
]
const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']

type Modo = { tipo: 'criar' } | { tipo: 'editar'; os: OS }

/** Formulário da O.S.: Geral (com a Importação no fim), Cliente e contato, Endereço, Datas e Valores. */
export function OsForm({ open, modo, onClose, onSalvo, topo, largura = 760 }: { open: boolean; modo: Modo; onClose: () => void; onSalvo?: (id: string) => void; topo?: ReactNode; largura?: number }) {
  const config = useStore((s) => s.config)
  const escopo = useStore((s) => s.escopo)
  const todas = useStore((s) => s.os)
  const criarOS = useStore((s) => s.criarOS)
  const atualizarOS = useStore((s) => s.atualizarOS)
  const [aba, setAba] = useState<Aba>('geral')
  const [f, setF] = useState(() => inicial(modo, escopo === 'rt' ? 'rt' : 'luan', config.prazoPadraoDias))
  const [tentou, setTentou] = useState(false)
  // coordenadas como texto, do jeito que o Google Maps copia (graus, minutos e segundos)
  const [coordTxt, setCoordTxt] = useState('')

  useEffect(() => {
    if (open) {
      const ini = inicial(modo, escopo === 'rt' ? 'rt' : 'luan', config.prazoPadraoDias)
      setF(ini); setAba('geral'); setTentou(false); setCoordTxt(textoGMS(ini.endereco.lat, ini.endereco.lng))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }))
  const setEnd = (k: keyof OS['endereco'], v: string | number | undefined) => setF((x) => ({ ...x, endereco: { ...x.endereco, [k]: v } }))
  const setImp = (k: keyof OS['importacao'], v: string) => setF((x) => ({ ...x, importacao: { ...x.importacao, [k]: v } }))

  const proximoNumero = todas.reduce((m, o) => Math.max(m, o.numero), 0) + 1
  const refRepetida = todas.some((o) => o.referencia === f.referencia.trim() && (modo.tipo === 'criar' || o.id !== modo.os.id))
  const erros: Partial<Record<Aba, string[]>> = {}
  const erro = (a: Aba, m: string) => { (erros[a] ??= []).push(m) }
  if (!REFERENCIA_VALIDA(f.referencia.trim())) erro('geral', 'Nº Referência no formato da Caixa (ex.: 7886.1831.001122004/2026.01.01).')
  else if (refRepetida) erro('geral', 'Já existe uma O.S. com esse Nº Referência.')
  if (!f.proponente.trim()) erro('cliente', 'Informe o nome do cliente.')
  if (!f.endereco.cidade.trim()) erro('endereco', 'Informe a cidade.')
  if (!(f.valorServico > 0)) erro('valores', 'Informe o valor da O.S.')
  if (f.prazo && f.emissao && f.prazo < f.emissao) erro('datas', 'O prazo não pode ser antes do recebimento.')
  const temErro = Object.keys(erros).length > 0

  const salvar = () => {
    setTentou(true)
    if (temErro) { setAba((Object.keys(erros) as Aba[])[0]); return }
    const { vistoriaData, vistoriaHora, ...resto } = f
    const dados: NovaOSInput = {
      ...resto,
      referencia: f.referencia.trim(),
      proponente: f.proponente.trim(),
      contato: f.contato.trim() || f.proponente.trim(),
      vistoria: vistoriaData ? { data: vistoriaData, hora: vistoriaHora || '08:00', duracao: config.duracaoVistoria } : undefined,
      entregaEm: f.entregaEm || undefined,
      concluidaEm: f.concluidaEm || undefined,
    }
    if (modo.tipo === 'criar') {
      const id = criarOS({ ...dados, status: vistoriaData ? 'em_andamento' : 'recebida', origem: 'manual' })
      onSalvo?.(id)
    } else {
      atualizarOS(modo.os.id, dados as Partial<OS>, 'Dados da O.S. editados')
      onSalvo?.(modo.os.id)
    }
    onClose()
  }

  const titulo = modo.tipo === 'criar' ? 'Nova OS' : `Editar ${codigoOS(modo.os)}`
  return (
    <Modal open={open} onClose={onClose} title={titulo} width={largura}
      footer={<>
        {tentou && temErro && <span className="text-[12.5px] text-[var(--vermelho)] mr-auto">Confira as abas marcadas.</span>}
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={salvar}>{modo.tipo === 'criar' ? 'Criar OS' : 'Salvar alterações'}</button>
      </>}
    >
      {topo && <div>{topo}</div>}
      <Abas abas={ABAS.map((a) => ({ ...a, label: tentou && erros[a.id] ? `${a.label} •` : a.label }))} valor={aba} onChange={setAba} />
      {tentou && erros[aba] && <div className="rounded-lg px-3 py-2 mb-3 text-[12.5px] bg-[var(--vermelho-soft)] text-[var(--vermelho)]">{erros[aba]!.join(' ')}</div>}

      {aba === 'geral' && (
        <Grade>
          <Campo l="Tipologia" largo>
            <select className="input w-full" value={f.tipologia} onChange={(e) => { const t = e.target.value as Tipologia; setF((x) => ({ ...x, tipologia: t, prazo: modo.tipo === 'editar' ? x.prazo : prazoDaTipologia(t, x.emissao, config.prazoPadraoDias) })) }}>
              {TIPOLOGIA_ORDEM.map((t) => <option key={t} value={t}>{t} - {TIPOLOGIAS[t]}</option>)}
            </select>
          </Campo>
          <Campo l="Nº Referência"><input className="input w-full tnum" placeholder="Ex: 7886.1831.001122004/2026.01.01" value={f.referencia} onChange={(e) => set('referencia', e.target.value)} /></Campo>
          <Campo l="Nº Identificador"><input className="input w-full tnum" value={modo.tipo === 'criar' ? `OS-${proximoNumero}` : codigoOS(modo.os)} readOnly /></Campo>
          <Campo l="Mês Referência"><input type="month" className="input w-full" value={f.mesReferencia} onChange={(e) => set('mesReferencia', e.target.value)} /></Campo>
          {/* a O.S. vem vinculada ao RT do polo: na edição o técnico não muda; só se escolhe ao criar à mão */}
          <Campo l="Técnico">
            {modo.tipo === 'criar'
              ? <select className="input w-full" value={f.responsavel} onChange={(e) => set('responsavel', e.target.value as Responsavel)}>
                <option value="luan">{config.responsaveis.luan.nome}</option>
                <option value="rt">{config.responsaveis.rt.nome}</option>
              </select>
              : <input className="input w-full" value={config.responsaveis[f.responsavel].nome} readOnly title="A O.S. vem vinculada ao RT do polo e não muda de técnico" />}
          </Campo>
          <Campo l="Propriedade" largo><input className="input w-full" placeholder="Descrição da propriedade" value={f.propriedade} onChange={(e) => set('propriedade', e.target.value)} /></Campo>
          <Campo l="Descrição" largo><textarea className="input w-full min-h-[70px]" placeholder="Descrição detalhada da OS..." value={f.descricao} onChange={(e) => set('descricao', e.target.value)} /></Campo>
          <Campo l="Observação" largo><textarea className="input w-full min-h-[60px]" placeholder="Observações internas..." value={f.observacoes} onChange={(e) => set('observacoes', e.target.value)} /></Campo>
        </Grade>
      )}

      {aba === 'cliente' && (
        <Grade>
          <Campo l="Nome do Cliente" largo><input className="input w-full" placeholder="Nome completo" value={f.proponente} onChange={(e) => set('proponente', e.target.value.toUpperCase())} /></Campo>
          <Campo l="CNPJ/CPF"><input className="input w-full tnum" placeholder="CPF ou CNPJ" value={f.documento} onChange={(e) => set('documento', e.target.value)} /></Campo>
          <Campo l="Telefone"><input className="input w-full tnum" value={f.clienteTelefone} onChange={(e) => set('clienteTelefone', e.target.value)} /></Campo>
          <Campo l="E-mail" largo><input type="email" className="input w-full" placeholder="cliente@email.com" value={f.clienteEmail} onChange={(e) => set('clienteEmail', e.target.value)} /></Campo>
        </Grade>
      )}

      {aba === 'cliente' && (
        <>
        <div className="text-[12px] font-bold uppercase tracking-[.07em] text-[var(--verde-valor)] pb-1.5 mb-3 mt-6 border-b border-border">Contato para a vistoria</div>
        <Grade>
          <Campo l="Nome do Contato" largo><input className="input w-full" value={f.contato} onChange={(e) => set('contato', e.target.value.toUpperCase())} /></Campo>
          <Campo l="Telefone do Contato"><input className="input w-full tnum" value={f.telefone} onChange={(e) => set('telefone', e.target.value)} /></Campo>
          <Campo l="WhatsApp"><input className="input w-full tnum" placeholder="Se for outro número" value={f.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} /></Campo>
          <Campo l="E-mail do Contato" largo><input type="email" className="input w-full" value={f.contatoEmail} onChange={(e) => set('contatoEmail', e.target.value)} /></Campo>
        </Grade>
        </>
      )}

      {aba === 'endereco' && (
        <Grade>
          <Campo l="CEP"><input className="input w-full tnum" placeholder="00.000-000" value={f.endereco.cep} onChange={(e) => setEnd('cep', e.target.value)} /></Campo>
          <Campo l="Logradouro"><input className="input w-full" placeholder="Rua, Avenida..." value={f.endereco.logradouro} onChange={(e) => setEnd('logradouro', e.target.value.toUpperCase())} /></Campo>
          <Campo l="Número"><input className="input w-full" value={f.endereco.numero} onChange={(e) => setEnd('numero', e.target.value)} /></Campo>
          <Campo l="Bairro"><input className="input w-full" value={f.endereco.bairro} onChange={(e) => setEnd('bairro', e.target.value.toUpperCase())} /></Campo>
          <Campo l="Cidade"><input className="input w-full" value={f.endereco.cidade} onChange={(e) => setEnd('cidade', e.target.value.toUpperCase())} /></Campo>
          <Campo l="Estado">
            <select className="input w-full" value={f.endereco.uf} onChange={(e) => setEnd('uf', e.target.value)}>
              <option value="">Selecione o estado</option>
              {UFS.map((u) => <option key={u}>{u}</option>)}
            </select>
          </Campo>
          {/* uma caixa só, do jeito que o Google Maps copia (ex.: 9°52'45.8"S 63°02'23.5"W); também aceita números ou o link */}
          <Campo l="Coordenadas (cole do Google Maps)" largo>
            <input className="input w-full tnum" placeholder={`Ex.: 9°52'45.8"S 63°02'23.5"W`} value={coordTxt}
              onChange={(e) => {
                const v = e.target.value
                setCoordTxt(v)
                const c = lerCoordenadas(v)
                if (c) setF((x) => ({ ...x, endereco: { ...x.endereco, lat: c.lat, lng: c.lng } }))
                else if (!v.trim()) setF((x) => ({ ...x, endereco: { ...x.endereco, lat: undefined, lng: undefined } }))
              }} />
            <span className={`block text-[12px] mt-1 ${coordTxt.trim() && !lerCoordenadas(coordTxt) ? 'text-[var(--vermelho)]' : 'text-muted'}`}>
              {!coordTxt.trim() ? 'No Google Maps, clique com o botão direito no imóvel e copie as coordenadas.'
                : lerCoordenadas(coordTxt) ? `Latitude ${f.endereco.lat} · Longitude ${f.endereco.lng}` : 'Não reconheci as coordenadas. Cole do jeito que o Maps copia.'}
            </span>
          </Campo>
          <div className="sm:col-span-2">
            <button type="button" className="btn btn-secondary btn-sm" disabled={!centroDaCidade(f.endereco.cidade)} onClick={() => { const c = centroDaCidade(f.endereco.cidade); if (c) { setF((x) => ({ ...x, endereco: { ...x.endereco, lat: c.lat, lng: c.lng } })); setCoordTxt(textoGMS(c.lat, c.lng)) } }}>
              <MapPin size={14} /> Usar o centro da cidade
            </button>
            <span className="text-[12px] text-muted ml-2">Sem coordenada, a O.S. não aparece no mapa do Roteirizador.</span>
          </div>
        </Grade>
      )}

      {aba === 'datas' && (
        <Grade>
          <Campo l="Data Recebimento"><input type="date" className="input w-full" value={f.emissao} onChange={(e) => setF((x) => ({ ...x, emissao: e.target.value, prazo: modo.tipo === 'editar' && x.prazo ? x.prazo : prazoDaTipologia(x.tipologia, e.target.value, config.prazoPadraoDias) }))} /></Campo>
          <Campo l="Prazo"><input type="date" className="input w-full" value={f.prazo} onChange={(e) => set('prazo', e.target.value)} /></Campo>
          <Campo l="Data Entrega"><input type="date" className="input w-full" value={f.entregaEm} onChange={(e) => set('entregaEm', e.target.value)} /></Campo>
          <Campo l="Data Conclusão"><input type="date" className="input w-full" value={f.concluidaEm} onChange={(e) => set('concluidaEm', e.target.value)} /></Campo>
          <Campo l="Data Vistoria"><input type="date" className="input w-full" value={f.vistoriaData} onChange={(e) => set('vistoriaData', e.target.value)} /></Campo>
          <Campo l="Hora Vistoria"><input type="time" className="input w-full" value={f.vistoriaHora} onChange={(e) => set('vistoriaHora', e.target.value)} /></Campo>
        </Grade>
      )}

      {aba === 'valores' && (
        <Grade>
          <Campo l="Valor (R$)"><input type="number" min={0} step="0.01" className="input w-full tnum" placeholder="R$ 0,00" value={f.valorServico || ''} onChange={(e) => set('valorServico', Number(e.target.value))} /></Campo>
          <Campo l="Valor Deslocamento (R$)"><input type="number" min={0} step="0.01" className="input w-full tnum" placeholder="R$ 0,00" value={f.valorDeslocamento || ''} onChange={(e) => set('valorDeslocamento', Number(e.target.value))} /></Campo>
          <Campo l="Total"><div className="input w-full tnum flex items-center font-bold">{brl((f.valorServico || 0) + (f.valorDeslocamento || 0))}</div></Campo>
        </Grade>
      )}

      {aba === 'geral' && (
        <>
        <div className="text-[12px] font-bold uppercase tracking-[.07em] text-[var(--verde-valor)] pb-1.5 mb-3 mt-6 border-b border-border">Importação</div>
        <Grade>
          <Campo l="Cód. Produto"><input className="input w-full tnum" value={f.importacao.codProduto} onChange={(e) => setImp('codProduto', e.target.value)} /></Campo>
          <Campo l="Cód. Linha"><input className="input w-full tnum" value={f.importacao.codLinha} onChange={(e) => setImp('codLinha', e.target.value)} /></Campo>
          <Campo l="Cód. Fonte"><input className="input w-full tnum" value={f.importacao.codFonte} onChange={(e) => setImp('codFonte', e.target.value)} /></Campo>
          <Campo l="Nº Registro"><input className="input w-full tnum" value={f.matricula} onChange={(e) => set('matricula', e.target.value)} /></Campo>
          <Campo l="Cartório (Ofício)"><input className="input w-full" value={f.importacao.cartorio} onChange={(e) => setImp('cartorio', e.target.value)} /></Campo>
          <Campo l="Cartório (Livro)"><input className="input w-full" value={f.importacao.livro} onChange={(e) => setImp('livro', e.target.value)} /></Campo>
          <Campo l="Local Retirada"><input className="input w-full" value={f.importacao.localRetirada} onChange={(e) => setImp('localRetirada', e.target.value)} /></Campo>
          <Campo l="Solicitante"><input className="input w-full" value={f.importacao.solicitante} onChange={(e) => setImp('solicitante', e.target.value)} /></Campo>
          <Campo l="Executante" largo><input className="input w-full" value={f.importacao.executante} onChange={(e) => setImp('executante', e.target.value)} /></Campo>
        </Grade>
        </>
      )}
    </Modal>
  )
}

function inicial(modo: Modo, resp: Responsavel, prazoDias: number) {
  const hoje = format(new Date(), 'yyyy-MM-dd')
  if (modo.tipo === 'editar') {
    const o = modo.os
    return {
      referencia: o.referencia, tipologia: o.tipologia, responsavel: o.responsavel, mesReferencia: o.mesReferencia, propriedade: o.propriedade, descricao: o.descricao, observacoes: o.observacoes,
      proponente: o.proponente, documento: o.documento, clienteTelefone: o.clienteTelefone, clienteEmail: o.clienteEmail,
      contato: o.contato, telefone: o.telefone, whatsapp: o.whatsapp, contatoEmail: o.contatoEmail,
      endereco: { ...o.endereco }, matricula: o.matricula, emissao: o.emissao, prazo: o.prazo, entregaEm: o.entregaEm ?? '', concluidaEm: o.concluidaEm ?? '',
      vistoriaData: o.vistoria?.data ?? '', vistoriaHora: o.vistoria?.hora ?? '', valorServico: o.valorServico, valorDeslocamento: o.valorDeslocamento, importacao: { ...o.importacao },
    }
  }
  return {
    referencia: '', tipologia: 'A413' as Tipologia, responsavel: resp, mesReferencia: hoje.slice(0, 7), propriedade: '', descricao: '', observacoes: '',
    proponente: '', documento: '', clienteTelefone: '', clienteEmail: '', contato: '', telefone: '', whatsapp: '', contatoEmail: '',
    endereco: { logradouro: '', numero: '', bairro: '', cidade: '', uf: 'RO', cep: '' } as OS['endereco'], matricula: '',
    emissao: hoje, prazo: prazoDaTipologia('A413', hoje, prazoDias), entregaEm: '', concluidaEm: '', vistoriaData: '', vistoriaHora: '',
    valorServico: 0, valorDeslocamento: 0, importacao: { ...IMPORTACAO_VAZIA },
  }
}

function Grade({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">{children}</div>
}

function Campo({ l, children, largo }: { l: string; children: ReactNode; largo?: boolean }) {
  return (
    <label className={clsx('flex flex-col gap-1', largo && 'sm:col-span-2')}>
      <span className="text-[12px] font-medium text-muted">{l}</span>
      {children}
    </label>
  )
}
