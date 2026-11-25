# 014 — Correção de postura (Fase 5, V3)

**Etapas:** 5.0 a 5.6 (checklist `docs/reference/001-checklist-implementacao.md`). Promovida de `docs/planning/001-planejamento-inicial.md` (Fase 5).

**Status:** aprovada. Decisões D1 a D12 confirmadas pelo usuário em 2026-11-25 (D5 provisória, calibrada na 5.2).

**Pré-requisito:** Fase 4 concluída (2026-11-25).

## Objetivo

Ajudar o usuário a executar os exercícios com técnica segura, na abordagem híbrida **"o celular mede, a IA explica"**:
1. O navegador acompanha o corpo pela câmera (MediaPipe Pose) e desenha o esqueleto
2. O próprio aparelho conta as repetições, mede cada uma (ângulos, amplitude, ritmo) e dá alertas curtos falados durante a série
3. No fim da série, **só os números** vão ao Claude, que devolve nota, acertos, pontos a corrigir e uma dica principal
4. Replay da gravação com o esqueleto e os erros marcados; histórico mostrando a evolução da técnica

O vídeo nunca sai do celular.

## Escopo

**Entra:**
- 5.1: câmera, MediaPipe Pose no navegador, esqueleto na tela e guia de posicionamento por exercício
- 5.2: contagem e métricas por repetição, começando pelo agachamento (câmera de lado)
- 5.3: alertas falados ao vivo e contagem de repetições em voz alta
- 5.4: análise pós-série pela IA + replay com os erros marcados
- 5.5: histórico de técnica + regras para os demais exercícios (D3)
- 5.6: teste de ponta a ponta no navegador

**Não entra:**
- Guardar ou enviar o vídeo (nem quadros, se D6 for aprovada como proposta)
- Comparação com o esqueleto do vídeo de referência, lado a lado (evolução futura 5.2 do planejamento)
- Coach por voz conversacional (descartado no PRD)
- Gravação de frente, para valgo e simetria (D4)
- Alterar sozinho a carga ou o plano a partir da técnica (D10)
- Análise de exercícios que não estão na lista suportada (o botão não aparece)

## Glossário

| PRD (pt-BR) | Código |
|---|---|
| Análise de técnica / execução | `technique_analysis` |
| Repetição analisada | `technique_rep` |
| Ponto a corrigir (tipo de erro) | `technique_issue` |
| Regras de um exercício (limites, ângulo de câmera) | `technique_rule_set` |
| Ângulo da câmera: de lado / de frente | `camera_view`: `side` / `front` |
| Pontos do corpo (MediaPipe) | `pose_landmarks` |
| Alerta ao vivo | `live_cue` |
| Dica principal | `main_tip` |

## Fluxo

1. No card do exercício da tela de treino, **"Analisar minha execução"**, só para exercícios suportados (D3) e só quando o aparelho tem câmera. Abre a tela `/technique/[slug]` (tela cheia, com voltar).
2. **Antes de gravar:** aviso de privacidade e de limitações ("o vídeo fica só no seu celular", câmera 2D, iluminação, roupa; não substitui profissional). Depois vem o guia de posicionamento do exercício: celular de lado, a 2–3 m, no chão ou num banco, com o corpo inteiro no quadro. Uma silhueta e um texto mostram isso.
3. **Pronto para gravar:** o esqueleto aparece sobre a imagem. "Começar" só fica habilitado com o corpo inteiro visível por pelo menos 1 s, e o aviso diz o que falta ("afaste o celular", "seus pés não aparecem"). Uma contagem de 3 s em voz alta dá tempo de se posicionar.
4. **Durante a série:** o aparelho conta as repetições em voz alta e fala alertas curtos quando um limite é passado (D7). O usuário encerra a gravação por toque ou após D8 segundos parado.
5. **Fim da série:** resumo local imediato com as repetições e as métricas. As métricas vão ao servidor e voltam com a análise da IA: nota, acertos, erros por repetição (ex.: "da 6ª em diante o tronco inclinou ~15° a mais, sinal de fadiga") e a dica principal.
6. **Replay:** o vídeo gravado fica só na memória do navegador. O esqueleto aparece por cima e as repetições com erro ficam marcadas em vermelho, com um botão para pular para cada repetição. Sair da tela descarta o vídeo.
7. **Histórico:** a análise é gravada (D9). No detalhe do exercício, "Técnica" mostra a nota das últimas análises e os erros mais frequentes.

