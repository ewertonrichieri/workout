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

## Teste de ponta a ponta (2026-11-24)

Usuário temporário (criado já confirmado pela API administrativa de autenticação) no Supabase real; app em modo produção nesta nuvem (`NODE_USE_ENV_PROXY=1`); navegador sem tela em 375px; geração real com Claude Haiku 5.5. Passaram:
- Sem sessão: `/` → login; `POST /api/plans` → 401; `/manifest.webmanifest` → 200
- Login → Início com "Fazer anamnese" → anamnese com aviso de saúde; salvar (hipertrofia, iniciante, 3 dias, 50 min, IA decide, halteres + banco + peso corporal, "dor leve no joelho direito") → reforço do aviso e botão de gerar
- Gerar plano: 16 s (IA 12 s), divisão A/B, 6 exercícios no treino A, observações respeitando o joelho; `/workout?review=1` com aviso de revisão, aviso de saúde com reforço e validade de 6 semanas
- Edição: 4 séries no 1º exercício + exercício adicionado pela busca ("panturrilha") → salvo e exibido
- Progressão: interruptor ligado, 4 séries × 12 repetições com 20 kg, "Finalizar treino" → card "Você fez 12 repetições em todas as séries com 20 kg. Sugestão: 21 kg." e campo preenchido com 21; Agenda com o treino
- Renovação: validade ajustada no banco para vencer em 3 dias → aviso no Início e no treino; "Renovar plano com a IA" → confirmação → novo plano em 15 s; o antigo ficou arquivado; o catálogo veio do cache (16.715 tokens lidos) e o histórico foi junto (entrada de 138 → 267 tokens)

Observações (não são defeitos): o Next 16 mantém a tela anterior oculta no DOM depois de navegar (`cacheComponents`), então seletores de teste devem filtrar elementos visíveis; nomes em inglês de parte do catálogo seguem pendentes (CAT-005); as mídias (R2/jsDelivr) não carregam nesta nuvem porque os hosts não estão liberados. Usuário e todos os dados apagados ao final (contagens zeradas).

## Pendências

| ID | Descrição | Onde | Prioridade |
|---|---|---|---|

## Atualizações

### 2026-11-24 — 3.2 Wrapper da Claude API

- **Pedido:** etapa 3.2 — cliente da Claude API no servidor, com retry, timeout e validação da saída.
- **Mudança:** módulo `src/lib/integrations/claude/` (SDK oficial `@anthropic-ai/sdk`), retry genérico em `src/lib/http/retry-policy.ts`, chave em `src/lib/config/claude-config.ts`. Exceção de timeout para IA registrada no `AGENTS.md` (decisão do usuário).
- **Pendências:** nenhuma (a chave da API entra quando a 3.3 fizer a primeira chamada real).

#### Regras da 3.2

- **Somente servidor:** `ANTHROPIC_API_KEY` lida e validada só no servidor (`server-only`); nunca vai ao cliente nem aos logs
- **Modelo:** `claude-haiku-5-5` (constante `CLAUDE_MODEL`; era `claude-opus-5-5` até a PLN-001); esforço por chamada (`low` a `max`, padrão `high`); pensamento adaptativo (padrão do modelo)
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
- [x] Uma chamada real medida (PLN-001, fechada em 2026-11-24)

### 2026-11-24 — 3.3 concluída com medição pendente

- **Pedido:** o usuário pediu para seguir para a 3.4 e deixar a medição da chamada real como pendência.
- **Mudança:** 3.3 marcada como concluída no checklist; PLN-001 continua aberta (medir tempo, tokens e custo de uma chamada real e reavaliar o esforço).
- **Pendências:** PLN-001

### 2026-11-24 — 3.4 Revisão e edição manual do plano

- **Pedido:** etapa 3.4 — revisar o plano gerado e editar os exercícios de cada treino (escopo confirmado pelo usuário).
- **Mudança:** tela `/workout/edit?workout=<rótulo>`, `PUT /api/workouts/:id/exercises`, função `save_workout_exercises` (migration `20261126020000_edit_workout_exercises.sql`), aviso de revisão depois da geração.
- **Pendências:** nenhuma (WED-001 fechada: migration aplicada em 2026-11-24)

#### Regras da 3.4

