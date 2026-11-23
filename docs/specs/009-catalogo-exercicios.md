# 009 — Catálogo de exercícios

**Etapa:** 1.1 a 1.7 (checklist `docs/reference/001-checklist-implementacao.md`)

## Objetivo

Importar e unificar o catálogo de exercícios das fontes de mídia, com nomes em pt-BR, `source` e `license` por mídia, e tela de busca/visualização.

> Seções de análise das fontes, escopo detalhado e checklist de aceite: a completar na etapa 1.1.

## Decisões

### Hospedagem das mídias (2026-11-23)

O plano gratuito do Supabase (~1 GB de storage) não comporta os vídeos. No MVP **não** usamos Supabase Storage nem R2 próprio:

| Fonte | Onde está a mídia | Como servimos no MVP |
|---|---|---|
| Free Exercise DB with Videos (`harshvishu/free-exercise-db-with-videos`) | R2 do autor (fora do repositório) | URL direta do R2 do autor; fork guarda só os metadados |
| Workout Free Videos (`namnq/workout-free-videos`) | No repositório (~32 MB) | Fork + jsDelivr |
| Exercise Library (`mohamedatef90/exercise-library`) | No repositório (~97 MB) | Fork + jsDelivr |

O banco guarda apenas a `url` em `exercise_media`; trocar a hospedagem depois é só reapontar URLs.

## Pendências

| ID | Descrição | Onde | Prioridade |
|---|---|---|---|
| CAT-001 | Copiar vídeos do Free Exercise DB para um Cloudflare R2 próprio (hoje dependemos do R2 do autor) e reapontar as URLs — fase futura (etapa 6.5) | `exercise_media.url` | Média (antes da abertura) |
| CAT-002 | Fazer os forks das três fontes na conta do GitHub do usuário | GitHub | Alta (antes da 1.2) |
