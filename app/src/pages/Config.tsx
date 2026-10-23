import clsx from 'clsx'
import { Building2, CreditCard, Database, FolderSync, Mail, SlidersHorizontal, UserRound, Users, Wallet } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { copiar } from '../lib/clipboard'
import { lerBackup, montarBackup } from '../lib/backup'
import { POLOS } from '../lib/os'
import { Avatar, Field, PageHeader } from '../components/ui'
import { useStore } from '../store/useStore'
import type { Membro, Responsavel } from '../types'

// Seções iguais às do sistema real, mais duas do laboratório (Financeiro e Backup).
const SECOES = [
  { id: 'empresa', titulo: 'Empresa', sub: 'Dados comerciais e fiscais', icon: Building2 },
  { id: 'perfil', titulo: 'Meu Perfil', sub: 'Perfil e acesso', icon: UserRound },
  { id: 'gerais', titulo: 'Configurações Gerais', sub: 'Tema e comportamento', icon: SlidersHorizontal },
  { id: 'assinatura', titulo: 'Assinatura e Cobrança', sub: 'Plano e cobrança', icon: CreditCard },
  { id: 'equipe', titulo: 'Equipe', sub: 'Equipe e permissões', icon: Users },
  { id: 'gmail', titulo: 'Gmail', sub: 'Integração de e-mail', icon: Mail },
  { id: 'agent', titulo: 'Fluxo Agent', sub: 'Sincronização de pastas locais', icon: FolderSync },
  { id: 'financeiro', titulo: 'Financeiro', sub: 'Repasse do RT e meta (laboratório)', icon: Wallet },
  { id: 'backup', titulo: 'Backup e dados', sub: 'Levar os dados para outro PC (laboratório)', icon: Database },
] as const
type Secao = (typeof SECOES)[number]['id']

export function ConfigPage() {
  const [sp, setSp] = useSearchParams()
  const secao = (SECOES.some((s) => s.id === sp.get('secao')) ? sp.get('secao') : 'empresa') as Secao
  const atual = SECOES.find((s) => s.id === secao)!
  return (
    <>
      <PageHeader title="Configurações" subtitle="Empresa, perfil, usuários e preferências. Tudo fica salvo neste navegador assim que você digita." />
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-3 items-start">
        <nav className="card p-2 flex flex-col gap-0.5">
          {SECOES.map((s) => (
            <button key={s.id} onClick={() => setSp({ secao: s.id }, { replace: true })}
              className={clsx('flex items-start gap-3 text-left px-3 py-2.5 rounded-[10px] transition', secao === s.id ? 'bg-[rgba(58,184,30,.13)] shadow-[inset_0_0_0_1px_rgba(58,184,30,.25)]' : 'hover:bg-surface-2')}>
              <s.icon size={17} strokeWidth={1.75} className={clsx('mt-0.5 shrink-0', secao === s.id ? 'text-[var(--brand)]' : 'text-muted')} />
              <span className="min-w-0"><b className="block text-[13.5px] font-semibold leading-tight">{s.titulo}</b><span className="block text-[12px] text-muted leading-tight mt-0.5">{s.sub}</span></span>
            </button>
          ))}
        </nav>
        <section className="card px-5 py-4">
          <h2 className="font-semibold text-[16px]">{atual.titulo}</h2>
          <p className="text-[12.5px] text-muted mb-3">{atual.sub}</p>
          {secao === 'empresa' && <Empresa />}
          {secao === 'perfil' && <Perfil />}
          {secao === 'gerais' && <Gerais />}
          {secao === 'assinatura' && <Indisponivel texto="No laboratório não há plano nem cobrança. O sistema real mostra aqui o plano atual, o status da empresa e os botões Alterar plano e Cancelar assinatura." />}
          {secao === 'equipe' && <Equipe />}
          {secao === 'gmail' && <Indisponivel texto="No sistema real, conectar o Gmail faz as O.S. que chegam por e-mail entrarem sozinhas (aparecem em Início › Chegaram da CAIXA). No laboratório, use Ordens de Serviço › Nova OS › Importar OS." botao="Conectar com Google" />}
          {secao === 'agent' && <Indisponivel texto="No sistema real, o Fluxo Agent sincroniza pastas do computador (dispositivos conectados e código de pareamento). No laboratório não há agente." botao="Gerar código de pareamento" />}
          {secao === 'financeiro' && <Financeiro />}
          {secao === 'backup' && <Backup />}
        </section>
      </div>
    </>
  )
}

