# 009 — Catálogo de exercícios

**Etapa:** 1.1 a 1.7 (checklist `docs/reference/001-checklist-implementacao.md`)

## Objetivo

Importar e unificar o catálogo de exercícios das fontes de mídia, com nomes em pt-BR, `source` e `license` por mídia, e tela de busca/visualização.

## Escopo

**Entra (Fase 1):**
- Parsers das três fontes abaixo, rodando como script local (`scripts/`), com saída validada por schema (1.2)
- Normalização de músculos e equipamentos para um vocabulário único, deduplicação entre fontes e tradução pt-BR (1.3)
- URLs das mídias com `source`, `license` e `priority` (1.4)
- Seed versionado gerado a partir das fontes, aplicado no banco (1.5)
- Repositório + API de busca/filtro/paginação (1.6) e tela de busca/visualização (1.7)

**Não entra:**
- Hospedagem própria das mídias (CAT-001, etapa 6.5)
- YouTube: só manual, fora da importação automática
- Campos ricos (dicas de execução, erros comuns, respiração) além de `instructions_pt`: o schema atual não tem coluna; avaliar quando a tela de treino (Fase 2) pedir

## Análise das fontes (2026-11-23)

### 1. Free Exercise DB with Videos — `harshvishu/free-exercise-db-with-videos`

- **Formato:** `data/exercises.json`, lista com 317 exercícios (também `data/by-bodypart/*.json` e `data/meta.json`)
- **Campos:** `id` (ex. `"0489"`), `name`, `aliases[]`, `bodyPart`, `target`, `secondaryMuscles[]`, `equipment` (texto único), `muscleGroup`, `difficulty` (`beginner|intermediate|advanced`), `compound`, `unilateral`, `shortDescription`, `instructions`, `steps[]`, `formCues[]`, `commonMistakes[]`, `breathing`, `videos{male,female}`, `thumbnails{male,female}`
- **Mídia:** MP4 1080p no R2 do autor (`pub-585d42eb1aa64a67aedf483ec328d3fe.r2.dev/exercise-videos/{male|female}/<slug>.mp4`) + JPG de capa. 276 exercícios com os dois vídeos, 27 só feminino, 14 só masculino (593 vídeos)
- **Vocabulário:** 10 `bodyPart`, 13 equipamentos, 39 `target` e ~75 secundários **sem padronização** (ex.: `delts`/`deltoids`, `abs`/`abdominals`/`rectus abdominis`, `quads`/`quadriceps`, `rhoboids` com erro de digitação, valores vagos como `varies by machine`)
- **Licença:** `LICENSE` MIT cobre o repositório; os vídeos são "redistribuídos com os direitos do mantenedor", **sem licença explícita** → registrar `license = 'unverified'` até a 6.1
- **Observação:** tamanho dos vídeos não medido (host bloqueado na rede desta sessão)

### 2. Workout Free Videos — `namnq/workout-free-videos` (tag `v2.0.0`)

- **Formato:** `data/exercises.json` (57), `data/muscles.json` (22), `data/equipment.json` (13), `exercises.csv`
- **Campos:** `id` (ex. `"c01"`), `slug`, `name`, `primaryMuscle`, `secondaryMuscles[]`, `region`, `equipment[]`, `level`, `type`, `jointStress[]`, `gear[]`, `cues[]`, `translations{de,es,fr,it,ja}` (**sem pt**), `video{path,bytes,sha256,width,height,durationSec}`
- **Mídia:** 57 MP4 720p em loop de 4–8 s, sem áudio, ~28 MB no total, no próprio repositório, com SHA-256
- **Vocabulário:** já padronizado (chaves como `chest`, `upperBack`, `pullupBar`)
- **Licença:** CC0 1.0 (domínio público) — sem risco
- **jsDelivr:** o próprio README recomenda `https://cdn.jsdelivr.net/gh/<owner>/workout-free-videos@v2.0.0/media/video/<slug>.mp4`; usaremos o fork, fixando a tag

### 3. Exercise Library — `mohamedatef90/exercise-library`

