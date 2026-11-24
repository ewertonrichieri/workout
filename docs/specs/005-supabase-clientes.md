# 005 — Supabase: clientes e configuração

**Etapa:** 0.5 (checklist `docs/reference/001-checklist-implementacao.md`)

## Objetivo

Conectar o app ao projeto Supabase já criado pelo usuário, com clientes para servidor e navegador e configuração validada.

## Escopo

**Entra:**
- Pacotes `@supabase/supabase-js`, `@supabase/ssr`, `server-only`
- Config pública validada (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`), lida com referências explícitas para o Next inlinar no bundle
- Cliente de servidor (`src/lib/supabase/server-client.ts`), com cookies da sessão, marcado `server-only`
- Cliente de navegador (`src/lib/supabase/browser-client.ts`), usado só para autenticação no cliente; dados sempre via API/servidor
- `.env.example` com todos os nomes, sem valores

**Não entra:**
- Uso de `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_DB_URL` (só em scripts/migrations/seed — etapas 0.6 e 1.5)
- Refresh de sessão no proxy e telas de login (etapa 0.7)

## Regras

- Chave publicável (`PUBLISHABLE_KEY`) no cliente; a `ANON_KEY` é legada e não é usada pelo código
- `SERVICE_ROLE_KEY` nunca no cliente nem em código de request do usuário
- Segredos fora do Git; na nuvem, variáveis nas configurações do ambiente do Claude Code

## Checklist de aceite

- [x] Config pública inválida ou ausente falha com o nome da variável
- [x] Clientes criados com URL e chave da config
- [x] Cliente de servidor lê e grava cookies da sessão
- [x] `.env.example` sem valores
- [x] Testes passando, typecheck, lint e build limpos

## Bugs (histórico)

Somente registro informativo de correções já feitas. Não é backlog.

### 2026-11-25 — `Date.now()` durante a pré-renderização

- **Sintoma:** no teste de ponta a ponta, todas as telas com dados do usuário (`/workout`, `/schedule`, `/progress`, `/exercises`) registravam "encountered the unstable value `Date.now()` while prerendering"
- **Causa:** com Cache Components + Partial Prefetching, o Next pré-renderiza com os cookies disponíveis, e o supabase-js lê a hora atual ao validar a sessão
- **Correção:** `createServerSupabaseClient` chama `await connection()` antes de ler os cookies (dados do usuário são sempre da requisição)

## Fim da spec
