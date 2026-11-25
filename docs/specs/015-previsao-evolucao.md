# 015 — Previsão de evolução (Fase 5B, V3)

**Etapas:** 5B.0 a 5B.4 (checklist `docs/reference/001-checklist-implementacao.md`). Promovida de `docs/planning/001-planejamento-inicial.md` (Fase 5B).

**Status:** rascunho; aguardando aprovação das decisões D1 a D9.

**Pré-requisito:** Fase 5 concluída (2026-11-25).

## Objetivo

Hoje a tela "Evolução" de cada exercício mostra o passado: a maior carga por sessão. A Fase 5B acrescenta:
1. **Projeção:** no ritmo atual, onde a carga deve chegar ("cerca de 30 kg em ~6 semanas") e quando a meta do usuário deve ser alcançada
2. **Estagnação:** avisar quando a carga parou de subir há semanas
3. **Ajuste de estratégia sugerido:** com base no esforço por série da Fase 3B (fácil / ok / no limite), sugerir o que mudar; o usuário decide e pode desfazer
4. **Real × projetado** no mesmo gráfico

## Escopo

**Entra:**
- 5B.1: cálculo da tendência, projeção e estagnação por exercício (lógica pura, só servidor)
- 5B.2: tela de evolução com a linha projetada, a meta opcional e o aviso de estagnação; resumo no Início
- 5B.3: sugestão de ajuste na estagnação, aplicada só com confirmação do usuário e com desfazer
- 5B.4: teste de ponta a ponta no navegador

**Não entra:**
- IA na previsão (é estatística simples sobre o histórico; custo zero) — ver D8
- Mudar o plano sozinho (AGENTS.md: decisões importantes nunca são automáticas)
- Previsão para exercícios sem carga (peso corporal) ou com menos histórico que o mínimo (D2)
- Metas de outros tipos (repetições, peso corporal, medidas)

## Glossário

| PRD (pt-BR) | Código |
|---|---|
| Previsão / projeção de evolução | `progress_projection` |
| Tendência (kg por semana) | `weekly_trend_kg` |
| Meta de carga | `load_goal` |
| Estagnação | `stagnation` |
| Ajuste de estratégia | `strategy_adjustment` |
| Semana mais leve | `deload` |

## Fluxo

1. Na tela "Evolução" do exercício, o gráfico de sempre (maior carga por sessão) ganha uma **linha tracejada da projeção** para as próximas semanas e o texto: "No ritmo atual (+0,8 kg por semana), cerca de 30 kg em ~6 semanas. É uma estimativa."
2. **Meta opcional:** "Definir meta" → carga alvo. Com meta, a tela diz "Meta de 35 kg: ~9 semanas no ritmo atual" (ou "No ritmo atual a meta não é alcançada em 12 semanas" — D2). A meta aparece como linha horizontal no gráfico.
3. **Sem dados suficientes** (D2): "Ainda não dá para prever: faltam X sessões." Nunca mostra número incerto como certo.
4. **Estagnação** (D4): aviso no exercício e no Início ("2 exercícios sem evoluir há 3 semanas"), com a sugestão de ajuste (D5).
5. **Ajuste:** "Aplicar" muda só a carga sugerida das próximas sessões daquele exercício (D6), com "Desfazer". O plano e o histórico não mudam.

## Regras

- **Cálculo só no servidor**, a partir de `set_logs` das sessões finalizadas do próprio usuário (RLS)
- **Métrica:** D1. **Tendência:** reta de mínimos quadrados dos pontos da janela (D2); projeção só quando a tendência é positiva e a janela tem dados suficientes; horizonte máximo de 12 semanas; números arredondados (0,5 kg, semanas inteiras) e sempre com "cerca de" / "estimativa"
- **Estagnação:** D4. Só para exercícios com "Salvar carga para progredir" ligado (os outros não têm a intenção de progredir)
- **Sugestão** (D5) usa o esforço das séries do período parado; sem esforço registrado, a sugestão é genérica
- **Nada muda sozinho:** a sugestão só vale depois de "Aplicar"; "Desfazer" volta ao normal; o aviso pode ser dispensado por 3 semanas
- Datas no fuso do app (`America/Sao_Paulo`), como o resto do histórico

## Modelo de dados

