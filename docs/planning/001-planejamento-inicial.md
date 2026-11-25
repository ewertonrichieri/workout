# Planejamento — Web App de Personal Trainer com IA

## Visão
App onde uma IA atua como personal trainer: monta planos de treino (A/B/C...) conforme objetivo, nível e equipamentos disponíveis; o usuário registra séries e cargas, assiste vídeos de execução e, futuramente, recebe correção de postura pela câmera.

Uso inicial: pessoal (1 usuário). Arquitetura pronta para múltiplos usuários.

## Stack
- **Next.js** (App Router) + PWA instalável no celular
- **Supabase**: Postgres, Auth, Storage, Row Level Security
- **Cloudflare R2**: hospedagem dos vídeos (sem custo de saída)
- **Claude API**: geração de treinos (JSON estruturado), análise de fotos de aparelhos, análise de postura
- **MediaPipe Pose** (no navegador): detecção de pose para correção de postura
- **Vercel**: deploy

## Princípios para escalar
- Login desde o dia 1; todo dado do usuário ligado a `user_id`
- RLS: cada usuário só acessa seus próprios dados
- Catálogo de exercícios global; planos, cargas e academias por usuário
- Papéis no modelo: `aluno`, `personal`, `admin` (usados no futuro)
- Chamadas de IA só no servidor, com limite de uso por usuário
- Cada mídia guarda `fonte` e `licenca` (permite desligar fontes não liberadas)

## Fontes de mídia (ordem de prioridade)
1. **Free Exercise DB with Videos** — ~317 exercícios / 593 MP4 Full HD (principal; licença dos vídeos a confirmar antes de abrir para outros usuários)
2. **Workout Free Videos** — 57 exercícios, CC0 (domínio público)
3. **Exercise Library** — 1.100+ GIFs (cobertura onde não houver vídeo)
4. Embed do YouTube — opção manual

No MVP, as mídias são servidas por fork + jsDelivr ou pela origem (decisão em `specs/009-catalogo-exercicios.md`); storage próprio (R2) fica para fase futura.

## Modelo de dados (inicial)
- `profiles` — usuário, papel, objetivo, nível, limitações
- `exercises` — nome, padrão de movimento, músculos, equipamentos, dificuldade, instruções
- `exercise_media` — exercício, tipo (video/gif/youtube), url, thumbnail, fonte, licença, prioridade
- `gyms` — usuário, lista de equipamentos (opcional)
- `plans` — usuário, objetivo, validade, origem (IA/manual)
- `workouts` — plano, letra (A/B/C), ordem
- `workout_exercises` — treino, exercício, categoria, séries, repetições, descanso, observação, ordem, salvar carga
- `workout_sessions` — execução de um treino em uma data
- `set_logs` — sessão, exercício, série, carga, repetições feitas
- `form_analyses` — usuário, exercício, data, métricas por repetição, feedback da IA (fase 5)

---

## Versões
- **V1 (núcleo):** Fases 0, 1, 2 e 3
- **V2 (diferencial):** Fase 3B (treino adaptativo + substituição) e Fase 4 (fotos de aparelhos)
- **V3 (avançado):** Fase 5 (correção de postura) e Fase 5B (previsão de evolução)
- **Abertura:** Fase 6

## Fases

### Fase 0 — Fundação
- Projeto Next.js + Supabase + Auth
- Schema do banco + RLS
- Layout base (navegação Início / Treino / Agenda / Perfil)

### Fase 1 — Catálogo de exercícios
- Script de importação que une as 3 fontes num catálogo único
- Padronização de nomes de equipamentos e músculos (com tradução PT-BR)
- Upload das mídias para o storage
- Tela de busca/visualização de exercícios

### Fase 2 — Treino (núcleo do app)
- Tela de treino no estilo da referência: abas A/B/C, validade, barra de progresso, cards agrupados por categoria
- Card: nome, padrão de movimento, miniatura do vídeo, séries, repetições, carga editável, check de concluído
- Player de vídeo/GIF ao tocar na miniatura
- Timer de descanso
- "Finalizar treino" → salva sessão e cargas
- Histórico e gráfico de progressão de carga por exercício

### Fase 3 — Geração de treino por IA
- Anamnese: objetivo, nível, dias/semana, tempo por treino, equipamentos, lesões
- Claude gera o plano em JSON, escolhendo apenas exercícios do catálogo
- Revisão e edição manual do plano
- Sugestão de progressão de carga com base no histórico
- Renovação do plano ao fim da validade, usando o histórico
- Aviso de saúde (não substitui profissional)

### Fase 3B — Treino adaptativo do dia + substituição na hora (V2)
> Promovida para `docs/specs/012-treino-adaptativo.md` (2026-11-24). O texto abaixo é o registro original da ideia.

