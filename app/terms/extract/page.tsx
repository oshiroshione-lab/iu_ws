// 議事録から用語を自動登録するページ。
// 文章を貼り付けると、AIが専門用語を抽出して、1つずつ辞書に登録する。

import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { hasOpenAIKey } from "@/lib/config";
import { cn } from "@/lib/cn";
import { TermExtractor } from "@/components/TermExtractor";
import { buttonClasses } from "@/components/ui/Button";
import { ArrowLeftIcon, FileTextIcon } from "@/components/ui/icons";

export default async function ExtractPage() {
  await requireUser();

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
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight">
          <FileTextIcon className="h-6 w-6 text-primary" />
          議事録から用語を登録
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          会議の文字起こしやメモを貼り付けて「用語の候補を出す」を押すと、AIが専門用語の候補を挙げます。登録したい用語だけ選んで登録できます。
        </p>
      </div>

      {!hasOpenAIKey && (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
          ⚠ OpenAIのAPIキーが未設定です。<code>.env.local</code> の{" "}
          <code>OPENAI_API_KEY</code> に鍵を入れて、開発サーバーを再起動してください。
        </p>
      )}

      <TermExtractor />
    </div>
  );
}
