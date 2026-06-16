// 議事録の新規作成ページ（録音→文字起こし→保存）。

import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { hasOpenAIKey } from "@/lib/config";
import { cn } from "@/lib/cn";
import { MinutesComposer } from "@/components/MinutesComposer";
import { buttonClasses } from "@/components/ui/Button";
import { ArrowLeftIcon, MicIcon } from "@/components/ui/icons";

export default async function NewMinutePage() {
  await requireUser();

  return (
    <div className="mx-auto flex max-w-2xl animate-fade-in flex-col gap-6">
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
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight">
          <MicIcon className="h-6 w-6 text-primary" />
          録音して議事録を作る
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          マイクで話すと、その場で文字に起こします（リアルタイム）。整えて議事録として保存できます。
        </p>
      </div>

      {!hasOpenAIKey && (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
          ⚠ OpenAIのAPIキーが未設定です。<code>.env.local</code> の{" "}
          <code>OPENAI_API_KEY</code> に鍵を入れて、サーバーを再起動すると文字起こしが使えます。
        </p>
      )}

      <MinutesComposer canTranscribe={hasOpenAIKey} />
    </div>
  );
}
