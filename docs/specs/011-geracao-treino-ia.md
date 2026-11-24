# 011 — Geração de treino por IA

**Etapas:** 3.1 a 3.8 (checklist `docs/reference/001-checklist-implementacao.md`). Esta spec detalha a **3.1**; as demais etapas entram como **Atualizações** quando forem iniciadas.

## Objetivo

A IA atua como personal trainer: a partir de uma anamnese, monta um plano usando **somente** exercícios do catálogo com mídia, que o usuário revisa, executa e renova ao fim da validade (PRD, item 4).

## Escopo da 3.1 — Anamnese

**Entra:**
- Formulário `/assessment`: objetivo, nível, dias por semana, tempo por treino, preferência de divisão, equipamentos disponíveis, lesões/limitações
- Schema de validação (zod) compartilhado entre cliente (erros por campo) e servidor (revalidação)
- `POST /api/assessments`: grava a anamnese e os equipamentos numa transação
- Leitura da anamnese mais recente para preencher o formulário de novo
- Entrada pela tela Início e pelo Perfil

**Não entra:**
- Aviso de saúde (3.7)
- Geração do plano pela IA (3.3): salvar a anamnese só grava os dados
- Fotos de equipamentos (V2)

## Modelo

| Tabela | Uso |
|---|---|
| `assessments` | `goal`, `experience_level`, `days_per_week`, `session_minutes`, `split_preference` (nova na 3.1), `limitations`, `created_at` |
| `assessment_equipment` | Equipamentos escolhidos (FK para `equipment` do catálogo) |

- Cada envio cria uma **nova** anamnese; as antigas ficam como histórico (renovação do plano usa o histórico). A "atual" é a mais recente (`created_at`).
- RLS por dono (spec 006); `authenticated` recebe `select, insert` nas duas tabelas.
- Gravação pela função `save_assessment` (`security invoker`, RLS vale dentro dela): insere a anamnese com `auth.uid()` e os equipamentos por `slug`; slug inexistente aborta a transação.

## Glossário

| PRD (pt-BR) | Código |
|---|---|
| Anamnese | `assessment` |
| Objetivo: hipertrofia / emagrecimento / força / condicionamento | `goal`: `hypertrophy` / `weight_loss` / `strength` / `conditioning` |
| Nível: iniciante / intermediário / avançado | `experience_level`: `beginner` / `intermediate` / `advanced` |
| Divisão: deixar a IA decidir / full body / dividido (A/B/C…) | `split_preference`: `ai_decides` / `full_body` / `split` |

## Regras

- **Dias por semana:** inteiro de 1 a 7
- **Tempo por treino:** inteiro de 10 a 240 minutos (`MIN_SESSION_MINUTES`, `MAX_SESSION_MINUTES`)
- **Valores iniciais** (sem anamnese anterior): 3 dias, 60 minutos, "deixar a IA decidir"; objetivo, nível e equipamentos começam sem resposta (o usuário precisa escolher)
- **Divisão:** padrão "deixar a IA decidir"; a escolha é usada na geração (3.3)
- **Equipamentos:** ao menos um, sem repetição, todos do catálogo (revalidados no servidor; desconhecido → 422). "Peso corporal" é a opção para quem não tem equipamento
- **Limitações:** texto opcional, até 1.000 caracteres; espaços nas pontas são removidos; vazio vira `null`. Nunca vai para os logs
- **Falha ao salvar:** mensagem em pt-BR e o formulário mantém o que foi digitado
- O `user_id` vem só da sessão

## Implementação (3.1)

- `supabase/migrations/20261126000000_assessments.sql` — coluna `split_preference`, função `save_assessment`, permissões
- `src/lib/constants/assessment.ts` — valores de domínio e limites
- `src/lib/assessment/` — `assessment-schema.ts`, `assessment-repository.ts`, `assessment-service.ts`, `server-assessment-service.ts`
- `src/app/api/assessments/route.ts` — `POST` (handler fino)
- `src/app/(app)/assessment/` — página (Server Component) + `error.tsx`; formulário em `src/components/assessment/` (valida no aparelho com o mesmo schema e só então envia)
- Equipamentos do formulário vêm de `listEquipment` do repositório do catálogo (injetado no serviço como `EquipmentSource`)
- Validação local da migration: Postgres 16 com stub de `auth` — gravação, rollback com equipamento desconhecido/lista vazia e isolamento por RLS conferidos

## Checklist de aceite (3.1)

