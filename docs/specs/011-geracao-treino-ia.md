# 011 — Geração de treino por IA

**Etapas:** 3.1 a 3.8 (checklist `docs/reference/001-checklist-implementacao.md`). Esta spec detalha a **3.1**; as demais etapas entram como **Atualizações** quando forem iniciadas.

## Objetivo

A IA atua como personal trainer: a partir de uma anamnese, monta um plano usando **somente** exercícios do catálogo com mídia, que o usuário revisa, executa e renova ao fim da validade (PRD, item 4).

## Escopo da 3.1 — Anamnese

**Entra:**
- Formulário `/assessment`: objetivo, nível, dias por semana, tempo por treino, preferência de divisão, equipamentos disponíveis, lesões/limitações
- Schema de validação (zod) compartilhado entre cliente (erros por campo) e servidor (revalidação)
- `POST /api/assessments`: grava a anamnese e os equipamentos numa transação
- Leitura da anamnese mais recente para preencher o formulário de novo
- Entrada pela tela Início e pelo Perfil

**Não entra:**
- Aviso de saúde (3.7)
- Geração do plano pela IA (3.3): salvar a anamnese só grava os dados
- Fotos de equipamentos (V2)

## Modelo

| Tabela | Uso |
|---|---|
| `assessments` | `goal`, `experience_level`, `days_per_week`, `session_minutes`, `split_preference` (nova na 3.1), `limitations`, `created_at` |
| `assessment_equipment` | Equipamentos escolhidos (FK para `equipment` do catálogo) |

- Cada envio cria uma **nova** anamnese; as antigas ficam como histórico (renovação do plano usa o histórico). A "atual" é a mais recente (`created_at`).
- RLS por dono (spec 006); `authenticated` recebe `select, insert` nas duas tabelas.
- Gravação pela função `save_assessment` (`security invoker`, RLS vale dentro dela): insere a anamnese com `auth.uid()` e os equipamentos por `slug`; slug inexistente aborta a transação.

## Glossário

| PRD (pt-BR) | Código |
|---|---|
| Anamnese | `assessment` |
| Objetivo: hipertrofia / emagrecimento / força / condicionamento | `goal`: `hypertrophy` / `weight_loss` / `strength` / `conditioning` |
| Nível: iniciante / intermediário / avançado | `experience_level`: `beginner` / `intermediate` / `advanced` |
| Divisão: deixar a IA decidir / full body / dividido (A/B/C…) | `split_preference`: `ai_decides` / `full_body` / `split` |

## Regras

- **Dias por semana:** inteiro de 1 a 7
- **Tempo por treino:** inteiro de 10 a 240 minutos (`MIN_SESSION_MINUTES`, `MAX_SESSION_MINUTES`)
- **Valores iniciais** (sem anamnese anterior): 3 dias, 60 minutos, "deixar a IA decidir"; objetivo, nível e equipamentos começam sem resposta (o usuário precisa escolher)
- **Divisão:** padrão "deixar a IA decidir"; a escolha é usada na geração (3.3)
- **Equipamentos:** ao menos um, sem repetição, todos do catálogo (revalidados no servidor; desconhecido → 422). "Peso corporal" é a opção para quem não tem equipamento
- **Limitações:** texto opcional, até 1.000 caracteres; espaços nas pontas são removidos; vazio vira `null`. Nunca vai para os logs
- **Falha ao salvar:** mensagem em pt-BR e o formulário mantém o que foi digitado
- O `user_id` vem só da sessão

## Implementação (3.1)

- `supabase/migrations/20261126000000_assessments.sql` — coluna `split_preference`, função `save_assessment`, permissões
- `src/lib/constants/assessment.ts` — valores de domínio e limites
- `src/lib/assessment/` — `assessment-schema.ts`, `assessment-repository.ts`, `assessment-service.ts`, `server-assessment-service.ts`
- `src/app/api/assessments/route.ts` — `POST` (handler fino)
- `src/app/(app)/assessment/` — página (Server Component) + `error.tsx`; formulário em `src/components/assessment/` (valida no aparelho com o mesmo schema e só então envia)
- Equipamentos do formulário vêm de `listEquipment` do repositório do catálogo (injetado no serviço como `EquipmentSource`)
- Validação local da migration: Postgres 16 com stub de `auth` — gravação, rollback com equipamento desconhecido/lista vazia e isolamento por RLS conferidos

## Checklist de aceite (3.1)

- [x] Migration com `split_preference` e gravação atômica
- [x] Schema com testes (válidos e inválidos)
- [x] Serviço e repositório com testes (equipamento desconhecido, falha do banco)
- [x] API `POST /api/assessments` (201, 400, 401, 422)
- [x] Formulário com erros por campo, carregamento, erro e sucesso; preenchido com a anamnese mais recente
- [x] Acessível (rótulos, `fieldset`/`legend`, foco visível, toque ≥ 44px)
- [ ] Migration aplicada no Supabase (ver ASM-001)

## Pendências

| ID | Descrição | Onde | Prioridade |
|---|---|---|---|
| ASM-001 | Aplicar a migration `20261126000000_assessments.sql` no Supabase e testar o envio no navegador | `supabase/migrations/` | Alta (antes da 3.3) |

## Fim da spec
