import { expect, test } from "@playwright/test";

test("página inicial encaminha para login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText(/bem-vindo de volta/i)).toBeVisible();
});

test("cadastro oferece escolha do ambiente", async ({ page }) => {
  await page.goto("/register");
  await expect(page.getByRole("heading", { name: /crie sua conta/i })).toBeVisible();
  await expect(page.getByRole("radio", { name: /qagent work/i })).toBeVisible();
  await expect(page.getByRole("radio", { name: /qagent learn/i })).toBeVisible();
  await expect(page.getByLabel("Telefone")).toBeVisible();
  await expect(page.getByLabel("Confirmar senha")).toBeVisible();
});

test("seletor alterna e persiste o tema", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Ativar tema escuro" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.reload();

  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Ativar tema claro" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("tokens de cor e superfícies mantêm contraste nos dois temas", async ({ page }) => {
  await page.goto("/register");

  const lightTokens = await page.locator("html").evaluate((root) => {
    const styles = getComputedStyle(root);
    const card = document.querySelector("main > section:last-of-type");
    return {
      background: styles.getPropertyValue("--background").trim(),
      text: styles.getPropertyValue("--text-primary").trim(),
      secondary: styles.getPropertyValue("--text-secondary").trim(),
      border: styles.getPropertyValue("--border-default").trim(),
      brand: styles.getPropertyValue("--brand-primary").trim(),
      cardBackground: card ? getComputedStyle(card).backgroundColor : null,
      cardShadow: card ? getComputedStyle(card).boxShadow : null,
      backgroundImage: getComputedStyle(document.body).backgroundImage,
    };
  });

  expect(lightTokens).toMatchObject({
    background: "#f4f5f7",
    text: "#111827",
    secondary: "#4b5563",
    border: "#e5e7eb",
    brand: "#d93645",
    cardBackground: "rgb(255, 255, 255)",
  });
  expect(lightTokens.cardShadow).toContain("0.05");
  expect(lightTokens.backgroundImage).not.toBe("none");

  await page.getByRole("button", { name: "Ativar tema escuro" }).click();
  const darkTokens = await page.locator("html").evaluate((root) => {
    const styles = getComputedStyle(root);
    return {
      background: styles.getPropertyValue("--background").trim(),
      surface: styles.getPropertyValue("--surface").trim(),
      text: styles.getPropertyValue("--text-primary").trim(),
    };
  });

  expect(darkTokens).toEqual({
    background: "#0b0b0f",
    surface: "#1a1a1f",
    text: "#f5f5f5",
  });
});

