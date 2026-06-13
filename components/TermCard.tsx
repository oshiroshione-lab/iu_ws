// 一覧に並べる用語カード（F-05）。クリックで詳細ページへ。

import Link from "next/link";
import type { Term } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/Badge";

export function TermCard({ term }: { term: Term }) {
  const date = term.createdAt
    ? new Date(term.createdAt).toLocaleDateString("ja-JP")
    : "";

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
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
          {term.word}
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
