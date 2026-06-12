"use client";

// 用語の編集フォーム（F-07）。用語名・説明文・関連ワードを手で直す。

import { useActionState } from "react";
import { updateTermAction, type FormState } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";
import type { Term } from "@/lib/types";

export function TermEditForm({ term }: { term: Term }) {
  const [state, formAction] = useActionState<FormState, FormData>(
    updateTermAction,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={term.id} />

      <label className="flex flex-col gap-1">
        <span className="font-medium">用語名</span>
        <input
          type="text"
          name="word"
          defaultValue={term.word}
          className="rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-medium">説明文</span>
        <textarea
          name="description"
          defaultValue={term.description}
          rows={8}
          className="rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-medium">関連ワード（1行に1つ）</span>
        <textarea
          name="relatedWords"
          defaultValue={term.relatedWords.join("\n")}
          rows={4}
          className="rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
        />
      </label>

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <SubmitButton idle="保存する" pending="保存中…" />
        <a href={`/terms/${term.id}`} className="text-sm text-gray-500 hover:underline">
          キャンセル
        </a>
      </div>
    </form>
  );
}
