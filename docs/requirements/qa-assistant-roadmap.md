# Plano de evolução das capacidades de QA

Este documento organiza o próximo incremento do QAgent. É planejamento; não representa funcionalidades já implementadas.

## Situação atual

| Capacidade | Estado | Evidência funcional |
| --- | --- | --- |
| Análise de requisitos | Implementada | Ferramenta Work dedicada para extrair requisitos, critérios, ambiguidades e perguntas em aberto. |
| Análise de riscos | Implementada parcialmente | Ferramenta dedicada avalia impacto, probabilidade qualitativa e mitigação a partir do material fornecido; não monta ainda uma estratégia integrada de regressão e cobertura. |
| Casos de teste | Implementada | Ferramenta dedicada gera casos rastreáveis, pré-condições, passos e resultados esperados. |
| BDD | Implementada | Ferramenta dedicada converte comportamentos informados em cenários Gherkin. |
| Chat de QA | Implementado parcialmente | Usa ambientes, histórico, preferências e instruções para separar fatos, hipóteses e recomendações; orienta uma análise técnica completa e seletiva. Uma validação real com o modelo configurado ainda incluiu nomes de provedores e rotas de API não fornecidos, apesar das instruções para não presumir detalhes. Portanto, a prevenção de informações inventadas não está aprovada; a completude e a precisão dependem do modelo. |
| Seleção de ferramenta | Implementado parcialmente | O prompt pode sugerir links para requisitos, riscos, casos de teste ou BDD, e links internos abrem o submódulo correspondente. Não há pré-preenchimento automático nem execução silenciosa. |
| Tipos de teste | Implementado parcialmente | As instruções do chat e dos casos de teste pedem recomendação contextual com justificativa e cenários positivos/negativos/alternativos/de limite quando sustentados pelo contexto. Ainda requer validação funcional mais ampla com diferentes demandas e modelos. |
| Estilo e nível de detalhe | Implementados parcialmente | As preferências são persistidas e aplicadas ao prompt. Falta garantir que pedidos técnicos recebam os itens pertinentes sem omissões, enquanto dúvidas simples continuam concisas. |
| Disponibilidade de IA no ambiente local | Implementada e validada | O backend usa OpenRouter, consulta o catálogo e identifica preços gratuitos quando entrada e saída custam zero. Chamadas reais de chat e de casos de teste funcionaram; a execução da ferramenta foi persistida no histórico após reiniciar a API com a build atualizada. Disponibilidade, limites e tempos de resposta continuam sujeitos ao provedor. Não registrar nem compartilhar a chave. |

As quatro ferramentas e os comportamentos existentes devem ser aprimorados, não duplicados nem substituídos por protótipos.

## Requisitos para a análise integrada

Ao receber uma demanda técnica ou cenário de QA, a QIA deve entender o comportamento sob validação e produzir uma resposta completa na medida do que o contexto permite:

1. Resumir o entendimento da demanda e o comportamento a validar.
2. Separar fatos fornecidos, hipóteses e recomendações; apontar ambiguidades e perguntas em aberto sem inventar regras.
3. Identificar riscos, criticidade, impacto, probabilidade qualitativa, dependências, integrações e áreas suscetíveis a regressão, justificando prioridades.
4. Recomendar somente os tipos de teste pertinentes ao caso, explicando o motivo. Considerar, quando fizer sentido, testes funcionais, exploratórios, regressivos, de integração, E2E, API, UI, unidade, segurança, desempenho, compatibilidade, acessibilidade e variações positivas, negativas e de limite.
5. Entregar cenários acionáveis com objetivo, pré-condições/dados necessários, passos, resultado esperado e prioridade.
6. Sinalizar quais cenários podem ser automatizados, ferramentas candidatas e se o custo da automação se justifica; não presumir stack ou ferramentas indisponíveis.
7. Usar organização natural: dúvidas simples continuam diretas; análises técnicas trazem estrutura prática. Preferências de concisão podem reduzir redundância, mas não devem remover informações importantes para executar a validação.
8. Quando faltarem dados, declarar a limitação e pedir esclarecimentos quando isso for necessário para uma recomendação confiável.

## Backlog priorizado

| ID / prioridade | Estado | Entrega | Dependências |
| --- | --- | --- | --- |
| `qagent-openai-runtime-config` / P0 | Concluída | Adaptar a integração ao OpenRouter, preservar a configuração local, consultar catálogo/preços e validar requisições reais sem expor o segredo. Chat e ferramenta TEST_CASES foram validados com sucesso; o resultado da ferramenta foi persistido no histórico. | Chave e modelo OpenRouter configurados pelo usuário. |
| `qagent-qa-analysis` / P1 | Parcialmente implementada; validação real reprovou o critério de não invenção | Consolidar no chat e nas ferramentas a análise contextual e recomendação seletiva. A amostra real do modelo incluiu provedores, armazenamento e rotas de API não informados, apesar de instruções explícitas. Investigar um mecanismo confiável para distinguir fatos e recomendações ou avaliar um modelo mais aderente; repetir testes reais antes de considerar concluído. | Chat e ferramentas QA existentes. |
| `qagent-tool-recommendations` / P2 | Parcialmente implementada | Sugerir e encaminhar às ferramentas existentes de requisitos, riscos, casos de teste e BDD sem duplicação. Definir se/como contexto pode ser pré-preenchido, sempre com ação explícita da pessoa usuária. | `qagent-qa-analysis` e ferramentas QA existentes. |
| `qagent-delivery-validation` / P1 | Em andamento | Typecheck, lint, build da API e 40 testes unitários da API passaram; 11 testes Playwright de fumaça passaram (usam mocks). Health check e fluxos autenticados de Learn e arquivos foram verificados contra a API e o PostgreSQL; o CRUD de arquivos também validou download no disco e isolamento Work/Learn. Nesta rodada não foi feita chamada real ao OpenRouter. Ainda falta validar sistematicamente pertinência/completude da análise em diferentes demandas, ambiguidades, limites e modelos. | `qagent-qa-analysis`, `qagent-tool-recommendations`; modelo habilitado necessário para teste real. |

## Ordem recomendada

1. Resolver o critério de não invenção: a última validação ao vivo ainda produziu detalhes técnicos não fornecidos mesmo após reforçar o prompt. Avaliar abordagem/modelo com validação verificável, sem trocar automaticamente o modelo configurado.
2. Expandir os testes de qualidade das análises com demandas variadas, recomendações pertinentes e contexto insuficiente.
3. Completar o fluxo de recomendação para ferramentas existentes, preservando a escolha do QA e sem execução sem confirmação.
4. Rodar validação de regressão dos critérios de aceite e registrar limites externos remanescentes do modelo/provedor.

## Critérios de aceite

- Não recomendar indiscriminadamente todos os tipos de teste; cada recomendação inclui justificativa contextual.
- Incluir os artefatos aplicáveis à demanda sem exigir pedidos separados por tipo de análise.
- Não apresentar suposições como fatos nem inventar requisitos, dados ou resultados.
- Distinguir cenários positivos, negativos, alternativos e de limite quando sustentados pelo contexto.
- Explicar prioridade e estratégia com base em impacto, probabilidade, criticidade, dependências e regressão.
- Recomendação de automação inclui viabilidade e custo-benefício, sem presumir ferramentas não informadas.
- Conversas simples permanecem naturais e curtas; análises técnicas continuam completas e práticas.
- Sugestões apontam para as ferramentas atuais e preservam seus históricos e controles de acesso.
