---
description: Reutilizar telas existentes; TDD obrigatório antes de funcionalidades (regra central de testes do projeto)
---

# Telas existentes + TDD

> Este arquivo é o **dono** das regras de testes. `AGENTS.md`, `spec-per-task.md` e a skill `run-phase` apenas apontam para cá.

## Telas existentes

Antes de **criar** uma tela ou fluxo de UI:

1. Procurar se já existe rota, tela ou componente equivalente no projeto (e no inventário de telas em `docs/reference/`, se houver).
2. **Estender/reaproveitar** o que existe (dados reais, i18n, estados) em vez de duplicar.
3. Criar tela nova só se o PRD/checklist exigir algo que ainda não existe.

O mock/protótipo é **spec visual/UX**; o código do mock não é copiado.

## TDD obrigatório

Ao implementar **funcionalidade** (serviços, parsers, regras de negócio, schemas, integrações com APIs):

1. Escrever teste que falha (**Red**).
2. Implementar até passar (**Green**).
3. Refatorar com a suite verde.

- Rodar a suite de testes do projeto antes de considerar a etapa concluída.
- Não marcar checklist/API "pronta" sem testes para a regra entregue.
- Convenções de pastas e comandos de teste: documentação do projeto (`docs/reference/` ou README).

## O que testar

- Cada serviço isolado antes de integrar (mock das dependências).
- Lógica pura com testes automatizados:
  - Regras de negócio e transições de estado
  - Cálculos, sorteios e algoritmos (seed reprodutível quando houver aleatoriedade)
  - Parsers, normalização e deduplicação
  - Schemas de validação (inputs válidos e inválidos)
- Integrações externas com resposta mock antes de integrar de verdade, incluindo resposta inválida, timeout, erro e cache hit.
- Limites e rate limits: o limite em si e a virada de período.
- Fluxo principal completo de ponta a ponta, testado manualmente.
- Acessibilidade: foco visível, navegação por teclado, contraste AA, `aria-label` em controles sem texto.

## Serviços externos nunca reais em testes

- **Nunca** chamar serviços externos de verdade nos testes (APIs de IA, pagamento, e-mail, push, etc.).
- Usar mocks com **dados fictícios**; nunca chaves reais nem dados reais de usuários.
