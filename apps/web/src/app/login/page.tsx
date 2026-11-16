"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { ApiError, authApi } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { user } = await authApi.login(email, password);
      router.replace(user.profile === "WORK" ? "/work" : "/learn");
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1fr_0.9fr]">
      <div className="fixed right-5 top-5 z-30">
        <ThemeToggle />
      </div>
      <section className="relative hidden overflow-hidden bg-brand-panel p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Link href="/" className="flex items-center gap-3 text-lg font-bold">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-surface/10">Q</span> QAgent
        </Link>
        <div className="relative z-10 max-w-xl pb-16">
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.24em] text-red-200">Qualidade, com propósito</p>
          <h1 className="text-5xl font-semibold leading-[1.12]">Seu próximo passo em QA começa aqui.</h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-red-100/80">Um espaço de trabalho para profissionais e de aprendizado para quem está construindo sua jornada.</p>
          <div className="mt-10 flex items-center gap-3 text-sm text-red-100"><ShieldCheck size={18} /> Seus dados protegidos em cada etapa.</div>
        </div>
        <p className="text-xs text-red-100/60">QAgent · Work &amp; Learn</p>
        <div className="absolute -bottom-40 -right-36 h-[34rem] w-[34rem] rounded-full border border-white/10" />
        <div className="absolute -bottom-24 -right-20 h-[24rem] w-[24rem] rounded-full border border-white/10" />
      </section>
      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[410px]">
          <div className="mb-10 lg:hidden"><span className="text-lg font-bold text-brand">QAgent</span></div>
          <p className="text-sm font-semibold text-brand">Bem-vindo de volta</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">Acesse sua conta</h2>
          <p className="mt-2 text-sm text-muted">Continue de onde você parou.</p>
          <form onSubmit={submit} className="mt-8 space-y-5">
            <label className="block space-y-2 text-sm font-medium">E-mail<Input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@email.com" /></label>
            <label className="block space-y-2 text-sm font-medium">Senha<Input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Sua senha" /></label>
            <div className="flex justify-end"><Link href="/forgot-password" className="text-xs font-semibold text-brand hover:underline">Esqueceu a senha?</Link></div>
            {error && <p role="alert" className="rounded-xl border border-danger bg-brand-soft px-4 py-3 text-sm text-danger">{error}</p>}
            <Button className="w-full" type="submit" disabled={loading}>{loading ? "Entrando..." : "Entrar"}{!loading && <ArrowRight size={16} />}</Button>
          </form>
          <p className="mt-8 text-center text-sm text-muted">Ainda não tem uma conta? <Link href="/register" className="font-semibold text-brand hover:underline">Criar conta</Link></p>
          <p className="mt-12 text-center text-xs text-muted">Ao continuar, você concorda com nossos termos de uso e política de privacidade.</p>
        </div>
      </section>
    </main>
  );
}