test("excluir conversa pede confirmação e remove o histórico", async ({ page }) => {
  const conversationId = "00000000-0000-4000-8000-000000000001";
  let deleteCalled = false;
  let conversations = [
    {
      id: conversationId,
      title: "Roteiro QA",
      environment: "WORK",
      updatedAt: new Date().toISOString(),
    },
  ];

  await page.setViewportSize({ width: 320, height: 640 });
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname === "/api/auth/me") {
      await route.fulfill({
        json: {
          id: "00000000-0000-4000-8000-000000000002",
          name: "Pessoa QA",
          email: "qa@example.com",
          profile: "WORK",
        },
      });
      return;
    }

    if (url.pathname === "/api/conversations" && request.method() === "GET") {
      await route.fulfill({ json: conversations });
      return;
    }

    if (url.pathname === "/api/projects") {
      await route.fulfill({ json: [] });
      return;
    }

    if (
      url.pathname === `/api/conversations/${conversationId}` &&
      request.method() === "DELETE"
    ) {
      deleteCalled = true;
      conversations = [];
      await route.fulfill({ status: 204 });
      return;
    }

    await route.fulfill({ status: 404, json: { message: "Rota não esperada no teste." } });
  });
  await page.goto("/work/conversations");
  await page.getByRole("button", { name: "Excluir conversa Roteiro QA" }).click();

  const confirmation = page.getByRole("dialog");
  await expect(confirmation.getByRole("heading", { name: "Excluir conversa?" })).toBeVisible();
  const dialogBounds = await confirmation.boundingBox();
  if (!dialogBounds) throw new Error("O diálogo de exclusão não está visível.");
  expect(Math.abs(dialogBounds.x + dialogBounds.width / 2 - 160)).toBeLessThanOrEqual(1);
  const cancelBounds = await confirmation.getByRole("button", { name: "Cancelar" }).boundingBox();
  if (!cancelBounds) throw new Error("O botão Cancelar não está visível.");
  expect(cancelBounds.x).toBeGreaterThanOrEqual(dialogBounds.x);
  expect(cancelBounds.x + cancelBounds.width).toBeLessThanOrEqual(
    dialogBounds.x + dialogBounds.width,
  );
  await confirmation.getByRole("button", { name: "Cancelar" }).click();
  await expect(confirmation).not.toBeVisible();
  expect(deleteCalled).toBe(false);

  await page.getByRole("button", { name: "Excluir conversa Roteiro QA" }).click();
  await confirmation.getByRole("button", { name: "Confirmar exclusão" }).click();

  await expect(page.getByText("Nenhuma conversa corresponde aos filtros.")).toBeVisible();
  expect(deleteCalled).toBe(true);
});

test("the same authenticated account can switch environments", async ({ page }) => {
  const requestedEnvironments: string[] = [];

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname === "/api/auth/me") {
      await route.fulfill({
        json: {
          id: "00000000-0000-4000-8000-000000000003",
          name: "Pessoa QA",
          email: "qa@example.com",
          phone: "+5511999999999",
          profile: "WORK",
        },
      });
      return;
    }

    if (url.pathname === "/api/conversations" && request.method() === "GET") {
      requestedEnvironments.push(url.searchParams.get("environment") || "");
      await route.fulfill({ json: [] });
      return;
    }

    if (url.pathname === "/api/projects") {
      await route.fulfill({ json: [] });
      return;
    }

    await route.fulfill({ status: 404, json: { message: "Rota não esperada no teste." } });
  });

  await page.goto("/learn");
  await expect(page.getByText("QAgent Learn", { exact: true }).first()).toBeVisible();
  await page.getByRole("link", { name: "Work", exact: true }).first().click();
  await expect(page).toHaveURL(/\/work$/);
  await expect(page.getByText("QAgent Work", { exact: true }).first()).toBeVisible();
  expect(requestedEnvironments).toContain("LEARN");
  expect(requestedEnvironments).toContain("WORK");
});

