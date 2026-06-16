"use client";

// 「AIで整える」ボタン。議事録の本文（文字起こし）から、
// 要約・決定事項・ToDo を作って反映する。すでに中身があるときは上書き確認を出す。

import { useActionState } from "react";
import { organizeMinuteAction, type OrganizeState } from "@/app/minutes/actions";
import { SubmitButton } from "@/components/SubmitButton";

export function OrganizeButton({
  minuteId,
  hasContent,
}: {
  minuteId: string;
  /** すでに要約/決定事項/ToDo に中身があるか（上書き確認を出すかの判断に使う） */
  hasContent: boolean;
}) {
  const [state, formAction] = useActionState<OrganizeState, FormData>(
    organizeMinuteAction,
    {},
  );

  return (
    <div className="flex flex-col gap-2">
      <form
        action={formAction}
        onSubmit={(e) => {
          if (
            hasContent &&
            !window.confirm(
              "いまの要約・決定事項・ToDo を、AIが本文から作り直します（置き換わります）。よろしいですか？",
            )
          ) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="id" value={minuteId} />
        <SubmitButton
          idle="AIで整える（要約・決定事項・ToDo）"
          pending="整えています…"
          variant="primary"
        />
      </form>
      {state.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
    </div>
  );
}
