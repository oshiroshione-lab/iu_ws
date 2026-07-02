"use client";

// 議事録の削除ボタン。押すと「本当に削除しますか？」の確認を画面の中に出し、
// もう一度「削除する」を押したときだけ削除する。
//
// なぜ window.confirm を使わないか:
//   このアプリは別ドメインの iframe（プラットフォームの埋め込み枠）で開かれる。
//   サンドボックスされた iframe では、ブラウザが confirm() を無視して常に
//   「キャンセル(false)」を返すため、以前は確認も削除もできなかった。
//   そこで confirm() に頼らず、画面内の2段階ボタンで確認するようにした。

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { deleteMinuteAction } from "@/app/minutes/actions";
import { buttonClasses } from "@/components/ui/Button";
import { TrashIcon } from "@/components/ui/icons";

/** 確認後に押す「削除する」本ボタン。送信中（削除中）は押せなくして表示を変える。 */
function ConfirmDeleteSubmit() {
  const status = useFormStatus();
  return (
    <button
      type="submit"
      disabled={status.pending}
      aria-busy={status.pending}
      className={buttonClasses({ variant: "destructive", size: "sm" })}
    >
      {status.pending && (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      )}
      {status.pending ? "削除中…" : "削除する"}
    </button>
  );
}

export function DeleteMinuteButton({ id, title }: { id: string; title: string }) {
  // false: 最初の「削除」ボタンだけ表示 / true: 確認メッセージと本ボタンを表示
  const [confirming, setConfirming] = useState(false);

  return (
    <form action={deleteMinuteAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      {confirming ? (
        <>
          <span className="text-sm text-muted-foreground">
            「{title}」を削除しますか？元に戻せません。
          </span>
          <ConfirmDeleteSubmit />
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className={buttonClasses({ variant: "ghost", size: "sm" })}
          >
            やめる
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className={buttonClasses({ variant: "destructive", size: "sm" })}
        >
          <TrashIcon className="h-4 w-4" />
          削除
        </button>
      )}
    </form>
  );
}
