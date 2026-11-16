import Link from "next/link";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default function ForgotPasswordPage() {
  return (
    <main className="grid min-h-screen place-items-center px-5">
      <div className="fixed right-5 top-5 z-30">
        <ThemeToggle />
      </div>
      <section className="w-full max-w-md rounded-3xl border border-default bg-surface p-8 text-center shadow-card">
        <Link href="/login" className="text-lg font-bold text-brand">QAgent</Link>
        <h1 className="mt-8 text-2xl font-semibold">Recuperação de senha</h1>
        <p className="mt-3 text-sm leading-6 text-muted">O fluxo de recuperação ainda não foi habilitado. Fale com o suporte para obter ajuda com sua conta.</p>
        <Link href="/login" className="mt-7 inline-block text-sm font-semibold text-brand hover:underline">Voltar ao login</Link>
      </section>
    </main>
  );
}
