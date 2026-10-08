# Roteiro para o Cowork: capturar o FluxoGestor atual

Cole o texto da seção "Prompt" numa conversa do Cowork no seu computador. O Cowork usa o seu
navegador já logado, então eu consigo comparar o clone com o sistema real sem receber sua senha.

## Antes de começar

1. Abra https://fluxogestor.tech no Chrome e faça o login você mesmo.
2. Deixe a pasta `captura-fluxogestor` criada num lugar que o Cowork consiga gravar.
3. Depois de pronto, envie a pasta (ou só os `.png` e `.md`) para esta conversa.

## Prompt

```
Quero copiar o funcionamento e as telas do sistema FluxoGestor (https://fluxogestor.tech) para
um clone de teste. Já estou logado no navegador. Faça só LEITURA.

REGRAS DE SEGURANÇA (valem acima de tudo)
- Nunca digite senha nem faça login.
- Não clique em nada que altere dados: salvar, enviar, emitir, excluir, aceitar convocação,
  finalizar, marcar como concluída, transferir, importar. Se um botão assim existir, apenas
  descreva o que ele faz pelo texto e pelo ícone.
- Pode abrir menus, abas, filtros, ordenação, paginação, linhas expansíveis e janelas de detalhe.
- Não clique em links que levem para fora do fluxogestor.tech.

O QUE FAZER, EM CADA ITEM DO MENU LATERAL E EM CADA SUBABA
1. Tire uma captura de tela da página inteira (rolando se precisar).
2. Escreva um arquivo .md com:
   - título e subtítulo da tela
   - filtros: rótulo, tipo (busca, lista, período, alternância) e todas as opções
   - cartões de indicador: rótulo, valor de exemplo, texto de apoio e o texto do tooltip "i"
   - gráficos e barras: o que mostram, rótulos, cores e como o valor é calculado se aparecer
   - tabelas: nome e ordem de cada coluna, o que cada coluna mostra, ordenação, paginação,
     colunas escolhíveis, linha expansível (o que aparece ao expandir)
   - botões, menus e ícones de ação por linha, com o texto exato
   - estados vazios e mensagens de ajuda
   - qualquer regra de negócio visível (por exemplo, "repasse de 40%")
3. Para as O.S.: abra 3 O.S. de situações diferentes (somente visualizar) e descreva campos,
   abas, botões, histórico e a ordem dos passos do fluxo (convocada até concluída).
4. Para o módulo de rota ou agenda: descreva como se monta a rota, o que se pode editar e
   como é a ordenação.
5. Para o Financeiro: faça as três visões (Só minhas, Minha equipe e a visão geral do RT),
   em pelo menos dois meses diferentes, anotando as fórmulas que os tooltips explicam.

PRIVACIDADE
- Antes de salvar, troque nomes de clientes, CPF, telefone, matrícula e endereço completo por
  exemplos fictícios, tanto nas imagens (borre ou cubra) quanto nos textos.

ENTREGA
Crie a pasta captura-fluxogestor com:
- 00-indice.md: lista das telas na ordem do menu, com uma linha sobre cada
- NN-nome-da-tela.png e NN-nome-da-tela.md para cada tela e subaba
- duvidas.md: tudo que não ficou claro ou que exigiria clicar numa ação que altera dados
```

## O que eu faço com o material

- Comparo cada tela do clone com a captura e corrijo colunas, filtros, textos e regras.
- Marco no documento de visão geral o que já está igual e o que falta.
- As dúvidas do `duvidas.md` viram perguntas objetivas para você.
