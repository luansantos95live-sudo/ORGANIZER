# FluxoGestor Lab — redesign do painel de O.S.

Laboratório de produto para testar uma nova versão do FluxoGestor (gestão de Ordens de Serviço
Caixa para credenciados) **sem tocar no sistema real**. Tudo roda no navegador com dados
fictícios salvos em `localStorage`.

## O que tem aqui

| Pasta | Conteúdo |
|---|---|
| `docs/01-ANALISE-E-PLANO.md` | Diagnóstico do sistema atual, benchmarks, princípios e especificação da nova versão |
| `docs/02-DESIGN-SYSTEM.md` | Paleta pastel, tipografia, componentes e regras de cor por status/prazo |
| `docs/03-COWORK-CAPTURA.md` | Roteiro para capturar o sistema original sem alterar dados |
| `docs/04-MOLDE-DE-REPLICACAO.md` | Como replicar cada aba do sistema original usando este molde |
| `docs/screenshots/` | Capturas de todas as telas (claro, escuro e celular) |
| `app/` | O clone: React 19 + Vite + TypeScript + Tailwind 4 + Zustand |

## Rodar no seu computador

**Windows:** dê dois cliques em `INICIAR-FLUXO-CAIXA.bat`. Na primeira vez ele instala o sistema
(precisa do [Node.js LTS](https://nodejs.org)); depois abre sozinho em `http://localhost:5173`.
Deixe a janela preta aberta enquanto usa. Para parar, feche a janela.

**macOS ou Linux:** rode `./iniciar.sh` na pasta do projeto.

## Rodar localmente (desenvolvimento)

```bash
cd app
npm install
npm run dev        # abre em http://localhost:5173
```

Para gerar a versão estática (pasta `app/dist`, pode ser aberta em qualquer servidor simples):

```bash
npm run build
npm run preview
```

## Testar sem instalar nada

Gere a versão de arquivo único e abra o `.html` em qualquer navegador, ou publique-o como página:

```bash
cd app
npm install
npm run build:single      # cria app/dist-single/fluxogestor-lab.html
npm test                  # testes automáticos das regras (leitor do SIOPI, rota, faturamento, fechamento, backup)
```

Os dados ficam no navegador de quem abre. Para levar os dados a outro computador use
Configurações → Copiar backup e, no outro, Colar backup (ou Exportar e Importar o arquivo).

### Endereço na internet (GitHub Pages)

O fluxo `.github/workflows/site-de-teste.yml` publica o sistema na branch `gh-pages` a cada envio.
Ative uma vez em **Settings → Pages**: Source "Deploy from a branch", branch `gh-pages`, pasta `/ (root)`.
O endereço fica `https://<usuário>.github.io/<repositório>/`. O site é público e traz só dados de exemplo.

## Telas

- **Painel** — prioridades dos próximos 3 dias, farol de prazo, rota de hoje, carteira por etapa.
- **Ordens de serviço** — seletor de escopo *Minhas · Marco · Todas* sempre visível, filtros por
  status, prazo, cidade, bairro e tipo, visão tabela ou quadro, busca `⌘K`.
- **Detalhe da O.S.** — ações do fluxo (aceitar, agendar, vistoriada, laudo enviado, diligência,
  finalizar, conferir), checklist dos 11 documentos SIOPI, WhatsApp / ligar / Maps, histórico.
- **Rota do dia** — escolha as O.S. disponíveis (agrupadas por cidade e bairro), defina a hora
  de cada parada manualmente, arraste para reordenar, *Agrupar por bairro*, *Ordenar por hora*,
  *Preencher horários* em cascata, detecção de sobreposição, exportar para Google Maps e
  WhatsApp, *Salvar nas O.S.*
- **Agenda** — semana com blocos por responsável.
- **Faturamento** — refeita a partir dos três modelos do FluxoGestor: *Só minhas* (meu faturado + 40% do RT), *Equipe* (RT e repasse) e *Geral*. Filtros por tipologia, polo, período e carteira, barras de composição (cor = de quem é o valor, claro = a faturar), histórico de 6 meses, tabela com linha expansível, colunas à escolha, paginação e CSV. O percentual de repasse é configurável.
- **Fechamento mensal** — conferência contra o extrato, marcação de RRT e exportação do CSV no
  formato do tracker do RRT Múltiplo Mensal.
- **Nova O.S. e Importar .txt** — cadastro com validação, importação em lote dos arquivos do SIOPI
  com pré-visualização editável e bloqueio de referência repetida.
- **Fechamento mensal** — também compara o total do Relatório de Conferência com o do sistema,
  gera o texto do RRT por O.S. e o rascunho da descrição da nota fiscal (nada é emitido).
- **Configurações** — responsáveis, repasse do RT e sua base, meta mensal, prazo padrão, contrato
  com a Caixa e dados da empresa (ficam só no navegador, não no código), backup.

## Figma

Arquivo com o design system (36 variáveis de cor) e as três visões do Faturamento: https://www.figma.com/design/PjnAVzeTQMhPY4ylCJQTxL

## Próximos passos

1. Liberar `fluxogestor.tech` no ambiente (ou enviar prints) para conferir o clone contra o real.
2. Trocar `app/src/data/seed.ts` + `app/src/store/useStore.ts` por chamadas à API do FluxoGestor.
3. Geocodificar endereços para estimar deslocamento real entre paradas.
