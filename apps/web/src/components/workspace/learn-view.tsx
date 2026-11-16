"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock3,
  GraduationCap,
  LoaderCircle,
  MessageSquareText,
  Play,
  Send,
  Sparkles,
  Target,
} from "lucide-react";
import {
  LearnAttemptResult,
  LearnChallenge,
  LearnLesson,
  LearnProgressSummary,
  LearnTrack,
} from "@qagent/shared";
import { Button } from "@/components/ui/button";
import { ApiError, learnApi } from "@/lib/api";

type Props = {
  section: string[];
  userName: string | undefined;
  creatingConversation: boolean;
  onNewConversation: () => void;
};

type LessonProgress = {
  lessonId: string;
  attempts: number;
  bestScore: number | null;
  completedAt: string | null;
  lastAttemptAt: string | null;
};

type LessonDetails = {
  lesson: LearnLesson;
  progress: {
    attempts: number;
    bestScore: number | null;
    completedAt: string | null;
    recentAttempts: Array<
      Pick<LearnAttemptResult, "id" | "score" | "passed" | "feedback" | "strengths" | "improvements" | "createdAt">
    >;
  };
};

export function LearnView({
  section,
  userName,
  creatingConversation,
  onNewConversation,
}: Props) {
  const [tracks, setTracks] = useState<LearnTrack[]>([]);
  const [progress, setProgress] = useState<LearnProgressSummary | null>(null);
  const [challenges, setChallenges] = useState<LearnChallenge[]>([]);
  const [lessonDetails, setLessonDetails] = useState<LessonDetails | null>(null);
  const [answer, setAnswer] = useState("");
  const [currentAttempt, setCurrentAttempt] = useState<LearnAttemptResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const route = section[0] || "";
  const lessonId = route === "lessons" ? section[1] : undefined;
  const trackId = route === "tracks" ? section[1] : undefined;
  const loadOverview = useCallback(async () => {
    const [trackItems, progressItem] = await Promise.all([
      learnApi.tracks(),
      learnApi.progress(),
    ]);
    setTracks(trackItems);
    setProgress(progressItem);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const tasks: Promise<void>[] = [
      Promise.all([learnApi.tracks(), learnApi.progress()]).then(([trackItems, progressItem]) => {
        if (!active) return;
        setTracks(trackItems);
        setProgress(progressItem);
      }),
    ];
    if (route === "challenges") {
      tasks.push(learnApi.challenges().then((items) => {
        if (active) setChallenges(items);
      }));
    }
    if (lessonId) {
      setCurrentAttempt(null);
      setAnswer("");
      tasks.push(learnApi.lesson(lessonId).then((details) => {
        if (active) setLessonDetails(details);
      }));
    } else {
      setLessonDetails(null);
    }
    void Promise.all(tasks)
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Não foi possível carregar o conteúdo.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [lessonId, route]);

  const selectedTrack = useMemo(
    () => tracks.find((track) => track.id === trackId),
    [trackId, tracks],
  );
  const pageTitle =
    lessonDetails?.lesson.title ||
    (route === "progress"
      ? "Meu progresso"
      : route === "challenges"
        ? "Desafios"
        : route === "learning"
          ? "Aprendizado"
          : route === "tracks"
            ? selectedTrack?.title || "Trilhas de estudo"
            : "QAgent Learn");

  async function submitAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lessonId || !answer.trim() || submitting) return;
    setSubmitting(true);
    setError("");
    setCurrentAttempt(null);
    try {
      const result = await learnApi.submitAttempt(lessonId, answer.trim());
      setCurrentAttempt(result);
      await Promise.all([
        loadOverview(),
        learnApi.lesson(lessonId).then(setLessonDetails),
      ]);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Não foi possível avaliar sua resposta.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-sm text-muted">
        <span className="flex items-center gap-2">
          <LoaderCircle className="animate-spin" size={18} />
          Carregando seu aprendizado...
        </span>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.17em] text-learn">
            QAgent Learn
          </p>
          <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">{pageTitle}</h1>
          <p className="mt-2 text-sm text-muted">
            {lessonDetails
              ? `${lessonDetails.lesson.trackTitle} · ${lessonDetails.lesson.estimatedMinutes} min`
              : `Olá${userName ? `, ${userName.split(" ")[0]}` : ""}. Estude no seu ritmo e acompanhe seu progresso.`}
          </p>
        </div>
        {!lessonDetails && (
          <Button onClick={onNewConversation} disabled={creatingConversation}>
            {creatingConversation ? <LoaderCircle size={16} className="animate-spin" /> : <MessageSquareText size={16} />}
            Conversar com tutor
          </Button>
        )}
      </div>

      {error && (
        <div role="alert" className="mb-6 rounded-xl border border-warning bg-warning-soft px-4 py-3 text-sm text-warning">
          {error}
        </div>
      )}

      {lessonDetails ? (
        <LessonPage
          details={lessonDetails}
          answer={answer}
          submitting={submitting}
          currentAttempt={currentAttempt}
          onAnswerChange={setAnswer}
          onSubmit={submitAnswer}
        />
      ) : route === "progress" ? (
        <ProgressPage progress={progress} tracks={tracks} />
      ) : route === "challenges" ? (
        <ChallengesPage challenges={challenges} progress={progress?.lessons || []} />
      ) : route === "tracks" && selectedTrack ? (
        <TrackPage track={selectedTrack} progress={progress?.lessons || []} />
      ) : route === "tracks" || route === "learning" ? (
        <TracksPage tracks={tracks} />
      ) : (
        <DashboardPage
          tracks={tracks}
          progress={progress}
          userName={userName}
          creatingConversation={creatingConversation}
          onNewConversation={onNewConversation}
        />
      )}
    </div>
  );
}