- **Formato:** `exercises.json`, lista com 1.112 exercícios; `gifs/<id>.gif` (1.112 GIFs, ~94 KB cada, ~106 MB no total)
- **Campos:** `id` (ex. `"2gPfomN"`), `name`, `gif`, `targetMuscles[]`, `secondaryMuscles[]`, `bodyParts[]`, `equipment[]` (26 valores), `instructions[]` (prefixo `"Step:N "`)
- **Licença:** ⚠️ o README declara MIT, mas **não há arquivo LICENSE** no repositório e os créditos dizem que os dados vêm do **ExerciseDB (RapidAPI)**, um serviço comercial cujas animações têm direitos próprios. A licença MIT declarada provavelmente **não cobre os GIFs** → registrar `license = 'unverified'` (CAT-003)

### Sobreposição

- Free Exercise DB × Workout Free Videos: só 7 nomes idênticos; a deduplicação real (1.3) precisa de match normalizado (nome sem acento/plural, aliases, equipamento)
- Exercise Library usa o mesmo vocabulário de `bodyPart`/equipamento do ExerciseDB que o Free Exercise DB, o que facilita o mapeamento

## Regras

- Prioridade de mídia (menor = primeiro): vídeo Workout Free Videos (CC0) `10` → vídeo Free Exercise DB `20` → GIF Exercise Library `30` → YouTube `40`
- Free Exercise DB: importar **um** vídeo por exercício (masculino; feminino quando só ele existir) para não duplicar a mídia
- `license` de cada mídia: `CC0-1.0`, `unverified` (Free Exercise DB vídeos e Exercise Library GIFs); mídias `unverified` ficam `is_enabled = true` só no uso pessoal e devem ser revistas na 6.1
- Dedup (falso positivo é pior que falso negativo): só unir exercícios quando nome normalizado **e** equipamento baterem; casos duvidosos vão para revisão manual em arquivo versionado
- Rastreabilidade: guardar o identificador de origem (`source` + `external_id`) de cada exercício importado para reimportar sem duplicar → **nova tabela `exercise_source_refs`** (migration na 1.2)
- Traduções pt-BR de músculos, equipamentos e nomes: arquivo curado e versionado no repositório; o que faltar fica `TODO: popular`, nunca inventado
- Scripts de importação rodam só localmente/CI com credencial administrativa; nada disso vai ao cliente

## Parsers (1.2)

- Código: `src/lib/catalog/` — `source-exercise.ts` (schema comum `SourceExercise`), `catalog-sources.ts` (ids das fontes) e `parsers/` (um parser por fonte + `parse-source-items.ts`)
- Cada item é validado pelo schema da fonte **e** pelo schema comum; item inválido ou com id repetido vai para `rejected` (com índice e motivo) sem derrubar a fonte; arquivo que não é lista → `CatalogSourceFormatError`
- Mídia: `location = 'url'` (Free Exercise DB, com `variant` male/female e `thumbnailUrl`) ou `location = 'repository_path'` (Workout Free Videos e Exercise Library; vira URL do jsDelivr na 1.4). Caminhos com `..` são rejeitados
- Free Exercise DB: as duas variantes de vídeo são mantidas no arquivo parseado; a escolha de **um** vídeo por exercício acontece na 1.4
- Script: `npm run catalog:parse -- --free-exercise-db <dir> --workout-free-videos <dir> --exercise-library <dir>` → grava `seed-data/catalog/sources/<source>.json` (versionado, ordenado por `externalId`)
- Migration `20261124000000_exercise_source_refs.sql`: tabela `exercise_source_refs (exercise_id, source, external_id)`, PK `(source, external_id)`, RLS só leitura para autenticados

Resultado sobre os dados reais (2026-11-23):

| Fonte | Commit lido | Exercícios | Rejeitados |
|---|---|---|---|
| free-exercise-db-with-videos | `8df685f` | 317 | 0 |
| workout-free-videos | `346c970` (tag `v2.0.0`) | 57 | 0 |
| exercise-library | `a63d9e0` | 1.112 | 0 |

## Normalização, deduplicação e tradução (1.3)

