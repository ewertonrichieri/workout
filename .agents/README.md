# .agents — instruções para agentes de IA

Pasta neutra, independente de ferramenta (Cursor, Claude Code, Copilot, Codex etc.). É a **fonte única da verdade**; cada ferramenta só tem um arquivo adaptador apontando para cá.

## O que é cada coisa

| Pasta/arquivo | Tipo | Quando o agente usa |
|---|---|---|
| `AGENTS.md` (raiz) | Instrução principal + índice | Sempre. É o único arquivo que quase todo agente lê sozinho |
| `.agents/rules/` | Instruções (regras) | Sempre, em toda tarefa |
| `.agents/skills/` | Skills (fluxos passo a passo) | Só quando o pedido aciona o gatilho descrito no `SKILL.md` |
| `.agents/templates/` | Modelos vazios | Ao iniciar um projeto: copiar para `docs/` e preencher |
| `docs/` | Documentos do projeto | Consultados pelas regras (PRD, specs, status). Não são instruções |

Regra prática para classificar algo novo:

- Vale em toda conversa? → `rules/`
- É um passo a passo disparado por um pedido específico? → `skills/<nome>/SKILL.md`
- É um modelo para copiar? → `templates/`
- Descreve o estado ou o conteúdo de um projeto específico? → `docs/` do projeto

## Adaptadores por ferramenta

Arquivos curtos que só apontam para o `AGENTS.md`. Nunca colocar regras neles.

| Ferramenta | Adaptador |
|---|---|
| Claude Code | `CLAUDE.md` |
| Cursor | `.cursor/rules/agents.mdc` (o Cursor também lê o `AGENTS.md` direto) |
| GitHub Copilot | `.github/copilot-instructions.md` |
| Outra ferramenta | Criar o arquivo que ela lê, com o mesmo texto de apontamento |

## Iniciar um projeto novo

1. Copiar `AGENTS.md`, `.agents/` e os adaptadores das ferramentas que você usa para a raiz do projeto.
2. Copiar `.agents/templates/status.md` para `docs/status.md` e preencher o nome do projeto.
3. Criar em `docs/` os documentos que as regras esperam: PRD (`docs/specs/`), checklist de implementação (`docs/reference/`) e `docs/logical-context.md`.
