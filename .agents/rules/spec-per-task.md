---
description: SDD — toda nova tarefa pedida pelo usuário tem spec (criar ou atualizar) antes de implementar
---

# Spec para cada tarefa (SDD)

O projeto segue **SDD (Spec-Driven Development)**: nenhuma tarefa é implementada sem spec.

Sempre que o usuário pedir uma **nova tarefa** — funcionalidade, mudança de comportamento/UX, refatoração, ajuste técnico, configuração/infra ou integração — **antes de implementar** (e antes do TDD):

## 1. Já existe spec dessa área?

Procurar em `docs/specs/` pela área afetada (ex.: mudança no login → spec de autenticação).

- **Sim** → **não criar spec nova**. Registrar a mudança na spec existente (seção **Atualizações**, formato abaixo) e ajustar checklist/regras que mudaram.
- **Não** → criar spec nova:
  - Arquivo: `docs/specs/NNN-nome-curto.md` (kebab-case, pt-BR, descritivo)
  - `NNN` = **próximo número sequencial** da pasta `docs/specs/` (maior número existente + 1, com 3 dígitos)
  - Nunca reutilizar nem pular número
  - Conteúdo mínimo: título, objetivo, escopo (o que entra / o que não entra), regras, checklist de aceite

## 2. Status geral

Atualizar `docs/status.md` (spec nova ou atualização relevante), conforme `docs-organization.md`.

## Formato da seção de atualizações (spec existente)

Antes de `## Fim da spec` (ou no final), se ainda não existir:

```markdown
## Atualizações

### AAAA-MM-DD — título curto

- **Pedido:** …
- **Mudança:** … (comportamento/telas/arquivos em 1–2 linhas)
- **Pendências:** IDs, se houver
```

## Regras

- Ordem obrigatória: **spec → teste que falha → implementação → refatorar** (ciclo TDD em `testing-and-existing-screens.md`)
- Tarefa pequena não dispensa spec: basta uma entrada curta em **Atualizações** da spec existente
- Entrada curta e objetiva; não duplicar o PRD
- Bugs corrigidos vão na seção **Bugs (histórico)** (`bug-history.md`), não em Atualizações
- Algo que ficou sem fazer → `pending-items.md`
