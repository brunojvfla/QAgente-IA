import { notFound } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ environment: string; section?: string[] }>;
}) {
  const { environment, section = [] } = await params;
  if (environment !== "work" && environment !== "learn") notFound();
  return <WorkspaceShell environment={environment.toUpperCase() as "WORK" | "LEARN"} section={section} />;
}