- `exercise_load_goals`: `user_id`, `exercise_id`, `target_load_kg`, `created_at`, `updated_at`; único por usuário + exercício; RLS
- `strategy_adjustments`: `user_id`, `workout_exercise_id`, `kind` (`deload` / `increase`), `load_kg`, `sessions_left`, `created_at`, `undone_at`; RLS. Vale para as próximas `sessions_left` sessões daquele exercício (D6) e entra no cálculo da carga sugerida que já existe (2.7 / 3.5 / 3B.3)
- `stagnation_dismissals`: `user_id`, `exercise_id`, `dismissed_until`; RLS

## API

- `GET /api/exercises/:slug/progress` passa a devolver também `projection` (tendência, pontos projetados, semanas até a meta, motivo quando não dá para prever) e `stagnation` (semanas paradas, sugestão)
- `PUT /api/exercises/:slug/load-goal` (`{ targetLoadKg }`) e `DELETE` para remover a meta
- `POST /api/strategy-adjustments` (aplicar) e `DELETE /api/strategy-adjustments/:id` (desfazer)
- `POST /api/exercises/:slug/stagnation-dismissal` (dispensar o aviso)
- Respostas no formato `{ success, data?, error? }`; 400/401/404/422 como no resto do app

## Decisões para o usuário

| # | Decisão | Proposta |
|---|---|---|
| D1 | O que medir para prever | **Maior carga da sessão** (a mesma linha que a tela "Evolução" já mostra), contando só sessões em que essa carga foi feita com pelo menos o mínimo de repetições prescrito. Alternativa: 1RM estimado (fórmula de Epley, junta carga e repetições), mais preciso quando as repetições variam, mas é um número que o usuário não levanta de fato |
| D2 | Quando dá para prever | Janela das **últimas 8 semanas**; mínimo de **4 sessões em pelo menos 3 semanas diferentes**; só projeta se a tendência for positiva; horizonte máximo de **12 semanas** |
| D3 | Meta | **Opcional, por exercício**, só de carga (kg). Sem meta, a tela mostra a projeção para 4 semanas |
| D4 | Estagnação | **3 semanas** (como no planejamento) sem superar a maior carga anterior, com **pelo menos 3 sessões** do exercício nesse período |
| D5 | Sugestão na estagnação (usa o esforço da 3B) | Metade ou mais das séries do período "no limite" → **semana mais leve**: −10% por 2 sessões, depois volta. Maioria "fácil" → **subir a carga**: +5% (mesma regra da 3.5). Sem esforço registrado ou misto → texto com as duas opções e "trocar a variação" (leva à edição do plano) |
| D6 | O que "Aplicar" muda | **Só a carga sugerida** das próximas sessões daquele exercício (2 sessões no deload, 1 no aumento), com Desfazer; o plano (séries, repetições, exercícios) não muda |
| D7 | Onde aparece | Tela "Evolução" de cada exercício (projeção, meta, estagnação) e um **resumo no Início** só quando houver estagnação (até 3 exercícios, com link) |
| D8 | IA na previsão | **Não usar IA** (custo zero, resultado reproduzível); a explicação é por texto fixo em português |
| D9 | Dispensar o aviso de estagnação | "Agora não" esconde o aviso daquele exercício por **3 semanas** |

## Checklist de aceite

- [ ] 5B.0: spec aprovada (D1–D9)
- [ ] 5B.1: tendência, projeção e estagnação com testes (séries crescentes, paradas, com buracos, poucas sessões, tendência negativa, meta inalcançável, fuso)
- [ ] 5B.2: gráfico real × projetado com meta, textos honestos ("estimativa"), estados sem dados/carregando/erro, tabela acessível, resumo no Início; migration da meta testada num bloco desfeito e aplicada
- [ ] 5B.3: sugestão pela regra do esforço, aplicar com confirmação, desfazer, carga sugerida da próxima sessão usando o ajuste, dispensar por 3 semanas; migrations testadas e aplicadas
- [ ] 5B.4: teste de ponta a ponta no navegador contra o Supabase real (dados temporários apagados no fim)

## Pendências

| ID | Descrição | Onde | Prioridade |
|---|---|---|---|
| — | Nenhuma | — | — |

## Fim da spec
