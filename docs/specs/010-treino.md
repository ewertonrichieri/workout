# 010 — Treino

**Etapas:** 2.1 a 2.8 (checklist `docs/reference/001-checklist-implementacao.md`)

## Objetivo

Núcleo do app: o usuário abre o plano ativo, escolhe o treino do dia (A, B, C…), vê os exercícios agrupados por categoria com mídia, registra séries, repetições e carga, descansa com timer e finaliza o treino, acompanhando a evolução por exercício.

Referência de UX (PRD): tela "Treino Diário" — abas A/B/C, validade com barra de progresso, cards agrupados por categoria com miniatura, série, repetição, carga editável, check de concluído, botão "Finalizar treino".

## Escopo

**Entra (Fase 2):**
- 2.1 — Esta spec + leitura do plano ativo (plano → treinos → exercícios do treino → exercício do catálogo e mídias) e cálculo da validade
- 2.2 — Tela de treino (abas, validade, barra de progresso, cards por categoria)
- 2.3 — Player de mídia com fallback (vídeo → GIF → YouTube)
- 2.4 — Registro de séries/repetições/carga + check de concluído
- 2.6 — "Finalizar treino": sessão e séries gravadas em transação
- 2.7 — "Salvar carga para progredir": última carga vira a sugerida na próxima sessão
- 2.8 — Histórico e gráfico de progressão por exercício

**Não entra:**
- Criar ou editar plano (geração por IA na 3.3; edição manual na 3.4) — ver TRN-001
- Timer de descanso (removido a pedido do usuário; o descanso prescrito aparece só como informação)
- Treino adaptativo, substituição na hora (V2)

## Modelo (já existente, spec 006)

| Tabela | Uso |
|---|---|
| `plans` | Um plano `active` por usuário (índice único parcial); `starts_on`, `valid_until`, `goal`, `origin` |
| `workouts` | Treinos do plano (`label` A/B/C, `position`) |
| `workout_exercises` | Prescrição: `category`, `position`, `sets`, `reps_min`/`reps_max`, `rest_seconds`, `notes`, `track_progression` |
| `workout_sessions` / `set_logs` | Execução (2.4 a 2.8) |

Todas com RLS por dono (`auth.uid()`); o repositório também filtra pelo `user_id` da sessão.

## Regras

- **Plano ativo:** no máximo um por usuário; sem plano ativo a tela mostra estado vazio (nunca dados inventados)
- **Divisão:** o plano pode ter um único treino (ex.: "Full body") ou vários ("A", "B", "C"); a tela mostra abas só quando há mais de um treino (regra do PRD, "Divisão do treino")
- **Ordem:** treinos e exercícios pela `position`
- **Validade:** padrão de 6 semanas (PRD; `DEFAULT_PLAN_VALIDITY_WEEKS`). Progresso = dias decorridos ÷ dias totais, limitado a 0–100%; vencido só depois do último dia (`valid_until` ainda é válido). Datas são de calendário (`YYYY-MM-DD`) no fuso `America/Sao_Paulo` (`APP_TIME_ZONE`)
- **Ao vencer:** o app sugere renovação (3.6), nunca renova sozinho
- **Repetições:** `reps_min = reps_max` → "10"; diferentes → "8 a 12"
- **Categoria:** texto livre opcional; agrupamento na ordem da primeira aparição; sem categoria → grupo sem título
- **Mídia do exercício:** só mídias ativas, melhor prioridade primeiro (mesma regra do catálogo)

## Implementação (2.1)

- `src/lib/training/` — `plan-types.ts`, `plan-validity.ts` (validade e data no fuso), `plan-row-mapping.ts` (colunas + validação zod das linhas), `plan-repository.ts` (`findActivePlan(userId)`), `plan-service.ts` (`getActivePlanOverview(userId)` → plano + validade, ou `null`), `server-plan-service.ts` (composition root)
- `src/lib/constants/training.ts` — objetivos, origens, status, validade padrão, fuso
- Mapeamento de mídia compartilhado com o catálogo (`mapEnabledMedia` em `exercise-row-mapping.ts`)
- O `userId` vem só da sessão (`getAuthenticatedUserId`) na camada que chama o serviço