## Regras

**Privacidade (LGPD):**
- O vídeo e os quadros nunca saem do aparelho, e os pontos do corpo quadro a quadro também não (D6). Ao servidor vão só os números por repetição e as métricas da série
- O replay usa o vídeo em memória (`MediaRecorder` → `Blob`), apagado ao sair da tela; nada vai para o disco, o banco ou o log
- A câmera só liga depois de um toque do usuário e desliga ao sair da tela ou ao encerrar a gravação

**Medição honesta (nunca apresentar o incerto como certo):**
- A repetição em que algum ponto usado pela regra fica com visibilidade abaixo do mínimo vira **"não avaliada"**: não tem nota e não vai como erro para a IA
- Se mais da metade das repetições ficar sem avaliação, a IA não é chamada e o app pede para regravar seguindo o guia
- Os ângulos são aproximados (câmera 2D). A tela mostra "cerca de" e arredonda para 5°
- Os limites de cada exercício (D5) ficam em constantes versionadas, nunca no código das telas

**Contagem de repetições:** uma máquina de estados (em pé → descendo → embaixo → subindo → em pé) lê o ângulo principal do exercício (no agachamento, o joelho). Uma folga entre os limites de entrada e saída evita contar duas vezes. A repetição só conta se passar pelo ponto mais baixo e voltar.

**Alertas ao vivo:** são regras simples que rodam no aparelho, sem IA e sem custo. Há no máximo um alerta por repetição, com intervalo mínimo entre falas, para não atropelar a contagem. Um botão liga e desliga o som (lembrado no aparelho).

**IA:**
- Chamada só no servidor, com o mesmo wrapper da 3.2 (`StructuredOutputClient`), com saída estruturada validada por zod
- A IA só pode citar erros do vocabulário de `technique_issue` daquele exercício e números de repetição que foram enviados; o resto é descartado e registrado no log (sem conteúdo)
- A IA não pode dar diagnóstico médico. Quando o usuário tem limitação na anamnese, a resposta reforça o aviso de procurar um profissional (como na 3.7)
- Cada análise conta no limite por usuário (D11), com HTTP 429 em português
- Se a IA falhar ou passar do tempo, o resumo local e o replay continuam disponíveis, com a mensagem "Não conseguimos gerar a análise agora". As métricas ficam na tela para "Tentar de novo" sem regravar

**Recurso indisponível (AGENTS.md):**
- Sem câmera ou sem permissão, o botão fica desabilitado com um `aria-label` explicativo. Se a permissão for negada, aparece o passo a passo para liberar
- Se o modelo do MediaPipe não carregar (rede, aparelho fraco), aparece uma mensagem em português e o treino segue normal
- Sem síntese de voz, os alertas aparecem só na tela. Sem `MediaRecorder`, a análise funciona sem replay

**Desempenho:** o MediaPipe e o modelo carregam sob demanda, só na tela de técnica (lazy loading), e não pesam na tela de treino.

## Modelo de dados

Depende de D9. Proposta (normalizada, RLS por `user_id`):

- `technique_analyses`: `id`, `user_id`, `exercise_id`, `workout_exercise_id` (opcional), `camera_view`, `rep_count`, `evaluated_rep_count`, `overall_score`, `main_tip`, `ai_status` (`completed` / `failed`), `created_at`
- `technique_reps`: `analysis_id` (cascade), `rep_number`, `score` (nulo se não avaliada), `duration_ms`, `primary_angle_min` e as métricas do exercício em colunas próprias (ex.: `trunk_lean_degrees`, `knee_travel_ratio`, `heel_lift`)
- `technique_rep_issues`: `rep_id` (cascade), `issue` (código do vocabulário). Única por repetição + erro
- `technique_analysis_feedback`: `analysis_id` (cascade), `kind` (`strength` / `correction`), `position`, `text` (texto da IA em pt-BR)
- `ai_requests.operation` passa a aceitar `technique.analyze`

Gravação numa transação (função no banco, como `finish_workout_session`).

## API

