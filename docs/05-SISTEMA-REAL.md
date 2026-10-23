# FluxoGestor real: o que existe em cada tela (captura de 09/10/2026)

Leitura feita no navegador do usuário, já logado, **só olhando** (menus, abas, filtros e detalhes).
Nenhum dado foi alterado. Nomes, documentos, telefones e endereços de clientes foram omitidos.
Este é o ponto de partida da réplica: primeiro igual, depois melhorado.

## Estrutura geral

- Menu lateral recolhido (só ícones): **Início, Ordens de Serviço, Rotas, Financeiro, Fichas de
  Pesquisa, Configurações** e, embaixo, "Expandir menu".
- Barra de cima: título e subtítulo da tela, alternar tema, notificações ("Notificações · Marcar
  todas como lidas · Nenhuma notificação por enquanto") e menu do usuário (nome, e-mail, Meu perfil,
  Configurações, Rever tour rápido, Sair).
- Escopo por tela: **Só minhas · Minha equipe** (na equipe aparece o técnico RT).
- Etapas da O.S.: **Recebida → Em Andamento → Assinatura Pendente → Assinatura Concluída →
  Concluída** (ou Cancelada). Existe **pausa** ("Solicitar Pausa"), que guarda "Pausado em" e
  "Dias pausado" e empurra o **prazo efetivo**.
- Tipologias (código da Caixa): E004 Acompanhamento de obra + Alteração de projeto · E401
  Acompanhamento de Obra de Imóvel Urbano · E005 Acompanhamento de obras + Reprogramação · G012
  Alteração de Projeto · B438 Análise de Proposta/Projeto de Construção do Imóvel · B437 Avaliação
  de Construção em Terreno Próprio · A413 Avaliação do Imóvel como um Todo (sem subsídio CAIXA) ·
  G416 Nova Vistoria para Verificação/Correção de Pendências · G014 Reanálise ou Análises
  Complementares (antes da contratação) · G402 Reedição de Laudo de Avaliação (sem vistoria).
- Polos: ARIQUEMES, CACOAL, JI-PARANA.
- Período (filtros): Todos os períodos · Semana · Mês · Ano · Período específico, com setas.

## Início — "O que a sua operação precisa agora"

- "Boa tarde, Luan" + "N tarefas precisam de você", busca "Buscar cliente ou nº da OS", **+ Nova OS**.
- Faixa da semana (SEG…DOM, hoje em destaque): cada dia mostra "livre" ou "N vence";
  último bloco "PRÓXIMA SEMANA · N OS vencem · Ver calendário" (abre Ordens de Serviço em Kanban).
- "O que fazer agora" (Só minhas · Minha equipe), um cartão por tarefa com contador:
  - **Assinar laudos** — laudos prontos esperando a assinatura do RT → "Assinar agora".
  - **Agendar vistorias** — OS recebidas sem dia marcado; "Próxima vence em N dias"; mostra a
    primeira (cliente · cidade) → "Agendar".
  - **Terminar laudo** — vistoria feita, falta montar e enviar o laudo → "Abrir OS".
  - **Emitir notas** — serviços concluídos que ainda não viraram nota fiscal; "N parados +5 dias";
    "R$ X a faturar" → "Ir ao Financeiro".