## Tela de treino (2.2)

- **Rota:** `/workout` (Server Component); o `userId` vem de `getAuthenticatedUserId`; dados via `getActivePlanOverview`
- **Sem plano ativo:** estado vazio + link para o catálogo
- **Treino selecionado:** parâmetro `?workout=<label>` na URL; label ausente ou desconhecido → primeiro treino pela `position`. Abas são links (`aria-current="page"` na ativa), só com mais de um treino; com um treino só, o rótulo aparece como título
- **Validade:** "Válido até DD/MM/AAAA · N dias restantes" (1 dia → singular); vencido → "Plano vencido em DD/MM/AAAA"; barra `role="progressbar"` com o percentual decorrido (arredondado)
- **Cards:** miniatura (`ExerciseCover`), nome com link para `/exercises/<slug>`, "N séries · R repetições", descanso ("60 s", "1 min", "1 min 30 s") só quando houver, observações quando houver
- **Treino sem exercícios:** estado vazio dentro da aba
- **Estados:** skeleton no carregamento (Suspense) e `error.tsx` com "Tentar novamente"
- **Fora da 2.2:** player (2.3), carga/check (2.4), finalizar (2.6)
- **Arquivos:** `src/lib/training/workout-display.ts` (`selectWorkout`, `groupExercisesByCategory`); `src/components/workout/` (`workout-labels.ts`, `workout-plan-view.tsx`, `workout-tabs.tsx`, `plan-validity-summary.tsx`, `workout-exercise-groups.tsx`, `workout-exercise-card.tsx`, `workout-skeleton.tsx`); `src/app/(app)/workout/` (`page.tsx`, `error.tsx`); textos em `training.*` no `pt-BR.json`; `WORKOUT_QUERY_PARAM` em `constants/training.ts`

## Player de mídia (2.3)

- **Ordem:** mídias ativas pela prioridade (menor primeiro): vídeo CC0 (10) → vídeo Free Exercise DB (20) → GIFs (30+) → YouTube (40)
- **Fallback:** erro de carregamento da mídia atual → passa para a próxima automaticamente; URL do YouTube que não dá para converter em embed é pulada
- **YouTube:** embed oficial em `https://www.youtube-nocookie.com/embed/<id>` (aceita `watch?v=`, `youtu.be/`, `embed/`, `shorts/`), com `title` acessível
- **Sem mídia ou todas falharam:** "Mídia indisponível para este exercício." (nunca área quebrada)
- **Crédito:** fonte e licença da mídia exibida no momento
- **Onde:** detalhe do exercício (`/exercises/[slug]`) e card do treino ("Ver demonstração", expansível; a mídia só é montada ao abrir)
- **Arquivos:** `src/lib/catalog/media/media-fallback.ts` (lógica pura); `src/components/exercises/exercise-media-player.tsx` (cliente); `src/components/workout/exercise-demo-disclosure.tsx`
- **Fora da 2.3:** vídeos no R2 próprio (CAT-001), cadastro de vídeos do YouTube

## Registro de séries (2.4)

- **Por série:** cada card tem uma linha por série prescrita (`sets`), com repetições feitas, carga (kg) e check de concluída — espelha `set_logs` (`set_number`, `reps_done`, `load_kg`)
- **Repetições:** inteiro de 0 a 999 (`MAX_REPS_DONE`); campo vazio com a prescrição como dica
- **Carga:** opcional (peso corporal), decimal com vírgula ou ponto, até 2 casas, de 0 a 9.999,99 kg (`MAX_LOAD_KG`, limite de `numeric(6,2)`)
- **Check:** só com repetições preenchidas e campos válidos; editar a série para um valor vazio/inválido desmarca o check
- **Erro de campo:** mensagem em pt-BR ligada ao campo (`aria-invalid` + `aria-describedby`)
- **Exercício concluído:** todas as séries marcadas → "Concluído"; resumo no topo "N de M exercícios concluídos"
- **Rascunho:** só no aparelho (`localStorage`, chave por treino e dia em `APP_TIME_ZONE`), restaurado ao recarregar; rascunho de outro dia, de outro treino ou fora do schema é descartado; quantidade de séries alinhada à prescrição atual; storage indisponível → o registro funciona sem persistir. Nada vai ao banco antes do "Finalizar treino" (2.6), que reaproveita o schema e o parse
- **Arquivos:** `src/lib/training/set-log-draft.ts` (schema, parse, regras), `src/lib/training/draft-storage.ts` (leitura/gravação segura), `src/components/workout/use-workout-draft.ts`, `workout-tracker.tsx`, `set-log-row.tsx`
- **Fora da 2.4:** gravar no banco/finalizar (2.6), carga sugerida (2.7)

