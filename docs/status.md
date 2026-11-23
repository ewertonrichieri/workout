# Status Geral — Workout (Personal Trainer com IA)

**Data da última atualização:** 2026-11-23

---

## Próximo a implementar

Lista priorizada (spec, bug, técnico, melhoria). Uma linha por item com ID e link.

1. **AUTH-001 / AUTH-002** — configurar Google OAuth e testar login por e-mail (usuário) → `specs/007-autenticacao.md`
2. **CAT-002** — forks (usuário) → `specs/009-catalogo-exercicios.md`
3. **CAT-004** — aplicar migration `exercise_source_refs` no Supabase (usuário) → `specs/009-catalogo-exercicios.md`
4. **1.3** — Normalização, dedup e tradução pt-BR (esforço `xhigh`) → `specs/009-catalogo-exercicios.md`

---

## Concluído recentemente

- **1.2 Parsers do catálogo** — schema comum, um parser por fonte, script `catalog:parse`, arquivos em `seed-data/catalog/sources/` (1.486 exercícios, 0 rejeitados), migration `exercise_source_refs` → `specs/009-catalogo-exercicios.md`
- **1.1 Catálogo — análise das fontes** — formatos, campos, mídia e licenças das 3 fontes; regras de prioridade, dedup e rastreabilidade → `specs/009-catalogo-exercicios.md`
- **0.8 Layout base** — tema escuro oliva, navegação inferior, rotas com estado vazio (merge na `main`, PR #1) → `specs/008-layout-base.md`
- **Projeto Next.js criado** — Next.js 16 + React 19, TypeScript, Tailwind, App Router, `src/`
- **0.6 Schema + RLS** — 14 tabelas do MVP com RLS, aplicadas no Supabase (merge na `main`) → `specs/006-schema-inicial-rls.md`
- **0.5 Supabase** — clientes servidor/navegador, config pública, `.env.example` (merge na `main`) → `specs/005-supabase-clientes.md`
- **0.4 Mensagens pt-BR** — `src/messages/pt-BR.json` + `translate()` tipado (merge na `main`) → `specs/004-mensagens-i18n.md`
- **0.3 Módulos base** — config (zod), logger, errors, constants (merge na `main`) → `specs/003-modulos-base.md`
- **0.2 Configuração de testes** — Vitest 4 + Testing Library + jsdom (merge na `main`) → `specs/002-configuracao-testes.md`
- **Regras de agentes e docs** — `AGENTS.md`, `.agents/`, `CLAUDE.md`, PRD, checklist e logical-context (merge na `main`) → `specs/001-prd.md`

---

## Em Progresso

- **0.7 Autenticação** — código na `main`; etapa pendente até AUTH-001/AUTH-002 (configuração do Google e teste manual) → `specs/007-autenticacao.md`

---

## Pendências (não esquecer)

Espelho dos IDs na spec; detalhes e prioridade lá (ver `.agents/rules/pending-items.md`).

- **AUTH-001** — configurar Google OAuth (Google Cloud + Supabase) e URLs de redirecionamento → `specs/007-autenticacao.md`
- **AUTH-002** — teste manual de cadastro/login por e-mail → `specs/007-autenticacao.md`
- **CAT-001** — vídeos do Free Exercise DB em R2 próprio (fase futura, etapa 6.5) → `specs/009-catalogo-exercicios.md`
- **CAT-003** — licença dos GIFs da Exercise Library a confirmar → `specs/009-catalogo-exercicios.md`
- **CAT-004** — aplicar migration `exercise_source_refs` no Supabase → `specs/009-catalogo-exercicios.md`
- **CAT-002** — forks de Workout Free Videos e Exercise Library → `specs/009-catalogo-exercicios.md`

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

- Repositório no GitHub: `ewertonrichieri/workout` (**público**); sem deploy automático configurado.
- Branch principal: `main` (renomeada de `master`).
- Ambiente: Windows 11, PowerShell, Node 20.19 e npm 8.18 (antigo). O npm 8 falha ao instalar pacotes (`edgesOut`); usar `npx -y npm@10 install ...` até atualizar o Node/npm.
- Segredos: `.env` local (ignorado pelo Git). Em sessões na nuvem, as variáveis ficam nas configurações do ambiente de nuvem do Claude Code, nunca no repositório. Nomes das variáveis em `.env.example` (etapa 0.5).
- Vitest fixado na v4 porque a v5 exige Node 22+.
