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
- **REGRA DE OURO DO USUÁRIO: NUNCA mudar uma tela que ele já aprovou sem ele pedir.** Se um pedido novo afetar uma tela aprovada, mude só o que foi pedido e pergunte antes de mexer no resto (ele reclamou várias vezes, em 22–23/10, de telas aprovadas que mudaram: a tela da PEPT com Finalizar e Reabrir lado a lado, os cartões etc.). Ao implementar algo novo, acrescente sem tirar o que já existe.

## O que é este projeto

Réplica melhorada do sistema dele, **fluxogestor.tech** (gestão de O.S. Caixa), feita sem tocar no
sistema real. Roda no navegador com dados fictícios salvos em `localStorage`. Funciona no celular.

## Design (decidido com o usuário em 09/10/2026)

- **Segue o padrão visual do FLUXO ARQ** (LFX Gestão 2.35+): menu lateral escuro com grupos e botão
  "Recolher menu" (padrão: recolhido, só ícones), barra de cima verde-escura com a logo repetida bem
  apagada, abas/seletores na caixa escura com a aba ativa em verde translúcido e barrinha verde,
  títulos de cartão pequenos em CAIXA ALTA cinza, fonte Jost, verde `#3AB81E`. Tema padrão: **escuro**.
- **Sem degradês nos cartões.** Cartão liso (`card`), cor só no número e no ícone, por significado:
  verde = finalizado, roxo = RT, laranja = a faturar, azul = deslocamento, vermelho só vencido.
- **Logo**: "F" de faixa dobrada em verde-água. Vetor em `app/src/components/Logo.tsx`; o ícone do
  atalho sai de `ferramentas/gerar-icone.py` (`fluxo.ico`, `fluxo-256.png`).
- **Financeiro**: o usuário prefere a arrumação de cartões antiga (frase-resumo, meta do mês, 5 KPIs
  compactos, barra única de composição com legenda + 3 cartões, resumo em lista, histórico de 6 meses,
  tabela). A tabela segue as telas que ele desenhou (O.S. completa, Categoria, Origem "Meu" ou
  "Participação RT", Responsável, Conclusão, Valor da O.S., Deslocamento, Total, Status, Ações).
- **Compacto e na largura toda** (pedido em 13/10/2026): o conteúdo ocupa a tela inteira (sem limite de
  1480 px), margens e espaços entre cartões pequenos (gap-2.5/3, mb-3), títulos de página em 22 px.
  Não voltar a espaçar. Início: a faixa da semana mostra o dia **por extenso** ("Segunda"…) e o número
  grande é a **quantidade de O.S. que vencem** naquele dia (vermelho se o dia já passou).