- **Revisão:** depois de gerar, a tela de treino abre com o aviso "Plano gerado pela IA — revise e ajuste o que quiser" e o link de edição (`/workout?review=1`)
- **Editar treino:** botão na tela de treino abre a edição do treino selecionado; só o plano **ativo** do usuário da sessão
- **Por exercício:** séries, repetições mín./máx., descanso (vazio = sem descanso), categoria e observação (vazias = sem); subir/descer; remover; trocar por outro do catálogo (mantém a prescrição); adicionar do catálogo (busca em `/api/exercises`, que só lista exercícios com mídia; já usados no treino ficam fora)
- **Rascunho:** nada é gravado até "Salvar alterações"; "Descartar alterações" volta ao estado salvo (é o desfazer das remoções e trocas)
- **Limites (os mesmos da geração):** 1 a 12 exercícios por treino, sem repetir exercício; 1–10 séries; 1–50 repetições com máx. ≥ mín.; descanso 0–600 s; categoria até 40 e observação até 300 caracteres. Validados no aparelho (erro por campo) e de novo no servidor
- **Histórico:** exercício mantido conserva o id (carga sugerida, "Salvar carga para progredir" e gráfico continuam). Exercício **trocado** vira um item novo (sem carga sugerida do exercício antigo, interruptor desligado). Removido sai do plano; as séries já registradas ficam no histórico (`set_logs.workout_exercise_id` vira nulo, `exercise_id` continua)
- **Gravação:** `save_workout_exercises(p_workout_id, p_exercises jsonb)` numa transação (`security invoker`, RLS): remove os que saíram, atualiza os mantidos, insere os novos, na ordem enviada; exercício sem mídia ou inexistente aborta tudo
- **Fora da 3.4:** criar, remover ou renomear treinos; plano do zero sem IA (TRN-001 segue pendente)

#### Implementação (3.4)

- `src/lib/training/workout-edit-schema.ts` (zod, mesmos limites da geração), `workout-edit-draft.ts` (rascunho puro: mover, remover, trocar, adicionar, validar), `workout-edit-repository.ts`, `workout-edit-service.ts` (dono do treino, duplicados, troca vira item novo), `server-workout-edit-service.ts`
- `src/app/api/workouts/[id]/exercises/route.ts` (`PUT`), `src/app/(app)/workout/edit/` (página + `error.tsx`)
- `src/components/plan-edit/` — `WorkoutEditor`, `EditExerciseCard`, `ExercisePicker` (busca em `/api/exercises`)
- Link "Editar treino {rótulo}" e aviso de revisão (`?review=1`) em `WorkoutPlanView`; a geração redireciona para `/workout?review=1`

#### Checklist de aceite (3.4)

- [x] Schema, rascunho, serviço e repositório com testes
- [x] Função SQL validada em Postgres local (edição, ordem, remoção com histórico preservado, rollback, outro usuário)
- [x] Editor com testes: editar, reordenar, remover e descartar, adicionar e trocar pelo catálogo, erros por campo, falha ao salvar sem perder alterações
- [x] Aviso de revisão depois da geração e link de edição na tela de treino
- [x] Migration aplicada no Supabase (2026-11-24)

### 2026-11-24 — 3.3 volta para em progresso

- **Pedido:** o usuário pediu para voltar a 3.3 para em progresso.
- **Mudança:** a chamada real (PLN-001) é critério de aceite da etapa (`pending-items.md`); a 3.3 só é concluída depois de medida.
- **Pendências:** PLN-001

### 2026-11-24 — PLN-001 chamada real medida; geração com Haiku 5.5

- **Pedido:** fazer a chamada real da PLN-001; o usuário pediu o modelo mais barato, Haiku 5.5, e confirmou que o app passa a gerar o plano com ele.
- **Mudança:** `generate()` aceita `model` por chamada (padrão `CLAUDE_MODEL`); script `scripts/measure-plan-generation.ts` faz uma chamada real com a lógica do app (prompt, schema, validação) e imprime tempo, tokens e custo, sem gravar nada. 3.3 concluída.
- **Pendências:** nenhuma (PLN-001 fechada)

#### Medição (2026-11-24)

Catálogo real do Supabase (`list_plan_candidates` com barra, banco, peso corporal, polia, halteres, barra W, máquinas, Smith, barra fixa e anilhas = 1.068 candidatos, ~26 mil tokens no `system`). Anamnese de exemplo: hipertrofia, intermediário, 4 dias, 60 min, "deixar a IA decidir", dor no ombro em movimentos acima da cabeça. Esforço `medium`.

| Chamada | Tempo | Entrada | Cache (escrita / leitura) | Saída | Custo |
|---|---|---|---|---|---|
| 1ª (cache frio) | 16,6 s | 152 | 26.143 / 0 | 3.609 | ~US$ 0,005 |
| 2ª (cache quente) | 15,5 s | 152 | 0 / 26.143 | 3.356 | ~US$ 0,002 |
| 3ª (código final) | 18,9 s | 152 | 0 / 26.143 | 4.685 | ~US$ 0,003 |

