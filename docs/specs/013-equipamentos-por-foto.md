# 013 — Equipamentos da academia por foto (Fase 4, V2)

**Etapas:** 4.0 a 4.4 (checklist `docs/reference/001-checklist-implementacao.md`). Promovida de `docs/planning/001-planejamento-inicial.md` (Fase 4).

**Status:** aprovada. Decisões D1 a D8 confirmadas pelo usuário em 2026-11-25 (D2 com compressão pedida por ele).

**Pré-requisito:** Fase 3B concluída (2026-11-24).

## Objetivo

Hoje o usuário marca à mão, na anamnese, os equipamentos que tem (30 do vocabulário curado). A Fase 4 deixa isso mais rápido e mais certo:
1. **Fotos dos aparelhos:** a IA identifica os equipamentos, só entre os do vocabulário
2. **Revisão:** o usuário confirma ou edita a lista antes de usar
3. **Perfis prontos** para quem não quer enviar foto
4. A lista confirmada é a mesma que a geração do plano e a troca na hora já usam

## Escopo

**Entra:**
- 4.1: envio de fotos na anamnese + identificação pela IA (`POST /api/equipment-detections`)
- 4.2: tela de revisão do resultado e perfis prontos
- 4.3: a lista confirmada alimenta a anamnese (e com ela a geração e a troca)
- 4.4: teste de ponta a ponta no navegador

**Não entra:**
- Guardar as fotos (são descartadas depois da análise)
- Várias academias por usuário (uma lista por anamnese, como hoje)
- Identificar marca, modelo ou carga dos aparelhos
- Câmera ao vivo ou vídeo (só foto da galeria ou da câmera do aparelho via `<input type="file">`)
- Criar equipamentos fora do vocabulário

## Glossário

| PRD (pt-BR) | Código |
|---|---|
| Identificação de equipamentos por foto | `equipment_detection` |
| Perfil pronto | `equipment_preset` |
| Academia completa / básica / casa com halteres / peso corporal | `full_gym` / `basic_gym` / `home_dumbbells` / `bodyweight_only` |
| Certeza da IA: alta / média / baixa | `confidence`: `high` / `medium` / `low` |

## Fluxo

1. Na anamnese, na seção de equipamentos, dois botões novos: **"Identificar por foto"** e **"Usar um perfil pronto"**. A lista de caixas de seleção continua igual.
2. **Foto:** o usuário escolhe de 1 a N fotos (D1). O navegador reduz cada uma (D2) e envia ao servidor. O servidor valida tipo e tamanho, manda à IA e devolve os equipamentos com a certeza e a foto em que apareceu.
3. **Revisão:** "Encontramos estes equipamentos". Itens de certeza alta e média vêm marcados; os de baixa vêm desmarcados com "Talvez" (D4). O usuário marca/desmarca e toca em **"Usar esta lista"**: a seleção substitui as caixas da anamnese (com **desfazer**). Nada é gravado até salvar a anamnese, como hoje.
4. **Perfil pronto:** escolher um perfil marca as caixas daquele perfil (D5), com desfazer.
5. Salvar a anamnese grava a lista como hoje (`assessment_equipment`). A geração (3.3) e a troca na hora (3B.4) já filtram por ela: a 4.3 é conferir isso e cobrir com testes.

## Regras

- **Falso positivo é pior que falso negativo** (AGENTS.md, importações): na dúvida a IA não marca; "baixa" vem desmarcado
- A IA só pode responder slugs do vocabulário; qualquer outro é descartado e registrado no log (sem conteúdo)
- `bodyweight` sempre fica disponível e não precisa aparecer na foto
- As fotos nunca são gravadas (nem no banco, nem em disco, nem no log); só passam pela memória do servidor durante a chamada
- Enviar à IA só as imagens, sem nome do usuário, sem metadados (o navegador recodifica a imagem, o que remove EXIF/GPS)
- A foto que não mostra equipamento de academia não é erro: volta lista vazia com a mensagem "Não encontramos equipamentos nessas fotos"
- Cada análise conta no limite de uso de IA por usuário (D6), HTTP 429 em português
- Falha ou tempo esgotado da IA: mensagem em português e a lista que o usuário já marcou fica intacta
- Navegador sem envio de arquivo: o botão some e a seleção manual continua

