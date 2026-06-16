"use client";

// 議事録の編集フォーム。タイトル・本文を手で直す。

import Link from "next/link";
import { useActionState } from "react";
import { updateMinuteAction, type MinuteFormState } from "@/app/minutes/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import type { Minute } from "@/lib/types";

export function MinutesEditForm({ minute }: { minute: Minute }) {
  const [state, formAction] = useActionState<MinuteFormState, FormData>(
    updateMinuteAction,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={minute.id} />

      <Card className="flex flex-col gap-4 p-6">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">タイトル</span>
          <Input type="text" name="title" defaultValue={minute.title} />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">会議日</span>
            <Input type="date" name="meetingDate" defaultValue={minute.meetingDate} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">参加者</span>
            <Input
              type="text"
              name="attendees"
              defaultValue={minute.attendees}
              placeholder="例：太郎、花子、次郎"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">要約</span>
          <Textarea
            name="summary"
            defaultValue={minute.summary}
            rows={3}
            placeholder="会議の要点（「AIで整える」で自動生成もできます）"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">議題</span>
          <Textarea
            name="agenda"
            defaultValue={minute.agenda}
            rows={3}
            placeholder="話し合うテーマ（1行に1つ）"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">議事内容（本文）</span>
          <Textarea name="body" defaultValue={minute.body} rows={12} />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">決定事項</span>
          <Textarea
            name="decisions"
            defaultValue={minute.decisions}
            rows={3}
            placeholder="決まったこと（1行に1つ）"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">ToDo・次にやること</span>
          <Textarea
            name="todos"
            defaultValue={minute.todos}
            rows={3}
            placeholder="次のアクション（1行に1つ。例：太郎が資料を用意）"
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
            href={`/minutes/${minute.id}`}
            className="text-sm text-muted-foreground hover:text-foreground hover:underline"
          >
            キャンセル
          </Link>
        </div>
      </Card>
    </form>
  );
}