- Planos válidos nas três (nenhum problema em `findGeneratedPlanIssues`): 4 treinos A/B/C/D com 5 a 7 exercícios, pt-BR nas categorias e observações; nenhum exercício acima da cabeça (a limitação foi respeitada)
- Bem abaixo do teto de 120 s: esforço `medium` mantido
- O cache de prompt funciona entre chamadas com o mesmo equipamento (leitura de 26 mil tokens a 0,1×)
- Preços usados: Haiku 5.5 US$ 0,10 / 0,50 por milhão (entrada / saída, prompts até 100 mil tokens), escrita de cache 1,25× e leitura 0,1× da entrada
- O fallback de recusa (`fallbacks: "default"`) foi aceito pela API com o Haiku; não houve recusa nas chamadas

### 2026-11-24 — Haiku 5.5 como modelo padrão do app

- **Pedido:** o usuário pediu que o app use Haiku 5.5, não Opus.
- **Mudança:** `CLAUDE_MODEL = "claude-haiku-5-5"` (`src/lib/constants/ai.ts`), padrão de todas as chamadas à IA; a constante `PLAN_GENERATION_MODEL` saiu (a geração usa o padrão). O script de medição também usa o padrão.
- **Pendências:** nenhuma

### 2026-11-24 — 3.6 Sugestão de renovação

- **Pedido:** etapa 3.6 — sugerir a renovação do plano ao fim da validade usando o histórico (regra confirmada pelo usuário).
- **Mudança:** aviso no Início e na tela de treino; a geração com plano ativo envia à IA um resumo do histórico do plano atual (migration `20261126030000_progression_reps.sql`, função `plan_history_summary`).
- **Pendências:** nenhuma

#### Regras da 3.6

- **Quando avisar:** nos últimos 7 dias de validade (`RENEWAL_NOTICE_DAYS`, `remainingDays <= 7`) e depois de vencer
- **Aviso:** "Seu plano vence em N dias" / "Seu plano venceu em DD/MM/AAAA" + botão "Renovar plano com a IA" (mesmo fluxo da 3.3: confirmação, plano antigo arquivado) + link para atualizar a anamnese antes. Nunca renova sozinho
- **Histórico enviado à IA** (só ao substituir um plano ativo): sessões finalizadas no plano e, por exercício do plano (slug), quantas sessões, maior carga na primeira e na última sessão e repetições na última. Nada que identifique o usuário. A IA pode manter o que funcionou, variar exercícios e ajustar o volume
- Sem histórico (nenhuma sessão), a geração segue só com a anamnese

### 2026-11-24 — 3.7 Aviso de saúde

- **Pedido:** etapa 3.7 — aviso de saúde na anamnese e no plano.
- **Mudança:** componente `HealthNotice` no topo da anamnese e abaixo da validade na tela de treino; reforço quando a anamnese mais recente tem limitação (`GenerationStatus.hasLimitations`).
- **Pendências:** nenhuma

#### Regras da 3.7

- Texto fixo (pt-BR): o plano é gerado por IA e não substitui profissional de educação física ou de saúde; com lesão, dor ou condição médica, consultar antes; parar se sentir dor
- Reforço quando há limitação escrita na anamnese mais recente: procurar orientação profissional antes de seguir o plano
- Informativo: não bloqueia nada; `role="note"`

### 2026-11-24 — 3.8 PWA instalável

- **Pedido:** etapa 3.8 — app instalável no celular, usando o recurso do próprio Next.js (pedido do usuário).
- **Mudança:** `src/app/manifest.ts` (`MetadataRoute.Manifest`), `src/app/icon.tsx` (192, 512 e mascarável, gerados com `ImageResponse` + `generateImageMetadata`), `src/app/apple-icon.tsx` (180), `viewport.themeColor` e `appleWebApp` no layout; manifest e ícones liberados no proxy de autenticação.
- **Pendências:** nenhuma

#### Regras da 3.8

- Nome "Workout", `display: standalone`, `start_url: /`, cores do tema (`#12120e` fundo, `#6b690c` destaque), idioma pt-BR
- Sem service worker: o PRD pede só "instalável" e o app depende do servidor; offline (ex.: Serwist) fica fora do MVP
- `/manifest.webmanifest`, `/icon/*` e `/apple-icon` são públicos (o navegador os busca sem sessão)

## Fim da spec
