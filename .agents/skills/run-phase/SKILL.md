---
name: run-phase
description: >-
  Runs implementation phases from the project's implementation checklist with a read-then-confirm-then-execute workflow.
  Use when the user asks to start, run, or implement a phase or step (fase, etapa), continue the checklist,
  or says "executar fase" / "iniciar fase" — including when no phase number is given (infer the next pending one from the checklist in docs/).
---

# Executar fase

Sempre que eu pedir para iniciar uma fase ou etapa (você mesmo identifica a próxima pendente de acordo com o checklist), faça exatamente isto, sem exceção:

## 1. Ler antes de codar
Leia, nesta ordem:
- O documento de contexto lógico do projeto (ex.: `docs/logical-context.md`; se não existir, crie baseado no que discutimos)
- O PRD do projeto (em `docs/specs/`)
- O checklist de implementação (em `docs/reference/`)
- O inventário de telas existentes, se houver (em `docs/reference/`)
- `AGENTS.md` e os arquivos de `.agents/rules/`

Antes de UI: conferir se a tela já existe e **reaproveitar**.
Antes de serviços/API: spec e **TDD** — ver `.agents/rules/spec-per-task.md` e `.agents/rules/testing-and-existing-screens.md`.

## 2. Confirmar antes de executar
Não implemente nada ainda. Responda de forma objetiva com um resumo de até 10 linhas do que entendeu da lógica do sistema e do que a fase vai entregar. Aguarde minha confirmação.

## 3. Executar só o que foi pedido
Após minha confirmação, execute **apenas a fase inteira solicitada, com todas as suas etapas**. Não avance. Não expanda escopo.

## 4. Resumir ao final
Liste: o que foi feito, o que ficou pendente, arquivos alterados e a próxima fase sugerida (sem executá-la).

**Pendências:** registrar conforme `.agents/rules/pending-items.md`.

## Regras
- Se algo conflitar com o contexto lógico ou com o PRD, pare e pergunte antes de codar.
- Não invente dados de domínio (marcar `TODO: popular`).
- Respeite as regras de domínio do PRD (o que roda só no servidor, o que está fora do MVP, etc.).
