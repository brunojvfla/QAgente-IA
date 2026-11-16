"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  ArrowLeft,
  Clipboard,
  Code2,
  FileSearch,
  ListChecks,
  LoaderCircle,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { QaToolType } from "@qagent/shared";
import { ApiError, aiApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { MarkdownContent } from "./markdown-content";

type ToolField = {
  key: string;
  label: string;
  placeholder?: string;
  options?: string[];
};

type ToolConfig = {
  type: QaToolType;
  slug: string;
  title: string;
  description: string;
  inputLabel: string;
  placeholder: string;
  outcome: string;
  fields: ToolField[];
  icon: typeof FileSearch;
  accent: string;
};

const tools: ToolConfig[] = [
  {
    type: "REQUIREMENT_ANALYSIS",
    slug: "requirement-analysis",
    title: "Análise de requisitos",
    description: "Entenda a demanda, identifique critérios de aceite e descubra ambiguidades antes de testar.",
    inputLabel: "Demanda ou história",
    placeholder: "Descreva a funcionalidade, história de usuário ou requisito...",
    outcome: "Requisitos, critérios, pontos de atenção e dúvidas em aberto.",
    fields: [
      {
        key: "kind",
        label: "Tipo de material",
        options: ["História de usuário", "Requisito funcional", "Correção de defeito", "Fluxo ou integração", "Outro"],
      },
      {
        key: "acceptance",
        label: "Critérios de aceite existentes",
        placeholder: "Opcional: cole os critérios já acordados...",
      },
      {
        key: "context",
        label: "Contexto adicional",
        placeholder: "Produto, usuário ou regra já confirmada...",
      },
    ],
    icon: FileSearch,
    accent: "bg-active-soft text-active-status",
  },
  {
    type: "RISK_ANALYSIS",
    slug: "risk-analysis",
    title: "Análise de riscos",
    description: "Priorize o que pode falhar considerando impacto, probabilidade, regressão e dependências.",
    inputLabel: "Funcionalidade ou alteração",
    placeholder: "Descreva a mudança e o comportamento afetado...",
    outcome: "Riscos justificados, prioridade, mitigação e cobertura sugerida.",
    fields: [
      {
        key: "criticality",
        label: "Criticidade conhecida",
        options: ["Não informada", "Baixa", "Média", "Alta"],
      },
      {
        key: "impact",
        label: "Áreas ou usuários impactados",
        placeholder: "Ex.: fluxo de pagamento, usuários administradores...",
      },
      {
        key: "dependencies",
        label: "Dependências e integrações",
        placeholder: "APIs, serviços ou sistemas envolvidos...",
      },
    ],
    icon: ShieldAlert,
    accent: "bg-warning-soft text-warning",
  },
  {
    type: "TEST_CASES",
    slug: "test-cases",
    title: "Casos de teste",
    description: "Transforme os requisitos em cenários rastreáveis e executáveis, com resultados esperados.",
    inputLabel: "Requisito ou comportamento",
    placeholder: "Cole a demanda e o comportamento que precisa ser validado...",
    outcome: "Cenários, pré-condições, dados, passos e resultados esperados.",
    fields: [
      {
        key: "criteria",
        label: "Critérios de aceite",
        placeholder: "Critérios confirmados para rastrear os cenários...",
      },
      {
        key: "data",
        label: "Dados e condições de teste",
        placeholder: "Contas, estados, permissões ou limites conhecidos...",
      },
      {
        key: "constraints",
        label: "Restrições ou casos especiais",
        placeholder: "Compatibilidade, regras de acesso, integrações...",
      },
    ],
    icon: ListChecks,
    accent: "bg-brand-soft text-brand",
  },
  {
    type: "BDD",
    slug: "bdd",
    title: "Cenários BDD",
    description: "Expresse comportamentos confirmados em cenários Gherkin claros e rastreáveis.",
    inputLabel: "Comportamento a descrever",
    placeholder: "Explique o comportamento esperado em linguagem natural...",
    outcome: "Funcionalidade e cenários Given/When/Then em português.",
    fields: [
      {
        key: "actor",
        label: "Ator ou perfil",
        placeholder: "Quem executa o fluxo? Deixe em branco se não estiver definido...",
      },
      {
        key: "precondition",
        label: "Dado (pré-condição)",
        placeholder: "Estado inicial conhecido...",
      },
      {
        key: "trigger",
        label: "Quando (ação)",
        placeholder: "Ação ou evento que inicia o comportamento...",
      },
      {
        key: "expected",
        label: "Então (resultado)",
        placeholder: "Resultado esperado confirmado...",
      },
    ],
    icon: Code2,
    accent: "bg-learn-soft text-learn",
  },
];

type HistoryItem = {
  id: string;
  tool: QaToolType;
  input: string;
  result: string;
  model: string;
  createdAt: string;
};

function composeToolInput(
  tool: ToolConfig,
  input: string,
  details: Record<string, string>,
): string {
  const additionalDetails = tool.fields
    .filter((field) => details[field.key]?.trim())
    .map((field) => `${field.label}:\n${details[field.key].trim()}`);
  return [`${tool.inputLabel}:\n${input.trim()}`, ...additionalDetails].join("\n\n");
}

export function ToolsView({ toolSlug }: { toolSlug?: string }) {
  const activeTool = tools.find((tool) => tool.slug === toolSlug);
  const [input, setInput] = useState("");
  const [details, setDetails] = useState<Record<string, string>>({});
  const [result, setResult] = useState<HistoryItem | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const promptLength = activeTool ? composeToolInput(activeTool, input, details).length : 0;

  useEffect(() => {
    let active = true;
    aiApi.toolsHistory()
      .then((items) => {
        if (active) setHistory(items);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Não foi possível carregar o histórico.");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setInput("");
    setDetails({});
    setResult(null);
    setError("");
  }, [activeTool?.type]);

  async function execute(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeTool || loading || !input.trim()) return;
    const prompt = composeToolInput(activeTool, input, details);
    if (prompt.length > 15000) {
      setError("O conteúdo total, incluindo os detalhes adicionais, deve ter até 15.000 caracteres.");
      return;
    }
    setLoading(true);
    setError("");
    setCopied(false);

    try {
      const item = await aiApi.runTool(activeTool.type, prompt);
      setResult(item);
      setHistory((current) => [item, ...current.filter((entry) => entry.id !== item.id)].slice(0, 20));
      setInput("");
      setDetails({});
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Não foi possível executar a ferramenta.");
    } finally {
      setLoading(false);
    }
  }

  async function copyResult() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.result);
      setCopied(true);
    } catch {
      setError("Não foi possível copiar o resultado neste navegador.");
    }
  }

  return (
    <div className="space-y-7">
      {activeTool ? (
        <>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <Link href="/work/tools" className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-brand">
                <ArrowLeft size={14} /> Todas as ferramentas
              </Link>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">QAgent Work · Ambiente de trabalho</p>
              <h1 className="mt-2 text-3xl font-semibold">{activeTool.title}</h1>
              <p className="mt-2 max-w-3xl text-sm text-muted">{activeTool.description}</p>
            </div>
            <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${activeTool.accent}`}>
              <activeTool.icon size={22} />
            </div>
          </div>
          {error && <div role="alert" className="rounded-xl border border-danger bg-danger-soft px-4 py-3 text-sm text-danger">{error}</div>}
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.75fr)]">
            <section className="rounded-2xl border border-default bg-surface p-5 shadow-card sm:p-7">
              <div className="mb-6 flex items-start justify-between gap-4 border-b border-default pb-5">
                <div>
                  <h2 className="text-base font-semibold">Preparar análise</h2>
                  <p className="mt-1 text-xs text-muted">Inclua somente informações confirmadas; a QIA sinalizará o que ainda estiver em aberto.</p>
                </div>
                <span className="hidden rounded-full bg-surface-hover px-3 py-1 text-[10px] font-semibold text-muted sm:inline-flex">{activeTool.outcome}</span>
              </div>
              <form onSubmit={execute} className={activeTool.type === "RISK_ANALYSIS" ? "grid gap-x-5 gap-y-4 sm:grid-cols-2" : "space-y-4"}>
                <label className={`block space-y-2 text-sm font-medium ${activeTool.type === "RISK_ANALYSIS" ? "sm:col-span-2" : ""}`}>
                  {activeTool.inputLabel}
                  <textarea
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    required
                    maxLength={15000}
                    rows={activeTool.type === "BDD" ? 5 : 7}
                    placeholder={activeTool.placeholder}
                    className="w-full resize-y rounded-xl border border-default bg-surface px-3.5 py-3 text-sm leading-6 outline-none focus:border-brand focus:ring-4 focus:ring-brand-soft"
                  />
                  <span className={`block text-right text-xs font-normal ${promptLength > 15000 ? "text-danger" : "text-muted"}`}>{promptLength}/15000 caracteres no total</span>
                </label>
                {activeTool.fields.map((field) => (
                  <label
                    key={field.key}
                    className={`block space-y-2 text-sm font-medium ${
                      activeTool.type === "REQUIREMENT_ANALYSIS" && field.key === "context"
                        ? "sm:col-span-2"
                        : activeTool.type === "TEST_CASES" && field.key === "constraints"
                          ? "sm:col-span-2"
                          : activeTool.type === "BDD" && field.key === "expected"
                            ? "sm:col-span-2"
                            : ""
                    }`}
                  >
                    {field.label}
                    {field.options ? (
                      <select
                        value={details[field.key] || ""}
                        onChange={(event) => setDetails((current) => ({ ...current, [field.key]: event.target.value }))}
                        className="h-11 w-full rounded-xl border border-default bg-surface px-3 text-sm"
                      >
                        <option value="">Não informado</option>
                        {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    ) : (
                      <textarea
                        value={details[field.key] || ""}
                        onChange={(event) => setDetails((current) => ({ ...current, [field.key]: event.target.value }))}
                        maxLength={5000}
                        rows={activeTool.type === "RISK_ANALYSIS" ? 3 : 4}
                        placeholder={field.placeholder}
                        className="w-full resize-y rounded-xl border border-default bg-surface px-3.5 py-3 text-sm leading-6 outline-none focus:border-brand focus:ring-4 focus:ring-brand-soft"
                      />
                    )}
                  </label>
                ))}
                <div className={activeTool.type === "RISK_ANALYSIS" ? "sm:col-span-2" : ""}>
                  <Button type="submit" disabled={loading || !input.trim() || promptLength > 15000}>
                    {loading ? <LoaderCircle size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    {loading ? "Analisando..." : `Executar ${activeTool.title.toLowerCase()}`}
                  </Button>
                </div>
              </form>
            </section>
            <HistoryPanel history={history.filter((item) => item.tool === activeTool.type)} result={result} onSelect={setResult} />
          </div>
          {result && (
            <section className="rounded-2xl border border-default bg-surface p-5 shadow-card sm:p-7">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-brand">Resultado · {tools.find((tool) => tool.type === result.tool)?.title}</p>
                  <p className="mt-1 text-xs text-muted">Modelo: {result.model} · {new Date(result.createdAt).toLocaleString("pt-BR")}</p>
                </div>
                <Button type="button" variant="secondary" size="small" onClick={() => void copyResult()}>
                  <Clipboard size={14} />{copied ? "Copiado" : "Copiar resultado"}
                </Button>
              </div>
              <div className="mt-5 border-t border-default pt-4 text-sm leading-6">
                <MarkdownContent content={result.result} />
              </div>
            </section>
          )}
        </>
      ) : (
        <>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">QAgent Work</p>
            <h1 className="mt-3 text-3xl font-semibold">Ferramentas de QA</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted">Escolha um espaço de trabalho. Cada ferramenta tem entradas próprias e mantém o resultado no seu histórico do Work.</p>
          </div>
          {error && <div role="alert" className="rounded-xl border border-danger bg-danger-soft px-4 py-3 text-sm text-danger">{error}</div>}
          <div className="grid gap-5 md:grid-cols-2">
            {tools.map((tool) => (
              <article key={tool.type} className="flex min-h-56 flex-col rounded-2xl border border-default bg-surface p-6 shadow-card transition hover:-translate-y-0.5 hover:border-brand/40">
                <span className={`grid h-11 w-11 place-items-center rounded-xl ${tool.accent}`}><tool.icon size={20} /></span>
                <h2 className="mt-5 text-lg font-semibold">{tool.title}</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-muted">{tool.description}</p>
                <div className="mt-auto flex items-center justify-between gap-4 pt-5">
                  <span className="text-xs text-muted">{tool.outcome}</span>
                  <Link href={`/work/tools/${tool.slug}`} className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-brand px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-brand-hover">
                    Abrir ferramenta <tool.icon size={14} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
          <section className="rounded-2xl border border-default bg-surface p-5 shadow-card sm:p-6">
            <div>
              <h2 className="text-sm font-semibold">Atividade recente</h2>
              <p className="mt-1 text-xs text-muted">Resultados salvos na sua conta Work.</p>
            </div>
            {history.length ? (
              <div className="mt-4 grid gap-2 lg:grid-cols-2">
                {history.slice(0, 8).map((item) => (
                  <Link
                    key={item.id}
                    href={`/work/tools/${tools.find((tool) => tool.type === item.tool)?.slug || ""}`}
                    className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-default px-4 py-3 transition hover:bg-surface-hover"
                  >
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold">{tools.find((tool) => tool.type === item.tool)?.title}</span>
                      <span className="mt-1 block truncate text-xs text-muted">{item.input}</span>
                    </span>
                    <span className="shrink-0 text-[10px] text-muted">{new Date(item.createdAt).toLocaleDateString("pt-BR")}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-xl bg-surface-hover px-4 py-5 text-center text-xs text-muted">Nenhuma execução salva. Escolha uma ferramenta para começar.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function HistoryPanel({
  history,
  result,
  onSelect,
}: {
  history: HistoryItem[];
  result: HistoryItem | null;
  onSelect: (item: HistoryItem) => void;
}) {
  return (
    <aside className="rounded-2xl border border-default bg-surface p-5 shadow-card sm:p-6">
      <h2 className="text-sm font-semibold">Histórico da ferramenta</h2>
      <p className="mt-1 text-xs text-muted">Até 20 execuções recentes da sua conta.</p>
      {history.length ? (
        <div className="mt-4 max-h-[560px] space-y-2 overflow-y-auto">
          {history.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item)}
              className={`w-full rounded-xl border px-3 py-3 text-left transition ${result?.id === item.id ? "border-brand bg-brand-soft/50" : "border-default hover:bg-surface-hover"}`}
            >
              <span className="block text-xs font-semibold">{tools.find((tool) => tool.type === item.tool)?.title}</span>
              <span className="mt-1 block truncate text-xs text-muted">{item.input}</span>
              <time className="mt-2 block text-[10px] text-muted">{new Date(item.createdAt).toLocaleString("pt-BR")}</time>
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-xl bg-surface-hover px-3 py-4 text-xs leading-5 text-muted">Nenhuma execução desta conta foi salva ainda.</p>
      )}
    </aside>
  );
}
