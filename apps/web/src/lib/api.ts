import {
  AuthenticatedUser,
  ChatMessage,
  ConversationSummary,
  Environment,
  FileDirectoryListing,
  LearnAttemptResult,
  LearnChallenge,
  LearnLesson,
  LearnProgressSummary,
  LearnTrack,
  ProjectDiagramDefinition,
  ProjectDiagramItem,
  ProjectKnowledgeItem,
  ProjectSummary,
  ProjectTaskItem,
  QaToolType,
  UserPreferences,
  WorkspaceFile,
  WorkspaceFolder,
} from "@qagent/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3101";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function csrfToken() {
  if (typeof document === "undefined") return undefined;
  const csrf = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("qagent_csrf="))
    ?.slice("qagent_csrf=".length);
  return csrf ? decodeURIComponent(csrf) : undefined;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  if (options.body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (["POST", "PUT", "PATCH", "DELETE"].includes(options.method || "GET")) {
    const csrf = csrfToken();
    if (csrf) headers.set("X-CSRF-Token", csrf);
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}/api${path}`, {
      ...options,
      headers,
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    throw new ApiError("Não foi possível conectar à API. Verifique se o backend está ativo.", 0);
  }

  if (!response.ok) {
    let message = "Não foi possível concluir a solicitação.";
    try {
      const body = (await response.json()) as { message?: string | string[] };
      message = Array.isArray(body.message) ? body.message.join(", ") : body.message || message;
    } catch {
      message = response.statusText || message;
    }
    throw new ApiError(message, response.status);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const authApi = {
  me: () => apiRequest<AuthenticatedUser>("/auth/me"),
  login: (email: string, password: string) =>
    apiRequest<{ user: AuthenticatedUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (input: {
    name: string;
    email: string;
    phone: string;
    password: string;
    profile: "WORK" | "LEARN";
  }) =>
    apiRequest<{ user: AuthenticatedUser }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  logout: () => apiRequest<{ success: boolean }>("/auth/logout", { method: "POST" }),
  changePassword: (currentPassword: string, newPassword: string) =>
    apiRequest<{ success: boolean }>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
};

export const workspaceApi = {
  conversations: (
    environment: Environment,
    filters: {
      projectId?: string | null;
      unassigned?: boolean;
      search?: string;
      from?: string;
      to?: string;
      status?: "ACTIVE" | "ARCHIVED" | "ALL";
      sort?: "createdAt" | "updatedAt";
    } = {},
  ) => {
    const query = new URLSearchParams({ environment });
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== "") {
        query.set(key, String(value));
      }
    }
    return apiRequest<ConversationSummary[]>(`/conversations?${query.toString()}`);
  },
  createConversation: (environment: Environment, projectId?: string, title?: string) =>
    apiRequest<ConversationSummary>("/conversations", {
      method: "POST",
      body: JSON.stringify({ environment, title: title || "Nova conversa", projectId }),
    }),
  updateConversation: (
    conversationId: string,
    environment: Environment,
    input: { title?: string; projectId?: string | null; archived?: boolean },
  ) =>
    apiRequest<ConversationSummary>(
      `/conversations/${conversationId}?environment=${environment}`,
      { method: "PATCH", body: JSON.stringify(input) },
    ),
  deleteConversation: (conversationId: string, environment: Environment) =>
    apiRequest<void>(`/conversations/${conversationId}?environment=${environment}`, { method: "DELETE" }),
  messages: (conversationId: string, environment: Environment) =>
    apiRequest<ChatMessage[]>(`/conversations/${conversationId}/messages?environment=${environment}`),
  sendMessage: (conversationId: string, environment: Environment, content: string) =>
    apiRequest<{ userMessage: ChatMessage; assistantMessage: ChatMessage }>(
      `/conversations/${conversationId}/messages?environment=${environment}`,
      { method: "POST", body: JSON.stringify({ content }) },
    ),
  projects: (filters: { search?: string; status?: "ACTIVE" | "ARCHIVED" | "ALL" } = {}) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== "") query.set(key, String(value));
    }
    const queryString = query.toString();
    return apiRequest<ProjectSummary[]>(`/projects${queryString ? `?${queryString}` : ""}`);
  },
  project: (projectId: string) => apiRequest<ProjectSummary>(`/projects/${projectId}`),
  createProject: (name: string, description: string, category?: string) =>
    apiRequest<ProjectSummary>("/projects", {
      method: "POST",
      body: JSON.stringify({ name, description, category }),
    }),
  updateProject: (
    projectId: string,
    input: { name?: string; description?: string | null; category?: string | null },
  ) =>
    apiRequest<ProjectSummary>(`/projects/${projectId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  archiveProject: (projectId: string, archived: boolean) =>
    apiRequest<ProjectSummary>(`/projects/${projectId}/${archived ? "archive" : "restore"}`, {
      method: "PATCH",
    }),
  knowledge: (projectId: string) =>
    apiRequest<ProjectKnowledgeItem[]>(`/projects/${projectId}/knowledge`),
  createKnowledge: (
    projectId: string,
    input: {
      kind: ProjectKnowledgeItem["kind"];
      title: string;
      content: string;
      externalUrl?: string | null;
    },
  ) =>
    apiRequest<ProjectKnowledgeItem>(`/projects/${projectId}/knowledge`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateKnowledge: (
    projectId: string,
    itemId: string,
    input: Partial<Pick<ProjectKnowledgeItem, "kind" | "title" | "content" | "externalUrl">>,
  ) =>
    apiRequest<ProjectKnowledgeItem>(`/projects/${projectId}/knowledge/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  deleteKnowledge: (projectId: string, itemId: string) =>
    apiRequest<void>(`/projects/${projectId}/knowledge/${itemId}`, { method: "DELETE" }),
  tasks: (projectId: string) => apiRequest<ProjectTaskItem[]>(`/projects/${projectId}/tasks`),
  createTask: (
    projectId: string,
    input: Partial<Pick<ProjectTaskItem, "title" | "description" | "status" | "priority" | "dueAt">> & { title: string },
  ) =>
    apiRequest<ProjectTaskItem>(`/projects/${projectId}/tasks`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateTask: (
    projectId: string,
    taskId: string,
    input: Partial<Pick<ProjectTaskItem, "title" | "description" | "status" | "priority" | "dueAt">>,
  ) =>
    apiRequest<ProjectTaskItem>(`/projects/${projectId}/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  deleteTask: (projectId: string, taskId: string) =>
    apiRequest<void>(`/projects/${projectId}/tasks/${taskId}`, { method: "DELETE" }),
  diagrams: (projectId: string) =>
    apiRequest<ProjectDiagramItem[]>(`/projects/${projectId}/diagrams`),
  createDiagram: (projectId: string, name: string, definition: ProjectDiagramDefinition) =>
    apiRequest<ProjectDiagramItem>(`/projects/${projectId}/diagrams`, {
      method: "POST",
      body: JSON.stringify({ name, definition }),
    }),
  updateDiagram: (
    projectId: string,
    diagramId: string,
    input: { name?: string; definition?: ProjectDiagramDefinition },
  ) =>
    apiRequest<ProjectDiagramItem>(`/projects/${projectId}/diagrams/${diagramId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  deleteDiagram: (projectId: string, diagramId: string) =>
    apiRequest<void>(`/projects/${projectId}/diagrams/${diagramId}`, { method: "DELETE" }),
  generateDiagram: (projectId: string, prompt: string) =>
    apiRequest<{ definition: ProjectDiagramDefinition; model: string }>(
      `/projects/${projectId}/diagrams/generate`,
      { method: "POST", body: JSON.stringify({ prompt }) },
    ),
};

export const usersApi = {
  updateAccount: (input: { name: string; email: string; phone: string }) =>
    apiRequest<AuthenticatedUser>("/users/me", {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  preferences: () => apiRequest<UserPreferences>("/users/me/settings"),
  updatePreferences: (input: UserPreferences) =>
    apiRequest<UserPreferences>("/users/me/settings", {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
};

export const aiApi = {
  models: () =>
    apiRequest<{
      models: string[];
      freeModels: string[];
      unavailableModels: string[];
      defaultModel: string | null;
      configured: boolean;
    }>("/ai/models"),
  runTool: (tool: QaToolType, input: string) =>
    apiRequest<{
      id: string;
      tool: QaToolType;
      input: string;
      result: string;
      model: string;
      createdAt: string;
    }>("/ai/tools", {
      method: "POST",
      body: JSON.stringify({ tool, input }),
    }),
  toolsHistory: () =>
    apiRequest<
      Array<{
        id: string;
        tool: QaToolType;
        input: string;
        result: string;
        model: string;
        createdAt: string;
      }>
    >("/ai/tools"),
};

export const learnApi = {
  tracks: () => apiRequest<LearnTrack[]>("/learn/tracks"),
  lesson: (lessonId: string) =>
    apiRequest<{
      lesson: LearnLesson;
      progress: {
        attempts: number;
        bestScore: number | null;
        completedAt: string | null;
        recentAttempts: Array<
          Pick<
            LearnAttemptResult,
            "id" | "score" | "passed" | "feedback" | "strengths" | "improvements" | "createdAt"
          >
        >;
      };
    }>(`/learn/lessons/${encodeURIComponent(lessonId)}`),
  challenges: () => apiRequest<LearnChallenge[]>("/learn/challenges"),
  progress: () => apiRequest<LearnProgressSummary>("/learn/progress"),
  submitAttempt: (lessonId: string, answer: string) =>
    apiRequest<LearnAttemptResult>(`/learn/lessons/${encodeURIComponent(lessonId)}/attempts`, {
      method: "POST",
      body: JSON.stringify({ answer }),
    }),
};

export const filesApi = {
  list: (
    environment: Environment,
    filters: { folderId?: string | null; projectId?: string | null } = {},
  ) => {
    const query = new URLSearchParams({ environment });
    if (filters.folderId) query.set("folderId", filters.folderId);
    if (filters.projectId) query.set("projectId", filters.projectId);
    return apiRequest<FileDirectoryListing>(`/files?${query.toString()}`);
  },
  folders: (environment: Environment, projectId?: string | null) => {
    const query = new URLSearchParams({ environment });
    if (projectId) query.set("projectId", projectId);
    return apiRequest<WorkspaceFolder[]>(`/files/folders?${query.toString()}`);
  },
  createFolder: (input: {
    environment: Environment;
    name: string;
    parentId?: string;
    projectId?: string;
  }) =>
    apiRequest<WorkspaceFolder>("/files/folders", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  renameFolder: (environment: Environment, id: string, name: string) =>
    apiRequest<WorkspaceFolder>(
      `/files/folders/${id}?environment=${environment}`,
      { method: "PATCH", body: JSON.stringify({ name }) },
    ),
  moveFolder: (environment: Environment, id: string, parentId: string | null) =>
    apiRequest<WorkspaceFolder>(
      `/files/folders/${id}/move?environment=${environment}`,
      { method: "PATCH", body: JSON.stringify({ parentId }) },
    ),
  deleteFolder: (environment: Environment, id: string) =>
    apiRequest<void>(`/files/folders/${id}?environment=${environment}`, { method: "DELETE" }),
  upload: (
    environment: Environment,
    file: File,
    folderId?: string | null,
    projectId?: string | null,
  ) => {
    const query = new URLSearchParams({ environment });
    if (folderId) query.set("folderId", folderId);
    if (projectId) query.set("projectId", projectId);
    const body = new FormData();
    body.append("file", file);
    return apiRequest<WorkspaceFile>(`/files/upload?${query.toString()}`, {
      method: "POST",
      body,
    });
  },
  renameFile: (environment: Environment, id: string, name: string) =>
    apiRequest<WorkspaceFile>(`/files/${id}?environment=${environment}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),
  moveFile: (environment: Environment, id: string, folderId: string | null) =>
    apiRequest<WorkspaceFile>(`/files/${id}/move?environment=${environment}`, {
      method: "PATCH",
      body: JSON.stringify({ folderId }),
    }),
  deleteFile: (environment: Environment, id: string) =>
    apiRequest<void>(`/files/${id}?environment=${environment}`, { method: "DELETE" }),
  contentUrl: (environment: Environment, id: string, download = false) =>
    `${API_URL}/api/files/${id}/content?environment=${environment}${download ? "&download=1" : ""}`,
};
