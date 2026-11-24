# 012 — Treino adaptativo do dia e substituição na hora (Fase 3B, V2)

**Etapas:** 3B.1 a 3B.4 (checklist `docs/reference/001-checklist-implementacao.md`). Esta spec foi promovida de `docs/planning/001-planejamento-inicial.md` (Fase 3B).

**Status:** aprovada. Decisões D1 a D7 confirmadas pelo usuário em 2026-11-24.

**Pré-requisito:** V1 concluída. A AUTH-002 (spec 007, teste manual do cadastro por e-mail) seguia aberta; o usuário pediu para iniciar a 3B.1 mesmo assim (2026-11-24).

## Objetivo

O treino se adapta ao dia do usuário, que é o principal diferencial do app:
1. Um **check-in rápido** antes do treino (sono, energia, dor por região, tempo disponível)
2. A **IA ajusta o treino de hoje** quando o check-in pede (menos volume, troca do que afeta a região dolorida, treino mais curto). O usuário aceita ou recusa
3. A **percepção de esforço** por série ("fácil / ok / no limite") refina a carga sugerida na próxima sessão
4. A **troca na hora** de um exercício (aparelho ocupado ou quebrado) por um equivalente

Em todos os casos o **plano não muda**: os ajustes e as trocas valem só para a sessão de hoje. Para mudar o plano, o usuário continua usando a edição (3.4).

## Escopo

**Entra:**
- 3B.1: check-in antes do treino, gravado no banco
- 3B.2: ajuste do treino de hoje pela IA a partir do check-in, com revisão e aceite pelo usuário
- 3B.3: esforço por série e regra de autorregulação da carga sugerida
- 3B.4: botão "Trocar" no card do exercício, com sugestões equivalentes do catálogo

**Não entra:**
- Mudar o plano a partir do check-in, do esforço ou da troca (só a sessão de hoje muda)
- Notificações ou lembretes de check-in
- Fotos de equipamentos (Fase 4)
- Previsão de evolução ou estagnação (Fase 5B)
- Check-in depois do treino (dor no dia seguinte, por exemplo)

## Glossário

| PRD (pt-BR) | Código |
|---|---|
| Check-in pré-treino | `readiness_checkin` |
| Sono: ruim / ok / bom | `sleep_quality`: `poor` / `ok` / `good` |
| Energia: baixa / normal / alta | `energy_level`: `low` / `normal` / `high` |
| Dor/cansaço por região | `readiness_checkin_pains` (`body_region`, `intensity`) |
| Intensidade: leve / moderada / forte | `intensity`: `mild` / `moderate` / `severe` |
| Ajuste do treino do dia | `session_adjustment` |
| Tipo do ajuste: reduzido / removido / trocado | `change_type`: `reduced` / `removed` / `replaced` |
| Percepção de esforço: fácil / ok / no limite | `effort`: `easy` / `ok` / `max` |
| Substituição na hora | `exercise_substitution` |
| Motivo da troca: aparelho ocupado / aparelho quebrado / outro | `reason`: `equipment_busy` / `equipment_broken` / `other` |

**Regiões do corpo (`body_region`):** `neck` (pescoço), `shoulders` (ombros), `upper_back` (costas, parte de cima), `lower_back` (lombar), `chest` (peito), `elbows` (cotovelos), `wrists` (punhos), `hips` (quadril), `knees` (joelhos), `ankles` (tornozelos). São articulações e regiões, não músculos do catálogo, porque dor costuma ser na articulação. Quem relaciona região e exercício é a IA (3B.2).

## Modelo de dados (proposta)

Normalizado (3FN), RLS por dono em todas as tabelas, migrations versionadas, gravação por funções `security invoker` (o mesmo padrão das specs 010 e 011).

