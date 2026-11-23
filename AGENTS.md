# AGENTS.md - Regras universais de desenvolvimento

================================================================
REGRA ZERO - SEMPRE CONSULTAR ESTE ARQUIVO E .agents/rules/
================================================================
Antes de gerar QUALQUER código, leia este arquivo completamente.
Siga TODAS as regras aqui descritas. Se houver conflito entre
este arquivo e sua base de conhecimento, este arquivo VENCE.

Documentos de referência do projeto (quando existirem):
- PRD (fonte da verdade do produto e das regras de negócio)
- Mockup/protótipo visual (fonte da verdade de UX/UI; o CÓDIGO do mock NÃO é reaproveitado)
- Specs e documentos em /docs (detalham funcionalidades específicas)

Se o PRD e este arquivo divergirem em padrão de código/nomenclatura/idioma,
ESTE ARQUIVO vence. Se divergirem em regra de negócio, o PRD vence.

As particularidades de cada projeto (stack, escopo, domínio, glossário,
limites de negócio, fases) NÃO ficam aqui: ficam no PRD e nos documentos
do projeto. Antes de começar, leia-os para conhecer:
- Escopo do MVP e o que está fora do MVP
- Stack e estrutura de pastas adotadas
- Glossário de domínio (nomes do PRD → nomes no código)
- Regras de negócio, limites e thresholds
- Ordem das fases de implementação

Se alguma dessas informações não existir, PERGUNTAR antes de assumir.

ANTES DE QUALQUER TAREFA, leia também TODOS os arquivos de .agents/rules/.
Eles são instruções sempre válidas, no mesmo nível deste arquivo.
Fluxos passo a passo acionados por pedido ficam em .agents/skills/.
O que é cada tipo de arquivo: .agents/README.md

Cada assunto tem UM arquivo dono; os demais apenas apontam para ele:
- Testes / TDD ............ .agents/rules/testing-and-existing-screens.md
- Git / branches / PR ..... .agents/rules/git-workflow.md
- Documentação (docs/) .... .agents/rules/docs-organization.md
- Specs (SDD) ............. .agents/rules/spec-per-task.md
- Pendências .............. .agents/rules/pending-items.md
- Histórico de bugs ....... .agents/rules/bug-history.md
- Tom das respostas ....... .agents/rules/answer-style.md
- Relatório de progresso .. .agents/rules/progress-report.md

Skills disponíveis:
- run-phase ............... .agents/skills/run-phase/SKILL.md
  (pedidos como "executar fase", "iniciar fase", "próxima etapa")
- git-pr-workflow ......... .agents/skills/git-pr-workflow/SKILL.md
  (criar branch, abrir PR, "pode subir", "subir", release/tag)

================================================================
1. ARQUITETURA GERAL
================================================================

☐ Escopo
  - Implementar SOMENTE o que está no escopo do MVP e na fase atual do plano
  - Itens "fora do MVP": NÃO implementar; apenas deixar pontos de extensão
    óbvios (interfaces/tipos), sem implementação

☐ Organização por responsabilidade (usar a estrutura definida no projeto;
  se não houver, seguir esta separação):
  - Rotas/entrada (camada fina: valida → chama serviço → formata resposta)
  - Serviços (regras de negócio)
  - Repositórios (acesso a dados; queries não ficam espalhadas)
  - Integrações externas (um módulo/wrapper por serviço externo)
  - config        → leitura e validação centralizada de configuração/ambiente
  - errors        → erros customizados e helpers
  - logger        → logger estruturado
  - constants     → constantes nomeadas (sem números/strings mágicos)
  - i18n/messages → todas as strings visíveis ao usuário
  - Componentes de UI (primitivos reutilizáveis separados dos de tela)
  - migrations / seed-data → banco versionado e dados de carga
  - scripts       → utilitários de linha de comando

================================================================
2. PRINCÍPIOS CLEAN CODE (APLICAR SEMPRE)
================================================================

☐ Nomes significativos e pronunciáveis
  - Variáveis: substantivos claros (activeOrders, validatedEmail)
  - Funções: verbos descritivos (calculateTotal(), buildInvoice())
  - Classes/Componentes/Tipos: substantivos (PaymentProcessor, UserProfile)
  - Sem abreviações (NUNCA "txt", "buf", "mgr", "cfg", "usr")

☐ Funções pequenas e com ÚNICA responsabilidade
  - Máximo 30 linhas por função
  - Se passar disso, EXTRAIR para função privada/helper
  - Cada função faz UMA coisa e faz bem
  - Componentes de UI: idem (extrair subcomponentes e lógica reutilizável)

