# 015 — Tela de treino e edição simplificadas

**Status:** aprovada pelo usuário em 2026-11-26 (abordagem 3: "essencial visível, o resto em Mais opções")

## Objetivo

O treino é gerado pela IA: na hora de treinar, a pessoa só precisa **confirmar** o que fez, não preencher
um formulário. Hoje cada card de exercício mostra ~13 elementos ao mesmo tempo e cada card do editor
mostra 6 campos e 4 botões. Esta spec reorganiza as duas telas para deixar visível só o essencial,
**sem remover nenhuma funcionalidade** e **sem mudar regra de negócio, API ou banco**.

## Escopo

**Entra**

- Card do exercício na tela de treino (`/workout`)
- Linha de série (registro de repetições/carga, check e esforço)
- Card do exercício na edição do treino (`/workout/edit`)

**Não entra**

- Mudanças nas regras de progressão (3.5), autorregulação (3B.3), ajuste do dia (3B.2) ou troca (3B.4)
- Modo foco (um exercício por vez) e edição por conversa com a IA (abordagens 2 e 4, descartadas)
- Check-in, validade do plano, avisos de saúde/renovação (continuam como estão)
- Seletor de descanso com opções prontas (continua campo em segundos)

## Regras

### Tela de treino — card do exercício

Fica sempre visível:

1. Foto, nome (link para o detalhe) e **uma linha** com a prescrição: `3 séries · 8 a 12 repetições · Descanso: 1 min`
   (sem descanso prescrito, a parte do descanso some)
2. Observação da IA (quando houver) e "Concluído" quando todas as séries têm check
3. **No máximo um aviso**: troca/ajuste do dia → senão, motivo da carga (sobe/desce/mantém) → senão, "Carga sugerida da última sessão"
4. As séries

Vai para **"Mais opções"** (`<details>` nativo, fechado por padrão, nome acessível "Mais opções de {exercício}"):

- Ver demonstração
- Trocar exercício / Desfazer troca (mesmas condições de antes)
- Analisar minha execução (só exercícios suportados)
- Ver evolução
- Salvar carga para progredir

### Séries — confirmar em vez de preencher

- **Valor sugerido da série** (mostrado como placeholder do campo):
  - Repetições: as da série anterior do mesmo exercício (se preenchidas e válidas); senão, a prescrição quando ela é fixa (`10`); senão nenhum (o placeholder continua mostrando a faixa, ex.: `8 a 12`)
  - Carga: a da série anterior (se preenchida e válida); senão nenhuma (vazio = peso corporal)
- O check fica habilitado quando a série, completada com os valores sugeridos, é válida
- Ao marcar o check, **os campos vazios recebem o valor sugerido** e esse valor é gravado como digitado; o que a pessoa digitou nunca é trocado
- Com prescrição em faixa (`8 a 12`), a 1ª série continua exigindo as repetições digitadas (não inventamos o número feito); da 2ª em diante, um toque repete a série anterior
- Desmarcar mantém os valores
- **Esforço** (fácil / ok / no limite): aparece depois do check como hoje; depois de escolhido, vira **um botão** "Esforço: Ok" que reabre a escolha (de 3 alvos por série para 1)

### Edição do treino

- Cada exercício aparece **recolhido**: nome + resumo `3 séries · 8 a 12 repetições · Descanso: 1 min` + botão "Editar" (`aria-expanded`)
  - Valores inválidos no rascunho mostram "Valores a conferir" no resumo
- **Aberto**: Séries, Descanso (s), Reps mín., Reps máx.; Categoria e Observação dentro de "Mais opções";
  botões Subir, Descer, Trocar, Remover; o botão do topo vira "Fechar"
- Um exercício adicionado já aparece aberto
- Ao tentar salvar com erro, os exercícios com erro abrem (e "Mais opções" abre quando o erro é de categoria/observação)
- **Remover tem desfazer**: aviso "{exercício} removido do treino." com "Desfazer", que devolve o exercício à mesma posição;
  some ao remover outro ou descartar. Nada é gravado até "Salvar alterações" (como antes)

## Acessibilidade

- Alvos ≥ 44px, foco visível, `aria-expanded`/`aria-controls` no botão Editar, nomes acessíveis com o nome do exercício
- `<details>`/`<summary>` nativos (teclado e leitor de tela sem JS extra)

## Arquivos

- `src/lib/training/set-log-draft.ts` — `resolveSetDefaults`, `fillWithDefaults`
- `src/lib/training/workout-edit-draft.ts` — `parseDraftExercise`, `restoreDraftExercise`
- `src/components/workout/workout-labels.ts` — `describePrescription`
- `src/components/workout/` — `workout-exercise-card.tsx`, `exercise-more-options.tsx`, `set-log-list.tsx`, `set-log-row.tsx`, `set-effort-choice.tsx`
- `src/components/plan-edit/` — `edit-exercise-card.tsx`, `workout-editor.tsx`, `use-workout-editor.ts`
- `src/messages/pt-BR.json` — textos novos

## Checklist de aceite

- [x] Card do treino com prescrição em uma linha, um aviso no máximo e "Mais opções", com testes
- [x] Série completada com o valor sugerido em um toque, com testes (regras puras + componente)
- [x] Esforço escolhido recolhido em um botão, com testes
- [x] Editor recolhido por exercício, abre nos erros, com testes
- [x] Remover com desfazer no editor, com testes
- [x] Suite, lint e build passando

## Pendências

Nenhuma.

## Fim da spec