| Tabela | Colunas | Observação |
|---|---|---|
| `readiness_checkins` | `id`, `user_id`, `workout_id` (FK, `on delete set null`), `sleep_quality`, `energy_level`, `available_minutes`, `created_at` | Um por início de treino; índice `(user_id, created_at desc)` |
| `readiness_checkin_pains` | `checkin_id` (FK, `on delete cascade`), `body_region`, `intensity` | PK `(checkin_id, body_region)`; sem dor = nenhuma linha |
| `session_adjustments` | `id`, `checkin_id` (FK, `cascade`), `workout_exercise_id` (FK, `cascade`), `change_type`, `replacement_exercise_id` (FK `exercises`, só em `replaced`), `sets`, `reps_min`, `reps_max` (nulos em `removed`), `reason` (pt-BR, até 300 caracteres) | O que a IA mudou e por quê; único por `(checkin_id, workout_exercise_id)`. Gravado **só se o usuário aceitar** |
| `workout_sessions.readiness_checkin_id` | FK nova, nula, `on delete set null` | Liga a sessão finalizada ao check-in do dia |
| `set_logs.effort` | coluna nova, nula, `check (effort in ('easy','ok','max'))` | Opcional por série |
| `exercise_substitutions` | `session_id` (FK, `cascade`), `workout_exercise_id` (FK, `set null`), `replacement_exercise_id` (FK `exercises`), `reason` | PK `(session_id, workout_exercise_id)`; gravada ao finalizar |

O PRD previa `workout_sessions.ajustes`. Aqui ele vira a tabela `session_adjustments`, para não guardar JSON aninhado (`AGENTS.md`, seção 5).

## 3B.1 — Check-in antes do treino

- **Quando:** ao tocar "Começar treino" na tela `/workout` (botão novo), antes do primeiro registro de série do dia. Feito uma vez, o check-in vale para aquele treino naquele dia (`APP_TIME_ZONE`)
- **Opcional:** botão "Pular check-in" para treinar com o plano como está. Pular nunca bloqueia nada
- **Campos** (meta de uns 10 segundos, tudo com toque, sem digitar):
  - Sono: ruim / ok / bom
  - Energia: baixa / normal / alta
  - Tempo disponível: opções rápidas (ex.: 20, 30, 45, 60, 90 min). O padrão é o `session_minutes` da anamnese mais recente
  - Dor ou cansaço: "Nenhuma" (padrão) ou uma ou mais regiões, cada uma com intensidade leve / moderada / forte
- **API:** `POST /api/readiness-checkins` `{ workoutId, sleepQuality, energyLevel, availableMinutes, pains: [{ bodyRegion, intensity }] }` → `201 { success, data: { checkinId, needsAdjustment } }`. O servidor revalida tudo com o mesmo schema zod; o treino precisa ser do plano ativo do usuário (senão 404); regiões repetidas → 400; `userId` só da sessão
- **Precisa de ajuste?** (`needsAdjustment`, regra pura e testada): sim se o sono for ruim, ou a energia baixa, ou houver alguma dor, ou o tempo disponível for menor que o `session_minutes` da anamnese. Se não, o treino segue como está e **não há chamada à IA** (economiza custo e tempo)
- **Severidade forte:** além do ajuste, aparece o reforço do aviso de saúde (3.7): com dor forte, considere não treinar essa região e procure orientação
- **Rascunho:** o check-in fica ligado ao rascunho do dia (spec 010, 2.4); ao finalizar, a sessão grava o `readiness_checkin_id`
- **Falha ao salvar:** mensagem em pt-BR, os campos continuam preenchidos e o botão "Treinar sem check-in" continua disponível

### Implementação (3B.1)