`POST /api/technique-analyses` (sessão obrigatória, 401 sem ela), JSON validado por zod: `exerciseSlug`, `workoutExerciseId?`, `cameraView` e `reps[]` com as métricas numéricas de cada repetição (com teto de repetições e faixas válidas por métrica).

- 400: corpo fora do schema, exercício não suportado, repetições acima do teto
- 422: menos da metade das repetições avaliadas (não chama a IA)
- 429: limite de análises
- 502: IA indisponível ou resposta fora do schema (as métricas não são gravadas sem a análise, D9)
- 201: `{ success: true, data: { analysis } }`

`GET /api/technique-analyses?exercise=<slug>` (paginado) para o histórico.

O servidor **recalcula** os erros de cada repetição a partir das métricas e dos limites (D5). Não confia no que o cliente classificou.

## Integração com a IA

- Entrada: exercício, ângulo da câmera, limites usados, métricas por repetição e os erros já detectados pela regra. Não vai nome, imagem ou ponto do corpo
- Saída: `{ overallScore, reps: [{ repNumber, score, issues[] }], strengths[], corrections: [{ issue, repNumbers[], text }], mainTip }`
- O prompt pede para explicar padrões (fadiga nas últimas repetições, erro consistente), nunca inventar o que não foi medido, e escrever em pt-BR curto
- Modelo e esforço: D12; chamada real medida na 5.4 (tempo e custo), como na PLN-001

## Decisões para o usuário

| # | Decisão | Proposta |
|---|---|---|
| D1 | Biblioteca e modelo de pose | **MediaPipe Tasks Vision** (`@mediapipe/tasks-vision`, licença Apache 2.0) com o **Pose Landmarker "lite"** (~5–6 MB). Se a precisão do agachamento não bastar na 5.2, sobe para o "full" (~9 MB) |
| D2 | Onde ficam o modelo e o WASM | **No próprio app** (`public/`, servido pela Vercel com cache), sem depender do CDN do Google em tempo de uso. Arquivos com versão fixa no repositório e licença registrada |
| D3 | Exercícios suportados | **5.2–5.4:** só agachamento (`barbell-back-squat`, `dumbbell-goblet-squat`, câmera de lado). **5.5:** levantamento terra romeno (`barbell-romanian-deadlift`, `dumbbell-romanian-deadlift`) e remada curvada (`barbell-bent-over-row`, `dumbbell-bent-over-row`). Aparelhos ficam fora desta fase |
| D4 | Câmera de frente (valgo e simetria) | **Fora da Fase 5** (vai para backlog). Só gravação de lado |
| D5 | Limites do agachamento (valores iniciais, calibrados na 5.2 com gravações reais e revistos com você) | Profundidade: quadril até a altura do joelho (fêmur paralelo). Inclinação do tronco: alerta acima de ~45° da vertical ou se aumentar ~15° em relação à 1ª repetição (fadiga). Joelho à frente: só informativo, não é erro. Calcanhar saindo do chão: erro. Descida mais rápida que ~1 s: aviso de controle. **Não são dados curados.** Aprovado: até a calibração com gravações reais do usuário na 5.2, os limites **só informam** e não entram na nota como erro. Depois, profundidade e calcanhar viram erro; a inclinação do tronco começa só pela comparação com a 1ª repetição (fadiga). Os valores calibrados são mostrados ao usuário e confirmados antes de contar |
| D6 | Quadros-chave para a IA | **Não enviar nenhum quadro**, só métricas: o vídeo e as imagens nunca saem do celular. (A outra opção, 2–3 quadros com o rosto borrado, aumenta custo e risco de privacidade) |
| D7 | Alertas falados | Voz do navegador (`speechSynthesis`, pt-BR), **ligada por padrão** com botão para desligar. Frases curtas: "Desça mais", "Peito para cima", "Calcanhar no chão", "Mais devagar", e a contagem "um, dois…" |
| D8 | Como encerra a gravação | Toque em "Encerrar" **ou** parada automática após **5 s** em pé sem movimento depois de pelo menos 1 repetição. Teto de **90 s** por gravação |
| D9 | O que é gravado no histórico | Só as análises **concluídas pela IA** (métricas por repetição + resposta da IA). Falha da IA não grava nada. O usuário pode **apagar** uma análise do histórico (com desfazer) |
| D10 | Cruzar com o treino adaptativo (ex.: tronco cai nas últimas reps → sugerir menos carga) | **Só texto na análise** ("considere reduzir a carga"). Nada muda sozinho na carga ou no plano |
| D11 | Limite de análises pela IA | **10 em 24 horas** por usuário (`technique.analyze`) |
| D12 | Modelo da análise | `claude-haiku-5-5` (o padrão do app), esforço `low`; reavaliar com a chamada real na 5.4 |

