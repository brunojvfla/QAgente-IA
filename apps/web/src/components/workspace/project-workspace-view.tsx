"use client";

import Link from "next/link";
import { FormEvent, PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowLeft,
  Archive,
  Check,
  FileText,
  FolderKanban,
  FolderOpen,
  GitBranch,
  LoaderCircle,
  MessageSquareText,
  Plus,
  Sparkles,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import {
  ConversationSummary,
  ProjectDiagramDefinition,
  ProjectDiagramItem,
  ProjectDiagramNode,
  ProjectDiagramNodeType,
  ProjectKnowledgeItem,
  ProjectSummary,
  ProjectTaskItem,
} from "@qagent/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, workspaceApi } from "@/lib/api";
import { FilesView } from "./files-view";

type Props = { projectId: string };
type ProjectTab = "overview" | "conversations" | "knowledge" | "tasks" | "diagrams" | "files";

const TABS: Array<{ id: ProjectTab; label: string; icon: typeof FolderKanban }> = [
  { id: "overview", label: "Visão geral", icon: FolderKanban },
  { id: "conversations", label: "Conversas", icon: MessageSquareText },
  { id: "knowledge", label: "Documentação", icon: FileText },
  { id: "tasks", label: "Tarefas", icon: Check },
  { id: "diagrams", label: "Diagramas", icon: GitBranch },
  { id: "files", label: "Arquivos", icon: FolderOpen },
];

export function ProjectWorkspaceView({ projectId }: Props) {
  const router = useRouter();
  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [knowledge, setKnowledge] = useState<ProjectKnowledgeItem[]>([]);
  const [tasks, setTasks] = useState<ProjectTaskItem[]>([]);
  const [diagrams, setDiagrams] = useState<ProjectDiagramItem[]>([]);
  const [tab, setTab] = useState<ProjectTab>("overview");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [conversationTitle, setConversationTitle] = useState("");
  const [knowledgeKind, setKnowledgeKind] = useState<ProjectKnowledgeItem["kind"]>("DOCUMENT");
  const [knowledgeTitle, setKnowledgeTitle] = useState("");
  const [knowledgeContent, setKnowledgeContent] = useState("");
  const [knowledgeUrl, setKnowledgeUrl] = useState("");
  const [editingKnowledge, setEditingKnowledge] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [selectedDiagramId, setSelectedDiagramId] = useState<string | null>(null);
  const [diagramName, setDiagramName] = useState("");
  const [diagramDefinition, setDiagramDefinition] = useState<ProjectDiagramDefinition>({
    nodes: [],
    edges: [],
  });
  const [diagramPrompt, setDiagramPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [savingDiagram, setSavingDiagram] = useState(false);

  const loadProject = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [projectItem, conversationItems, knowledgeItems, taskItems, diagramItems] =
        await Promise.all([
          workspaceApi.project(projectId),
          workspaceApi.conversations("WORK", { projectId, status: "ALL" }),
          workspaceApi.knowledge(projectId),
          workspaceApi.tasks(projectId),
          workspaceApi.diagrams(projectId),
        ]);
      setProject(projectItem);
      setTitle(projectItem.name);
      setDescription(projectItem.description || "");
      setCategory(projectItem.category || "");
      setConversations(conversationItems);
      setKnowledge(knowledgeItems);
      setTasks(taskItems);
      setDiagrams(diagramItems);
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) {
        router.replace("/login");
        return;
      }
      setError(reason instanceof Error ? reason.message : "Não foi possível carregar o projeto.");
    } finally {
      setLoading(false);
    }
  }, [projectId, router]);

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

  useEffect(() => {
    const selected = diagrams.find((item) => item.id === selectedDiagramId);
    if (selected) {
      setDiagramName(selected.name);
      setDiagramDefinition(selected.definition);
    }
  }, [diagrams, selectedDiagramId]);

  const archived = project?.status === "ARCHIVED";

  async function runAction(action: () => Promise<unknown>, onSuccess?: () => void) {
    setBusy(true);
    setError("");
    try {
      await action();
      onSuccess?.();
      await loadProject();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível salvar as alterações.");
    } finally {
      setBusy(false);
    }
  }

  async function saveProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    await runAction(() =>
      workspaceApi.updateProject(projectId, {
        name: title,
        description,
        category: category || null,
      }),
    );
  }

  async function createConversation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const conversation = await workspaceApi.createConversation(
        "WORK",
        projectId,
        conversationTitle || "Nova conversa",
      );
      router.push(`/work/conversations/${conversation.id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível criar a conversa.");
    } finally {
      setBusy(false);
    }
  }

  async function renameConversation(conversation: ConversationSummary) {
    const nextTitle = window.prompt("Novo nome da conversa", conversation.title);
    if (!nextTitle?.trim() || nextTitle.trim() === conversation.title) return;
    await runAction(() =>
      workspaceApi.updateConversation(conversation.id, "WORK", { title: nextTitle.trim() }),
    );
  }

  async function toggleConversationArchive(conversation: ConversationSummary) {
    await runAction(() =>
      workspaceApi.updateConversation(conversation.id, "WORK", {
        archived: !conversation.archivedAt,
      }),
    );
  }

  function startKnowledgeEdit(item: ProjectKnowledgeItem) {
    setEditingKnowledge(item.id);
    setKnowledgeKind(item.kind);
    setKnowledgeTitle(item.title);
    setKnowledgeContent(item.content);
    setKnowledgeUrl(item.externalUrl || "");
  }

  function resetKnowledgeForm() {
    setEditingKnowledge(null);
    setKnowledgeTitle("");
    setKnowledgeContent("");
    setKnowledgeUrl("");
    setKnowledgeKind("DOCUMENT");
  }

  async function saveKnowledge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = {
      kind: knowledgeKind,
      title: knowledgeTitle,
      content: knowledgeContent,
      externalUrl: knowledgeKind === "FILE_LINK" ? knowledgeUrl : null,
    };
    await runAction(
      () =>
        editingKnowledge
          ? workspaceApi.updateKnowledge(projectId, editingKnowledge, body)
          : workspaceApi.createKnowledge(projectId, body),
      resetKnowledgeForm,
    );
  }

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!taskTitle.trim()) return;
    await runAction(() => workspaceApi.createTask(projectId, { title: taskTitle }), () =>
      setTaskTitle(""),
    );
  }

  async function changeTaskStatus(task: ProjectTaskItem, status: ProjectTaskItem["status"]) {
    await runAction(() => workspaceApi.updateTask(projectId, task.id, { status }));
  }

  function selectDiagram(diagram: ProjectDiagramItem) {
    setSelectedDiagramId(diagram.id);
    setDiagramName(diagram.name);
    setDiagramDefinition(diagram.definition);
  }

  function startNewDiagram() {
    setSelectedDiagramId(null);
    setDiagramName("Novo diagrama");
    setDiagramDefinition({ nodes: [], edges: [] });
  }

  async function saveDiagram() {
    if (!diagramName.trim()) {
      setError("Dê um nome ao diagrama antes de salvar.");
      return;
    }
    setSavingDiagram(true);
    setError("");
    try {
      if (selectedDiagramId) {
        await workspaceApi.updateDiagram(projectId, selectedDiagramId, {
          name: diagramName,
          definition: diagramDefinition,
        });
      } else {
        const saved = await workspaceApi.createDiagram(projectId, diagramName, diagramDefinition);
        setSelectedDiagramId(saved.id);
      }
      await loadProject();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível salvar o diagrama.");
    } finally {
      setSavingDiagram(false);
    }
  }

  async function generateDiagram(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGenerating(true);
    setError("");
    try {
      const result = await workspaceApi.generateDiagram(projectId, diagramPrompt);
      setDiagramDefinition(result.definition);
      setDiagramName(diagramName || "Fluxo gerado pela QIA");
      setSelectedDiagramId(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível gerar o fluxo.");
    } finally {
      setGenerating(false);
    }
  }

  function exportDiagram() {
    const file = new Blob([JSON.stringify({ name: diagramName, definition: diagramDefinition }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${diagramName.trim().replace(/[^a-z0-9-_]+/gi, "-") || "diagrama"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted">
        <LoaderCircle className="animate-spin" size={18} />Carregando espaço do projeto...
      </div>
    );
  }

  if (!project) {
    return (
      <section className="rounded-2xl border border-default bg-surface p-8 text-center">
        <p className="font-semibold">Projeto indisponível</p>
        <p className="mt-2 text-sm text-muted">{error || "Não foi possível localizar este projeto."}</p>
        <Link className="mt-5 inline-flex text-sm font-semibold text-brand hover:underline" href="/work/projects">
          Voltar para projetos
        </Link>
      </section>
    );
  }

  return (
    <div>
      <Link href="/work/projects" className="inline-flex items-center gap-2 text-xs font-medium text-muted hover:text-brand">
        <ArrowLeft size={15} />Projetos
      </Link>
      <header className="mt-5 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">Espaço do projeto</p>
            {archived && <span className="rounded-full bg-surface-hover px-2.5 py-1 text-[10px] font-semibold text-muted">Arquivado</span>}
          </div>
          <h1 className="mt-2 truncate text-3xl font-semibold tracking-tight">{project.name}</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted">{project.description || "Organize conversas, decisões, tarefas e fluxos em um contexto isolado."}</p>
        </div>
        <Button
          variant={archived ? "secondary" : "ghost"}
          disabled={busy}
          onClick={() =>
            void runAction(() => workspaceApi.archiveProject(projectId, !archived))
          }
        >
          {archived ? <Undo2 size={16} /> : <Archive size={16} />}
          {archived ? "Restaurar projeto" : "Arquivar projeto"}
        </Button>
      </header>

      {error && (
        <div role="alert" className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-warning bg-warning-soft px-4 py-3 text-sm text-warning">
          <span>{error}</span>
          <button type="button" aria-label="Fechar mensagem" onClick={() => setError("")}><X size={15} /></button>
        </div>
      )}

      <nav aria-label="Áreas do projeto" className="mt-7 flex gap-1 overflow-x-auto border-b border-default">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            type="button"
            key={id}
            onClick={() => setTab(id)}
            className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition ${
              tab === id ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            <Icon size={15} />{label}
          </button>
        ))}
      </nav>

      <div className="mt-6">
        {tab === "overview" && (
          <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <form onSubmit={saveProject} className="rounded-2xl border border-default bg-surface p-5 shadow-card">
              <h2 className="text-base font-semibold">Informações do projeto</h2>
              <label className="mt-5 block text-xs font-medium text-muted" htmlFor="project-name">Nome</label>
              <Input id="project-name" required maxLength={160} className="mt-2" value={title} onChange={(event) => setTitle(event.target.value)} />
              <label className="mt-4 block text-xs font-medium text-muted" htmlFor="project-category">Categoria</label>
              <Input id="project-category" maxLength={100} className="mt-2" value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Ex.: produto, automação, estudos" />
              <label className="mt-4 block text-xs font-medium text-muted" htmlFor="project-description">Descrição e objetivos</label>
              <textarea id="project-description" maxLength={2000} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} className="mt-2 w-full rounded-md border border-default bg-surface px-3.5 py-3 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand-soft" />
              <Button type="submit" className="mt-4" disabled={busy || archived}>{busy ? <LoaderCircle size={15} className="animate-spin" /> : <Check size={15} />}Salvar informações</Button>
            </form>
            <div className="space-y-4">
              <article className="rounded-2xl border border-default bg-surface p-5 shadow-card">
                <h2 className="text-base font-semibold">Visão do espaço</h2>
                <p className="mt-2 text-sm leading-6 text-muted">Este projeto compartilha somente suas informações registradas — não o histórico integral das outras conversas — com as conversas deste mesmo projeto.</p>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <SummaryCount label="Conversas" value={conversations.length} />
                  <SummaryCount label="Informações" value={knowledge.length} />
                  <SummaryCount label="Tarefas abertas" value={tasks.filter((task) => task.status !== "DONE").length} />
                  <SummaryCount label="Diagramas" value={diagrams.length} />
                </div>
              </article>
              <article className="rounded-2xl border border-default bg-surface p-5 shadow-card">
                <h2 className="text-sm font-semibold">Comece pelo contexto</h2>
                <p className="mt-2 text-xs leading-5 text-muted">Registre requisitos, decisões ou documentação para que a QIA possa recuperar essas informações em outras conversas do projeto.</p>
                <Button variant="secondary" size="small" className="mt-4" onClick={() => setTab("knowledge")}><FileText size={14} />Adicionar informação</Button>
              </article>
            </div>
          </div>
        )}

        {tab === "conversations" && (
          <section className="rounded-2xl border border-default bg-surface p-5 shadow-card">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div><h2 className="text-base font-semibold">Conversas deste projeto</h2><p className="mt-1 text-xs text-muted">Históricos separados; apenas informações registradas são compartilhadas no contexto do projeto.</p></div>
              <form onSubmit={createConversation} className="flex gap-2">
                <Input aria-label="Nome da nova conversa" maxLength={200} value={conversationTitle} onChange={(event) => setConversationTitle(event.target.value)} placeholder="Nome da conversa" className="min-w-0 sm:w-56" disabled={archived} />
                <Button type="submit" disabled={busy || archived}><Plus size={15} />Nova conversa</Button>
              </form>
            </div>
            <div className="mt-5 divide-y divide-default">
              {conversations.map((conversation) => (
                <div key={conversation.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <Link href={`/work/conversations/${conversation.id}`} className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold hover:text-brand">{conversation.title}</p>
                    <p className="mt-1 text-[11px] text-muted">{conversation.archivedAt ? "Arquivada" : "Atualizada"} · {new Date(conversation.updatedAt).toLocaleString("pt-BR")}</p>
                  </Link>
                  <div className="flex items-center gap-1">
                    <Button type="button" variant="ghost" size="small" disabled={busy || archived} onClick={() => void renameConversation(conversation)}>Renomear</Button>
                    <Button type="button" variant="ghost" size="small" disabled={busy || archived} onClick={() => void toggleConversationArchive(conversation)}>{conversation.archivedAt ? <Undo2 size={14} /> : <Archive size={14} />}{conversation.archivedAt ? "Restaurar" : "Arquivar"}</Button>
                  </div>
                </div>
              ))}
              {!conversations.length && <EmptyState title="Nenhuma conversa no projeto" detail="Crie uma conversa para começar. Ela ficará vinculada a este espaço." />}
            </div>
          </section>
        )}

        {tab === "knowledge" && (
          <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
            <form onSubmit={saveKnowledge} className="rounded-2xl border border-default bg-surface p-5 shadow-card">
              <div className="flex items-center justify-between gap-2"><h2 className="text-base font-semibold">{editingKnowledge ? "Editar informação" : "Registrar informação"}</h2>{editingKnowledge && <button type="button" aria-label="Cancelar edição" onClick={resetKnowledgeForm} className="rounded-md p-1.5 text-muted hover:bg-surface-hover"><X size={16} /></button>}</div>
              <label className="mt-5 block text-xs font-medium text-muted" htmlFor="knowledge-kind">Tipo</label>
              <select id="knowledge-kind" value={knowledgeKind} onChange={(event) => setKnowledgeKind(event.target.value as ProjectKnowledgeItem["kind"])} className="mt-2 h-11 w-full rounded-md border border-default bg-surface px-3 text-sm">
                <option value="DOCUMENT">Documentação</option><option value="DECISION">Decisão</option><option value="REQUIREMENT">Requisito</option><option value="FILE_LINK">Link de arquivo</option>
              </select>
              <label className="mt-4 block text-xs font-medium text-muted" htmlFor="knowledge-title">Título</label>
              <Input id="knowledge-title" required maxLength={200} className="mt-2" value={knowledgeTitle} onChange={(event) => setKnowledgeTitle(event.target.value)} />
              {knowledgeKind === "FILE_LINK" && <><label className="mt-4 block text-xs font-medium text-muted" htmlFor="knowledge-url">Link HTTPS</label><Input id="knowledge-url" type="url" required className="mt-2" value={knowledgeUrl} onChange={(event) => setKnowledgeUrl(event.target.value)} placeholder="https://..." /></>}
              <label className="mt-4 block text-xs font-medium text-muted" htmlFor="knowledge-content">Conteúdo</label>
              <textarea id="knowledge-content" required maxLength={12000} rows={7} value={knowledgeContent} onChange={(event) => setKnowledgeContent(event.target.value)} className="mt-2 w-full rounded-md border border-default bg-surface px-3.5 py-3 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand-soft" />
              <Button type="submit" className="mt-4" disabled={busy || archived}><Check size={15} />{editingKnowledge ? "Salvar edição" : "Registrar no projeto"}</Button>
              {archived && <p className="mt-2 text-xs text-muted">Restaure o projeto para alterar estas informações.</p>}
            </form>
            <section className="rounded-2xl border border-default bg-surface p-5 shadow-card">
              <h2 className="text-base font-semibold">Documentos, decisões e requisitos</h2>
              <div className="mt-4 space-y-3">
                {knowledge.map((item) => (
                  <article key={item.id} className="rounded-xl border border-default p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0"><span className="text-[10px] font-bold uppercase tracking-wider text-brand">{knowledgeLabel(item.kind)}</span><h3 className="mt-1 break-words text-sm font-semibold">{item.title}</h3></div>
                      <div className="flex shrink-0 gap-1"><Button variant="ghost" size="small" disabled={busy || archived} onClick={() => startKnowledgeEdit(item)}>Editar</Button><button type="button" aria-label={`Excluir ${item.title}`} disabled={busy || archived} onClick={() => void runAction(() => workspaceApi.deleteKnowledge(projectId, item.id))} className="rounded-md p-2 text-muted hover:bg-danger-soft hover:text-danger disabled:opacity-40"><Trash2 size={14} /></button></div>
                    </div>
                    {item.externalUrl && <a href={item.externalUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block break-all text-xs text-brand hover:underline">{item.externalUrl}</a>}
                    <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-muted">{item.content}</p>
                    <p className="mt-3 text-[10px] text-muted">Atualizado em {new Date(item.updatedAt).toLocaleString("pt-BR")}</p>
                  </article>
                ))}
                {!knowledge.length && <EmptyState title="Ainda não há informações registradas" detail="Registre decisões, requisitos ou documentação para reutilizar em conversas deste projeto." />}
              </div>
            </section>
          </div>
        )}

        {tab === "tasks" && (
          <section className="rounded-2xl border border-default bg-surface p-5 shadow-card">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div><h2 className="text-base font-semibold">Tarefas do projeto</h2><p className="mt-1 text-xs text-muted">Acompanhe atividades persistidas neste espaço.</p></div>
              <form onSubmit={createTask} className="flex gap-2"><Input aria-label="Título da tarefa" required maxLength={200} value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="Nova tarefa" /><Button type="submit" disabled={busy || archived}><Plus size={15} />Adicionar</Button></form>
            </div>
            <div className="mt-5 divide-y divide-default">
              {tasks.map((task) => (
                <div key={task.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1"><p className={`text-sm font-medium ${task.status === "DONE" ? "text-muted line-through" : ""}`}>{task.title}</p>{task.description && <p className="mt-1 text-xs text-muted">{task.description}</p>}</div>
                  <select aria-label={`Status de ${task.title}`} disabled={busy || archived} value={task.status} onChange={(event) => void changeTaskStatus(task, event.target.value as ProjectTaskItem["status"])} className="h-9 rounded-md border border-default bg-surface px-2 text-xs">
                    <option value="TODO">A fazer</option><option value="IN_PROGRESS">Em andamento</option><option value="DONE">Concluída</option>
                  </select>
                  <span className="text-[10px] text-muted">{task.priority === "HIGH" ? "Alta" : task.priority === "LOW" ? "Baixa" : "Média"}</span>
                  <button type="button" aria-label={`Excluir tarefa ${task.title}`} disabled={busy || archived} onClick={() => void runAction(() => workspaceApi.deleteTask(projectId, task.id))} className="rounded-md p-2 text-muted hover:bg-danger-soft hover:text-danger disabled:opacity-40"><Trash2 size={14} /></button>
                </div>
              ))}
              {!tasks.length && <EmptyState title="Nenhuma tarefa cadastrada" detail="Adicione tarefas para acompanhar as atividades deste projeto." />}
            </div>
          </section>
        )}

        {tab === "diagrams" && (
          <div className="grid gap-5 xl:grid-cols-[250px_1fr]">
            <aside className="rounded-2xl border border-default bg-surface p-4 shadow-card">
              <div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Diagramas</h2><button type="button" aria-label="Novo diagrama" disabled={archived} onClick={startNewDiagram} className="rounded-lg p-2 text-brand hover:bg-brand-soft"><Plus size={16} /></button></div>
              <div className="mt-3 space-y-1">
                {diagrams.map((diagram) => <div key={diagram.id} className={`flex items-center rounded-lg ${diagram.id === selectedDiagramId ? "bg-brand-soft" : "hover:bg-surface-hover"}`}><button type="button" onClick={() => selectDiagram(diagram)} className={`min-w-0 flex-1 truncate px-3 py-2.5 text-left text-xs ${diagram.id === selectedDiagramId ? "font-semibold text-brand" : "text-muted"}`}>{diagram.name}</button><button type="button" aria-label={`Excluir diagrama ${diagram.name}`} disabled={busy || archived} onClick={() => void runAction(() => workspaceApi.deleteDiagram(projectId, diagram.id), () => { if (selectedDiagramId === diagram.id) startNewDiagram(); })} className="mr-1 rounded p-1.5 text-muted hover:text-danger disabled:opacity-40"><Trash2 size={13} /></button></div>)}
                {!diagrams.length && <p className="px-2 py-4 text-xs leading-5 text-muted">Seus diagramas salvos aparecerão aqui.</p>}
              </div>
            </aside>
            <section className="min-w-0 rounded-2xl border border-default bg-surface p-4 shadow-card sm:p-5">
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <div className="flex min-w-0 items-center gap-2"><Input aria-label="Nome do diagrama" maxLength={200} disabled={archived} className="max-w-sm" value={diagramName} onChange={(event) => setDiagramName(event.target.value)} placeholder="Nome do diagrama" /><Button type="button" onClick={() => void saveDiagram()} disabled={savingDiagram || archived}><Check size={15} />{savingDiagram ? "Salvando..." : "Salvar"}</Button></div>
                <Button type="button" variant="secondary" size="small" onClick={exportDiagram} disabled={!diagramName}><ArrowDownToLine size={14} />Exportar JSON</Button>
              </div>
              <DiagramEditor
                definition={diagramDefinition}
                disabled={archived}
                onChange={setDiagramDefinition}
              />
              <form onSubmit={generateDiagram} className="mt-4 rounded-xl border border-default bg-surface-hover p-4">
                <label htmlFor="diagram-prompt" className="flex items-center gap-2 text-xs font-semibold"><Sparkles size={14} className="text-brand" />Gerar estrutura editável com a QIA</label>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Input id="diagram-prompt" required minLength={10} maxLength={5000} disabled={archived} value={diagramPrompt} onChange={(event) => setDiagramPrompt(event.target.value)} placeholder="Descreva o fluxo que deseja visualizar" />
                  <Button type="submit" variant="secondary" disabled={generating || archived}>{generating ? <LoaderCircle size={15} className="animate-spin" /> : <Sparkles size={15} />}Gerar rascunho</Button>
                </div>
                <p className="mt-2 text-[10px] leading-4 text-muted">O resultado aparece como nós editáveis. Revise e salve para persistir; as informações enviadas são limitadas ao contexto deste projeto.</p>
              </form>
            </section>
          </div>
        )}

        {tab === "files" && (
          <FilesView environment="WORK" projectId={projectId} embedded readOnly={archived} />
        )}
      </div>
    </div>
  );
}

function DiagramEditor({
  definition,
  disabled,
  onChange,
}: {
  definition: ProjectDiagramDefinition;
  disabled: boolean;
  onChange: (definition: ProjectDiagramDefinition) => void;
}) {
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const nodeTypes: ProjectDiagramNodeType[] = ["START", "PROCESS", "DECISION", "END"];
  const nextId = useCallback(
    (prefix: string) => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    [],
  );
  const selected = useMemo(
    () => definition.nodes.find((node) => node.id === selectedNode),
    [definition.nodes, selectedNode],
  );

  function updateNode(id: string, patch: Partial<ProjectDiagramNode>) {
    onChange({
      ...definition,
      nodes: definition.nodes.map((node) => (node.id === id ? { ...node, ...patch } : node)),
    });
  }

  function addNode(type: ProjectDiagramNodeType = "PROCESS") {
    const node: ProjectDiagramNode = {
      id: nextId("n"),
      label: type === "DECISION" ? "Nova decisão" : type === "START" ? "Início" : type === "END" ? "Fim" : "Nova etapa",
      type,
      x: 100 + (definition.nodes.length % 3) * 230,
      y: 100 + Math.floor(definition.nodes.length / 3) * 130,
    };
    onChange({ ...definition, nodes: [...definition.nodes, node] });
    setSelectedNode(node.id);
  }

  function chooseNode(nodeId: string) {
    if (connecting) {
      if (!connectFrom) {
        setConnectFrom(nodeId);
        return;
      }
      if (connectFrom !== nodeId) {
        onChange({
          ...definition,
          edges: [...definition.edges, { id: nextId("e"), source: connectFrom, target: nodeId }],
        });
      }
      setConnectFrom(null);
      setConnecting(false);
      return;
    }
    setSelectedNode(nodeId);
  }

  function moveNode(event: PointerEvent<HTMLDivElement>, node: ProjectDiagramNode) {
    if (connectFrom || disabled) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    updateNode(
      node.id,
      {
        x: Math.max(50, Math.min(960, ((event.clientX - rect.left) / rect.width) * 1000)),
        y: Math.max(45, Math.min(540, ((event.clientY - rect.top) / rect.height) * 600)),
      },
    );
  }

  function removeNode(id: string) {
    onChange({
      nodes: definition.nodes.filter((node) => node.id !== id),
      edges: definition.edges.filter((edge) => edge.source !== id && edge.target !== id),
    });
    if (selectedNode === id) setSelectedNode(null);
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" size="small" disabled={disabled} onClick={() => addNode()}><Plus size={14} />Etapa</Button>
        <Button type="button" variant="secondary" size="small" disabled={disabled} onClick={() => addNode("DECISION")}><Plus size={14} />Decisão</Button>
        <Button type="button" variant={connecting ? "primary" : "secondary"} size="small" disabled={disabled || definition.nodes.length < 2} onClick={() => { setConnecting((value) => !value); setConnectFrom(null); }}><GitBranch size={14} />{connecting ? connectFrom ? "Selecione o destino" : "Selecione a origem" : "Conectar blocos"}</Button>
        {selected && <Button type="button" variant="ghost" size="small" disabled={disabled} onClick={() => removeNode(selected.id)}><Trash2 size={14} />Excluir bloco</Button>}
      </div>
      {selected && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-surface-hover p-3">
          <label htmlFor="diagram-node-label" className="text-xs text-muted">Texto</label>
          <Input id="diagram-node-label" maxLength={200} disabled={disabled} className="max-w-xs" value={selected.label} onChange={(event) => updateNode(selected.id, { label: event.target.value })} />
          <label htmlFor="diagram-node-type" className="text-xs text-muted">Tipo</label>
          <select id="diagram-node-type" disabled={disabled} value={selected.type} onChange={(event) => updateNode(selected.id, { type: event.target.value as ProjectDiagramNodeType })} className="h-10 rounded-md border border-default bg-surface px-2 text-xs">
            {nodeTypes.map((type) => <option key={type} value={type}>{diagramNodeLabel(type)}</option>)}
          </select>
        </div>
      )}
      <div
        ref={canvasRef}
        className="relative mt-3 h-[460px] overflow-auto rounded-xl border border-default bg-surface-hover"
        style={{ touchAction: "none" }}
      >
        <svg viewBox="0 0 1000 600" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
          <defs><marker id="diagram-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L9,3 z" fill="currentColor" /></marker></defs>
          {definition.edges.map((edge) => {
            const source = definition.nodes.find((node) => node.id === edge.source);
            const target = definition.nodes.find((node) => node.id === edge.target);
            if (!source || !target) return null;
            return <g key={edge.id} className="text-brand"><line x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke="currentColor" strokeWidth="2" markerEnd="url(#diagram-arrow)" /><text x={(source.x + target.x) / 2} y={(source.y + target.y) / 2 - 7} className="fill-current text-[11px]">{edge.label}</text></g>;
          })}
        </svg>
        {definition.nodes.map((node) => (
          <div
            key={node.id}
            role="button"
            tabIndex={0}
            aria-label={`${diagramNodeLabel(node.type)}: ${node.label}`}
            onClick={() => chooseNode(node.id)}
            onPointerDown={(event) => {
              if (!connecting && !disabled) {
                event.currentTarget.setPointerCapture(event.pointerId);
                setSelectedNode(node.id);
              }
            }}
            onPointerMove={(event) => {
              if (event.buttons === 1 && !connecting) moveNode(event, node);
            }}
            onPointerUp={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") chooseNode(node.id);
            }}
            className={`absolute z-[1] flex min-h-12 w-40 -translate-x-1/2 -translate-y-1/2 cursor-grab select-none items-center justify-center rounded-xl border px-3 py-2 text-center text-xs font-semibold shadow-card active:cursor-grabbing ${
              selectedNode === node.id ? "border-brand ring-2 ring-brand-soft" : "border-default"
            } ${node.type === "DECISION" ? "bg-warning-soft text-warning" : node.type === "START" || node.type === "END" ? "bg-brand-soft text-brand" : "bg-surface text-ink"}`}
            style={{ left: `${(node.x / 1000) * 100}%`, top: `${(node.y / 600) * 100}%` }}
          >
            <span className="pointer-events-none">{node.label}<span className="mt-1 block text-[9px] font-medium opacity-60">{diagramNodeLabel(node.type)}</span></span>
          </div>
        ))}
        {!definition.nodes.length && <div className="absolute inset-0 grid place-items-center px-6 text-center text-xs text-muted">Adicione blocos ou gere um rascunho com a QIA. Arraste os blocos para organizar o fluxo e use “Conectar blocos” para criar relações.</div>}
      </div>
      <p className="mt-2 text-[10px] text-muted">{definition.nodes.length} blocos · {definition.edges.length} conexões · arraste os blocos para movê-los</p>
    </div>
  );
}

function SummaryCount({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl bg-surface-hover p-3"><p className="text-[10px] font-medium text-muted">{label}</p><p className="mt-1 text-lg font-semibold">{value}</p></div>;
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="rounded-xl border border-dashed border-default px-5 py-9 text-center"><p className="text-sm font-medium">{title}</p><p className="mx-auto mt-2 max-w-md text-xs leading-5 text-muted">{detail}</p></div>;
}

function knowledgeLabel(kind: ProjectKnowledgeItem["kind"]) {
  return ({ DOCUMENT: "Documentação", DECISION: "Decisão", REQUIREMENT: "Requisito", FILE_LINK: "Arquivo externo" })[kind];
}

function diagramNodeLabel(type: ProjectDiagramNodeType) {
  return ({ START: "Início", PROCESS: "Etapa", DECISION: "Decisão", END: "Fim" })[type];
}
