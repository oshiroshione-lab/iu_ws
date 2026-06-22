"use client";

// 用語へのコメント追加フォーム。送信後は入力欄を空に戻す。

import { useActionState, useEffect, useRef } from "react";
import { addCommentAction, type FormState } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { MeField } from "@/components/MeField";
import { Textarea } from "@/components/ui/Textarea";

export function CommentForm({ termId }: { termId: string }) {
  const [state, formAction] = useActionState<FormState, FormData>(
    addCommentAction,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  // 追加に成功したら（エラーが無ければ）入力欄を空に戻す。
  useEffect(() => {
    if (!state.error) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={termId} />
      <MeField />
      <Textarea
        name="text"
        rows={3}
        placeholder="説明への補足・気づいたこと・直したい点など"
      />
      {state.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      <div>
        <SubmitButton idle="コメントする" pending="送信中…" variant="outline" />
      </div>
    </form>
  );
}