function Grade({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-x-4 gap-y-3">{children}</div>
}

function Empresa() {
  const config = useStore((s) => s.config)
  const setConfig = useStore((s) => s.setConfig)
  const emp = (k: keyof typeof config.empresa, v: string) => setConfig({ empresa: { ...config.empresa, [k]: v } })
  const con = (k: keyof typeof config.contrato, v: string) => setConfig({ contrato: { ...config.contrato, [k]: v } })
  return (
    <>
      <h3 className="card-tit mb-2">Dados da empresa</h3>
      <Grade>
        <Field label="Nome fantasia"><input className="input" value={config.empresa.fantasia} onChange={(e) => emp('fantasia', e.target.value)} /></Field>
        <Field label="Razão social"><input className="input" value={config.empresa.razao} onChange={(e) => emp('razao', e.target.value)} /></Field>
        <Field label="CNPJ"><input className="input tnum" value={config.empresa.cnpj} onChange={(e) => emp('cnpj', e.target.value)} /></Field>
        <Field label="Telefone"><input className="input tnum" value={config.empresa.telefone} onChange={(e) => emp('telefone', e.target.value)} /></Field>
        <Field label="Responsável"><input className="input" value={config.empresa.responsavel} onChange={(e) => emp('responsavel', e.target.value)} /></Field>
        <Field label="Nº do Contrato"><input className="input tnum" value={config.contrato.numero} onChange={(e) => con('numero', e.target.value)} /></Field>
      </Grade>
      <h3 className="card-tit mt-6 mb-2">Contrato com a Caixa <span className="suave">usado no texto do RRT e da nota (laboratório)</span></h3>
      <Grade>
        <Field label="Edital de credenciamento"><input className="input tnum" value={config.contrato.edital} onChange={(e) => con('edital', e.target.value)} /></Field>
        <Field label="Processo administrativo"><input className="input tnum" value={config.contrato.processo} onChange={(e) => con('processo', e.target.value)} /></Field>
        <Field label="Contrato como aparece no RRT"><input className="input tnum" value={config.contrato.rrt} onChange={(e) => con('rrt', e.target.value)} placeholder="Ex.: 00000/2024 - NACIONAL" /></Field>
        <Field label="Município da prestação"><input className="input" value={config.empresa.municipio} onChange={(e) => emp('municipio', e.target.value)} /></Field>
      </Grade>
      <p className="text-[12px] text-muted mt-4">Fica só neste navegador e no backup: o código do laboratório é público e não guarda contrato, CNPJ nem nomes reais.</p>
    </>
  )
}

function Perfil() {
  const config = useStore((s) => s.config)
  const setConfig = useStore((s) => s.setConfig)
  const eu = config.responsaveis.luan
  const set = (k: keyof Membro, v: string) => setConfig({ responsaveis: { ...config.responsaveis, luan: { ...eu, [k]: v } } })
  const base = config.base
  const alternarPolo = (p: string) => setConfig({ polosAtendidos: config.polosAtendidos.includes(p) ? config.polosAtendidos.filter((x) => x !== p) : [...config.polosAtendidos, p] })
  return (
    <>
      <h3 className="card-tit mb-2">Dados pessoais</h3>
      <Grade>
        <Field label="Nome"><input className="input" value={eu.nome} onChange={(e) => set('nome', e.target.value)} /></Field>
        <Field label="Nome de exibição"><input className="input" value={eu.curto} onChange={(e) => set('curto', e.target.value)} /></Field>
        <Field label="E-mail"><input type="email" className="input" value={eu.email} onChange={(e) => set('email', e.target.value)} /></Field>
        <Field label="Registro profissional (CREA/CAU)"><input className="input tnum" value={eu.registro} onChange={(e) => set('registro', e.target.value)} /></Field>
      </Grade>
      <h3 className="card-tit mt-6 mb-2">Rotas</h3>
      <Grade>
        <Field label="Endereço base (rotas)" className="sm:col-span-2"><input className="input" value={base.endereco} onChange={(e) => setConfig({ base: { ...base, endereco: e.target.value } })} /></Field>
        <Field label="Latitude"><input className="input tnum" value={base.lat} onChange={(e) => setConfig({ base: { ...base, lat: Number(e.target.value.replace(',', '.')) || 0 } })} /></Field>
        <Field label="Longitude"><input className="input tnum" value={base.lng} onChange={(e) => setConfig({ base: { ...base, lng: Number(e.target.value.replace(',', '.')) || 0 } })} /></Field>
        <Field label="Mensagem de WhatsApp (rotas)" className="sm:col-span-2">
          <textarea className="input min-h-[80px]" value={config.mensagemWhatsApp} onChange={(e) => setConfig({ mensagemWhatsApp: e.target.value })} />
          <span className="text-[11.5px] text-muted">Use {'{contato}'}, {'{endereco}'}, {'{data}'} e {'{hora}'}.</span>
        </Field>
      </Grade>
      <h3 className="card-tit mt-6 mb-2">Polos atendidos <span className="suave">delegação de OS</span></h3>
      <div className="flex flex-wrap gap-2">
        {Object.keys(POLOS).map((p) => (
          <label key={p} className={clsx('chip !h-8 cursor-pointer border', config.polosAtendidos.includes(p) ? 'chip-v border-transparent' : 'border-border text-muted')}>
            <input type="checkbox" className="sr-only" checked={config.polosAtendidos.includes(p)} onChange={() => alternarPolo(p)} />{p}
          </label>
        ))}
      </div>
    </>
  )
}

function Gerais() {
  const config = useStore((s) => s.config)
  const setConfig = useStore((s) => s.setConfig)
  return (
    <div className="flex flex-col gap-4">
      <Interruptor titulo="Modo escuro" texto={config.tema === 'escuro' ? 'Ativado. A interface usa uma paleta de baixo brilho.' : 'Desativado.'} ligado={config.tema === 'escuro'} onClick={() => setConfig({ tema: config.tema === 'escuro' ? 'claro' : 'escuro' })} />
      <Interruptor titulo="Menu recolhido" texto="Menu lateral só com ícones, como no FLUXO ARQ." ligado={config.menuRecolhido} onClick={() => setConfig({ menuRecolhido: !config.menuRecolhido })} />
      <Grade>
        <Field label="Prazo padrão de uma O.S. nova (dias)"><input type="number" min={1} className="input tnum" value={config.prazoPadraoDias} onChange={(e) => setConfig({ prazoPadraoDias: Number(e.target.value) || 15 })} /></Field>
        <Field label="Duração de cada vistoria (min)"><input type="number" min={5} className="input tnum" value={config.duracaoVistoria} onChange={(e) => setConfig({ duracaoVistoria: Number(e.target.value) || 40 })} /></Field>
        <Field label="Velocidade média das rotas (km/h)"><input type="number" min={10} className="input tnum" value={config.velocidadeMedia} onChange={(e) => setConfig({ velocidadeMedia: Number(e.target.value) || 30 })} /></Field>
      </Grade>
    </div>
  )
}

function Interruptor({ titulo, texto, ligado, onClick }: { titulo: string; texto: string; ligado: boolean; onClick: () => void }) {
  return (
    <button className="flex items-center gap-4 text-left rounded-[12px] border border-border px-4 py-3 hover:border-[var(--brand)]" role="switch" aria-checked={ligado} onClick={onClick}>
      <span className="flex-1"><b className="block text-[14px]">{titulo}</b><span className="text-[12.5px] text-muted">{texto}</span></span>
      <span className={clsx('w-11 h-6 rounded-full relative transition shrink-0', ligado ? 'bg-[var(--brand)]' : 'bg-[var(--seg)]')}>
        <span className={clsx('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all', ligado ? 'left-[22px]' : 'left-0.5')} />
      </span>
    </button>
  )
}

function Equipe() {
  const config = useStore((s) => s.config)
  const setConfig = useStore((s) => s.setConfig)
  const set = (r: Responsavel, k: keyof Membro, v: string | boolean) => setConfig({ responsaveis: { ...config.responsaveis, [r]: { ...config.responsaveis[r], [k]: v } } })
  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13px] text-muted tnum">{(['luan', 'rt'] as Responsavel[]).filter((r) => config.responsaveis[r].ativo !== false).length} / 3 usuários ativos</span>
        <button className="btn btn-secondary btn-sm" disabled title="No laboratório a equipe tem você e o RT">Novo membro</button>
      </div>
      <div className="flex flex-col gap-3">
        {(['luan', 'rt'] as Responsavel[]).map((r) => {
          const m = config.responsaveis[r]
          return (
            <div key={r} className="rounded-[12px] border border-border p-4">
              <div className="flex items-center gap-3 mb-3">
                <Avatar resp={r} size={34} />
                <span className="flex-1"><b className="block text-[14px]">{m.nome}</b><span className="text-[12px] text-muted">{m.email || 'sem e-mail'}</span></span>
                <span className={clsx('chip', m.papel === 'Proprietário' ? 'chip-v' : 'chip-rt')}>{m.papel}</span>
                {m.papel === 'Proprietário'
                  ? <span className="chip status-concluida">Ativo</span>
                  : <button type="button" className={clsx('chip cursor-pointer', m.ativo !== false ? 'status-concluida' : 'farol-none')} title="Clique para ativar ou desativar. Com um só técnico ativo, o seletor Minhas · Todas some do menu."
                      onClick={() => set(r, 'ativo', m.ativo === false)}>{m.ativo !== false ? 'Ativo' : 'Inativo'}</button>}
              </div>
              <Grade>
                <Field label="Nome"><input className="input" value={m.nome} onChange={(e) => set(r, 'nome', e.target.value)} /></Field>
                <Field label="Nome curto"><input className="input" value={m.curto} onChange={(e) => set(r, 'curto', e.target.value)} /></Field>
                <Field label="E-mail"><input type="email" className="input" value={m.email} onChange={(e) => set(r, 'email', e.target.value)} /></Field>
                <Field label="Registro (CREA/CAU)"><input className="input tnum" value={m.registro} onChange={(e) => set(r, 'registro', e.target.value)} /></Field>
              </Grade>
            </div>
          )
        })}
      </div>
    </>
  )
}