- Migration `supabase/migrations/20261127000000_readiness_checkins.sql`: tabelas `readiness_checkins` e `readiness_checkin_pains` (RLS por dono, `select, insert`), `workout_sessions.readiness_checkin_id` (único quando preenchido: um check-in vale para uma sessão), função `save_readiness_checkin` (`security invoker`; treino precisa ser visível pela RLS) e `finish_workout_session` com o 4º parâmetro opcional `p_readiness_checkin_id` (o check-in precisa ser do mesmo treino)
- `src/lib/constants/readiness.ts` — valores de domínio, respostas padrão (sono "ok", energia "normal", sem dor), opções de tempo
- `src/lib/readiness/` — `readiness-schema.ts` (zod, tempo com os mesmos limites da anamnese: 10–240 min), `readiness-rules.ts` (`needsAdjustment`, `hasSeverePain`, opções de tempo), `readiness-repository.ts`, `readiness-service.ts` (treino do plano ativo, tempo da anamnese mais recente), `server-readiness-service.ts`
- `src/app/api/readiness-checkins/route.ts` — `POST` (201, 400, 401, 404)
- `src/components/readiness/` — `ReadinessCheckinPanel` (convite, formulário, resumo), `ReadinessCheckinForm`, `PainRegionFields`, `ReadinessOptionGroup` (grupo de opções controlado), `useReadinessForm`
- Rascunho do dia (`set-log-draft.ts`): campo `readiness` (feito ou pulado), mantido ao restaurar e quando a carga sugerida muda; "Finalizar treino" envia o `readinessCheckinId`
- `sendJsonRequestForData` (`src/lib/http/send-json-request.ts`): chamada do cliente que também valida o `data` da resposta
- `GenerationStatus.sessionMinutes`: tempo da anamnese, usado como resposta padrão do tempo disponível
- **Comportamento na 3B.1:** com `needsAdjustment`, o resumo dizia "Seu check-in indica um dia mais leve…" (sem IA). Desde a 3B.2, aparece a proposta de ajuste da IA no lugar
- Validação: Postgres 16 local (gravação, ligação com a sessão, chamada antiga com 3 parâmetros, reuso do check-in, região inválida, treino de outro usuário, RLS) e o mesmo roteiro no Supabase real num bloco desfeito no fim (2026-11-24)

## 3B.2 — Ajuste do treino de hoje pela IA

- **Quando:** só quando `needsAdjustment` é verdadeiro. Tela "Ajustando seu treino…" com carregamento longo (mesmo padrão da geração na 3.3)
- **API:** `POST /api/readiness-checkins/:id/adjustment` → proposta de ajuste (ainda **não gravada**). `maxDuration` igual ao da geração
- **O que vai para a IA:** check-in (sem texto livre), prescrição do treino de hoje (slug, músculos, equipamentos, séries, repetições, descanso), `session_minutes` da anamnese, e candidatos para troca: exercícios com mídia cujos equipamentos estão todos na anamnese e que têm pelo menos um músculo principal em comum com algum exercício do treino. As limitações da anamnese vão marcadas como informação do usuário (mesma regra da 3.3). Nada que identifique o usuário
- **O que a IA pode fazer** (o servidor valida; fora disso → falha amigável):
  - `reduced`: menos séries e/ou repetições. **Nunca mais** séries ou repetições que o plano
  - `removed`: tirar o exercício de hoje
  - `replaced`: trocar por um candidato da lista (mesma prescrição ou menor), sem repetir exercício no treino
  - Cada mudança com `reason` curto em pt-BR. Exercício sem mudança não aparece
  - Pelo menos 1 exercício precisa sobrar no treino
  - Duração estimada do treino ajustado (minutos) dentro do tempo disponível; a estimativa vem da IA e é mostrada como "aproximadamente" (nunca como certa)
- **Revisão (decisão do usuário, nunca automática):** a tela mostra o antes e o depois por exercício, com o motivo, e dois botões: "Usar treino ajustado" e "Manter treino original". Aceitar grava `session_adjustments` (função `save_session_adjustments`, transação) e o rascunho do dia passa a usar a prescrição ajustada. Recusar não grava nada
- **Desfazer:** "Voltar ao treino original" fica disponível até a primeira série com check
- **Cargas:** o ajuste não mexe em carga. Um exercício trocado começa sem carga sugerida (igual à troca na 3.4)
- **Falha da IA** (timeout, 429, saída fora do schema): "Não foi possível ajustar o treino agora. Você pode treinar com o plano normal." O check-in continua gravado
- **Modelo e esforço:** `CLAUDE_MODEL` (Haiku 5.5), esforço `medium`; medir uma chamada real antes de concluir a etapa (como na PLN-001). Instruções e candidatos com `cache_control`

### Regras de implementação (3B.2, 2026-11-24)

