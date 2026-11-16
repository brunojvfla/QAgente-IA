"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AuthenticatedUser,
  formatBrazilianPhone,
  normalizeBrazilianPhone,
  UserPreferences,
} from "@qagent/shared";
import { LogOut, Save, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { ApiError, aiApi, authApi, usersApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  user: AuthenticatedUser;
  onUserUpdated: (user: AuthenticatedUser) => void;
};

const writingStyles = [
  { value: "NATURAL", label: "Natural" },
  { value: "BALANCED", label: "Equilibrado" },
  { value: "STRUCTURED", label: "Estruturado" },
  { value: "OBJECTIVE", label: "Objetivo" },
] as const;

const responseDetails = [
  { value: "SHORT", label: "Curto" },
  { value: "MEDIUM", label: "Médio" },
  { value: "COMPLETE", label: "Completo" },
] as const;

export function SettingsView({ user, onUserUpdated }: Props) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone ? formatBrazilianPhone(user.phone) : "");
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [freeModels, setFreeModels] = useState<string[]>([]);
  const [unavailableModels, setUnavailableModels] = useState<string[]>([]);
  const [defaultModel, setDefaultModel] = useState<string | null>(null);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([usersApi.preferences(), aiApi.models()])
      .then(([savedPreferences, availableModels]) => {
        if (!active) return;
        setPreferences(savedPreferences);
        setModels(availableModels.models);
        setFreeModels(availableModels.freeModels);
        setUnavailableModels(availableModels.unavailableModels);
        setDefaultModel(availableModels.defaultModel);
        setAiConfigured(availableModels.configured);
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : "Não foi possível carregar as configurações.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function showSuccess(message: string) {
    setError("");
    setSuccess(message);
  }

  async function saveAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedPhone = normalizeBrazilianPhone(phone);
    if (!normalizedPhone) {
      setSuccess("");
      setError("Informe um telefone brasileiro válido com DDD.");
      return;
    }
    setSavingAccount(true);
    setSuccess("");
    setError("");
    try {
      const updated = await usersApi.updateAccount({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: normalizedPhone,
      });
      setName(updated.name);
      setEmail(updated.email);
      setPhone(formatBrazilianPhone(updated.phone || ""));
      onUserUpdated(updated);
      showSuccess("Dados da conta atualizados.");
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Não foi possível salvar os dados da conta.");
    } finally {
      setSavingAccount(false);
    }
  }

  async function savePreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!preferences) return;
    setSavingPreferences(true);
    setSuccess("");
    setError("");
    try {
      const updated = await usersApi.updatePreferences(preferences);
      setPreferences(updated);
      showSuccess("Preferências da QIA atualizadas.");
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Não foi possível salvar as preferências.");
    } finally {
      setSavingPreferences(false);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword !== passwordConfirmation) {
      setSuccess("");
      setError("A nova senha e a confirmação não coincidem.");
      return;
    }
    setSavingPassword(true);
    setSuccess("");
    setError("");
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setPasswordConfirmation("");
      showSuccess("Senha alterada com sucesso.");
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Não foi possível alterar a senha.");
    } finally {
      setSavingPassword(false);
    }
  }

  async function logout() {
    setError("");
    try {
      await authApi.logout();
      router.replace("/login");
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Não foi possível encerrar a sessão.");
    }
  }

  return (
    <div className="space-y-7">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">Sua conta</p>
        <h1 className="mt-3 text-3xl font-semibold">Configurações</h1>
        <p className="mt-2 text-sm text-muted">Gerencie seus dados, segurança e preferências da QIA.</p>
      </div>
      {(error || success) && (
        <div
          role={error ? "alert" : "status"}
          className={`rounded-xl border px-4 py-3 text-sm ${error ? "border-danger bg-danger-soft text-danger" : "border-active bg-active-soft text-active-status"}`}
        >
          {error || success}
        </div>
      )}

      <section className="rounded-2xl border border-default bg-surface p-5 shadow-card sm:p-7">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand"><UserRound size={19} /></span>
          <div><h2 className="font-semibold">Minha conta</h2><p className="text-xs text-muted">Os mesmos dados são usados no Work e no Learn.</p></div>
        </div>
        <form onSubmit={saveAccount} className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm font-medium">Nome<Input autoComplete="name" required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label className="space-y-2 text-sm font-medium">E-mail<Input type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} /><span className="block text-xs font-normal text-muted">A alteração não exige confirmação por e-mail nesta versão.</span></label>
          <label className="space-y-2 text-sm font-medium sm:col-span-2">Telefone<Input type="tel" autoComplete="tel" inputMode="tel" required value={phone} onChange={(event) => setPhone(formatBrazilianPhone(event.target.value))} placeholder="(11) 99999-9999" /></label>
          <p className="text-xs text-muted sm:col-span-2">Foto de perfil e verificação por telefone não estão disponíveis nesta versão.</p>
          <div className="sm:col-span-2"><Button type="submit" disabled={savingAccount}><Save size={15} />{savingAccount ? "Salvando..." : "Salvar dados"}</Button></div>
        </form>
      </section>

      <section className="rounded-2xl border border-default bg-surface p-5 shadow-card sm:p-7">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-active-soft text-active-status"><Sparkles size={19} /></span>
          <div><h2 className="font-semibold">Preferências da QIA</h2><p className="text-xs text-muted">Aplicadas às conversas do Work e do Learn.</p></div>
        </div>
        {loading ? <p className="mt-6 text-sm text-muted">Carregando preferências...</p> : preferences ? (
          <form onSubmit={savePreferences} className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-medium">Estilo de escrita
              <select value={preferences.writingStyle} onChange={(event) => setPreferences({ ...preferences, writingStyle: event.target.value as UserPreferences["writingStyle"] })} className="h-11 w-full rounded-xl border border-default bg-surface px-3 text-sm">
                {writingStyles.map((style) => <option key={style.value} value={style.value}>{style.label}</option>)}
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium">Nível de detalhamento
              <select value={preferences.responseDetail} onChange={(event) => setPreferences({ ...preferences, responseDetail: event.target.value as UserPreferences["responseDetail"] })} className="h-11 w-full rounded-xl border border-default bg-surface px-3 text-sm">
                {responseDetails.map((detail) => <option key={detail.value} value={detail.value}>{detail.label}</option>)}
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium sm:col-span-2">Modelo de IA
              <select value={preferences.aiModel || ""} onChange={(event) => setPreferences({ ...preferences, aiModel: event.target.value || null })} className="h-11 w-full rounded-xl border border-default bg-surface px-3 text-sm">
                <option value="">Padrão configurado no backend{defaultModel ? ` (${defaultModel})` : ""}</option>
                {preferences.aiModel && !models.includes(preferences.aiModel) && <option value={preferences.aiModel} disabled>{preferences.aiModel} · não habilitado</option>}
                {models.map((model) => <option key={model} value={model}>{model}{freeModels.includes(model) ? " · grátis no catálogo" : " · não identificado como grátis"}{model === defaultModel ? " · padrão" : ""}</option>)}
              </select>
              <span className="block text-xs font-normal text-muted">
                {!aiConfigured && models.length
                  ? "O modelo padrão não está disponível. Selecione um dos modelos verificados no catálogo para usar a QIA."
                  : !aiConfigured && unavailableModels.length
                    ? `Modelos configurados não encontrados no catálogo: ${unavailableModels.join(", ")}.`
                    : !aiConfigured
                      ? "A QIA não está pronta. Configure OPENAI_API_KEY e um modelo disponível no OpenRouter no backend."
                      : "Os modelos são conferidos no catálogo do OpenRouter. O selo grátis significa que entrada e saída aparecem com preço zero no catálogo consultado; os demais não são identificados como grátis. Limites e disponibilidade do provedor ainda se aplicam."}
              </span>
            </label>
            <div className="sm:col-span-2"><Button type="submit" disabled={savingPreferences || loading}><Save size={15} />{savingPreferences ? "Salvando..." : "Salvar preferências"}</Button></div>
          </form>
        ) : <p className="mt-6 text-sm text-muted">Preferências indisponíveis.</p>}
      </section>

      <section className="rounded-2xl border border-default bg-surface p-5 shadow-card sm:p-7">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-warning-soft text-warning"><ShieldCheck size={19} /></span>
          <div><h2 className="font-semibold">Segurança</h2><p className="text-xs text-muted">A sessão permanece ativa após alterar a senha.</p></div>
        </div>
        <form onSubmit={changePassword} className="mt-6 grid gap-4 sm:max-w-xl">
          <label className="space-y-2 text-sm font-medium">Senha atual<Input type="password" autoComplete="current-password" required maxLength={128} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label>
          <label className="space-y-2 text-sm font-medium">Nova senha<Input type="password" autoComplete="new-password" required minLength={6} maxLength={128} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label>
          <label className="space-y-2 text-sm font-medium">Confirmar nova senha<Input type="password" autoComplete="new-password" required minLength={6} maxLength={128} value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} /></label>
          <div><Button type="submit" variant="secondary" disabled={savingPassword}>{savingPassword ? "Atualizando..." : "Alterar senha"}</Button></div>
        </form>
        <div className="mt-6 border-t border-default pt-5">
          <p className="text-sm font-medium">Sessão atual</p>
          <p className="mt-1 text-xs text-muted">Autenticação protegida por cookie HttpOnly. Encerramento remoto de outras sessões não está disponível nesta versão.</p>
          <Button type="button" variant="secondary" className="mt-4" onClick={() => void logout()}><LogOut size={15} />Sair da conta</Button>
          <p className="mt-4 text-xs text-muted">A recuperação de senha ainda depende da configuração de um serviço de e-mail.</p>
        </div>
      </section>
    </div>
  );
}