test("chat sends on Enter, preserves failures, and renders safe Markdown", async ({ page }) => {
  const conversationId = "00000000-0000-4000-8000-000000000004";
  let sendCount = 0;
  const sentMessages: string[] = [];

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname === "/api/auth/me") {
      await route.fulfill({
        json: {
          id: "00000000-0000-4000-8000-000000000005",
          name: "Pessoa QA",
          email: "qa@example.com",
          phone: "+5511999999999",
          profile: "WORK",
        },
      });
      return;
    }

    if (url.pathname === "/api/conversations" && request.method() === "GET") {
      await route.fulfill({
        json: [{
          id: conversationId,
          title: "Chat de teste",
          environment: "WORK",
          updatedAt: new Date().toISOString(),
        }],
      });
      return;
    }

    if (url.pathname === `/api/conversations/${conversationId}/messages` && request.method() === "GET") {
      await route.fulfill({
        json: [{
          id: "assistant-initial",
          role: "ASSISTANT",
          content: "**Resposta formatada**\n\n<script>alert(1)</script>",
          createdAt: new Date().toISOString(),
        }],
      });
      return;
    }

    if (url.pathname === `/api/conversations/${conversationId}/messages` && request.method() === "POST") {
      sendCount += 1;
      const body = request.postDataJSON() as { content: string };
      sentMessages.push(body.content);
      if (sendCount === 1) {
        await route.fulfill({
          json: {
            userMessage: {
              id: "user-message",
              role: "USER",
              content: body.content,
              createdAt: new Date().toISOString(),
            },
            assistantMessage: {
              id: "assistant-message",
              role: "ASSISTANT",
              content: "Recebido",
              createdAt: new Date().toISOString(),
            },
          },
        });
      } else {
        await route.fulfill({ status: 503, json: { message: "IA temporariamente indisponível." } });
      }
      return;
    }

    await route.fulfill({ status: 404, json: { message: "Rota não esperada no teste." } });
  });

  await page.goto(`/work/conversations/${conversationId}`);
  const composer = page.getByPlaceholder("Escreva sua mensagem...");
  await expect(page.getByText("Resposta formatada", { exact: true })).toBeVisible();
  const assistantReply = page.locator(".mr-auto").filter({ hasText: "Resposta formatada" });
  await expect(assistantReply.locator("script")).toHaveCount(0);

  await composer.fill("Mensagem pelo Enter");
  await composer.press("Enter");
  await expect.poll(() => sendCount).toBe(1);
  await expect(composer).toHaveValue("");

  await composer.fill("linha 1");
  await composer.press("Shift+Enter");
  await composer.type("linha 2");
  await expect(composer).toHaveValue("linha 1\nlinha 2");
  await composer.press("Enter");
  await expect.poll(() => sendCount).toBe(2);
  await expect(composer).toHaveValue("linha 1\nlinha 2");
  expect(sentMessages).toEqual(["Mensagem pelo Enter", "linha 1\nlinha 2"]);
  await expect(page.locator("main [role=alert]")).toContainText("temporariamente indisponível");
});

test("settings persist account, assistant preferences, and password changes", async ({ page }) => {
  let savedAccount: { name: string; email: string; phone: string } | undefined;
  let savedPreferences:
    | { writingStyle: string; responseDetail: string; aiModel: string | null }
    | undefined;
  let passwordChange:
    | { currentPassword: string; newPassword: string }
    | undefined;

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname === "/api/auth/me") {
      await route.fulfill({
        json: {
          id: "00000000-0000-4000-8000-000000000006",
          name: "Pessoa QA",
          email: "qa@example.com",
          phone: "+5511999999999",
          profile: "WORK",
        },
      });
      return;
    }

    if (url.pathname === "/api/conversations" || url.pathname === "/api/projects") {
      await route.fulfill({ json: [] });
      return;
    }

    if (url.pathname === "/api/users/me/settings" && request.method() === "GET") {
      await route.fulfill({
        json: { writingStyle: "BALANCED", responseDetail: "MEDIUM", aiModel: null },
      });
      return;
    }

    if (url.pathname === "/api/ai/models") {
      await route.fulfill({
        json: {
          models: ["gpt-4o-mini"],
          freeModels: [],
          unavailableModels: [],
          defaultModel: "gpt-4o-mini",
          configured: true,
        },
      });
      return;
    }

    if (url.pathname === "/api/users/me" && request.method() === "PATCH") {
      savedAccount = request.postDataJSON() as typeof savedAccount;
      await route.fulfill({ json: { ...savedAccount, id: "user-1", profile: "WORK" } });
      return;
    }

    if (url.pathname === "/api/users/me/settings" && request.method() === "PATCH") {
      savedPreferences = request.postDataJSON() as typeof savedPreferences;
      await route.fulfill({ json: savedPreferences });
      return;
    }

    if (url.pathname === "/api/auth/change-password" && request.method() === "POST") {
      passwordChange = request.postDataJSON() as typeof passwordChange;
      await route.fulfill({ json: { success: true } });
      return;
    }

    await route.fulfill({ status: 404, json: { message: "Rota não esperada no teste." } });
  });

  await page.goto("/work/settings");
  await page.getByLabel("Nome").fill("Ana QA");
  await page.getByLabel("E-mail").fill("ana@example.com");
  await page.getByLabel("Telefone").fill("(21) 98888-7777");
  await page.getByRole("button", { name: "Salvar dados" }).click();
  await expect.poll(() => savedAccount?.phone).toBe("+5521988887777");

  await page.getByLabel("Estilo de escrita").selectOption("NATURAL");
  await page.getByLabel("Nível de detalhamento").selectOption("SHORT");
  await page.getByLabel("Modelo de IA").selectOption("gpt-4o-mini");
  await page.getByRole("button", { name: "Salvar preferências" }).click();
  await expect.poll(() => savedPreferences?.writingStyle).toBe("NATURAL");
  expect(savedPreferences).toMatchObject({
    writingStyle: "NATURAL",
    responseDetail: "SHORT",
    aiModel: "gpt-4o-mini",
  });

  await page.getByLabel("Senha atual").fill("senha-atual");
  await page.getByLabel("Nova senha", { exact: true }).fill("senha-nova");
  await page.getByLabel("Confirmar nova senha").fill("senha-nova");
  await page.getByRole("button", { name: "Alterar senha" }).click();
  await expect.poll(() => passwordChange?.newPassword).toBe("senha-nova");
});