## Modelo de dados

Nenhuma tabela nova (as fotos não são guardadas e o resultado só vira lista ao salvar a anamnese). Muda só a migration do limite: `ai_requests.operation` passa a aceitar `equipment.detect`.

## API

`POST /api/equipment-detections` (sessão obrigatória → 401 sem ela), `multipart/form-data` com `photos[]`.

- 400: nenhuma foto, mais de D1, tipo fora de JPEG/PNG/WebP (conferido pela assinatura do arquivo, não pelo tipo declarado), fotos acima de 4 MB juntas (ver Atualizações)
- 429: limite de análises
- 502: IA indisponível ou resposta fora do schema
- 200: `{ success: true, data: { equipment: [{ slug, name, confidence, photoNumbers }] } }` (`photoNumbers` a partir de 1, como "Foto 1")

## Integração com a IA

- Mesmo wrapper da 3.2 (`StructuredOutputClient`), estendido para aceitar imagens (blocos `image` base64) além do texto
- Saída estruturada validada por zod: `{ equipment: [{ slug, confidence, photoNumbers }] }`
- Prompt de sistema com o vocabulário (slug + nome pt-BR + aliases) e a regra "na dúvida, não marque"
- Modelo e esforço: D7; chamada real medida na 4.1 (tempo e custo), como na PLN-001

## Decisões para o usuário

| # | Decisão | Proposta |
|---|---|---|
| D1 | Quantas fotos por análise | Até **5** |
| D2 | Tamanho das fotos | O navegador reduz para no máximo **1.568 px** no lado maior e **comprime** a imagem (como o TinyPNG faz: perde um pouco de qualidade, fica bem mais leve), recodificando em **WebP qualidade 0,7** (JPEG 0,7 onde o navegador não gera WebP); o servidor recusa acima de **5 MB** cada |
| D3 | Onde fica o recurso | Só na **anamnese** (seção de equipamentos); sem tela nova separada |
| D4 | Itens de certeza baixa | Aparecem **desmarcados** com "Talvez"; alta e média vêm marcados |
| D5 | Equipamentos de cada perfil pronto | **Academia completa:** todos os 30, exceto `tire`, `sledgehammer`, `massage-ball`. **Academia básica:** `barbell`, `dumbbell`, `weight-plate`, `bench`, `cable`, `machine`, `pull-up-bar`, `bodyweight`. **Casa com halteres:** `dumbbell`, `bench`, `band`, `bodyweight`. **Peso corporal:** `bodyweight`, `pull-up-bar` |
| D6 | Limite de análises | **5 em 24 horas** por usuário |
| D7 | Modelo da análise | `claude-haiku-5-5` (o padrão do app), esforço `low`; reavaliar com a chamada real |
| D8 | Lista vazia depois da revisão | Não pode: "Usar esta lista" fica desabilitado sem nenhum item (o `bodyweight` conta) |

## Checklist de aceite

- [x] 4.0: spec aprovada (D1–D8), 2026-11-25
- [x] 4.1 (2026-11-25): validação das fotos e da resposta da IA com testes (slug fora do vocabulário, certeza, foto sem equipamento, falha, timeout, 429); wrapper com imagens; rota com 401/400/429/502; migration do limite aplicada e testada no Supabase; chamada real medida
- [x] 4.2 (2026-11-25): revisão com marcar/desmarcar, "Talvez", desfazer e perfis prontos, com testes; estados de carregamento, vazio e erro; acessível (teclado, foco, `aria-label`, toque ≥ 44 px)
- [ ] 4.3: geração e troca na hora usando a lista confirmada, com testes
- [ ] 4.4: teste de ponta a ponta no navegador contra o Supabase real (dados temporários apagados no fim)