function DashboardPage({
  tracks,
  progress,
  userName,
  creatingConversation,
  onNewConversation,
}: {
  tracks: LearnTrack[];
  progress: LearnProgressSummary | null;
  userName: string | undefined;
  creatingConversation: boolean;
  onNewConversation: () => void;
}) {
  return (
    <>
      <section className="rounded-2xl border border-default bg-surface p-6 shadow-card sm:p-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-learn">Sua jornada</p>
            <h2 className="mt-2 text-xl font-semibold">
              {progress?.completedLessons
                ? `${progress.completedLessons} aula${progress.completedLessons === 1 ? "" : "s"} concluída${progress.completedLessons === 1 ? "" : "s"}`
                : `Bem-vindo${userName ? `, ${userName.split(" ")[0]}` : ""} ao Learn`}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Estude conceitos de QA, pratique com desafios e receba uma avaliação formativa da sua resposta.
            </p>
          </div>
          <Button variant="secondary" onClick={onNewConversation} disabled={creatingConversation}>
            <Sparkles size={16} /> Falar com o tutor
          </Button>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Metric label="Aulas concluídas" value={`${progress?.completedLessons ?? 0}/${progress?.totalLessons ?? 0}`} />
          <Metric label="Tentativas" value={String(progress?.attempts ?? 0)} />
          <Metric label="Média das melhores notas" value={progress?.averageScore === null || progress?.averageScore === undefined ? "—" : `${progress.averageScore}%`} />
        </div>
      </section>
      <section className="mt-8">
        <SectionHeading title="Trilhas de estudo" href="/learn/tracks" />
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {tracks.slice(0, 4).map((track) => <TrackCard key={track.id} track={track} />)}
        </div>
      </section>
    </>
  );
}

function TracksPage({ tracks }: { tracks: LearnTrack[] }) {
  return (
    <section>
      <p className="max-w-2xl text-sm leading-6 text-muted">
        Conteúdo autoral organizado por tópicos. Cada aula inclui conceitos e um exercício prático com correção automatizada.
      </p>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {tracks.map((track) => <TrackCard key={track.id} track={track} />)}
      </div>
    </section>
  );
}

