import { LearnLesson, LearnLessonSummary, LearnTrack } from "@qagent/shared";

type LessonDefinition = LearnLesson & {
  assessmentCriteria: string[];
};

type TrackDefinition = Omit<LearnTrack, "progress" | "lessons"> & {
  lessons: LessonDefinition[];
};

const curriculum: TrackDefinition[] = [
  {
    id: "qa-fundamentals",
    title: "Fundamentos de QA",
    description: "Compreenda qualidade, prevenção de defeitos e o ciclo de validação.",
    level: "INICIANTE",
    lessons: [
      {
        id: "quality-and-qa",
        trackId: "qa-fundamentals",
        trackTitle: "Fundamentos de QA",
        title: "Qualidade é responsabilidade do processo",
        summary: "Diferencie garantia da qualidade, controle da qualidade e testes.",
        estimatedMinutes: 12,
        content: [
          "Qualidade é o grau em que um produto atende necessidades e requisitos relevantes. Ela é construída durante todo o ciclo de desenvolvimento, não apenas verificada no fim.",
          "Garantia da qualidade (QA) atua sobre processos para reduzir a chance de defeitos. Controle da qualidade avalia o produto e identifica desvios. Teste é uma atividade de avaliação e aprendizado, mas não prova ausência de defeitos.",
          "Uma boa prática de QA torna riscos e critérios de aceite claros, facilita feedback rápido e ajuda a equipe a decidir onde investir esforço de validação.",
        ],
        keyTakeaways: [
          "QA é preventivo e envolve o processo; teste avalia um produto ou artefato.",
          "Encontrar defeitos cedo reduz retrabalho, mas nenhum conjunto de testes garante ausência de falhas.",
        ],
        exercise: {
          id: "qa-vs-test",
          prompt:
            "Explique a diferença entre QA e teste e dê um exemplo de ação preventiva e um exemplo de atividade de teste para uma funcionalidade de cadastro.",
        },
        assessmentCriteria: [
          "Distingue melhoria/prevenção do processo de avaliação do produto.",
          "Apresenta um exemplo coerente de prevenção antes ou durante o desenvolvimento.",
          "Apresenta uma atividade que verifica comportamento observável do cadastro.",
        ],
      },
      {
        id: "test-cycle",
        trackId: "qa-fundamentals",
        trackTitle: "Fundamentos de QA",
        title: "Do objetivo à evidência de teste",
        summary: "Organize planejamento, análise, desenho, execução e encerramento.",
        estimatedMinutes: 10,
        content: [
          "O trabalho de teste começa por entender objetivos, escopo, riscos, pessoas envolvidas e restrições. O plano pode ser ajustado conforme o produto e a informação disponível.",
          "Na análise, os requisitos e outros artefatos são examinados para identificar condições testáveis e lacunas. No desenho, essas condições viram casos, dados e resultados esperados.",
          "A execução compara o resultado observado com o esperado e registra evidências. Desvios precisam ser descritos de forma reproduzível; os resultados também alimentam decisões sobre risco e próximos passos.",
        ],
        keyTakeaways: [
          "Planejamento e análise orientam o que testar e por quê.",
          "Casos executáveis precisam de condições, dados, passos e resultados esperados verificáveis.",
        ],
        exercise: {
          id: "test-evidence",
          prompt:
            "Uma equipe relata que o botão Salvar falha às vezes. Descreva quais informações você coletaria antes de executar o teste e que evidência registraria ao encontrar a falha.",
        },
        assessmentCriteria: [
          "Investiga condições, dados, ambiente e passos para tornar o relato reproduzível.",
          "Distingue resultado esperado de resultado observado.",
          "Cita evidência útil, como mensagem, horário, dados não sensíveis ou captura apropriada.",
        ],
      },
    ],
  },
  {
    id: "test-design",
    title: "Técnicas de teste",
    description: "Aplique particionamento, valores-limite e exploração estruturada.",
    level: "INICIANTE",
    lessons: [
      {
        id: "equivalence-partitions",
        trackId: "test-design",
        trackTitle: "Técnicas de teste",
        title: "Partições de equivalência",
        summary: "Reduza casos usando grupos que devem se comportar de modo semelhante.",
        estimatedMinutes: 11,
        content: [
          "Particionamento de equivalência divide os dados de entrada em grupos para os quais se espera comportamento semelhante. Em geral, escolhe-se ao menos um representante de cada partição relevante.",
          "As partições podem ser válidas ou inválidas. Elas precisam derivar de uma regra conhecida; não se deve inventar limites ou formatos que o requisito não definiu.",
          "A técnica reduz combinações redundantes, mas sua qualidade depende de identificar as partições e regras reais do sistema.",
        ],
        keyTakeaways: [
          "Cada partição representa dados que devem provocar comportamento equivalente.",
          "Regras e limites precisam vir do requisito, não de suposições do testador.",
        ],
        exercise: {
          id: "age-partitions",
          prompt:
            "Neste exercício, considere a regra explícita: um formulário aceita idade inteira de 18 a 65 anos, inclusive. Identifique as partições válidas e inválidas e escolha um valor representativo para cada uma.",
        },
        assessmentCriteria: [
          "Identifica uma partição válida de 18 a 65 inclusive.",
          "Identifica valores abaixo de 18 e acima de 65 como inválidos.",
          "Identifica valores que não sejam inteiros como inválidos ou pede esclarecimento se o domínio não os tratar.",
        ],
      },
      {
        id: "boundary-values",
        trackId: "test-design",
        trackTitle: "Técnicas de teste",
        title: "Análise de valores-limite",
        summary: "Concentre testes nas bordas onde erros de comparação são frequentes.",
        estimatedMinutes: 9,
        content: [
          "A análise de valores-limite complementa partições ao priorizar valores nas fronteiras entre grupos. Erros de comparação, arredondamento ou validação frequentemente aparecem nessas bordas.",
          "Para um intervalo inclusivo de 18 a 65, exemplos relevantes são 17, 18, 19, 64, 65 e 66. A escolha depende do risco e do custo de execução.",
          "Antes de definir o resultado esperado, confirme se o requisito especifica o tipo de dado, a inclusão das bordas e o tratamento de valores ausentes ou malformados.",
        ],
        keyTakeaways: [
          "Teste valores imediatamente antes, na borda e depois do limite.",
          "Não atribua comportamento a casos que o requisito não definiu.",
        ],
        exercise: {
          id: "boundary-age",
          prompt:
            "Usando a regra de idade inteira de 18 a 65, inclusive, proponha os valores de fronteira a testar e explique o resultado esperado para cada grupo.",
        },
        assessmentCriteria: [
          "Inclui 17, 18, 19, 64, 65 e 66 ou um conjunto equivalente que cubra as duas bordas.",
          "Classifica corretamente 18 e 65 como aceitos e os valores imediatamente externos como rejeitados.",
          "Justifica que valores adjacentes ajudam a detectar erros de limite.",
        ],
      },
    ],
  },
  {
    id: "requirements-and-bdd",
    title: "Requisitos e BDD",
    description: "Transforme necessidades em critérios claros e exemplos verificáveis.",
    level: "INTERMEDIARIO",
    lessons: [
      {
        id: "acceptance-criteria",
        trackId: "requirements-and-bdd",
        trackTitle: "Requisitos e BDD",
        title: "Critérios de aceite verificáveis",
        summary: "Escreva critérios observáveis, objetivos e sem ambiguidades.",
        estimatedMinutes: 12,
        content: [
          "Um critério de aceite descreve uma condição observável que precisa ser satisfeita para considerar uma entrega aceitável. Deve ser claro o bastante para orientar desenvolvimento e validação.",
          "Termos subjetivos como rápido, intuitivo ou adequado precisam de esclarecimento: quais condições, medidas ou exemplos definem o resultado esperado?",
          "Critérios não devem antecipar uma implementação sem necessidade. Separe regras de negócio confirmadas de hipóteses e perguntas em aberto.",
        ],
        keyTakeaways: [
          "Critérios observáveis permitem comparar resultado esperado com comportamento real.",
          "Ambiguidades devem virar perguntas, não regras inventadas.",
        ],
        exercise: {
          id: "clarify-criteria",
          prompt:
            "Considere o pedido: 'o sistema deve enviar a confirmação rapidamente'. Reescreva o critério sem inventar um prazo e liste as perguntas necessárias para torná-lo testável.",
        },
        assessmentCriteria: [
          "Não inventa um limite temporal que não foi fornecido.",
          "Explicita que o prazo ou a definição de rapidez precisa ser acordado.",
          "Formula perguntas objetivas sobre início da medição, canais e condições relevantes.",
        ],
      },
      {
        id: "gherkin-scenarios",
        trackId: "requirements-and-bdd",
        trackTitle: "Requisitos e BDD",
        title: "BDD com exemplos concretos",
        summary: "Estruture contexto, ação e resultado em cenários Gherkin.",
        estimatedMinutes: 13,
        content: [
          "BDD facilita conversas sobre comportamento usando exemplos compartilhados entre produto, desenvolvimento e QA. Gherkin organiza o exemplo em Dado, Quando e Então.",
          "Dado descreve o contexto, Quando a ação ou evento, e Então o resultado observável. Um cenário deve focar um comportamento e evitar misturar múltiplas regras independentes.",
          "Os exemplos precisam refletir requisitos confirmados. Quando falta informação, registre uma pergunta em vez de completar o cenário com uma suposição.",
        ],
        keyTakeaways: [
          "Use Dado/Quando/Então para expressar contexto, ação e resultado.",
          "Cada resultado deve ser rastreável a uma regra confirmada.",
        ],
        exercise: {
          id: "gherkin-login",
          prompt:
            "Escreva um cenário Gherkin para login bem-sucedido usando apenas estes fatos: o usuário possui credenciais válidas e, ao enviá-las, o sistema mostra a página inicial autenticada.",
        },
        assessmentCriteria: [
          "Inclui contexto de usuário com credenciais válidas.",
          "Descreve o envio das credenciais como ação.",
          "Usa a exibição da página inicial autenticada como resultado, sem adicionar comportamento extra.",
        ],
      },
    ],
  },
  {
    id: "qa-strategy",
    title: "Estratégia e risco",
    description: "Priorize testes por risco e selecione níveis de validação adequados.",
    level: "INTERMEDIARIO",
    lessons: [
      {
        id: "risk-based-testing",
        trackId: "qa-strategy",
        trackTitle: "Estratégia e risco",
        title: "Teste baseado em risco",
        summary: "Direcione esforço considerando impacto, probabilidade e evidências.",
        estimatedMinutes: 11,
        content: [
          "Teste baseado em risco prioriza validações conforme a possibilidade de falha e suas consequências para usuários, negócio e operação.",
          "A análise pode considerar criticidade, novidade, complexidade, dependências, histórico de defeitos e facilidade de detecção. A prioridade deve ser justificada com evidências disponíveis.",
          "Uma estimativa qualitativa não é uma probabilidade medida. Quando faltam dados, registre incerteza e confirme a decisão com as pessoas responsáveis.",
        ],
        keyTakeaways: [
          "Priorize pela combinação de chance e impacto, sustentada por evidências.",
          "Não apresente julgamentos qualitativos como métricas exatas.",
        ],
        exercise: {
          id: "risk-priority",
          prompt:
            "Uma alteração afeta a autenticação e uma tela informativa. Sem dados históricos, descreva quais perguntas e evidências usaria para priorizar os testes sem inventar probabilidades numéricas.",
        },
        assessmentCriteria: [
          "Considera consequências para usuários e criticidade do fluxo de autenticação.",
          "Pede informações sobre escopo, dependências, histórico e impacto da tela informativa.",
          "Evita atribuir percentuais ou probabilidades sem evidência.",
        ],
      },
      {
        id: "test-levels",
        trackId: "qa-strategy",
        trackTitle: "Estratégia e risco",
        title: "Níveis e tipos de teste",
        summary: "Escolha a camada de validação pelo objetivo e pelo risco.",
        estimatedMinutes: 10,
        content: [
          "Testes de unidade avaliam partes pequenas e isoladas. Testes de integração verificam interações entre componentes. Testes de sistema ou ponta a ponta observam fluxos completos do ponto de vista definido.",
          "Testes funcionais verificam comportamentos; regressivos reavaliam áreas afetadas por mudanças; exploratórios usam aprendizado e investigação para descobrir riscos não cobertos por casos conhecidos.",
          "A escolha depende do objetivo, da arquitetura conhecida, do risco e do custo de feedback. Não é necessário testar tudo em todas as camadas.",
        ],
        keyTakeaways: [
          "Nível indica escopo; tipo indica objetivo ou abordagem de teste.",
          "Escolha a camada que oferece evidência útil com custo adequado.",
        ],
        exercise: {
          id: "test-level-choice",
          prompt:
            "Para validar uma regra de cálculo isolada e depois confirmar que o fluxo de compra a usa corretamente, escolha um nível de teste para cada objetivo e justifique.",
        },
        assessmentCriteria: [
          "Escolhe teste de unidade ou equivalente para a regra isolada.",
          "Escolhe integração, sistema ou ponta a ponta para verificar o fluxo de compra completo.",
          "Justifica a diferença de escopo e o valor da evidência de cada camada.",
        ],
      },
    ],
  },
];

export function getCurriculumTracks() {
  return curriculum;
}

export function findCurriculumTrack(trackId: string) {
  return curriculum.find((track) => track.id === trackId);
}

export function findCurriculumLesson(lessonId: string) {
  for (const track of curriculum) {
    const lesson = track.lessons.find((item) => item.id === lessonId);
    if (lesson) return lesson;
  }
  return undefined;
}

export function publicLesson(lesson: LessonDefinition): LearnLesson {
  return {
    id: lesson.id,
    trackId: lesson.trackId,
    trackTitle: lesson.trackTitle,
    title: lesson.title,
    summary: lesson.summary,
    estimatedMinutes: lesson.estimatedMinutes,
    content: lesson.content,
    keyTakeaways: lesson.keyTakeaways,
    exercise: lesson.exercise,
  };
}

export function publicLessonSummary(lesson: LessonDefinition): LearnLessonSummary {
  return {
    id: lesson.id,
    title: lesson.title,
    summary: lesson.summary,
    estimatedMinutes: lesson.estimatedMinutes,
  };
}
