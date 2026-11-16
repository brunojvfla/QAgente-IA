# Modelo inicial de dados

- `User`: identidade compartilhada entre Work e Learn, e-mail normalizado, telefone opcional para compatibilidade dos registros antigos, hash Argon2id, status e preferências gerais da QIA.
- `Profile`: ambiente escolhido no cadastro; no máximo um por usuário.
- `Conversation`: dono e ambiente explícitos; `projectId` e `archivedAt` opcionais; Work e Learn mantêm históricos separados mesmo para a mesma conta.
- `Message`: conteúdo e papel vinculados à conversa.
- `Project`: projeto privado do usuário, com categoria e status ativo/arquivado.
- `ProjectKnowledge`: documentos, decisões, requisitos e links HTTPS consultáveis pelo contexto de conversas do mesmo projeto.
- `ProjectTask`: tarefas com status, prioridade e prazo opcional.
- `ProjectDiagram`: diagramas persistidos como JSON validado de nós e conexões.
- `ToolExecution`: entrada, resultado, modelo e uso retornados pelas ferramentas de QA, vinculados ao usuário e ao ambiente Work.
- `LearnProgress`: progresso por usuário e aula da trilha.
- `LearningAttempt`: respostas e avaliações persistidas por usuário e desafio.
- `FileFolder`: pastas hierárquicas vinculadas ao usuário, ambiente e, opcionalmente, projeto Work.
- `WorkspaceFile`: metadados do arquivo e chave opaca para o conteúdo armazenado no disco local.

O catálogo do Learn (trilhas e aulas) é conteúdo estático versionado no backend; progresso e tentativas são persistidos no banco. O conteúdo binário dos arquivos fica no diretório local configurado por `QAGENT_STORAGE_DIR`, ou por padrão em `apps/api/storage`; o banco guarda seus metadados e uma chave opaca.

As migrations `account_settings`, `qa_tool_executions`, `project_workspaces`, `learn_progress` e `workspace_files` são aditivas e não removem os registros existentes. A migration de projetos acrescenta colunas opcionais/defaulted, índices e tabelas com foreign keys em cascata; conversas antigas permanecem sem projeto. Foreign keys, índices e unicidade são mantidos no PostgreSQL pelo Prisma. Regras de propriedade e ambiente são aplicadas também nas consultas da API, não apenas na interface. Para um backup recuperável, preserve juntos o volume PostgreSQL e o diretório de arquivos.
