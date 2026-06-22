"use client";

// 用語への「いいね」ボタン。自分の名前を足す/外すで ON/OFF する。
// 名前はブラウザ(localStorage)から取り、操作時に隠しフィールド "by" でサーバへ送る
// （ログイン廃止＋埋め込み対応のため、クッキーは使わない）。

import { useMe } from "@/components/MeProvider";
import { toggleLikeAction } from "@/app/actions";
import { cn } from "@/lib/cn";
import { buttonClasses } from "@/components/ui/Button";
import { HeartIcon } from "@/components/ui/icons";

export function LikeButton({
  termId,
  likedBy,
}: {
  termId: string;
  likedBy: string[];
}) {
  const { me } = useMe();
  const who = me.trim() || "ゲスト";
  const liked = likedBy.includes(who);

  return (
    <form action={toggleLikeAction}>
      <input type="hidden" name="id" value={termId} />
      <input type="hidden" name="by" value={me} />
      <button
        type="submit"
        className={cn(
          buttonClasses({ variant: "outline", size: "sm" }),
          liked && "border-rose-400 text-rose-600 dark:text-rose-400",
        )}
        aria-pressed={liked}
      >
        <HeartIcon className="h-4 w-4" fill={liked ? "currentColor" : "none"} />
        {liked ? "いいね済み" : "いいね"}
        {likedBy.length > 0 && (
          <span className="font-semibold">{likedBy.length}</span>
        )}
      </button>
    </form>
  );
}
