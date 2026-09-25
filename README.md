# FluxoGestor Lab — redesign do painel de O.S.

Laboratório de produto para testar uma nova versão do FluxoGestor (gestão de Ordens de Serviço
Caixa para credenciados) **sem tocar no sistema real**. Tudo roda no navegador com dados
fictícios salvos em `localStorage`.

## O que tem aqui

| Pasta | Conteúdo |
|---|---|
| `docs/01-ANALISE-E-PLANO.md` | Diagnóstico do sistema atual, benchmarks, princípios e especificação da nova versão |
| `docs/02-DESIGN-SYSTEM.md` | Paleta pastel, tipografia, componentes e regras de cor por status/prazo |
| `docs/screenshots/` | Capturas de todas as telas (claro, escuro e celular) |
| `app/` | O clone: React 19 + Vite + TypeScript + Tailwind 4 + Zustand |

## Rodar localmente

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
- **Fechamento mensal** — conferência contra o extrato, marcação de RRT e exportação do CSV no
  formato do tracker do RRT Múltiplo Mensal.
- **Configurações** — responsáveis, durações padrão, deslocamentos, tema.

## Próximos passos

1. Liberar `fluxogestor.tech` no ambiente (ou enviar prints) para conferir o clone contra o real.
2. Trocar `app/src/data/seed.ts` + `app/src/store/useStore.ts` por chamadas à API do FluxoGestor.
3. Geocodificar endereços para estimar deslocamento real entre paradas.
