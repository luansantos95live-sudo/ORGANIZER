# FluxoGestor — Análise, diagnóstico e plano de ação

> Versão 1.0 · 25/09/2026 · Base: `fluxogestor.tech/dashboard/os`
>
> **Aviso de método.** O host `fluxogestor.tech` está bloqueado pela política de rede do ambiente
> onde este estudo foi feito. A análise abaixo reconstrói o funcionamento do sistema a partir de
> (a) todo o fluxo operacional documentado nas suas skills (O.S. Caixa, SIOPI, RAE, RRT Múltiplo
> Mensal, pastas "Luan" e "Marco Aurélio RT"), (b) benchmarks de concorrentes (SIAUPRO) e
> ferramentas de rota (OptimoRoute, Circuit/Spoke, Onfleet, Routific) e (c) padrões atuais de UI
> (Attio, Linear, Stripe). Assim que o acesso for liberado, a seção 2 será conferida tela a tela.

---

## 1. Contexto de negócio

| Item | Valor |
|---|---|
| Quem usa | Arquiteto credenciado Caixa (Luan, CAU A277949-8, LFX Arquitetura) + 1 RT parceiro (Marco Aurélio) |
| Objeto | Ordens de Serviço (O.S.) de **avaliação** e **vistoria** emitidas pela Caixa via SIOPI |
| Volume | 30–40 O.S./mês, distribuídas em cidades e bairros de Rondônia |
| Ciclo | Convocação → aceite (24h) → vistoria em campo → laudo/RAE → envio no SIOPI → conferência mensal → RRT Múltiplo Mensal no CAU → pagamento |
| Dor central | Duas carteiras (minha e do RT) misturadas na mesma lista; rota do dia difícil de montar e sem controle de horário |

### 1.1 Ciclo de vida de uma O.S. (reconstruído)

```
CONVOCADA ──aceite/24h──▶ EMITIDA ──agendar──▶ AGENDADA ──campo──▶ VISTORIADA
                │                                                     │
                └──recusa──▶ CANCELADA                    elaborar laudo/RAE
                                                                      ▼
                                              DEVOLVIDA ◀──exigência── LAUDO ENVIADO ──▶ FINALIZADA ──▶ CONFERIDA (extrato) ──▶ RRT ──▶ PAGA
```

Estados internos que o SIOPI **não** dá, mas que o dia a dia exige e que o sistema precisa
modelar: `agendada` (tem dia/hora de vistoria), `em elaboração` (vistoriada, laudo não enviado),
`em diligência` (Caixa pediu correção), `conferida` (apareceu no Relatório de Conferência) e
`RRT lançada`.

### 1.2 Dados que cada O.S. carrega (fonte: `.txt` do SIOPI + extrato)

`Referência` (7886.1831.000XXXXX/AAAA.MM.DD.01.01), tipo de serviço (Avaliação, Vistoria/RAE,
PCI, PLS…), proponente/contato + telefone, endereço completo (logradouro, número ou SN, **bairro**,
cidade, UF, CEP), matrícula/cartório, valor do serviço, valor do deslocamento, datas (emissão,
prazo, vistoria, envio), responsável técnico (Luan ou RT), pasta de documentos (Documentos SIOPI,
Fotos, Laudo).

---

## 2. Diagnóstico do sistema atual

Classificação: 🔴 problema estrutural · 🟠 atrito diário · 🟡 oportunidade

| # | Achado | Impacto | Classe |
|---|---|---|---|
| D1 | Lista de O.S. mostra sempre **as minhas e as do RT** juntas, sem escopo padrão | Confusão de responsabilidade, risco de vistoriar/enviar O.S. errada, poluição visual | 🔴 |
| D2 | Módulo de rota é genérico (otimização "caixa-preta"), sem hora manual por parada | O usuário sabe a melhor sequência local; o sistema atrapalha em vez de ajudar | 🔴 |
| D3 | Não ordena/agrupa por **bairro** | Em cidades do interior o bairro é a unidade real de deslocamento | 🔴 |
| D4 | UI genérica (template admin padrão), cores saturadas, densidade uniforme | Tudo grita igual; prazo urgente não se destaca de O.S. tranquila | 🟠 |
| D5 | Status são os do SIOPI; faltam estados internos (agendada, em elaboração, conferida) | O usuário controla o resto de cabeça ou em planilha | 🟠 |
| D6 | Fechamento mensal (extrato → RRT) acontece fora do sistema | Retrabalho e risco de duplicar Endereço no RRT (já ocorreu) | 🟠 |
| D7 | Sem visão "o que fazer hoje" | Painel mostra totais, não prioridades | 🟠 |
| D8 | Sem checklist documental por O.S. | Documento faltando só é descoberto na hora do laudo | 🟡 |
| D9 | Sem exportação da rota para Google Maps/WhatsApp | Rota vive só na tela | 🟡 |
| D10 | Mobile não é first-class | Vistoria é em campo, no celular | 🟡 |

---

## 3. Benchmarks e padrões adotados

### 3.1 Concorrente direto — SIAUPRO
Painel com contadores "a vistoriar, vistoriadas, aguardando interação, urgentes, em diligência,
a vencer, vencidas" e app de campo para o colaborador. **Adotamos** a taxonomia de estados e o
resumo por urgência; **descartamos** a densidade de ERP.

### 3.2 Ferramentas de rota
- **OptimoRoute**: timeline arrastar-e-soltar com horário por parada e "best fit". → Adotamos a
  **timeline do dia** com hora editável e reordenação por arrastar.
- **Circuit/Spoke**: UI de consumidor, um botão "otimizar", lista simples. → Adotamos a
  simplicidade e o botão único; a "otimização" aqui é **agrupar por bairro** e ordenar pela
  hora definida, nada mais.