## Finalizar treino (2.6)

- **Botão** "Finalizar treino" no fim da tela; envia só as séries com check
- **API:** `POST /api/workout-sessions` com `{ workoutId, startedAt, sets: [{ workoutExerciseId, setNumber, repsDone, loadKg }] }` → `201 { success, data: { sessionId } }`
- **Servidor revalida:** schema zod (mesmos limites da 2.4); treino precisa ser do plano ativo do usuário (senão 404); cada série precisa ser de um exercício desse treino e `setNumber` ≤ séries prescritas, sem repetição (senão 422); pelo menos 1 série (senão 422); `exercise_id` vem do banco, nunca do cliente; `userId` só da sessão
- **Transação:** função `public.finish_workout_session(p_workout_id, p_started_at, p_sets jsonb)` (`security invoker`, RLS vale) grava `workout_sessions` (início = primeira edição do rascunho, limitado a agora; fim = agora) e `set_logs` juntos; se alguma série não bater com o treino, levanta erro e nada é gravado
- **Confirmação:** sem nenhuma série com check → aviso e nada é enviado; com séries sem check → pede confirmação ("Finalizar mesmo assim")
- **Depois:** sucesso → rascunho apagado do aparelho e "Treino finalizado e salvo."; falha → mensagem em pt-BR, rascunho mantido
- **Arquivos:** migrations `20261125000000_table_privileges.sql` (grants, ver bug na spec 006) e `20261125000100_finish_workout_session.sql`, aplicadas no Supabase em 2026-11-25 (testadas antes com rollback); `src/lib/training/session-schema.ts`, `session-repository.ts`, `session-service.ts`, `server-session-service.ts`; `src/app/api/workout-sessions/route.ts`; `src/components/workout/finish-workout-button.tsx`

## Salvar carga para progredir (2.7)

- **Interruptor por exercício** no card ("Salvar carga para progredir", `role="switch"`): `PATCH /api/workout-exercises/:id` com `{ trackProgression }`; o servidor confere que o exercício é do plano ativo do usuário (senão 404) e grava só `track_progression` (único privilégio de update). Falha → volta ao estado anterior com mensagem em pt-BR
- **Carga sugerida:** para exercícios com o interruptor ligado, a carga de cada série vem da **última sessão finalizada** com carga daquele exercício (mesmo `set_number`; série sem registro → carga da última série registrada naquela sessão). Função `public.latest_set_loads(p_exercise_ids uuid[])` (`security invoker`)
- **Preenchimento:** a sugestão preenche o campo de carga de um rascunho **ainda não editado** (vale também quando a sugestão muda, ex.: depois de finalizar ou ligar o interruptor); o rascunho já editado nunca é sobrescrito. O campo continua editável; aviso "Carga sugerida da última sessão" no card
- **Sem histórico:** nada é preenchido (nunca inventar carga)
- **Arquivos:** migration `20261125010000_latest_set_loads.sql` (aplicada no Supabase em 2026-11-25, testada antes com rollback, incluindo isolamento entre usuários); `src/lib/http/send-json-request.ts` (chamadas do cliente à API); `src/lib/training/progression-repository.ts`, `suggested-loads.ts`, `workout-exercise-repository.ts`, `workout-exercise-service.ts`; `src/app/api/workout-exercises/[id]/route.ts`; `src/components/workout/track-progression-switch.tsx`