## Checklist de aceite

- [x] 5.0: spec aprovada (D1–D12), 2026-11-25
- [x] 5.1 (2026-11-25): câmera com permissão e desligamento corretos; MediaPipe carregado sob demanda do próprio app; esqueleto na tela; guia de posicionamento; "Começar" só com corpo inteiro visível; fallbacks sem câmera, sem permissão e sem modelo; acessível (teclado, foco, `aria-label`, toque ≥ 44 px)
- [ ] 5.2: cálculo de ângulos, máquina de contagem e métricas do agachamento com testes (sequências de pontos fictícias: repetição completa, parcial, ruído, ponto pouco visível → "não avaliada") — código e testes entregues em 2026-11-25; falta a calibração da D5 com gravações reais (POS-001)
- [ ] 5.3: contagem e alertas falados com intervalo mínimo, botão de som, fallback só na tela, com testes das regras
- [ ] 5.4: rota com 401/400/422/429/502; servidor reclassificando os erros; resposta da IA filtrada pelo vocabulário; migration com RLS testada num bloco desfeito e aplicada no Supabase; replay com erros marcados; chamada real medida
- [ ] 5.5: histórico paginado no detalhe do exercício (com apagar + desfazer); regras do terra romeno e da remada curvada com testes
- [ ] 5.6: teste de ponta a ponta no navegador contra o Supabase real (dados temporários apagados no fim)

## Pendências

| ID | Descrição | Onde | Prioridade |
|---|---|---|---|
| POS-001 | **Calibrar a D5 com gravações reais do usuário.** O usuário grava com a câmera do celular, de lado, a 2–3 m, com o corpo inteiro: 1 série certa (~5 repetições), 1 rasa de propósito, 1 com o calcanhar subindo, 1 descendo rápido e 1 inclinando o tronco. Os arquivos são enviados para a sessão por escolha dele (nunca para o repositório) e apagados depois. O agente roda o mesmo código de medição nesses vídeos e propõe os valores de profundidade, calcanhar (`SQUAT_HEEL_RISE_MAX_RATIO`, hoje 0,08), descida, fadiga, contagem (160°/150°/140°) e visão de lado (`SIDE_VIEW_MAX_SHOULDER_RATIO`, hoje 0,45), e avalia trocar o modelo "lite" pelo "full" (D1). Com os valores confirmados pelo usuário, `SQUAT_RULES_CALIBRATED` passa a `true` | `src/lib/constants/technique-rules.ts`, `src/lib/constants/technique.ts` | Alta (fecha a 5.2) |

## Atualizações

### 2026-11-25 — 5.0 Spec aprovada

- **Pedido:** etapa 5.0 (esforço `high`).
- **Mudança:** D1–D12 aprovadas; D5 provisória (só informa até a calibração na 5.2, com valores confirmados pelo usuário).
- **Pendências:** nenhuma.

### 2026-11-25 — 5.1 Câmera, MediaPipe Pose e guia de posicionamento

