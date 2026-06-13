"use client";

// 用語の新規登録フォーム（F-01）。
// 送信すると Server Action(createTermAction) が動き、AIが説明文・関連ワード・タグ・イラストを作る。
//
// 待ち時間のUX:
//  - 生成中は、完成後のレイアウト（イラスト・説明・関連ワード）を「スケルトン」で先に見せる。
//    空白＋ぐるぐるより体感の待ち時間が短く、「これから出てくる」と分かって安心できる。
//  - いま何をしているかの手順メッセージも順番に出す。

import { useActionState, useEffect, useState } from "react";
import { createTermAction, type FormState } from "@/app/actions";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { SparklesIcon } from "@/components/ui/icons";

// 実際に Server Action が順番に行う処理（進み具合の目安として順に表示する）
const STEPS = [
  "用語の意味を調べています…",
  "関連ワードとタグを整理しています…",
  "比喩を使わないやさしい説明にまとめています…",
  "イメージイラストを作っています…",
];

export function TermRegisterForm({ defaultWord = "" }: { defaultWord?: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    createTermAction,
    {},
  );
  const [step, setStep] = useState(0);

  // 生成中だけ、手順メッセージを数秒ごとに進める
  useEffect(() => {
    if (!pending) {
      setStep(0);
      return;
    }
    const id = setInterval(
      () => setStep((s) => Math.min(s + 1, STEPS.length - 1)),
      4000,
    );
    return () => clearInterval(id);
  }, [pending]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {pending ? (
        <GeneratingPreview message={STEPS[step]} />
      ) : (
        <Card className="flex flex-col gap-4 p-6">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">用語名</span>
            <Input
              type="text"
              name="word"
              defaultValue={defaultWord}
              placeholder="例：機械学習"
              autoFocus
            />
          </label>

          {state.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" className={buttonClasses({ variant: "primary" })}>
              <SparklesIcon className="h-4 w-4" />
              登録する
            </button>
            <span className="text-sm text-muted-foreground">
              比喩を使わない説明・関連ワード・タグ・イラストを自動で作ります
            </span>
          </div>
        </Card>
      )}
    </form>
  );
}

/** 生成中に見せる“完成形の下書き”（スケルトン）。 */
function GeneratingPreview({ message }: { message: string }) {
  return (
    <Card className="flex flex-col gap-5 p-6" aria-live="polite" aria-busy="true">
      <div className="flex items-center gap-2 text-sm font-medium text-primary">
        <SparklesIcon className="h-4 w-4 animate-shimmer" />
        AIが作成しています
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>

      {/* イラストの枠 */}
      <Skeleton className="h-40 w-full" />

      {/* 説明文（行の長さをバラして自然に見せる） */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-10/12" />
        <Skeleton className="h-4 w-7/12" />
      </div>

      {/* 関連ワードの枠 */}
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-7 w-20 rounded-full" />
        <Skeleton className="h-7 w-24 rounded-full" />
        <Skeleton className="h-7 w-16 rounded-full" />
      </div>

      <p className="text-xs text-muted-foreground">
        数十秒かかることがあります。このまま少しお待ちください。
      </p>
    </Card>
  );
}
