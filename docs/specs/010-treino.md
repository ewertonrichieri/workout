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

## Pendências

| ID | Descrição | Onde | Prioridade |
|---|---|---|---|
| TRN-001 | Importar o plano atual do usuário (decidido: treino único "Full body", 12 exercícios já escolhidos no catálogo — ver abaixo). Falta o usuário informar séries, repetições e descanso | `plans`, `workouts`, `workout_exercises` | Alta (antes de testar a 2.2 com dados reais) |

**Plano atual do usuário (TRN-001), exercícios escolhidos no catálogo:** Supino reto com halteres (`dumbbell-bench-press`); Abdominal em V (`v-up`, no lugar do "abdominal remador"); Remada sentada na máquina (`lever-seated-row`); Prancha frontal (`front-plank`); Crucifixo reto com halteres (`dumbbell-fly`); Avanço com halteres (`dumbbell-lunge`); Elevação frontal com halteres (`dumbbell-front-raise`); Agachamento com halteres (`dumbbell-squat`); Elevação lateral com halteres (`dumbbell-lateral-raise`); Rosca direta com halteres (`dumbbell-biceps-curl`); Tríceps corda na polia (`cable-rope-triceps-pushdown`); Panturrilha em pé com halteres (`dumbbell-standing-calf-raise`).

## Checklist de aceite

- [x] 2.1 — Spec + leitura do plano ativo e validade, com testes
- [ ] 2.2 — Tela de treino
- [ ] 2.3 — Player com fallback
- [ ] 2.4 — Registro de séries
- [ ] 2.6 — Finalizar treino
- [ ] 2.7 — Salvar carga para progredir
- [ ] 2.8 — Histórico e gráfico

## Fim da spec
