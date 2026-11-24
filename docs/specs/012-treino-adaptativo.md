# 012 — Treino adaptativo do dia e substituição na hora (Fase 3B, V2)

**Etapas:** 3B.1 a 3B.4 (checklist `docs/reference/001-checklist-implementacao.md`). Esta spec foi promovida de `docs/planning/001-planejamento-inicial.md` (Fase 3B).

**Status:** rascunho. As decisões marcadas com **(a confirmar)** dependem do usuário e precisam ser confirmadas antes de implementar a etapa correspondente (ver "Decisões a confirmar").

**Pré-requisito:** V1 concluída. Falta fechar a AUTH-002 (spec 007) antes de começar a 3B.1 (`AGENTS.md`, seção 12).

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

**Regiões do corpo (`body_region`) (a confirmar):** `neck` (pescoço), `shoulders` (ombros), `upper_back` (costas, parte de cima), `lower_back` (lombar), `chest` (peito), `elbows` (cotovelos), `wrists` (punhos), `hips` (quadril), `knees` (joelhos), `ankles` (tornozelos). São articulações e regiões, não músculos do catálogo, porque dor costuma ser na articulação. Quem relaciona região e exercício é a IA (3B.2).

## Modelo de dados (proposta)

Normalizado (3FN), RLS por dono em todas as tabelas, migrations versionadas, gravação por funções `security invoker` (o mesmo padrão das specs 010 e 011).

| Tabela | Colunas | Observação |
|---|---|---|
| `readiness_checkins` | `id`, `user_id`, `workout_id` (FK, `on delete set null`), `sleep_quality`, `energy_level`, `available_minutes`, `created_at` | Um por início de treino; índice `(user_id, created_at desc)` |
| `readiness_checkin_pains` | `checkin_id` (FK, `on delete cascade`), `body_region`, `intensity` | PK `(checkin_id, body_region)`; sem dor = nenhuma linha |
| `session_adjustments` | `id`, `checkin_id` (FK, `cascade`), `workout_exercise_id` (FK, `set null`), `change_type`, `replacement_exercise_id` (FK `exercises`, só em `replaced`), `sets`, `reps_min`, `reps_max`, `reason` (pt-BR, até 300 caracteres) | O que a IA mudou e por quê. Gravado **só se o usuário aceitar** |
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
  - Tempo disponível: opções rápidas (ex.: 20, 30, 45, 60, 90 min). O padrão é o `session_minutes` da anamnese mais recente **(a confirmar)**
  - Dor ou cansaço: "Nenhuma" (padrão) ou uma ou mais regiões, cada uma com intensidade leve / moderada / forte
- **API:** `POST /api/readiness-checkins` `{ workoutId, sleepQuality, energyLevel, availableMinutes, pains: [{ bodyRegion, intensity }] }` → `201 { success, data: { checkinId, needsAdjustment } }`. O servidor revalida tudo com o mesmo schema zod; o treino precisa ser do plano ativo do usuário (senão 404); regiões repetidas → 400; `userId` só da sessão
- **Precisa de ajuste?** (`needsAdjustment`, regra pura e testada) **(a confirmar):** sim se o sono for ruim, ou a energia baixa, ou houver alguma dor, ou o tempo disponível for menor que o `session_minutes` da anamnese. Se não, o treino segue como está e **não há chamada à IA** (economiza custo e tempo)
- **Severidade forte:** além do ajuste, aparece o reforço do aviso de saúde (3.7): com dor forte, considere não treinar essa região e procure orientação
- **Rascunho:** o check-in fica ligado ao rascunho do dia (spec 010, 2.4); ao finalizar, a sessão grava o `readiness_checkin_id`
- **Falha ao salvar:** mensagem em pt-BR, os campos continuam preenchidos e o botão "Treinar sem check-in" continua disponível

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

## 3B.3 — Percepção de esforço e autorregulação

- **Por série:** depois do check da série, três botões opcionais "fácil / ok / no limite" (`role="radiogroup"`, toque ≥ 44 px). Não marcar é permitido (`effort` nulo). Fica no rascunho e vai em `POST /api/workout-sessions` (campo `effort` opcional por série; `finish_workout_session` grava em `set_logs.effort`)
- **Autorregulação (a confirmar)**, só para exercícios com "Salvar carga para progredir" ligado, sempre a partir da última sessão com carga (mesma base das 2.7 e 3.5):
  1. **Sobe** (+5%, arredondado para 0,5 kg, mínimo +1 kg, igual à 3.5) quando a regra da 3.5 vale **e** nenhuma série foi "no limite"; **ou** quando todas as séries foram "fácil" com a mesma carga e pelo menos `reps_min` repetições
  2. **Desce** (−5%, arredondado para 0,5 kg, mínimo −1 kg, nunca abaixo de 0) quando 2 ou mais séries foram "no limite" com menos que `reps_min` repetições
  3. **Mantém** a última carga nos outros casos
  4. Sem esforço marcado, vale só a regra da 3.5 (nada muda para quem não usa)