- **Quem pode pedir ajuste** (o servidor confere, nunca confia no cliente): check-in do usuário da sessão, **feito hoje** (`APP_TIME_ZONE`), cujo treino é do plano ativo, ainda sem sessão finalizada, e com `needsAdjustment` verdadeiro (recalculado no servidor). Fora disso → 404 (não é dele / treino fora do plano) ou 422 (outro dia, já finalizado, não precisa de ajuste). Assim nenhuma chamada à IA é gasta à toa
- **Sem anamnese** (plano manual): sem tempo de referência e sem lista de candidatos; a IA só pode reduzir ou remover
- **Chave dos exercícios para a IA:** o `slug` do exercício (único no treino); o servidor converte para o id da prescrição. Para cada exercício do treino vão músculos principais e equipamentos (função `list_exercise_profiles`)
- **Proposta resolvida:** a API devolve, por mudança, o id da prescrição, o tipo, a prescrição final (séries e repetições; nula em `removed`), o motivo e, em `replaced`, o exercício novo com nome e mídia; mais `summary` (pt-BR) e `estimatedMinutes`. Sem mudanças é uma resposta válida ("a IA manteve o treino")
- **Gravar, desfazer:** `PUT /api/readiness-checkins/:id/adjustment` `{ changes }` → `save_session_adjustments` troca **todas** as mudanças do check-in numa transação (`[]` = voltar ao original). O servidor revalida com as mesmas regras da proposta (exercício do treino, nunca mais que o plano, troca só por candidato, sobra ≥ 1 exercício). Depois de finalizado, não muda mais (422)
- **Finalizar:** `finish_workout_session` lê os ajustes do check-in: séries de exercício removido são recusadas; o limite de séries é o ajustado; no exercício trocado, `set_logs.exercise_id` é o novo (vindo do banco, nunca do cliente) e `workout_exercise_id` continua o da prescrição. Histórico e carga sugerida seguem por `exercise_id`, então o trocado conta para o exercício novo
- **No aparelho:** a proposta fica no rascunho do dia (`proposed` → `accepted` ou `declined`), para não chamar a IA de novo ao recarregar a página. O treino mostrado é o ajustado: removidos somem, reduzidos mostram a nova prescrição e o motivo, trocados mostram o exercício novo com "No lugar de {original} hoje", sem carga sugerida e sem o interruptor "Salvar carga para progredir" (ele é da prescrição original)
- **Desfazer:** "Voltar ao treino original" (grava `[]`) aparece enquanto nenhuma série tiver check
- **Falha da IA:** botão "Tentar de novo" e o treino normal continua disponível

### Implementação (3B.2)

- Migration `supabase/migrations/20261127010000_session_adjustments.sql`: tabela `session_adjustments` (RLS pelo dono do check-in; `select, insert, delete`; checks: `replaced` ⇔ exercício novo, `removed` sem prescrição, `reps_max ≥ reps_min`), `list_exercise_profiles(slugs)` (músculos principais e equipamentos, mesmo formato de `list_plan_candidates`), `save_session_adjustments(checkin, changes)` (troca tudo numa transação; prescrição precisa ser do treino do check-in; exercício novo precisa ter mídia; erro `WK002` depois de finalizado) e `finish_workout_session` seguindo os ajustes
- `src/lib/readiness/adjustment-schema.ts` — saída da IA (`aiDailyAdjustmentSchema`), mudança aceita, proposta e o estado no rascunho (`draftAdjustmentSchema`)
- `src/lib/readiness/adjustment-rules.ts` — `resolveAiChanges`, `findChangeIssues`, `findAiAdjustmentIssues` (códigos de problema só nos logs), `selectReplacementCandidates`
- `src/lib/readiness/adjustment-prompt.ts` — instruções + lista de trocas no `system` (com cache); check-in, tempo e prescrição de hoje no pedido; limitações marcadas como dado do usuário (reaproveita `formatLimitations` e `formatCandidate` da 3.3)
- `src/lib/readiness/adjustment-repository.ts`, `adjustment-service.ts`, `server-adjustment-service.ts`; rota `src/app/api/readiness-checkins/[id]/adjustment/route.ts` (`POST` propõe, `maxDuration = 130`; `PUT` grava ou desfaz)
- `src/lib/readiness/adjusted-workout.ts` — `adjustWorkoutForDay` (treino de hoje a partir do ajuste aceito) e `omitPrescriptions` (tira carga sugerida e aumento de carga dos trocados e removidos)
- Rascunho: `realignDraft`, `alignDraftToWorkout`, `hasCheckedSets` em `set-log-draft.ts`; `useWorkoutDraft` devolve o treino de hoje
- Tela: `src/components/readiness/daily-adjustment-panel.tsx` (carregando, falha com "Tentar de novo", revisão antes/depois, aceito com desfazer, recusado), `adjustment-change-item.tsx`, `adjustment-request.ts`; aviso no card (`DailyChangeNotice`) e interruptor escondido no exercício trocado
- `WorkoutExercise.dailyChange` (opcional): mudança de hoje mostrada no card
- Script `scripts/measure-daily-adjustment.ts` (chamada real com a lógica do app, nada é gravado); custo e leitura do catálogo compartilhados com o script da PLN-001 em `scripts/lib/claude-usage.ts`
- Validação: Postgres 16 local e Supabase real num bloco desfeito no fim (salvar, refazer, desfazer, troca registrada com o exercício novo, removido recusado ao finalizar, sem mudança depois de finalizar, RLS entre usuários)

