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
- **Onde fica (10/11/2026)**: `C:\Users\Jeguim\OneDrive\FLUXO CAIXA` — na raiz do OneDrive, ao lado de `FLUXO ARQ`
  (foi movida de `OneDrive\CLAUDE\1 - SISTEMAS\FLUXO CAIXA` a pedido: "organize todo o sistema dentro de uma pasta no
  drive com o nome FLUXO CAIXA", para abrir e editar de qualquer PC com o OneDrive dele). Tudo relativo à pasta:
  `Abrir Fluxo Caixa.cmd`, `Criar atalho do sistema.cmd`, `.claude/launch.json`, a skill `/caixa-emails` e a pasta
  `Caixa de entrada`. Em outro PC: deixar o OneDrive baixar a pasta, dois cliques em `Abrir Fluxo Caixa.cmd` (gera o
  sistema se faltar, instala o `node_modules` se faltar) e abrir a pasta no app Claude para editar.
- **Dados entre PCs (10/11)**: Configurações › Backup e dados › **Pasta de dados no OneDrive** (`PastaOneDrive`). O usuário
  escolhe `FLUXO CAIXA\Dados` (File System Access API do Chrome/Edge; a pasta fica lembrada no IndexedDB). O sistema grava
  `fluxocaixa-dados.json` (backup + e-mails + `salvoEm`) 1,5 s depois de cada mudança e, ao abrir, lê o arquivo: **o mais novo
  vence** (`arquivoMaisNovo`). Lógica pura em `lib/pastaDados.ts` (com teste), ligação ao store em `store/pastaSync.ts`
  (`iniciarPasta` no Layout, `conectarPasta`, `reconectarPasta`, `gravarAgora`, `desconectarPasta`). O Chrome pode pedir
  confirmação a cada abertura: faixa laranja no topo com **Reconectar pasta**. `Dados/` está no .gitignore.
- Quer ver o resultado no Chrome, em aba própria, fora do Claude: `http://localhost:5173`.
- **REGRA DE OURO DO USUÁRIO: NUNCA mudar uma tela que ele já aprovou sem ele pedir.** Se um pedido novo afetar uma tela aprovada, mude só o que foi pedido e pergunte antes de mexer no resto (ele reclamou várias vezes, em 22–23/10, de telas aprovadas que mudaram: a tela da PEPT com Finalizar e Reabrir lado a lado, os cartões etc.). Ao implementar algo novo, acrescente sem tirar o que já existe.

- **Pastas das O.S. (12/11/2026)**: `OneDrive\LFX ARQUITETURA - CAIXA - ORDENS DE SERVIÇO\<técnico>\<ano>\<MÊS>\OS-<nº> - <tipologia> - <cidade> - <bairro> - <rua>\OS.txt`
  (técnicos "1 - <NOME> RT" e "2 - <NOME DO RT> RT"; numeração própria de cada técnico). **Não criar estrutura nova e
  não mexer na pasta do Marco** (pedido do usuário). As pastas avulsas "Fluxo - Proprietário do Sistema" do Luan foram
  movidas para `1 - <NOME> RT6\(mês)` em 12/11 (sobrou a pasta vazia com a cópia repetida da OS-21 para o usuário apagar).
  Importação: `npx vite-node scripts/importar-pastas.ts "<1 - ORDENS DE SERVIÇO>" ../Dados/<saida>.json ../Dados/<complementos>.json`
  gera um backup **só com O.S.** (sem config: ao importar, as configurações do navegador ficam; `restaurarDados`); etapa pela
  pasta (laudo PDF → Concluída, fotos → Em Andamento) ou pelo arquivo de complementos. Em aberto do Luan em 12/11: OS-21 (Em
  Andamento), OS-24, 25, 26, 27 (Recebidas). O leitor do SIOPI agora entende "Data da Ordem de Serviço" e "N Dia(s) corridos" e separa o CPF/CNPJ do nome do cliente (`separarDocumento`; O.S. já salvas com "CPF - NOME" são corrigidas no `merge`, `semDocumentoNoNome`). **Polos (12/11)**: Jaru, Machadinho d'Oeste e Buritis são do polo ARIQUEMES (como no real).

- **Produção × desenvolvimento (12/11/2026)**: produção = `Dados\Fluxo_Caixa.html` (gerado pelo `build:single` quando existe
  `Dados\os-reais.json`; traz as O.S. reais e as coloca no navegador na primeira abertura ou enquanto só houver exemplos `os-N`;
  depois nunca sobrescreve). O atalho da área de trabalho e o `Abrir Fluxo Caixa.cmd` abrem essa versão. Desenvolvimento =
  `localhost:5173` (dados de exemplo, origem separada). Tudo em `Dados\` fica fora do git. Para atualizar as O.S. reais:
  rodar `scripts/importar-pastas.ts` gravando em `Dados\os-reais.json` e `npm run build:single`.

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
- **Logo nova (12/11/2026)**: arte enviada pelo usuário (original em `LOGO/fluxo-logo-original.png` e ícone recortado em `LOGO/fluxo-icone.png`): ícone quadrado escuro com o "F" verde (`app/src/assets/fluxo-icone.png`, aba do navegador, `ferramentas/fluxo.ico/-32/-256.png`) e logo completa "FLUXO · Gestão de Ordens de Serviço" (`fluxo-logo-escura.png` texto claro no menu lateral aberto; `fluxo-logo-clara.png` para fundo claro). `Logo`/`LogoCompleta` em components/Logo.tsx, embutidas com `?inline`. Recolhido = ícone; aberto = logo completa. (Antes: "F" de faixa dobrada em verde-água.) Vetor em `app/src/components/Logo.tsx`; o ícone do
  atalho sai de `ferramentas/gerar-icone.py` (`fluxo.ico`, `fluxo-256.png`).
- **Financeiro**: o usuário prefere a arrumação de cartões antiga (meta do mês, 5 KPIs
  compactos, barra única de composição com legenda + 3 cartões, resumo em lista, histórico de 6 meses,
  tabela; a frase-resumo "Você já consolidou…" acima dos cartões foi **removida a pedido dele em 06/11** — não recolocar).
  A tabela segue as telas que ele desenhou (O.S. completa, Categoria, Origem "Meu" ou
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
  amarela com 3 dias ou menos, vermelha com 1 dia ou menos até concluir (inclusive vencida), cinza em PEPT, verde quando finalizada. O.S. em PEPT sempre aparecem (ignoram o período). **Todas** mostra todas as O.S. do período (recebidas, em andamento, PEPT, finalizadas e canceladas). Cartão do Kanban na organização do real (tipologia | OS, selo, referência, cliente, POLO, endereço, caixinhas Prazo/Recebida/Vence e, embaixo, o próximo passo com "N de M" e barrinha de quanto falta para ficar pronta) no visual novo, faixa lateral da cor do prazo. Passo a passo: **clicar no círculo marca o passo como feito** (12/11; saíram os botões "Feito"; PEPT e "Marcar data" seguem com botão); clicar no **visto** de um passo feito desmarca na hora, sem perguntar (12/11; antes abria a caixinha "Desmarcar …?") (`voltarParaPasso`): ele e os seguintes voltam a pendente e a etapa volta junto. Cores dos cartões do Kanban: ver "Cartão do Kanban (22/10/2026)" abaixo; O.S. finalizada = cartão verde inteiro, o verde do botão "Nova O.S." (`.card-finalizada`, nos dois temas); cartão inteiro amarelo (≤3 dias), vermelho (≤1 dia e vencida) e cinza (PEPT) como na lista, e o selo segue a mesma regra (`corPrazo`); coluna com mais cartões abaixo fica com o fim reto (só arredonda quando a rolagem chega ao último cartão); ao passar o mouse, cartão do Kanban sobe 2 px e linha da lista sobe 1 px com sombra leve (`.card-kanban:hover`, `.linha-os`); datas dd/mm e prazo curto ("7 dias", "Vencida 2d") para caber. Barra de cima: o botão "Buscar O.S." **saiu a pedido em 23/11** (a busca segue no Ctrl+K).
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
- **Gmail em produção (12/11)**: a versão de produção tira os e-mails de teste (ids `em-…`) e, se existir `Dados/gmail.json`
  ({ url, token, criarOs }), liga o Gmail sozinha em qualquer PC (só quando ainda não houver ligação). Primeira busca: últimos
  **10 dias** (`desdeParaSincronizar`). O script que vale é o da conta **do usuário (endereço em Dados/gmail.json)** (onde chegam os e-mails da
  Caixa), já publicado como App da Web desde 10/11; endereço e senha gravados em `Dados/gmail.json` em 12/11 (testado:
  27 e-mails da Caixa nos últimos 10 dias). Há uma cópia sem implantação na conta luansantos95live: não usar.
  `ferramentas/gmail-script/Code.gs` agora cria a própria senha (Propriedades do script, `mostrarSenha`) — vale para
  publicações novas; o script publicado ainda usa a senha fixa no código.
- **PEPTs reais (12/11, `Dados/pepts-reais.json` + `scripts/aplicar-pepts.ts`)**: OS-21 aberta 28/10 e **nunca resolvida** (corrigido: o registro antigo com resolvida/reaberta em 05/11 estava errado; `corrigir: 'v2'` faz a atualização substituir a PEPT no navegador uma vez); OS-24 aberta e resolvida 09/11 (em análise); OS-25 aberta 09/11.
- **Regras de produção do Gmail (12/11)**: `config.gmail.ativoDesde` = 2026-11-12T16:54Z — e-mails anteriores só ficam
  na caixa de entrada para consulta (não criam O.S., não mexem em PEPT; `emailInterage`). Daqui para frente: convocação vira
  O.S. sozinha **só se for do polo ARIQUEMES** (`config.gmail.polos`; de outro polo o sistema ignora) e PEPT resolvida
  mexe na PEPT. Vem de `Dados/gmail.json` (aplicado uma vez pela versão de produção). Saíram os botões "Simular novo
  e-mail" e "Simular PEPT resolvida". **Numeração por técnico** (`importarOS`/`criarOS`): a próxima do Luan é OS-28, não OS-58.
- **Financeiro, tabela (12/11)**: "Ordens de serviço do período" mostra **só as O.S. finalizadas no período** (pela data de
  conclusão); as em aberto ficam só nos cartões de cima. Filtro de situação: Todas as finalizadas · A faturar · Faturadas.
- **Fichas de Pesquisa (12/11)**: um bloco por técnico ("Minhas O.S." e, embaixo, "O.S. do RT <nome>"; técnico sem O.S.
  não aparece), cada um com "N de M fichas fornecidas", barrinha e %; linhas em colunas fixas com cabeçalho (OS · Cliente ·
  Tipologia · Polo · Etapa · Ficha), tudo alinhado; **controle mensal**: abre no mês atual (o período ainda pode ser trocado) (`BlocoFichas`, `COLUNAS` em pages/Fichas.tsx).
- **Fichas: cidade, não polo (23/11)**: a ficha tem de ser fornecida da mesma cidade de origem da O.S.; a coluna Polo virou **Cidade** (o polo aparece ao passar o mouse) e há filtro **Cidade** ao lado do de Polo (que ficou).
- **Anotações = quadro de post-its (23/11, versão aprovada para teste)**: o usuário recusou checklist por O.S. e depois o Kanban de dias da semana ("não gostei, faz algo simples como se fosse um quadro de post-its mesmo"). Agora: tela `/anotacoes` (menu, ícone `StickyNote`) com **post-its quadrados coloridos, levemente tortos** (`.quadro-postits`, `.postit`, cores `.pi-amarelo/verde/azul/rosa/laranja`), escreve direto no post-it (salva ao digitar), ao passar o mouse aparecem o X (pede confirmação se tiver texto) e as 5 bolinhas de cor; o mais novo fica primeiro; botão "Novo post-it" e quadrado tracejado no fim. **Sem O.S., sem dia, sem marcar feito.** Botão **post-it flutuante** verde no canto inferior direito em todas as telas (`components/PostIt.tsx`, `.postit-botao`; **sem número no ícone**): abre um post-it amarelo em branco, "Colar no quadro" (ou Ctrl+Enter) guarda e fecha. **10 cores** para escolher nas bolinhas (amarelo, verde, azul, rosa, laranja, lilás, turquesa, salmão, lima, areia; `CORES_POSTIT`, `.pi-<cor>`); **post-it novo não repete cor** (`proximaCor`: a primeira que não está no quadro, senão a menos usada; o post-it rápido do botão já aparece nessa cor). Pedido de 23/11: "deixe criado só os 4, mas deixe o usuário escolher entre mais cores". **Quadro sem cores repetidas** (23/11, print do usuário com dois amarelos): ao abrir, o post-it mais novo com cor repetida ganha uma cor livre (`semCoresRepetidas` no `mesclarConfig`); nas bolinhas, as cores de outros post-its ficam apagadas e não clicam (`coresBloqueadas`, liberadas só com mais de 10 post-its). Cuidado: seletor do zustand que devolve `Set`/objeto novo trava a tela em laço — calcular com `useMemo`. **4 post-its padrão** em branco (amarelo, verde, azul, rosa; `POSTITS_PADRAO`, ids `postit-<cor>`), colocados **uma vez só** (`comPostitsPadrao` no `mesclarConfig`, marca `config.postitsPadrao`); apagados, não voltam. Dados em `config.lembretes` (`ItemAnotacao` {id, texto, cor, criadaEm}; `novoLembrete`, `editarLembrete`, `apagarLembrete`); regras em `lib/anotacoes.ts` (teste); `Postit` em `components/Lembretes.tsx`. `components/ChecklistOS.tsx` ficou vazio (sem uso; pode apagar).
- **Ícones do menu lateral (23/11, modelos enviados pelo usuário)**: todos desenhados no mesmo quadro 24×24, mesmo traço (1,75) e mesma margem, traço na cor do texto do menu + **um detalhe verde** (`var(--brand)`): Início = casa com 4 quadradinhos (1 verde); O.S. = prancheta com checklist (clipe e vistos verdes); Rotas = saída, trajeto com parada verde e pino; Financeiro = carteira com $ e fecho verde; Fichas = ficha com casa e linhas, folha de trás e dobra verdes, lápis com ponta verde (modelo do usuário, 23/11; simplificado para ler em 22 px); Amostragem = casa com chaminé e janelas, cantos de enquadramento e lupa verde (modelo do usuário, 23/11); E-mails = envelope com a aba em V verde e as duas dobras de baixo (trocado a pedido em 23/11; antes bandeja com seta); Anotações = dois post-its, o de trás verde e o da frente com linhas e ponta dobrada verde (modelo do usuário, 23/11); Configurações = engrenagem com centro verde. **Todas** (perfil do "Ver" e a explicação do ponto de informação) = uma pessoa em traço claro e a segunda, atrás, em verde (`IconeTodas`, modelo do usuário, 23/11). Em `components/IconesMenu.tsx`; quadro mais justo (`QUADRO` 20,4, traço reduzido na mesma proporção) porque o usuário achou os ícones pequenos ("mantenha o tamanho dos anteriores"). Depois, **+10%**: `.aba svg` 22 px (era 20). Texto dos itens do menu **+5%**: `.aba` 15,75 px (era 15). Amostragem, Anotações e Rotas com **mais 10% só no desenho** (`escala={1.1}` no `Base`, traço igual; svg com `overflow="visible"` para o pino das Rotas não cortar). `IconeCasaLupa.tsx` e `IconeFinanceiro.tsx` ficaram sem uso.
- **Dica do menu recolhido (23/11)**: ao passar o mouse num ícone do menu recolhido, o nome aparece **na hora** ao lado (`.dica-lateral`, posição fixa calculada no `comDica` do Layout; vale para os itens, os perfis do "Ver" e "Expandir menu"). Saiu o `title` nativo, que demorava ~1 s.
- **Trilha de passos do "Prioridade agora" clicável (23/11)**: cada passo (Recebida, Docs, Análise…) é um botão; clicar escolhe o passo (fica verde e o título vira "Passo escolhido"); sem escolha vale o passo atual. O botão verde mostra **"Feito" só se o passo escolhido já está feito** (clicar desfaz, como o visto do passo a passo: `voltarPasso`) e **"Fazer"** quando não está (clicar marca como feito e volta a seguir o passo atual). Trocar de O.S. pelas setas limpa a escolha. Agendar ainda pendente continua com "Marcar vistoria" (leva para Rotas).
- **"Tudo em dia" do Prioridade agora (23/11)**: sem O.S. pendente, o cartão mostra selo verde com brilho, "TUDO EM DIA", **"Parabéns, <nome>!"**, "Você está com todas as demandas em dia.", "Nenhuma O.S. esperando por você agora. Aproveite o respiro." e chips (finalizadas no mês, PEPT aguardando o cliente se houver, Ver ordens de serviço); anéis suaves e confetes animados (`.emdia-*` em index.css, com cores próprias para o cartão claro do tema escuro).
- **Configurações preenchidas (12/11)**: empresa, contrato, edital, processo, RRT e perfis vêm de `Dados/config.json` (tirados
  da NF de outubro; dados reais, fora do git). A produção aplica uma vez (chave `fluxocaixa-config-real` = `id` do arquivo) e só
  nos campos vazios (ou nos nomes padrão "Luan"/"Marco (RT)"). Para reaplicar, mude o `id`. Endereço base das rotas não foi mexido.
- **Financeiro, período (12/11)**: O.S. em aberto contam **no período que contém hoje**, qualquer que seja o prazo (`noPeriodoFinanceiro`; antes a OS-21 em PEPT, com prazo empurrado, saía do mês); finalizadas pela conclusão. "Potencial a faturar" = previsto total (todas as minhas + 40% das do RT), sem descontar o consolidado.
- **Pasta automática da O.S. (12/11)**: Configurações › Backup e dados › **Pasta das O.S. no OneDrive**: o usuário escolhe uma vez
  `OneDrive\LFX ARQUITETURA - CAIXA - ORDENS DE SERVIÇO` (handle no IndexedDB, chave `ordens`). Toda O.S. nova do Luan
  (id que não é `pasta-…` nem exemplo `os-N`, sem `os.pasta`) ganha `<"1 - …">/<ano>/<MÊS da emissão>/OS-N - TIP - CIDADE - BAIRRO - RUA`
  com OS.txt (`os.txtOriginal`, o .txt da Caixa; sem ele, a referência) e as subpastas DOCUMENTOS SIOPI/{OUTROS,PLS,ULTIMA RAE},
  FOTOS VISTORIA, LAUDO/{LAUDO,MODELO DE REGRESSÃO,RAE}. Se já existir "OS-N …" no mês, só anota. Pasta do técnico achada pelo
  prefixo "1 - " (luan) / "2 - " (rt; o RT fica de fora, `TECNICOS_COM_PASTA`). Regras em `lib/pastasOS.ts` (teste), gravação em
  `store/pastasOS.ts` (`iniciarPastasOS` no Layout; faixa laranja "Reconectar pasta" se o Chrome pedir).
  **24/11**: a faixa "Escolher a pasta das O.S." foi feita e **desfeita a pedido** ("o agente já serve pra isso"): a versão web
  cria as pastas pelo agente; nesta versão local, se faltar pasta, cria-se direto no OneDrive (as da OS-30 e OS-31 foram criadas assim).
  **Depois (24/11), desligada de vez no navegador**: o Layout não chama mais `iniciarPastasOS` nem mostra a faixa "Pastas das O.S.", e a
  seção "Pasta das O.S. no OneDrive" saiu das Configurações (o Chrome tinha guardado a pasta NOVEMBRO e pedia confirmação toda vez).
  `store/pastasOS.ts` e `lib/pastasOS.ts` ficam só como referência das regras de nome. A "Pasta de dados no OneDrive" (backup/sincronia) continua.
- **O.S. por período: mês em que foi RECEBIDA (24/11, regra universal do usuário)**: `osNoPeriodo` (lib/faturamento.ts) na lista/Kanban
  de O.S. e nas Fichas: a O.S. aparece no mês da `emissao` (antes ia pelo vencimento: recebida 24/11 e vence 09/12 só aparecia em
  dezembro) e segue nos meses seguintes enquanto não for finalizada; finalizada aparece até o mês da conclusão; cancelada só no mês em
  que chegou. O Financeiro continua com a regra dele (`noPeriodoFinanceiro`). Igual no fluxo-frontend.
- **Pasta do OneDrive sem faixa (24/11)**: a confirmação da pasta de dados não mostra mais a faixa laranja; `iniciarPasta` pede a
  permissão no primeiro clique em qualquer lugar (o Chrome exige um clique). Só erro de verdade aparece em faixa vermelha.
- **E-mails em abas (24/11)**: Todos · **O.S. recebidas** · **O.S. finalizadas** · **PEPT resolvidas** · **Notificações gerais**
  (`GRUPOS_EMAIL`/`grupoEmail` em lib/emails.ts; "Conclusão da Ordem de Serviço" sem anexo é o tipo `finalizada`, etiqueta `.chip-fin`;
  cancelamento, prazo e aviso vão para Notificações gerais), cada uma com o total e um ponto verde se houver não lido; **Não lidos** filtra
  dentro da aba. Na aba O.S. recebidas a lista vem **separada por polo** (`porPolo`/`poloDoEmail`, cidade do .txt; cabeçalho `.polo-cab`);
  nas outras abas o e-mail de O.S. mostra "· polo X". Igual no fluxo-frontend.
- **Pastas automáticas sem clique (12/11, "faça acontecer sozinho" até o agente da versão web)**: `app/scripts/pastas-automaticas.ts`
  lê o Gmail (Dados/gmail.json, convocações depois de `ativoDesde`, polo ARIQUEMES), vê quais referências já têm pasta (procura a ref
  nos OS.txt de `Dados/pastas.json` › `tecnico`, meses a partir de `inicio` 2026-10) e cria as que faltam com o próximo número
  (maior OS-N + 1, ordem de chegada = mesma regra do sistema). Log em `Dados/pastas-automaticas.log`. Roda a cada 5 min pela tarefa
  do Windows "Fluxo Caixa - Pastas das OS" (`ferramentas/pastas-automaticas.vbs`, escondido), que o **usuário liga** com
  `Ligar pastas automaticas.cmd` (o Claude não pode criar tarefa agendada) e desliga com `Desligar pastas automaticas.cmd`.
  OS-28 (E005 Ariquemes) e OS-29 (G416 Jaru) criadas à mão em 12/11. Se o usuário criar O.S. à mão no sistema, a numeração pode
  desencontrar.
- **O.S. nova (12/11)**: O.S. criada pelo e-mail da Caixa ganha `os.nova` = selo azul **NOVA** e contorno azul no Kanban
  (`.chip-nova`, `.card-nova`), selo na Lista, número azul no ícone de Ordens de Serviço e aviso no sininho ("O.S. nova: OS-N");
  abrir a O.S. tira a marca. (O e-mail fica lido ao virar O.S., por isso o aviso vem da O.S.)
- **Tipologia do .txt (12/11)**: `detectarTipologia` lê primeiro o código da linha **"Atividade:"/"Serviço:"** (o cadastro de
  tipologias do sistema: E004, E005, E401…); só sem essa linha usa o código que aparece primeiro no texto. Antes, "Atividade: E005 -
  ATIVIDADE EDITAL E005: ATIVIDADE EDITAL E401 + …" virava E401 (OS-28, corrigida no navegador pela atualização por `ref`).
- **Etiqueta NOVA no topo do cartão (12/11)**: faixa azul "● NOVA · chegou pelo e-mail da Caixa" (`.faixa-nova`) em cima do cartão
  do Kanban da O.S. criada sozinha; some ao abrir a O.S. As 2 O.S. mais recentes foram marcadas uma vez (`novasRecentes: 2`).
- **Rota de 13/11, versão final (`rota-2026-11-13-v7`)**: saída de Monte Negro **09:00**; OS-26 11:00, OS-27 11:15 → (almoço em Jaru ~13:25–14:25) → OS-24 14:30, OS-29 14:45, OS-25 15:00 → OS-28 **16:40** (Ariquemes) → Monte Negro ~17:40 (v1–v6 substituídas).
- **Rota de 13/11 (ROTA-1311)**: montada pelo Claude e colocada no navegador por atualização (`rota` em Dados/atualizacoes.json):
  saída Monte Negro 08:00, OS-28 (Ariquemes) 09:00 → OS-26 12:50 e OS-27 13:05 (Machadinho) → OS-24 16:35, OS-29 16:50, OS-25 17:05
  (Jaru) → volta ~19:45; 10 min por vistoria (`config.duracaoVistoria` = 10). Coordenadas exatas de OS-24/26/27 (PCI/RAE);
  OS-25/28/29 aproximadas pelo bairro. Tira o rascunho automático "Sugestão com as O.S. em aberto".
- **Mensagem de WhatsApp das rotas (12/11)**: texto padrão gravado no navegador por atualização (`configForcar.mensagemWhatsApp`, Dados/atualizacoes.json): agendar a vistoria "para amanhã, {data}, por volta das {hora}", avisando que o horário pode mudar por causa das obras na estrada. Editável em Configurações › Meu Perfil.
- **OS-21, PEPT resolvida em 13/11 (e-mail da Caixa)**: no navegador ficou `diasPausado` 7 antigo + 15 da resolução = vence 04/12 (errado). Corrigido por atualização (`pept-os21-resolvida-2026-11-13`: diasPausado 15, PEPT resolvida 13/11 em análise) → **vence 27/11**. Teste em pept.test.ts com o caso (B438 recebida e pausada 28/10, resolvida 13/11 → 27/11).
- **Marco sem O.S. (12/11)**: "por hora não tem nada cadastrado pro Marco" — as O.S. dele saíram de `Dados/os-reais.json`, a
  produção tira as que estiverem no navegador uma vez (atualização `removerResp: 'rt'` em `Dados/atualizacoes.json`) e o
  `importar-pastas.ts` só lê a pasta do Luan (para voltar, recolocar `['2 - <NOME DO RT> RT', 'rt']` em `TECNICOS`).
- **Contador do ícone de E-mails (12/11)**: conta **todo e-mail da Caixa não aberto** (antes só O.S. nova e PEPT); o sininho continua só com O.S. nova e PEPT resolvida (`notificaveis`).
- **E-mail só fica lido ao clicar (12/11)**: virar O.S. (`importarDoEmail`) não marca mais o e-mail como lido; "Conclusão da Ordem de Serviço" (sem anexo) é Aviso, não O.S. nova. Os e-mails que viraram O.S. desde `ativoDesde` voltaram a não lidos uma vez (`emailsNaoLidosDesde`).
- **E-mails lidos (12/11)**: na aba E-mails, o e-mail já aberto fica **cinza** na lista (`.email-lido`); os novos seguem com bolinha verde e negrito.
- **Não conclui com PEPT em aberto (12/11)**: pausada ou resolvida esperando validar, a O.S. não pode ser concluída (`podeConcluir` em lib/pept.ts; `mudarStatus` recusa; o botão Concluir some do cartão e fica apagado na janela com o motivo). Antes, concluir encerrava a PEPT sozinho — saiu.
- **PEPT esperando validar (12/11)**: o cartão do Kanban ganha contorno **amarelo** fixo (`.card-validar`, #eab308) e o selo "Validar" também amarelo (`.chip-validar`) até a PEPT ser validada ou reaberta.
- **Nº da Caixa no topo da janela da O.S. (16/11)**: na linha das etiquetas (prazo · tipologia · etapa), no extremo direito, aparece "Nº 7886.xxxx.xxxxxxxxx/2026.01.01" com ícone de copiar (`NumeroCaixa` em OsDetail.tsx); clicar copia.
- **"Em aberto" = toda O.S. não finalizada (16/11)**: recebida, em andamento ou em PEPT (`naoFinalizada` em lib/passos.ts). Vale no cartão "O.S. em aberto" do Início e no filtro Fase › Em aberto da Lista (mesma contagem); Em andamento e Em PEPT continuam com as próprias contagens.
- **Selo "Vence hoje" vermelho (16/11)**: no cartão "Prioridade agora" do Início o selo de prazo fica vermelho quando vence hoje ou já venceu (`corPrazo` em Painel.tsx); "Vence amanhã"/≤3 dias seguem laranja.
- **Dados da O.S. no cartão "Prioridade agora" (19/11, aprovado pelo usuário)**: chip "Caixa 1158920" (nº curto, copia o completo) na linha do OS-N; abaixo da caixa "Agora", em **duas colunas** (para caber na altura fixa do Início): à esquerda "Contato da vistoria: Nome", telefone (liga) + chip verde **WhatsApp** (abre a conversa, sem mensagem) e rua, nº; à direita "Recebida em dd/mm", **"Ficou parada N dias em PEPT"** (só PEPTs **encerradas**; a em aberto não aparece porque não tem duração definida; sem datas, tipo nem motivo) e "Prazo final dd/mm" (já recalculado). Sem valor, sem matrícula. `components/DadosPrioridade.tsx`; cores `.prio-zap`/`.prio-pept` em index.css (claro e escuro). A tipologia na linha do OS-N é a **etiqueta colorida igual à das Ordens de Serviço** (`TipologiaChip`), em toda O.S.
- **Menu lateral maior (19/11, pedido do usuário)**: texto dos itens 15 px (era 13,5), ícones 20 px (eram 17), altura 42 px, títulos GERAL/SISTEMA 11,5 px, "Recolher menu" 13,5 px; o texto não quebra linha (`.aba > span` com reticências). Largura do menu continua 236 px. Perfis do "Ver" (Minhas/Marco/Todas) também maiores: avatares 26 px (eram 20), ícone de Todas 24 px (era 17); recolhido, cada um tem 46 px de altura (cabe a coroinha).
- **Foto de perfil (19/11)**: Configurações › Meu Perfil › "Foto de perfil" (Escolher/Trocar foto, Remover; `components/FotoPerfil.tsx`). A imagem é cortada em quadrado pelo meio e reduzida a 256 px JPEG (`reduzirFoto`), guardada em `responsaveis.luan.foto` (data URL, vai no backup/pasta). O `Avatar` (ui.tsx) e o botão do canto superior direito (`MenuUsuario`) mostram a foto no lugar da inicial; a coroinha continua. **Enquadramento**: ao escolher, abre "Ajustar foto" (arrastar + zoom 1–3× na barra ou na rodinha); "Ajustar enquadramento" reabre depois. Guarda `fotoOriginal` (até 800 px) e `fotoEnq` {zoom, x, y}. A foto **não tem contorno** (o contorno verde parecia um risco na coroa).
- **Financeiro sem repasse (19/11, pedido do usuário)**: saiu tudo do repasse de 40% do RT ("Participação no RT", "Total consolidado", "Potencial a faturar" com 40%, "Seu repasse", coluna/linha "Sua parte", Origem "Meu/Participação RT", "Sua parte (40%)" na janela da O.S. e os campos de repasse em Configurações › Financeiro). Carteira = **RT Luan · RT Marco · Total da empresa**; cada RT mostra o próprio faturamento (finalizado), previsto, em aberto, a faturar e faturado, e a tabela só as O.S. dele; Total da empresa mostra Faturamento total, Faturamento RT Luan, Faturamento RT Marco, Em aberto e Deslocamento. A meta do mês agora é da empresa (finalizado total) e aparece no Total da empresa. As funções antigas (`repasseDe`, `painelMinhas`, `painelEquipe`) seguem em lib/faturamento.ts com testes, sem uso nas telas; `repasseRT`/`repasseBase` continuam no config só por compatibilidade.
- **Sem "nota por O.S." (19/11, regra do usuário)**: a nota fiscal é **uma só, no fim de cada mês, com as O.S. finalizadas** (tela Fechamento do mês). Saíram do Financeiro os cartões "A faturar (sem nota)" e "Valores faturados" (no lugar, na visão de cada RT: **Deslocamento** e **Projeção de fechamento**), os indicadores iguais no Total da empresa, o filtro de situação (A faturar/Faturadas), as colunas Status e Faturada (botão Marcar), o detalhe "Nota fiscal" e as colunas Situacao/Faturada do CSV; a tabela segue mostrando só as finalizadas. Na janela da O.S. saíram a etiqueta "Faturada" e o campo Faturada com Marcar/Desmarcar. Os campos `faturada`/`faturadaEm` e `marcarFaturada` continuam no store só por compatibilidade. Não voltar a pôr nota por O.S.
- **"Faturamento total" no lugar da Meta do mês (19/11)**: no Financeiro › Total da empresa (período Mês), o cartão do topo é "FATURAMENTO TOTAL R$ x" (finalizado da empresa no mês) e, no fim da linha, "Em aberto R$ y · N O.S. não finalizadas" = soma (serviço + deslocamento) de **todas as O.S. não finalizadas e não canceladas recebidas no mês ou em meses anteriores** (`emAbertoAte` em lib/faturamento.ts, com teste). Barra: finalizado × em aberto; rodapé com finalizado, em aberto e "no ritmo atual fecha em". Saiu a meta (texto, marcador, "faltam") e a seção Financeiro de Configurações (só tinha repasse e meta); `metaMensal` fica no config só por compatibilidade.
- **Notas fiscais no "Últimos 6 meses" (19/11)**: no Financeiro › Total da empresa, botão **Notas fiscais** no cartão "Últimos 6 meses" abre a janela (`components/NotasFiscais.tsx`) com os 6 meses do gráfico: digitar o valor da nota de cada mês ou **Importar XML das notas** (vários de uma vez; NFS-e ABRASF ou padrão nacional: valor dos serviços, competência e número, `lerNotaXML` em lib/notasFiscais.ts com teste; notas do mesmo mês somam, mesmo número não entra duas vezes, `juntarNotas`). Guardado em `config.notasFiscais` ({mes, valor, numeros}). No gráfico, cada mês com nota ganha uma **linha laranja tracejada** na altura do valor, com o valor em cima (`.nf-marca` em index.css) e "Nota fiscal R$" no balão; só no Total da empresa (a nota é da empresa). PDF não é lido (só XML ou digitado).
- **Número e tipologia nos cartões do Início (19/11)**: em "O.S. em aberto", "O.S. em andamento" e "O.S. em PEPT" cada linha é **OS-N · etiqueta da tipologia · nome · (prazo/passo/dias)** (`Bloco` em Painel.tsx); o nome encurta com reticências se faltar espaço. No cartão "Prioridade agora" o telefone não quebra linha e o espaço entre as linhas dos dados é 4 px, para caber em 1280 × 800 com o menu aberto.
- **Etiqueta da tipologia antes do selo de prazo (19/11)**: na janela da O.S. a ordem é tipologia · prazo · etapa (era prazo · tipologia). Vale sempre: a tipologia vem antes do status de prazo.
- **"Aplicar no meu sistema local" = ESTA pasta** (`OneDrive\FLUXO CAIXA`, o atalho abre `Dados\Fluxo_Caixa.html`): mudar `app/src` e rodar `cd app && npm run build:single`; pedir para fechar e abrir o atalho. Não confundir com as cópias em `OneDrive\CLAUDE\MIGRAÇÃO FLUXO CAIXA` (pedido de 19/11).
- **Janela da O.S. (12/11)**: O.S. em PEPT (pausada ou resolvida esperando validar) abre direto na aba **PEPT**; as outras no Passo a passo.
- **Passos da rota em sequência (13/11)**: as abas Selecionar → Montar → Agendar → Confirmar → Exportar abrem uma depois da outra; só se libera o passo seguinte pelo botão do rodapé do passo atual (`rota.etapa` = último liberado; rotas antigas sem o campo: criada → 5, algum confirmado → 4, algum agendado → 3, senão 1; `ir`, `liberado`, `abaBloqueada` em pages/Rota.tsx). Rascunho abre no passo liberado. "Concluir rota" tira a rota do Planejar (`escolher('')`) e o planejador volta a sugerir uma rota nova com as O.S. que sobraram.
- **Concluir rota = vistorias feitas (13/11)**: `avancarRota` (confirmada → concluída) aplica `vistoriaFeitaPelaRota` (lib/rota.ts) a cada parada: vistoria feita no dia da rota e na hora combinada, passos Marcar/Fazer vistoria marcados, Recebida → Em Andamento; assim as O.S. não voltam ao planejador. Rotas já concluídas antes: o `merge` do store aplica `vistoriasDasRotasConcluidas`. Para refazer uma vistoria, desmarque o passo "Fazer vistoria" na O.S.
- **Rotas (12/11)**: O.S. com a vistoria já feita (`vistoria.feita` ou passo Fazer vistoria marcado) não aparecem no planejador (`elegivelParaRota`).
- **Ícone do Financeiro (12/11)**: **cifrão** (`DollarSign` do lucide), pedido do usuário (antes testado o gráfico subindo do FLUXO ARQ, `components/IconeFinanceiro.tsx`, que ficou sem uso).
- **PEPT resolvida por e-mail (12/11)**: com o Gmail ligado (Configurações › Gmail, script do Google, só código, sem IA), o sistema busca os
  e-mails ao abrir e a cada 5 min em qualquer tela (Layout); "PEPT resolvida" tira a O.S. da pausa, o cartão mostra
  "Validar" e o Início ganha o alerta "PEPT da OS-x resolvida pelo cliente em dd/mm: confira e valide ou reabra".
- Mudança visual: uma tela por vez, mostrando o resultado antes de seguir (mesma regra do FLUXO ARQ).

## Rodar

- **Uso do dia a dia (igual ao FLUXO ARQ):** dois cliques em `Abrir Fluxo Caixa.cmd`, que abre
  `dist/Fluxo_Caixa.html` no Chrome em modo aplicativo (gera o arquivo na primeira vez). Para ter o
  ícone na área de trabalho: `Criar atalho do sistema.cmd` (usa `ferramentas/criar-atalho.ps1`).
  Depois de mudar o código, rode `cd app && npm run build:single` para atualizar `dist/Fluxo_Caixa.html`.
- Desenvolvimento: `INICIAR-FLUXO-CAIXA.bat` ou `cd app && npm install && npm run iniciar` (porta 5173).
  Os dados do `localhost:5173` e do arquivo local ficam separados (origens diferentes do navegador).
- `npm test` (Vitest, 152 testes devem passar) · `npx tsc --noEmit` · `npm run build:single`.
- Requer Node.js LTS. Se faltar, peça para o usuário instalar em https://nodejs.org/pt.

## Stack e estrutura

React 19 + Vite 6 + TypeScript 5.8 + Tailwind 4 + Zustand 5 (persist, chave `fluxocaixa-v3`
com `merge` para campos novos; backups antigos são convertidos) + react-router-dom 7 (HashRouter) + date-fns 4 (ptBR) + @dnd-kit +
lucide-react + Vitest 3.

```
app/src/types.ts           tipos iguais ao sistema real (OS com as 7 abas de dados, Status, Tipologia, Rota, Config)
app/src/data/seed.ts       dados de exemplo e CONFIG_PADRAO (todas as O.S. em Ariquemes, uma por bairro em rodízio — pedido do usuário;
                           `exemploParaAriquemes` migra no `merge` do store as O.S. de exemplo `os-N` salvas com outra cidade)
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
  **Módulo de Rotas reestruturado em 06/11/2026** (pedido do usuário: "estruture o módulo de rotas por inteiro conforme eu
  expliquei": mapa que organiza a rota por bairro e proximidade da partida, paradas arrastáveis para cima/baixo, coordenadas
  que geram a rota no Google Maps/Waze para copiar e abrir no celular; ele recusou a tela antiga de Roteirizador + lista + janela
  e o mapa "muito horizontal, destoando do restante"; depois pediu: "os cards de cada O.S. mostrem sempre o campo de colocar a
  coordenada", "todas as O.S. em aberto aparecem e eu seleciono quais vão incluir", "por padrão o sistema deve sugerir uma rota
  com as O.S. em aberto e o usuário edita"). **Uma tela só** (`pages/Rota.tsx`): cabeçalho "Rotas" e o seletor `.seg seg-baixo`
  **Planejar · Rotas salvas** (`?aba=rotas`). **Planejar** (`Planejador`) ocupa a altura toda até o rodapé (medida como o
  Kanban): **painel à esquerda (430 px) + mapa grande à direita**; em tela estreita (< 1024 px) o painel fica em cima com
  65% da altura (rola por dentro) e o mapa embaixo com 360 px, e a página rola. **Rota sugerida**: sem rota ativa do técnico, o sistema cria
  sozinho um rascunho com **todas as O.S. em aberto** (elegíveis), já em ordem por bairro/proximidade da base (`sugerirRota`,
  descrição "Sugestão com as O.S. em aberto"); o botão **Nova** sugere outra com as que não estão em nenhuma rota. Painel
  (`PainelRota`, `key` = id da rota) **no visual do resto do sistema** (pedido de 06/11: "o design está diferente do restante,
  deixe mais didático"; depois "o design tá ruim, a aba 4 tá cortada"): cabeçalho com código/situação/avatar/data, passos num
  `.seg seg-linha seg-passos` (o seletor escuro das abas da O.S.; `.seg-passos` deixa as 5 abas encolherem para caber no painel
  — letra 11,5px, rótulos curtos Selecionar · Montar · Agendar · Confirmar · Exportar), faixa `faixa-resumo` com a explicação do passo e, embaixo, a lista
  sobre o **fundo das colunas do Kanban** (`.lista-rota` = `--kb-col`) com **cartões iguais aos do Kanban aprovado**
  (`bloco card-kanban`, miolo `MioloOS`: OS | tipologia, cliente, etiqueta POLO, cidade em negrito · bairro · rua). **5 passos**
  (`PASSOS`, com a dica de cada um; **Agendar e Confirmar são abas separadas** — pedido de 06/11 "adicione mais uma aba e separe
  agendamento de confirmação"): rascunho abre em 1, rota criada abre em 5 (Exportar) se exportável, senão em 4 (Confirmar).
  Abas bloqueadas (`abaBloqueada`): 4 Confirmar só depois de pelo menos um cliente agendado; 5 Exportar só com `exportavel`.
  **1 Selecionar** = todas as O.S. em aberto do técnico, por cidade (sem "marcar todas": o usuário pediu para tirar), cartão com **caixa de marcar**
  (clicar no cartão também marca; marcada = contorno verde `.card-rota.marcado` + chip "Na rota") e o **campo de coordenadas
  sempre à mostra** (`CampoCoordenadas`: sem borda quando já tem coordenadas, pino verde; laranja e com borda quando falta; colar
  outras salva ao sair/Enter, chip "salvar"/"não entendi", ícone Maps). **2 Montar** = cartão **Origem** destacado (`.card-origem`: faixa laranja à esquerda, fundo quente, ícone casa laranja, nome em
  caixa alta grande — pedido de 06/11 "dê destaque para o card de origem"; `CampoOrigem`: nome do lugar +
  coordenadas coladas do Maps, salva ao sair/Enter em `rota.partida` e refaz a ordem por bairro se o usuário ainda não arrastou;
  link "base padrão" abre `TrocarBase`), Saída (dia/hora), cartões das paradas **agrupados por bairro** (etiqueta verde na primeira de cada bairro) com número + alça de
  arrastar à esquerda, chip ~hora prevista, X e o campo de coordenadas; arrastar marca `rota.ordemManual` (adicionar O.S. deixa de reordenar sozinho); botão **Por bairro**
  reordena e limpa a marca; rodapé **"Agendar →"** (só com todas as coordenadas). **3 Agendar** e **4 Confirmar** (fluxo pedido em 06/11: agendar →
  **esperar os clientes confirmarem** → só então criar a rota → exportar; as duas abas mostram a mesma lista de cartões, cada uma
  com a sua ação: a 3 só manda o horário, a 4 só marca a resposta do cliente) = uma linha por parada na ordem da rota: cliente, contato,
  telefone, bairro, **hora combinada** (`parada.hora`, vem da hora prevista; mudar reagenda a vistoria com `agendar` quando a rota
  já foi criada), botão **WhatsApp** com a mensagem de Configurações preenchida ({contato} {cliente} {endereco} {data} {hora}
  {os}; clicar marca `parada.avisado`). Cada parada é um cartão `.card-agenda` em duas partes (redesenho de 06/11 "para o
  usuário entender que é preciso confirmar se o cliente confirmou"): em cima quem/telefone/bairro e a hora; embaixo a **trilha**
  `.trilha-agenda` **1 Agendar → 2 Cliente confirmou? → ✓ Confirmado** (passo atual em laranja, feitos em verde; o
  "Confirmado" só aparece quando o cliente confirmou de fato — pedido de 06/11) e a faixa
  `.acao-agenda` com o texto e a ação do momento. **Na aba 3 Agendar**: etapa 0 "Ainda não agendado" + botão **Agendar pelo WhatsApp** (marca
  `parada.avisado`) + link "já agendei por telefone"; etapa 1 "Agendado para HH:MM. A resposta do cliente é marcada no passo Confirmar" + Reenviar + desfazer;
  etapa 2 "Agendado e confirmado" + Reenviar. Faixa da aba 3: laranja "N sem agendar" ou verde "Todos agendados, siga para Confirmar";
  rodapé **"Confirmar →"** (habilita com pelo menos um agendado). **Na aba 4 Confirmar**: etapa 0 "Ainda não agendado: volte ao passo
  Agendar"; etapa 1 "Agendado. O cliente respondeu que o horário está bom?" + botão **Cliente confirmou** (marca `parada.confirmado`) + reenviar;
  etapa 2 "Agendamento confirmado pelo cliente para HH:MM" + desfazer.
  O campo de coordenadas dos cartões (`CampoCoordenadas`, `.campo-coord`) tem rótulo "Coordenadas do imóvel · clique para corrigir
  o ponto da rota" / "cole do Google Maps…", borda tracejada (laranja sem coordenada) e ícone de lápis, para ficar claro que é editável. Faixa: laranja "N sem agendar · aguardando N confirmar" com o botão **"Confirmar só com os confirmados"** (tira da rota
  quem não confirmou e cria), verde "Todos os agendamentos confirmados"; aviso de paradas sem coordenadas. Rodapé
  **"Criar rota"** (só com todas as coordenadas e todos confirmados; = `avancarRota`: rascunho → confirmada, marca a vistoria de
  cada parada no dia) e vai ao passo 5. Chips de status da rota: rascunho = "Planejando", confirmada = "Criada". Rotas salvas antes
  dessa marca ganham agendado+confirmado no `merge` do store. **Exportável** (`exportavel`) = rota criada **e** todas as paradas
  confirmadas (pedido de 06/11: "só exportar depois da rota confirmada e criada"): a aba 5 fica desabilitada (`.seg button:disabled`)
  e o botão "Exportar →" do passo 4 também, com o motivo no title (`porQueNaoExporta`); desmarcar um cliente numa rota criada mostra
  a faixa laranja "Rota criada, mas N ainda não confirmaram: exportação bloqueada". Rota criada abre no passo 5 se exportável, senão
  no 4. **5 Exportar** = se não exportável mostra só o aviso com o motivo (volta ao 4); exportável: 3 cartões (paradas, km ida e volta "pelas ruas", tempo), **Google Maps · rota completa** (partida → paradas →
  volta num link só; `linksGoogleMaps` divide em partes emendadas acima de 9 paradas, limite do Maps) com Copiar + Abrir, **"Copiar
  roteiro em texto"** (`textoRoteiro`: paradas com hora e endereço + link), e **Waze** parada por parada (o Waze não aceita várias
  paradas num link — explicado na tela); rodapé Concluir rota / Cancelar. Cabeçalho: as rotas ativas aparecem **pela data** ("07/11/2026 · 08:00 (N)", em
  ordem de data, select de largura fixa quando há mais de uma; o código fica pequeno ao lado) — pedido de 06/11, "não pelos códigos".
  **"Nova" só habilita se houver O.S. em aberto fora de rota** (`livres`); sem nenhuma, a dica diz para editar uma rota existente e a
  sugestão automática também não cria rota vazia.
  Rodapé comum: ← passo anterior, contagem · km · tempo, botão do próximo passo e a lixeira (Excluir pede confirmação). Mapa (`MapaOS` com
  `children` = botões por cima: **Laço +** marca as O.S. do contorno, **Laço −** desmarca, **Partida**): pontos azuis = em aberto
  (clicar marca), verdes numerados = na rota (clicar desmarca), caminho tracejado. Ordem automática: `ordemPorBairro` em
  lib/rota.ts (termina um bairro antes de ir ao próximo, começando pelo mais perto da partida; dentro do bairro vai ao ponto
  mais próximo). Links: `linkGoogleMaps` (partida → paradas na ordem → volta; sem coordenadas usa o endereço escrito) e
  `linkWaze`. **Rotas salvas** (`ListaRotas`): filtros Status/Período, 3 números, lista por técnico; clicar abre a rota no mapa.
  Saíram: Roteirizador antigo, janela `DetalheRota`, `CriarRota` e `DefinirLocalizacao`.
  **Mapa real (06/11, "use um mapa de API free")**: `MapaOS` é **MapLibre GL** (`maplibre-gl` 5.24, vetorial, suave como o
  Google Maps) com estilos gratuitos e sem chave: tema claro = **Liberty do OpenFreeMap** (`tiles.openfreemap.org/styles/liberty`),
  tema escuro = **Eclipse do VersaTiles** (`tiles.versatiles.org/assets/styles/eclipse/style.json`); troca sozinho pelo
  `data-theme` (`MutationObserver` + `setStyle`, e as camadas da rota/laço são recriadas no `style.load`). Recusados antes:
  grade SVG, OpenStreetMap puro (não parece o Maps), Esri raster (ficou "errado"/travando), CARTO (passou a exigir chave).
  **Como a biblioteca é carregada (importante)**: o Vite quebra o worker do MapLibre ao importar o pacote como módulo (o
  `getWorkerUrl()` fica vazio e o mapa fica em branco, mesmo no 5.x; no 6.x o worker é um arquivo separado e também falha). Por
  isso `MapaOS.tsx` importa `maplibre-gl/dist/maplibre-gl.js?raw` e o executa como `<script>` (função `maplibre()`, que devolve
  `window.maplibregl`); só os **tipos** vêm de `import type … from 'maplibre-gl'`. Funciona no `localhost:5173` e no
  `dist/Fluxo_Caixa.html` (testado). Não trocar por `import maplibregl from 'maplibre-gl'`. Marcadores são elementos DOM
  (`.mk`, `.mk.sel`, `.mk-base` em index.css), tooltip = `Popup` no mouse, caminho da rota = fonte GeoJSON `rota` + camada de
  linha tracejada, laço = fonte `laco` (fill + line; pointer events no contêiner, `map.unproject`, `dentroDoPoligono`).
  Desempenho: marcadores só são redesenhados quando a chave em texto dos pontos muda (`chaveDesenho`), `pontos` memoizado na
  tela; enquadramento (`fitBounds` sem animação) só quando o conjunto de pontos muda e quando o tamanho do contêiner muda
  (`ResizeObserver`). Sem `altura`, o mapa ocupa a altura do pai (`h-full`). O StrictMode monta o mapa duas vezes: as chaves de
  desenho são zeradas ao criar o mapa. Precisa de internet para as ruas; sem internet aparece um aviso e os pontos continuam.
- **Caminho pelas ruas** (06/11, pedido: "não considerar linha reta"): `lib/trajeto.ts` usa o **OSRM público**
  (`router.project-osrm.org`, grátis, sem chave, dados OpenStreetMap). `buscarTrajeto` (route: km, minutos por trecho e
  linha GeoJSON) e `buscarMatriz` (table: distâncias partida ↔ todas as O.S. em aberto), com cache por URL e `fetch`
  injetável nos testes. No Planejador: a matriz vira `dist` (`distanciaPelaMatriz`) passado a `ordemPorBairro`/`ordemOtimizada`
  (parâmetro opcional; linha reta é o padrão), e a sugestão em rascunho não arrastada é reordenada quando a matriz chega; o
  trajeto da rota atual (debounce 300 ms) dá km, horários (`horariosPorTempos` + `minutosPorParada`) e a linha cheia do
  mapa (`MapaOS` prop `trajeto`; sem ele, tracejado reto). Sem internet volta à estimativa reta × 1,3 e o rodapé avisa
  "em linha reta (sem internet)". A lista Rotas salvas continua com a estimativa reta (não busca).
- Melhorias do laboratório que o real não tem: Financeiro com as visões Só minhas/Minha equipe/Geral,
  repasse de 40% e meta; Fechamento mensal (RRT e NF) em /financeiro/fechamento; abas Documentos e
  Histórico no detalhe; otimizar ordem e hora estimada nas rotas; notificações calculadas.
- **Módulo E-mails da Caixa** (/emails, 20/10): caixa de entrada só com remetentes @caixa (`lib/emails.ts`,
  `ehDaCaixa`), contador de não lidos no ícone do menu, notificação no sininho e contador só para e-mail de O.S. nova e de PEPT resolvida (`notificaveis`; aviso, prazo e cancelamento não notificam), leitura
  em duas colunas e "Importar O.S." do anexo .txt (usa o leitor do SIOPI). No laboratório os e-mails são de
  exemplo e há o botão "Simular novo e-mail".
  **Ponte Gmail → sistema (10/11, pedido "quando chegar uma O.S. por e-mail, mandar para a aba E-mails")**: o sistema não tem
  servidor, então o Claude faz de carteiro. Skill `/caixa-emails` (`.claude/skills/caixa-emails/SKILL.md`, fora do git): busca no
  Gmail do Luan (`do usuário (endereço em Dados/gmail.json)`) os e-mails de `@caixa.gov.br` (convocação de O.S. de `AGxxxx@caixa.gov.br` com o
  .txt `CONVOCACAO PRESTACAO SERVICO.TXT` dentro do e-mail; PEPT resolvida de `siopi@caixa.gov.br`), baixa cada um em formato
  RAW (base64url, o anexo vem dentro), salva os brutos no scratchpad e roda `node scripts/caixa-emails.ts <brutos> "<raiz>/Caixa de
  entrada/emails.json"`. O script usa `lib/mime.ts` (`lerMime`, `emailDoGmail`: cabeçalhos, charset ISO-8859-1 do SIOPI, quoted-printable,
  base64, multipart, anexo .txt sem os NUL) e só acrescenta ids novos (`gm-<id do Gmail>`). Na aba E-mails o botão **Importar e-mails**
  (`importarEmails` no store → `lerArquivoCaixaDeEntrada` + `mesclarEmails` em lib/emails.ts) lê o `emails.json`, entra só o que
  ainda não está no sistema (lido/importada/PEPT dos antigos ficam) e roda `aplicarPeptsResolvidas`. A pasta **"Caixa de entrada"
  está no .gitignore** (dados reais de clientes — nunca no repositório, nos testes ou aqui). Os testes de `mime.test.ts` usam
  dados fictícios no formato real da Caixa.
  **Ligação automática (10/11, Google Apps Script)**: `ferramentas/gmail-script/Code.gs` roda na conta Google
  `do usuário (endereço em Dados/gmail.json)` (projeto "Fluxo Caixa - Gmail"), publicado como App da Web (executar como Eu, acesso Qualquer
  pessoa, protegido por `TOKEN`). `doGet(token, desde)` responde `{ ok, emails: Email[] }` com os e-mails `from:caixa.gov.br`
  (anexo .txt via `getAttachments`, plano B pelo bruto). No sistema: `config.gmail = { url, token, criarOs }` (Configurações ›
  Gmail, componente `Gmail` com Testar e buscar agora e o passo a passo), `sincronizarGmail` no store (`urlPonteGmail`,
  `desdeParaSincronizar` = 2 dias antes da última busca ou 14 dias (a primeira busca demora ~20 s; o script só lê o e-mail bruto nas convocações), `lerRespostaPonte`, `receberEmails` que mescla, aplica PEPTs
  e, com `criarOs`, chama `importarDoEmail` para cada .txt novo), `gmailUltimaSinc`/`gmailUltimoErro`. A aba E-mails busca ao
  abrir e a cada 5 min (`Buscar no Gmail`; sem ligação mostra `Ligar ao Gmail`) e a faixa "Gmail ligado · última busca". O token
  real fica só na conta Google e nas Configurações do navegador do usuário — nunca no repositório. Para gravar a ligação no
  sistema real sem digitar: abrir `Fluxo_Caixa.html#/configuracoes?secao=gmail&url=<exec>&token=<senha>` (a seção Gmail grava,
  limpa o endereço e já testa). No navegador ficam no máximo `MAX_EMAILS_GUARDADOS` (400) e-mails, os mais recentes.
- **Nova OS** (20/10): sem a janela de escolha; abre direto a janela grande (1034 px) com as abas **Arquivo · Manual · E-mail** (`NovaOS.tsx`; Manual = `OsForm` com `topo`). **Altura fixa** `min(720px, calc(100vh - 48px))` nas três abas (prop `altura` de `ImportarOS` e `OsForm`, só na Nova OS — pedido de 10/11: a janela não pode mudar de tamanho ao trocar de aba; o conteúdo rola por dentro) e **sem barra de rolagem à mostra** (`semBarra` do `Modal` → `.rolagem-invisivel`, rola normalmente; pedido de 10/11). A janela de editar O.S. continua com altura livre. Importar O.S.: Arquivo (primeiro a caixa para colar o texto, depois arrastar .txt) com pré-visualização e bloqueio de duplicadas; E-mail
  só explicado (sem Gmail no laboratório).

- **Processo real (dito pelo usuário em 20/10/2026):** não assinam laudo, não emitem nota, a Caixa não
  devolve laudo e não há integração com o sistema da Caixa; só a importação automática das O.S. pelo
  Gmail. Não há registro de tentativas de contato (o contato é direto; o sistema só organiza o trabalho).
  **Passo a passo do serviço Caixa** (20/10): O.S. recebida → Baixar as documentações → Analisar documentos →
  Abrir PEPT (se necessário) → Marcar vistoria → Fazer vistoria → Fazer avaliação → Preencher SIMIL → Baixar o
  laudo → Assinar → Enviar. É um checklist dentro da O.S. (aba "Passo a passo", a primeira; `lib/passos.ts`,
  ação `marcarPasso`); **passos pela etapa (12/11)**: Em Andamento ou com PEPT → recebida, baixar e analisar documentos feitos (Abrir PEPT feito com o dia da 1ª abertura); Assinatura Pendente → tudo até antes de Assinar; Assinatura Concluída → falta só Enviar; as etapas do sistema real continuam e Fazer vistoria/Baixar laudo/Assinar/Enviar andam a
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

## Amostragem (18/11/2026)

Módulo novo no menu (ícone casa com lupa, logo depois de Fichas de Pesquisa; as Fichas de Pesquisa não mudaram):
amostragens de dados de mercado para avaliação de imóveis (NBR 14653), trazido do `fluxo-frontend` (sistema novo).
- Telas em `app/src/pages/amostragem/`, cálculo/catálogo/Excel em `app/src/lib/amostragem/` (iguais aos do sistema novo),
  dados em `app/src/store/amostragens.ts`, no navegador, chave própria `fluxocaixa-amostragens` (as O.S. não mudam de lugar).
- Assistente didático (do zero, importar Excel ou compor com dados de outras amostragens), abrangência Cidade | Bairro,
  prazo de validade livre, planilha com jeito de Excel (colar bloco do Excel cria as linhas, Enter desce, arrastar
  títulos reordena colunas, "+ Coluna", barra de linhas), dado com coleta vencida em amarelo, fonte obrigatória,
  lista agrupada por cidade, Excel com nome/CNPJ/telefone de Configurações › Empresa e rodapé do FLUXO.
- O ExcelJS vai embutido (import estático em `lib/amostragem/excel.ts`): o `Dados/Fluxo_Caixa.html` é um arquivo único
  e não carrega pedaços à parte.
