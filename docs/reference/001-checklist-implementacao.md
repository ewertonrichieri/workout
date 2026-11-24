# 001 — Checklist de implementação

Ordem obrigatória das fases e etapas. Uma fase só começa com a anterior funcionando e testada. Fonte: `docs/specs/001-prd.md`.

Cada etapa segue **spec → teste que falha → implementação → refatoração** (SDD + TDD).

## Legenda de esforço

Nível de esforço a selecionar no modelo (Opus 5.5) antes de executar a etapa:

| Esforço | Quando |
|---|---|
| `low` | Configuração simples, texto, ajustes pontuais |
| `medium` | Funcionalidade padrão com poucas decisões |
| `high` | Várias peças integradas, regras de negócio, segurança |
| `xhigh` | Algoritmo ou integração com IA difícil de acertar |
| `max` | Reservado; nenhuma etapa planejada usa |

---

## V1 — MVP

### Fase 0 — Fundação

| # | Etapa | Esforço | Status |
|---|---|---|---|
| 0.1 | Criar projeto Next.js 16 (TypeScript, Tailwind, App Router, `src/`) | `low` | [x] |
| 0.2 | Configurar testes (Vitest + Testing Library) e documentar comandos | `low` | [x] |
| 0.3 | Módulos base: config com env validado, logger, errors, constants | `medium` | [x] |
| 0.4 | Mensagens pt-BR (`messages/pt-BR.json`) + helper de i18n | `low` | [x] |
| 0.5 | Supabase: projeto, clientes servidor/navegador, `.env.example` | `medium` | [x] |
| 0.6 | Migrations do schema inicial + RLS | `high` | [x] |
| 0.7 | Autenticação Supabase: botão Google (OAuth) + e-mail/senha, proteção central de rotas (páginas → login, API → 401) — código pronto; aguarda AUTH-001/AUTH-002 | `high` | [ ] |
| 0.8 | Layout base com navegação Início / Treino / Agenda / Perfil | `medium` | [x] |

### Fase 1 — Catálogo de exercícios

| # | Etapa | Esforço | Status |
|---|---|---|---|
| 1.1 | Spec do catálogo + análise das fontes (formatos, licenças, campos) | `medium` | [x] |
| 1.2 | Parsers de cada fonte (Free Exercise DB with Videos, Workout Free Videos, Exercise Library) | `high` | [x] |
| 1.3 | Normalização, deduplicação e tradução pt-BR de exercícios, equipamentos e músculos (pendências CAT-005/006/007) | `xhigh` | [x] |
| 1.4 | Mapear URLs das mídias (fork + jsDelivr / origem), com `source` e `license` | `medium` | [ ] |
| 1.5 | Seed versionado do catálogo no banco | `medium` | [ ] |
| 1.6 | Repositório + API de exercícios (busca, filtros, paginação) | `medium` | [ ] |
| 1.7 | Tela de busca/visualização de exercícios | `medium` | [ ] |

### Fase 2 — Treino

| # | Etapa | Esforço | Status |
|---|---|---|---|
| 2.1 | Spec do treino + repositórios de plano, treino e exercícios do treino | `medium` | [ ] |
| 2.2 | Tela de treino: abas A/B/C, validade, barra de progresso, cards por categoria | `high` | [ ] |
| 2.3 | Player de mídia com fallback (vídeo → GIF → YouTube) | `medium` | [ ] |
| 2.4 | Registro de séries, repetições e carga + check de concluído | `high` | [ ] |
| 2.5 | Timer de descanso | `low` | [ ] |
| 2.6 | "Finalizar treino": salvar sessão e cargas em transação | `medium` | [ ] |
| 2.7 | "Salvar carga para progredir" (carga sugerida na próxima sessão) | `medium` | [ ] |
| 2.8 | Histórico e gráfico de progressão por exercício | `medium` | [ ] |

### Fase 3 — Geração de treino por IA

| # | Etapa | Esforço | Status |
|---|---|---|---|
| 3.1 | Anamnese: formulário + schema + gravação | `medium` | [ ] |
| 3.2 | Wrapper da Claude API (servidor, retry, timeout, validação da saída) | `high` | [ ] |
| 3.3 | Geração do plano: prompt + catálogo filtrado + só exercícios com mídia | `xhigh` | [ ] |
| 3.4 | Revisão e edição manual do plano | `high` | [ ] |
| 3.5 | Sugestão de progressão de carga pelo histórico | `medium` | [ ] |
| 3.6 | Sugestão de renovação ao fim da validade (6 semanas) | `medium` | [ ] |
| 3.7 | Aviso de saúde na anamnese e no plano | `low` | [ ] |
| 3.8 | PWA instalável (manifest, ícones) | `low` | [ ] |

---

## V2 — Diferencial (fora do MVP; detalhar em spec ao iniciar)

| # | Etapa | Esforço | Status |
|---|---|---|---|
| 3B.1 | Check-in pré-treino (sono, dor, tempo, energia) | `medium` | [ ] |
| 3B.2 | Ajuste do treino do dia pela IA | `xhigh` | [ ] |
| 3B.3 | Percepção de esforço por série + autorregulação de carga | `high` | [ ] |
| 3B.4 | Substituição na hora (exercício equivalente) | `high` | [ ] |
| 4.1 | Envio de fotos + identificação de equipamentos pela IA | `high` | [ ] |
| 4.2 | Revisão da lista de equipamentos + perfis prontos | `medium` | [ ] |
| 4.3 | Filtro de exercícios por equipamento na geração | `medium` | [ ] |

## V3 — Avançado (fora do MVP; detalhar em spec ao iniciar)

| # | Etapa | Esforço | Status |
|---|---|---|---|
| 5.1 | Câmera + MediaPipe Pose + guia de posicionamento | `high` | [ ] |
| 5.2 | Métricas por repetição (ângulos, amplitude, ritmo) — começar pelo agachamento | `xhigh` | [ ] |
| 5.3 | Alertas falados ao vivo + contagem de repetições | `high` | [ ] |
| 5.4 | Análise pós-série pela IA + replay com erros marcados | `high` | [ ] |
| 5.5 | Histórico de técnica + regras para mais exercícios | `medium` | [ ] |
| 5B.1 | Previsão de evolução e detecção de estagnação | `high` | [ ] |

## Abertura para outros usuários

| # | Etapa | Esforço | Status |
|---|---|---|---|
| 6.1 | Confirmar licença dos vídeos (ou desligar a fonte) | `low` | [ ] |
| 6.2 | Limites de uso de IA por usuário | `medium` | [ ] |
| 6.3 | Modo personal (profissional revisa treinos) | `high` | [ ] |
| 6.4 | Termos de uso e política de privacidade (LGPD) | `medium` | [ ] |
| 6.5 | Copiar vídeos do Free Exercise DB para R2 próprio e reapontar URLs (CAT-001) | `medium` | [ ] |
