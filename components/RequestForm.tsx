"use client";

// 用語リクエストの追加フォーム。「この用語を知りたい」を待ち行列に足す。

import { useActionState } from "react";
import { createRequestAction, type RequestFormState } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { MeField } from "@/components/MeField";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export function RequestForm() {
  const [state, formAction] = useActionState<RequestFormState, FormData>(
    createRequestAction,
    {},
  );

  return (
    <form action={formAction}>
      <MeField />
      <Card className="flex flex-col gap-4 p-6">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">知りたい用語</span>
          <Input type="text" name="word" placeholder="例：オーバーフェッチ" autoComplete="off" />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">ひとことメモ（任意）</span>
          <Input
            type="text"
            name="note"
            placeholder="例：会議で出てきたが意味が分からなかった"
            autoComplete="off"
          />
        </label>

        {state.error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.error}
          </p>
        )}

        <div>
          <SubmitButton idle="リクエストする" pending="追加中…" />
        </div>
      </Card>
    </form>
  );
}
