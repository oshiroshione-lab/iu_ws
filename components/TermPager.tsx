"use client";

// 用語詳細ページの「前の用語 / 次の用語」送りボタン。
// ホームに戻らなくても、< > で隣の用語へ切り替えられるようにする。
// 並び順・絞り込みはホームで選んだものを引き継ぐ（ページ側で計算して渡す）。
// その文脈（?sort= など）を送り先のURLにも付けるので、めくっても順番が保たれる。
// おまけ：キーボードの左右キー（←→）でも移動できる（入力中は邪魔しない）。

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { cn } from "@/lib/cn";
import { buttonClasses } from "@/components/ui/Button";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";

type Neighbor = { id: string; word: string } | null;

export function TermPager({
  prev,
  next,
  query = "",
}: {
  prev: Neighbor;
  next: Neighbor;
  /** いまの並び順・絞り込みのクエリ文字列（"?sort=name" など）。移動先URLに引き継ぐ。 */
  query?: string;
}) {
  const router = useRouter();

  // 左右キーでも前後へ移動できるようにする。
  // ただし検索欄など文字入力中や、修飾キー併用のときは何もしない。
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable)
      )
        return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowLeft" && prev)
        router.push(`/terms/${prev.id}${query}`);
      if (e.key === "ArrowRight" && next)
        router.push(`/terms/${next.id}${query}`);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, query, router]);

  return (
    <div className="flex items-center gap-1">
      {prev ? (
        <Link
          href={`/terms/${prev.id}${query}`}
          title={`前の用語：${prev.word}（←）`}
          aria-label={`前の用語：${prev.word}`}
          className={buttonClasses({ variant: "outline", size: "sm" })}
        >
          <ChevronLeftIcon className="h-4 w-4" />
          <span className="hidden max-w-[8rem] truncate sm:inline">
            {prev.word}
          </span>
        </Link>
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            buttonClasses({ variant: "outline", size: "sm" }),
            "pointer-events-none opacity-40",
          )}
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </span>
      )}
      {next ? (
        <Link
          href={`/terms/${next.id}${query}`}
          title={`次の用語：${next.word}（→）`}
          aria-label={`次の用語：${next.word}`}
          className={buttonClasses({ variant: "outline", size: "sm" })}
        >
          <span className="hidden max-w-[8rem] truncate sm:inline">
            {next.word}
          </span>
          <ChevronRightIcon className="h-4 w-4" />
        </Link>
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            buttonClasses({ variant: "outline", size: "sm" }),
            "pointer-events-none opacity-40",
          )}
        >
          <ChevronRightIcon className="h-4 w-4" />
        </span>
      )}
    </div>
  );
}
