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

## Checklist de aceite

- [x] 1.1 — Fontes analisadas (formato, campos, mídia, licença) e decisões registradas nesta spec
- [x] 1.2 — Parsers das três fontes com schema e testes
- [x] 1.3 — Normalização, dedup e tradução (limitações: CAT-005, CAT-006, CAT-007)
- [ ] 1.4 — URLs das mídias com `source`/`license`/`priority`
- [ ] 1.5 — Seed versionado aplicado
- [ ] 1.6 — Repositório + API
- [ ] 1.7 — Tela de busca/visualização

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
| CAT-004 | Aplicar a migration `20261124000000_exercise_source_refs.sql` no Supabase (sem credencial do banco nesta sessão): `npx supabase db push` | `supabase/migrations/` | Alta (antes da 1.5) |
| CAT-005 | Traduzir os nomes dos 951 exercícios só com GIF (Exercise Library), listados em `seed-data/catalog/review/untranslated-names.json`; até lá a tela usa o nome em inglês | `seed-data/catalog/translations/exercise-names.pt-BR.json` | Média |
| CAT-006 | Traduzir as instruções para pt-BR (`instructions_pt`); hoje só existem em inglês (`instructionStepsEn` no `catalog.json`) | `seed-data/catalog/` | Média (antes da tela de treino, Fase 2) |
| CAT-007 | Revisar os 65 candidatos a duplicata em `seed-data/catalog/review/duplicate-candidates.json` (hoje mantidos separados) | `seed-data/catalog/curation/duplicate-decisions.json` | Baixa |
| CAT-002 | Fork de Workout Free Videos e Exercise Library na conta do usuário (seguro contra remoção da mídia) | GitHub | Alta (antes da 1.2) |
