// 用語の新規登録ページ（F-01）。
// 関連ワードから飛んできた場合は ?word=... で用語名を最初から入れておく（F-08）。

import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { hasOpenAIKey } from "@/lib/config";
import { cn } from "@/lib/cn";
import { termRepository } from "@/lib/store";
import { TermRegisterForm } from "@/components/TermRegisterForm";
import { buttonClasses } from "@/components/ui/Button";
import { ArrowLeftIcon } from "@/components/ui/icons";

export default async function NewTermPage({
  searchParams,
}: {
  searchParams: Promise<{ word?: string }>;
}) {
  await requireUser();
  const { word } = await searchParams;
  // 重複防止サジェスト用に、登録済みの用語名を渡す
  const existingTerms = (await termRepository.list()).map((t) => ({
    id: t.id,
    word: t.word,
  }));

  return (
    <div className="mx-auto flex max-w-xl animate-fade-in flex-col gap-6">
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
        <h1 className="mt-2 text-2xl font-bold tracking-tight">用語を登録</h1>
      </div>

      {!hasOpenAIKey && (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
          ⚠ OpenAIのAPIキーが未設定です。<code>.env.local</code> の{" "}
          <code>OPENAI_API_KEY</code> に鍵を入れて、開発サーバーを再起動してください。
        </p>
      )}

      <TermRegisterForm defaultWord={word ?? ""} existingTerms={existingTerms} />
    </div>
  );
}
