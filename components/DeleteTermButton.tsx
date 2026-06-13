"use client";

// 削除ボタン（F-07）。押すと確認ダイアログを出し、OKなら削除する。

import { deleteTermAction } from "@/app/actions";
import { buttonClasses } from "@/components/ui/Button";
import { TrashIcon } from "@/components/ui/icons";

export function DeleteTermButton({ id, word }: { id: string; word: string }) {
  return (
    <form
      action={deleteTermAction}
      onSubmit={(e) => {
        if (!confirm(`「${word}」を削除しますか？この操作は元に戻せません。`)) {
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