test("QA tools use real inputs and display the persisted execution result", async ({ page }) => {
  let executionInput: { tool: string; input: string } | undefined;

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname === "/api/auth/me") {
      await route.fulfill({
        json: {
          id: "00000000-0000-4000-8000-000000000007",
          name: "Pessoa QA",
          email: "qa@example.com",
          phone: "+5511999999999",
          profile: "WORK",
        },
      });
      return;
    }

    if (url.pathname === "/api/conversations" || url.pathname === "/api/projects") {
      await route.fulfill({ json: [] });
      return;
    }

    if (url.pathname === "/api/ai/tools" && request.method() === "GET") {
      await route.fulfill({ json: [] });
      return;
    }

    if (url.pathname === "/api/ai/tools" && request.method() === "POST") {
      executionInput = request.postDataJSON() as typeof executionInput;
      await route.fulfill({
        json: {
          id: "execution-1",
          tool: "REQUIREMENT_ANALYSIS",
          input: executionInput?.input,
          result: "**Critério de aceite:** usuário vê uma confirmação.",
          model: "gpt-4o-mini",
          createdAt: new Date().toISOString(),
        },
      });
      return;
    }

    await route.fulfill({ status: 404, json: { message: "Rota não esperada no teste." } });
  });

  await page.goto("/work/tools");
  await expect(page.getByRole("heading", { name: "Ferramentas de QA" })).toBeVisible();
  await page.getByRole("link", { name: "Abrir ferramenta" }).first().click();
  await expect(page).toHaveURL(/\/work\/tools\/requirement-analysis$/);
  await page.getByLabel("Demanda ou história").fill("Ao salvar, a pessoa deve ver uma confirmação.");
  await page.getByRole("button", { name: "Executar análise de requisitos" }).click();
  await expect(page.getByText("Critério de aceite:", { exact: false })).toBeVisible();
  await expect.poll(() => executionInput?.tool).toBe("REQUIREMENT_ANALYSIS");
  expect(executionInput?.input).toContain("Ao salvar");
});

