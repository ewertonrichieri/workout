# Status Geral — Workout (Personal Trainer com IA)

**Data da última atualização:** 2026-11-25

---

## Próximo a implementar

Lista priorizada (spec, bug, técnico, melhoria). Uma linha por item com ID e link.

1. **4.2** — revisão da lista de equipamentos + perfis prontos (esforço `medium`) → `specs/013-equipamentos-por-foto.md`
2. **AUTH-002** — testar o cadastro por e-mail (último item da V1) (usuário) → `specs/007-autenticacao.md`
3. **CAT-002** — forks (usuário) → `specs/009-catalogo-exercicios.md`
4. **TRN-001** — gravar o plano atual (3×10, sem descanso) quando a conta do usuário existir → `specs/010-treino.md`

---

## Concluído recentemente

- **4.1 Fotos + identificação pela IA** — `POST /api/equipment-detections` (até 5 fotos, 4 MB juntas, tipo real conferido, limite de 5 análises em 24 h), fotos comprimidas no aparelho e nunca gravadas, resposta da IA filtrada pelo vocabulário (sem falso positivo); "Identificar por foto" na anamnese com resultado para leitura; chamada real ~4,4 s e ~US$ 0,0008 por 4 fotos; migration aplicada no Supabase → `specs/013-equipamentos-por-foto.md`
- **4.0 Spec da Fase 4** — `specs/013-equipamentos-por-foto.md` aprovada (D1–D8; fotos comprimidas no navegador em WebP 0,7, até 1.568 px) → `specs/013-equipamentos-por-foto.md`
- **SUB-001 Cache das trocas** — a escolha da IA na troca na hora fica guardada por usuário e pela entrada exata da IA (hash); a mesma troca de novo não chama a IA; migration testada num bloco desfeito e aplicada no Supabase → `specs/012-treino-adaptativo.md`
- **Controle de custo da IA** — limite por usuário em 24 horas (gerar/renovar plano: 3; ajuste do dia: 5; troca na hora sem limite por decisão do usuário, SUB-001) com HTTP 429 em português; proposta do ajuste guardada por check-in (pedir de novo não paga a IA); troca sem IA quando sobram até 3 opções; migration testada num bloco desfeito e aplicada no Supabase → `specs/011-geracao-treino-ia.md`, `specs/012-treino-adaptativo.md`
- **3B.5 Teste de ponta a ponta (Fase 3B)** — check-in, ajuste da IA (aceitar, manter, desfazer, fallback quando a IA propôs mais que o plano), troca na hora com desfazer, esforço por série, finalizar e autorregulação (descer para 28,5 kg e manter com "no limite") testados no navegador contra o Supabase real com IA real; nenhum defeito; dados temporários apagados; Fase 3B concluída → `specs/012-treino-adaptativo.md`
- **3B.4 Substituição na hora** — "Trocar exercício" no card (antes de qualquer série com check): motivo opcional (aparelho ocupado/quebrado/outro), a IA escolhe até 3 equivalentes entre exercícios com mídia, mesmo músculo principal e equipamento da anamnese (sem o aparelho do original quando ocupado/quebrado); se a IA falhar, sugestões automáticas avisadas; "Desfazer troca"; vale só para hoje; ao finalizar, `exercise_substitutions` e séries com o substituto; chamada real medida (1,7–3,4 s, ~US$ 0,0003); migration aplicada e testada no Supabase (bloco desfeito) → `specs/012-treino-adaptativo.md`
- **3B.3 Esforço por série + autorregulação** — "fácil / ok / no limite" opcional depois do check da série, gravado em `set_logs.effort`; com "Salvar carga para progredir" ligado: "no limite" impede a subida da 3.5 (o card explica) e 2+ séries no limite abaixo do mínimo de repetições sugerem −5% (mín. 1 kg); interruptor desligado trava a carga; migration aplicada e testada no Supabase (bloco desfeito) → `specs/012-treino-adaptativo.md`
- **3B.2 Ajuste do treino do dia pela IA** — depois de um check-in de dia mais leve, a IA propõe reduzir, remover ou trocar exercícios (nunca aumenta; trocas só por exercícios com mídia e equipamento da anamnese que trabalham o mesmo músculo); revisão antes/depois com "Usar treino ajustado" / "Manter treino original" e desfazer; o plano não muda; `session_adjustments` e finalização seguindo o ajuste; chamada real medida (6–10 s, ~US$ 0,001–0,002); migration aplicada e testada no Supabase (bloco desfeito) → `specs/012-treino-adaptativo.md`
- **3B.1 Check-in antes do treino** — opcional, antes da primeira série: sono, energia, tempo (padrão da anamnese) e dor por região com intensidade; `POST /api/readiness-checkins`; tabelas `readiness_checkins` e `readiness_checkin_pains`; a sessão finalizada guarda o check-in do dia; migration aplicada e testada no Supabase (bloco desfeito) → `specs/012-treino-adaptativo.md`
- **Spec da Fase 3B (V2)** — `specs/012-treino-adaptativo.md` aprovada (D1–D7 confirmadas): check-in, ajuste do dia pela IA, esforço por série com autorregulação e troca na hora → `specs/012-treino-adaptativo.md`
- **AUTH-001 Login com Google** — configurado pelo usuário; Google ativo no Supabase e `/auth/v1/authorize?provider=google` redireciona para o Google com o client id certo (conferido em 2026-11-24) → `specs/007-autenticacao.md`
- **Teste de ponta a ponta (Fase 3)** — anamnese, geração real com IA, revisão, edição, progressão de carga, renovação com histórico, aviso de saúde, PWA e API sem sessão testados no navegador contra o Supabase real; ASM-001 fechada; dados temporários apagados → `specs/011-geracao-treino-ia.md`
- **3.8 PWA instalável** — recurso nativo do Next.js: `manifest.ts`, ícones gerados (`icon.tsx` 192/512/mascarável, `apple-icon.tsx`), `themeColor`; manifest e ícones públicos no proxy; conferido com o app rodando (sem login) → `specs/011-geracao-treino-ia.md`
- **3.7 Aviso de saúde** — na anamnese e na tela de treino, com reforço quando há limitação informada → `specs/011-geracao-treino-ia.md`
- **3.6 Sugestão de renovação** — aviso nos últimos 7 dias e depois de vencer (Início e treino) com "Renovar plano com a IA" (confirmação, plano antigo arquivado); a renovação envia à IA o histórico do plano (`plan_history_summary`); migration aplicada → `specs/011-geracao-treino-ia.md`
- **3.5 Sugestão de progressão** — todas as séries no máximo de repetições com a mesma carga → sugere +5% (arredondado para 0,5 kg, mínimo +1 kg), com o motivo no card; `latest_set_loads` devolve as repetições; migration aplicada → `specs/010-treino.md`
- **3.3 Geração do plano pela IA** — chamada real medida (PLN-001): Haiku 5.5, esforço `medium`, 1.068 candidatos, ~16–19 s e ~US$ 0,002–0,005 por plano, plano válido e limitação respeitada; o app passa a usar `claude-haiku-5-5` como modelo padrão (`CLAUDE_MODEL`, decisão do usuário) → `specs/011-geracao-treino-ia.md`
- **3.4 Revisão e edição manual** — aviso de revisão depois da geração; `/workout/edit` edita séries, repetições, descanso, categoria e observação, reordena, remove, troca e adiciona exercícios do catálogo (rascunho com descartar); `PUT /api/workouts/:id/exercises` grava numa transação preservando o histórico; migration aplicada → `specs/011-geracao-treino-ia.md`
- **3.2 Wrapper da Claude API** — `generate()` com saída estruturada validada por zod, streaming, fallback de recusa (`fallbacks: "default"`), retry 3× com backoff (só 429/5xx/conexão; `Retry-After` respeitado), teto de 120 s para IA (exceção no `AGENTS.md`), erros pt-BR (429/502) e logs sem conteúdo → `specs/011-geracao-treino-ia.md`
- **3.1 Anamnese** — `/assessment` (objetivo, nível, dias, tempo, divisão, equipamentos, limitações) com erros por campo e preenchida com a última anamnese; `POST /api/assessments` grava anamnese + equipamentos numa transação (`save_assessment`); link no Início e no Perfil. Migration aplicada no Supabase e função testada lá (bloco desfeito no fim); testada no navegador (ASM-001 fechada) → `specs/011-geracao-treino-ia.md`
- **Teste de ponta a ponta (Fases 0–2)** — login por e-mail, treino, finalizar, carga sugerida, Agenda e evolução testados no navegador contra o Supabase real; corrigidos `Date.now()` na pré-renderização e miniatura quebrada → `specs/010-treino.md`
- **2.8 Histórico e gráfico** — Agenda com treinos finalizados (paginada); `/progress/[slug]` com gráfico da maior carga por sessão (tooltip por toque/mouse/setas) e tabela acessível; link "Ver evolução" no card e no detalhe do exercício → `specs/010-treino.md`
- **2.7 Salvar carga para progredir** — interruptor por exercício (`PATCH /api/workout-exercises/:id`); carga da última sessão preenchida em rascunho ainda não editado (`latest_set_loads`, aplicada no Supabase) → `specs/010-treino.md`
- **2.6 Finalizar treino** — `POST /api/workout-sessions` revalida no servidor e grava sessão + séries com check numa transação (`finish_workout_session`); confirmação com séries sem check; rascunho apagado ao salvar. Corrigido bug de permissões das tabelas (spec 006). Migrations aplicadas no Supabase → `specs/010-treino.md`
- **2.4 Registro de séries** — linha por série (repetições, carga em kg com vírgula, check), validação com erro por campo, "Concluído" por exercício e resumo no topo; rascunho no aparelho por treino e dia até finalizar (2.6) → `specs/010-treino.md`
- **2.3 Player com fallback** — mídias por prioridade (vídeo → GIF → YouTube via embed `youtube-nocookie`), troca automática quando uma falha, crédito da mídia exibida; no detalhe do exercício e em "Ver demonstração" no card do treino → `specs/010-treino.md`
- **2.2 Tela de treino** — `/workout` com plano ativo: abas só quando há mais de um treino (`?workout=`), validade com barra de progresso, cards agrupados por categoria (séries, repetições, descanso informativo), estados vazio/carregamento/erro; teste com dados reais depende do TRN-001 → `specs/010-treino.md`
- **2.1 Spec do treino + leitura do plano** — `specs/010-treino.md`; repositório/serviço do plano ativo (treinos, exercícios, mídias) e cálculo de validade → `specs/010-treino.md`
- **CAT-004 Banco do catálogo** — migrations `exercise_source_refs` e `search_exercises` + seed aplicados no Supabase (1.298 exercícios, 0 sem mídia) → `specs/009-catalogo-exercicios.md`
- **1.7 Tela de exercícios** — `/exercises` (busca, filtros, paginação) e `/exercises/[slug]` (mídia, músculos, equipamentos, crédito), estados de carregamento/vazio/erro; link na tela de Treino → `specs/009-catalogo-exercicios.md`
- **1.6 API de exercícios** — função `search_exercises` (sem acento, filtros, só com mídia), repositório, serviço e rotas `/api/exercises`, `/api/exercises/:slug`, `/api/exercise-filters` → `specs/009-catalogo-exercicios.md`
- **1.5 Seed do catálogo** — `supabase/seed.sql` gerado (`npm run catalog:seed`), idempotente, validado em Postgres local (1.298 exercícios, 0 sem mídia); aplicar no Supabase: CAT-004 → `specs/009-catalogo-exercicios.md`
- **1.4 URLs das mídias** — `media-hosting.json` (fork + commit fixo, licença e prioridade por fonte) e resolução das URLs; jsDelivr depende dos forks (CAT-002) → `specs/009-catalogo-exercicios.md`
- **1.3 Normalização do catálogo** — vocabulários curados (30 músculos, 30 equipamentos), dedup com revisão, 1.298 exercícios, 347 nomes pt-BR (todos com vídeo), script `catalog:build` → `specs/009-catalogo-exercicios.md`
- **1.2 Parsers do catálogo** — schema comum, um parser por fonte, script `catalog:parse`, arquivos em `seed-data/catalog/sources/` (1.486 exercícios, 0 rejeitados), migration `exercise_source_refs` → `specs/009-catalogo-exercicios.md`
- **1.1 Catálogo — análise das fontes** — formatos, campos, mídia e licenças das 3 fontes; regras de prioridade, dedup e rastreabilidade → `specs/009-catalogo-exercicios.md`
- **0.8 Layout base** — tema escuro oliva, navegação inferior, rotas com estado vazio (merge na `main`, PR #1) → `specs/008-layout-base.md`
- **Projeto Next.js criado** — Next.js 16 + React 19, TypeScript, Tailwind, App Router, `src/`
- **0.6 Schema + RLS** — 14 tabelas do MVP com RLS, aplicadas no Supabase (merge na `main`) → `specs/006-schema-inicial-rls.md`
- **0.5 Supabase** — clientes servidor/navegador, config pública, `.env.example` (merge na `main`) → `specs/005-supabase-clientes.md`
- **0.4 Mensagens pt-BR** — `src/messages/pt-BR.json` + `translate()` tipado (merge na `main`) → `specs/004-mensagens-i18n.md`
- **0.3 Módulos base** — config (zod), logger, errors, constants (merge na `main`) → `specs/003-modulos-base.md`
- **0.2 Configuração de testes** — Vitest 4 + Testing Library + jsdom (merge na `main`) → `specs/002-configuracao-testes.md`
- **Regras de agentes e docs** — `AGENTS.md`, `.agents/`, `CLAUDE.md`, PRD, checklist e logical-context (merge na `main`) → `specs/001-prd.md`

---

## Em Progresso

- **0.7 Autenticação** — código na `main`; Google configurado (AUTH-001 fechada); falta só a AUTH-002 (teste do cadastro por e-mail) → `specs/007-autenticacao.md`

---

## Pendências (não esquecer)

Espelho dos IDs na spec; detalhes e prioridade lá (ver `.agents/rules/pending-items.md`).

- **TRN-001** — gravar o plano atual (3×10, sem descanso) na conta do usuário → `specs/010-treino.md`
- **AUTH-002** — teste manual do cadastro por e-mail (login já testado) → `specs/007-autenticacao.md`
- **CAT-001** — vídeos do Free Exercise DB em R2 próprio (fase futura, etapa 6.5) → `specs/009-catalogo-exercicios.md`
- **CAT-003** — licença dos GIFs da Exercise Library a confirmar → `specs/009-catalogo-exercicios.md`
- **CAT-005** — traduzir nomes dos 951 exercícios só com GIF → `specs/009-catalogo-exercicios.md`
- **CAT-006** — traduzir instruções para pt-BR → `specs/009-catalogo-exercicios.md`
- **CAT-007** — revisar 65 candidatos a duplicata → `specs/009-catalogo-exercicios.md`
- **CAT-002** — forks de Workout Free Videos e Exercise Library → `specs/009-catalogo-exercicios.md`

---

## Concluído

- Nenhum item concluído ainda.

---

## Backlog (não priorizado)

### Planning

- Fase 3B promovida para `specs/012-treino-adaptativo.md`; Fase 4 e V3 → `planning/001-planejamento-inicial.md`

### Improvements

- Nenhuma melhoria registrada no momento.

### Technical Debt

- Nenhum item registrado no momento.

### Bugs

- Nenhum bug registrado no momento.

---

## Observações

- Repositório no GitHub: `ewertonrichieri/workout` (**público**); sem deploy automático configurado.
- Branch principal: `main` (renomeada de `master`).
- Ambiente: Windows 11, PowerShell, Node 20.19 e npm 8.18 (antigo). O npm 8 falha ao instalar pacotes (`edgesOut`); usar `npx -y npm@10 install ...` até atualizar o Node/npm.
- Segredos: `.env` local (ignorado pelo Git). Em sessões na nuvem, as variáveis ficam nas configurações do ambiente de nuvem do Claude Code, nunca no repositório. Nomes das variáveis em `.env.example` (etapa 0.5).
- Vitest fixado na v4 porque a v5 exige Node 22+.
- Nuvem do Claude Code: o host `tkhderkfpudcscvgnnfs.supabase.co` está liberado no ambiente `workout`; para rodar o app aqui, usar `NODE_USE_ENV_PROXY=1`.
