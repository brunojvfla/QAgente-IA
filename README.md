# QAgent

Fundação de uma plataforma de IA especializada em Quality Assurance, com ambientes independentes para profissionais (**Work**) e estudantes (**Learn**).

## Arquitetura e tecnologias

Monorepo pnpm com um monólito modular: `apps/web` (Next.js App Router, React, TypeScript, Tailwind CSS e componentes no padrão shadcn/ui), `apps/api` (NestJS, REST, Prisma e Swagger) e `packages/shared` (contratos e enums compartilhados). PostgreSQL é executado via Docker Compose. O backend é o único componente autorizado a acessar o provedor de IA OpenRouter, pela API compatível com OpenAI.

## Estrutura

```text
apps/
  api/                 API NestJS e schema/migrations Prisma
  web/                 Aplicação Next.js
packages/
  shared/              Tipos e valores compartilhados
  config/              Configuração TypeScript compartilhada
docs/
  architecture/        Decisões e visão arquitetural
  requirements/        Escopo da fundação
  database/            Modelo de dados
docker/                Recursos auxiliares para contêineres
.github/               Configuração do repositório
docker-compose.yml
```

## Pré-requisitos

- Node.js 20.19+ (ou 22.12+), pnpm 10 via Corepack.
- Docker Desktop com Docker Compose.
- PowerShell no Windows/VS Code.

Ative o pnpm no Windows:

```powershell
corepack enable
corepack prepare pnpm@10.18.3 --activate
pnpm --version
```

Se a política de execução bloquear `pnpm.ps1`, use `pnpm.cmd` nos comandos abaixo.

## Instalação e configuração

```powershell
Copy-Item .env.example .env
```

Gere um segredo JWT para desenvolvimento:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Substitua `JWT_SECRET` em `.env`. Para habilitar respostas reais, configure `OPENAI_API_KEY` com a chave do OpenRouter e `OPENAI_MODEL` com o ID exato de um modelo disponível no catálogo (incluindo o prefixo do provedor, quando houver). A API usa `https://openrouter.ai/api/v1` por padrão; `OPENAI_BASE_URL` pode explicitar esse endereço. Opcionalmente, defina `OPENAI_MODELS` como uma lista separada por vírgulas para restringir os modelos selecionáveis nas configurações. O backend consulta o catálogo, não faz fallback automático e só identifica um modelo como grátis quando o catálogo informa preço zero para entrada e saída; isso não garante disponibilidade ou ausência de limites do provedor. A chave permanece exclusivamente no backend. Ela não é necessária para cadastro, login ou dashboards; sem configuração válida, chat e ferramentas informam a indisponibilidade.

`POSTGRES_PASSWORD` e a senha em `DATABASE_URL` devem coincidir. Os valores fornecidos são apenas para desenvolvimento local.

Instale dependências:

```powershell
pnpm install
```

## Banco de dados

Inicie PostgreSQL e aguarde ficar saudável:

```powershell
docker compose up -d postgres
docker compose ps
```

Gere o cliente Prisma e aplique as migrations:

```powershell
pnpm db:generate
pnpm db:deploy
```

`db:deploy` aplica as migrations existentes sem recriar o banco. Para desenvolver uma alteração de schema local, use `pnpm db:migrate` e revise a migration gerada antes de aplicá-la.

Para criar uma conta de teste local, defina `QAGENT_TEST_EMAIL` e `QAGENT_TEST_PASSWORD` na sessão do PowerShell e execute `pnpm --filter @qagent/api seed:test-user`. O comando é bloqueado em produção e armazena somente um hash Argon2id.

## Executar

Em um terminal:

```powershell
pnpm dev
```

Web: <http://localhost:3110>  
API: <http://localhost:3101/api>  
Swagger: <http://localhost:3101/api/docs>

Para executar um serviço isoladamente: `pnpm --filter @qagent/web dev` ou `pnpm --filter @qagent/api dev`.
Para encerrar os processos iniciados no terminal, use `Ctrl+C`. Para parar somente o PostgreSQL sem apagar os dados, execute `docker compose stop postgres`. Não use `docker compose down -v` se quiser preservar o volume do banco.

## Testes, lint e build

```powershell
pnpm exec playwright install chromium
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

`pnpm test` executa os testes unitários da API e testes Playwright de fumaça; o Playwright inicia a aplicação web automaticamente e os testes de interface existentes usam mocks. O backend também tem testes unitários sem dependência de um banco real. Os fluxos de persistência ponta a ponta exigem PostgreSQL ativo.

## Autenticação e dados

Senhas são armazenadas com Argon2id. A sessão usa JWT em cookie `HttpOnly`, `SameSite=Lax`, `Secure` em produção, e token CSRF associado à sessão para operações mutáveis autenticadas. O frontend nunca persiste credenciais ou tokens no `localStorage`.

O cadastro cria uma identidade única com um perfil inicial WORK ou LEARN; a sessão permite alternar entre ambos. Conversas, mensagens e histórico de ferramentas são consultados no contexto explícito do usuário autenticado e do ambiente; IDs de outras pessoas ou de outro ambiente não concedem acesso. Projetos também são isolados por usuário.

## Learn e arquivos

O Learn inclui quatro trilhas, oito aulas, desafios e progresso persistido por usuário. A avaliação de respostas depende de um modelo OpenRouter habilitado; sem configuração, a indisponibilidade é informada e o progresso não é registrado como se a resposta tivesse sido avaliada.

O gerenciador de arquivos permite organizar pastas e arquivos por usuário e ambiente; arquivos podem ser associados a projetos Work. Os metadados ficam no PostgreSQL e o conteúdo binário fica no disco local. Por padrão, o backend usa `apps/api/storage`; `QAGENT_STORAGE_DIR` pode apontar para outro diretório. O limite de upload é 10 MB. Inclua esse diretório e o volume PostgreSQL nos backups: restaurar somente o banco não recupera o conteúdo dos arquivos, e restaurar somente os arquivos não recupera seus metadados.

## Estado da fundação

Implementados: cadastro com telefone obrigatório, login, logout, alteração de senha, dados de conta e preferências persistidas, dashboards Work/Learn, quatro trilhas com progresso, alternância de ambiente, conversas independentes e por projeto, CRUD de projetos, contexto de projeto limitado e recuperado por relevância, conhecimento/tarefas/diagramas, gerenciador de arquivos persistente, ferramentas de análise de requisitos/riscos/casos de teste/BDD, Markdown sanitizado, validação, tratamento padronizado de erros, Swagger e health check. A integração OpenRouter fica no backend e informa indisponibilidade sem fallback automático. O chat envia o histórico da conversa atual e, em conversas Work vinculadas a projeto, contexto relevante do mesmo projeto; não compartilha automaticamente o histórico integral de outras conversas.

Recuperação de senha depende de configurar e validar um serviço de e-mail. A prevenção de informações inventadas nas respostas da IA e a pertinência/completude das recomendações de QA não estão aprovadas: há uma validação anterior que apresentou detalhes técnicos não fornecidos. Respostas geradas e avaliações do Learn exigem uma chave e um modelo habilitados no OpenRouter; chamadas em produção podem ter custo e não são realizadas pelos testes automatizados.

Consulte o [plano de evolução das capacidades de QA](./docs/requirements/qa-assistant-roadmap.md) para limitações conhecidas, prioridades e critérios de aceite.
