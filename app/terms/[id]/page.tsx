// 用語の詳細ページ：説明・イラスト・関連ワード・つながりを表示
// （F-02 / F-03 / F-04、関連ワードからの新規登録 F-08、用語どうしの相互リンク）。

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { termRepository } from "@/lib/store";
import { buildWordIndex, findBacklinks } from "@/lib/terms";
import { retryIllustrationAction } from "@/app/actions";
import { cn } from "@/lib/cn";
import { DeleteTermButton } from "@/components/DeleteTermButton";
import { SubmitButton } from "@/components/SubmitButton";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import {
  ArrowLeftIcon,
  PencilIcon,
  PlusIcon,
  LinkIcon,
  ImageIcon,
} from "@/components/ui/icons";

export default async function TermDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  // 全件を1回だけ取り、相互リンク（早引き表）と被リンクを計算する。
  const all = await termRepository.list();
  const term = all.find((t) => t.id === id);
  if (!term) notFound();

  const index = buildWordIndex(all);
  const backlinks = findBacklinks(all, term.word);
  const created = term.createdAt
    ? new Date(term.createdAt).toLocaleString("ja-JP")
    : "";

  return (
    <article className="mx-auto flex max-w-3xl animate-fade-in flex-col gap-6">
      <div>
        <Link
          href="/"
          className={cn(
            buttonClasses({ variant: "ghost", size: "sm" }),
            "-ml-2 text-muted-foreground",
          )}
        >
          <ArrowLeftIcon className="h-4 w-4" />
          一覧へ戻る
        </Link>

        <h1 className="mt-2 text-3xl font-bold tracking-tight">{term.word}</h1>

        {term.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {term.tags.map((tag) => (
              <Link key={tag} href={`/?tag=${encodeURIComponent(tag)}`}>
                <Badge variant="accent" className="hover:opacity-80">
                  {tag}
                </Badge>
              </Link>
            ))}
          </div>
        )}

        {(term.createdBy || created) && (
          <p className="mt-2 text-xs text-muted-foreground">
            登録: {term.createdBy}
            {term.createdBy && created && " ・ "}
            {created}
          </p>
        )}
      </div>

      {/* イメージイラスト（F-03） */}
      <section>
        {term.imageUrl ? (
          <Card className="overflow-hidden p-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={term.imageUrl}
              alt={`${term.word}のイラスト`}
              className="max-h-96 w-full bg-muted object-contain"
            />
          </Card>
        ) : (
          <Card className="flex flex-col items-start gap-3 border-dashed bg-muted/40 p-6">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <ImageIcon className="h-4 w-4" />
              {term.imageStatus === "failed"
                ? "画像を生成できませんでした（後でやり直せます）。"
                : "イラストはまだありません。"}
            </p>
            <form action={retryIllustrationAction}>
              <input type="hidden" name="id" value={term.id} />
              <SubmitButton
                idle="イラストを作る"
                pending="作成中…"
                variant="outline"
              />
            </form>
          </Card>
        )}
      </section>

      {/* 説明文（F-02：比喩なし） */}
      <Card className="flex flex-col gap-3 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">説明</h2>
          <Badge variant="outline">比喩を使わない説明</Badge>
        </div>
        <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">
          {term.description}
        </p>
      </Card>

      {/* 関連ワード（F-04）。既存の用語ならその詳細へ、無ければ新規登録へ（F-08） */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">関連ワード</h2>
        {term.relatedWords.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            関連ワードは見つかりませんでした。
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {term.relatedWords.map((w) => {
              const hit = index.get(w.trim().toLowerCase());
              const exists = hit && hit.id !== term.id;
              return (
                <li key={w}>
                  {exists ? (
                    <Link
                      href={`/terms/${hit.id}`}
                      title="登録済みの用語を開く"
                      className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm text-primary transition-colors hover:bg-primary/15"
                    >
                      <LinkIcon className="h-3.5 w-3.5" />
                      {w}
                    </Link>
                  ) : (
                    <Link
                      href={`/terms/new?word=${encodeURIComponent(w)}`}
                      title="この語を新しく登録する"
                      className="inline-flex items-center gap-1 rounded-full border bg-card px-3 py-1 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      {w}
                      <PlusIcon className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* つながり（被リンク）：この用語を関連ワードに挙げている用語 */}
      {backlinks.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <LinkIcon className="h-4 w-4 text-muted-foreground" />
            この用語とつながる用語
          </h2>
          <ul className="flex flex-wrap gap-2">
            {backlinks.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/terms/${b.id}`}
                  className="inline-flex items-center rounded-full border bg-card px-3 py-1 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {b.word}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 編集・削除（F-07） */}
      <div className="flex gap-3 border-t pt-5">
        <Link
          href={`/terms/${term.id}/edit`}
          className={buttonClasses({ variant: "outline", size: "sm" })}
        >
          <PencilIcon className="h-4 w-4" />
          編集
        </Link>
        <DeleteTermButton id={term.id} word={term.word} />
      </div>
    </article>
  );
}
