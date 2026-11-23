# 003 — Módulos base (config, logger, errors, constants)

**Etapa:** 0.3 (checklist `docs/reference/001-checklist-implementacao.md`)

## Objetivo

Criar a infraestrutura compartilhada exigida pelo `AGENTS.md` antes de qualquer funcionalidade: configuração validada, logger estruturado, erros customizados com resposta padrão da API e constantes nomeadas.

## Escopo

**Entra:**
- `src/lib/config/` — leitura única e validada (zod) das variáveis de ambiente; falha cedo com mensagem clara. Variáveis atuais: `NODE_ENV`, `LOG_LEVEL`. Supabase e Claude entram nas etapas deles (0.5 e 3.2).
- `src/lib/logger/` — logger JSON com níveis `debug | info | warn | error`, filtro por nível mínimo e remoção de campos sensíveis (`password`, `token`, `apiKey`, `secret`, `authorization`...).
- `src/lib/errors/` — `AppError` base (código + status HTTP) e erros específicos: `InvalidInputError` (400), `UnauthorizedError` (401), `ForbiddenError` (403), `NotFoundError` (404), `UnprocessableError` (422), `RateLimitExceededError` (429), `ExternalServiceError` (502); helper que converte erro em resposta `{ success, data?, error? }` sem vazar detalhes internos.
- `src/lib/constants/` — status HTTP, política de retry (3 tentativas, backoff 1s/2s/4s, teto 15s), níveis de log.

**Não entra:**
- Variáveis do Supabase/Claude (etapas 0.5 e 3.2)
- Mensagens de UI (etapa 0.4); por ora a mensagem genérica de erro interno fica como constante até o helper de i18n existir

## Regras

- Erros desconhecidos viram 500 com mensagem genérica em pt-BR; nunca expor stack ou mensagem interna.
- Logger nunca registra valores de chaves sensíveis.

## Checklist de aceite

- [x] Config válida é lida e tipada; config inválida lança erro com o nome da variável
- [x] Logger filtra por nível e mascara campos sensíveis
- [x] Cada erro customizado tem status HTTP correto
- [x] Helper de resposta de erro gera `{ success: false, error }` e trata erro desconhecido como 500
- [x] Testes passando, typecheck e lint limpos

## Pendências

| ID | Descrição | Onde | Prioridade |
|---|---|---|---|
| ~~BASE-001~~ | ~~Trocar a mensagem genérica de erro interno pela chave do arquivo de mensagens~~ — **resolvida na etapa 0.4** (`translate("errors.internal")`) | `src/lib/errors/api-response.ts` | — |

## Fim da spec