- Avatares com **uma letra** (L, M); o dono da conta tem uma **coroinha** dourada (`Avatar` em ui.tsx).
- **Técnico da O.S. não muda** (22/10): a O.S. vem vinculada ao RT do polo. Saiu o botão de transferir (aba Geral) e a ação `transferir`; no Editar o técnico é só leitura (escolhe-se apenas ao criar a O.S. à mão).
- **Ícone da conta só no canto superior direito** (22/10): o atalho de perfil do pé do menu lateral saiu; o menu do canto (`MenuUsuario`) tem Meu perfil e Configurações.
- **Ordens de Serviço (20/10/2026), no conceito do Início:** cabeçalho (22/10): título no alto; na linha de baixo **Lista/Kanban à esquerda** (`.seg-baixo`, 36 px) e, na mesma linha à direita, Fase, Tipologia, Polo, período, Colunas e Nova O.S.; filtros (período com menu próprio `MenuPeriodo`, sem a lista nativa) e Nova O.S. (abre no **Kanban** por padrão; Lista = `?visao=lista`; abas de fase só na Lista); sem busca própria (só a "Buscar O.S." da barra de cima); "Pendências anteriores" saiu (sempre ligado) e o botão Nova O.S. fica no fim da linha de filtros;
  **filtro "Fase"** num menu logo depois de Lista/Kanban (Todas as fases · Em aberto · Em andamento · Em PEPT · Finalizadas, com contagem; `MenuFase`, `faseDe` em lib/passos.ts; vale na Lista e no Kanban; antes eram abas, trocado a pedido em 22/10; **escolher uma fase muda a visão para Lista**, pedido de 23/10) no lugar
  do filtro de Status; Tipologia, Polo, período e Pendências anteriores. **Lista compacta com as colunas do sistema
  real** (OS, Nº, Tipologia, Status, Passo atual, Rua, Nº, Bairro, Cidade, UF, CEP, Polo, Local, Valor OS, Desloc.,
  Total, Prazo, RT) + Colunas para escolher, faixinha da cor da fase, botão Feito e menu.
  Coluna Nº oculta por padrão (liga em Colunas). **Kanban: informações do sistema real no visual novo** (20/10, colunas arredondadas e cartões brancos): colunas por etapa
  (Recebidas, Em Andamento, Assinatura Pendente, Assinatura Concluída, Concluídas, Canceladas) com ícone, contador e
  faixa colorida; cartão com tipologia, OS, selo (Vencida/Urgente/Atenção/No prazo/PEPT), referência, cliente, POLO,
  endereço e Prazo/Recebida/Vence; arrastar troca a etapa. **Cor pelo prazo** (lista e Kanban, `corPrazo`):
  amarela com 3 dias ou menos, vermelha com 1 dia ou menos até concluir (inclusive vencida), cinza em PEPT, verde quando finalizada. O.S. em PEPT sempre aparecem (ignoram o período). **Todas** mostra todas as O.S. do período (recebidas, em andamento, PEPT, finalizadas e canceladas). Cartão do Kanban na organização do real (tipologia | OS, selo, referência, cliente, POLO, endereço, caixinhas Prazo/Recebida/Vence e, embaixo, o próximo passo com "N de M" e barrinha de quanto falta para ficar pronta) no visual novo, faixa lateral da cor do prazo. Passo a passo: clicar no **visto** de um passo feito abre uma caixinha "Desmarcar …?" (`voltarParaPasso`): ele e os seguintes voltam a pendente e a etapa volta junto. Cores dos cartões do Kanban: ver "Cartão do Kanban (22/10/2026)" abaixo; O.S. finalizada = cartão verde inteiro, o verde do botão "Nova O.S." (`.card-finalizada`, nos dois temas); cartão inteiro amarelo (≤3 dias), vermelho (≤1 dia e vencida) e cinza (PEPT) como na lista, e o selo segue a mesma regra (`corPrazo`); coluna com mais cartões abaixo fica com o fim reto (só arredonda quando a rolagem chega ao último cartão); ao passar o mouse, cartão do Kanban sobe 2 px e linha da lista sobe 1 px com sombra leve (`.card-kanban:hover`, `.linha-os`); datas dd/mm e prazo curto ("7 dias", "Vencida 2d") para caber. Barra de cima: só "Buscar O.S." (sem Ctrl K).