**Treino adaptativo (principal diferencial):**
- Check-in pré-treino (~10s): sono, dor/cansaço por região, tempo disponível, energia
- IA ajusta o treino do dia: reduz volume, troca exercícios que afetam a área dolorida, condensa para o tempo disponível
- Percepção de esforço ao fim de cada série ("fácil / ok / no limite")
- Ajuste automático da carga da próxima sessão com base no esforço (autorregulação)

**Substituição na hora:**
- Botão "trocar" no card do exercício (aparelho ocupado/quebrado)
- IA sugere equivalente: mesmo músculo, mesmo padrão de movimento, disponível na academia do usuário, com vídeo
- Histórico de cargas permanece coerente (registro da troca na sessão)

Modelo de dados: `readiness_checkins` (sessão, sono, dor por região, tempo, energia); `set_logs.esforco`; `workout_sessions.ajustes` (o que a IA mudou e por quê).

### Fase 4 — Equipamentos da academia por foto (opcional)
- Usuário envia fotos dos aparelhos
- Claude identifica os equipamentos → usuário confirma/edita a lista
- Fotos descartadas após a análise; só a lista é salva
- Sem fotos: perfis prontos (academia completa, básica, casa com halteres, peso corporal)
- Geração do treino filtra exercícios pelos equipamentos disponíveis

### Fase 5 — Correção de postura (abordagem híbrida)
> Promovida para `docs/specs/014-correcao-postura.md` (2026-11-25). O texto abaixo é o registro original da ideia.

Abordagem escolhida: **o celular mede, a IA explica**.
- Botão "Analisar minha execução" no card do exercício
- Guia de posicionamento da câmera por exercício (ângulo, distância, corpo inteiro no quadro)
- Gravação com **MediaPipe Pose** no navegador, desenhando o esqueleto na tela
- Extração de métricas por repetição: ângulos articulares, amplitude, velocidade, simetria
- Envio apenas das métricas (+ 2–3 quadros-chave, opcional) para o Claude
- Retorno: nota por repetição, pontos a corrigir, dica principal
- O vídeo não sai do celular (privacidade / LGPD)
- Aviso de limitações (câmera 2D, iluminação, roupa) e de que não substitui profissional

**Prioridade de exercícios:**
- Foco em **peso livre** (agachamento, levantamento terra, remada curvada, supino com halteres...): é onde a postura mais importa e onde ocorrem lesões; a câmera enxerga melhor
- **Aparelhos** (leg press, extensora, polia...): apenas checagem simples de amplitude e cadência, já que o aparelho guia a trajetória e oculta partes do corpo

**Alertas ao vivo (junto da análise pós-série):**
- Regras por exercício rodando no celular (custo zero)
- Feedback **falado/sonoro** curto ("desça mais", "peito pra cima"), pois o usuário não olha a tela durante a série
- Contagem de repetições em voz alta
- Não é um coach por voz conversacional, apenas alertas curtos

**Exemplo — Agachamento (câmera de lado):**
1. Antes: guia de posição (celular de lado, 2–3 m, no chão/banco); gravação só libera com o corpo inteiro visível
2. Durante: esqueleto desenhado na tela; por repetição mede profundidade (quadril vs. joelho), inclinação do tronco, avanço do joelho, calcanhar saindo do chão, ritmo da descida; alertas falados quando passar do limite
3. Fim da série: IA recebe as métricas e retorna nota, acertos, erros por repetição (ex: "da 6ª em diante o tronco inclinou ~15° a mais — fadiga") e uma dica principal
4. Replay da gravação com o esqueleto e os erros marcados em vermelho
5. Histórico de análises mostra a evolução da técnica; cruza com o treino adaptativo (ex: tronco cai nas últimas reps → sugerir ajuste de carga)

**Ângulos de câmera:**
- De lado (padrão): profundidade, tronco, calcanhar, ritmo
- De frente (opcional, segunda gravação): joelho entrando para dentro (valgo) e simetria

**Evoluções da Fase 5:**
- 5.1 — Ampliar as regras de alertas ao vivo para mais exercícios
- 5.2 — Comparação com o esqueleto do vídeo de referência, lado a lado

### Fase 5B — Previsão de evolução (V3)
> Promovida para `docs/specs/015-previsao-evolucao.md` (2026-11-25). O texto abaixo é o registro original da ideia.

- Projeção de metas por exercício com base no histórico ("30 kg no supino em ~6 semanas")
- Detecção de estagnação (ex: 3 semanas sem progresso) e ajuste automático da estratégia
- Visualização da progressão real vs. projetada
- Usa os dados de esforço coletados na Fase 3B

### Fase 6 — Abertura para outros usuários
- Confirmar licença dos vídeos do Free Exercise DB (ou desligar a fonte)
- Limites de uso de IA por usuário / planos de assinatura
- Modo personal: profissional revisa e ajusta treinos gerados pela IA
- Termos de uso e política de privacidade (LGPD)

---

## Pendências
- [ ] Conta no Supabase (ou começar com banco local)
- [ ] Conta na Anthropic (chave da Claude API)
- [ ] Conta no Cloudflare R2 (pode ficar para a Fase 1)
