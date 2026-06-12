"use client";

// 用語の新規登録フォーム（F-01）。
// 送信すると Server Action(createTermAction) が動き、AIが説明文などを作る。

import { useActionState } from "react";
import { createTermAction, type FormState } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";

export function TermRegisterForm({ defaultWord = "" }: { defaultWord?: string }) {
  const [state, formAction] = useActionState<FormState, FormData>(
    createTermAction,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="font-medium">用語名</span>
        <input
          type="text"
          name="word"
          defaultValue={defaultWord}
          placeholder="例：機械学習"
          autoFocus
          className="rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
        />
      </label>

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <SubmitButton idle="登録する" pending="AIが調べています…（数十秒かかることがあります）" />
        <span className="text-sm text-gray-500">
          ※ 比喩を使わない説明・関連ワード・イラストを自動で作ります
        </span>
      </div>
    </form>
  );
}
