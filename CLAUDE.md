# FLUXO CAIXA — contexto para continuar o projeto

Leia este arquivo inteiro antes de começar. Ele resume tudo o que foi feito numa sessão anterior,
para não precisar recomeçar do zero.

## Quem é o usuário e como falar com ele

- Fale **sempre em português do Brasil**, direto e simples. O usuário não é programador.
- Ele é arquiteto, credenciado da Caixa para avaliação/vistoria de imóveis (O.S. do SIOPI), e
  trabalha junto com um RT parceiro (Marco). Um dos pedidos principais foi **separar as O.S. dele
  das do RT**, que antes apareciam sempre misturadas.
- Ele tem outro projeto, o **FLUXO GESTOR ARQ**, que roda **localmente no PC dele**. Este projeto
  deve funcionar **exatamente do mesmo jeito**: pasta local "FLUXO CAIXA" **ao lado** da pasta do
  GESTOR ARQ (nunca dentro), aberta no app Claude para desktop. Não mexa na pasta do GESTOR ARQ.
- Quer ver o resultado no Chrome, em aba própria, fora do Claude: `http://localhost:5173`.

## O que é este projeto

Réplica melhorada do sistema dele, **fluxogestor.tech** (gestão de O.S. Caixa), feita sem tocar no
sistema real. Roda no navegador com dados fictícios salvos em `localStorage`. Design "Calmo" com
cores pastel, tema claro e escuro, funciona no celular.

## Rodar

- Windows: dois cliques em `INICIAR-FLUXO-CAIXA.bat` (instala na primeira vez e abre o navegador).
- Manual: `cd app && npm install && npm run iniciar` (Vite, porta 5173).
- `npm test` (Vitest, 49 testes devem passar) · `npx tsc --noEmit` · `npm run build:single`
  (gera um HTML único em `app/dist-single/index.html`, abre com dois cliques).
- Requer Node.js LTS. Se faltar, peça para o usuário instalar em https://nodejs.org/pt.

## Stack e estrutura

React 19 + Vite 6 + TypeScript 5.8 + Tailwind 4 + Zustand 5 (persist, chave `fluxogestor-lab-v2`
com `merge` para campos novos) + react-router-dom 7 (HashRouter) + date-fns 4 (ptBR) + @dnd-kit +
lucide-react + Vitest 3.

```
app/src/types.ts           tipos (OS, Status, Tipologia, Config com repasse, meta, contrato, empresa)
app/src/data/seed.ts       dados de exemplo e CONFIG_PADRAO
app/src/store/useStore.ts  estado e ações (criar/importar/remover O.S., status, rotas, fechamento, backup)
app/src/lib/               regras puras com testes em lib/__tests__
  os.ts            STATUS_META, farol de prazo, montarOS, cap()
  rota.ts          agrupar por bairro, ordenar por hora, preencher horários, conflitos
  faturamento.ts   resumos, repasse do RT, projeção, histórico
  siopi.ts         leitor do .txt do SIOPI
  fechamento.ts    texto do RRT, descrição da NF, conferência com extrato
  backup.ts        exportar/importar backup (versão 1)
app/src/components/        ui.tsx, Layout.tsx (menu, escopo Minhas/Marco/Todas, busca ⌘K), OsForm, ImportarOS
app/src/pages/             Painel, OsList, OsDetail, Rota, Agenda, Faturamento, Fechamento, Config
app/src/index.css          tokens de cor (claro/escuro) e classes card/chip/btn/input/seg/table/kpi-*/status-*/farol-*/tip-*
app/scripts/build-single.mjs  junta JS e CSS num HTML só
docs/01..04                análise e plano, design system, roteiro de captura, molde de replicação
```

Regra de ouro: **conta e regra ficam em `lib/` com teste; a tela só mostra.** O passo a passo para
replicar ou melhorar uma aba está em `docs/04-MOLDE-DE-REPLICACAO.md`.

## Domínio (regras já implementadas)

- Fluxo da O.S.: convocada → emitida → agendada → vistoriada → laudo enviado ⇄ diligência →
  finalizada → conferida (ou cancelada). Finalizar grava `concluidaEm`.
- Farol de prazo: verde/amarelo/vermelho; o vermelho só aparece para vencido ou urgente.
- Escopo sempre visível: **Minhas · Marco (RT) · Todas**.
- Rota: hora **manual** em cada parada, agrupar por bairro (respeita a primeira hora definida por
  cidade/bairro), ordenar por hora, preencher horários em cascata, aviso de sobreposição, exportar
  para Google Maps e WhatsApp.
- Faturamento, refeito a partir de 3 prints do sistema real: visões *Só minhas* (meu faturado + 40%
  do RT), *Minha equipe* e *Geral*. Categorias/tipologias A413, E004, C021, M112, R017; polos
  Ji-Paraná, Ariquemes e Cacoal; meta mensal; histórico de 6 meses; tabela com CSV.
- Repasse do RT configurável: padrão 40% sobre serviço + deslocamento (opção: só serviço).
- Fechamento mensal: confere o total do Relatório de Conferência, gera o texto do RRT Múltiplo
  Mensal por O.S. e o rascunho da descrição da NFS-e (não emite nada).
- Importar O.S. em lote a partir dos .txt do SIOPI, com pré-visualização e bloqueio de duplicadas.
- Backup: exportar/importar arquivo e copiar/colar texto.

## Regras de segurança (obrigatórias)

- **Nunca** digite a senha do usuário. O login no sistema real é sempre feito por ele.
- Nunca clique em ações que emitem ou finalizam algo no sistema real (NF, RRT, "Finalizar e Gerar
  Boleto") sem autorização explícita. Captura do sistema real é **só leitura**
  (`docs/03-COWORK-CAPTURA.md`) e dados pessoais de clientes são anonimizados.
- O repositório no GitHub é **público**: contrato, edital, processo, CNPJ, registro CAU e nomes reais
  **não vão para o código**. Ficam em Configurações (navegador + backup). O padrão no código é vazio.
- Não faça push nem reescreva histórico sem o usuário pedir.

## Pendências

1. Recomendado: o usuário tornar o repositório privado (o histórico antigo tem dados reais).
2. Confirmar com o usuário: o repasse de 40% incide sobre serviço + deslocamento ou só serviço?
   "A faturar" inclui O.S. vencidas?
3. Fidelidade ao sistema real: comparar cada aba com fluxogestor.tech (prints do usuário ou captura
   só leitura) e ajustar seguindo `docs/04`.
4. Depois: trocar `seed.ts` + `useStore.ts` por chamadas à API do FluxoGestor; geocodificar
   endereços para estimar deslocamento real.
5. Se a pasta estiver no Google Drive para computador, sugerir tirar `app/node_modules` da
   sincronização (é grande).

## Referências

- Código: https://github.com/luansantos95live-sudo/ORGANIZER, branch
  `claude/fluxogestor-dashboard-redesign-cxdnxz`
- Figma (design system e Faturamento): https://www.figma.com/design/PjnAVzeTQMhPY4ylCJQTxL
- Prints de todas as telas: `docs/screenshots/`
