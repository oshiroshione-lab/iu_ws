"use client";

// ログインフォーム（仮）。名前と合言葉を入れて入る。

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/login/actions";
import { SubmitButton } from "./SubmitButton";

export function LoginForm() {
  const [state, formAction] = useActionState<LoginState, FormData>(
    loginAction,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="font-medium">名前</span>
        <input
          type="text"
          name="name"
          placeholder="例：シオネ"
          autoFocus
          className="rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-medium">合言葉（設定されている場合）</span>
        <input
          type="password"
          name="code"
          className="rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
        />
      </label>

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <SubmitButton idle="入る" pending="確認中…" />
    </form>
  );
}
