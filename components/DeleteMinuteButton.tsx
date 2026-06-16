"use client";

// 議事録の削除ボタン。押すと確認ダイアログを出し、OKなら削除する。

import { deleteMinuteAction } from "@/app/minutes/actions";
import { buttonClasses } from "@/components/ui/Button";
import { TrashIcon } from "@/components/ui/icons";

export function DeleteMinuteButton({ id, title }: { id: string; title: string }) {
  return (
    <form
      action={deleteMinuteAction}
      onSubmit={(e) => {
        if (!confirm(`「${title}」を削除しますか？この操作は元に戻せません。`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className={buttonClasses({ variant: "destructive", size: "sm" })}
      >
        <TrashIcon className="h-4 w-4" />
        削除
      </button>
    </form>
  );
}
