# 007 — Autenticação (Supabase: Google + e-mail/senha)

**Etapa:** 0.7 (checklist `docs/reference/001-checklist-implementacao.md`)

## Objetivo

Permitir entrar no app com o botão do Google ou com e-mail e senha, usando o Supabase Auth, e proteger de forma central todas as páginas e APIs.

## Escopo

**Entra:**
- Tela `/login` com botão "Entrar com Google" e formulário de e-mail/senha (entrar e criar conta)
- Rota `/auth/callback`: troca o código do Supabase pela sessão (Google e confirmação de e-mail)
- `src/proxy.ts` (o "middleware" do Next 16): renova a sessão em toda requisição e aplica o controle de acesso
  - Página protegida sem sessão → redireciona para `/login?next=<rota>`
  - API (`/api/*`) sem sessão → `401` JSON `{ success: false, error }`
  - Usuário logado abrindo `/login` → vai para `/`
- Helper central `getAuthenticatedUserId()`: o id do usuário vem só da sessão
- Sair da conta (botão provisório na página inicial até o layout da etapa 0.8)
- Mensagens em pt-BR no arquivo de mensagens

**Não entra:**
- Recuperação de senha, troca de e-mail, outros provedores (Apple etc.)
- Layout/navegação (etapa 0.8)

## Regras

- Senhas só no Supabase (nunca em tabela própria); mínimo de 8 caracteres
- Destino pós-login (`next`) só aceita caminho interno (começa com `/`, não com `//`) — evita redirecionamento aberto
- Erros do Supabase viram mensagens amigáveis em pt-BR; nunca expor a mensagem técnica
- Server Actions revalidam tudo no servidor (não confiar no cliente) e não dependem só do proxy
- Perfil (`profiles`) criado automaticamente pelo trigger da etapa 0.6

## Configuração manual (usuário)

1. **Supabase → Authentication → URL Configuration:** Site URL `http://localhost:3000`; Redirect URLs: `http://localhost:3000/auth/callback` (e a URL de produção quando houver)
2. **Google Cloud Console:** criar credencial OAuth (Aplicativo da Web) com o redirect `https://<projeto>.supabase.co/auth/v1/callback`
3. **Supabase → Authentication → Providers → Google:** ativar e colar Client ID e Client Secret

## Checklist de aceite

- [x] Regras de acesso do proxy cobertas por testes (página, API, login, callback)
- [x] Validação de e-mail/senha e sanitização do `next` testadas
- [x] Serviço de autenticação com mensagens de erro em pt-BR testado com cliente falso
- [x] `/` sem sessão redireciona para `/login`; `/api/*` sem sessão retorna 401
- [ ] Login com Google funcionando de ponta a ponta — depende da configuração manual (AUTH-001)
- [ ] Cadastro/login com e-mail testado de ponta a ponta pelo usuário (AUTH-002) — **login** com e-mail/senha já testado de ponta a ponta em 2026-11-25 (usuário temporário confirmado pela API, apagado depois); falta só o **cadastro** com recebimento do e-mail de confirmação

## Pendências

| ID | Descrição | Onde | Prioridade |
|---|---|---|---|
| AUTH-001 | Configurar Google OAuth (Google Cloud + Supabase) e URLs de redirecionamento | Painéis Google Cloud / Supabase | Alta |
| AUTH-002 | Teste manual de **cadastro** por e-mail com recebimento do e-mail de confirmação (o login já foi testado de ponta a ponta em 2026-11-25). O SMTP padrão do Supabase só entrega para e-mails da equipe do projeto, por isso o teste é com o e-mail do usuário | `/login` | Alta |

## Atualizações

### 2026-11-25 — Teste de ponta a ponta do login por e-mail

- **Pedido:** testar AUTH-001/002 no navegador.
- **Mudança:** login por e-mail/senha, senha errada (mensagem em pt-BR), redirecionamento de página protegida e API sem sessão (401) testados no navegador contra o Supabase real; host do projeto liberado na rede do ambiente de nuvem. Google (AUTH-001) depende da configuração no Google Cloud pelo usuário.
- **Pendências:** AUTH-001, AUTH-002 (só o cadastro)

## Fim da spec
