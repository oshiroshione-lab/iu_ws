// 議事録の詳細ページ：本文の表示、編集/削除、そしてこの議事録から用語を抽出して登録する。

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { minutesRepository } from "@/lib/store";
import { cn } from "@/lib/cn";
import { TermExtractor } from "@/components/TermExtractor";
import { DeleteMinuteButton } from "@/components/DeleteMinuteButton";
import { OrganizeButton } from "@/components/OrganizeButton";
import { buttonClasses } from "@/components/ui/Button";
import { ArrowLeftIcon, PencilIcon, SparklesIcon } from "@/components/ui/icons";

export default async function MinuteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const minute = await minutesRepository.get(id);
  if (!minute) notFound();

  const created = minute.createdAt
    ? new Date(minute.createdAt).toLocaleString("ja-JP")
    : "";
  // 会議日は入力があればそれを、無ければ作成日を表示に使う。
  const meetingDay = minute.meetingDate
    ? new Date(minute.meetingDate).toLocaleDateString("ja-JP")
    : minute.createdAt
      ? new Date(minute.createdAt).toLocaleDateString("ja-JP")
      : "";

  // 「1行に1つ」の項目を配列にする（空行は除く）。
  const toLines = (s: string) =>
    s
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  const decisions = toLines(minute.decisions);
  const todos = toLines(minute.todos);
  // 要約・決定事項・ToDo のどれかに中身があるか（「整える」上書き確認の判断に使う）
  const hasOrganized = Boolean(
    minute.summary.trim() || minute.decisions.trim() || minute.todos.trim(),
  );

  return (
    <article className="mx-auto flex max-w-2xl animate-fade-in flex-col gap-8">
      <div>
        <Link
          href="/minutes"
          className={cn(
            buttonClasses({ variant: "ghost", size: "sm" }),
            "-ml-2 text-muted-foreground",
          )}
        >
          <ArrowLeftIcon className="h-4 w-4" />
          議事録一覧へ
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{minute.title}</h1>
        {(minute.createdBy || created) && (
          <p className="mt-1 text-xs text-muted-foreground">
            作成: {minute.createdBy}
            {minute.createdBy && created && " ・ "}
            {created}
          </p>
        )}
      </div>

      {/* ===== 会議の基本情報（日付・参加者） ===== */}
      <dl className="grid gap-x-6 gap-y-3 rounded-xl border bg-card p-5 sm:grid-cols-[6rem_1fr]">
        <dt className="text-sm font-medium text-muted-foreground">会議日</dt>
        <dd className="text-sm">{meetingDay || "—"}</dd>
        <dt className="text-sm font-medium text-muted-foreground">参加者</dt>
        <dd className="whitespace-pre-wrap text-sm">{minute.attendees || "—"}</dd>
      </dl>

      {/* ===== AIで整える（本文→要約・決定事項・ToDo） ===== */}
      <div className="flex flex-col gap-2 rounded-xl border border-primary/30 bg-primary/5 p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <SparklesIcon className="h-4 w-4 text-primary" />
          AIで議事録に整える
        </div>
        <p className="text-sm text-muted-foreground">
          本文（文字起こし）から、要約・決定事項・ToDo を自動でまとめます。結果は下に入り、編集で直せます。
        </p>
        <OrganizeButton minuteId={minute.id} hasContent={hasOrganized} />
      </div>

      {/* ===== 要約 ===== */}
      {minute.summary.trim() && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold tracking-tight">要約</h2>
          <p className="whitespace-pre-wrap rounded-xl border bg-card p-5 text-base leading-8 text-foreground/90">
            {minute.summary}
          </p>
        </section>
      )}

      {/* ===== 議題 ===== */}
      {minute.agenda.trim() && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold tracking-tight">議題</h2>
          <p className="whitespace-pre-wrap rounded-xl border bg-card p-5 text-base leading-8 text-foreground/90">
            {minute.agenda}
          </p>
        </section>
      )}

      {/* ===== 本文（議事内容） ===== */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold tracking-tight">議事内容</h2>
        <p className="whitespace-pre-wrap rounded-xl border bg-card p-5 text-base leading-8 text-foreground/90">
          {minute.body}
        </p>
      </section>

      {/* ===== 決定事項 ===== */}
      {decisions.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold tracking-tight">決定事項</h2>
          <ul className="flex flex-col gap-2 rounded-xl border bg-card p-5">
            {decisions.map((d, i) => (
              <li key={i} className="flex gap-2 text-base leading-7 text-foreground/90">
                <span className="text-primary">✓</span>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ===== ToDo・ネクストアクション ===== */}
      {todos.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold tracking-tight">ToDo・次にやること</h2>
          <ul className="flex flex-col gap-2 rounded-xl border bg-card p-5">
            {todos.map((t, i) => (
              <li key={i} className="flex gap-2 text-base leading-7 text-foreground/90">
                <span className="text-muted-foreground">□</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ===== 管理（編集・削除） ===== */}
      <div className="flex gap-3">
        <Link
          href={`/minutes/${minute.id}/edit`}
          className={buttonClasses({ variant: "outline", size: "sm" })}
        >
          <PencilIcon className="h-4 w-4" />
          編集
        </Link>
        <DeleteMinuteButton id={minute.id} title={minute.title} />
      </div>

      {/* ===== この議事録から用語を登録 ===== */}
      <section className="flex flex-col gap-3 border-t pt-8">
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <SparklesIcon className="h-5 w-5 text-primary" />
          この議事録から用語を登録
        </h2>
        <p className="text-sm text-muted-foreground">
          本文がすでに入っています。「用語の候補を出す」を押すと、AIが専門用語の候補を挙げます。登録したい用語だけ選んでください。
        </p>
        <TermExtractor defaultText={minute.body} />
      </section>
    </article>
  );
}
