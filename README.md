# Workout — Personal Trainer com IA

Web app em que uma IA monta e acompanha treinos de musculação. Produto e regras em `docs/specs/001-prd.md`; fases em `docs/reference/001-checklist-implementacao.md`; status em `docs/status.md`.

## Requisitos

- Node.js 20.19+ (recomendado atualizar para 22 LTS ou superior)
- npm

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento em http://localhost:3000 |
| `npm run build` | Build de produção |
| `npm run lint` | ESLint |
| `npm test` | Roda a suíte de testes uma vez (Vitest) |
| `npm run test:watch` | Testes em modo watch |

## Banco de dados (Supabase)

- Migrations versionadas em `supabase/migrations/` (Supabase CLI via `npx supabase`)
- Criar migration: `npx supabase migration new nome_da_mudanca`
- Aplicar no projeto remoto (usa `SUPABASE_DB_URL` do `.env`):
  `npx supabase db push --db-url "<SUPABASE_DB_URL>" --yes`
- Inspecionar tabelas, RLS e policies (somente leitura):
  `node --env-file=.env scripts/db-inspect.mjs`
- Toda tabela nova precisa de RLS + policies; o teste `src/test/migrations-rls.test.ts` falha se faltar

## Testes

- Vitest + React Testing Library + jsdom; matchers do jest-dom
- Arquivos `*.test.ts` / `*.test.tsx` ao lado do código, dentro de `src/`
- Serviços externos sempre com mock (nunca chamadas reais)
- Componentes Server `async` não são suportados pelo Vitest (cobrir por E2E no futuro)