- **Onfleet**: zonas de entrega e janelas de tempo. → O **bairro** vira a zona; a hora manual
  vira a janela.

### 3.3 UI
- **Attio**: base monocromática com pastéis por seção como acento. → Paleta pastel semântica
  por status, superfícies neutras quentes.
- **Linear**: densidade controlada, atalhos, tudo a um clique. → Barra de comando `⌘K`,
  filtros persistentes.
- **Stripe**: tabelas de dados legíveis. → Tabela de O.S. com colunas fixas, chips de status,
  prazo em cor.

---

## 4. Princípios de produto para a nova versão

1. **Escopo antes de tudo.** O sistema abre sempre em *Minhas O.S.* Trocar para *RT* ou
   *Todas* é um gesto explícito, visível no cabeçalho e persistido.
2. **Prazo é cor, não texto.** Cada O.S. tem um "farol" calculado (dias até o prazo) que
   pinta chip, linha e card. Nenhum outro elemento usa vermelho/laranja.
3. **A rota é do usuário.** O sistema sugere (agrupa por bairro), o usuário decide (hora manual
   e ordem por arrastar). Nunca reordena sozinho depois que o usuário mexeu.
4. **Um lugar por tarefa.** Painel = hoje; O.S. = carteira; Rota = campo; Agenda = semana;
   Fechamento = mês.
5. **Calmo por padrão, intenso por exceção.** Pastéis dessaturados; contraste sobe só no que
   pede ação.

---

## 5. Especificação funcional da nova versão

### 5.1 Módulo O.S.
- Seletor de escopo **Minhas · RT · Todas** (segmentado, no topo, persistido).
- Filtros: status, cidade, bairro, tipo de serviço, período, texto livre (referência, nome,
  endereço).
- Visões: tabela (padrão) e cartões (kanban por status).
- Linha/cartão: farol de prazo, referência curta, tipo, proponente, bairro · cidade, prazo em
  "faltam N dias", responsável (avatar), ações rápidas (agendar, marcar vistoriada, abrir pasta).
- Detalhe: cabeçalho com status e prazo, abas *Resumo · Documentos · Fotos · Laudo · Histórico*,
  checklist documental (11 documentos da skill de análise), contato com botões WhatsApp/ligar,
  endereço com botão Maps, campo de observações, linha do tempo de eventos.
- Ações: aceitar/recusar convocação, agendar (data + hora + duração), marcar vistoriada,
  marcar laudo enviado, registrar diligência, marcar conferida, transferir para RT/para mim.

### 5.2 Módulo Rota (simplificado)
- Escolhe **data** e **responsável**; lista lateral com todas as O.S. elegíveis (emitidas ou
  agendadas para o dia, no escopo).
- Botão *Adicionar* joga a O.S. na timeline do dia; botão *Agrupar por bairro* ordena as
  paradas por bairro (mantendo a ordem interna); botão *Ordenar por hora* respeita as horas
  definidas manualmente.
- Cada parada: hora de início editável, duração editável (padrão por tipo de serviço),
  deslocamento estimado até a próxima (padrão configurável por par de bairros ou valor fixo),
  alça para arrastar.
- Conflitos de horário (sobreposição) destacados em âmbar; total do dia no rodapé.
- Exportar: link Google Maps com todas as paradas na ordem; texto para WhatsApp com
  hora + endereço + contato; imprimir.
- Ao salvar, cada O.S. recebe status *agendada* com dia/hora.

### 5.3 Painel (hoje)
- Cabeçalho com escopo e data.
- Cartões: *Vence hoje*, *Vence em 3 dias*, *A vistoriar*, *Laudo pendente*, *Em diligência*.
- Bloco *Rota de hoje* (paradas com hora) e *Próximas convocações* (aceite em 24h).
- Gráfico leve: O.S. por status no mês (barras horizontais pastel).

### 5.4 Agenda
- Semana com colunas por dia; blocos de vistoria coloridos pelo responsável; clique abre a O.S.

### 5.5 Fechamento mensal
- Tabela de O.S. finalizadas no mês com serviço + deslocamento + total, soma geral, marcação
  *conferida no extrato* e *lançada no RRT*; exportação CSV no formato do tracker da skill de RRT.

### 5.6 Configurações
- Responsáveis (nome, CAU/CREA, cor), cidades e bairros conhecidos, durações padrão por tipo,
  deslocamento padrão entre bairros, tema claro/escuro.

---

## 6. Plano de execução

| Etapa | Entrega | Status |
|---|---|---|
| E0 | Este documento + design system | ✔ |
| E1 | Wireframes navegáveis das 6 telas (artifact) | ✔ |
| E2 | App React + Vite + Tailwind com dados fictícios e persistência local | ✔ |
| E3 | Módulo O.S. com escopo e detalhe | ✔ |
| E4 | Módulo Rota com hora manual, bairro e arrastar | ✔ |
| E5 | Painel, Agenda, Fechamento, Configurações | ✔ |
| E6 | Build, screenshots, README | ✔ |
| E7 | Conferir com o sistema real (depende de liberar `fluxogestor.tech`) | pendente |
| E8 | Integração com backend real (API do FluxoGestor) | próximo passo |

## 7. Como este clone se relaciona com o sistema real

O clone é um **laboratório de produto**: toda a lógica de estado, filtros, rota e fechamento roda
no navegador com dados fictícios salvos em `localStorage`. Isso permite testar fluxo e UI sem
tocar no backend. A camada de dados fica isolada em `src/data/` e `src/store/`, de modo que a
troca por chamadas HTTP ao FluxoGestor real seja uma substituição de um único módulo.
