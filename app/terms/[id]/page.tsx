// 用語の詳細ページ：説明・イラスト・関連ワードを表示（F-02 / F-03 / F-04）。

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { termRepository } from "@/lib/store";
import { retryIllustrationAction } from "@/app/actions";
import { DeleteTermButton } from "@/components/DeleteTermButton";
import { SubmitButton } from "@/components/SubmitButton";

export default async function TermDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const term = await termRepository.get(id);
  if (!term) notFound();

  const created = new Date(term.createdAt).toLocaleString("ja-JP");

  return (
    <article className="flex flex-col gap-6">
      <div>
        <Link href="/" className="text-sm text-gray-500 hover:underline">
          ← 一覧へ戻る
        </Link>
        <h1 className="mt-2 text-3xl font-bold">{term.word}</h1>
        <p className="mt-1 text-xs text-gray-400">
          登録: {term.createdBy}・{created}
        </p>
      </div>

      {/* イメージイラスト（F-03） */}
      <section>
        {term.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={term.imageUrl}
            alt={`${term.word}のイラスト`}
            className="max-h-80 rounded-lg border border-gray-200 object-contain"
          />
        ) : (
          <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6">
            <p className="text-sm text-gray-500">
              {term.imageStatus === "failed"
                ? "画像を生成できませんでした（後でやり直せます）。"
                : "イラストはまだありません。"}
            </p>
            <form action={retryIllustrationAction}>
              <input type="hidden" name="id" value={term.id} />
              <SubmitButton idle="イラストを作り直す" pending="作成中…" />
            </form>
          </div>
        )}
      </section>

      {/* 説明文（F-02：比喩なし） */}
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">説明</h2>
        <p className="whitespace-pre-wrap leading-relaxed text-gray-800">
          {term.description}
        </p>
      </section>

      {/* 関連ワード（F-04）。クリックでその語を新規登録できる（F-08） */}
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">関連ワード</h2>
        {term.relatedWords.length === 0 ? (
          <p className="text-sm text-gray-500">関連ワードは見つかりませんでした。</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {term.relatedWords.map((w) => (
              <li key={w}>
                <Link
                  href={`/terms/new?word=${encodeURIComponent(w)}`}
                  title="この語を新しく登録する"
                  className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm text-blue-700 hover:bg-blue-100"
                >
                  {w} ＋
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 編集・削除（F-07） */}
      <div className="flex gap-3 border-t border-gray-200 pt-4">
        <Link
          href={`/terms/${term.id}/edit`}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50"
        >
          編集
        </Link>
        <DeleteTermButton id={term.id} word={term.word} />
      </div>
    </article>
  );
}