#### Medição (2026-11-24)

Treino de exemplo com 6 exercícios (3×10, 60 s de descanso): supino reto com halteres, remada sentada na máquina, avanço com halteres, agachamento com halteres, elevação lateral e tríceps corda. Check-in: dormiu mal, energia baixa, dor moderada nos joelhos, 30 min (usual 60). Equipamentos: banco, polia, halteres, máquina, peso corporal e corda → 392 candidatos a troca (de 863), ~11 mil tokens no `system`. Haiku 5.5, esforço `medium`.

| Chamada | Tempo | Entrada | Cache (escrita / leitura) | Saída | Custo |
|---|---|---|---|---|---|
| 1ª (cache frio) | 9,5 s | 357 | 10.978 / 0 | 1.887 | ~US$ 0,0024 |
| 2ª (cache quente) | 6,0 s | 357 | 0 / 10.978 | 1.410 | ~US$ 0,0009 |

- As duas respostas passaram em todas as regras (nenhum problema em `findAiAdjustmentIssues`), com duração estimada de 22 e 25 min (dentro dos 30)
- Joelho respeitado nas duas: avanço removido e agachamento trocado (ponte de glúteo na 1ª, levantamento terra romeno com halteres na 2ª); os demais com 2 séries em vez de 3
- Bem abaixo do teto de 120 s: esforço `medium` mantido

## 3B.3 — Percepção de esforço e autorregulação

- **Por série:** depois do check da série, três botões opcionais "fácil / ok / no limite" (`role="radiogroup"`, toque ≥ 44 px). Não marcar é permitido (`effort` nulo). Fica no rascunho e vai em `POST /api/workout-sessions` (campo `effort` opcional por série; `finish_workout_session` grava em `set_logs.effort`)
- **Autorregulação (D5 confirmada pelo usuário em 2026-11-24, versão simplificada)**, só para exercícios com "Salvar carga para progredir" ligado, sempre a partir da última sessão com carga (mesma base das 2.7 e 3.5):
  1. **Subir** continua sendo só pela regra da 3.5 (todas as séries no máximo de repetições, com a mesma carga), **e agora só se nenhuma série foi "no limite"**. Não existe subida por "fácil"
  2. **Desce** (−5%, arredondado para 0,5 kg, mínimo −1 kg, nunca abaixo de 0) quando 2 ou mais séries foram "no limite" com menos que `reps_min` repetições
  3. **Mantém** a última carga nos outros casos
  4. Sem esforço marcado, vale só a regra da 3.5 (nada muda para quem não usa)
  5. Interruptor desligado → nenhuma sugestão de carga (nem subir nem descer). É a forma de o usuário travar a carga de um exercício (ex.: histórico de lesão)
- **Card:** o motivo sempre aparece, por exemplo "Você marcou 'no limite' em uma série. A carga fica em 20 kg." ou "2 séries no limite abaixo de 8 repetições com 30 kg. Sugestão: 28,5 kg."
- **Nunca automática no plano:** é só o valor inicial do campo, editável, e só preenche um rascunho ainda não editado (regra da 2.7)
- Constantes nomeadas: `PROGRESSION_DECREASE_RATIO`, `MIN_MAX_EFFORT_SETS_FOR_DECREASE`

### Regras de implementação (3B.3, 2026-11-24)

