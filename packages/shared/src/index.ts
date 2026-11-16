export const ENVIRONMENTS = ["WORK", "LEARN"] as const;
export type Environment = (typeof ENVIRONMENTS)[number];

export const WRITING_STYLES = ["NATURAL", "BALANCED", "STRUCTURED", "OBJECTIVE"] as const;
export type WritingStyle = (typeof WRITING_STYLES)[number];

export const RESPONSE_DETAILS = ["SHORT", "MEDIUM", "COMPLETE"] as const;
export type ResponseDetail = (typeof RESPONSE_DETAILS)[number];

export const QA_TOOL_TYPES = [
  "REQUIREMENT_ANALYSIS",
  "RISK_ANALYSIS",
  "TEST_CASES",
  "BDD",
] as const;
export type QaToolType = (typeof QA_TOOL_TYPES)[number];

export const PROJECT_KNOWLEDGE_KINDS = [
  "DOCUMENT",
  "DECISION",
  "REQUIREMENT",
  "FILE_LINK",
] as const;
export type ProjectKnowledgeKind = (typeof PROJECT_KNOWLEDGE_KINDS)[number];

export const PROJECT_TASK_STATUSES = ["TODO", "IN_PROGRESS", "DONE"] as const;
export type ProjectTaskStatus = (typeof PROJECT_TASK_STATUSES)[number];

export const PROJECT_TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export type ProjectTaskPriority = (typeof PROJECT_TASK_PRIORITIES)[number];

export const PROJECT_DIAGRAM_NODE_TYPES = ["START", "PROCESS", "DECISION", "END"] as const;
export type ProjectDiagramNodeType = (typeof PROJECT_DIAGRAM_NODE_TYPES)[number];

export interface ProjectDiagramNode {
  id: string;
  label: string;
  type: ProjectDiagramNodeType;
  x: number;
  y: number;
}

export interface ProjectDiagramEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface ProjectDiagramDefinition {
  nodes: ProjectDiagramNode[];
  edges: ProjectDiagramEdge[];
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  status: "ACTIVE" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
  _count?: { conversations: number; knowledge: number; tasks: number; diagrams: number };
}

export interface ProjectKnowledgeItem {
  id: string;
  kind: ProjectKnowledgeKind;
  title: string;
  content: string;
  externalUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectTaskItem {
  id: string;
  title: string;
  description: string | null;
  status: ProjectTaskStatus;
  priority: ProjectTaskPriority;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDiagramItem {
  id: string;
  name: string;
  definition: ProjectDiagramDefinition;
  createdAt: string;
  updatedAt: string;
}

export interface LearnLessonSummary {
  id: string;
  title: string;
  summary: string;
  estimatedMinutes: number;
}

export interface LearnTrack {
  id: string;
  title: string;
  description: string;
  level: "INICIANTE" | "INTERMEDIARIO";
  lessons: LearnLessonSummary[];
  progress: {
    completedLessons: number;
    completionPercent: number;
    averageScore: number | null;
  };
}

export interface LearnLesson {
  id: string;
  trackId: string;
  trackTitle: string;
  title: string;
  summary: string;
  estimatedMinutes: number;
  content: string[];
  keyTakeaways: string[];
  exercise: {
    id: string;
    prompt: string;
  };
}

export interface LearnChallenge extends LearnLessonSummary {
  trackId: string;
  trackTitle: string;
  completed: boolean;
}

export interface LearnProgressItem {
  lessonId: string;
  attempts: number;
  bestScore: number | null;
  completedAt: string | null;
  lastAttemptAt: string | null;
}

export interface LearnProgressSummary {
  completedLessons: number;
  totalLessons: number;
  attempts: number;
  averageScore: number | null;
  tracks: Array<{
    trackId: string;
    title: string;
    completedLessons: number;
    totalLessons: number;
    completionPercent: number;
    averageScore: number | null;
  }>;
  lessons: LearnProgressItem[];
}

export interface LearnAttemptResult {
  id: string;
  lessonId: string;
  score: number;
  passed: boolean;
  feedback: string;
  strengths: string[];
  improvements: string[];
  createdAt: string;
}

export interface WorkspaceFolder {
  id: string;
  name: string;
  parentId: string | null;
  projectId: string | null;
  projectName: string | null;
  updatedAt: string;
  childCount: number;
  fileCount: number;
  pathLabel?: string;
}

export interface WorkspaceFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  folderId: string | null;
  projectId: string | null;
  projectName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FileDirectoryListing {
  currentFolder: WorkspaceFolder | null;
  breadcrumbs: Array<{ id: string; name: string }>;
  folders: WorkspaceFolder[];
  files: WorkspaceFile[];
}

const BRAZILIAN_DDDS =
  "(?:11|12|13|14|15|16|17|18|19|21|22|24|27|28|31|32|33|34|35|37|38|41|42|43|44|45|46|47|48|49|51|53|54|55|61|62|63|64|65|66|67|68|69|71|73|74|75|77|79|81|82|83|84|85|86|87|88|89|91|92|93|94|95|96|97|98|99)";
export const BRAZILIAN_PHONE_E164_PATTERN = new RegExp(
  `^\\+55${BRAZILIAN_DDDS}(?:[2-9]\\d{7}|9\\d{8})$`,
);

export function normalizeBrazilianPhone(value: string): string | null {
  const rawDigits = value.replace(/\D/g, "");
  const nationalDigits =
    rawDigits.length > 11 && rawDigits.startsWith("55")
      ? rawDigits.slice(2)
      : rawDigits;
  const normalized = `+55${nationalDigits}`;
  return BRAZILIAN_PHONE_E164_PATTERN.test(normalized) ? normalized : null;
}

export function formatBrazilianPhone(value: string): string {
  const rawDigits = value.replace(/\D/g, "");
  const digits = (
    rawDigits.length > 11 && rawDigits.startsWith("55")
      ? rawDigits.slice(2)
      : rawDigits
  ).slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : "";

  const areaCode = digits.slice(0, 2);
  const subscriber = digits.slice(2);
  const splitAt = digits.length > 10 ? 5 : 4;
  const firstPart = subscriber.slice(0, splitAt);
  const secondPart = subscriber.slice(splitAt);
  return `(${areaCode}) ${firstPart}${secondPart ? `-${secondPart}` : ""}`;
}

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  profile: Environment;
}

export interface UserPreferences {
  writingStyle: WritingStyle;
  responseDetail: ResponseDetail;
  aiModel: string | null;
}

export interface ConversationSummary {
  id: string;
  title: string;
  environment: Environment;
  projectId: string | null;
  projectName: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectAiContext {
  name: string;
  description: string | null;
  category: string | null;
  notes: Array<{ kind: string; title: string; content: string }>;
  tasks: Array<{ title: string; status: string; description: string | null }>;
}

export interface ChatMessage {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  createdAt: string;
}
