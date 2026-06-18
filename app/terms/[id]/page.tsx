// 用語の詳細ページ：LP（ランディングページ）風レイアウトで見せる。
// ヒーロー（用語名＋要約＋イラスト）→ 説明 → 関連ワード → つながり → 管理（編集/削除）。
// 機能は F-02 / F-03 / F-04、関連ワードからの新規登録 F-08、用語どうしの相互リンク。

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { termRepository } from "@/lib/store";
import {
  buildWordIndex,
  findBacklinks,
  linkifyText,
  findRelatedBySharedWords,
} from "@/lib/terms";
import type { Term } from "@/lib/types";
import {
  retryIllustrationAction,
  verifyTermAction,
  unverifyTermAction,
  toggleLikeAction,
  deleteCommentAction,
} from "@/app/actions";
import { cn } from "@/lib/cn";
import { DeleteTermButton } from "@/components/DeleteTermButton";
import { SubmitButton } from "@/components/SubmitButton";
import { CommentForm } from "@/components/CommentForm";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import {
  ArrowLeftIcon,
  PencilIcon,
  PlusIcon,
  LinkIcon,
  ImageIcon,
  CheckCircleIcon,
  HeartIcon,
  MessageIcon,
} from "@/components/ui/icons";

export default async function TermDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  // 全件を1回だけ取り、相互リンク（早引き表）と被リンクを計算する。
  const all = await termRepository.list();
  const term = all.find((t) => t.id === id);
  if (!term) notFound();

  const index = buildWordIndex(all);
  const backlinks = findBacklinks(all, term.word);

  // 説明文の中に出てくる登録済みの用語をリンクにする（Scrapbox 式の自動リンク）。
  const descriptionSegments = linkifyText(term.description, all, term.id);

  // 2-hop：同じ関連ワードでゆるくつながる“兄弟”の用語。
  // すでに「関連ワード」「この用語とつながる用語」で見せている用語は除いて重複を避ける。
  const directLinkedIds = new Set(
    term.relatedWords
      .map((w) => index.get(w.trim().toLowerCase()))
      .filter((t): t is Term => !!t && t.id !== term.id)
      .map((t) => t.id),
  );
  const excludeIds = new Set<string>([
    ...directLinkedIds,
    ...backlinks.map((b) => b.id),
  ]);
  const sharedRelated = findRelatedBySharedWords(all, term, excludeIds);

  const created = term.createdAt
    ? new Date(term.createdAt).toLocaleString("ja-JP")
    : "";
  const verifiedDate = term.verifiedAt
    ? new Date(term.verifiedAt).toLocaleDateString("ja-JP")
    : "";
  const liked = term.likedBy.includes(user);

  // ヒーローの“リード文”は説明文の最初の1文だけ使う（残りは下の説明セクションで全文表示）。
  const lead = term.description.split("。")[0]?.trim();
  const leadText = lead ? `${lead}。` : term.description.slice(0, 120);

  return (
    <article className="mx-auto flex max-w-4xl animate-fade-in flex-col gap-12">
      <div className="flex items-center justify-between gap-2">
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
        <Link
          href={`/terms/${term.id}/edit`}
          className={buttonClasses({ variant: "outline", size: "sm" })}
        >
          <PencilIcon className="h-4 w-4" />
          編集
        </Link>
      </div>

      {/* ===== ヒーロー ===== */}
      <section className="overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/5 via-card to-accent/40 p-6 sm:p-10">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            {term.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {term.tags.map((tag) => (
                  <Link key={tag} href={`/?tags=${encodeURIComponent(tag)}`}>
                    <Badge variant="accent" className="hover:opacity-80">
                      {tag}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
            <h1 className="text-4xl font-bold tracking-tight">{term.word}</h1>
            <p className="text-lg leading-relaxed text-muted-foreground">
              {leadText}
            </p>
            {(term.createdBy || created) && (
              <p className="text-xs text-muted-foreground">
                登録: {term.createdBy}
                {term.createdBy && created && " ・ "}
                {created}
              </p>
            )}
          </div>

          {/* イラスト（無ければ：生成中の表示 / プレースホルダー＋作り直し） */}
          <div className="flex justify-center">
            {term.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={term.imageUrl}
                alt={`${term.word}を説明するイラスト`}
                className="max-h-80 w-full rounded-xl border bg-card object-contain shadow-sm"
              />
            ) : term.imageStatus === "generating" ? (
              <div className="flex w-full flex-col items-center gap-3 rounded-xl border border-dashed bg-card/60 p-8 text-center">
                <ImageIcon className="h-8 w-8 animate-shimmer text-primary" />
                <p className="text-sm font-medium text-primary">
                  イラストを生成中です…
                </p>
                <p className="text-xs text-muted-foreground">
                  そのまま一覧に戻れます。できあがったら画面でお知らせします。
                </p>
              </div>
            ) : (
              <div className="flex w-full flex-col items-center gap-3 rounded-xl border border-dashed bg-card/60 p-8 text-center">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
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
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ===== 説明（F-02：比喩なし） ===== */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">説明</h2>
          <Badge variant="outline">比喩を使わない説明</Badge>
        </div>

        {/* 確認状態（AI生成の説明の正しさを、人が読んで担保する印） */}
        {term.verifiedBy ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm">
            <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400">
              <CheckCircleIcon className="h-4 w-4" />
              確認済み
            </span>
            <span className="text-muted-foreground">
              {term.verifiedBy}
              {verifiedDate && ` ・ ${verifiedDate} に確認`}
            </span>
            <form action={unverifyTermAction} className="ml-auto">
              <input type="hidden" name="id" value={term.id} />
              <button
                type="submit"
                className="text-xs text-muted-foreground hover:text-destructive hover:underline"
              >
                確認を取り消す
              </button>
            </form>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm">
            <span className="font-medium text-amber-700 dark:text-amber-500">
              AI生成・未確認
            </span>
            <span className="text-muted-foreground">
              内容が正しいか、読んだ人が確認しましょう。
            </span>
            <form action={verifyTermAction} className="ml-auto">
              <input type="hidden" name="id" value={term.id} />
              <SubmitButton
                idle="内容を確認した"
                pending="保存中…"
                variant="outline"
              />
            </form>
          </div>
        )}

        <p className="whitespace-pre-wrap text-base leading-8 text-foreground/90">
          {descriptionSegments.map((seg, i) =>
            seg.termId ? (
              <Link
                key={i}
                href={`/terms/${seg.termId}`}
                title="登録済みの用語を開く"
                className="text-primary underline decoration-dotted underline-offset-2 transition-colors hover:decoration-solid"
              >
                {seg.text}
              </Link>
            ) : (
              <span key={i}>{seg.text}</span>
            ),
          )}
        </p>
      </section>

      {/* ===== 関連ワード（F-04）。既存の用語ならその詳細へ、無ければ新規登録へ（F-08） ===== */}
      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-bold tracking-tight">関連ワード</h2>
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
                      className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm text-primary transition-colors hover:bg-primary/15"
                    >
                      <LinkIcon className="h-3.5 w-3.5" />
                      {w}
                    </Link>
                  ) : (
                    <Link
                      href={`/terms/new?word=${encodeURIComponent(w)}`}
                      title="この語を新しく登録する"
                      className="inline-flex items-center gap-1 rounded-full border bg-card px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
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

      {/* ===== つながり（被リンク） ===== */}
      {backlinks.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <LinkIcon className="h-5 w-5 text-muted-foreground" />
            この用語とつながる用語
          </h2>
          <ul className="flex flex-wrap gap-2">
            {backlinks.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/terms/${b.id}`}
                  className="inline-flex items-center rounded-full border bg-card px-3 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {b.word}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ===== 2-hop（同じ関連ワードでつながる“兄弟”の用語） ===== */}
      {sharedRelated.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <LinkIcon className="h-5 w-5 text-muted-foreground" />
            同じ関連ワードでつながる用語
          </h2>
          <ul className="flex flex-wrap gap-2">
            {sharedRelated.slice(0, 8).map(({ term: b, shared }) => (
              <li key={b.id}>
                <Link
                  href={`/terms/${b.id}`}
                  title={`共通の関連ワード: ${shared.join("、")}`}
                  className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {b.word}
                  <span className="text-xs text-muted-foreground">
                    {shared[0]}
                    {shared.length > 1 && ` +${shared.length - 1}`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ===== コメント・いいね（みんなで説明を育てる） ===== */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <MessageIcon className="h-5 w-5 text-muted-foreground" />
            コメント
            {term.comments.length > 0 && (
              <span className="text-base font-normal text-muted-foreground">
                {term.comments.length}
              </span>
            )}
          </h2>
          <form action={toggleLikeAction}>
            <input type="hidden" name="id" value={term.id} />
            <button
              type="submit"
              className={cn(
                buttonClasses({ variant: "outline", size: "sm" }),
                liked && "border-rose-400 text-rose-600 dark:text-rose-400",
              )}
              aria-pressed={liked}
            >
              <HeartIcon className="h-4 w-4" fill={liked ? "currentColor" : "none"} />
              {liked ? "いいね済み" : "いいね"}
              {term.likedBy.length > 0 && (
                <span className="font-semibold">{term.likedBy.length}</span>
              )}
            </button>
          </form>
        </div>

        {term.comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            まだコメントはありません。説明への補足や直したい点があれば書いてください。
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {term.comments.map((c) => {
              const at = c.at ? new Date(c.at).toLocaleString("ja-JP") : "";
              return (
                <li key={c.id} className="rounded-lg border bg-card p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{c.by}</span>
                    <span className="text-xs text-muted-foreground">{at}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                    {c.text}
                  </p>
                  {c.by === user && (
                    <form action={deleteCommentAction} className="mt-1.5">
                      <input type="hidden" name="id" value={term.id} />
                      <input type="hidden" name="commentId" value={c.id} />
                      <button
                        type="submit"
                        className="text-xs text-muted-foreground hover:text-destructive hover:underline"
                      >
                        削除
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <CommentForm termId={term.id} />
      </section>

      {/* ===== 管理（F-07） ===== */}
      <div className="flex gap-3 border-t pt-6">
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