- **Pedido:** etapa 5.1 (esforço `high`).
- **Mudança:** "Analisar minha execução" no card do treino só para os agachamentos (D3); sem câmera no aparelho, o botão fica desabilitado com `aria-label` explicativo. Tela `/technique/[slug]` (404 para exercício não suportado): aviso de privacidade, limites e saúde → guia de posicionamento (ilustração + texto) → câmera frontal espelhada com o esqueleto desenhado só nos pontos realmente vistos. Mensagens de enquadramento ("Seus pés não aparecem…", "Afaste o celular…", "Centralize o corpo…"); "Começar" só com o corpo inteiro visível por 1 s; contagem visual de 3 s (cancela se o corpo sair do quadro); gravação com "Encerrar" e teto de 90 s (D8). A câmera liga só depois do toque e desliga ao encerrar ou sair da tela. Erros em português para permissão negada, sem câmera, câmera ocupada e modelo que não carregou, com "Tentar de novo".
- **D1/D2:** `@mediapipe/tasks-vision` 1.2.3 (Apache 2.0) com versão fixa; o modelo "lite" fica versionado em `public/mediapipe/models/` (SHA-256 conferido por teste, `public/mediapipe/NOTICE.md`); o WASM é copiado do pacote para `public/mediapipe/wasm/` antes de `dev`/`build` (`scripts/copy-pose-assets.ts`, não versionado). O proxy não checa sessão em `/mediapipe/` (arquivos públicos de código aberto). MediaPipe carregado sob demanda, só na tela de técnica (GPU, com CPU de reserva).
- **Ainda não nesta etapa:** contagem de repetições e métricas (5.2), voz (5.3), envio à IA e replay (5.4). Durante a gravação a tela avisa que a contagem e a análise chegam nas próximas etapas.
- **Conferido no navegador:** Chromium com câmera falsa alimentada por uma foto de agachamento do Free Exercise DB (domínio público): o MediaPipe carregou dos arquivos do app, o esqueleto ficou alinhado ao corpo, "Começar" liberou ~1 s depois do corpo inteiro aparecer, contagem → gravação → "Encerrar" funcionaram e a câmera ficou ligada só na tela; com a foto cortada nos pés, "Seus pés não aparecem" e "Começar" desabilitado. Foi feito numa página de teste isolada (mesmos componentes) porque criar usuário temporário no Supabase real foi bloqueado pela permissão automática desta sessão; a rota com login entra no teste de ponta a ponta (5.6).
- **Pendências:** nenhuma.

### 2026-11-25 — 5.2 Métricas por repetição do agachamento (código; calibração pendente)

- **Pedido:** etapa 5.2 (esforço `xhigh`).
- **Mudança:** medição por quadro, de lado, com o lado do corpo que a câmera vê (`measureSquatFrame`): ângulo do joelho, coxa em relação à horizontal (0° = paralela), inclinação do tronco, calcanhar em relação à ponta do pé e joelho à frente da ponta do pé, sempre corrigindo a proporção da imagem; quadro com algum ponto não visto não é medido. Contagem com folga entre limites (`createSquatRepTracker`): a repetição começa ao sair de 150°, só conta se o joelho dobrar até 140° ou menos e volta a 160° (em pé); quadros não vistos não mexem na contagem; repetição com mais de 25% de quadros não vistos fica "não avaliada". Regras da D5 (`classifySquatRep`) com a gravidade aprovada, mas **tudo "Para conferir" até a calibração** (`SQUAT_RULES_CALIBRATED = false`). Contagem ao vivo na tela ("Repetições: N"); a gravação para sozinha 5 s depois da última repetição com o usuário em pé (D8), em "Encerrar" ou nos 90 s. Resumo local depois da série, com a câmera já desligada: repetições contadas, profundidade, tronco e descida por repetição (ângulos arredondados a 5°, "cerca de"), pontos a conferir, "não avaliada" e pedido para regravar quando mais da metade não foi vista; "Gravar de novo".
- **Visão de lado (novo, ligado à D3/D5):** fotos reais de agachamento de frente ou muito em 3/4 deram ângulos errados (ex.: joelho com 158° num agachamento profundo). Por isso o "Começar" agora também exige estar de lado: largura dos ombros / comprimento do tronco ≤ 0,45 ("Fique de lado para a câmera…"). Medido nas fotos: 3/4 que mediu bem ≈ 0,34; de frente 0,5–0,71. Revisto na calibração (POS-001).
- **Conferido no navegador** (Chromium, câmera falsa com fotos de domínio público do Free Exercise DB alternando em pé/embaixo): MediaPipe mediu o joelho com 179° em pé e 87° embaixo; 3 repetições contadas ao vivo; parada automática depois de ficar em pé; resumo com as 3. **Ruído observado:** a mesma foto "embaixo" deu profundidade de 5°, 10° e "paralela" em repetições diferentes, e uma vez acusou o calcanhar — reforça manter tudo só informativo até a calibração e testar o modelo "full".
- **Pendências:** POS-001 (calibração; a etapa 5.2 só fecha com ela).

## Fim da spec
