# 014 — Correção de postura (Fase 5, V3)

**Etapas:** 5.0 a 5.6 (checklist `docs/reference/001-checklist-implementacao.md`). Promovida de `docs/planning/001-planejamento-inicial.md` (Fase 5).

**Status:** concluída (Fase 5 testada de ponta a ponta em 2026-11-25). Decisões D1 a D15 aprovadas pelo usuário em 2026-11-25 (D5 calibrada na 5.2; D13–D15 na 5.7).

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
| D5 | Limites do agachamento (valores iniciais, calibrados na 5.2 com gravações reais e revistos com você; **calibrados em 2026-11-25**, ver Atualizações — tronco absoluto 60°, calcanhar só informa acima de 0,25, descida < 0,7 s) | Profundidade: quadril até a altura do joelho (fêmur paralelo). Inclinação do tronco: alerta acima de ~45° da vertical ou se aumentar ~15° em relação à 1ª repetição (fadiga). Joelho à frente: só informativo, não é erro. Calcanhar saindo do chão: erro. Descida mais rápida que ~1 s: aviso de controle. **Não são dados curados.** Aprovado: até a calibração com gravações reais do usuário na 5.2, os limites **só informam** e não entram na nota como erro. Depois, profundidade e calcanhar viram erro; a inclinação do tronco começa só pela comparação com a 1ª repetição (fadiga). Os valores calibrados são mostrados ao usuário e confirmados antes de contar |
| D6 | Quadros-chave para a IA | **Não enviar nenhum quadro**, só métricas: o vídeo e as imagens nunca saem do celular. (A outra opção, 2–3 quadros com o rosto borrado, aumenta custo e risco de privacidade) |
| D7 | Alertas falados | Voz do navegador (`speechSynthesis`, pt-BR), **ligada por padrão** com botão para desligar. Frases curtas: "Desça mais", "Peito para cima", "Calcanhar no chão", "Mais devagar", e a contagem "um, dois…" |
| D8 | Como encerra a gravação | Toque em "Encerrar" **ou** parada automática após **5 s** em pé sem movimento depois de pelo menos 1 repetição. Teto de **90 s** por gravação |
| D9 | O que é gravado no histórico | Só as análises **concluídas pela IA** (métricas por repetição + resposta da IA). Falha da IA não grava nada. O usuário pode **apagar** uma análise do histórico (com desfazer) |
| D10 | Cruzar com o treino adaptativo (ex.: tronco cai nas últimas reps → sugerir menos carga) | **Só texto na análise** ("considere reduzir a carga"). Nada muda sozinho na carga ou no plano |
| D11 | Limite de análises pela IA | **10 em 24 horas** por usuário (`technique.analyze`) |
| D12 | Modelo da análise | `claude-haiku-5-5` (o padrão do app), esforço `low`; reavaliar com a chamada real na 5.4 |
| D13 | Calibração por padrão de movimento (aprovada em 2026-11-25) | A análise é por **padrão** (agachar, dobrar o quadril, puxar), não por exercício: as variações do mesmo padrão usam as mesmas regras. Para dobrar o quadril e puxar, as regras **comparam cada repetição com a 1ª avaliada da série** (não dependem do corpo nem da câmera) e aparecem como **"Atenção"**; um aviso de referência da literatura por padrão aparece só como **"Para conferir"** |
| D14 | Regras de dobrar o quadril e puxar (calibradas com o vídeo do usuário de 2026-11-25) | **Dobrar o quadril** (conta pelo ângulo do quadril, como o agachamento: 160°/150°/140°): amplitude caindo (quadril 25°+ mais aberto que na 1ª), joelho dobrando mais (15°+ mais dobrado que na 1ª), descida rápida (< 0,7 s); referência: joelho abaixo de 140° = parece agachamento (Para conferir). **Puxar** (conta pela altura do punho em relação ao quadril, em comprimentos de tronco: parado ≤ −0,20, saiu > −0,15, conta se chegar a ≥ −0,10): puxada curta (punho abaixo de +0,10), tronco subindo para puxar (8°+ em relação ao tronco parado antes da puxada); referência: tronco a menos de 40° da vertical = mais em pé que o comum (Para conferir) |
| D15 | Exercícios liberados (aprovado em 2026-11-25) | Dobrar o quadril: terra romeno com barra e com halteres, stiff com barra, com halteres e com um halter. Puxar: remada curvada com barra (pronada, supinada e reversa), com barra EZ, no Smith (pronada e reversa), com halteres e com rotação de punho. Ficam de fora as remadas unilaterais (de lado, um braço esconde o outro) e o good morning |

