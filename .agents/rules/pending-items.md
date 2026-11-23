---
description: Registrar pendências não fecháveis na entrega na spec da funcionalidade e no status (regra central de pendências)
---

# Pendências que não der para fechar

> Este arquivo é o **dono** das regras de pendências; os demais apenas apontam para cá.

Sempre que uma tarefa/fase ficar com **algo não implementado** (placeholder, escopo cortado, dependência externa, decisão do usuário):

1. **Spec da funcionalidade** (`docs/specs/NNN-….md` da área afetada; criar spec dedicada se ainda não existir):
   - Seção **Pendências** com tabela: ID curto (prefixo da área + número, ex.: `AUTH-001`), descrição, onde no código, prioridade sugerida.
2. **`docs/status.md`**:
   - Seção **Pendências (não esquecer)** com bullet por ID + link para a spec (não duplicar parágrafo longo).
3. **Não** marcar checklist como `[x]` na etapa se a pendência for **critério de aceite** daquela etapa; se a etapa foi entregue com limitação conhecida, marcar `[x]` e citar o ID da pendência na spec.

Ao **fechar** uma pendência: remover ou marcar resolvida na spec e retirar do `status`.