function TrackPage({
  track,
  progress,
}: {
  track: LearnTrack;
  progress: LessonProgress[];
}) {
  return (
    <section>
      <Link href="/learn/tracks" className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink">
        <ArrowLeft size={15} /> Todas as trilhas
      </Link>
      <p className="mt-5 max-w-2xl text-sm leading-6 text-muted">{track.description}</p>
      <div className="mt-6 h-2 overflow-hidden rounded-full bg-surface-hover" role="progressbar" aria-label={`Progresso em ${track.title}`} aria-valuenow={track.progress.completionPercent} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-learn transition-all" style={{ width: `${track.progress.completionPercent}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted">
        {track.progress.completedLessons} de {track.lessons.length} aulas concluídas
      </p>
      <div className="mt-5 space-y-3">
        {track.lessons.map((lesson, index) => {
          const item = progress.find((entry) => entry.lessonId === lesson.id);
          const complete = Boolean(item?.completedAt);
          return (
            <Link key={lesson.id} href={`/learn/lessons/${lesson.id}`} className="flex items-center gap-4 rounded-xl border border-default bg-surface p-4 shadow-card transition hover:border-learn/40">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${complete ? "bg-success-soft text-success" : "bg-learn-soft text-learn"}`}>
                {complete ? <CheckCircle2 size={18} /> : <span className="text-sm font-bold">{index + 1}</span>}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{lesson.title}</span>
                <span className="mt-1 block text-xs text-muted">{lesson.summary}</span>
              </span>
              <span className="hidden shrink-0 items-center gap-1 text-xs text-muted sm:flex"><Clock3 size={13} />{lesson.estimatedMinutes} min</span>
              <ChevronRight className="shrink-0 text-muted" size={17} />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function ChallengesPage({
  challenges,
  progress,
}: {
  challenges: LearnChallenge[];
  progress: LessonProgress[];
}) {
  return (
    <section>
      <p className="max-w-2xl text-sm leading-6 text-muted">
        Resolva os exercícios das aulas. A avaliação fica salva no seu progresso e pode ser refeita.
      </p>
      <div className="mt-5 space-y-3">
        {challenges.map((challenge) => {
          const status = progress.find((item) => item.lessonId === challenge.id);
          return (
            <article key={challenge.id} className="flex flex-col gap-4 rounded-xl border border-default bg-surface p-5 shadow-card sm:flex-row sm:items-center">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-learn-soft text-learn"><Target size={18} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{challenge.trackTitle}</p>
                <h2 className="mt-1 text-sm font-semibold">{challenge.title}</h2>
                <p className="mt-1 text-xs text-muted">{challenge.summary}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted">
                  {status?.completedAt ? `Concluído · melhor nota ${status.bestScore ?? "—"}%` : "Pendente"}
                </span>
                <Link href={`/learn/lessons/${challenge.id}`} className="inline-flex items-center gap-2 rounded-md border border-default px-3 py-2 text-xs font-semibold hover:bg-surface-hover">
                  <Play size={14} /> Praticar
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ProgressPage({
  progress,
  tracks,
}: {
  progress: LearnProgressSummary | null;
  tracks: LearnTrack[];
}) {
  return (
    <section>
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Aulas concluídas" value={`${progress?.completedLessons ?? 0}/${progress?.totalLessons ?? 0}`} />
        <Metric label="Tentativas registradas" value={String(progress?.attempts ?? 0)} />
        <Metric label="Média das melhores notas" value={progress?.averageScore === null || progress?.averageScore === undefined ? "—" : `${progress.averageScore}%`} />
      </div>
      <div className="mt-6 space-y-4">
        {tracks.map((track) => (
          <article key={track.id} className="rounded-xl border border-default bg-surface p-5 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link href={`/learn/tracks/${track.id}`} className="text-sm font-semibold hover:text-learn">{track.title}</Link>
              <span className="text-xs text-muted">{track.progress.completedLessons}/{track.lessons.length} aulas · {track.progress.completionPercent}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-hover" role="progressbar" aria-label={`Progresso em ${track.title}`} aria-valuenow={track.progress.completionPercent} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-learn" style={{ width: `${track.progress.completionPercent}%` }} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function LessonPage({
  details,
  answer,
  submitting,
  currentAttempt,
  onAnswerChange,
  onSubmit,
}: {
  details: LessonDetails;
  answer: string;
  submitting: boolean;
  currentAttempt: LearnAttemptResult | null;
  onAnswerChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const { lesson, progress } = details;
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
      <div>
        <Link href={`/learn/tracks/${lesson.trackId}`} className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink">
          <ArrowLeft size={15} /> {lesson.trackTitle}
        </Link>
        <article className="mt-5 rounded-xl border border-default bg-surface p-5 shadow-card sm:p-7">
          <div className="flex items-center gap-2 text-xs text-muted"><BookOpen size={15} /> Aula · {lesson.estimatedMinutes} min</div>
          <div className="mt-5 space-y-4 text-sm leading-7 text-ink">
            {lesson.content.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
          </div>
          <h2 className="mt-7 text-sm font-semibold">Pontos principais</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-muted">
            {lesson.keyTakeaways.map((item) => <li key={item} className="flex gap-2"><CheckCircle2 className="mt-1 shrink-0 text-learn" size={15} />{item}</li>)}
          </ul>
        </article>
      </div>
      <aside className="space-y-4">
        <form onSubmit={onSubmit} className="rounded-xl border border-default bg-surface p-5 shadow-card">
          <p className="text-xs font-bold uppercase tracking-wide text-learn">Desafio prático</p>
          <h2 className="mt-2 text-base font-semibold">{lesson.exercise.prompt}</h2>
          <label htmlFor="learning-answer" className="mt-5 block text-xs font-semibold text-muted">Sua resposta</label>
          <textarea
            id="learning-answer"
            value={answer}
            onChange={(event) => onAnswerChange(event.target.value)}
            maxLength={5000}
            rows={7}
            placeholder="Explique seu raciocínio com suas palavras..."
            className="mt-2 w-full resize-y rounded-md border border-default bg-surface px-3.5 py-3 text-sm text-ink outline-none transition placeholder:text-muted focus:border-learn focus:ring-4 focus:ring-learn-soft"
          />
          <p className="mt-2 text-[11px] leading-5 text-muted">
            Nota mínima de 70% para concluir. A avaliação é automatizada: revise o feedback; se o provedor de IA estiver indisponível, sua resposta não será salva.
          </p>
          <Button type="submit" className="mt-4 w-full bg-learn hover:bg-learn/90" disabled={submitting || !answer.trim()}>
            {submitting ? <LoaderCircle className="animate-spin" size={16} /> : <Send size={15} />}
            {submitting ? "Avaliando..." : "Enviar resposta"}
          </Button>
          {progress.attempts > 0 && (
            <p className="mt-3 text-center text-xs text-muted">
              {progress.attempts} tentativa(s) · melhor nota {progress.bestScore ?? "—"}%
              {progress.completedAt ? " · concluída" : ""}
            </p>
          )}
        </form>
        {currentAttempt && <AttemptFeedback attempt={currentAttempt} />}
        {!currentAttempt && progress.recentAttempts[0] && (
          <AttemptFeedback attempt={progress.recentAttempts[0]} />
        )}
      </aside>
    </div>
  );
}

function AttemptFeedback({ attempt }: { attempt: Pick<LearnAttemptResult, "score" | "passed" | "feedback" | "strengths" | "improvements"> }) {
  return (
    <article className="rounded-xl border border-default bg-surface p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Feedback da avaliação</h2>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${attempt.passed ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}`}>
          {attempt.score}% · {attempt.passed ? "Concluído" : "Continue praticando"}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted">{attempt.feedback}</p>
      {attempt.strengths.length > 0 && (
        <>
          <h3 className="mt-4 text-xs font-semibold">Pontos fortes</h3>
          <ul className="mt-2 space-y-1 text-xs leading-5 text-muted">
            {attempt.strengths.map((item) => <li key={item}>• {item}</li>)}
          </ul>
        </>
      )}
      {attempt.improvements.length > 0 && (
        <>
          <h3 className="mt-4 text-xs font-semibold">Para aprofundar</h3>
          <ul className="mt-2 space-y-1 text-xs leading-5 text-muted">
            {attempt.improvements.map((item) => <li key={item}>• {item}</li>)}
          </ul>
        </>
      )}
    </article>
  );
}

function TrackCard({ track }: { track: LearnTrack }) {
  return (
    <Link href={`/learn/tracks/${track.id}`} className="rounded-xl border border-default bg-surface p-5 shadow-card transition hover:border-learn/40">
      <div className="flex items-start gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-learn-soft text-learn"><GraduationCap size={20} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-sm font-semibold">{track.title}</h2>
            <span className="shrink-0 rounded-full bg-surface-hover px-2.5 py-1 text-[10px] font-semibold text-muted">{track.level.toLowerCase()}</span>
          </div>
          <p className="mt-2 text-xs leading-5 text-muted">{track.description}</p>
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between text-xs text-muted">
        <span>{track.lessons.length} aulas · {track.progress.completedLessons} concluídas</span>
        <span className="inline-flex items-center gap-1 font-semibold text-learn">Abrir trilha <ChevronRight size={14} /></span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-hover" role="progressbar" aria-label={`Progresso em ${track.title}`} aria-valuenow={track.progress.completionPercent} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-learn" style={{ width: `${track.progress.completionPercent}%` }} />
      </div>
    </Link>
  );
}

function SectionHeading({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-base font-semibold">{title}</h2>
      <Link href={href} className="inline-flex items-center gap-1 text-xs font-semibold text-learn hover:underline">
        Ver todas <ChevronRight size={14} />
      </Link>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-default bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </article>
  );
}