- **Cartão do Kanban (22/10/2026):** compacto, mais largo que alto, sem espaços sobrando. Linhas: **OS | tipologia** (invertido a pedido em 22/10) · selo ·
  **botão "Concluir"** (`.concluir-kanban`, no lugar dos três pontinhos): **só aparece com o mouse em cima do cartão** (escolha do usuário; em tela de toque fica sempre à mostra), texto pequeno com contorno fino, verde ao passar o mouse nele; recusados: círculo verde em destaque e ✓ sozinho (parecia "já concluída"); pede confirmação e finaliza a O.S.; não aparece
  em concluída/cancelada); referência; cliente; etiqueta verde **"📍 POLO ARIQUEMES"** (`.polo-kanban`, pequena e discreta, 9,5 px, 17 px de altura: fundo
  clarinho do verde **#2a582f** (escolhido pelo usuário) com texto nesse verde; recusados: azul, verde-escuro das abas, verde
  forte #2b8f16 e etiqueta cheia/grande demais); embaixo a **cidade em negrito**
  (`.cidade-kanban`) com "· rua, nº" apagado na frente; Prazo/Recebida/Vence; próximo passo com barrinha.
  **Cores estruturadas (22/10, depois de o usuário achar que "destoava" nos dois temas):** uma escada só na família
  verde-acinzentada — fundo da página → coluna um degrau abaixo (`--kb-col`) → cartão na mesma superfície dos blocos do
  Início (branco no claro, #1f2922 no escuro). Tokens `--kb-*` em index.css (bloco "Kanban de O.S."). O prazo só tinge
  o cartão (amarelo ≤3 dias, vermelho ≤1 dia/vencida, PEPT cinza com `grayscale(1)`). Recusados: cartão verde-claro no
  escuro, verde-escuro e #566959 no claro, família fosca com texto branco.
  Contorno na cor da tipologia: testado e **removido a pedido** (22/10); a borda é a normal do cartão (`--kb-card-borda`).
  **Colunas até o rodapé e mover livremente (22/10)**: todas as colunas do Kanban têm a mesma altura e vão até o fim da tela (altura medida na tela, cartões rolam por dentro; saiu o "fim reto"). Qualquer coluna aceita o cartão: entre etapas muda **direto, sem confirmação** (só Canceladas pede confirmação); coluna livre ou por passo guarda o cartão nela (`colunaLivre`). PEPT continua abrindo Pausar/Finalizar (pedem dados).
  **Colunas editáveis (22/10)**: botão **Colunas** também no Kanban abre a janela "Colunas do Kanban" (`ColunasKanban`):
  mostrar/esconder, renomear, mudar a ordem (setas), criar coluna **livre** (arrastar cartões para ela; guarda
  `os.colunaLivre`, a etapa não muda) ou **por passo** (junta sozinha as O.S. naquele passo; não aceita arrastar; um passo
  só pode ter uma coluna), excluir as criadas, Restaurar padrão. Fica em `config.kanban` (vai no backup; `completarColunas`
  repõe etapas que faltarem). Padrão (`KANBAN_PADRAO`, lib/kanban.ts): Recebidas, Em Andamento, **PEPT**, Assinatura
  Pendente, Assinatura Concluída, Concluídas (escondida), Canceladas. Onde o cartão aparece (`colunaDaOS`): PEPT → coluna
  livre → coluna do passo → coluna da etapa. Soltar (`acaoAoSoltar`): na PEPT abre a janela Pausar; tirar da PEPT =
  `retomar` (PEPT resolvida hoje); numa etapa troca a etapa e sai da coluna livre. Selo do cartão na PEPT: "PEPT · Nd".
- Filtro Tipologia das O.S. (22/10): só o código (E004, A413…), sem a descrição; menu estreito (`larguraMenu`).
- Janela da O.S. (22/10): **tamanho fixo** (860 × até 720 px, `altura` no `Modal`) para não mudar de tamanho ao trocar de aba; abas **numa linha só e presas no topo** (`fixo` no `Modal`, `Abas linha` → `.seg-linha`); o conteúdo rola por dentro; **no modelo da ferramenta atual (prints do usuário em 22/10)**: no topo OS-N grande em verde, cliente embaixo, etiquetas e os botões Concluir · Pausar (PEPT)/Retomar · Editar · Excluir à direita (rodapé só para confirmar concluir/excluir); abas de dados em **duas colunas, nome do campo em cima (caixa alta pequena) e valor embaixo**, vazio = "-" (`Grade`, `Dado`), na ordem do real; Valores em 3 cartões (Total em verde, `Cartao`). Recusados: grade de 3 colunas solta e blocos com título. Fundo desfocado (`backdrop-blur`) ao abrir qualquer janela; com uma janela por cima de outra, Esc fecha só a de cima.
  **Abas (22/10)**: Passo a passo · Geral (dados + partes "Datas" e "Importação") · **Cliente e contato** (partes "Cliente" e "Contato para a vistoria", `Subtitulo`) · Endereço · **Vistoria** (no lugar de Datas; **só consulta e coordenadas**: situação e data/hora da vistoria, aviso de que a vistoria é marcada no módulo de Rotas, endereço, polo e o campo de coordenadas do Maps; "Marcar vistoria" do passo a passo e do Início leva para /rotas) · Valores · PEPT · Linha do tempo; links antigos `?aba=datas` abrem a Vistoria; o formulário Editar/Nova O.S. segue as mesmas abas. Telefones com **botão WhatsApp** (verde, abre a conversa com a mensagem de apresentação) e **Ligar** (`Fone`).
  **Coordenadas no formato que o Google Maps copia** (22/10): mostradas e coladas como `9°52'45.8"S 63°02'23.5"W` (`textoGMS`/`lerCoordenadas`), numa **caixa só** no Editar/Nova O.S. (aba Endereço; saíram os campos Latitude/Longitude) e na aba Vistoria (`CoordenadasOS`; antes ficavam na Endereço): mostra as coordenadas, botão Abrir no Google Maps e campo para **colar as coordenadas do Maps** (números "-10.8775, -61.9512", vírgula decimal, graus 10°52'39"S 61°57'04"W ou o link do Maps; `lerCoordenadas` em lib/coordenadas.ts) com prévia e Salvar (`definirLocalizacao`).
  **Aba Documentos saiu; no lugar, aba PEPT (22/10)**: PEPT em aberto (tipo, pendência, desde/há N dias, regra da tipologia, botão Resolver), resumo (PEPTs registradas, dias parados, prazo efetivo) e histórico (tipo, pendência, início, fim, dias, resolvida por). **Pausar** abre sempre a mesma janela `PausarOS` (Kanban, Início, janela da O.S., passo a passo): **tipo obrigatório Documental ou De vistoria**, uma **caixa de texto livre para o motivo** (sem sugestões, pedido do usuário: simples) e o dia. Na aba PEPT o motivo é editável (salva ao sair da caixa, `editarPept`). **Fluxo da PEPT (23/10, como o usuário trabalha; lib/pept.ts):** abre PEPT → o prazo **para**; **cliente resolveu** (data do e-mail de "PEPT resolvida" da Caixa, automático, ou registrada à mão) → o prazo **volta a contar** desse dia e a PEPT fica **aberta "em análise"** (`resolvidaEm`, `resolucao`, `resolverPeptNaOS`); o usuário analisa: **Reabrir** (não resolveu tudo) → o prazo para de novo desde a reabertura (da resolução até a reabertura os dias contam; novo período `reabertaDe`, mesmo motivo/tipo) ou **Validar e finalizar** → encerra (`encerrarPeptNaOS`); **o prazo não muda ao validar** (se ainda pausada, o dia da validação vale como resolução). O prazo só para ao abrir/reabrir e sempre volta a contar quando o cliente resolve. **Uma tela só, APROVADA pelo usuário — não mudar** (`AcaoPept` em components/PeptJanelas.tsx): as opções **Cliente resolveu · Reabrir PEPT · Finalizar PEPT** lado a lado (as que não valem ficam apagadas; **a data em que o cliente resolveu é obrigatória: Reabrir e Finalizar só ficam liberados depois de registrá-la**, pedido de 23/10 — enquanto pausada, os botões Finalizar/Reabrir aparecem apagados com o aviso). No topo da tela fica **só a "Linha do tempo da PEPT"** (sem o texto do motivo, pedido de 23/10): a primeira linha é o **recebimento da O.S.** ("Recebida · O.S. recebida dd/mm · a PEPT pausa se aberta até dd/mm"), depois uma linha por vez (1ª abertura, 2ª reab. …: aberta/reaberta → cliente resolveu (e-mail) → em análise / reaberta / finalizada, dias parados; `periodosDaPept`), com "reaberta (Nª vez)" no título e, embaixo, a data ("Resolvida em" / "Reaberta em" / "Finalizada em"). Os botões **Cliente resolveu · Finalizar PEPT · Reabrir PEPT** ficam **só dentro da aba PEPT** (saíram do topo da janela em 23/10; no topo fica só "Pausar (PEPT)" quando não há PEPT aberta), e todos abrem essa tela. **PEPT finalizada → a O.S. vai para Em Andamento** se estava em Recebida (`etapaAoFinalizarPept`; etapas à frente não voltam).  arrastar para fora da coluna PEPT abre essa tela. A O.S. em análise continua na fase/coluna PEPT (`faseDe`), com selo "PEPT · em análise" e o prazo contando. Histórico da aba PEPT (23/10): **um período por linha** (Abertura/Reabertura + tipo | Pausada em → Cliente resolveu (e-mail/à mão) → Encerrada em, datas editáveis | situação e dias parados), a **pendência escondida em "Ver pendência"** (abre ao clicar); sem tabela larga com rolagem para o lado (`editarDatasPeptNaOS`). **Prazos da PEPT** (4 cartões na aba PEPT, `prazosDaPept`): "O.S. recebida em" (com o prazo da Caixa), "Prazo antes da PEPT" (o que valia quando ela começou) e "Prazo após a PEPT" (com os dias parados dela, contando as reaberturas como a mesma PEPT; em aberto = se finalizar hoje; A413 em aberto = Indeterminado). O "após" é o que passa a valer no "Vence" do cartão da O.S. (`prazoAtual`). **Datas editáveis** no histórico (abertura e finalização/reabertura) e "Aberta em" na PEPT em aberto: recalcula dias parados e prazo (`editarDatasPeptNaOS`). Registro em `os.pepts` (`Pept`: tipo, motivo, inicio, fim, dias, resolvidaPor manual/email/conclusao; lib/pept.ts: `abrirPept`, `fecharPept`, `peptsDaOS`, `resumoPept`); O.S. pausada antes do registro vira PEPT em aberto "Não informado" com a pendência lida da linha do tempo. O seletor "Mudar etapa" do rodapé **saiu** a pedido; a etapa muda pelo passo a passo, por Concluir/Pausar e arrastando no Kanban.
- Mudança visual: uma tela por vez, mostrando o resultado antes de seguir (mesma regra do FLUXO ARQ).

## Rodar

- **Uso do dia a dia (igual ao FLUXO ARQ):** dois cliques em `Abrir Fluxo Caixa.cmd`, que abre
  `dist/Fluxo_Caixa.html` no Chrome em modo aplicativo (gera o arquivo na primeira vez). Para ter o
  ícone na área de trabalho: `Criar atalho do sistema.cmd` (usa `ferramentas/criar-atalho.ps1`).
  Depois de mudar o código, rode `cd app && npm run build:single` para atualizar `dist/Fluxo_Caixa.html`.
- Desenvolvimento: `INICIAR-FLUXO-CAIXA.bat` ou `cd app && npm install && npm run iniciar` (porta 5173).
  Os dados do `localhost:5173` e do arquivo local ficam separados (origens diferentes do navegador).
- `npm test` (Vitest, 148 testes devem passar) · `npx tsc --noEmit` · `npm run build:single`.
- Requer Node.js LTS. Se faltar, peça para o usuário instalar em https://nodejs.org/pt.

## Stack e estrutura

React 19 + Vite 6 + TypeScript 5.8 + Tailwind 4 + Zustand 5 (persist, chave `fluxocaixa-v3`
com `merge` para campos novos; backups antigos são convertidos) + react-router-dom 7 (HashRouter) + date-fns 4 (ptBR) + @dnd-kit +
lucide-react + Vitest 3.

```
app/src/types.ts           tipos iguais ao sistema real (OS com as 7 abas de dados, Status, Tipologia, Rota, Config)
app/src/data/seed.ts       dados de exemplo e CONFIG_PADRAO
app/src/store/useStore.ts  estado e ações (O.S., concluir, pausar/retomar, faturada, ficha, localização, rotas, backup)
app/src/lib/               regras puras com testes em lib/__tests__
  os.ts            etapas, tipologias, polos, prazo efetivo (pausa), farol, montarOS, migrarOS (formato antigo)
  rota.ts          distância (haversine), horários estimados, otimizar ordem, laço, elegíveis, sugestão de viagem
  faturamento.ts   períodos do real, situação (em aberto/vencida/a faturar/faturada), resumos, repasse, painéis, texto pronto
  siopi.ts         leitor do .txt da Caixa (referência de 9 dígitos, código da tipologia, campos de importação)
  fechamento.ts    texto do RRT, descrição da NF, conferência com extrato
  backup.ts        exportar/importar backup (versão 2; lê e converte a versão 1)
app/src/components/        ui.tsx, Layout.tsx (menu, escopo, notificações, menu do usuário), Logo, MapaOS, NovaOS, OsForm, ImportarOS
app/src/pages/             Painel (Início), OsList (Lista/Kanban), OsDetail (janela de detalhe), Rota (Rotas), Faturamento
                           (Financeiro), Fechamento (extra), Fichas, Config. Agenda.tsx está vazio: pode apagar.
app/src/index.css          tokens de cor (claro/escuro) e classes card/chip/btn/input/seg/table/kpi-*/status-*/farol-*/tip-*
app/scripts/build-single.mjs  junta JS e CSS num HTML só e grava dist/Fluxo_Caixa.html
dist/Fluxo_Caixa.html      o sistema local que o atalho abre
ferramentas/               criar-atalho.ps1 (copiado do FLUXO ARQ), gerar-icone.py, fluxo.ico, fluxo-32/256.png
                           (os PNGs vão embutidos no HTML: o Chrome usa como ícone da janela na barra de tarefas)
docs/01..05                análise e plano, design system, roteiro de captura, molde de replicação e
                           05-SISTEMA-REAL.md: o que existe em cada tela do fluxogestor.tech (captura de 09/10/2026)
```

Regra de ouro: **conta e regra ficam em `lib/` com teste; a tela só mostra.** O passo a passo para
replicar ou melhorar uma aba está em `docs/04-MOLDE-DE-REPLICACAO.md`.

## Domínio (igual ao sistema real desde 09/10/2026; detalhes em docs/05-SISTEMA-REAL.md)

- Menu: Início, Ordens de Serviço, Rotas, Financeiro, Fichas de Pesquisa, Configurações (mesma ordem e
  endereços do real). O escopo (Minhas · Marco · Todas) fica **na lateral, em coluna**, num cartão "Ver" (`.lat-escopo`, com ponto de informação explicando Minhas/Marco/Todas; **só aparece com mais de um técnico ativo**, `temEquipe` em lib/os.ts; o membro se ativa/desativa em Configurações → Equipe) embaixo, logo acima de "Recolher menu" (teste pedido em 20/10; na barra de cima só no celular, e o texto "Só as suas O.S." saiu); o "Só minhas · Minha equipe"
  repetido saiu do Início, O.S. e Rotas (20/10). No Início a linha de cima é "NOME DA EMPRESA, dia da semana, dia"; à direita só o botão Nova O.S. (maior; a busca saiu, fica a da barra de cima).
  O Financeiro mantém as visões Só minhas / Minha equipe / Geral (são visões de cálculo).
- Etapas: Recebida → Em Andamento → Assinatura Pendente → Assinatura Concluída → Concluída (ou
  Cancelada). Pausa ("Solicitar Pausa") empurra o **prazo efetivo**. Concluir grava `concluidaEm`.
- **Etapa Devolvida removida (20/10/2026)**: a Caixa não devolve laudo. O.S. salvas como devolvida viram concluída
  (`migrarOS` e `merge`). Melhoria A (laboratório, 09/10/2026), feita dentro das telas atuais: ~~etapa Devolvida~~ (a Caixa
  devolveu o laudo com exigência; tem motivo e prazo próprio de resposta, `prazoAtual`); "Reenviar à
  Caixa" volta para Concluída mantendo a data de conclusão original; voltar, pular, cancelar ou devolver
  pede confirmação (`precisaConfirmar`, janela `ConfirmarEtapa`); registro de tentativas de contato na
  aba Contato (`resumoContatos`); aba Histórico virou "Linha do tempo" com cores (`tipoEvento`); cartão
  "Responder devoluções" no Início (só aparece quando há devolvida).
- Tipologias reais: E004, E401, E005, G012, B438, B437, A413, G416, G014, G402. **Cadastro do real (20/10)** em `TIPOLOGIA_INFO` (lib/os.ts): prazo em dias (E004/E401/E005/A413 6, G012 10, B438/B437/G014 15, G416 5, G402 3), cor (#328f00, #0FC273, #15adc1, #AA00FF, #D50000, #2962FF, #FFD600, #FF6347, #AA00FF, #00B0FF) e descrição. Etiqueta cheia na cor do cadastro (`--t-XXXX-cor` em index.css); a O.S. nova e o .txt sem prazo usam o prazo da tipologia. Polos: ARIQUEMES,
  CACOAL, JI-PARANA. Cidades em maiúsculas sem acento, como no real.
- **"A faturar" = O.S. concluída e ainda sem nota fiscal** (como no real). O que não foi concluído é
  "em aberto". Financeiro marca "Faturada" e copia o "texto pronto" da nota.
- Início: faixa da semana, Assinar laudos, Agendar vistorias, Terminar laudo, Emitir notas ("parados
  +5 dias"), Agenda de hoje, Sugestão de viagem e Chegaram da CAIXA.
- Rotas: Roteirizador (mapa próprio sem internet, laço +/−, base) e Rotas (Rascunho → Confirmada →
  Concluída/Cancelada, distância por haversine × 1,3, velocidade média 30 km/h). Confirmar marca a vistoria.
- Melhorias do laboratório que o real não tem: Financeiro com as visões Só minhas/Minha equipe/Geral,
  repasse de 40% e meta; Fechamento mensal (RRT e NF) em /financeiro/fechamento; abas Documentos e
  Histórico no detalhe; otimizar ordem e hora estimada nas rotas; notificações calculadas.
- **Módulo E-mails da Caixa** (/emails, 20/10): caixa de entrada só com remetentes @caixa (`lib/emails.ts`,
  `ehDaCaixa`), contador de não lidos no ícone do menu, notificação no sininho e contador só para e-mail de O.S. nova e de PEPT resolvida (`notificaveis`; aviso, prazo e cancelamento não notificam), leitura
  em duas colunas e "Importar O.S." do anexo .txt (usa o leitor do SIOPI). No laboratório os e-mails são de
  exemplo e há o botão "Simular novo e-mail"; no sistema real viria do Gmail conectado em Configurações.
- **Nova OS** (20/10): sem a janela de escolha; abre direto a janela grande (1034 px) com as abas **Arquivo · Manual · E-mail** (`NovaOS.tsx`; Manual = `OsForm` com `topo`). Importar O.S.: Arquivo (primeiro a caixa para colar o texto, depois arrastar .txt) com pré-visualização e bloqueio de duplicadas; E-mail
  só explicado (sem Gmail no laboratório).

- **Processo real (dito pelo usuário em 20/10/2026):** não assinam laudo, não emitem nota, a Caixa não
  devolve laudo e não há integração com o sistema da Caixa; só a importação automática das O.S. pelo
  Gmail. Não há registro de tentativas de contato (o contato é direto; o sistema só organiza o trabalho).
  **Passo a passo do serviço Caixa** (20/10): O.S. recebida → Baixar as documentações → Analisar documentos →
  Abrir PEPT (se necessário) → Marcar vistoria → Fazer vistoria → Fazer avaliação → Preencher SIMIL → Baixar o
  laudo → Assinar → Enviar. É um checklist dentro da O.S. (aba "Passo a passo", a primeira; `lib/passos.ts`,
  ação `marcarPasso`); as etapas do sistema real continuam e Fazer vistoria/Baixar laudo/Assinar/Enviar andam a
  etapa sozinhos. O Início usa o próximo passo (cartão Prioridade com "Feito: …", blocos "Documentos e agenda"
  e "Laudo e envio").
  **Prazo pela tipologia (22/10, confirmado pelo usuário):** A413 e E401 = 6 dias, B437 e B438 = 15 dias, **contados a partir do dia seguinte ao recebimento** (recebida 10/10, A413 → vence 16/10); `prazoDaTipologia` em lib/os.ts (dados de exemplo, Nova O.S., .txt sem prazo). O.S. salvas com o prazo antigo de 15 dias dos exemplos são corrigidas ao abrir (`corrigirPrazoAntigo`); prazo vindo da Caixa não é mexido.
  **A PEPT só pausa o prazo se aberta até 2 dias depois do recebimento** (chegou dia 08 → até dia 10; `limiteParaPausar`, `pausaValida`, `peptContaPrazo` em lib/os.ts; reaberturas seguem a PEPT original). Aberta depois disso: fica registrada, mas o prazo continua correndo (0 dias parados, A413 não fica indeterminada, o cartão mostra os dias que faltam). A tela Pausar mostra "O.S. recebida em" e "Pausa o prazo se aberta até", com aviso verde/vermelho; a aba PEPT avisa quando não pausa.
  **Passos nunca finalizam a O.S.** (22/10): "Enviar" não leva mais à etapa Concluída (`ETAPA_DO_PASSO` sem concluída + trava no `marcarPasso` + teste); só o botão Concluir finaliza. Com todos os passos feitos, o passo a passo diz "todos os passos feitos (para finalizar, use Concluir)".  **PEPT** = O.S. com o prazo pausado por pendência. **Regras (20/10, `diasDePausa`, `PEPT_SEM_PRAZO`, `PEPT_LIMITE` em lib/os.ts):**
  o dia do cadastro da PEPT e o dia da resolução contam como dias de prazo; só os dias entre eles ficam parados;
  B438/B437 seguram o prazo no máximo 21 dias; **A413** em PEPT fica com prazo **indeterminado** (confirmado pelo usuário em
  20/10; ele escreveu "A-413"/"A416"; G416 é outra tipologia e não entra); as outras tipologias seguram o prazo sem limite; o alerta do COT (21 dias) só vale para B438/B437. **A resolução chega por
  e-mail do SIOPI** ("A pendência aberta para a OS … foi resolvida"); **todo e-mail de PEPT é de PEPT resolvida** (assunto com PEPT/pendência ou texto "pendência … resolvida", sem anexo); o exemplo antigo "Aviso: PEPT com prazo próximo do limite" saiu: `refPeptResolvida` lê a referência, a ação
  `aplicarPeptsResolvidas` tira a O.S. da pausa no dia do e-mail e o sininho avisa "PEPT finalizada: OS-x — o prazo
  voltou a contar" (botão "Simular PEPT resolvida" na tela de E-mails). Kanban sem o selo "No prazo". Vistoria é sempre agendada para o dia seguinte
  ou depois. **Início = direção "B · Painel em blocos"** (escolhida em 20/10 depois de recusar telas parecidas
  com o ARQ e telas "genéricas"; ele quer visual moderno, limpo e claro): cartão verde-escuro grande
  "Prioridade agora" (a O.S. que vence primeiro, o próximo passo, Feito/Marcar vistoria, Abrir O.S., Ligar,
  WhatsApp, Pausar (PEPT) com o dia em que pausou, setas 1 de N; trilha de passos com nomes curtos) + blocos, nesta ordem: O.S. em aberto (recebidas), O.S. em
  andamento, O.S. em PEPT, Finalizadas no mês (número + pizza das O.S. recebidas no mês por tipologia, linhas com código, barrinha (cheia = finalizadas), total recebido e selo laranja das não finalizadas; 3 maiores + "Outras"; `porTipologia` em lib/inicio.ts) + "Sua semana" (quantas e quais O.S. vencem em cada dia) +
  "Alertas" (a lista rola dentro do cartão e mostra todos; corrigido em 23/10, antes vazava para fora); clicar num dos 4 cartões abre a **Lista** já filtrada com a mesma quantidade (`/os?visao=lista&fase=…&periodo=todos`; finalizadas usa o mês) (o Início ocupa a altura da tela: os cartões de baixo esticam até o fim, margens iguais dos 4 lados;
  vencida, PEPT perto/além do prazo do COT de 21 dias, vence em até 3 dias, vistoria amanhã; `alertas`
  em lib/inicio.ts). Classe `.bloco` (branca no tema claro). O cartão "Prioridade agora" é verde-escuro no tema claro e verde
  bem clarinho no tema escuro (`.heroi`). Os seletores `.seg` (Minhas/Marco/Todas, Lista/Kanban, Financeiro…)
  são maiores e usam o mesmo verde do cartão (escuro no tema claro, clarinho no tema escuro).
  Desenhos das 3 direções no quadro, página "Início · 3 direções". Devolvida já saiu (20/10); perguntar antes de tirar Assinatura/NF do resto do sistema.
- Artefato para testar online (mesma réplica): https://claude.ai/artifact/6jAVNRvZmfqjDyVLqK1jU3
  (publicar `app/dist-single/fluxogestor-lab.html` depois do build).

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
5. A pasta está no OneDrive: sugerir marcar `app/node_modules` como "liberar espaço" / fora da
   sincronização (é grande).
6. **Início (13/10/2026)**: o usuário recusou 5 ideias de Início novas e pediu para manter o Início de hoje
   e acrescentar informação de gestão. Feito: selo "Mais antiga há N dias" em Assinar laudos e Terminar laudo;
   bloco "Gestão da carteira" (Carteira por etapa com idade e paradas, Produção do mês com chegaram ×
   concluídas, % no prazo, tempo médio e concluídas por semana, Paradas há mais de 5 dias com quem destrava)
   e "Em aberto por cidade" na coluna da direita. Regras em `lib/inicio.ts`. A Carteira por etapa abre
   /os?status=… já filtrado. Desenho igual no quadro (página "Início"): https://claude.ai/artifact/EuFcBeVueGrkRPvYyqbncv
   Sobrou a pasta `app/src/pages/inicio/` (as 5 ideias recusadas, não usadas em lugar nenhum; fora do `tsconfig`): pode apagar.
   Telas refeitas iguais ao real em 09/10/2026. O usuário **não gostou do esboço visual** e pediu para
   melhorar seguindo o padrão atual, uma tela por vez. Melhoria A (O.S.) feita e mostrada; aguardando
   aprovação antes da próxima (B: Financeiro até o dinheiro; C: obra como série).
   Análise de melhorias do fluxo (09/10/2026, usuários são só arquitetos e engenheiros):
   https://claude.ai/artifact/JF7uyf8s6joNybEzrW2sCc (Raio-X do FluxoGestor). Propõe 3 protótipos para a
   réplica: A) O.S. completa (linha do tempo, devolvida pela Caixa, contatos, documentos); B) Financeiro até o
   dinheiro (pago/glosa, repasse por membro, RRT ou ART); C) A obra como série (E401/E004/E005 e RAE).
   Esboço visual dessas ideias (6 telas, só desenho): https://claude.ai/artifact/EuFcBeVueGrkRPvYyqbncv
7. "Geral" no Financeiro soma as suas O.S. e as do RT; confirmar se o usuário quer só as do RT
   (a tela que ele desenhou diz "faturamentos totais do RT").

## Referências

- Código: https://github.com/luansantos95live-sudo/ORGANIZER, branch
  `claude/fluxogestor-dashboard-redesign-cxdnxz`
- Figma (design system e Faturamento): https://www.figma.com/design/PjnAVzeTQMhPY4ylCJQTxL
- Prints de todas as telas: `docs/screenshots/`
