"use client";

import Link from "next/link";
import { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUp,
  Archive,
  BookOpen,
  BriefcaseBusiness,
  ChevronRight,
  ClipboardCheck,
  FolderKanban,
  FolderOpen,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  LoaderCircle,
  LogOut,
  MessageSquareText,
  Plus,
  Settings2,
  Sparkles,
  Target,
  Trash2,
  Undo2,
  Wrench,
} from "lucide-react";
import { AuthenticatedUser, ChatMessage, ConversationSummary, Environment, ProjectSummary } from "@qagent/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { ApiError, authApi, workspaceApi } from "@/lib/api";
import { MarkdownContent } from "./markdown-content";
import { SettingsView } from "./settings-view";
import { ToolsView } from "./tools-view";
import { ProjectWorkspaceView } from "./project-workspace-view";
import { LearnView } from "./learn-view";
import { FilesView } from "./files-view";

type Props = { environment: Environment; section: string[] };

export function WorkspaceShell({ environment, section }: Props) {
  const router = useRouter();
  const isLearn = environment === "LEARN";
  const base = `/${environment.toLowerCase()}`;
  const selectedConversation = section[0] === "conversations" ? section[1] : undefined;
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [message, setMessage] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectCategory, setProjectCategory] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [conversationToDelete, setConversationToDelete] =
    useState<ConversationSummary | null>(null);
  const [deletingConversation, setDeletingConversation] = useState(false);
  const deleteDialogRef = useRef<HTMLDialogElement>(null);
  const sendingRef = useRef(false);

  const navigation = useMemo(
    () =>
      isLearn
        ? [
            { label: "Visão geral", href: base, icon: LayoutDashboard },
            { label: "Conversas", href: `${base}/conversations`, icon: MessageSquareText },
            { label: "Aprendizado", href: `${base}/learning`, icon: BookOpen },
            { label: "Trilhas de estudo", href: `${base}/tracks`, icon: ListChecks },
            { label: "Desafios", href: `${base}/challenges`, icon: Target },
            { label: "Meu progresso", href: `${base}/progress`, icon: ClipboardCheck },
            { label: "Arquivos", href: `${base}/files`, icon: FolderOpen },
          ]
        : [
            { label: "Visão geral", href: base, icon: LayoutDashboard },
            { label: "Conversas", href: `${base}/conversations`, icon: MessageSquareText },
            { label: "Projetos", href: `${base}/projects`, icon: FolderKanban },
            { label: "Arquivos", href: `${base}/files`, icon: FolderOpen },
            { label: "Ferramentas", href: `${base}/tools`, icon: Wrench },
          ],
    [base, isLearn],
  );

  const loadWorkspace = useCallback(async () => {
    try {
      const authenticated = await authApi.me();
      setUser(authenticated);
      const [items, projectItems] = await Promise.all([
        workspaceApi.conversations(environment, { status: "ALL" }),
        isLearn ? Promise.resolve([]) : workspaceApi.projects({ status: "ALL" }),
      ]);
      setConversations(items);
      setProjects(projectItems);
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) {
        router.replace("/login");
        return;
      }
      setError(reason instanceof Error ? reason.message : "Não foi possível carregar o ambiente.");
    } finally {
      setLoading(false);
    }
  }, [environment, isLearn, router]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    const dialog = deleteDialogRef.current;
    if (!dialog) return;

    if (conversationToDelete && !dialog.open) dialog.showModal();
    if (!conversationToDelete && dialog.open) dialog.close();
  }, [conversationToDelete]);

  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      return;
    }
    let active = true;
    workspaceApi
    .messages(selectedConversation, environment)
      .then((items) => {
        if (active) setMessages(items);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Não foi possível carregar a conversa.");
      });
    return () => {
      active = false;
    };
  }, [environment, selectedConversation]);

  async function newConversation() {
    setCreating(true);
    setError("");
    try {
      const conversation = await workspaceApi.createConversation(environment);
      router.push(`${base}/conversations/${conversation.id}`);
      await loadWorkspace();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível criar a conversa.");
    } finally {
      setCreating(false);
    }
  }

  function requestDeleteConversation(conversationId: string) {
    const conversation = conversations.find((item) => item.id === conversationId);
    if (conversation) setConversationToDelete(conversation);
  }

  async function confirmDeleteConversation() {
    if (!conversationToDelete || deletingConversation) return;
    setError("");
    setDeletingConversation(true);
    try {
      await workspaceApi.deleteConversation(conversationToDelete.id, environment);
      setConversations((current) =>
        current.filter((item) => item.id !== conversationToDelete.id),
      );
      if (selectedConversation === conversationToDelete.id) {
        setMessages([]);
        router.replace(`${base}/conversations`);
      }
      setConversationToDelete(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível excluir a conversa.");
      setConversationToDelete(null);
    } finally {
      setDeletingConversation(false);
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sendingRef.current || !selectedConversation || !message.trim()) return;
    const text = message.trim();
    sendingRef.current = true;
    setSending(true);
    setError("");
    try {
      const response = await workspaceApi.sendMessage(selectedConversation, environment, text);
      setMessages((current) => [...current, response.userMessage, response.assistantMessage]);
      setMessage("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível enviar a mensagem.");
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectName.trim()) return;
    setError("");
    try {
      const project = await workspaceApi.createProject(
        projectName,
        projectDescription,
        projectCategory,
      );
      setProjectName("");
      setProjectDescription("");
      setProjectCategory("");
      await loadWorkspace();
      router.push(`${base}/projects/${project.id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível criar o projeto.");
    }
  }

  async function updateConversation(
    conversationId: string,
    input: { title?: string; archived?: boolean },
  ) {
    try {
      await workspaceApi.updateConversation(conversationId, environment, input);
      await loadWorkspace();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível atualizar a conversa.");
    }
  }

  async function logout() {
    try {
      await authApi.logout();
      router.replace("/login");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível encerrar a sessão.");
    }
  }

  const currentLabel = section[0] || "";
  const sectionName = currentLabel === "settings"
    ? "Configurações"
    : navigation.find((item) => item.href === `${base}/${currentLabel}` || (item.href === base && !currentLabel))?.label || "Visão geral";
  const isChat = currentLabel === "conversations";
  const isProjects = currentLabel === "projects";
  const isProjectWorkspace = isProjects && Boolean(section[1]);
  const isSettings = currentLabel === "settings";
  const isTools = currentLabel === "tools" && !isLearn;
  const isFiles = currentLabel === "files";

  if (loading) {
    return <main className="grid min-h-screen place-items-center text-muted"><span className="flex items-center gap-2"><LoaderCircle className="animate-spin" size={18} />Carregando seu espaço...</span></main>;
  }

  return (
    <div className="min-h-screen bg-transparent">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[258px] flex-col border-r border-default bg-surface px-4 py-5 lg:flex">
        <Link href={base} className="flex items-center gap-3 px-2">
          <span className={`grid h-10 w-10 place-items-center rounded-xl text-white ${isLearn ? "bg-learn" : "bg-brand"}`}>{isLearn ? <GraduationCap size={20} /> : <BriefcaseBusiness size={19} />}</span>
          <span><span className="block text-sm font-bold">QAgent</span><span className={`mt-0.5 block text-[10px] font-bold uppercase tracking-[0.15em] ${isLearn ? "text-learn" : "text-brand"}`}>{isLearn ? "Learn" : "Work"}</span></span>
        </Link>
        <button type="button" onClick={newConversation} disabled={creating} className="mt-9 flex h-11 items-center justify-center gap-2 rounded-md bg-brand px-3 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-50">
          {creating ? <LoaderCircle size={16} className="animate-spin" /> : <Plus size={17} />} Nova conversa
        </button>
        <nav className="mt-8 space-y-1">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted">Menu principal</p>
          {navigation.map(({ label, href, icon: Icon }) => {
            const active = href === base ? !currentLabel : href === `${base}/${currentLabel}`;
            return <Link key={href} href={href} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition ${active ? (isLearn ? "bg-learn-soft text-learn" : "bg-brand-soft text-brand") : "text-muted hover:bg-surface-hover hover:text-ink"}`}><Icon size={17} strokeWidth={1.8} />{label}</Link>;
          })}
        </nav>
        {!isLearn && (
          <div className="mt-8">
            <div className="flex items-center justify-between px-3 pb-2"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">Recentes</p><button aria-label="Nova conversa" onClick={newConversation} className="text-muted hover:text-brand"><Plus size={15} /></button></div>
            {conversations.slice(0, 4).map((item) => <Link key={item.id} href={`${base}/conversations/${item.id}`} className={`flex items-center gap-2 truncate rounded-lg px-3 py-2 text-xs ${selectedConversation === item.id ? "bg-surface-hover text-ink" : "text-muted hover:bg-surface-hover"}`}><MessageSquareText size={14} className="shrink-0" />{item.title}</Link>)}
          </div>
        )}
        <div className="mt-auto rounded-2xl bg-surface-hover p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">QAgent {isLearn ? "Learn" : "Work"}</p>
          <p className="mt-2 text-[11px] leading-5 text-muted">{isLearn ? "Seu histórico de estudos fica separado do ambiente Work." : "Suas conversas e ferramentas ficam no ambiente Work."}</p>
          <Link href={isLearn ? "/work" : "/learn"} className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline">{isLearn ? "Acessar Work" : "Acessar Learn"} <ChevronRight size={13} /></Link>
        </div>
        <button onClick={logout} className="mt-4 flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold text-muted hover:bg-brand-soft hover:text-red-600"><LogOut size={15} /> Sair da conta</button>
      </aside>

      <div className="lg:pl-[258px]">
        <header className="sticky top-0 z-10 flex h-[68px] items-center justify-between border-b border-default bg-surface px-5 sm:px-8">
          <div className="flex min-w-0 items-center gap-2 text-xs text-muted"><span className="truncate font-semibold text-ink">{isLearn ? "QAgent Learn" : "QAgent Work"}</span><ChevronRight size={14} /><span className="truncate">{sectionName}</span></div>
          <div className="flex items-center gap-2 sm:gap-3">
            <nav aria-label="Alternar ambiente" className="hidden items-center gap-1 sm:flex">
              <Link href="/work" aria-current={!isLearn ? "page" : undefined} className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${!isLearn ? "bg-brand-soft text-brand" : "text-muted hover:bg-surface-hover"}`}>Work</Link>
              <Link href="/learn" aria-current={isLearn ? "page" : undefined} className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${isLearn ? "bg-learn-soft text-learn" : "text-muted hover:bg-surface-hover"}`}>Learn</Link>
            </nav>
            <Link href={`${base}/settings`} aria-label="Configurações" title="Configurações" className="rounded-lg p-2 text-muted hover:bg-surface-hover hover:text-ink"><Settings2 size={17} /></Link>
            <ThemeToggle />
            <button onClick={logout} aria-label="Sair da conta" className="rounded-lg p-2 text-muted hover:bg-surface-hover lg:hidden"><LogOut size={17} /></button>
            <div className={`grid h-9 w-9 place-items-center rounded-full text-xs font-bold ${isLearn ? "bg-learn-soft text-learn" : "bg-brand-soft text-brand"}`}>{user?.name.slice(0, 1).toUpperCase() || "Q"}</div>
            <div className="hidden sm:block"><p className="text-xs font-semibold">{user?.name}</p><p className="text-[10px] text-muted">{isLearn ? "Estudante" : "Profissional de QA"}</p></div>
          </div>
        </header>
        <nav aria-label="Navegação do ambiente" className="flex gap-1 overflow-x-auto border-b border-default bg-surface px-4 py-2 lg:hidden">
          <Link href="/work" className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-muted hover:bg-surface-hover"><BriefcaseBusiness size={15} />Work</Link>
          <Link href="/learn" className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-muted hover:bg-surface-hover"><GraduationCap size={15} />Learn</Link>
          <Link href={`${base}/settings`} className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-muted hover:bg-surface-hover"><Settings2 size={15} />Configurações</Link>
          {navigation.map(({ label, href, icon: Icon }) => (
            <Link key={href} href={href} className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted hover:bg-surface-hover">
              <Icon size={15} />{label}
            </Link>
          ))}
        </nav>
        <main className={`${isTools ? "px-5 py-8 sm:px-8 sm:py-10" : "mx-auto max-w-[1240px] px-5 py-8 sm:px-8 sm:py-10"}`}>
          {error && <div role="alert" className="mb-6 flex items-start justify-between gap-4 rounded-xl border border-warning bg-warning-soft px-4 py-3 text-sm text-warning"><span>{error}</span><button aria-label="Fechar mensagem" onClick={() => setError("")}>×</button></div>}
          {isChat ? (
            <ChatView
              environment={environment}
              conversations={conversations}
              messages={messages}
              selectedConversation={selectedConversation}
              message={message}
              sending={sending}
              setMessage={setMessage}
              onNewConversation={newConversation}
              onDeleteConversation={requestDeleteConversation}
              onRenameConversation={(conversation) => {
                const title = window.prompt("Novo nome da conversa", conversation.title);
                if (title?.trim() && title.trim() !== conversation.title) {
                  void updateConversation(conversation.id, { title: title.trim() });
                }
              }}
              onToggleArchiveConversation={(conversation) =>
                void updateConversation(conversation.id, { archived: !conversation.archivedAt })
              }
              projects={projects}
              onSend={sendMessage}
            />
          ) : isProjects ? (
            isProjectWorkspace ? (
              <ProjectWorkspaceView projectId={section[1]} />
            ) : (
              <ProjectsView
                projects={projects}
                name={projectName}
                description={projectDescription}
                category={projectCategory}
                setName={setProjectName}
                setDescription={setProjectDescription}
                setCategory={setProjectCategory}
                onCreate={createProject}
                onArchive={(project, archived) =>
                  void workspaceApi.archiveProject(project.id, archived).then(loadWorkspace).catch((reason: unknown) =>
                    setError(reason instanceof Error ? reason.message : "Não foi possível atualizar o projeto."),
                  )
                }
              />
            )
          ) : isSettings && user ? (
            <SettingsView user={user} onUserUpdated={setUser} />
          ) : isTools ? (
            <ToolsView toolSlug={section[1]} />
          ) : isFiles ? (
            <FilesView environment={environment} />
          ) : isLearn ? (
            <LearnView
              section={section}
              userName={user?.name}
              creatingConversation={creating}
              onNewConversation={newConversation}
            />
          ) : (
            <Dashboard
              environment={environment}
              user={user}
              conversations={conversations}
              projects={projects}
              onNewConversation={newConversation}
              creating={creating}
            />
          )}
        </main>
      </div>
      <dialog
        ref={deleteDialogRef}
        aria-labelledby="delete-conversation-title"
        aria-describedby="delete-conversation-description"
        onCancel={(event) => {
          if (deletingConversation) event.preventDefault();
        }}
        onClose={() => setConversationToDelete(null)}
        className="qagent-confirm-dialog fixed inset-0 m-auto rounded-xl border border-default bg-surface p-0 text-ink shadow-2xl"
      >
        <div className="p-6">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-danger-soft text-danger">
            <Trash2 size={18} />
          </div>
          <h2 id="delete-conversation-title" className="mt-4 text-base font-semibold">
            Excluir conversa?
          </h2>
          <p id="delete-conversation-description" className="mt-2 text-sm leading-6 text-muted">
            A conversa “{conversationToDelete?.title}” e todas as mensagens serão excluídas
            permanentemente. Esta ação não pode ser desfeita.
          </p>
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              disabled={deletingConversation}
              onClick={() => setConversationToDelete(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={deletingConversation}
              onClick={() => void confirmDeleteConversation()}
            >
              {deletingConversation ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <Trash2 size={15} />
              )}
              {deletingConversation ? "Excluindo..." : "Confirmar exclusão"}
            </Button>
          </div>
        </div>
      </dialog>
    </div>
  );
}