## Checklist de aceite

- [x] 5.0: spec aprovada (D1–D12), 2026-11-25
- [x] 5.1 (2026-11-25): câmera com permissão e desligamento corretos; MediaPipe carregado sob demanda do próprio app; esqueleto na tela; guia de posicionamento; "Começar" só com corpo inteiro visível; fallbacks sem câmera, sem permissão e sem modelo; acessível (teclado, foco, `aria-label`, toque ≥ 44 px)
- [x] 5.2 (2026-11-25): cálculo de ângulos, máquina de contagem e métricas do agachamento com testes (sequências de pontos fictícias: repetição completa, parcial, ruído, ponto pouco visível → "não avaliada"); D5 calibrada com vídeos reais do usuário (POS-001)
- [x] 5.3 (2026-11-25): contagem e alertas falados com intervalo mínimo, botão de som, fallback só na tela, com testes das regras
- [x] 5.4 (2026-11-25): rota com 401/400/422/429/502; servidor reclassificando os erros; resposta da IA filtrada pelo vocabulário; migration com RLS testada num bloco desfeito e aplicada no Supabase; replay com erros marcados; chamada real medida
- [x] 5.5 (2026-11-25): histórico paginado no detalhe do exercício (com apagar + desfazer); regras do terra romeno e da remada curvada entregues na 5.7 (POS-002 fechada)
- [x] 5.6 (2026-11-25): teste de ponta a ponta no navegador contra o Supabase real (dados temporários apagados no fim)
- [x] 5.7 (2026-11-25): análise genérica por padrão de movimento (D13–D15): métricas, contagem, regras, alertas falados, resumo, prompt, API e banco por padrão; dobrar o quadril e puxar validados com o vídeo do usuário; agachamento sem mudança de comportamento

## Pendências

| ID | Descrição | Onde | Prioridade |
|---|---|---|---|
| — | Nenhuma (POS-002 fechada em 2026-11-25 pela etapa 5.7) | — | — |

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

### 2026-11-25 — POS-001: 1º vídeo de calibração (não fecha a pendência)

- **Vídeo:** 11,6 s, agachamento com barra, celular na mão, filmado **de frente na diagonal (~3/4)**, não de lado. Processado quadro a quadro (30 por segundo) com o mesmo código do app, modelos "lite" e "full"; vídeo e quadros apagados depois (só os números ficaram).
- **Contagem:** os dois modelos contaram **2 repetições**, o certo (o vídeo começa no meio de uma descida, que não conta porque não partiu da posição em pé). Joelho embaixo: lite ~96°, full ~102°.
- **Visão de lado:** ombros/tronco entre 0,40 e 0,55 (mediana 0,46–0,48), bem perto do limite 0,45: o "Começar" ficaria quase sempre bloqueado, mas liberaria em alguns quadros. **Proposta:** baixar para 0,40, a confirmar com um vídeo de lado de verdade (para não bloquear quem está de lado).
- **Tronco:** medido em ~10°, mas a inclinação real é claramente maior; de frente/diagonal a pessoa inclina na direção da câmera e a inclinação some na imagem. Confirma que a medição só vale de lado; tronco e fadiga não dão para calibrar com este vídeo.
- **Profundidade:** coxa 32–37° acima da paralela, coerente com o que se vê (meio agachamento).
- **Calcanhar (no chão):** 0,02–0,07 contra o limite 0,08 — pouca folga nesta vista; decidir com o vídeo de lado.
- **Descida:** 0,7–1,0 s, bem em cima do limite de 1 s; depende de onde a repetição começa (último quadro em pé). Rever com o vídeo de lado.
- **Em pé:** joelho 165–177° (lite) e 160–163° (full) nesta vista; com o "full" a folga para o limite de 160° é pequena. De lado, em pé, o esperado é ~175°.
- **Lite x full:** contaram igual; o "full" variou menos em pé, mas sem um vídeo de lado não dá para dizer qual mede melhor. Mantido o "lite" por enquanto.
- **Falta para fechar a POS-001:** um vídeo **de lado** (celular apoiado na altura do quadril, a 2–3 m, perpendicular ao corpo, corpo inteiro), com séries certas e com os erros de propósito.

