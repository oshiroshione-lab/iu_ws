"use client";

// 削除ボタン（F-07）。押すと確認ダイアログを出し、OKなら削除する。

import { deleteTermAction } from "@/app/actions";

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
        className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
      >
        削除
      </button>
    </form>
  );
}