test("project spaces persist knowledge, conversations, and editable AI diagrams", async ({ page }) => {
  const projectId = "00000000-0000-4000-8000-000000000101";
  const conversationId = "00000000-0000-4000-8000-000000000102";
  const diagramId = "00000000-0000-4000-8000-000000000103";
  const timestamp = new Date().toISOString();
  let project: Record<string, unknown> | null = null;
  let knowledge: Array<Record<string, unknown>> = [];
  let conversations: Array<Record<string, unknown>> = [];
  let diagrams: Array<Record<string, unknown>> = [];

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const body = request.postDataJSON() as Record<string, unknown> | null;

    if (url.pathname === "/api/auth/me") {
      await route.fulfill({ json: { id: "user-1", name: "Pessoa QA", email: "qa@example.com", profile: "WORK" } });
      return;
    }

    if (url.pathname === "/api/conversations" && request.method() === "GET") {
      await route.fulfill({ json: conversations });
      return;
    }
    if (url.pathname === "/api/conversations" && request.method() === "POST") {
      const created = {
        id: conversationId,
        title: body?.title || "Nova conversa",
        environment: "WORK",
        projectId: body?.projectId || null,
        projectName: project && body?.projectId ? "Projeto de teste" : null,
        archivedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      conversations = [...conversations, created];
      await route.fulfill({ json: created });
      return;
    }
    if (url.pathname === `/api/conversations/${conversationId}/messages`) {
      await route.fulfill({ json: [] });
      return;
    }

    if (url.pathname === "/api/projects" && request.method() === "GET") {
      await route.fulfill({ json: project ? [project] : [] });
      return;
    }
    if (url.pathname === "/api/projects" && request.method() === "POST") {
      project = {
        id: projectId,
        name: body?.name,
        description: body?.description || null,
        category: body?.category || null,
        status: "ACTIVE",
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      await route.fulfill({ json: project });
      return;
    }
    if (url.pathname === `/api/projects/${projectId}` && request.method() === "GET") {
      await route.fulfill({ json: project });
      return;
    }
    if (url.pathname === `/api/projects/${projectId}/knowledge` && request.method() === "GET") {
      await route.fulfill({ json: knowledge });
      return;
    }
    if (url.pathname === `/api/projects/${projectId}/knowledge` && request.method() === "POST") {
      const item = {
        id: "knowledge-1",
        kind: body?.kind,
        title: body?.title,
        content: body?.content,
        externalUrl: body?.externalUrl || null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      knowledge = [item];
      await route.fulfill({ json: item });
      return;
    }
    if (url.pathname === `/api/projects/${projectId}/tasks` && request.method() === "GET") {
      await route.fulfill({ json: [] });
      return;
    }
    if (url.pathname === `/api/projects/${projectId}/diagrams` && request.method() === "GET") {
      await route.fulfill({ json: diagrams });
      return;
    }
    if (url.pathname === `/api/projects/${projectId}/diagrams/generate` && request.method() === "POST") {
      await route.fulfill({
        json: {
          model: "test-model",
          definition: {
            nodes: [{ id: "n1", label: "Validar credenciais", type: "PROCESS", x: 180, y: 170 }],
            edges: [],
          },
        },
      });
      return;
    }
    if (url.pathname === `/api/projects/${projectId}/diagrams` && request.method() === "POST") {
      const diagram = {
        id: diagramId,
        name: body?.name,
        definition: body?.definition,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      diagrams = [diagram];
      await route.fulfill({ json: diagram });
      return;
    }
    if (url.pathname === `/api/projects/${projectId}/diagrams/${diagramId}` && request.method() === "PATCH") {
      diagrams = [{ ...diagrams[0], ...body, updatedAt: new Date().toISOString() }];
      await route.fulfill({ json: diagrams[0] });
      return;
    }

    await route.fulfill({ status: 404, json: { message: `Rota não esperada: ${url.pathname}` } });
  });

  await page.goto("/work/projects");
  await page.getByLabel("Nome do projeto").fill("Projeto de teste");
  await page.getByLabel("Categoria do projeto").fill("produto");
  await page.getByLabel("Descrição do projeto").fill("Contexto de autenticação e qualidade.");
  await page.getByRole("button", { name: "Criar projeto" }).click();
  await expect(page).toHaveURL(new RegExp(`/work/projects/${projectId}$`));
  await expect(page.getByRole("heading", { name: "Projeto de teste" })).toBeVisible();

  await page.getByRole("button", { name: "Documentação" }).click();
  await page.getByLabel("Tipo").selectOption("DECISION");
  await page.getByLabel("Título").fill("Decisão de autenticação");
  await page.getByLabel("Conteúdo").fill("O histórico de conversas não é compartilhado entre projetos.");
  await page.getByRole("button", { name: "Registrar no projeto" }).click();
  await expect(page.getByText("Decisão de autenticação")).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: "Documentação" }).click();
  await expect(page.getByText("Decisão de autenticação")).toBeVisible();

  await page.getByRole("button", { name: "Diagramas" }).click();
  await page.getByLabel("Nome do diagrama").fill("Fluxo de autenticação");
  await page.getByPlaceholder("Descreva o fluxo que deseja visualizar").fill("Representar validação de credenciais e resposta do acesso.");
  await page.getByRole("button", { name: "Gerar rascunho" }).click();
  await expect(page.getByRole("button", { name: "Etapa: Validar credenciais" })).toBeVisible();
  await page.getByRole("button", { name: "Salvar", exact: true }).click();

  await page.getByRole("button", { name: "Etapa: Validar credenciais" }).click();
  await page.getByLabel("Texto").fill("Validar sessão");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect.poll(() => {
    const saved = diagrams[0]?.definition as { nodes?: Array<{ label: string }> } | undefined;
    return saved?.nodes?.[0]?.label;
  }).toBe("Validar sessão");

  await page.reload();
  await page.getByRole("button", { name: "Diagramas" }).click();
  await page.getByRole("button", { name: "Fluxo de autenticação", exact: true }).click();
  await expect(page.getByRole("button", { name: "Etapa: Validar sessão" })).toBeVisible();

  await page.getByRole("button", { name: "Conversas" }).click();
  await page.getByLabel("Nome da nova conversa").fill("Arquitetura do projeto");
  await page.getByRole("main").getByRole("button", { name: "Nova conversa" }).click();
  await expect(page).toHaveURL(new RegExp(`/work/conversations/${conversationId}$`));
  await expect(page.getByText("Arquitetura do projeto", { exact: true }).first()).toBeVisible();
});