### 2026-11-25 — POS-001 fechada: D5 calibrada com vídeos de lado

- **Vídeos:** 2 gravações de lado do usuário (celular apoiado): agachamento livre com séries certa, rasa e com o tronco inclinado (5 repetições, de calça e meia), e outra descalço, de calça dobrada, com calcanhar subindo e descidas rápidas (9 repetições). Processadas quadro a quadro com o mesmo código do app (modelos "lite" e "full"); o usuário confirmou a leitura de cada repetição. Vídeos e quadros apagados no fim.
- **Valores confirmados pelo usuário:**

| Limite | Antes | Calibrado | Evidência |
|---|---|---|---|
| Profundidade (Corrigir) | coxa ≤ 0° | **mantido** | Só a repetição funda chegou à paralela (−4°); rasas 9–39° acima |
| Tronco absoluto (só informa) | 45° | **60°** | Repetição funda e certa: 49°; inclinadas de propósito: 75° e 84° |
| Fadiga (Corrigir) | +15° sobre a 1ª | **mantido** | Acusou as inclinadas (+36° e +45°), não as normais (+10° e +12°) |
| Calcanhar | erro acima de 0,08 | **só informa, acima de 0,25** | No chão chegou a 0,235 (calça e meia cobrindo o tornozelo); levantado 0,26–0,35, com uma falha (0,17, logo depois de ficar na ponta dos pés). Folga pequena demais para ser erro (falso positivo é pior) |
| Descida rápida (Atenção) | < 1 s | **< 0,7 s** | Normais 0,8–2,6 s; rápidas de propósito 0,37–0,63 s |
| Visão de lado | 0,45 | **0,40** | De lado ≤ 0,33 (só passou ao virar para a câmera); 3/4 nunca abaixo de 0,40 |
| Contagem (160°/150°/140°) | — | **mantida** | 5 de 5 e 9 de 9; uma subida pela metade (joelho ~145°) entre duas descidas conta como uma repetição, pela regra de voltar em pé |
| Modelo | lite | **mantido** | Mediu igual ao "full" (±5°) e separou melhor o calcanhar; 3,6 MB menor |

- **Ajustes técnicos que saíram dos vídeos:** repetição com menos da metade dos quadros vistos não é contada (o "lite" contou uma repetição fantasma com 1 de 37 quadros vistos enquanto o celular era posicionado); a contagem regressiva só é cancelada depois de 0,5 s fora do quadro (falhas do modelo de ~170 ms cancelavam).
- **Resultado com os valores calibrados:** vídeo 2 — a repetição certa sem correção; rasas com "Corrigir: profundidade"; inclinadas com "Corrigir: tronco… (cansaço)". Vídeo 3 — calcanhar apontado em 5 das 6 que subiram e em nenhuma que ficou no chão; descida rápida nas 6 rápidas.
- **Observação:** "joelho passou da ponta do pé" (só informa) apareceu em quase todas as repetições; é comum no agachamento livre. Se incomodar, dá para esconder ou subir o limite depois.
- `SQUAT_RULES_CALIBRATED = true`: profundidade e fadiga contam como "Corrigir", descida rápida como "Atenção"; tronco absoluto, joelho e calcanhar como "Para conferir". O aviso de "limites em calibração" sai do resumo.
- **Pendências:** nenhuma. Etapa 5.2 concluída.

### 2026-11-25 — 5.3 Alertas falados ao vivo + contagem

