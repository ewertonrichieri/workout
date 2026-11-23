# Contexto lógico

Resumo de como o sistema funciona, derivado de `docs/specs/001-prd.md`.

## Fluxo principal

1. **Usuário entra** (Supabase Auth). Todo dado pessoal é ligado ao `user_id` da sessão e protegido por RLS.
2. **Anamnese** (`assessment`): objetivo, nível, dias/semana, tempo, equipamentos, limitações.
3. **Geração do plano** (servidor): a anamnese + o catálogo filtrado vão para a Claude API, que devolve JSON. O servidor valida o JSON por schema e só aceita exercícios existentes no catálogo e com mídia.
4. **Plano** (`plan`, validade 6 semanas) → **treinos** (`workout` A/B/C) → **exercícios do treino** (`workout_exercise`: séries, repetições, descanso, categoria, ordem, `track_progression`).
5. **Execução**: o usuário abre um treino, assiste a mídia, registra cada série (`set_log`: carga, repetições) e finaliza (`workout_session`).
6. **Progressão**: exercícios com `track_progression` sugerem a última carga na próxima sessão; o histórico alimenta gráficos e a renovação do plano.
7. **Renovação**: ao vencer a validade, o app sugere gerar um novo plano usando o histórico. Nunca renova sozinho.

## Entidades

- **Globais (catálogo):** `exercise`, `exercise_media` (com `source`, `license`, prioridade), equipamentos e músculos.
- **Por usuário:** `profile`, `assessment`, `plan`, `workout`, `workout_exercise`, `workout_session`, `set_log`.

## Fronteiras

- **Servidor:** banco, Claude API, validação, regras de negócio.
- **Cliente:** exibe dados, player de mídia, timer, envio de ações.
- **Mídia:** servida do storage próprio; fallback de prioridade vídeo → GIF → YouTube.

## Fora do MVP (não implementar, só deixar pontos de extensão)

Treino adaptativo, substituição na hora, fotos de equipamentos, correção de postura, previsão de evolução, limites de uso, cobrança, modo personal.
