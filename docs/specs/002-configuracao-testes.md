# 002 — Configuração de testes

**Etapa:** 0.2 (checklist `docs/reference/001-checklist-implementacao.md`)

## Objetivo

Ter uma suíte de testes automatizados pronta para o ciclo TDD de todas as etapas seguintes.

## Escopo

**Entra:**
- Vitest + React Testing Library + jsdom (setup manual do guia oficial do Next.js 16)
- Alias `@/*` funcionando nos testes
- Matchers do `@testing-library/jest-dom`
- Scripts `test` (execução única) e `test:watch`
- Testes do próprio setup (ambiente, alias, renderização de componente)
- Comandos documentados no README

**Não entra:**
- Testes E2E (Playwright) — avaliar quando houver fluxo completo
- Componentes Server `async` (não suportados pelo Vitest; cobrir por E2E no futuro)

## Regras

- Convenção: arquivos `*.test.ts` / `*.test.tsx` ao lado do código testado
- Serviços externos sempre com mock (`testing-and-existing-screens.md`)

## Checklist de aceite

- [x] `npm test` roda a suíte uma vez e sai com código 0
- [x] Alias `@/` resolve dentro dos testes
- [x] Componente React renderiza em jsdom com matchers do jest-dom
- [x] Comandos documentados no README

## Fim da spec
