"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { BriefcaseBusiness, GraduationCap, Sparkles } from "lucide-react";
import { formatBrazilianPhone, normalizeBrazilianPhone } from "@qagent/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { ApiError, authApi } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [profile, setProfile] = useState<"WORK" | "LEARN">("WORK");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const normalizedPhone = normalizeBrazilianPhone(phone);
    if (!normalizedPhone) {
      setError("Informe um telefone brasileiro válido com DDD.");
      return;
    }
    if (password !== passwordConfirmation) {
      setError("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    try {
      const { user } = await authApi.register({
        name,
        email,
        phone: normalizedPhone,
        password,
        profile,
      });
      router.replace(user.profile === "WORK" ? "/work" : "/learn");
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Não foi possível criar sua conta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-5 py-10 lg:grid lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-16 lg:px-20">
      <div className="fixed right-5 top-5 z-30">
        <ThemeToggle />
      </div>
      <section className="mx-auto hidden max-w-lg lg:block">
        <Link href="/login" className="text-lg font-bold text-brand">QAgent</Link>
        <div className="mt-20"><Sparkles className="text-brand" size={25} /><h1 className="mt-6 text-4xl font-semibold leading-tight">Uma jornada, no seu ritmo.</h1><p className="mt-4 leading-7 text-muted">Escolha seu espaço e comece a transformar qualidade em prática.</p></div>
      </section>
      <section className="mx-auto w-full max-w-[520px] rounded-3xl border border-default bg-surface p-6 shadow-card sm:p-10">
        <div className="mb-8 lg:hidden"><Link href="/login" className="text-lg font-bold text-brand">QAgent</Link></div>
        <p className="text-sm font-semibold text-brand">Vamos começar</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Crie sua conta</h1>
        <p className="mt-2 text-sm text-muted">Escolha como você quer usar o QAgent.</p>
        <form onSubmit={submit} className="mt-7 space-y-5">
          <fieldset>
            <legend className="mb-3 text-sm font-medium">Qual ambiente combina com você?</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={`cursor-pointer rounded-2xl border p-4 transition ${profile === "WORK" ? "border-brand bg-brand-soft/60 ring-1 ring-brand" : "border-default hover:border-default"}`}>
                <input className="sr-only" type="radio" name="profile" value="WORK" checked={profile === "WORK"} onChange={() => setProfile("WORK")} />
                <BriefcaseBusiness size={19} className="text-brand" /><span className="mt-3 block text-sm font-semibold">QAgent Work</span><span className="mt-1 block text-xs leading-5 text-muted">Ferramentas para profissionais de QA</span>
              </label>
              <label className={`cursor-pointer rounded-2xl border p-4 transition ${profile === "LEARN" ? "border-learn bg-learn-soft ring-1 ring-learn" : "border-default hover:border-default"}`}>
                <input className="sr-only" type="radio" name="profile" value="LEARN" checked={profile === "LEARN"} onChange={() => setProfile("LEARN")} />
                <GraduationCap size={19} className="text-learn" /><span className="mt-3 block text-sm font-semibold">QAgent Learn</span><span className="mt-1 block text-xs leading-5 text-muted">Aprendizado para sua jornada em QA</span>
              </label>
            </div>
          </fieldset>
          <label className="block space-y-2 text-sm font-medium">Nome<input className="h-11 w-full rounded-xl border border-default px-3.5 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand-soft" autoComplete="name" required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder="Seu nome" /></label>
          <label className="block space-y-2 text-sm font-medium">E-mail<Input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@email.com" /></label>
          <label className="block space-y-2 text-sm font-medium">Telefone<Input type="tel" autoComplete="tel" inputMode="tel" required value={phone} onChange={(event) => setPhone(formatBrazilianPhone(event.target.value))} placeholder="(11) 99999-9999" /><span className="block text-xs font-normal text-muted">Inclua o DDD do seu telefone brasileiro.</span></label>
          <label className="block space-y-2 text-sm font-medium">Senha<Input type="password" autoComplete="new-password" minLength={6} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo de 6 caracteres" /><span className="block text-xs font-normal text-muted">Use ao menos 6 caracteres.</span></label>
          <label className="block space-y-2 text-sm font-medium">Confirmar senha<Input type="password" autoComplete="new-password" minLength={6} maxLength={128} required value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} placeholder="Digite a senha novamente" /></label>
          {error && <p role="alert" className="rounded-xl border border-danger bg-brand-soft px-4 py-3 text-sm text-danger">{error}</p>}
          <Button className="w-full" type="submit" disabled={loading}>{loading ? "Criando conta..." : "Criar conta"}</Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted">Já tem uma conta? <Link href="/login" className="font-semibold text-brand hover:underline">Entrar</Link></p>
      </section>
    </main>
  );
}
