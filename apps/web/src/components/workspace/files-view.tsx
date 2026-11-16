"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowLeft,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  LoaderCircle,
  Move,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Environment, FileDirectoryListing, WorkspaceFolder } from "@qagent/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, filesApi } from "@/lib/api";

type Props = {
  environment: Environment;
  projectId?: string;
  embedded?: boolean;
  readOnly?: boolean;
};
type MoveTarget = { id: string; type: "folder" | "file"; name: string; projectId: string | null };

export function FilesView({
  environment,
  projectId: projectIdProp,
  embedded = false,
  readOnly = false,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = projectIdProp ?? searchParams.get("projectId");
  const [folderId, setFolderId] = useState<string | null>(null);
  const [listing, setListing] = useState<FileDirectoryListing | null>(null);
  const [allFolders, setAllFolders] = useState<WorkspaceFolder[]>([]);
  const [folderName, setFolderName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [moving, setMoving] = useState<MoveTarget | null>(null);
  const [destinationFolderId, setDestinationFolderId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    const [directory, folders] = await Promise.all([
      filesApi.list(environment, { folderId, projectId }),
      filesApi.folders(environment, projectId),
    ]);
    setListing(directory);
    setAllFolders(folders);
  }, [environment, folderId, projectId]);

  useEffect(() => {
    setFolderId(null);
  }, [environment, projectId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    load()
      .catch((reason: unknown) => {
        if (reason instanceof ApiError && reason.status === 401) {
          router.replace("/login");
          return;
        }
        if (active) setError(reason instanceof Error ? reason.message : "Não foi possível carregar os arquivos.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [load, router]);

  const activeProjectId =
    listing?.currentFolder?.projectId ?? projectId ?? undefined;
  const availableDestinations = useMemo(
    () =>
      allFolders.filter(
        (folder) =>
          folder.projectId === moving?.projectId &&
          !(moving.type === "folder" && folder.id === moving.id),
      ),
    [allFolders, moving],
  );

  async function runAction(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await action();
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível concluir a operação.");
    } finally {
      setBusy(false);
    }
  }

  async function createFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!folderName.trim()) return;
    await runAction(async () => {
      await filesApi.createFolder({
        environment,
        name: folderName.trim(),
        ...(folderId && { parentId: folderId }),
        ...(!folderId && projectId && { projectId }),
      });
      setFolderName("");
    });
  }

  async function uploadFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFile) return;
    const form = event.currentTarget;
    await runAction(async () => {
      await filesApi.upload(environment, selectedFile, folderId, activeProjectId);
      setSelectedFile(null);
      form.reset();
    });
  }

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    setSelectedFile(event.target.files?.[0] || null);
  }

  async function renameFolder(folder: WorkspaceFolder) {
    const name = window.prompt("Novo nome da pasta", folder.name);
    if (!name?.trim() || name.trim() === folder.name) return;
    await runAction(() => filesApi.renameFolder(environment, folder.id, name.trim()));
  }

  async function deleteFolder(folder: WorkspaceFolder) {
    if (!window.confirm(`Excluir a pasta "${folder.name}"? A pasta precisa estar vazia.`)) return;
    await runAction(() => filesApi.deleteFolder(environment, folder.id));
  }

  async function renameFile(fileId: string, currentName: string) {
    const name = window.prompt("Novo nome do arquivo", currentName);
    if (!name?.trim() || name.trim() === currentName) return;
    await runAction(() => filesApi.renameFile(environment, fileId, name.trim()));
  }

  async function deleteFile(fileId: string, name: string) {
    if (!window.confirm(`Excluir o arquivo "${name}" permanentemente?`)) return;
    await runAction(() => filesApi.deleteFile(environment, fileId));
  }

  async function saveMove(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!moving) return;
    await runAction(async () => {
      if (moving.type === "folder") {
        await filesApi.moveFolder(environment, moving.id, destinationFolderId || null);
      } else {
        await filesApi.moveFile(environment, moving.id, destinationFolderId || null);
      }
      setMoving(null);
    });
  }

  function openMove(target: MoveTarget) {
    setMoving(target);
    setDestinationFolderId("");
  }

  if (loading) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-sm text-muted">
        <span className="flex items-center gap-2"><LoaderCircle className="animate-spin" size={18} />Carregando arquivos...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.17em] text-brand">
            {environment === "WORK" ? "QAgent Work" : "QAgent Learn"}
          </p>
          <h1 className={embedded ? "mt-2 text-xl font-semibold" : "mt-2 text-2xl font-semibold sm:text-3xl"}>
            {projectId ? "Arquivos do projeto" : "Arquivos e pastas"}
          </h1>
          {!embedded && (
            <p className="mt-2 text-sm text-muted">
              Armazenamento local e privado, separado por usuário e ambiente.
            </p>
          )}
        </div>
        {projectId && !embedded && (
          <Link href="/work/projects" className="inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-ink">
            <ArrowLeft size={14} /> Voltar aos projetos
          </Link>
        )}
      </div>

      {error && (
        <div role="alert" className="mt-5 flex items-start justify-between gap-3 rounded-xl border border-warning bg-warning-soft px-4 py-3 text-sm text-warning">
          <span>{error}</span><button aria-label="Fechar mensagem" onClick={() => setError("")}><X size={15} /></button>
        </div>
      )}

      <section className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.75fr)]">
        <form onSubmit={createFolder} className="flex flex-col gap-3 rounded-xl border border-default bg-surface p-4 shadow-card sm:flex-row sm:items-end">
          <label className="flex-1 text-xs font-semibold text-muted">
            Nova pasta
            <Input value={folderName} onChange={(event) => setFolderName(event.target.value)} maxLength={180} placeholder="Nome da pasta" className="mt-2" disabled={readOnly} />
          </label>
          <Button type="submit" variant="secondary" disabled={busy || readOnly || !folderName.trim()}><Plus size={15} /> Criar pasta</Button>
        </form>
        <form onSubmit={uploadFile} className="flex flex-col gap-3 rounded-xl border border-default bg-surface p-4 shadow-card sm:flex-row sm:items-end">
          <label className="flex-1 text-xs font-semibold text-muted">
            Enviar arquivo · até 10 MB
            <input type="file" onChange={selectFile} disabled={readOnly} className="mt-2 block w-full text-xs text-muted file:mr-3 file:rounded-md file:border-0 file:bg-brand-soft file:px-3 file:py-2 file:text-xs file:font-semibold file:text-brand" />
          </label>
          <Button type="submit" disabled={busy || readOnly || !selectedFile}><Upload size={15} /> Enviar</Button>
        </form>
      </section>
      {readOnly && (
        <p className="mt-3 text-xs text-muted">Este projeto está arquivado; arquivos podem ser consultados, mas não alterados.</p>
      )}

      <section className="mt-6 rounded-xl border border-default bg-surface shadow-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-default px-4 py-3 text-xs">
          <button type="button" onClick={() => setFolderId(null)} className={`font-semibold ${folderId ? "text-muted hover:text-ink" : "text-ink"}`}>
            Raiz
          </button>
          {listing?.breadcrumbs.map((crumb) => (
            <span key={crumb.id} className="inline-flex items-center gap-2">
              <ChevronRight size={13} className="text-muted" />
              <button type="button" onClick={() => setFolderId(crumb.id)} className={`max-w-40 truncate font-semibold ${crumb.id === folderId ? "text-ink" : "text-muted hover:text-ink"}`}>
                {crumb.name}
              </button>
            </span>
          ))}
          {listing?.currentFolder?.projectName && (
            <span className="ml-auto rounded-full bg-surface-hover px-2.5 py-1 text-[10px] text-muted">
              {listing.currentFolder.projectName}
            </span>
          )}
        </div>

        {listing && listing.folders.length + listing.files.length > 0 ? (
          <div className="divide-y divide-default">
            {listing.folders.map((folder) => (
              <div key={folder.id} className="flex items-center gap-3 px-4 py-3">
                <button type="button" onClick={() => setFolderId(folder.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand"><Folder size={17} /></span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{folder.name}</span>
                    <span className="block text-[11px] text-muted">
                      {folder.childCount} pasta(s) · {folder.fileCount} arquivo(s)
                      {!folderId && folder.projectName ? ` · ${folder.projectName}` : ""}
                    </span>
                  </span>
                </button>
                <button type="button" title="Renomear pasta" aria-label={`Renomear ${folder.name}`} disabled={busy || readOnly} onClick={() => void renameFolder(folder)} className="rounded-md p-2 text-muted hover:bg-surface-hover hover:text-ink disabled:opacity-40"><Pencil size={14} /></button>
                <button type="button" title="Mover pasta" aria-label={`Mover ${folder.name}`} disabled={busy || readOnly} onClick={() => openMove({ id: folder.id, type: "folder", name: folder.name, projectId: folder.projectId })} className="rounded-md p-2 text-muted hover:bg-surface-hover hover:text-ink disabled:opacity-40"><Move size={14} /></button>
                <button type="button" title="Excluir pasta" aria-label={`Excluir ${folder.name}`} disabled={busy || readOnly} onClick={() => void deleteFolder(folder)} className="rounded-md p-2 text-muted hover:bg-danger-soft hover:text-danger disabled:opacity-40"><Trash2 size={14} /></button>
                <button type="button" aria-label={`Abrir ${folder.name}`} onClick={() => setFolderId(folder.id)} className="rounded-md p-2 text-muted hover:bg-surface-hover"><FolderOpen size={15} /></button>
              </div>
            ))}
            {listing.files.map((file) => (
              <div key={file.id} className="flex items-center gap-3 px-4 py-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-hover text-muted"><FileText size={17} /></span>
                <div className="min-w-0 flex-1">
                  <a href={filesApi.contentUrl(environment, file.id)} target="_blank" rel="noreferrer" className="block truncate text-sm font-semibold hover:text-brand">{file.name}</a>
                  <p className="mt-1 truncate text-[11px] text-muted">
                    {formatFileSize(file.size)} · {file.mimeType}
                    {!folderId && file.projectName ? ` · ${file.projectName}` : ""}
                  </p>
                </div>
                <a href={filesApi.contentUrl(environment, file.id, true)} aria-label={`Baixar ${file.name}`} title="Baixar" className="rounded-md p-2 text-muted hover:bg-surface-hover hover:text-ink"><ArrowDownToLine size={15} /></a>
                <button type="button" title="Renomear arquivo" aria-label={`Renomear ${file.name}`} disabled={busy || readOnly} onClick={() => void renameFile(file.id, file.name)} className="rounded-md p-2 text-muted hover:bg-surface-hover hover:text-ink disabled:opacity-40"><Pencil size={14} /></button>
                <button type="button" title="Mover arquivo" aria-label={`Mover ${file.name}`} disabled={busy || readOnly} onClick={() => openMove({ id: file.id, type: "file", name: file.name, projectId: file.projectId })} className="rounded-md p-2 text-muted hover:bg-surface-hover hover:text-ink disabled:opacity-40"><Move size={14} /></button>
                <button type="button" title="Excluir arquivo" aria-label={`Excluir ${file.name}`} disabled={busy || readOnly} onClick={() => void deleteFile(file.id, file.name)} className="rounded-md p-2 text-muted hover:bg-danger-soft hover:text-danger disabled:opacity-40"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-14 text-center">
            <FolderOpen className="mx-auto text-muted" size={24} />
            <p className="mt-3 text-sm font-semibold">Esta pasta está vazia</p>
            <p className="mt-1 text-xs text-muted">Crie uma pasta ou envie um arquivo para começar.</p>
          </div>
        )}
      </section>

      {moving && !readOnly && (
        <div role="presentation" className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4">
          <form role="dialog" aria-modal="true" aria-labelledby="move-title" onSubmit={saveMove} className="w-full max-w-md rounded-xl border border-default bg-surface p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div><h2 id="move-title" className="text-base font-semibold">Mover “{moving.name}”</h2><p className="mt-1 text-xs text-muted">Escolha a pasta de destino no mesmo projeto.</p></div>
              <button type="button" aria-label="Fechar" onClick={() => setMoving(null)} className="rounded-md p-1 text-muted hover:bg-surface-hover"><X size={17} /></button>
            </div>
            <label className="mt-5 block text-xs font-semibold text-muted">
              Destino
              <select value={destinationFolderId} onChange={(event) => setDestinationFolderId(event.target.value)} className="mt-2 h-11 w-full rounded-md border border-default bg-surface px-3 text-sm text-ink">
                <option value="">{moving.projectId ? "Raiz do projeto" : "Raiz do ambiente"}</option>
                {availableDestinations.map((folder) => <option key={folder.id} value={folder.id}>{folder.pathLabel || folder.name}</option>)}
              </select>
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setMoving(null)}>Cancelar</Button>
              <Button type="submit" disabled={busy}>{busy ? <LoaderCircle className="animate-spin" size={15} /> : <Move size={15} />} Mover</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