- **Esforço no rascunho:** cada série guarda `effort` opcional; os botões aparecem só depois do check da série; desmarcar o check apaga o esforço daquela série
- **Base da regra:** a mesma da 2.7/3.5, a última sessão finalizada com carga do exercício (`latest_set_loads` passa a devolver também o `effort`), só as séries prescritas
- **Descida:** carga de partida = a maior carga entre as séries "no limite" abaixo de `reps_min`; a sugestão vale para todas as séries (como a subida da 3.5)
- **Manter por "no limite":** quando a regra da 3.5 subiria a carga mas alguma série foi "no limite", o card diz o motivo: "Você chegou ao máximo de repetições, mas marcou 'no limite': a carga fica em {carga} kg."
- **Código:** `LoadIncrease` vira `LoadAdjustment` (`increase` / `decrease` / `hold`), em `src/lib/training/load-adjustments.ts`

### Implementação (3B.3)

- Migration `supabase/migrations/20261127020000_set_effort.sql`: `set_logs.effort` (`easy` / `ok` / `max`, nulo), `finish_workout_session` grava o esforço (mantém as regras do ajuste da 3B.2) e `latest_set_loads` devolve o `effort`
- `src/lib/constants/training.ts` — `SET_EFFORTS`, `MAX_SET_EFFORT`, `PROGRESSION_DECREASE_RATIO` (5%), `PROGRESSION_MIN_DECREASE_KG` (1 kg), `MIN_MAX_EFFORT_SETS_FOR_DECREASE` (2)
- `src/lib/training/load-adjustments.ts` — `computeDecreasedLoad` e `buildLoadAdjustments` (descer antes de subir; subir só sem "no limite"; senão `hold` com o motivo); `plan-service.ts` aplica `increase` e `decrease` em todas as séries e deixa o `hold` com a carga repetida
- Rascunho (`set-log-draft.ts`): `effort` opcional por série, apagado quando a série perde o check; valor desconhecido guardado no aparelho é descartado; "Finalizar treino" envia `effort` (nulo quando não marcado); `session-schema.ts` aceita `effort` opcional
- Tela: `src/components/workout/set-effort-choice.tsx` (`role="radiogroup"`, "Esforço da série N de {exercício}", opções de 44 px) logo abaixo da série com check; avisos de descer e de manter no card
- Validação: Postgres 16 local e Supabase real num bloco desfeito no fim (esforço gravado e devolvido, valor inválido recusado, RLS entre usuários)

## 3B.4 — Substituição na hora

- **Botão "Trocar"** no card do exercício na tela de treino (antes ou durante o registro)
- **Motivo:** aparelho ocupado / aparelho quebrado / outro (opcional, um toque)
- **Sugestões:** até 3 exercícios
  1. O servidor pré-filtra os candidatos: com mídia, equipamentos todos na anamnese, pelo menos um músculo principal em comum, fora do treino de hoje e sem o equipamento do exercício original quando o motivo for "aparelho quebrado" ou "ocupado" (se o original usa máquina ou polia, por exemplo)
  2. A IA escolhe os 3 mais equivalentes no padrão de movimento, com motivo curto em pt-BR (o catálogo não tem `movement_pattern` preenchido, por isso a IA cobre essa parte)
  3. **Se a IA falhar**, aparecem os 3 primeiros do pré-filtro ordenados por músculos principais e secundários em comum, com o aviso "sugestões automáticas" (nunca apresentadas como equivalentes certos)
- **API:** `POST /api/workout-exercises/:id/substitutions` `{ reason }` → candidatos (com nome, miniatura e motivo). Só exercício do plano ativo do usuário (senão 404)
- **Escolher:** o card passa a mostrar o novo exercício com a mesma prescrição, mídia, link do catálogo e o aviso "No lugar de {original} hoje". "Desfazer troca" volta ao original enquanto não houver série com check no substituto
- **Gravação:** ao finalizar, `finish_workout_session` recebe a troca por `workoutExerciseId` e grava `exercise_substitutions`. As séries do substituto ficam com `set_logs.exercise_id` = substituto e `workout_exercise_id` = prescrição original. O servidor revalida que o substituto tem mídia e não está repetido no treino. O cliente nunca define o `exercise_id` direto; ele vem da troca validada
- **Histórico coerente:** a evolução (2.8) e a carga sugerida (2.7/3.5) seguem por `exercise_id`, então as séries do substituto contam para o substituto e o exercício original continua com o histórico dele
- **Trocar no plano:** fora desta etapa (use "Editar treino", 3.4)

