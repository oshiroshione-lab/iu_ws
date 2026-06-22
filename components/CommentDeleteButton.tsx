"use client";

// コメントの削除ボタン。自分（いまの名前）が書いたコメントにだけ出す。
// 名前はブラウザ(localStorage)から取る（ログイン廃止＋埋め込み対応のため）。

import { useMe } from "@/components/MeProvider";
import { deleteCommentAction } from "@/app/actions";

export function CommentDeleteButton({
  termId,
  commentId,
  commentBy,
}: {
  termId: string;
  commentId: string;
  commentBy: string;
}) {
  const { me } = useMe();
  const who = me.trim() || "ゲスト";
  if (who !== commentBy) return null;

  return (
    <form action={deleteCommentAction} className="mt-1.5">
      <input type="hidden" name="id" value={termId} />
      <input type="hidden" name="commentId" value={commentId} />
      <button
        type="submit"
        className="text-xs text-muted-foreground hover:text-destructive hover:underline"
      >
        削除
      </button>
    </form>
  );
}
