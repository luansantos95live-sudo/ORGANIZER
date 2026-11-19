---
name: caixa-emails
description: Ponte Gmail → Fluxo Caixa (pedido de 10/11). Busca no Gmail do Luan os e-mails novos da Caixa (convocação de O.S. com o .txt, PEPT resolvida, cancelamento, prazo), baixa o bruto de cada um, roda scripts/caixa-emails.ts e atualiza o arquivo "Caixa de entrada/emails.json" que o usuário importa na aba E-mails do sistema. Use em /caixa-emails, ou quando o Luan pedir para "puxar os e-mails da Caixa", "atualizar a caixa de entrada" ou "ver se chegou O.S. nova".
---

# Ponte Gmail → aba E-mails do Fluxo Caixa

O sistema não tem servidor: nada entra sozinho na aba E-mails. O Claude faz o papel de carteiro:
lê o Gmail, monta o `emails.json` e o Luan importa pelo botão **Importar e-mails**.

## Caminhos
- Projeto: `C:\Users\Jeguim\OneDrive\FLUXO CAIXA` (app em `app\`).
- Saída (fora do repositório, está no .gitignore): `C:\Users\Jeguim\OneDrive\FLUXO CAIXA\Caixa de entrada\emails.json`
- Brutos temporários: pasta `brutos\` no scratchpad da sessão (nunca dentro do projeto).

## Passo a passo
1. **Descobrir o que falta.** Ler o `emails.json` atual (se existir) e anotar os ids (`gm-<id do Gmail>`).
   Se não existir, considerar vazio e buscar os últimos 14 dias.
2. **Buscar no Gmail** (connector Gmail, `search_threads`, `view: THREAD_VIEW_METADATA_ONLY`, `pageSize: 50`):
   ```
   from:caixa.gov.br (subject:"Convocação de Ordem" OR subject:"Resolução do PEPT" OR subject:cancelamento OR subject:prorroga) newer_than:14d -in:sent
   ```
   Ajustar `newer_than` para cobrir desde a última carga. Remetentes conhecidos: `AGxxxx@caixa.gov.br`
   (convocação de O.S., com o .txt `CONVOCACAO PRESTACAO SERVICO.TXT`) e `siopi@caixa.gov.br` (PEPT resolvida).
   Considerar só as mensagens cujo `sender` é @caixa.gov.br (os encaminhamentos do Luan ficam de fora).
   Threads de O.S. que o Luan encaminhou podem não aparecer na busca por assunto: se faltar alguma,
   usar `get_thread` (METADATA_ONLY) para pegar o id da primeira mensagem.
3. **Baixar o bruto** de cada mensagem nova: `get_message` com `messageFormat: RAW`. O anexo .txt vem
   dentro do `raw` (base64url). Salvar `{ "id", "internalDate", "raw" }` — pode ser um arquivo por e-mail
   ou um lote `[ {...}, {...} ]` — em `brutos\*.json` no scratchpad.
4. **Converter e juntar** (Node 24, roda TypeScript direto):
   ```
   cd "C:\Users\Jeguim\OneDrive\FLUXO CAIXA\app"
   node scripts/caixa-emails.ts "<scratchpad>\brutos" "C:\Users\Jeguim\OneDrive\FLUXO CAIXA\Caixa de entrada\emails.json"
   ```
   O script lê os brutos (`src/lib/mime.ts`), ignora ids já presentes e reescreve o `emails.json` ordenado
   do mais novo para o mais antigo. Ele imprime quantos entraram e quais.
5. **Avisar o Luan**, em português simples: quantos e-mails novos (quais O.S.), e que no sistema é só
   abrir **E-mails → Importar e-mails** e escolher o `emails.json` da pasta "Caixa de entrada".
   Só entram os ids que ainda não estão no sistema; o que ele já marcou como lido/importado fica.

## Regras
- Dados reais de clientes: só no `emails.json` (pasta ignorada pelo git) e nos brutos do scratchpad.
  Nunca copiar nomes, CPF ou endereço para código, testes ou CLAUDE.md.
- Não marcar e-mails como lidos no Gmail, não mover, não responder: a ponte é somente leitura.
- Se o Gmail não trouxer o anexo (e-mail sem `attachments`), o e-mail entra sem `.txt` e a aba mostra
  "só de aviso"; dizer isso ao Luan.