## Histórico e gráfico (2.8)

- **Agenda** (`/schedule`): treinos finalizados, mais recentes primeiro, paginados (`HISTORY_PAGE_SIZE`): data (DD/MM/AAAA no `APP_TIME_ZONE`), rótulo do treino ("Treino A"; treino apagado → "Treino removido"), séries registradas; sem sessões → estado vazio
- **Evolução por exercício** (`/progress/[slug]`): uma linha por sessão finalizada com o exercício — data, maior carga (kg), repetições feitas nessa carga e número de séries; mais recentes primeiro na tabela, em ordem cronológica no gráfico (últimas `MAX_PROGRESS_SESSIONS` sessões)
- **Gráfico:** linha única da maior carga por sessão (sessões sem carga ficam de fora do gráfico, aparecem na tabela); eixo Y com valores redondos a partir de 0, datas da primeira e última sessão no eixo X, valor final rotulado; linha 2px, pontos ≥ 8px com anel na cor do fundo; cor `--chart-series` (#9a971f, validada com o script de paleta no fundo escuro); tooltip ao passar o dedo/mouse (data + carga) com guia vertical; tabela sempre visível como alternativa acessível; sem legenda (série única, o título diz o que é)
- **Sem registros:** estado vazio ("Nenhuma carga registrada ainda") — nada inventado
- **Acesso:** link "Ver evolução" no card do treino e no detalhe do exercício; exercício inexistente → 404
- **Dados:** leitura pela sessão do usuário (RLS) com filtro explícito por `user_id`; agregação por sessão em função pura testada
- **Arquivos:** `src/lib/training/history-repository.ts`, `history-service.ts`, `load-history.ts`, `server-history-service.ts`; `src/components/history/` (lista, gráfico, tabela, escala); `src/components/layout/pagination-nav.tsx` (paginação genérica, reaproveitada pelo catálogo); `src/app/(app)/schedule/page.tsx`, `src/app/(app)/progress/[slug]/page.tsx`; `src/components/layout/route-error.tsx` e `list-skeleton.tsx` (estados de erro/carregamento compartilhados com catálogo e treino)

## Pendências

| ID | Descrição | Onde | Prioridade |
|---|---|---|---|
| TRN-001 | Importar o plano atual do usuário (decidido: treino único "Full body", 12 exercícios já escolhidos no catálogo — ver abaixo). Falta o usuário informar séries, repetições e descanso | `plans`, `workouts`, `workout_exercises` | Alta (antes de testar a 2.2 com dados reais) |

**Plano atual do usuário (TRN-001), exercícios escolhidos no catálogo:** Supino reto com halteres (`dumbbell-bench-press`); Abdominal em V (`v-up`, no lugar do "abdominal remador"); Remada sentada na máquina (`lever-seated-row`); Prancha frontal (`front-plank`); Crucifixo reto com halteres (`dumbbell-fly`); Avanço com halteres (`dumbbell-lunge`); Elevação frontal com halteres (`dumbbell-front-raise`); Agachamento com halteres (`dumbbell-squat`); Elevação lateral com halteres (`dumbbell-lateral-raise`); Rosca direta com halteres (`dumbbell-biceps-curl`); Tríceps corda na polia (`cable-rope-triceps-pushdown`); Panturrilha em pé com halteres (`dumbbell-standing-calf-raise`).

## Checklist de aceite

- [x] 2.1 — Spec + leitura do plano ativo e validade, com testes
- [x] 2.2 — Tela de treino, com testes (teste manual com dados reais depende do TRN-001)
- [x] 2.3 — Player com fallback, com testes
- [x] 2.4 — Registro de séries, com testes (rascunho no aparelho; gravação no banco na 2.6)
- [x] 2.6 — Finalizar treino, com testes (função validada no Supabase com rollback)
- [x] 2.7 — Salvar carga para progredir, com testes
- [x] 2.8 — Histórico e gráfico, com testes (gráfico conferido visualmente em 375px com dados fictícios)

## Fim da spec