- **Pedido:** etapa 5.3 (esforço `high`).
- **Mudança:** voz do navegador em pt-BR (D7): "3" no toque em "Começar" (o toque libera a voz no iPhone), "2", "1" e "Já!"; a cada repetição o número ("3") e, se for o caso, um alerta curto ("3. Desça mais"). No máximo um alerta por repetição, escolhido por prioridade — "Desça mais" (profundidade), "Peito para cima" (tronco cansando), "Mais devagar" (descida rápida) — e nunca dois alertas com menos de 4 s entre eles (o número sempre é falado). Pontos que só informam (calcanhar, joelho, tronco absoluto) nunca são falados. O último alerta também aparece na tela. Botão "Alertas falados: ligados/desligados" (`aria-pressed`), ligado por padrão e lembrado só neste aparelho; sem voz no navegador, o botão dá lugar a "os alertas aparecem só na tela".
- **Conferido no Chromium** (câmera falsa com fotos de domínio público, fala registrada): "3", "2", "1", "Já!", "1. Desça mais", "2", "3. Desça mais" — o alerta da 2ª foi segurado pelo intervalo mínimo. Defeito encontrado e corrigido no teste: falava "0" antes do "Já!".
- **Pendências:** nenhuma.

### 2026-11-25 — 5.4 Análise pós-série pela IA + replay

- **Pedido:** etapa 5.4 (esforço `high`).
- **Mudança (servidor):** `POST /api/technique-analyses` (sessão obrigatória) recebe só números por repetição (`exerciseSlug`, `cameraView`, `reps[]` com duração, descida, ângulos, razões e quadros vistos; campos extras recusados). O servidor reconstrói cada repetição, decide sozinho se foi avaliada e **reclassifica os erros com as regras calibradas** (não confia no aparelho). 400: entrada inválida ou exercício/câmera sem análise; 422: mais da metade não avaliada (IA não é chamada); 404: exercício fora do catálogo; 429: limite (D11, 10 em 24 h, `technique.analyze`); 502: IA. A IA (Haiku 5.5, esforço `low`, D12) recebe exercício, câmera, regras e números — nada de nome, imagem ou ponto do corpo — e devolve nota da série e por repetição (0–10), acertos, correções e a dica principal em pt-BR. A resposta é filtrada: notas só para repetições avaliadas, **correções só para erro/atenção que as regras acusaram nas repetições citadas** (nunca para o que só informa), textos curtos. Grava tudo numa transação (`save_technique_analysis`) **só quando a IA conclui** (D9). Com limitação na anamnese, a resposta traz o reforço de procurar um profissional.
- **Mudança (aparelho):** durante a gravação o vídeo da câmera e as poses de cada quadro ficam **só na memória** (`MediaRecorder`). No resumo: painel "Análise da IA" (carregando, nota da série, dica principal, o que foi bem, o que corrigir com as repetições, reforço de saúde; falha com "Tentar de novo" sem regravar), nota de cada repetição no cartão dela, e **replay** com o esqueleto, as repetições com erro/atenção em vermelho e botões "1ª, 2ª…" para pular até cada uma. Sair da tela descarta o vídeo (URL revogada). Sem `MediaRecorder`, aviso e tudo o mais funciona. O pedido à IA sai uma vez só ao abrir o resumo.
- **Modelo de dados (diferenças do rascunho):** tabelas `technique_analyses`, `technique_reps`, `technique_rep_issues`, `technique_analysis_feedback`, com RLS. Sem `workout_exercise_id` (a tela não sabe de qual treino veio e o histórico da 5.5 é por exercício) e sem `ai_status` (D9: só se grava o que a IA concluiu); as repetições citadas em cada correção não são gravadas (o texto já as cita; o histórico usa os erros por repetição).
- **Banco:** migration `20261201000000_technique_analyses.sql` testada num bloco desfeito no Supabase (gravou 1 análise, 3 repetições, 3 erros e 2 textos; outro usuário não viu nada; repetição não avaliada com nota foi recusada) e aplicada. Observação: as migrations `20261129…` e `20261130…` estão aplicadas no banco mas não aparecem em `supabase_migrations.schema_migrations` (a nova também não foi registrada lá, para seguir o mesmo padrão).
- **Chamada real medida** (série fictícia de 5 repetições, `scripts/measure-technique-analysis.ts`): **5–6 s, ~2.000 tokens de entrada e ~1.100 de saída, ~US$ 0,0008 por análise**; notas estáveis entre chamadas (9, 9, 6, 4, 3); nada descartado pelo filtro. Duas correções feitas depois das primeiras medições: uma resposta veio sem acentos (o prompt agora pede acentos) e a IA escreveu correção para o joelho à frente, que só informa (agora o filtro descarta). D12 mantida (`low`).
- **Conferido no Chromium** (câmera falsa, API interceptada no navegador porque criar usuário de teste no Supabase foi bloqueado nesta sessão): um pedido só, com apenas as chaves numéricas; replay de 17 s gravado na memória; botões das repetições com as marcadas; pular para a repetição; painel da IA. A rota com login, o banco e a IA juntos ficam para o teste de ponta a ponta (5.6).
- **Pendências:** nenhuma.

