# 008 — Layout base com navegação

**Etapa:** 0.8 (checklist `docs/reference/001-checklist-implementacao.md`)

## Objetivo

Estrutura visual do app logado, no estilo da referência (tema escuro com destaque oliva), com navegação inferior fixa: Início, Treino, Agenda, Perfil.

## Escopo

**Entra:**
- Tokens de cor do tema (escuro, destaque oliva) em `globals.css`
- Grupo de rotas `(app)` com layout próprio: conteúdo + barra de navegação inferior fixa
- Rotas (inglês): `/` Início, `/workout` Treino, `/schedule` Agenda, `/profile` Perfil
- Item ativo destacado e marcado com `aria-current="page"`
- Páginas com cabeçalho e **estado vazio** (sem dados inventados)
- Botão "Sair" movido para o Perfil
- `/login` fora do layout com navegação

**Não entra:**
- Conteúdo real das telas (Fase 2 em diante)
- Modo claro (a referência é escura; avaliar depois)

## Regras

- Alvos de toque ≥ 44px; foco visível; ícones com rótulo de texto
- Respeitar a área segura do iPhone (`safe-area-inset-bottom`)
- Textos via arquivo de mensagens

## Checklist de aceite

- [x] Navegação com 4 itens e item ativo correto (teste automatizado)
- [x] Cada rota abre sua página com estado vazio
- [x] Sair funciona a partir do Perfil
- [x] Layout responsivo no celular (login verificado em 375px; telas logadas dependem de AUTH-001/002 para conferência visual)
- [x] Testes, typecheck, lint e build limpos

## Fim da spec
