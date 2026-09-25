# FluxoGestor — Design System "Calmo"

Objetivo: interface serena por padrão, intensa só onde há ação. Pastéis dessaturados sobre
neutros quentes; a cor sempre **significa** algo (status, prazo, responsável), nunca decora.

## 1. Fundamentos

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `--bg` | `#F7F6F2` | `#141513` | fundo da página (aveia) |
| `--surface` | `#FFFFFF` | `#1C1D1B` | cards, tabelas |
| `--surface-2` | `#F1EFE9` | `#242624` | cabeçalhos de tabela, hover |
| `--border` | `#E6E3DB` | `#2F312E` | linhas |
| `--text` | `#1E1F1C` | `#ECEBE6` | texto principal |
| `--muted` | `#6E6D66` | `#9C9B93` | texto secundário |
| `--brand` | `#3E8E5A` | `#7CC493` | ação primária (verde LFX dessaturado) |
| `--brand-soft` | `#E4F2E8` | `#1F3527` | fundo de destaque suave |

Tipografia: **Inter** (400/500/600) com `font-variant-numeric: tabular-nums` em tabelas e horas.
Escala: 12 / 13 / 14 (base) / 16 / 20 / 24 / 32.

Raios: 8 (inputs, chips retangulares), 12 (cards), 999 (pílulas).
Sombra: uma só, `0 1px 2px rgba(20,20,10,.05), 0 8px 24px -12px rgba(20,20,10,.12)`.
Espaçamento base 4px; ritmo de página 24px.

## 2. Cores semânticas (pastel)

Cada status tem um par **fundo / texto** com contraste ≥ 4.5:1 sobre o fundo pastel.

| Status | Fundo | Texto | Ideia |
|---|---|---|---|
| Convocada | `#EDE9FB` | `#5B49B8` | lavanda — chegou, precisa de resposta |
| Emitida (a agendar) | `#E0EFFA` | `#2A6FA8` | céu — aceita, livre para agendar |
| Agendada | `#DDF3E7` | `#237A4E` | menta — tem dia e hora |
| Vistoriada | `#FDEBD9` | `#B5602A` | pêssego — campo feito, laudo pendente |
| Laudo enviado | `#D9F1EF` | `#20716D` | água — esperando a Caixa |
| Em diligência | `#FBE2E6` | `#B4384F` | rosa — Caixa pediu correção |
| Finalizada | `#E6F0E4` | `#3E7146` | sálvia — concluída |
| Conferida / Paga | `#ECEAE3` | `#65645C` | pedra — arquivo |
| Cancelada | `#F1F0EC` | `#8A8981` | cinza riscado |

Farol de prazo (único lugar onde vermelho aparece):

| Farol | Regra | Fundo | Texto |
|---|---|---|---|
| Tranquilo | > 3 dias | `#E6F0E4` | `#3E7146` |
| Atenção | 2–3 dias | `#FBF0D2` | `#8A6205` |
| Urgente | ≤ 1 dia | `#FBE2E6` | `#B4384F` |
| Vencida | < 0 | `#B4384F` | `#FFFFFF` |

Responsáveis: Luan = sálvia `#3E8E5A`, RT = lavanda `#7A68D6`. Aparecem em avatar, borda
esquerda do bloco de agenda e chip.

## 3. Componentes

- **Segmented control** (escopo Minhas · RT · Todas): fundo `surface-2`, item ativo `surface`
  com sombra; sempre visível na barra superior.
- **Chip de status**: pílula 24px, ponto colorido + rótulo.
- **Farol de prazo**: pílula com "faltam 2 d" / "vence hoje" / "venceu há 1 d".
- **Card de KPI**: número 24/600, rótulo 12 uppercase, cor de fundo pastel do status
  correspondente, clicável (aplica filtro).
- **Tabela**: cabeçalho `surface-2`, linhas 44px, hover `surface-2`, colunas fixas.
- **Timeline de rota**: coluna de horas à esquerda (06:00–20:00), paradas como cards com alça
  de arrastar, hora editável inline, faixa de deslocamento entre paradas em cinza tracejado,
  sobreposição em âmbar.
- **Command bar** `⌘K`: buscar O.S., ir para tela, criar rota.

## 4. Layout

Sidebar 232px (ícone + rótulo), barra superior 56px com escopo, busca e data; conteúdo com
máximo 1280px e gutter 24px. Em telas < 900px a sidebar vira barra inferior de 5 ícones.

## 5. Acessibilidade

Foco visível (anel 2px `brand`), contraste AA em todos os pares, alvo mínimo 40px, teclado em
listas (↑↓ Enter), `prefers-reduced-motion` respeitado.