### 2026-11-25 — 5.5 Histórico de técnica (parte 1 de 2)

- **Pedido:** etapa 5.5 (esforço `medium`).
- **Mudança:** `GET /api/technique-analyses?exercise=<slug>&page=<n>` (10 por página, só exercícios com análise) e `DELETE /api/technique-analyses/:id` (404 se não for do usuário). No detalhe do exercício, seção "Técnica": data (no fuso do app), nota, repetições avaliadas, erros mais frequentes (só erro/atenção, quantas repetições) e a dica principal; "Carregar mais"; estados de carregamento, vazio e erro. "Apagar" esconde a análise e mostra "Análise apagada. Desfazer" (foco no Desfazer) por 5 s; só então apaga de verdade (D9); se falhar, a análise volta com aviso; sair da tela dentro dos 5 s ainda apaga. No resumo da série, "Ver histórico de técnica" depois que a IA conclui.
- **Banco:** migration `20261202000000_technique_history_delete.sql` (permissão de apagar; RLS já restringia ao dono) testada num bloco desfeito — outro usuário não apagou, o dono apagou e as repetições foram junto — e aplicada no Supabase.
- **Conferido no Chromium** (API simulada no navegador): lista, desfazer, apagar depois de 5 s. Defeito achado e corrigido: a data aparecia com a hora colada ("25T12:00…/11/2026"); agora o servidor devolve a data no fuso do app.
- **Pendências:** POS-002 (regras do terra romeno e da remada).

### 2026-11-25 — 5.6 Teste de ponta a ponta

Usuário temporário criado já confirmado por SQL (liberado pelo usuário), app em modo produção nesta nuvem, Chromium em 375 px com câmera falsa (fotos de domínio público de agachamento, alternando em pé/embaixo), IA real (Haiku 5.5). Passaram:
- **Login** por e-mail e senha; **API sem sessão** → 401; com sessão, exercício sem análise → **400** e série com mais da metade não vista → **422** (IA não chamada)
- **Tela de técnica** direto em `/technique/barbell-back-squat`: aviso → guia → câmera → "Começar" liberado com o corpo inteiro de lado
- **Voz:** "3", "2", "1", "Já!", "1. Desça mais", "2", "3. Desça mais" (intervalo mínimo segurou o alerta da 2ª)
- **Parada automática** depois de ficar em pé; **resumo** com 3 repetições; **análise real** em ~8–10 s com nota, correções só do que as regras acusaram e dica; replay
- **Banco:** 1 análise, 3 repetições, os erros e os textos gravados; 1 registro no limite de IA por análise
- **Histórico** pelo link "Ver histórico de técnica": data, nota, erros mais frequentes e dica; **Desfazer** devolveu a análise; **Apagar** sumiu da tela e do banco (com as repetições) depois de 5 s

Defeitos achados e corrigidos (com testes): o texto de uma correção foi **cortado no meio** pelo limite de 240 caracteres (agora o prompt pede até 200 e o corte é em fim de palavra com "…"); o prompt mostrava "coxa 0° acima da paralela" para 0,4° (agora no mínimo 1°); a IA elogiou "calcanhares no chão", medida não confiável em 2D (o prompt agora proíbe comentar o calcanhar e os pontos que só informam). Repetido depois das correções: tudo passou.