- Código: `src/lib/catalog/normalization/` — `text-normalization.ts`, `vocabulary.ts`, `normalize-source-exercise.ts`, `deduplicate-exercises.ts`, `build-catalog.ts`; schema de saída em `src/lib/catalog/catalog-exercise.ts`
- Script: `npm run catalog:build` (lê `seed-data/catalog/`, grava `catalog.json` e os arquivos de `review/`); falha se houver termo sem mapeamento ou tradução para slug inexistente
- Teste `src/test/catalog-seed-data.test.ts` roda a montagem sobre os arquivos versionados e compara com o `catalog.json` commitado

**Arquivos curados (versionados):**

| Arquivo | Conteúdo |
|---|---|
| `vocabulary/muscles.json` | 30 músculos canônicos (slug + nome pt-BR) cobrindo os ~110 termos brutos das fontes; termos vagos (`back`, `varies by …`) explicitamente ignorados |
| `vocabulary/equipment.json` | 30 equipamentos canônicos cobrindo os ~45 termos brutos |
| `curation/duplicate-decisions.json` | 36 fusões decididas na revisão (com motivo) |
| `translations/exercise-names.pt-BR.json` | Nome pt-BR por slug (347 exercícios com vídeo) |

**Regras aplicadas:**

- Termo bruto: camelCase separado, minúsculas, sem acento e pontuação; termo desconhecido nunca é adivinhado (o build falha)
- Chave de nome: mesma normalização + singular simples (`-s`, `-es`), `°` → `degree`; qualificadores só de mídia (`(male)`, `(female)`, `(side pov)`, `(back pov)`) são ignorados e removidos do nome exibido
- Fusão automática **somente** com mesma chave de nome **e** mesmo equipamento (o banco é acessório e não conta na comparação); vale também dentro da mesma fonte (ângulos de câmera, entradas repetidas)
- Quase-iguais viram candidatos de revisão e ficam separados: mesmo nome com equipamento diferente, ou alias do Free Exercise DB igual ao nome de outro exercício
- Registro principal do grupo pela prioridade de fonte: Workout Free Videos → Free Exercise DB → Exercise Library (nome, dificuldade, instruções, músculos); equipamentos e mídias são unidos
- Slug: nome em kebab-case; em colisão, acrescenta o equipamento; depois a origem
- Nome pt-BR: só do arquivo curado; sem tradução → `namePt = null` (nunca tradução automática não revisada)
- Correção de texto quebrado na Exercise Library (`45Ð²Â°` → `45°`) no parser

**Resultado (2026-11-24):** 1.486 registros → **1.298 exercícios** (188 registros unidos a outros), 65 candidatos em revisão, 347 com nome pt-BR (todos os que têm vídeo), 951 sem tradução (só GIF).

## URLs das mídias (1.4)

- Código: `src/lib/catalog/media/` — `media-hosting.ts` (schema da configuração) e `resolve-exercise-media.ts`
- Configuração curada: `seed-data/catalog/media-hosting.json` — licença, prioridade base e repositório (fork + commit fixo) por fonte; CDN `https://cdn.jsdelivr.net/gh`
- URL de mídia do repositório: `{cdn}/{fork}@{commit}/{caminho}` (ex.: `https://cdn.jsdelivr.net/gh/ewertonrichieri/workout-free-videos@346c970…/media/video/barbell-back-squat.mp4`); commit fixo para o arquivo nunca mudar por baixo do app
- Free Exercise DB: URL de origem (R2 do autor) e **um** vídeo por exercício (masculino; feminino se for o único), com a capa como `thumbnail_url`
- Exercise Library: todos os GIFs do exercício (ângulos diferentes), prioridade 30, 31…
- Licenças: `CC0-1.0` (Workout Free Videos), `unverified` (Free Exercise DB e Exercise Library — ver 6.1, CAT-003)
- Ordem final por prioridade: vídeo CC0 (10) → vídeo Free Exercise DB (20) → GIFs (30+)
- Teste sobre os dados reais garante ao menos uma URL `https` por exercício
- ⚠️ As URLs do jsDelivr só funcionam depois dos forks (CAT-002)

## Seed do catálogo (1.5)