- [x] Migration com `split_preference` e gravação atômica
- [x] Schema com testes (válidos e inválidos)
- [x] Serviço e repositório com testes (equipamento desconhecido, falha do banco)
- [x] API `POST /api/assessments` (201, 400, 401, 422)
- [x] Formulário com erros por campo, carregamento, erro e sucesso; preenchido com a anamnese mais recente
- [x] Acessível (rótulos, `fieldset`/`legend`, foco visível, toque ≥ 44px)
- [x] Migration aplicada no Supabase (2026-11-24) e `save_assessment` testada lá num bloco desfeito no fim (gravação, equipamento desconhecido, RLS)
- [ ] Envio testado no navegador (ver ASM-001)

## Pendências

| ID | Descrição | Onde | Prioridade |
|---|---|---|---|
| PLN-001 | Fazer uma chamada real à Claude API (tempo, tokens, custo; ajustar esforço). Migration já aplicada no Supabase em 2026-11-24 (1.079 candidatos para uma academia comum) | `supabase/migrations/`, `src/lib/constants/plan-generation.ts` | Alta |
| ASM-001 | Testar o envio da anamnese no navegador (migration já aplicada; o Supabase está sem contas de usuário no momento) | `/assessment` | Alta (antes da 3.3) |

## Atualizações

### 2026-11-24 — 3.2 Wrapper da Claude API

- **Pedido:** etapa 3.2 — cliente da Claude API no servidor, com retry, timeout e validação da saída.
- **Mudança:** módulo `src/lib/integrations/claude/` (SDK oficial `@anthropic-ai/sdk`), retry genérico em `src/lib/http/retry-policy.ts`, chave em `src/lib/config/claude-config.ts`. Exceção de timeout para IA registrada no `AGENTS.md` (decisão do usuário).
- **Pendências:** nenhuma (a chave da API entra quando a 3.3 fizer a primeira chamada real).

#### Regras da 3.2

- **Somente servidor:** `ANTHROPIC_API_KEY` lida e validada só no servidor (`server-only`); nunca vai ao cliente nem aos logs
- **Modelo:** `claude-opus-5-5` (constante `CLAUDE_MODEL`); esforço por chamada (`low` a `max`, padrão `high`); pensamento adaptativo (padrão do modelo)
- **Saída estruturada:** o schema zod vira JSON Schema (`betaZodOutputFormat`) e a API é obrigada a segui-lo; o servidor revalida com o mesmo schema. JSON inválido ou fora do schema = falha (sem retry), mensagem amigável
- **Parada:** `refusal` (mesmo depois do fallback) e `max_tokens` (resposta cortada) = falha, sem retry
- **Fallback de recusa:** `fallbacks: "default"` (beta `server-side-fallback-2026-07-01`): a própria API refaz a chamada noutro modelo quando o primeiro recusa por política; vale o texto depois do último bloco `fallback`
- **Streaming:** sempre, com `finalMessage()`, para respostas longas não derrubarem a conexão
- **Retry (AGENTS.md, seção 7):** até 3 tentativas, espera 1 s e 2 s (exponencial); repete só 429, 5xx/529 e falha de conexão/timeout por tentativa; nunca outros 4xx. 429 respeita `Retry-After`; se a espera não couber no tempo restante, desiste. O retry automático do SDK fica desligado (`maxRetries: 0`)
- **Timeout:** exceção para IA — **120 s no total** (`AI_TOTAL_TIMEOUT_MS`), cada tentativa usa só o tempo que sobra; demais chamadas externas seguem 15 s
- **Erros:** 429 esgotado → `RateLimitExceededError` (HTTP 429); timeout, recusa, saída inválida, 5xx e outros → `ExternalServiceError` (HTTP 502), com mensagem pt-BR específica; o que o usuário digitou nunca se perde (quem chama mantém a anamnese)
- **Logs:** operação, tentativa, duração, tokens, `stop_reason`, nome/status do erro; nunca prompt, resposta ou chave
- **Cache de prompt:** fica para a 3.3 (catálogo repetido entre chamadas)

#### Implementação (3.2)

- `src/lib/constants/ai.ts` — modelo, esforço, `max_tokens`, beta do fallback, timeout da IA
- `src/lib/http/retry-policy.ts` — `runWithRetry` genérico (tentativas, backoff, teto total via `AbortSignal`, relógio/espera injetáveis)
- `src/lib/integrations/claude/claude-errors.ts` — classificação (repetir ou não) e conversão para erros do app
- `src/lib/integrations/claude/structured-output-client.ts` — `generate({ operation, system, prompt, schema, effort?, maxTokens? })`
- `src/lib/integrations/claude/server-claude-client.ts` — composition root (cliente do SDK com a chave validada)

