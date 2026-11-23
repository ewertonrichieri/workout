# 004 — Mensagens pt-BR e helper de i18n

**Etapa:** 0.4 (checklist `docs/reference/001-checklist-implementacao.md`)

## Objetivo

Centralizar todo texto visível ao usuário em um arquivo de mensagens, como exige o `AGENTS.md` (seção 9.5), com um helper tipado para usá-lo.

## Escopo

**Entra:**
- `src/messages/pt-BR.json` com chaves aninhadas em inglês e textos em pt-BR
- Helper `translate(key, params?)` em `src/lib/i18n/`: chave tipada (erro de compilação para chave inexistente) e interpolação `{nome}`
- Mensagens iniciais: erros genéricos e nomes da navegação (Início, Treino, Agenda, Perfil)
- Fechar a pendência BASE-001 (erro interno genérico vindo do arquivo de mensagens)

**Não entra:**
- Outros idiomas e troca de idioma (fora do escopo)
- Biblioteca externa de i18n (KISS: um idioma só)

## Regras

- Componentes e serviços nunca escrevem texto de UI direto; sempre `translate(...)`
- Chave inexistente é erro de tipo; parâmetro ausente deixa o marcador `{nome}` visível (não quebra a tela)

## Checklist de aceite

- [x] `translate` retorna o texto pela chave aninhada
- [x] Interpolação de parâmetros funciona
- [x] Chave inválida não compila
- [x] BASE-001 resolvida
- [x] Testes passando, typecheck e lint limpos

## Fim da spec
