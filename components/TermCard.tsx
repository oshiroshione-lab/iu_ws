// 一覧に並べる用語カード（F-05）。クリックで詳細ページへ。

import Link from "next/link";
import type { Term } from "@/lib/types";
import { cn } from "@/lib/cn";
import { isRecentlyAdded } from "@/lib/terms";
import { Badge } from "@/components/ui/Badge";
import { CheckCircleIcon } from "@/components/ui/icons";

export function TermCard({ term }: { term: Term }) {
  const date = term.createdAt
    ? new Date(term.createdAt).toLocaleDateString("ja-JP")
    : "";
  const isNew = isRecentlyAdded(term.createdAt, Date.now());

  return (
    <Link
      href={`/terms/${term.id}`}
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-all",
        "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
      )}
    >
      {/* 画像（無ければ用語の頭文字を使った優しいプレースホルダー） */}
      <div className="relative h-32 w-full overflow-hidden border-b bg-muted">
        {term.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={term.imageUrl}
            alt={`${term.word}のイラスト`}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-accent">
            <span className="text-4xl font-bold text-primary/30">
              {term.word.slice(0, 1)}
            </span>
          </div>
        )}
        {!term.imageUrl && term.imageStatus === "generating" && (
          <span className="absolute bottom-1.5 right-1.5 rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-medium text-primary shadow-sm backdrop-blur">
            イラスト生成中…
          </span>
        )}
        {isNew && (
          <span className="absolute left-1.5 top-1.5 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold tracking-wide text-primary-foreground shadow-sm">
            NEW
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="flex items-center gap-1.5 font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
          <span className="truncate">{term.word}</span>
          {term.verifiedBy && (
            <CheckCircleIcon
              className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
              aria-label="確認済み"
            />
          )}
        </h3>
        <p className="line-clamp-2 flex-1 text-sm leading-relaxed text-muted-foreground">
          {term.description}
        </p>

        {term.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {term.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="accent">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          {term.createdBy && <span>{term.createdBy}</span>}
          {term.createdBy && date && <span aria-hidden>·</span>}
          {date && <span>{date}</span>}
        </div>
      </div>
    </Link>
  );
}