#### Checklist de aceite (3.2)

- [x] Retry: sucesso após falha temporária, desistência após 3 tentativas, sem retry em 4xx, 429 com `Retry-After`, teto total
- [x] Saída: válida, JSON inválido, fora do schema, recusa, `max_tokens`, fallback
- [x] Erros convertidos com mensagem pt-BR; logs sem conteúdo
- [x] Nenhuma chamada real nos testes

### 2026-11-24 — 3.3 Geração do plano pela IA

- **Pedido:** etapa 3.3 — a IA monta o plano a partir da anamnese usando só exercícios do catálogo com mídia, com divisão full body ou A/B/C.
- **Mudança:** migration `20261126010000_generated_plans.sql` (`list_plan_candidates`, `create_generated_plan`, permissões de escrita do plano); módulo `src/lib/plan-generation/`; `POST /api/plans`; botão "Gerar plano com IA" na anamnese e no Início.
- **Pendências:** PLN-001 (migration no Supabase + chamada real medida), ASM-001 (teste no navegador).

#### Regras da 3.3 (decisões do usuário em 2026-11-24)

- **Plano ativo existente:** a tela pede confirmação ("substituir o plano atual?"); confirmado, o plano antigo é **arquivado** (histórico mantido) e o novo vira o ativo, na mesma transação. Sem confirmação, a API recusa (422)
- **Divisão (quantidade de treinos):**
  - "Full body" → exatamente 1 treino, rótulo "Full body"
  - "Dividido" → de 2 a `min(dias por semana, 5)` treinos, nunca menos de 2; rótulos "A", "B", "C"…
  - "Deixar a IA decidir" → até 2 dias por semana: 1 treino full body; 3 ou mais: a IA escolhe entre 1 e `min(dias, 5)`
  - A preferência do usuário sempre vence
- **Catálogo enviado:** só exercícios com mídia ativa cujos equipamentos estão **todos** entre os marcados na anamnese (`list_plan_candidates`); linha compacta por exercício (`slug`, músculos principais, equipamentos). Nada que identifique o usuário vai para a IA
- **Limitações:** o texto digitado vai para a IA marcado como informação do usuário (não como instrução); a IA deve evitar exercícios contraindicados
- **Saída da IA:** chaves em inglês; textos visíveis (categoria, observações) em pt-BR. O servidor rejeita o plano inteiro (falha amigável, sem retry automático) se houver: exercício fora da lista, exercício repetido no mesmo treino, rótulos repetidos, quantidade de treinos fora da regra, `repsMax < repsMin` ou valores fora dos limites (1–12 exercícios por treino, 1–10 séries, 1–50 repetições, descanso 0–600 s)
- **Gravação:** `create_generated_plan` (transação, `security invoker`): arquiva o ativo (se confirmado), cria plano (`origin = 'ai'`, objetivo e id da anamnese), treinos (ordem da IA) e exercícios (ordem da IA, `track_progression = false`). Exercício sem mídia ou inexistente aborta tudo
- **Validade:** começa hoje (`APP_TIME_ZONE`) e vale 6 semanas: `valid_until = starts_on + 41 dias` (42 dias de calendário, o último incluído)
- **Esforço:** `medium` (cabe nos 120 s); reavaliar depois de medir a chamada real
- **Cache de prompt:** instruções + catálogo no `system` com `cache_control` (nova tentativa com o mesmo equipamento sai mais barata)
- **Rota:** `POST /api/plans` `{ replaceActivePlan: boolean }`, `maxDuration = 130` s; usa a anamnese mais recente do usuário da sessão (sem anamnese → 422)

#### Checklist de aceite (3.3)

- [x] Regra da divisão e validação do plano com testes
- [x] Prompt sem dados de identificação; limitações marcadas como dado do usuário
- [x] Serviço com testes (sem anamnese, plano ativo sem confirmação, catálogo vazio, saída inválida, sucesso)
- [x] Gravação atômica validada em Postgres local
- [x] Tela: confirmação de substituição, carregamento longo, erro e sucesso
- [x] Migration aplicada no Supabase (2026-11-24)
- [ ] Uma chamada real medida (PLN-001)

## Fim da spec
