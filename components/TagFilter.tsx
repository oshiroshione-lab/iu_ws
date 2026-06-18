// タグの絞り込みチップ（横並びのボタン）。
// ・複数のタグを選べる（選んだタグの「どれかを持つ」用語を表示＝OR）。
// ・選んでいるタグをもう一度押すと、そのタグだけ解除する（トグル）。
// ・解除して何も選んでいない状態になったら、自動で「すべて」に戻る。
// クリック先は /?tags=タグ1,タグ2 のように、今の選択を反映したURL。

import Link from "next/link";
import { cn } from "@/lib/cn";
import { buildQuery } from "@/lib/url";
import { toggleTag } from "@/lib/terms";
import { TagIcon } from "@/components/ui/icons";

export function TagFilter({
  tags,
  activeTags = [],
  current = {},
}: {
  tags: { tag: string; count: number }[];
  /** いま選ばれているタグの一覧（複数可） */
  activeTags?: string[];
  /** いまの検索・並び順・表示などの条件（タグを切り替えても消えないよう引き継ぐ） */
  current?: { q?: string; tags?: string; sort?: string; view?: string; cols?: string };
}) {
  if (tags.length === 0) return null;

  const chip =
    "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm transition-colors";

  const activeLower = new Set(activeTags.map((t) => t.toLowerCase()));

  // 選んだタグ配列を URL に変換（空なら tags を消して「すべて」に戻る）。
  const hrefFor = (nextTags: string[]) =>
    "/" +
    buildQuery(current, {
      tags: nextTags.length > 0 ? nextTags.join(",") : undefined,
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <TagIcon className="h-4 w-4" />
        タグ
      </span>
      <Link
        href={hrefFor([])}
        className={cn(
          chip,
          activeLower.size === 0
            ? "border-primary bg-primary text-primary-foreground"
            : "bg-card hover:bg-accent hover:text-accent-foreground",
        )}
      >
        すべて
      </Link>
      {tags.map(({ tag, count }) => {
        const active = activeLower.has(tag.toLowerCase());
        // 押したときの遷移先：選んでいれば外す、選んでいなければ足す（toggleTag）。
        // 外した結果すべて空になれば、hrefFor が自動で「すべて」(tags無し)にする。
        const href = hrefFor(toggleTag(activeTags, tag));
        return (
          <Link
            key={tag}
            href={href}
            aria-pressed={active}
            className={cn(
              chip,
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-card hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {tag}
            <span
              className={cn(
                "text-xs",
                active ? "text-primary-foreground/80" : "text-muted-foreground",
              )}
            >
              {count}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