test("conversation center searches persisted project and date filters", async ({ page }) => {
  const projectId = "00000000-0000-4000-8000-000000000201";
  const queries: URLSearchParams[] = [];

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname === "/api/auth/me") {
      await route.fulfill({ json: { id: "user-1", name: "Pessoa QA", email: "qa@example.com", profile: "WORK" } });
      return;
    }
    if (url.pathname === "/api/conversations" && request.method() === "GET") {
      queries.push(url.searchParams);
      await route.fulfill({ json: [] });
      return;
    }
    if (url.pathname === "/api/projects" && request.method() === "GET") {
      await route.fulfill({
        json: [{
          id: projectId,
          name: "Projeto de autenticação",
          description: null,
          category: null,
          status: "ACTIVE",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }],
      });
      return;
    }
    await route.fulfill({ status: 404, json: { message: "Rota não esperada." } });
  });

  await page.goto("/work/conversations");
  await page.getByLabel("Filtrar por projeto").selectOption(projectId);
  await page.getByLabel("Pesquisar conversas").fill("autenticação");
  await expect.poll(() =>
    queries.some(
      (query) =>
        query.get("projectId") === projectId &&
        query.get("search") === "autenticação",
    ),
  ).toBe(true);

  await page.getByLabel("Filtrar por projeto").selectOption("unassigned");
  await page.getByLabel("Data inicial").fill("2026-11-01");
  await page.getByLabel("Data final").fill("2026-11-15");
  await expect.poll(() =>
    queries.some(
      (query) =>
        query.get("unassigned") === "true" &&
        query.get("from") === "2026-11-01" &&
        query.get("to") === "2026-11-15T23:59:59.999Z",
    ),
  ).toBe(true);
});