### Regras de implementação (3B.4, 2026-11-24)

- **Quando o botão aparece:** "Trocar exercício" só enquanto o exercício não tem série com check; trocar limpa as séries digitadas dele (o substituto começa sem carga sugerida e sem o interruptor "Salvar carga para progredir", como na 3B.2)
- **Pré-filtro (função `list_substitution_candidates`):** exercícios com mídia, que dividem ao menos um músculo principal com o exercício planejado e cujos equipamentos estão todos na anamnese mais recente. **Sem anamnese:** vale o conjunto de equipamentos dos exercícios do plano ativo mais "peso corporal"
- **Fora da lista:** exercícios do treino planejado e os que o aparelho já mostra hoje (trocados no ajuste ou em outra troca; o cliente informa só para filtrar, e o servidor revalida ao finalizar)
- **Aparelho ocupado ou quebrado:** saem os candidatos que usam algum equipamento do exercício original, exceto "peso corporal". "Outro" ou sem motivo: sem esse corte
- **Ordem automática:** mais músculos principais em comum, depois mais secundários em comum, depois o slug (estável). A IA recebe no máximo os 40 primeiros (`MAX_SUBSTITUTION_CANDIDATES_FOR_AI`) e devolve de 1 a 3 slugs da lista, sem repetir, cada um com motivo em pt-BR; fora disso, ou se a IA falhar, valem os 3 primeiros da ordem automática com o aviso "Sugestões automáticas"
- **Sem candidatos:** 422 "Nenhum exercício equivalente com o seu equipamento"
- **Junto com o ajuste da 3B.2:** a troca vale por cima do ajuste (inclusive de um exercício já trocado pela IA); exercício removido pelo ajuste não aparece, então não pode ser trocado
- **Rascunho:** as trocas ficam no rascunho do dia (por prescrição), junto com o check-in
- **Finalizar:** `finish_workout_session(…, p_substitutions)` grava `exercise_substitutions` (prescrição do treino, exercício com mídia, motivo) e usa o substituto em `set_logs.exercise_id`; recusa substituto repetido ou que já está no treino

### Implementação (3B.4)

- Migration `supabase/migrations/20261127030000_exercise_substitutions.sql`: tabela `exercise_substitutions` (RLS pelo dono da sessão; `select, insert`), `list_substitution_candidates(original, equipamentos)` (original + candidatos com músculos principais, secundários e equipamentos), `save_exercise_substitutions` (chamada pela finalização; recusa prescrição de outro treino, exercício sem mídia, substituto repetido, já no treino, igual à troca da IA de outro exercício ou de exercício removido no ajuste) e `finish_workout_session` com o 5º parâmetro `p_substitutions` (`set_logs.exercise_id` = troca na hora, senão troca do ajuste, senão o planejado)
- `src/lib/constants/substitution.ts` — motivos, limites, operação e esforço (`low`)
- `src/lib/substitution/` — `substitution-schema.ts` (pedido, saída da IA, resultado, troca no rascunho), `substitution-rules.ts` (`filterCandidates`, `rankCandidates`, `findSuggestionIssues`), `substitution-prompt.ts`, `substitution-repository.ts`, `substitution-service.ts` (IA com até 40 candidatos; falha, 429 ou resposta fora da lista → ordem automática), `server-substitution-service.ts`; rota `POST /api/workout-exercises/[id]/substitutions` (`maxDuration = 130`)
- Rascunho: `substitutions` por prescrição e `setSubstitution` (limpa as séries digitadas daquele exercício); `buildFinishPayload` envia as trocas; `session-schema.ts`/`session-service.ts` revalidam (prescrição do treino, sem repetir)
- Treino de hoje: `adjustWorkoutForDay(plano, check-in, trocas)` aplica o ajuste e depois as trocas (`dailyChange.changeType = "substituted"`); carga sugerida e ajuste de carga não valem para o substituto
- Tela: `src/components/substitution/` — `SubstitutionControl` ("Trocar exercício" / "Desfazer troca"), painel com motivo opcional, busca, erro e cancelar; `SubstitutionSuggestions` (miniatura, nome, motivo, "Usar {nome}", aviso de sugestões automáticas); aviso "No lugar de {original} hoje" no card
- Script `scripts/measure-substitution.ts` (chamada real com o filtro, a ordem, o prompt e a validação do app; nada é gravado)
- Validação: Postgres 16 local e Supabase real num bloco desfeito no fim (candidatos, troca gravada com motivo, séries com o substituto, recusas, junto com o ajuste da 3B.2, RLS)