- Código: `src/lib/catalog/seed/build-catalog-seed-sql.ts`; script `npm run catalog:seed` gera `supabase/seed.sql` a partir de `seed-data/catalog/` (não editar à mão)
- Idempotente, em uma transação: `muscles`, `equipment` e `exercises` com `on conflict (slug) do update`; `exercise_muscles`, `exercise_equipment`, `exercise_media` e `exercise_source_refs` apagadas e regravadas (chaves estrangeiras buscadas por slug)
- Exercício que sair do catálogo **não** é apagado (pode estar em um plano)
- `name_pt`: nome curado; sem tradução, usa o nome em inglês (CAT-005). `instructions_pt`: `null` até a tradução (CAT-006)
- Teste garante que o `supabase/seed.sql` commitado é igual ao gerado
- Validação manual (2026-11-24) em Postgres 16 local: migrations + seed aplicados duas vezes sem erro → 1.298 exercícios, 1.482 mídias, 3.787 músculos, 1.311 equipamentos, 1.486 referências de origem, 0 exercício sem mídia
- **Aplicado no Supabase** em 2026-11-24 pela API de gerenciamento (token pessoal guardado como segredo de rede do ambiente `workout`): migrations registradas em `supabase_migrations.schema_migrations`; conferido 1.298 exercícios, 1.482 mídias, 0 sem mídia. Para reaplicar: `npx supabase db push --include-seed`

## Repositório e API (1.6)

- Busca no banco: função `public.search_exercises(search_text, muscle_slug, equipment_slug, page_limit, page_offset)` (migration `20261124010000_search_exercises.sql`): sem diferenciar acento/maiúscula (`unaccent`), busca em `name_pt` e `name_en`, filtros por músculo e equipamento, **só exercícios com mídia ativa**, ordem por nome, total via `count(*) over ()`; `security invoker` (RLS vale) e execução só para `authenticated`; `%` e `_` digitados são tratados como texto
- Código: `src/lib/catalog/exercises/` — `exercise-search-schema.ts` (entrada), `exercise-row-mapping.ts` (validação das linhas do banco), `exercise-repository.ts` (Supabase), `exercise-catalog-service.ts` (regras), `server-exercise-catalog.ts` (composition root); `src/lib/http/api-handler.ts` (envelope JSON padrão + log)
- Limites em `src/lib/constants/catalog.ts`: página padrão 20, máximo 50, busca até 80 caracteres

| Rota | Parâmetros | Resposta (`data`) |
|---|---|---|
| `GET /api/exercises` | `q`, `muscle` (slug), `equipment` (slug), `page`, `pageSize` | `{ items, page, pageSize, total, totalPages }` |
| `GET /api/exercises/:slug` | — | exercício com músculos (primários/secundários), equipamentos e mídias ativas por prioridade |
| `GET /api/exercise-filters` | — | `{ muscles, equipment }` com nomes pt-BR |

- Erros: parâmetro inválido → 400; slug inexistente ou malformado → 404 ("Exercício não encontrado."); sem sessão → 401 (proxy central); falha do banco → 500 sem detalhes internos, com log de rota e operação
- Validação manual (2026-11-24): função testada no Postgres local com o seed (`elevacao lateral` → 6; `supino` + peito + halteres → 7; `100%` → 0); `next build` ok; com `next start`, API sem sessão → 401 e página → redirect para login

## Tela de busca e visualização (1.7)

- Rotas (dentro do layout com navegação): `/exercises` (lista) e `/exercises/[slug]` (detalhe); entrada pelo link "Ver catálogo de exercícios" na tela de Treino
- Lista: formulário GET (busca, músculo, equipamento — funciona sem JavaScript e mantém os filtros na URL), contador de resultados, cards com miniatura (capa do vídeo ou GIF; ícone quando não há imagem), paginação "Anterior/Próxima" mantendo os filtros
- Detalhe: nome pt-BR (e o inglês, quando diferente), dificuldade, mídia principal (vídeo com controles ou GIF) com crédito de fonte e licença, músculos principais/auxiliares, equipamentos; instruções exibem aviso honesto até a tradução (CAT-006)
- Estados: carregamento (esqueleto via `Suspense`), vazio, filtros inválidos, exercício inexistente (404) e erro de carregamento com "Tentar novamente" (`error.tsx`, prop `retry` do Next 16)
- Dados lidos no servidor pelo serviço do catálogo (o cliente não acessa o banco); componentes de apresentação em `src/components/exercises/`
- Navegação inferior: com `cacheComponents`, rotas com parâmetro dinâmico só conhecem o caminho na requisição; a barra agora tem fallback em `Suspense` (links sem destaque até resolver)
- Acessibilidade: rótulos em todos os campos, `role="search"`, foco visível, alvos ≥ 44px, paginação com `aria-label`, mídia com rótulo "Demonstração de …"
- Fallback entre mídias (vídeo → GIF → YouTube): entregue na etapa 2.3 (`specs/010-treino.md`, "Player de mídia")