function Dashboard({
  environment,
  user,
  conversations,
  projects,
  onNewConversation,
  creating,
}: {
  environment: Environment;
  user: AuthenticatedUser | null;
  conversations: ConversationSummary[];
  projects: Array<{ id: string; name: string }>;
  onNewConversation: () => void;
  creating: boolean;
}) {
  const isLearn = environment === "LEARN";
  return (
    <div>
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div><p className={`text-xs font-bold uppercase tracking-[0.18em] ${isLearn ? "text-learn" : "text-brand"}`}>{isLearn ? "Seu espaço de aprendizado" : "Seu espaço de trabalho"}</p><h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-[38px]">Olá, {user?.name.split(" ")[0] || "bem-vindo"} <span className="inline-block origin-bottom-right animate-[wave_1.8s_ease-in-out_infinite]">✦</span></h1><p className="mt-2 text-sm text-muted">{isLearn ? "Um passo de cada vez. Seu próximo aprendizado começa aqui." : "Tudo pronto para elevar a qualidade do seu próximo projeto?"}</p></div>
        <Button onClick={onNewConversation} disabled={creating}><Plus size={17} />{isLearn ? "Conversar com tutor" : "Nova conversa"}</Button>
      </div>
      <div className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard icon={MessageSquareText} label={isLearn ? "Conversas com tutor" : "Conversas recentes"} value={conversations.length.toString()} note={isLearn ? "Suas sessões de estudo" : "Histórico da sua conta"} color={isLearn ? "purple" : "green"} />
        {isLearn ? <MetricCard icon={BookOpen} label="Sua jornada" value="Comece por aqui" note="Trilhas e conteúdos em breve" color="blue" /> : <MetricCard icon={FolderKanban} label="Projetos" value={projects.length.toString()} note="Projetos cadastrados" color="blue" />}
        {isLearn ? (
          <MetricCard icon={Target} label="Meu progresso" value="0%" note="Nenhuma trilha iniciada" color="orange" />
        ) : (
          <MetricCard icon={ClipboardCheck} label="Cobertura de testes" value="—" note="Sem execuções registradas" color="red" />
        )}
      </div>
      <section className="mt-8 rounded-3xl border border-default bg-surface p-6 shadow-card sm:p-8">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{isLearn ? "Comece sua jornada" : "Seu ponto de partida"}</p><h2 className="mt-2 text-xl font-semibold">{isLearn ? "Aprender QA, na prática" : "Um bom teste começa com boas perguntas."}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{isLearn ? "Converse com seu tutor para explorar conceitos de qualidade e organizar seus estudos." : "Use uma conversa para estruturar ideias, investigar riscos e planejar qualidade para o seu produto."}</p></div><div className={`hidden h-12 w-12 place-items-center rounded-2xl sm:grid ${isLearn ? "bg-learn-soft text-learn" : "bg-brand-soft text-brand"}`}>{isLearn ? <GraduationCap size={22} /> : <Sparkles size={22} />}</div></div>
        <Button variant="secondary" className="mt-6" onClick={onNewConversation} disabled={creating}>{isLearn ? "Iniciar conversa com tutor" : "Iniciar uma conversa"}<ChevronRight size={16} /></Button>
      </section>
      <section className="mt-8">
        <div className="flex items-center justify-between"><div><h2 className="text-base font-semibold">{isLearn ? "Conversas recentes" : "Atividade recente"}</h2><p className="mt-1 text-xs text-muted">{isLearn ? "Continue seu aprendizado" : "Retome um trabalho em andamento"}</p></div><Link href={`/${environment.toLowerCase()}/conversations`} className="text-xs font-semibold text-brand hover:underline">Ver todas</Link></div>
        {conversations.length ? <div className="mt-4 space-y-2">{conversations.slice(0, 3).map((conversation) => <Link key={conversation.id} href={`/${environment.toLowerCase()}/conversations/${conversation.id}`} className="flex items-center justify-between rounded-xl border border-default bg-surface px-4 py-3 shadow-card transition hover:border-brand/40"><span className="flex items-center gap-3 text-sm font-medium"><span className="grid h-9 w-9 place-items-center rounded-xl bg-surface-hover text-muted"><MessageSquareText size={17} /></span>{conversation.title}</span><ChevronRight size={16} className="text-muted" /></Link>)}</div> : <div className="mt-4 rounded-2xl border border-dashed border-default bg-surface px-5 py-8 text-center"><p className="text-sm font-medium">Nenhuma conversa por aqui ainda</p><p className="mt-1 text-xs text-muted">Quando iniciar uma conversa, ela aparecerá neste espaço.</p></div>}
      </section>
      {isLearn ? (
        <section className="mt-8 grid gap-4 xl:grid-cols-2">
          <article className="rounded-xl border border-default bg-surface p-5 shadow-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-muted">APRENDIZADO</p>
                <h2 className="mt-2 text-base font-semibold">Trilhas de estudo</h2>
              </div>
              <StatusBadge variant="active">Em breve</StatusBadge>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-surface-hover" role="progressbar" aria-label="Progresso de aprendizado" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0}>
              <div className="h-full w-0 rounded-full bg-brand" />
            </div>
            <p className="mt-3 text-xs text-muted">O progresso ficará disponível quando as trilhas forem habilitadas.</p>
          </article>
          <article className="rounded-xl border border-default bg-surface p-5 shadow-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-muted">PRÁTICA</p>
                <h2 className="mt-2 text-base font-semibold">Desafios</h2>
              </div>
              <StatusBadge variant="pending">Planejado</StatusBadge>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted">Desafios práticos e correções serão adicionados em uma próxima etapa.</p>
          </article>
        </section>
      ) : (
        <section className="mt-8 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-xl border border-default bg-surface p-5 shadow-card">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-muted">OPERAÇÃO</p>
                <h2 className="mt-2 text-base font-semibold">Cobertura e execução</h2>
              </div>
              <StatusBadge variant="pending">Sem dados</StatusBadge>
            </div>
            {projects.length ? (
              <div className="mt-4 divide-y divide-default">
                {projects.slice(0, 4).map((project) => (
                  <div key={project.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                    <span className="truncate font-medium">{project.name}</span>
                    <span className="shrink-0 font-mono text-xs text-muted">Sem execuções</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-md bg-surface-hover px-4 py-5 text-sm text-muted">
                Crie um projeto para organizar os indicadores de QA. Nenhuma métrica é simulada.
              </p>
            )}
          </article>
          <article className="rounded-xl border border-default border-l-[3px] border-l-brand bg-surface p-5 shadow-card">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-muted">QIA · ANÁLISE DE RISCOS</p>
                <h2 className="mt-2 text-base font-semibold">Painel de riscos</h2>
              </div>
              <StatusBadge variant="active">Aguardando análise</StatusBadge>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted">
              Nenhuma análise foi executada. Inicie uma conversa para preparar os dados da demanda.
            </p>
            <Button variant="secondary" size="small" className="mt-4" onClick={onNewConversation} disabled={creating}>
              <Sparkles size={14} /> Iniciar conversa
            </Button>
          </article>
        </section>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, note, color }: { icon: typeof MessageSquareText; label: string; value: string; note: string; color: string }) {
  const style = color === "purple" ? "bg-learn-soft text-learn" : color === "blue" ? "bg-active-soft text-active-status" : color === "orange" ? "bg-warning-soft text-warning" : "bg-brand-soft text-brand";
  return <article className="rounded-lg border border-default bg-surface p-5 shadow-card"><div className="flex items-center justify-between"><span className="text-xs font-medium text-muted">{label}</span><span className={`grid h-9 w-9 place-items-center rounded-md ${style}`}><Icon size={17} /></span></div><p className="mt-5 font-mono text-xl font-semibold">{value}</p><p className="mt-1 text-xs text-muted">{note}</p></article>;
}

function ChatView({
  environment,
  conversations,
  projects,
  messages,
  selectedConversation,
  message,
  sending,
  setMessage,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
  onToggleArchiveConversation,
  onSend,
}: {
  environment: Environment;
  conversations: ConversationSummary[];
  projects: ProjectSummary[];
  messages: ChatMessage[];
  selectedConversation?: string;
  message: string;
  sending: boolean;
  setMessage: (value: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (conversationId: string) => void;
  onRenameConversation: (conversation: ConversationSummary) => void;
  onToggleArchiveConversation: (conversation: ConversationSummary) => void;
  onSend: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selected = conversations.find((item) => item.id === selectedConversation);
  const [visibleConversations, setVisibleConversations] = useState(conversations);
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ACTIVE" | "ARCHIVED" | "ALL">("ACTIVE");
  const [sort, setSort] = useState<"updatedAt" | "createdAt">("updatedAt");
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [conversationError, setConversationError] = useState("");

  useEffect(() => {
    setVisibleConversations(conversations);
  }, [conversations]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setLoadingConversations(true);
      setConversationError("");
      void workspaceApi
        .conversations(environment, {
          search,
          projectId: projectFilter !== "all" && projectFilter !== "unassigned" ? projectFilter : undefined,
          unassigned: projectFilter === "unassigned",
          from: from || undefined,
          to: to ? `${to}T23:59:59.999Z` : undefined,
          status: statusFilter,
          sort,
        })
        .then((items) => {
          if (active) setVisibleConversations(items);
        })
        .catch((reason: unknown) => {
          if (active) setConversationError(reason instanceof Error ? reason.message : "Não foi possível pesquisar conversas.");
        })
        .finally(() => {
          if (active) setLoadingConversations(false);
        });
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [conversations, environment, from, projectFilter, search, sort, statusFilter, to]);

  useEffect(() => {
    if (selectedConversation) composerRef.current?.focus();
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      if (!sending && message.trim()) {
        event.currentTarget.form?.requestSubmit();
      }
    }
  }

  return (
    <div className="grid min-h-[calc(100vh-150px)] overflow-hidden rounded-3xl border border-default bg-surface shadow-card lg:grid-cols-[280px_1fr]">
      <aside className="border-b border-default p-4 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between"><div><h1 className="text-sm font-semibold">Conversas</h1><p className="mt-1 text-[11px] text-muted">Seu histórico privado</p></div><button onClick={onNewConversation} aria-label="Criar nova conversa" className="rounded-lg p-2 text-brand hover:bg-brand-soft"><Plus size={17} /></button></div>
        <div className="mt-4 space-y-2 border-b border-default pb-4">
          <Input aria-label="Pesquisar conversas" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar pelo nome" className="h-9 text-xs" />
          {environment === "WORK" && (
            <select aria-label="Filtrar por projeto" value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)} className="h-9 w-full rounded-md border border-default bg-surface px-2 text-xs">
              <option value="all">Todos os espaços</option><option value="unassigned">Sem projeto</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          )}
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[10px] text-muted">De<input aria-label="Data inicial" type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="mt-1 h-9 w-full rounded-md border border-default bg-surface px-2 text-[10px]" /></label>
            <label className="text-[10px] text-muted">Até<input aria-label="Data final" type="date" value={to} onChange={(event) => setTo(event.target.value)} className="mt-1 h-9 w-full rounded-md border border-default bg-surface px-2 text-[10px]" /></label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select aria-label="Filtrar por arquivamento" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="h-9 rounded-md border border-default bg-surface px-2 text-[10px]"><option value="ACTIVE">Ativas</option><option value="ARCHIVED">Arquivadas</option><option value="ALL">Todas</option></select>
            <select aria-label="Ordenar conversas" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="h-9 rounded-md border border-default bg-surface px-2 text-[10px]"><option value="updatedAt">Atualização</option><option value="createdAt">Criação</option></select>
          </div>
        </div>
        {conversationError && <p role="alert" className="mt-3 text-[11px] text-danger">{conversationError}</p>}
        <div className="mt-3 space-y-1">
          {loadingConversations && <p className="px-3 py-2 text-[10px] text-muted">Atualizando resultados...</p>}
          {visibleConversations.length ? visibleConversations.map((item) => (
            <div key={item.id} className="group flex items-center gap-1 rounded-xl">
              <Link href={`/${environment.toLowerCase()}/conversations/${item.id}`} className={`flex min-w-0 flex-1 items-start gap-2 rounded-xl px-3 py-3 text-xs ${item.id === selectedConversation ? "bg-brand-soft text-brand" : "text-muted hover:bg-surface-hover"}`}>
                <MessageSquareText size={15} className="mt-0.5 shrink-0" />
                <span className="min-w-0 truncate"><span className="block truncate">{item.title}</span><span className="mt-1 block truncate text-[10px] opacity-70">{environment === "WORK" ? item.projectName || "Sem projeto" : "QAgent Learn"}{item.archivedAt ? " · Arquivada" : ""}</span></span>
              </Link>
              <div className="flex shrink-0">
                <button type="button" aria-label={`Renomear conversa ${item.title}`} title="Renomear" onClick={() => onRenameConversation(item)} className="rounded-md p-2 text-muted hover:bg-surface-hover hover:text-brand"><Settings2 size={13} /></button>
                <button type="button" aria-label={`${item.archivedAt ? "Restaurar" : "Arquivar"} conversa ${item.title}`} title={item.archivedAt ? "Restaurar" : "Arquivar"} onClick={() => onToggleArchiveConversation(item)} className="rounded-md p-2 text-muted hover:bg-surface-hover hover:text-brand">{item.archivedAt ? <Undo2 size={13} /> : <Archive size={13} />}</button>
                <button type="button" aria-label={`Excluir conversa ${item.title}`} title="Excluir conversa" onClick={() => onDeleteConversation(item.id)} className="rounded-md p-2 text-muted transition hover:bg-danger-soft hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"><Trash2 size={13} /></button>
              </div>
            </div>
          )) : !loadingConversations && <div className="rounded-xl bg-surface-hover px-3 py-4 text-xs leading-5 text-muted">Nenhuma conversa corresponde aos filtros.</div>}
        </div>
      </aside>
      <section className="flex min-h-[500px] flex-col">
        <div className="border-b border-default px-5 py-4"><h2 className="text-sm font-semibold">{selected?.title || "Conversa com QAgent"}</h2><p className="mt-1 text-[11px] text-muted">{environment === "LEARN" ? "Tutor de Quality Assurance" : "Assistente de Quality Assurance"}</p></div>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
          {selectedConversation ? messages.length ? messages.map((item) => <div key={item.id} className={`min-w-0 max-w-[85%] overflow-hidden rounded-lg px-4 py-3 text-sm leading-6 ${item.role === "USER" ? "ml-auto break-words bg-brand text-white [overflow-wrap:anywhere]" : "mr-auto border-l-[3px] border-l-brand bg-surface-hover text-ink"}`}><p className="mb-1 text-[10px] font-bold uppercase tracking-wider opacity-60">{item.role === "USER" ? "Você" : "QIA"}</p>{item.role === "ASSISTANT" ? <MarkdownContent content={item.content} /> : <p className="whitespace-pre-wrap">{item.content}</p>}</div>) : <div className="m-auto max-w-sm text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-brand-soft text-brand"><Sparkles size={21} /></span><p className="mt-4 text-sm font-semibold">Sua conversa começa aqui</p><p className="mt-2 text-xs leading-5 text-muted">Escreva sua primeira mensagem. O histórico fica salvo na sua conta.</p></div> : <div className="m-auto max-w-sm text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-brand-soft text-brand"><MessageSquareText size={21} /></span><p className="mt-4 text-sm font-semibold">Escolha uma conversa ou comece uma nova</p><p className="mt-2 text-xs text-muted">Sua experiência é isolada no ambiente atual.</p><Button size="small" className="mt-5" onClick={onNewConversation}><Plus size={14} />Nova conversa</Button></div>}
          <div ref={messagesEndRef} />
        </div>
        {selectedConversation && <form onSubmit={onSend} className="border-t border-default p-4"><div className="flex items-end gap-2 rounded-md border border-default p-2 focus-within:border-brand"><textarea ref={composerRef} value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={handleComposerKeyDown} maxLength={10000} rows={2} placeholder="Escreva sua mensagem..." className="max-h-40 min-h-12 flex-1 resize-y border-0 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted" /><button type="submit" aria-label="Enviar mensagem" disabled={sending || !message.trim()} className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-brand text-white transition hover:bg-brand-hover disabled:opacity-40">{sending ? <LoaderCircle size={16} className="animate-spin" /> : <ArrowUp size={17} />}</button></div><p className="mt-2 text-center text-[10px] text-muted">Enter envia · Shift+Enter adiciona uma linha</p></form>}
      </section>
    </div>
  );
}

function ProjectsView({
  projects,
  name,
  description,
  category,
  setName,
  setDescription,
  setCategory,
  onCreate,
  onArchive,
}: {
  projects: ProjectSummary[];
  name: string;
  description: string;
  category: string;
  setName: (value: string) => void;
  setDescription: (value: string) => void;
  setCategory: (value: string) => void;
  onCreate: (event: FormEvent<HTMLFormElement>) => void;
  onArchive: (project: ProjectSummary, archived: boolean) => void;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "ARCHIVED" | "ALL">("ACTIVE");
  const [visibleProjects, setVisibleProjects] = useState(projects);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    setVisibleProjects(projects);
  }, [projects]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setSearching(true);
      setSearchError("");
      void workspaceApi
        .projects({ search, status })
        .then((items) => {
          if (active) setVisibleProjects(items);
        })
        .catch((reason: unknown) => {
          if (active) setSearchError(reason instanceof Error ? reason.message : "Não foi possível pesquisar projetos.");
        })
        .finally(() => {
          if (active) setSearching(false);
        });
    }, 200);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [projects, search, status]);

  return (
    <div>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">Organização</p>
        <h1 className="mt-3 text-3xl font-semibold">Projetos</h1>
        <p className="mt-2 text-sm text-muted">Cada projeto mantém suas conversas, informações, tarefas e diagramas em um espaço próprio.</p>
      </div>
      <form onSubmit={onCreate} className="mt-7 max-w-3xl rounded-2xl border border-default bg-surface p-5 shadow-card">
        <h2 className="text-base font-semibold">Criar espaço de trabalho</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-xs font-medium text-muted">Nome<Input aria-label="Nome do projeto" required maxLength={160} value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: QAgent IA" className="mt-2" /></label>
          <label className="text-xs font-medium text-muted">Categoria<Input aria-label="Categoria do projeto" maxLength={100} value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Ex.: produto, automação, estudos" className="mt-2" /></label>
        </div>
        <label className="mt-3 block text-xs font-medium text-muted">Descrição e objetivos<textarea aria-label="Descrição do projeto" maxLength={2000} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Registre o objetivo principal do projeto" className="mt-2 w-full rounded-md border border-default bg-surface px-3.5 py-3 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand-soft" /></label>
        <Button type="submit" className="mt-4"><Plus size={16} />Criar projeto</Button>
      </form>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Input aria-label="Pesquisar projetos" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar projetos..." className="sm:max-w-sm" />
        <select aria-label="Filtrar projetos por status" value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="h-11 rounded-md border border-default bg-surface px-3 text-sm"><option value="ACTIVE">Ativos</option><option value="ARCHIVED">Arquivados</option><option value="ALL">Todos</option></select>
      </div>
      {searchError && <p role="alert" className="mt-3 text-sm text-danger">{searchError}</p>}
      {searching && <p className="mt-3 text-xs text-muted">Atualizando resultados...</p>}
      {visibleProjects.length ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleProjects.map((project) => {
            const archived = project.status === "ARCHIVED";
            return (
              <article key={project.id} className="flex flex-col rounded-2xl border border-default bg-surface p-5 shadow-card">
                <div className="flex items-start justify-between gap-3"><FolderKanban className="text-brand" size={20} />{archived && <span className="rounded-full bg-surface-hover px-2 py-1 text-[10px] font-semibold text-muted">Arquivado</span>}</div>
                <Link href={`/work/projects/${project.id}`} className="mt-4 text-base font-semibold hover:text-brand">{project.name}</Link>
                <p className="mt-2 min-h-10 text-xs leading-5 text-muted">{project.description || "Projeto privado da sua conta."}</p>
                {project.category && <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-muted">{project.category}</p>}
                <div className="mt-4 flex items-center justify-between border-t border-default pt-3">
                  <Link href={`/work/projects/${project.id}`} className="text-xs font-semibold text-brand hover:underline">Abrir espaço</Link>
                  <Button type="button" variant="ghost" size="small" onClick={() => onArchive(project, !archived)}>{archived ? <Undo2 size={14} /> : <Archive size={14} />}{archived ? "Restaurar" : "Arquivar"}</Button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed border-default bg-surface px-5 py-12 text-center"><FolderKanban className="mx-auto text-muted" size={23} /><p className="mt-3 text-sm font-medium">{search || status === "ARCHIVED" ? "Nenhum projeto encontrado" : "Seus projetos aparecerão aqui"}</p><p className="mt-1 text-xs text-muted">Crie um projeto para organizar suas atividades de QA.</p></div>
      )}
    </div>
  );
}

