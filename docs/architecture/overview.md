# Visão da arquitetura

QAgent começa como monólito modular: Next.js entrega as experiências Work/Learn e NestJS concentra regras de negócio, autenticação, autorização, acesso ao PostgreSQL e integração com IA. A comunicação é REST; OpenAPI fica disponível via Swagger. O backend acessa o OpenRouter por sua API compatível com OpenAI; a chave nunca é enviada ao frontend.

O perfil do usuário determina seu ambiente. Conversas armazenam explicitamente o ambiente e todas as operações de conversa combinam proprietário e ambiente na consulta. Mensagens são alcançadas somente por uma conversa pertencente ao usuário. PostgreSQL/Prisma constitui a fonte persistente; a integração OpenRouter é opcional e acessada exclusivamente pelo backend. `OPENAI_API_KEY` contém a chave do OpenRouter, `OPENAI_MODEL`/`OPENAI_MODELS` limitam os IDs de modelo habilitados e `OPENAI_BASE_URL` pode definir `https://openrouter.ai/api/v1`. O backend verifica os IDs no catálogo e não faz fallback automático. O status de modelo grátis reflete apenas preços de entrada e saída informados no catálogo no instante da consulta.

## Espaços de projeto no Work

Uma conversa Work pode estar sem projeto ou vinculada a um projeto do mesmo usuário. O vínculo é opcional para manter acessíveis as conversas antigas e independentes. Projetos possuem status e categoria; conhecimento (documentos, decisões, requisitos e links HTTPS), tarefas e diagramas editáveis pertencem ao projeto e são protegidos por sua propriedade.

Ao responder em uma conversa vinculada, a QIA recebe os metadados do projeto, no máximo cinco informações registradas lexicalmente relevantes e até cinco tarefas abertas selecionadas entre as mais recentes. O conteúdo é limitado a aproximadamente 6.000 caracteres no total. O histórico integral de outras conversas não é consultado nem compartilhado; projetos diferentes e conversas independentes não recebem esse contexto. A geração de diagramas retorna nós e conexões validados para edição no cliente; a chave do provedor permanece no backend.

## Learn e arquivos locais

O catálogo Learn é versionado no backend; tentativas e progresso são persistidos por usuário no PostgreSQL. Arquivos são separados por usuário e ambiente, com associação opcional a um projeto Work. O PostgreSQL guarda metadados; o conteúdo binário é gravado localmente em `QAGENT_STORAGE_DIR` ou, por padrão, em `apps/api/storage`. O limite por upload é 10 MB. Backups e restaurações precisam considerar o banco e esse diretório em conjunto.

## Decisões iniciais

- Sessão JWT em cookie HttpOnly, SameSite=Lax e Secure em produção, com double-submit CSRF vinculado ao claim CSRF da sessão.
- Argon2id para hashes de senha.
- Um perfil por usuário nesta etapa; Work e Learn são experiências mutuamente exclusivas por conta.
- Sem microsserviços, armazenamento em memória como fonte de verdade ou respostas de IA simuladas.