Não testado aqui: o link "Analisar minha execução" dentro do card do treino (precisa de um plano com agachamento; coberto por testes de componente) e o limite de 10 análises em 24 h (mesmo mecanismo das fases 3 e 4, coberto por testes). Usuário e todos os dados dele apagados no fim (contagens zeradas).
- **Pendências:** nenhuma nova (POS-002 continua).

### 2026-11-25 — 5.7 Análise por padrão de movimento (D13–D15)

- **Pedido:** fechar a POS-002 sem gravar um vídeo por exercício; calibração por padrão de movimento (aprovada pelo usuário). Esforço `high`.
- **Pesquisa:** não há limites prontos e validados para câmera 2D. Projetos abertos com MediaPipe usam números sem fonte (ex.: quadril 165°/100° no terra) e nenhum tem a remada; estudos dão faixas (terra romeno com joelho quase reto ~145°+, remada com tronco 40–65° da vertical). Esses números entraram só como referência ("Para conferir").
- **Mudança (código):** a análise virou genérica por **padrão de movimento** (`src/lib/technique/patterns/`): cada padrão define como medir o quadro (sinal de contagem + valores), a contagem com folga (direção, repouso, saída, alvo), as métricas por repetição (mín./máx., algumas relativas ao último quadro parado), as regras, os alertas falados e o texto para a IA. Um único contador (`rep-tracker.ts`) serve aos três. **Agachamento:** mesmas regras e limites de antes (testes portados). **Dobrar o quadril** (terra romeno, stiff) e **puxar** (remadas com barra, Smith e halteres, sem as unilaterais): regras da D14, comparando com a 1ª repetição avaliada, como "Atenção"; referências da literatura como "Para conferir". Alertas falados novos: "Quadril para trás", "Joelho mais reto", "Puxe até a barriga", "Tronco parado". Resumo com as medidas de cada padrão (quadril e joelho; até onde a mão subiu e quanto o tronco subiu). Prompt da IA genérico, com as regras e os números do padrão; a IA só cita profissional quando há limitação na anamnese. Nova regra para todos: repetição com menos de 0,4 s não conta (um quadro com ruído virou uma "puxada").
- **API e banco:** cada repetição manda `metrics` (nome → valor, só os do padrão do exercício, dentro das faixas; senão 400). Migration `20261203000000_technique_patterns.sql`: métricas numa tabela própria (`technique_rep_metrics`, uma linha por métrica, RLS), colunas fixas do agachamento removidas (tabela vazia), vocabulário de problemas ampliado e `save_technique_analysis` atualizada; testada num bloco desfeito (6 métricas e 3 problemas gravados, outro usuário não viu nada, métrica desconhecida recusada, apagar levou as métricas junto) e aplicada no Supabase.
- **Validação com o vídeo do usuário** (de lado, 90 s, só números; o código real do app rodou quadro a quadro): **dobrar o quadril** — 12 de 12 repetições, e cada grupo recebeu só o seu aviso (3 certas sem aviso; 3 curtas → amplitude caindo; 3 com o joelho dobrando → joelho dobrando mais; 3 rápidas → descida rápida); "joelho como agachamento" em todas, como "Para conferir" (o joelho chegou a ~90° já nas certas). **Puxar** — 14 puxadas (4 normais sem aviso, 3 curtas → puxada curta, 3 até o ombro → tronco subindo 9–13°, 4 extras sem aviso); "tronco mais em pé" em todas, como "Para conferir" (~35° da vertical).
- **Chamada real da IA** (séries fictícias, `scripts/measure-technique-analysis.ts --pattern=hinge|row`): 3,6–4,6 s, ~US$ 0,0005–0,0006 por análise; correções só do que as regras acusaram. Corrigido: a IA sugeriu "professional" (em inglês) sem limitação informada.
- **Não testado aqui:** a rota com login e o banco real para o terra romeno e a remada juntos (o caminho é o mesmo do agachamento, testado na 5.6; a função do banco foi testada no bloco desfeito).
- **Pendências:** nenhuma. Vídeo e quadros apagados no fim.

## Fim da spec
