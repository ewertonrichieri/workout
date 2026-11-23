---
description: Após corrigir um bug diagnosticado, registrar na seção Bugs da spec relacionada (somente histórico informativo)
---

# Histórico de bugs na spec

Sempre que um **problema real** for diagnosticado e corrigido (debug com evidência, causa raiz clara, fix aplicado), anotar na **spec da funcionalidade afetada** (`docs/specs/NNN-….md`) — não criar arquivo em `docs/bugs/` só por isso, a menos que o usuário peça um item de backlog separado.

## Formato

Seção no final da spec (antes de `## Fim da spec`), se ainda não existir:

```markdown
## Bugs (histórico)

Somente registro informativo de correções já feitas. Não é backlog.

### AAAA-MM-DD — título curto

- **Sintoma:** …
- **Causa:** …
- **Correção:** … (arquivos/comportamento em 1 linha)
```

## Regras

- Entrada **curta** (informação para o agente/humano no futuro, não post-mortem longo)
- Só bugs **já corrigidos e entendidos** — não listar hipóteses abertas
- Não atualizar `status` nem criar item em `bugs/` só por esta anotação
- Não misturar com checklist de aceite da spec
- Se o problema **já existir** como arquivo em `bugs/`: ao corrigir, **fechar** esse arquivo (Status Corrigido + causa/correção) e atualizar o `status`
