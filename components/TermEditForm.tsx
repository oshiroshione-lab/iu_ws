"use client";

// 用語の編集フォーム（F-07）。用語名・説明文・関連ワード・タグを手で直す。

import Link from "next/link";
import { useActionState } from "react";
import { updateTermAction, type FormState } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import type { Term } from "@/lib/types";

export function TermEditForm({ term }: { term: Term }) {
  const [state, formAction] = useActionState<FormState, FormData>(
    updateTermAction,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={term.id} />

      <Card className="flex flex-col gap-4 p-6">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">用語名</span>
          <Input type="text" name="word" defaultValue={term.word} />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">説明文</span>
          <Textarea name="description" defaultValue={term.description} rows={8} />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">タグ</span>
          <Input
            type="text"
            name="tags"
            defaultValue={term.tags.join(", ")}
            placeholder="例：AI, 統計, Web（カンマ区切り）"
          />
          <span className="text-xs text-muted-foreground">
            カンマや読点で区切って入力します（最大6個）。
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">関連ワード（1行に1つ）</span>
          <Textarea
            name="relatedWords"
            defaultValue={term.relatedWords.join("\n")}
            rows={4}
          />
        </label>

        {state.error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <SubmitButton idle="保存する" pending="保存中…" />
          <Link
            href={`/terms/${term.id}`}
            className="text-sm text-muted-foreground hover:text-foreground hover:underline"
          >
            キャンセル
          </Link>
        </div>
      </Card>
    </form>
  );
}