function Financeiro() {
  const config = useStore((s) => s.config)
  const setConfig = useStore((s) => s.setConfig)
  return (
    <Grade>
      <Field label="Repasse do RT para você (%)"><input type="number" min={0} max={100} className="input tnum" value={Math.round(config.repasseRT * 100)} onChange={(e) => setConfig({ repasseRT: Math.max(0, Math.min(100, Number(e.target.value) || 0)) / 100 })} /></Field>
      <Field label="Repasse incide sobre">
        <select className="input" value={config.repasseBase} onChange={(e) => setConfig({ repasseBase: e.target.value as 'total' | 'servico' })}>
          <option value="total">Serviço + deslocamento</option>
          <option value="servico">Só o serviço</option>
        </select>
      </Field>
      <Field label="Meta mensal (R$)"><input type="number" min={0} step={100} className="input tnum" value={config.metaMensal} onChange={(e) => setConfig({ metaMensal: Number(e.target.value) || 0 })} /></Field>
    </Grade>
  )
}

function Indisponivel({ texto, botao }: { texto: string; botao?: string }) {
  return (
    <div className="rounded-[12px] border border-dashed border-border px-5 py-6">
      <p className="text-[13.5px] leading-relaxed">{texto}</p>
      {botao && <button className="btn btn-secondary mt-4" disabled>{botao}</button>}
    </div>
  )
}