☐ Princípio DRY (Don't Repeat Yourself)
  - Código duplicado = EXTRAIR para função/módulo compartilhado
  - Strings mágicas = CONSTANTES
  - Números mágicos = CONSTANTES nomeadas (ex.: MAX_LOGIN_ATTEMPTS = 5)

☐ Princípio KISS (Keep It Simple, Stupid)
  - Solução mais simples primeiro
  - Não adicionar abstração desnecessária
  - Se não precisa de herança/classe, use função simples

☐ Princípio YAGNI (You Ain't Gonna Need It)
  - Implementar APENAS o que está no escopo do MVP e na fase atual do plano
  - NÃO adicionar funcionalidades "pensando no futuro"
  - Deixar pontos de extensão óbvios (interfaces/tipos) mas sem implementar

☐ Tratamento de erros
  - try/catch ESPECÍFICO (nunca catch vazio ou catch genérico que engole erro)
  - Usar erros customizados (ex.: RateLimitExceededError, InvalidInputError)
  - Log de erros com contexto (ids, rota, operação) - sem dados sensíveis
  - Mensagens de erro em português para o usuário
  - Fallbacks definidos para cada ponto de falha
  - Tipagem forte: nunca usar tipos "coringa" que desligam a verificação
    (ex.: any); usar tipo desconhecido + verificação quando necessário

================================================================
3. PADRÕES DE CÓDIGO
================================================================

☐ Tipagem
  - Usar o modo mais estrito de verificação disponível na linguagem
  - Tipos explícitos nas fronteiras (entradas, retornos de API, repositórios)
  - Derivar tipos de schemas de validação quando possível (evitar duplicação)

☐ Operações de I/O
  - Banco, chamadas HTTP, leitura/parse de arquivo: sempre assíncronas
    quando a linguagem/plataforma oferecer
  - NUNCA deixar operação assíncrona sem aguardar/tratar
  - Preferir o estilo mais legível da linguagem (ex.: async/await em vez de callbacks encadeados)

☐ Cliente vs Servidor
  - Lógica de negócio, regras sensíveis, banco e serviços externos: SEMPRE no servidor
  - Cliente nunca acessa o banco diretamente: usa a API do próprio sistema
  - Cliente apenas exibe dados e envia ações do usuário
  - Código de cliente só onde há interatividade/estado/API do dispositivo
  - Não criar estado global sem necessidade

☐ Injeção de dependência (leve, sem framework)
  - Serviços definidos por interface/tipo explícito e recebidos por parâmetro
    (factory function ou construtor), nunca importados "no meio" da lógica
  - Composição das dependências em UM lugar por ponto de entrada (composition root)

☐ Configurações
  - Centralizar em um único módulo de configuração, com leitura única e validada
  - Variáveis de ambiente validadas na inicialização (falhar cedo se faltar)
  - NUNCA hardcodar paths, chaves, URLs ou valores de negócio
  - Limites e thresholds de negócio vêm de constantes/configuração
    (os valores ficam definidos no PRD do projeto)

☐ Segurança
  - Chaves e segredos SOMENTE no servidor; nada sensível vai ao cliente
  - NUNCA commitar chaves; usar arquivo de ambiente local ignorado pelo Git
    e manter um arquivo de exemplo (.env.example) sem valores
  - Controle de acesso no banco: cada usuário só acessa os próprios dados
  - Nunca confiar em dados vindos do cliente: revalidar/reclassificar no servidor
  - Arquivos enviados pelo usuário: processar o mínimo necessário e não
    armazenar o original se não for preciso
  - Serviços externos: enviar apenas os dados estritamente necessários
  - Senhas: gerenciadas pelo provedor de autenticação (nunca em tabela própria)

================================================================
4. API E VALIDAÇÃO
================================================================

☐ Rotas/endpoints
  - Handler fino: valida → chama serviço → formata resposta
    (regra de negócio fica na camada de serviços, não no handler)

☐ Validação
  - Validar input de TODAS as rotas (body, params, query) com schema
  - Validar também a SAÍDA de serviços externos antes de usar
  - Autenticação aplicada de forma central (middleware/guard): páginas
    protegidas redirecionam para login; API não autenticada → 401
  - O id do usuário vem SOMENTE da sessão autenticada, via um helper central;
    nunca do corpo da requisição

☐ Respostas da API
  - Sempre JSON
  - Códigos HTTP corretos (200, 201, 400, 401, 403, 404, 422, 429, 500)
  - 429 para rate limit
  - Formato padrão: { success: boolean, data?: T, error?: string }
  - Nunca vazar stack trace ou detalhes internos na resposta

================================================================
5. BANCO DE DADOS NORMALIZADO
================================================================

Regras de normalização:
- Models normalizados (3ª forma normal)
- Cada tabela tem UMA responsabilidade
- Chaves primárias: UUID (ou int auto-increment quando fizer sentido)
- Chaves estrangeiras com ON DELETE CASCADE (quando fizer sentido para o domínio)
- Índices em colunas de busca frequente e restrições UNIQUE onde houver unicidade
- NUNCA armazenar JSON aninhado se pode ser normalizado
  (exceções somente quando previstas no PRD)
- Controle de acesso por usuário em todas as tabelas com dados de usuário
- Credenciais administrativas do banco só para jobs, seed e scripts;
  a aplicação consulta com a credencial da sessão do usuário
- Nomes de tabelas e colunas em inglês, snake_case
- Acesso via camada de repositórios (não espalhar queries)
- Migrations versionadas

Seed:
- Popular a partir de fontes curadas e versionadas no repositório
- NUNCA inventar dados de domínio. Se faltar dado, criar placeholder
  explícito: "TODO: popular"

================================================================
6. COMPONENTES DESACOPLADOS E REUTILIZÁVEIS
================================================================

☐ Serviços com interfaces explícitas (nomes em inglês)

☐ Cada serviço:
  - NÃO conhece os outros serviços diretamente
  - Recebe dependências por injeção (parâmetro/construtor)
  - Pode ser testado isoladamente (mock)
  - Pode ser substituído sem afetar o resto

☐ Componentes de UI
  - Componentes "burros" (props in, eventos out) separados dos que buscam dados
  - Reutilizar a biblioteca de componentes do projeto; não recriar primitivos
  - Lógica reutilizável de UI extraída para funções/hooks próprios

================================================================
7. TRATAMENTO DE ERROS E RESILIÊNCIA
================================================================

☐ Política de retry para chamadas HTTP externas:
  - Máximo 3 tentativas
  - Backoff exponencial (1s, 2s, 4s)
  - Timeout total: 15 segundos
  - Não fazer retry em erros 4xx (exceto 429 com respeito ao Retry-After)

☐ Fallbacks definidos:
  - Cada ponto de falha tem um fallback definido e documentado
  - Serviço externo offline/timeout → mensagem amigável em português,
    sem perder o que o usuário digitou
  - Resposta externa fora do schema esperado → tratar como falha e usar fallback
  - Rate limit atingido → mensagem clara em português (HTTP 429)
  - Recurso do dispositivo/navegador indisponível → esconder/desabilitar a
    funcionalidade com aria-label explicativo
  - Nunca apresentar como certa uma informação incerta

☐ Importações de dados
  - Falso positivo é PIOR que falso negativo
  - Tela de revisão antes de confirmar
  - Deduplicação por identificador de origem e por match normalizado
  - Falha na importação → mensagem clara + permitir seguir sem importar

☐ Logging estruturado:
  - Logger estruturado em módulo próprio
  - Níveis: debug, info, warn, error
  - NUNCA logar dados sensíveis (chaves, tokens, conteúdo de arquivos do usuário)
  - Evitar logar conteúdo digitado pelo usuário; logar ids e metadados

================================================================
8. PERFORMANCE
================================================================

☐ Serviços externos:
  - Timeout por tentativa (dentro do teto total da política de retry)
  - Cache de respostas reutilizáveis
  - Enviar apenas o necessário em cada chamada

☐ Consistência:
  - Gravar operações relacionadas de forma atômica (transação)

☐ Banco:
  - Usar os índices definidos; evitar N+1 (buscar em lote/joins)
  - Paginar listas
  - Selecionar só as colunas necessárias

☐ Frontend:
  - Minimizar código executado no cliente
  - Carregar componentes pesados sob demanda (lazy loading)
  - Evitar re-renders/recomputações desnecessários (otimizar só quando houver ganho medido)
  - Imagens e fontes otimizadas
  - Estados de loading (skeleton) e vazio em TODAS as telas com dados
  - Alvos de toque >= 44px

================================================================
9. CONVENÇÕES DE NOMENCLATURA
================================================================

☐ Seguir a convenção idiomática da linguagem do projeto. Padrão de referência:
  - Funções e variáveis: camelCase (getActiveOrders, validatedEmail)
  - Classes/Componentes: PascalCase (OrderSummary, PaymentForm)
  - Tipos/Interfaces: PascalCase, SEM prefixo "I" (OrderRepository, PaymentResult)
  - Constantes: UPPER_SNAKE_CASE (MAX_RETRY_ATTEMPTS, DEFAULT_PAGE_SIZE)
  - Enums/unions: valores em inglês (ex.: 'active' | 'archived')
  - Arquivos de rota e de módulo: kebab-case (order-service.ts)
  - Arquivos de componente: um padrão só, consistente em todo o projeto
  - Banco: tabelas e colunas em snake_case

================================================================
9.5 PADRÃO DE IDIOMA DO PROJETO
================================================================

☐ Todo o código interno deve ser escrito em inglês:
  - Classes
  - Interfaces/Types
  - Métodos
  - Funções
  - Variáveis
  - Constantes
  - Arquivos
  - Pastas
  - Rotas (páginas e API)
  - Tabelas e colunas do banco
  - Chaves de JSON (inclusive saídas estruturadas de serviços externos)
  - Eventos de analytics
  - Comentários técnicos

☐ Toda a interface visível ao usuário deve ser escrita em português (pt-BR):
  - Labels
  - Botões
  - Menus
  - Mensagens
  - Validações
  - Toasts
  - Alertas
  - Tooltips
  - Placeholders
  - Títulos
  - Textos institucionais
  - Mensagens de erro exibidas ao usuário

☐ NUNCA hardcodar texto de UI nos componentes: usar o arquivo de mensagens
  (ex.: messages/pt-BR.json) via helper de i18n.

☐ NUNCA misturar idiomas no código.
  Correto:
    OrderRepository
    PaymentProcessor
    calculateTotal()
  Incorreto:
    RepositorioPedidos
    ProcessadorPagamento
    calcularTotal()

☐ Os nomes em português do PRD são descrições de domínio. Ao implementar,
  traduzir conforme o glossário do projeto (tabelas, rotas, valores de domínio).
  Se não houver glossário, criar um ao traduzir o primeiro termo e usá-lo
  SEMPRE a partir daí.

☐ Internacionalização para outros idiomas só quando estiver no escopo.

================================================================
10. TESTES — TDD OBRIGATÓRIO
================================================================

☐ Regra completa (ciclo TDD, o que testar, mocks de serviços externos):
  .agents/rules/testing-and-existing-screens.md
☐ Resumo: spec → teste que falha (Red) → implementação (Green) → refatorar.
  Nenhuma etapa é concluída sem a suite de testes do projeto passando.

================================================================
11. REGRAS GERAIS DE PRODUTO
================================================================

☐ Regras de domínio do projeto: seguir o PRD e as specs
☐ O mock visual é a spec de UX/UI: respeitar fluxos e telas, sem copiar o código do mock
☐ Ações destrutivas ou acidentais devem permitir desfazer (undo) quando viável
☐ Decisões importantes do usuário nunca são tomadas automaticamente pelo sistema
☐ Notificações: opt-in explícito e nunca enviar quando não houver nada relevante
☐ Progresso e métricas mostrados ao usuário devem ser honestos e claros
☐ Analytics: registrar os eventos mínimos definidos no PRD
☐ Acessibilidade: contraste WCAG AA, foco visível, teclado, aria-label, toque >= 44px
☐ NUNCA inventar dados de domínio (usar fonte curada ou "TODO: popular")

================================================================
12. PRIORIDADE DE IMPLEMENTAÇÃO
================================================================

1. SEMPRE implementar na ordem das fases do plano do projeto
2. NUNCA pular para uma fase sem a anterior funcionando e testada
3. Cada fase só começa quando a anterior está funcionando
4. Dúvida entre duas abordagens → escolher a MAIS SIMPLES
5. Nunca implementar itens "Fora do MVP"

================================================================
13. CONVENÇÃO DE BRANCHES E GITHUB WORKFLOW
================================================================

☐ Regra completa: .agents/rules/git-workflow.md
  (comandos passo a passo: skill git-pr-workflow)
☐ Resumo do que nunca pode ser esquecido:
  - Branch nova SEMPRE a partir da main atualizada
  - NUNCA fazer merge antes de o usuário dizer "pode subir" ou "subir"
  - NUNCA reescrever histórico já publicado (sem force push, rebase ou amend após push)

================================================================
14. CHECKLIST ANTES DE CONCLUIR QUALQUER TAREFA
================================================================

☐ Código 100% em inglês; textos de UI em pt-BR via arquivo de mensagens
☐ Funções com no máximo 30 linhas e uma única responsabilidade
☐ Sem números/strings mágicos (constantes nomeadas)
☐ Input validado com schema; resposta no formato { success, data?, error? }
☐ I/O assíncrono tratado; nenhuma operação solta; tipagem forte (sem tipos coringa)
☐ Erros tratados de forma específica, com log contextual e mensagem em português
☐ Nenhum segredo no código, no cliente ou nos logs
☐ Lógica de negócio e serviços externos rodando apenas no servidor
☐ TDD aplicado à funcionalidade entregue, com testes passando (testing-and-existing-screens.md)
☐ Telas e componentes existentes reaproveitados quando aplicável
☐ Estados de loading, vazio e erro tratados na UI
☐ Acessibilidade verificada (teclado, foco, aria-label, contraste, toque >= 44px)
☐ Nada fora do escopo do MVP / da fase atual foi implementado
☐ Spec criada ou atualizada antes de implementar (spec-per-task.md)
☐ Pendências não fechadas registradas na spec e no docs/status.md
  (pending-items.md)

================================================================
FIM DAS INSTRUÇÕES
================================================================

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