#### Medição (2026-11-24)

Remada sentada na máquina (`lever-seated-row`) com o aparelho ocupado; equipamentos: halteres, banco, polia, máquina, peso corporal e corda → 58 candidatos, 53 depois de tirar os de máquina, 40 enviados. Haiku 5.5, esforço `low`.

| Chamada | Tempo | Entrada | Saída | Custo |
|---|---|---|---|---|
| 1ª | 3,4 s | 2.128 | 211 | ~US$ 0,0003 |
| 2ª | 1,7 s | 2.128 | 230 | ~US$ 0,0003 |

- As duas respostas passaram na validação, com as mesmas 3 escolhas (ordem diferente): remada sentada no cabo, remada baixa no cabo e remada unilateral com halter, com motivos em pt-BR
- Rápido o bastante para a academia: esforço `low` mantido

## Regras gerais

- Tudo que chama a IA roda no servidor, pelo wrapper da 3.2 (retry, 120 s, erros pt-BR, logs sem conteúdo)
- Nenhuma resposta da IA é aplicada sem o usuário ver e aceitar
- Textos visíveis em `src/messages/pt-BR.json`; constantes em `src/lib/constants/readiness.ts`
- Estados de carregamento, vazio e erro em todas as telas novas; acessibilidade (teclado, foco, `aria-label`, toque ≥ 44 px)
- O `user_id` vem só da sessão

## Decisões (confirmadas em 2026-11-24)

| # | Decisão | Proposta |
|---|---|---|
| D1 | Lista de regiões do corpo | As 10 regiões do glossário |
| D2 | Quando o check-in pede ajuste da IA | Sono ruim, energia baixa, alguma dor, ou tempo menor que o da anamnese |
| D3 | Tempo disponível | Opções rápidas, com o padrão vindo da anamnese |
| D4 | A IA pode aumentar o volume em dia bom? | Não: só reduz, remove ou troca |
| D5 | Regra de autorregulação | **Confirmada (2026-11-24):** versão simplificada ("no limite" impede a subida; 2+ séries no limite abaixo do mínimo → −5%) |
| D6 | Troca na hora | Pré-filtro no servidor + IA escolhe 3, com fallback sem IA |
| D7 | Ordem das etapas | 3B.1 → 3B.2 → 3B.3 → 3B.4 (a 3B.3 e a 3B.4 não dependem do check-in e podem vir antes, se preferir) |

## Pendências

| ID | Descrição | Onde | Prioridade |
|---|---|---|---|

## Checklist de aceite

- [x] 3B.1: migration (`readiness_checkins`, `readiness_checkin_pains`, `workout_sessions.readiness_checkin_id`) aplicada no Supabase (2026-11-24); schema, regra `needsAdjustment`, serviço, repositório e API com testes; tela com pular, erro e carregamento, com testes (a conferência visual no navegador fica para o teste de ponta a ponta, 3B.5)
- [x] 3B.2: validação do ajuste (nunca aumenta, candidatos só da lista, sobra ≥ 1 exercício) com testes; revisão antes/depois com aceitar, manter e desfazer; fallback da IA; chamada real medida (2026-11-24); migration aplicada e testada no Supabase (a conferência visual no navegador fica para a 3B.5)
- [x] 3B.3: `set_logs.effort` e `finish_workout_session` atualizada (migration aplicada no Supabase em 2026-11-24); regra de autorregulação com testes (sobe, desce, mantém, sem esforço, interruptor desligado); motivo no card
- [x] 3B.4: pré-filtro e fallback com testes; troca e desfazer na tela; gravação da troca com histórico coerente (migration aplicada e testada no Supabase; chamada real medida em 2026-11-24)
- [ ] Teste de ponta a ponta no navegador contra o Supabase real (dados temporários apagados no fim)

## Fim da spec
