"use client";

// 議事録など長文から専門用語を抽出して、まとめて登録するフォーム。
// 送信すると extractAndCreateTermsAction が動き、結果（登録できた／飛ばした／失敗）を表示する。

import Link from "next/link";
import { useActionState } from "react";
import {
  extractAndCreateTermsAction,
  type ExtractState,
} from "@/app/actions";
import { MINUTES_MAX_LENGTH, EXTRACT_MAX_TERMS } from "@/lib/validation";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import { SubmitButton } from "./SubmitButton";
import { SparklesIcon } from "@/components/ui/icons";

export function ExtractForm() {
  const [state, formAction] = useActionState<ExtractState, FormData>(
    extractAndCreateTermsAction,
    {},
  );
  const r = state.result;
  const foundNothing =
    r && r.added.length === 0 && r.skipped.length === 0 && r.failed.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction}>
        <Card className="flex flex-col gap-4 p-6">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">議事録などの文章</span>
            <Textarea
              name="text"
              rows={10}
              maxLength={MINUTES_MAX_LENGTH}
              placeholder="会議の文字起こしやメモを貼り付けてください。AIが専門用語を見つけて、1つずつ説明・関連ワード・タグを作って登録します。"
            />
            <span className="text-xs text-muted-foreground">
              最大{MINUTES_MAX_LENGTH.toLocaleString()}文字。1回で最大{EXTRACT_MAX_TERMS}件まで登録します（コスト配慮でイラストは作りません。各用語のページから後で作れます）。
            </span>
          </label>

          {state.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <SubmitButton
              idle="用語を抽出して登録"
              pending="抽出して登録しています…（数十秒〜数分かかることがあります）"
            />
            <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
              <SparklesIcon className="h-4 w-4" />
              比喩を使わない説明で登録します
            </span>
          </div>
        </Card>
      </form>

      {r && (
        <Card className="flex flex-col gap-4 p-6" aria-live="polite">
          <h2 className="text-base font-semibold">登録の結果</h2>

          {foundNothing && (
            <p className="text-sm text-muted-foreground">
              登録できる専門用語は見つかりませんでした。文章を増やすか、用語を直接登録してみてください。
            </p>
          )}

          {r.added.length > 0 && (
            <ResultBlock
              title={`新しく登録した用語（${r.added.length}件）`}
              tone="added"
            >
              {r.added.map((w) => (
                <Link key={w} href={`/?q=${encodeURIComponent(w)}`}>
                  <Badge variant="accent" className="hover:opacity-80">
                    {w}
                  </Badge>
                </Link>
              ))}
            </ResultBlock>
          )}

          {r.skipped.length > 0 && (
            <ResultBlock
              title={`すでに登録済みで飛ばした用語（${r.skipped.length}件）`}
              tone="muted"
            >
              {r.skipped.map((w) => (
                <Badge key={w} variant="outline">
                  {w}
                </Badge>
              ))}
            </ResultBlock>
          )}

          {r.failed.length > 0 && (
            <ResultBlock
              title={`作成に失敗した用語（${r.failed.length}件）`}
              tone="failed"
            >
              {r.failed.map((w) => (
                <span
                  key={w}
                  className="inline-flex items-center rounded-full border border-destructive/40 px-2.5 py-0.5 text-xs font-medium text-destructive"
                >
                  {w}
                </span>
              ))}
            </ResultBlock>
          )}

          {r.overflow > 0 && (
            <p className="text-sm text-muted-foreground">
              他にも{r.overflow}件の候補が見つかりましたが、今回は上限のため見送りました。もう一度実行すると続きを登録できます。
            </p>
          )}

          {r.added.length > 0 && (
            <Link
              href="/"
              className="text-sm font-medium text-primary hover:underline"
            >
              一覧で確認する →
            </Link>
          )}
        </Card>
      )}
    </div>
  );
}

function ResultBlock({
  title,
  children,
}: {
  title: string;
  tone: "added" | "muted" | "failed";
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}