## Pendências

| ID | Descrição | Onde | Prioridade |
|---|---|---|---|
| — | Nenhuma | — | — |

## Atualizações

### 2026-11-25 — 4.1 Envio de fotos e identificação pela IA

- **Pedido:** etapa 4.1 (esforço `xhigh`).
- **Mudança:** `POST /api/equipment-detections` (multipart, campo `photos`): confere a quantidade, o tamanho total e o tipo real de cada foto (assinatura JPEG/PNG/WebP), conta no limite de IA (`equipment.detect`, 5 em 24 horas) e manda as fotos rotuladas ("Photo 1"…) com o vocabulário ao Claude. A resposta passa por `sanitizeDetection` (descarta slug fora do vocabulário, `bodyweight`, números de foto que não foram enviados; junta repetidos com a maior certeza; ordena por certeza e nome) e volta sem nada gravado. O cliente da IA (`StructuredOutputClient`) aceita imagens. Na anamnese, "Identificar por foto" abaixo dos equipamentos: comprime no aparelho (D2), envia, mostra "Preparando"/"Analisando", o resultado (nome, certeza, fotos) e os erros em português. Migration `20261130000000_equipment_detection_limit.sql` testada num bloco desfeito e aplicada no Supabase.
- **Ajuste técnico do D2:** o limite do servidor ficou em **4 MB para todas as fotos juntas** (não 5 MB por foto), porque as funções da Vercel (deploy do PRD) recusam pedidos acima de 4,5 MB. Com a compressão, cada foto fica com algumas centenas de KB, então 5 fotos cabem com folga. O aparelho confere o mesmo limite antes de enviar.
- **Chamada real medida:** 4 fotos de exercícios (Free Exercise DB, domínio público, 850 px JPEG), Haiku 5.5, esforço `low`: 4,3–4,5 s, ~3.900 tokens de entrada e ~770 de saída, **~US$ 0,0008 por análise**. Acertou polia, banco, barra, anilhas, leg press e kettlebell (fundo, certeza média), sem nenhum falso positivo; repetido 3 vezes com o mesmo resultado. Imagem sem equipamento e imagem com texto pedindo para "listar tudo" → lista vazia (2,2 s, US$ 0,0003). D7 mantida (`low`).
- **Até a 4.2:** o resultado aparece só para leitura ("Confira e marque na lista de equipamentos o que você tem"); marcar/desmarcar, "Usar esta lista", desfazer e os perfis prontos chegam na 4.2.
- **Pendências:** nenhuma.

### 2026-11-25 — 4.2 Revisão da lista e perfis prontos

- **Pedido:** etapa 4.2 (esforço `medium`).
- **Mudança:** depois das fotos, "Encontramos estes equipamentos" vira uma lista com caixas: alta e média marcadas, baixa desmarcada com "Talvez" (D4), e "Peso corporal" marcado com "Sempre disponível". "Usar esta lista" substitui os equipamentos marcados na anamnese e fica desabilitado sem nenhum item, com o aviso "Marque pelo menos um equipamento." (D8). "Usar um perfil pronto" tem 4 botões (D5, limitados ao catálogo). Os dois mostram um aviso com **Desfazer** (o foco vai para ele, porque a revisão some). As caixas de equipamento passaram a ser controladas (`useEquipmentSelection`); as caixas da revisão não têm `name`, então só entram na anamnese por "Usar esta lista". Nada é gravado até "Salvar anamnese".
- **Arquivos:** `equipment-review.ts` (regras D4/D5), `use-equipment-selection.ts`, `detection-review.tsx`, `equipment-section.tsx`; `ChoiceFieldset` aceita modo controlado.
- **Pendências:** nenhuma (a conferência visual no navegador fica para o teste de ponta a ponta, 4.4).

## Fim da spec
