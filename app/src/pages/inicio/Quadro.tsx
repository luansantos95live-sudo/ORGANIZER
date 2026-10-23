import { ACAO_META, type Acao } from '../../lib/inicio'
import { CartaoOS, TituloAcao, useDadosInicio } from './comum'

/** Ideia 1 — Quadro de trabalho: uma coluna por próximo passo, todas as O.S. à vista, cada uma com o botão do passo. */
export function IdeiaQuadro() {
  const { porAcao, aberto, finalizar } = useDadosInicio()

  const coluna = (a: Acao) => (
    <section key={a} className="card flex flex-col flex-1 min-w-[220px] max-h-[calc(100vh-215px)]">
      <header className="px-3 pt-2.5 pb-2 border-b border-border">
        <TituloAcao acao={a} qtd={porAcao[a].length} />
        <p className="text-[11.5px] text-muted mt-1 leading-snug">{ACAO_META[a].descricao}</p>
      </header>
      <div className="flex flex-col gap-1.5 p-2 overflow-y-auto">
        {porAcao[a].length === 0
          ? <p className="text-[12px] text-muted text-center py-5">Nada aqui</p>
          : porAcao[a].map((i) => <CartaoOS key={i.os.id} item={i} />)}
      </div>
    </section>
  )

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      <div className="flex flex-col gap-2 flex-[2] min-w-[460px]">
        <Grupo titulo="Em aberto" sub="antes da vistoria" qtd={aberto.length} cor="var(--laranja)" />
        <div className="flex gap-2.5">{(['agendar', 'vistoriar'] as Acao[]).map(coluna)}</div>
      </div>
      <div className="flex flex-col gap-2 flex-[4] min-w-[920px]">
        <Grupo titulo="A finalizar" sub="depois da vistoria" qtd={finalizar.length} cor="var(--brand)" />
        <div className="flex gap-2.5">{(['laudo', 'assinar', 'enviar', 'responder'] as Acao[]).map(coluna)}</div>
      </div>
    </div>
  )
}

function Grupo({ titulo, sub, qtd, cor }: { titulo: string; sub: string; qtd: number; cor: string }) {
  return (
    <div className="flex items-baseline gap-2 px-1 pb-1.5 border-b-2" style={{ borderColor: cor }}>
      <h2 className="card-tit !text-[12px] !text-[var(--text)]">{titulo}</h2>
      <span className="tnum font-bold text-[15px]">{qtd}</span>
      <span className="text-[12px] text-muted">{sub}</span>
    </div>
  )
}
