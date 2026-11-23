---
description: Ao terminar qualquer tarefa pedida, mostrar o progresso do checklist e sugerir o próximo grupo de etapas com o mesmo esforço
---

# Relatório de progresso ao fim de cada tarefa

> Este arquivo é o **dono** da regra de relatório de progresso. O checklist fica em `docs/reference/001-checklist-implementacao.md`.

## Seguir o checklist

- Executar as etapas **na ordem** do checklist (fase e número da etapa).
- Ao concluir uma etapa, marcar `[x]` no checklist (respeitando `pending-items.md`).

## Ao terminar qualquer tarefa pedida pelo usuário

Sempre, ao final da resposta:

1. **Feito:** etapas concluídas da fase atual (número + nome).
2. **Falta:** etapas pendentes da fase atual, cada uma com o **esforço** (`low`, `medium`, `high`, `xhigh`, `max`).
3. **Próximo grupo:** pegar as próximas etapas **consecutivas** que têm o **mesmo esforço** e perguntar se o usuário quer executá-las em sequência, já dizendo qual esforço selecionar.
   - Exemplo: "As etapas 1.4 a 1.6 são `medium`. Quer fazê-las em sequência? Selecione o esforço `medium`."
   - O grupo para na primeira etapa de esforço diferente ou no fim da fase.
   - Se a próxima etapa estiver sozinha (vizinhas com outro esforço), perguntar só por ela.

## Regras

- Não executar o grupo sugerido sem a confirmação do usuário.
- O esforço de cada etapa é o definido no checklist; se uma etapa se mostrar mais difícil ou mais simples, propor a mudança e atualizar o checklist.
