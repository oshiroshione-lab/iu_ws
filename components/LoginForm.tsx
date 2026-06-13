"use client";

// ログインフォーム（仮）。名前と合言葉を入れて入る。

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/login/actions";
import { SubmitButton } from "./SubmitButton";
import { Input } from "@/components/ui/Input";

export function LoginForm() {
  const [state, formAction] = useActionState<LoginState, FormData>(
    loginAction,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">名前</span>
        <Input type="text" name="name" placeholder="例：シオネ" autoFocus />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">合言葉（設定されている場合）</span>
        <Input type="password" name="code" />
      </label>

      {state.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <SubmitButton idle="入る" pending="確認中…" className="w-full" />
    </form>
  );
}