## Checklist de aceite

- [x] 1.1 — Fontes analisadas (formato, campos, mídia, licença) e decisões registradas nesta spec
- [x] 1.2 — Parsers das três fontes com schema e testes
- [x] 1.3 — Normalização, dedup e tradução (limitações: CAT-005, CAT-006, CAT-007)
- [x] 1.4 — URLs das mídias com `source`/`license`/`priority` (depende de CAT-002 para as URLs do jsDelivr)
- [x] 1.5 — Seed versionado gerado, validado e aplicado no Supabase
- [x] 1.6 — Repositório + API
- [x] 1.7 — Tela de busca/visualização (mídias do jsDelivr dependem de CAT-002)

## Decisões

### Hospedagem das mídias (2026-11-23)

O plano gratuito do Supabase (~1 GB de storage) não comporta os vídeos. No MVP **não** usamos Supabase Storage nem R2 próprio:

| Fonte | Onde está a mídia | Como servimos no MVP |
|---|---|---|
| Free Exercise DB with Videos (`harshvishu/free-exercise-db-with-videos`) | R2 do autor (fora do repositório) | URL direta do R2 do autor; sem fork (metadados ficam no nosso seed versionado) |
| Workout Free Videos (`namnq/workout-free-videos`) | No repositório (~32 MB) | Fork + jsDelivr |
| Exercise Library (`mohamedatef90/exercise-library`) | No repositório (~97 MB) | Fork + jsDelivr |

O banco guarda apenas a `url` em `exercise_media`; trocar a hospedagem depois é só reapontar URLs.

## Pendências

| ID | Descrição | Onde | Prioridade |
|---|---|---|---|
| CAT-001 | Copiar vídeos do Free Exercise DB para um Cloudflare R2 próprio (hoje dependemos do R2 do autor) e reapontar as URLs — fase futura (etapa 6.5) | `exercise_media.url` | Média (antes da abertura) |
| CAT-003 | Licença dos GIFs da Exercise Library: README diz MIT, mas não há LICENSE e a origem é o ExerciseDB (comercial). Confirmar ou desligar a fonte antes da abertura (6.1) | `exercise_media.license` | Alta (antes da abertura) |
| CAT-005 | Traduzir os nomes dos 951 exercícios só com GIF (Exercise Library), listados em `seed-data/catalog/review/untranslated-names.json`; até lá a tela usa o nome em inglês | `seed-data/catalog/translations/exercise-names.pt-BR.json` | Média |
| CAT-006 | Traduzir as instruções para pt-BR (`instructions_pt`); hoje só existem em inglês (`instructionStepsEn` no `catalog.json`) | `seed-data/catalog/` | Média (antes da tela de treino, Fase 2) |
| CAT-007 | Revisar os 65 candidatos a duplicata em `seed-data/catalog/review/duplicate-candidates.json` (hoje mantidos separados) | `seed-data/catalog/curation/duplicate-decisions.json` | Baixa |
| CAT-002 | Fork de Workout Free Videos e Exercise Library na conta do usuário (seguro contra remoção da mídia) | GitHub | Alta (antes da 1.2) |

## Bugs (histórico)

Somente registro informativo de correções já feitas. Não é backlog.

### 2026-11-25 — Miniatura quebrada quando o GIF não carrega

- **Sintoma:** no card do treino, a miniatura da Prancha frontal aparecia como imagem quebrada
- **Causa:** a URL do GIF no jsDelivr depende dos forks (CAT-002) e responde 404; `ExerciseCover` não tinha fallback
- **Correção:** `ExerciseCover` (cliente) troca para o ícone quando a imagem falha