- **Card:** o motivo sempre aparece, por exemplo "Você marcou 'fácil' em todas as séries com 20 kg. Sugestão: 21 kg." ou "2 séries no limite abaixo de 8 repetições com 30 kg. Sugestão: 28,5 kg."
- **Nunca automática no plano:** é só o valor inicial do campo, editável, e só preenche um rascunho ainda não editado (regra da 2.7)
- Constantes nomeadas: `PROGRESSION_DECREASE_RATIO`, `MIN_MAX_EFFORT_SETS_FOR_DECREASE`

## 3B.4 — Substituição na hora

- **Botão "Trocar"** no card do exercício na tela de treino (antes ou durante o registro)
- **Motivo:** aparelho ocupado / aparelho quebrado / outro (opcional, um toque)
- **Sugestões (a confirmar):** até 3 exercícios
  1. O servidor pré-filtra os candidatos: com mídia, equipamentos todos na anamnese, pelo menos um músculo principal em comum, fora do treino de hoje e sem o equipamento do exercício original quando o motivo for "aparelho quebrado" ou "ocupado" (se o original usa máquina ou polia, por exemplo)
  2. A IA escolhe os 3 mais equivalentes no padrão de movimento, com motivo curto em pt-BR (o catálogo não tem `movement_pattern` preenchido, por isso a IA cobre essa parte)
  3. **Se a IA falhar**, aparecem os 3 primeiros do pré-filtro ordenados por músculos principais e secundários em comum, com o aviso "sugestões automáticas" (nunca apresentadas como equivalentes certos)
- **API:** `POST /api/workout-exercises/:id/substitutions` `{ reason }` → candidatos (com nome, miniatura e motivo). Só exercício do plano ativo do usuário (senão 404)
- **Escolher:** o card passa a mostrar o novo exercício com a mesma prescrição, mídia, link do catálogo e o aviso "No lugar de {original} hoje". "Desfazer troca" volta ao original enquanto não houver série com check no substituto
- **Gravação:** ao finalizar, `finish_workout_session` recebe a troca por `workoutExerciseId` e grava `exercise_substitutions`. As séries do substituto ficam com `set_logs.exercise_id` = substituto e `workout_exercise_id` = prescrição original. O servidor revalida que o substituto tem mídia e não está repetido no treino. O cliente nunca define o `exercise_id` direto; ele vem da troca validada
- **Histórico coerente:** a evolução (2.8) e a carga sugerida (2.7/3.5) seguem por `exercise_id`, então as séries do substituto contam para o substituto e o exercício original continua com o histórico dele
- **Trocar no plano:** fora desta etapa (use "Editar treino", 3.4)

## Regras gerais

- Tudo que chama a IA roda no servidor, pelo wrapper da 3.2 (retry, 120 s, erros pt-BR, logs sem conteúdo)
- Nenhuma resposta da IA é aplicada sem o usuário ver e aceitar
- Textos visíveis em `src/messages/pt-BR.json`; constantes em `src/lib/constants/readiness.ts`
- Estados de carregamento, vazio e erro em todas as telas novas; acessibilidade (teclado, foco, `aria-label`, toque ≥ 44 px)
- O `user_id` vem só da sessão

## Decisões a confirmar

| # | Decisão | Proposta |
|---|---|---|
| D1 | Lista de regiões do corpo | As 10 regiões do glossário |
| D2 | Quando o check-in pede ajuste da IA | Sono ruim, energia baixa, alguma dor, ou tempo menor que o da anamnese |
| D3 | Tempo disponível | Opções rápidas, com o padrão vindo da anamnese |
| D4 | A IA pode aumentar o volume em dia bom? | Não: só reduz, remove ou troca |
| D5 | Regra de autorregulação (subir, descer, manter) | A da 3B.3 |
| D6 | Troca na hora | Pré-filtro no servidor + IA escolhe 3, com fallback sem IA |
| D7 | Ordem das etapas | 3B.1 → 3B.2 → 3B.3 → 3B.4 (a 3B.3 e a 3B.4 não dependem do check-in e podem vir antes, se preferir) |

## Pendências

| ID | Descrição | Onde | Prioridade |
|---|---|---|---|
| ADP-001 | Confirmar as decisões D1 a D7 | Esta spec | Alta (bloqueia a 3B.1) |

## Checklist de aceite

- [ ] 3B.1: migration (`readiness_checkins`, `readiness_checkin_pains`, `workout_sessions.readiness_checkin_id`) aplicada; schema, regra `needsAdjustment`, serviço e API com testes; tela com pular, erro e carregamento
- [ ] 3B.2: validação do ajuste (nunca aumenta, candidatos só da lista, sobra ≥ 1 exercício) com testes; revisão antes/depois com aceitar, manter e desfazer; fallback da IA; chamada real medida
- [ ] 3B.3: `set_logs.effort` e `finish_workout_session` atualizada; regra de autorregulação com testes (sobe, desce, mantém, sem esforço); motivo no card
- [ ] 3B.4: pré-filtro e fallback com testes; troca e desfazer na tela; gravação da troca com histórico coerente
- [ ] Teste de ponta a ponta no navegador contra o Supabase real (dados temporários apagados no fim)

## Fim da spec
