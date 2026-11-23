---
description: Convenção de branches, PR, merge e deploy (regra central de Git do projeto)
---

# Convenção de Branches

> Este arquivo é o **dono** das regras de Git. Os comandos passo a passo ficam na skill `.agents/skills/git-pr-workflow/SKILL.md`; `AGENTS.md` só resume.

## Estrutura de branches

- **`main`** = **única branch principal**, **sempre atualizada** após cada "pode subir"
- **`tipo/nome-numero`** = branches de trabalho (temporárias, deletadas após merge)
- **Não existe** `desenv`, `develop` ou `master`: não criar nem sincronizar outra branch fixa

## Regra obrigatória: base atualizada

**Sempre que criar uma branch nova** (feature, fix ou chore), o agente deve:

1. `git checkout main`
2. `git pull origin main`
3. Só então `git checkout -b tipo/nome-descritivo-00N`

**Nunca** criar branch a partir de branch antiga ou de commit local sem puxar a `main` remota primeiro.

Se `git pull` falhar por divergência, parar e avisar o usuário — não force push.

## Padrão de nome

```
tipo/nome-descritivo-numero
```

- `tipo/` = `feat` (funcionalidade), `fix` (bug), `chore` (refatoração/manutenção)
- `nome-descritivo` = kebab-case, descritivo e conciso
- `numero` = sequencial (001, 002, 003...)

Exemplos: `feat/user-profile-003`, `fix/login-redirect-001`, `chore/extract-components-001`

## Fluxo de implementação

**Quando o usuário pedir feature, tarefa ou fase:**

1. Atualizar `main` e criar a branch (regra acima)
2. Implementar
3. **Não** fazer merge até o usuário dizer **"pode subir"** ou **"subir"**

## Quando o usuário diz "pode subir" ou "subir"

O agente **sempre** faz merge na **`main`** (squash), sem pedir confirmação extra:

1. Push da branch (se ainda não estiver no remoto)
2. Abrir PR: **`tipo/nome-numero` → `main`**
3. Merge **squash** na `main`
4. Deletar a branch (local e remota)
5. `git checkout main && git pull origin main`
6. **Verificar o deploy de produção**, se o projeto tiver deploy automático: usar o comando/processo de verificação documentado no projeto (README ou Observações do `docs/status.md`) e informar o resultado ao usuário. Se falhar, investigar e avisar. **Nunca** promover ou forçar um deploy sem perguntar.

## Preferência do usuário: subir a etapa anterior ao iniciar a próxima

Neste projeto, quando o usuário pedir para iniciar a próxima etapa do checklist e a etapa anterior ainda estiver numa branch sem merge, o agente faz o fluxo de "pode subir" da anterior **sem perguntar** e só então cria a branch nova a partir da `main` atualizada. (Autorizado pelo usuário em 2026-11-23.)

## Preferência do usuário: subir ao terminar cada etapa

Ao concluir uma etapa do checklist (testes passando), o agente faz o fluxo de "pode subir" (PR + squash na `main`) **sem pedir autorização**. (Autorizado pelo usuário em 2026-11-23.)

## Checklist do PR

- Branch criada a partir da `main` atualizada
- Projeto compila/builda após mudanças grandes
- Docs atualizados se necessário (`docs/status.md`, checklist, spec)
- Nenhum segredo nos commits

## Release com tag (opcional)

Quando o usuário pedir **"release"** ou **"tag"**:

- Garantir que `main` já contém o squash da feature
- Criar tag semântica (ex.: `v1.0.0`) e `git push origin --tags`

## Convenção de commits

```
tipo: descrição curta (máx 50 chars)
```

Mesmo `tipo` da branch (`feat:`, `fix:`, `chore:`).

## Histórico Git

⚠️ **Nunca reescrever histórico** em commits já enviados ao GitHub.

- ✅ Squash no merge do PR é seguro
- ❌ Rebase/amend/force push **depois** de push
- ✅ Manter **`main`** sempre em estado que compila

## Notas

- Uma branch = uma feature/bug (não misturar)
- Deletar branch após merge
