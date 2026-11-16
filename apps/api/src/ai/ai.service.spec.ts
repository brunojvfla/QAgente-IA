import { BadRequestException, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { afterAll } from "@jest/globals";
import OpenAI from "openai";
import { AiService } from "./ai.service";

jest.mock("openai", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: "Resposta da QIA" } }],
          usage: { prompt_tokens: 12, completion_tokens: 8 },
        }),
      },
    },
  })),
}));

describe("AiService", () => {
  const openAIMock = jest.mocked(OpenAI);
  const originalFetch = globalThis.fetch;
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = fetchMock;
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: [
          { id: "provider/model-free:free", pricing: { prompt: "0", completion: "0" } },
          { id: "provider/model-paid", pricing: { prompt: "0.001", completion: "0.002" } },
        ],
      }),
    } as Response);
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  it("uses the OpenRouter-compatible API, supports provider model IDs, and returns usage", async () => {
    const service = new AiService(
      new ConfigService({
        OPENAI_API_KEY: "sk-or-test-key",
        OPENAI_BASE_URL: "https://openrouter.ai/api/v1",
        OPENAI_MODEL: "provider/model-free:free",
        WEB_ORIGIN: "http://localhost:3110",
      }),
    );
    const result = await service.generateReply(
      [{ role: "USER", content: "Como estruturo os testes?" }],
      "WORK",
    );

    expect(result).toEqual({
      text: "Resposta da QIA",
      model: "provider/model-free:free",
      inputTokens: 12,
      outputTokens: 8,
    });
    expect(openAIMock).toHaveBeenCalledWith({
      apiKey: "sk-or-test-key",
      baseURL: "https://openrouter.ai/api/v1",
      timeout: 90_000,
      maxRetries: 0,
      defaultHeaders: {
        "HTTP-Referer": "http://localhost:3110",
        "X-Title": "QAgent",
      },
    });
    expect(openAIMock.mock.results[0]?.value.chat.completions.create).toHaveBeenCalledWith({
      model: "provider/model-free:free",
      messages: [
        {
          role: "system",
          content: expect.stringContaining("assistente profissional de Quality Assurance"),
        },
        { role: "user", content: "Como estruturo os testes?" },
      ],
      max_tokens: 3000,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/models",
      expect.objectContaining({
        headers: { Authorization: "Bearer sk-or-test-key" },
      }),
    );
  });

  it("adapts QA answers to a full, relevant analysis and recommends existing tools", async () => {
    const service = new AiService(
      new ConfigService({
        OPENAI_API_KEY: "sk-or-test-key",
        OPENAI_MODEL: "provider/model-free:free",
      }),
    );

    await service.generateReply(
      [{ role: "USER", content: "Como valido esta história de usuário?" }],
      "WORK",
      { writingStyle: "NATURAL", responseDetail: "SHORT", aiModel: null },
    );

    const request = openAIMock.mock.results[0]?.value.chat.completions.create;
    const systemPrompt = request.mock.calls[0]?.[0].messages[0];
    expect(systemPrompt).toEqual(
      expect.objectContaining({
        content: expect.stringContaining("Não recomende todos por padrão"),
      }),
    );
    expect(systemPrompt).toEqual(
      expect.objectContaining({
        content: expect.stringContaining("/work/tools/test-cases"),
      }),
    );
    expect(systemPrompt).toEqual(
      expect.objectContaining({
        content: expect.stringContaining("não omita itens essenciais"),
      }),
    );
    expect(systemPrompt).toEqual(
      expect.objectContaining({
        content: expect.stringContaining("Trate como fatos exclusivamente as informações da pessoa"),
      }),
    );
    expect(systemPrompt).toEqual(
      expect.objectContaining({
        content: expect.stringContaining("até cinco cenários representativos"),
      }),
    );
  });

  it("does not call the provider when the key is missing", async () => {
    const service = new AiService(new ConfigService({ OPENAI_MODEL: "provider/model-free:free" }));

    await expect(
      service.generateReply([{ role: "USER", content: "Olá" }], "LEARN"),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(openAIMock).not.toHaveBeenCalled();
  });

  it("advertises only configured models present in the OpenRouter catalog and marks free pricing", async () => {
    const service = new AiService(
      new ConfigService({
        OPENAI_API_KEY: "sk-or-test-key",
        OPENAI_MODEL: "provider/model-free:free",
        OPENAI_MODELS: "provider/model-paid, provider/not-listed",
      }),
    );

    await expect(service.getModelConfiguration()).resolves.toEqual({
      models: ["provider/model-paid", "provider/model-free:free"],
      freeModels: ["provider/model-free:free"],
      unavailableModels: ["provider/not-listed"],
      defaultModel: "provider/model-free:free",
      configured: true,
    });
  });

  it("does not send a request for a configured model absent from the provider catalog", async () => {
    const service = new AiService(
      new ConfigService({
        OPENAI_API_KEY: "sk-or-test-key",
        OPENAI_MODEL: "provider/no-longer-available",
      }),
    );

    await expect(
      service.generateReply([{ role: "USER", content: "Olá" }], "WORK"),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(openAIMock).not.toHaveBeenCalled();
  });

  it("rejects a user-selected model that is not enabled by backend configuration", async () => {
    const service = new AiService(
      new ConfigService({
        OPENAI_API_KEY: "sk-or-test-key",
        OPENAI_MODEL: "provider/model-free:free",
        OPENAI_MODELS: "provider/model-paid",
      }),
    );

    await expect(
      service.generateReply([{ role: "USER", content: "Olá" }], "WORK", {
        writingStyle: "BALANCED",
        responseDetail: "MEDIUM",
        aiModel: "provider/other-model",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(openAIMock).not.toHaveBeenCalled();
  });

  it("evaluates lesson answers semantically and accepts only a valid structured result", async () => {
    const create = jest.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              score: 86,
              feedback: "Você distinguiu prevenção de avaliação.",
              strengths: ["Exemplos coerentes."],
              improvements: ["Detalhe a evidência de teste."],
            }),
          },
        },
      ],
      usage: { prompt_tokens: 80, completion_tokens: 25 },
    });
    openAIMock.mockImplementationOnce(
      () =>
        ({
          chat: { completions: { create } },
        }) as unknown as OpenAI,
    );
    const service = new AiService(
      new ConfigService({
        OPENAI_API_KEY: "sk-or-test-key",
        OPENAI_MODEL: "provider/model-free:free",
      }),
    );

    const evaluation = await service.evaluateLearningAnswer(
      {
        title: "Fundamentos de QA",
        content: ["QA atua sobre processos."],
        prompt: "Explique a diferença entre QA e teste.",
        criteria: ["Distingue prevenção de avaliação."],
        answer: "QA previne problemas no processo; testes avaliam o produto.",
      },
      { writingStyle: "BALANCED", responseDetail: "MEDIUM", aiModel: null },
    );

    expect(evaluation).toMatchObject({
      score: 86,
      model: "provider/model-free:free",
      strengths: ["Exemplos coerentes."],
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({ role: "user", content: expect.stringContaining("assessmentCriteria") }),
        ]),
      }),
    );
  });

  it("rejects malformed structured evaluations instead of saving a success-shaped fallback", async () => {
    openAIMock.mockImplementationOnce(
      () =>
        ({
          chat: {
            completions: {
              create: jest.fn().mockResolvedValue({
                choices: [{ message: { content: "Resposta sem JSON" } }],
              }),
            },
          },
        }) as unknown as OpenAI,
    );
    const service = new AiService(
      new ConfigService({
        OPENAI_API_KEY: "sk-or-test-key",
        OPENAI_MODEL: "provider/model-free:free",
      }),
    );

    await expect(
      service.evaluateLearningAnswer(
        {
          title: "Fundamentos",
          content: ["Conteúdo"],
          prompt: "Exercício",
          criteria: ["Critério"],
          answer: "Resposta",
        },
        { writingStyle: "BALANCED", responseDetail: "MEDIUM", aiModel: null },
      ),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
