// タグの絞り込みチップ（横並びのボタン）。
// クリックすると /?tag=タグ名 に移動し、そのタグを持つ用語だけを表示する。

import Link from "next/link";
import { cn } from "@/lib/cn";
import { TagIcon } from "@/components/ui/icons";

export function TagFilter({
  tags,
  activeTag,
}: {
  tags: { tag: string; count: number }[];
  activeTag?: string;
}) {
  if (tags.length === 0) return null;

  const chip =
    "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm transition-colors";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <TagIcon className="h-4 w-4" />
        タグ
      </span>
      <Link
        href="/"
        className={cn(
          chip,
          !activeTag
            ? "border-primary bg-primary text-primary-foreground"
            : "bg-card hover:bg-accent hover:text-accent-foreground",
        )}
      >
        すべて
      </Link>
      {tags.map(({ tag, count }) => {
        const active = activeTag?.toLowerCase() === tag.toLowerCase();
        return (
          <Link
            key={tag}
            href={`/?tag=${encodeURIComponent(tag)}`}
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
