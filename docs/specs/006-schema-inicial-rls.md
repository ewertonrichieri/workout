# 006 — Schema inicial do banco + RLS

**Etapa:** 0.6 (checklist `docs/reference/001-checklist-implementacao.md`)

## Objetivo

Criar, por migrations versionadas, as tabelas do MVP (PRD `001-prd.md`) com controle de acesso por usuário (Row Level Security) em todas elas.

## Escopo

**Entra:**
- Supabase CLI (`npx supabase`) com migrations em `supabase/migrations/`
- Tabelas (nomes em inglês, snake_case, PK UUID):
  - **Usuário:** `profiles` (1:1 com `auth.users`, criada por trigger no cadastro; papel `student | trainer | admin`, padrão `student`)
  - **Catálogo (global):** `muscles`, `equipment`, `exercises`, `exercise_muscles` (papel `primary | secondary`), `exercise_equipment`, `exercise_media` (`video | gif | image | youtube`, `source`, `license`, `priority`, `is_enabled`)
  - **Dados do usuário:** `assessments` + `assessment_equipment`, `plans`, `workouts`, `workout_exercises`, `workout_sessions`, `set_logs`
- RLS habilitado em **todas** as tabelas
- Script de inspeção somente leitura (`scripts/db-inspect.mjs`)

**Não entra:**
- Dados do catálogo (Fase 1)
- Tabelas de V2/V3 (check-in, academias por foto, análises de postura)

## Regras

- **Catálogo:** leitura para usuários autenticados; escrita só por scripts com a service role (sem policy de escrita).
- **Dados do usuário:** cada usuário lê/escreve somente o que é seu. Tabelas filhas (`workouts`, `workout_exercises`, `assessment_equipment`, `set_logs`) verificam o dono pela tabela pai.
- **`profiles.role`:** o usuário pode editar o próprio nome, nunca o papel (permissão de coluna).
- **Plano ativo:** no máximo um plano `active` por usuário (índice único parcial).
- **Repetições:** `reps_min`/`reps_max` (ex.: "8 a 12" → 8/12; "50" → 50/50).
- **Histórico preservado:** apagar um plano/treino não apaga sessões e séries registradas (`set null`); apagar o usuário apaga tudo dele (`cascade`).
- Valores de domínio (objetivo, nível, origem, status) em inglês com `check`.

## Checklist de aceite

- [x] Toda tabela criada nas migrations tem RLS habilitado (teste automatizado)
- [x] Toda tabela com dados de usuário tem policies baseadas em `auth.uid()` (teste automatizado)
- [x] Migration aplicada no Supabase do projeto
- [x] Inspeção confirma RLS ligado e policies em todas as tabelas

## Fim da spec
