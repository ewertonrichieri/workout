# Status Geral — Workout (Personal Trainer com IA)

**Data da última atualização:** 2026-11-23

---

## Próximo a implementar

Lista priorizada (spec, bug, técnico, melhoria). Uma linha por item com ID e link.

1. **0.4** — Mensagens pt-BR + helper de i18n (esforço `low`) → `reference/001-checklist-implementacao.md`

---

## Concluído recentemente

- **Projeto Next.js criado** — Next.js 16 + React 19, TypeScript, Tailwind, App Router, `src/`
- **0.2 Configuração de testes** — Vitest 4 + Testing Library + jsdom (merge na `main`) → `specs/002-configuracao-testes.md`
- **Regras de agentes e docs** — `AGENTS.md`, `.agents/`, `CLAUDE.md`, PRD, checklist e logical-context (merge na `main`) → `specs/001-prd.md`

---

## Em Progresso

- **0.3 Módulos base** — config (zod), logger, errors, constants; aguardando "pode subir" (branch `chore/base-modules-003`) → `specs/003-modulos-base.md`

---

## Pendências (não esquecer)

Espelho dos IDs na spec; detalhes e prioridade lá (ver `.agents/rules/pending-items.md`).

- **BASE-001** — mensagem genérica de erro interno → arquivo de mensagens (etapa 0.4) → `specs/003-modulos-base.md`

---

## Concluído

- Nenhum item concluído ainda.

---

## Backlog (não priorizado)

### Planning

- Detalhes de V2/V3 → `planning/001-planejamento-inicial.md`

### Improvements

- Nenhuma melhoria registrada no momento.

### Technical Debt

- Nenhum item registrado no momento.

### Bugs

- Nenhum bug registrado no momento.

---

## Observações

- Repositório local, sem remoto no GitHub ainda; sem deploy automático configurado.
- Branch principal: `main` (renomeada de `master`).
- Ambiente: Windows 11, PowerShell, Node 20.19 e npm 8.18 (antigo). O npm 8 falha ao instalar pacotes (`edgesOut`); usar `npx -y npm@10 install ...` até atualizar o Node/npm.
- Segredos: `.env` local (ignorado pelo Git). Em sessões na nuvem, as variáveis ficam nas configurações do ambiente de nuvem do Claude Code, nunca no repositório. Nomes das variáveis em `.env.example` (etapa 0.5).
- Vitest fixado na v4 porque a v5 exige Node 22+.