- Coluna direita: **Agenda de hoje** (N vistorias), **Sugestão** (na equipe: "Faça as 3 vistorias
  de CACOAL na mesma viagem… ainda não têm data marcada · Montar rota para 10/10 · Agora não") e
  **Chegaram da CAIXA** (importadas sozinhas do e-mail; código, cliente, endereço, data) → "Ver todas".

## Ordens de Serviço — "Acompanhe e gerencie suas ordens de serviço"

- **Lista · Kanban**, **+ Nova OS**.
- Filtros: Buscar (OS, cliente, técnico), Status (várias), Tipologia (várias, "Marcar todos ·
  Limpar"), Polo (vários), Período, "Incluir pendências anteriores", botão "Concluídas",
  Só minhas · Minha equipe. Linha "FILTROS ATIVOS" com chips e "Limpar tudo".
- Lista: OS (OS-12) · Nº (referência) · Tipologia · Status (troca na própria linha) · Rua · Nº ·
  Bairro · Cidade · UF · CEP · Polo · Local · Valor OS · Desloc. · Total · Prazo · RT · Ações
  (Ver detalhes, Editar, Excluir OS). "Colunas" escolhe as visíveis (e "Restaurar padrão").
  Rodapé "N registros · Página 1 de 1 · Anterior · Próxima".
- Kanban: Recebidas · Em Andamento · Assinatura Pendente · Assinatura Concluída · Concluídas ·
  Canceladas. Cartão: tipologia, OS-N, referência, cliente, POLO, cidade — rua, nº, "Prazo · N dias
  restantes", Recebida, Vence, menu "…".
- **Detalhe** (janela): OS-N, cliente, selo "No prazo", tipologia; botões Concluir, Solicitar Pausa,
  Editar, Excluir; abas:
  - Geral: OS, Nº, Tipologia, Código, Polo, Mês referência, Origem, Referência (empresa e CNPJ),
    Técnico, Propriedade, Observação, Descrição.
  - Cliente: Nome, Documento, Telefone, E-mail.
  - Contato: Nome, Telefone (WhatsApp), WhatsApp, E-mail.
  - Endereço: Logradouro, Número, Bairro, Cidade, Estado, CEP.
  - Datas: Data recebimento, Prazo, Prazo efetivo, Data entrega, Data vistoria, Hora vistoria,
    Data conclusão, Pausado em, Dias pausado.
  - Valores: Valor, Deslocamento, Total.
  - Importação: Cód. produto, Cód. linha, Cód. fonte, Nº registro, Cartório, Livro, Local retirada,
    Solicitante, Executante.
- **Nova OS**: "Criar manualmente" (mesmas abas; Geral tem Tipologia, Nº Referência, Nº
  Identificador, Mês Referência, Propriedade, Descrição, Observação; Endereço tem Latitude e
  Longitude; botões Cancelar · Criar OS) ou "Importar OS" (Arquivo: arrastar .txt da CAIXA ou colar
  o texto; E-mail: "Conectar Gmail").

## Rotas — "Planeje rotas a partir das OS georreferenciadas"

- Abas **Roteirizador · Rotas**.
- Roteirizador: aviso "N OS sem localização não entram na roteirização"; "OS disponíveis (N)";
  "Mapa das OS sem vistoria" com legenda Base · Disponível · Selecionada; ferramentas Laço +,
  Laço −, Limpar, "N selecionadas", Trocar base.
- Rotas: filtros Status (Rascunho, Confirmada, Concluída, Cancelada) e Período; "Criar nova rota";
  "Como funciona" (entram OS não concluídas e fora de outra rota ativa; OS sem coordenadas podem
  entrar e recebem a localização no detalhe). Indicadores: OS elegíveis para rota, Rotas ativas
  hoje, Rotas concluídas (mês). Lista agrupada por técnico: ROTA-XXXX, status, técnico, paradas.
- Detalhe da rota: Status, Distância estimada, Início, OS na rota, Velocidade média (30 km/h),
  Partida, Descrição, "Ordem de Visitação — arraste para reordenar" (OS, cliente, Definir
  localização, Pendente); botões Avançar para Confirmada, Excluir, Fechar.

## Financeiro — "OS concluídas e valores do mês de fechamento"

- Filtros: Buscar, Tipologia, Polo, Período, Só minhas · Minha equipe, Situação (**A faturar ·
  Faturadas · Todas**).
- Cartões: Total previsto (OS não concluídas/canceladas) · Total Finalizado (OS concluídas no mês)
  · Valores Finalizados (Empresa) · Valores Faturados (OS marcadas como faturadas). O "i" de cada
  um mostra Valor de OS e Deslocamento.
- Tabela: OS · Cliente · Categoria · Técnico · Telefone (clique copia) · Endereço · Conclusão ·
  Valor · Texto pronto (copiar) · Faturada (**Marcar**). "A faturar" = concluída e ainda sem nota.

## Fichas de Pesquisa — "Controle as fichas de pesquisa por ordem de serviço"

- Filtros: Buscar, Tipologia, Polo, Período, Situação (Todas · Pendentes · Fornecidas).
- "N de M fichas fornecidas"; lista OS-N · cliente · tipologia · polo · "Marcar ficha como fornecida".

## Configurações — "Empresa, perfil, usuários e preferências"

- Seções: Empresa (logo, nome fantasia, razão social, CNPJ, telefone, responsável, nº do contrato,
  fuso), Meu Perfil (e-mail, nome, sobrenome, nome de exibição, telefone, CPF, profissão, registro
  CREA/CAU, fuso, mensagem de WhatsApp das rotas, endereço base das rotas com latitude e longitude,
  polos atendidos, alterar senha), Configurações Gerais (modo escuro), Assinatura e Cobrança, Equipe
  (N/3 usuários, membro, papel Proprietário/Membro, Ativo), Gmail (conectar), Fluxo Agent
  (dispositivos e código de pareamento). Botão "Salvar alterações".

## Conferência de 20/10/2026 (o que mudou)

- Mesmos 6 módulos e endereços: /dashboard, /dashboard/os, /dashboard/rotas, /dashboard/faturamento,
  /dashboard/fichas, /dashboard/configuracoes (com ?tab=… por seção).
- Kanban: o cartão mostra um selo de prazo (Vencida, Urgente, Atenção) e o menu "…" tem só Editar OS e
  Excluir OS. Detalhe da OS sem mudanças.
- **Financeiro mudou os cartões**: Faturamento previsto (todas as OS recebidas: finalizadas + em aberto) ·
  Total finalizado (OS concluídas no mês) · Finalizado da empresa (seu 100% + 40% dos seus RTs) ·
  Faturamento total (finalizado bruto de toda a empresa). Ganhou o botão "Colunas" na tabela.
- Configurações, mais detalhes: Empresa mostra Plano, Limite de usuários e Status (com cadeado, geridos
  pela assinatura). Meu Perfil tem "E-mail pendente · Reenviar confirmação", avatar, mensagem de WhatsApp
  das rotas com variáveis {cliente} {hora} {endereco} {os}, endereço base com latitude/longitude e
  "Polos atendidos (delegação de OS)": OS importadas desses polos vão sozinhas para o usuário; cada polo
  só pode ter um usuário. Assinatura e Cobrança: plano atual, status da empresa, acesso operacional,
  Alterar plano, Cancelar assinatura. Equipe: N/3 usuários, Novo membro, papel e situação. Gmail:
  "Conectar com Google" para avisar clientes. Fluxo Agent: sincroniza pastas locais; Baixar para Windows
  e Gerar código de pareamento.
