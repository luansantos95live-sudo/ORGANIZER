# Molde do FluxoGestor Arq: como replicar e melhorar o sistema original

Este documento descreve o jeito de construir usado no clone, para repetir o mesmo caminho em
cada aba do sistema original. A ordem é sempre a mesma: capturar, modelar, calcular com testes,
desenhar a tela, comparar, publicar.

## 1. Stack e comandos

| Peça | Escolha | Por quê |
|---|---|---|
| Interface | React 19 + TypeScript | tipos pegam erro de dado antes de rodar |
| Build | Vite 6 | compila em segundos, gera um único bundle |
| Estilo | Tailwind 4 + tokens em CSS | o tema claro e escuro troca só as variáveis |
| Estado | Zustand com persistência | simples, salva no navegador, fácil de trocar por API |
| Rotas | HashRouter | funciona em qualquer hospedagem e em arquivo único |
| Datas | date-fns (pt-BR) | cálculos de prazo e período |
| Testes | Vitest | regras de negócio ficam fora da tela e são testadas |

```bash
cd app
npm install
npm run dev            # desenvolvimento
npm test               # regras de negócio
npm run build:single   # um HTML só, pronto para publicar como página de teste
```

## 2. Estrutura de pastas

```
app/src
  types.ts            tipos do domínio (O.S., rota, config, fechamento)
  data/seed.ts        dados de exemplo e configuração padrão
  store/useStore.ts   estado, ações e persistência (versão no nome da chave)
  lib/                regras puras, sem React, cada uma com testes em lib/__tests__
  components/         peças reutilizáveis (ui.tsx, Layout.tsx, formulários, importação)
  pages/              uma tela por arquivo, ligada em App.tsx
  index.css           tokens de cor e classes de componente
app/scripts/build-single.mjs   junta JS e CSS num HTML
docs/                 análise, design system, roteiro de captura, este molde
```

Regra de ouro: **conta e regra ficam em `lib/`, tela só mostra**. Foi isso que permitiu testar
o faturamento, a rota e o leitor do SIOPI sem abrir o navegador.

## 3. Design system

- **Tokens** no começo de `index.css`: superfícies, texto, marca, uma cor por carteira, uma cor
  por estado, uma por prazo e uma por tipologia. Cada token tem versão clara e escura.
- **Cor sempre significa algo.** Verde é você, lavanda é o RT, hachurado ou mais claro é "a
  faturar", vermelho só aparece em prazo vencido ou urgente.
- **Classes de componente**: `card`, `chip`, `btn`, `input`, `seg`, `table`, `kpi-*`,
  `status-*`, `farol-*`, `tip-*`. Telas novas usam essas classes antes de inventar outras.
- **Tipografia**: Inter, com números tabulares (`tnum`) em tudo que é valor ou hora.
- **Paleta de gráficos validada** para daltonismo e contraste nos dois temas. Não troque as
  cores das séries sem rodar a validação de novo.

## 4. Receita para replicar uma aba do sistema original

1. **Capturar.** Tela inteira, colunas, filtros, cartões, botões e o texto dos tooltips. O
   roteiro `docs/03-COWORK-CAPTURA.md` faz isso sem alterar dados.
2. **Modelar.** Acrescente em `types.ts` só os campos que a tela realmente usa.
3. **Calcular.** Escreva a regra em `lib/` e o teste junto, com um caso normal, um limite e um
   vazio. Se a captura trouxer um número de exemplo, use-o como caso de teste.
4. **Desenhar.** Monte `pages/Nome.tsx` com as classes do design system. Filtros no topo,
   resumo antes do detalhe, estado em forma e cor, tabela por último.
5. **Dados.** Acrescente exemplos em `seed.ts` e a ação no store. Se o formato salvo mudar,
   mude a versão da chave de persistência e garanta o `merge` com valores padrão.
6. **Conferir.** Rode `npm test`, `npx tsc --noEmit`, abra a tela no tamanho de computador e de
   celular (390 px), nos dois temas, e compare com a captura lado a lado.
7. **Publicar.** `npm run build:single` e republicar o mesmo arquivo para manter o mesmo link.

## 5. Onde melhorar em vez de copiar

A cópia fiel vem primeiro. Depois, cada aba ganha o que o uso real pede, na ordem do documento
de visão geral. Os pontos já identificados:

- escopo Minhas, RT e Todas sempre visível, para não misturar carteiras
- prazo como cor, com um único vermelho na interface
- rota com hora manual e agrupamento por bairro
- importar O.S. do .txt do SIOPI em vez de digitar
- fechamento que confere o total do extrato e gera o texto do RRT e da nota
- faturamento com a regra do repasse configurável e meta mensal

## 6. Armadilhas já encontradas

- **CSS próprio contra utilitários do Tailwind.** Classes escritas à mão em `index.css` vencem
  as utilitárias. Para ajustar uma classe de componente, mude a própria classe.
- **Telas estreitas.** Toda grade de duas colunas precisa começar em `grid-cols-1`, senão o
  conteúdo estoura a largura no celular.
- **Página publicada não baixa arquivo.** Todo "exportar" precisa de um "copiar" ao lado.
- **Repositório público.** Contrato, processo, CNPJ e nomes reais não vão para o código. Ficam
  em Configurações, salvos no navegador e no backup.
- **Datas em português vêm em minúscula.** Use `cap()` para a primeira letra.
- **Edição por script.** Calcule o texto novo antes de abrir o arquivo para escrita, senão uma
  falha deixa o arquivo vazio.
- **Figma.** Serve para tokens e para explorar um layout novo. As telas funcionais vivem no app.

## 7. O que falta para a réplica ficar fiel

- Capturas das abas do sistema original, feitas no seu computador com o roteiro de captura.
- Uma lista dos fluxos que mudam dados, descrita por você, já que a captura é só leitura.
- A confirmação de regras de negócio que o sistema real aplica, por exemplo se o repasse de
  40% incide sobre serviço mais deslocamento ou só sobre o serviço.