function Backup() {
  const config = useStore((s) => s.config)
  const resetarDados = useStore((s) => s.resetarDados)
  const restaurarDados = useStore((s) => s.restaurarDados)
  const os = useStore((s) => s.os)
  const rotas = useStore((s) => s.rotas)
  const fechamentos = useStore((s) => s.fechamentos)
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null)
  const [pendente, setPendente] = useState<{ dados: Parameters<typeof restaurarDados>[0]; resumo: string } | null>(null)
  const [colado, setColado] = useState('')
  const [confirmaReset, setConfirmaReset] = useState(false)

  const exportar = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([montarBackup({ os, rotas, config, fechamentos })], { type: 'application/json' }))
    a.download = `fluxocaixa_backup_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    setMsg({ ok: true, texto: `Backup exportado com ${os.length} O.S.` })
  }
  const copiarBackup = async () => {
    const ok = await copiar(montarBackup({ os, rotas, config, fechamentos }))
    setMsg(ok ? { ok: true, texto: `Backup copiado (${os.length} O.S.). Cole no outro computador em "Colar backup".` } : { ok: false, texto: 'O navegador não deixou copiar. Use "Exportar backup".' })
  }
  const ler = (texto: string) => {
    const r = lerBackup(texto)
    if (!r.ok) { setPendente(null); setMsg({ ok: false, texto: r.erro }); return }
    setMsg(null); setPendente({ dados: r.dados, resumo: r.resumo })
  }
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-muted">Os dados ficam neste navegador. Para levar a outro computador, exporte ou copie o backup e, no outro, importe ou cole.</p>
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primary" onClick={exportar}>Exportar backup</button>
        <button className="btn btn-secondary" onClick={copiarBackup}>Copiar backup</button>
        <label className="btn btn-secondary cursor-pointer">Importar arquivo<input ref={fileRef} type="file" accept=".json,application/json" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (f) ler(await f.text()); if (fileRef.current) fileRef.current.value = '' }} /></label>
      </div>
      <div>
        <textarea className="input w-full min-h-[90px] tnum" placeholder="Ou cole aqui o texto do backup" value={colado} onChange={(e) => setColado(e.target.value)} />
        <button className="btn btn-secondary btn-sm mt-2" disabled={!colado.trim()} onClick={() => { ler(colado); setColado('') }}>Colar backup</button>
      </div>
      {msg && <div className={clsx('rounded-[10px] px-3 py-2 text-[13px]', msg.ok ? 'chip-v' : 'bg-[var(--vermelho-soft)] text-[var(--vermelho)]')}>{msg.texto}</div>}
      {pendente && (
        <div className="rounded-[12px] border border-[var(--laranja)] px-4 py-3">
          <p className="text-[13.5px]">Substituir todos os dados atuais por este backup ({pendente.resumo})?</p>
          <div className="flex gap-2 mt-2">
            <button className="btn btn-primary btn-sm" onClick={() => { restaurarDados(pendente.dados); setPendente(null); setMsg({ ok: true, texto: `Backup restaurado: ${pendente.resumo}.` }) }}>Sim, substituir</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setPendente(null)}>Cancelar</button>
          </div>
        </div>
      )}
      <div className="border-t border-border pt-4">
        {confirmaReset ? (
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            Apagar tudo e voltar aos dados de exemplo?
            <button className="btn btn-sm !text-white" style={{ background: 'var(--vermelho)' }} onClick={() => { resetarDados(); setConfirmaReset(false); setMsg({ ok: true, texto: 'Dados de exemplo restaurados.' }) }}>Sim, voltar ao exemplo</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setConfirmaReset(false)}>Não</button>
          </div>
        ) : (
          <button className="btn btn-ghost btn-sm" onClick={() => setConfirmaReset(true)}>Voltar aos dados de exemplo</button>
        )}
      </div>
    </div>
  )
}
