---
description: Organização da pasta docs — specs, bugs, dívida técnica, status (regra central de documentação)
---

# Documentação do projeto

> Este arquivo é o **dono** das regras de organização de `docs/`.

## Uma árvore única

Toda a documentação do projeto fica em `docs/` na raiz.

## Estrutura

- `specs/` — funcionalidades definidas (com checklist de aceite)
- `bugs/` — correções de erros
- `technical-debt/` — dívida técnica, refatorações, migrações
- `planning/` — ideias ainda não decididas
- `improvements/` — melhorias UX/UI contínuas
- `reference/` — guias de consulta (não é backlog)
- `status.md` — painel de status

## Nomenclatura

`NNN-nome-curto.md` — sequencial **por pasta** (kebab-case, pt-BR).

## Ao criar ou alterar documentação

1. Escolher a pasta correta (`specs/`, `bugs/`, `technical-debt/`, `planning/`, `improvements/`, `reference/`)
2. Usar o **próximo número** disponível **naquela** pasta
3. Atualizar `status.md` imediatamente
4. Topo do status: seção **Próximo a implementar** (spec, bug, técnico, melhoria)
5. Ideia em `planning/` → mover e renumerar ao promover
6. `reference/` não entra em "Próximo a implementar"
