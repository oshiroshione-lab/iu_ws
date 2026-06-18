// 並び順の切替（新しい順／古い順／名前順／いいね順）と、
// 表示の切替（グリッド／縦の積層／横の積層）をまとめたツールバー。
//
// すべて <Link>（ふつうのリンク）で動くので、JavaScriptが無くても切り替えられる。
// いまの検索ワードやタグの絞り込みは buildQuery で引き継ぐので、
// 並び替えても・表示を変えても、絞り込みが消えない。

import Link from "next/link";
import { cn } from "@/lib/cn";
import { buildQuery } from "@/lib/url";
import {
  SORT_OPTIONS,
  toSortKey,
  toViewMode,
  type ViewMode,
} from "@/lib/terms";
import {
  SortIcon,
  LayoutGridIcon,
  RowsIcon,
  ColumnsIcon,
} from "@/components/ui/icons";

type Params = { q?: string; tags?: string; sort?: string; view?: string };

const VIEW_OPTIONS: {
  key: ViewMode;
  label: string;
  Icon: typeof LayoutGridIcon;
}[] = [
  { key: "grid", label: "グリッド", Icon: LayoutGridIcon },
  { key: "vstack", label: "縦", Icon: RowsIcon },
  { key: "hstack", label: "横", Icon: ColumnsIcon },
];

export function TermsToolbar({ current }: { current: Params }) {
  const activeSort = toSortKey(current.sort);
  const activeView = toViewMode(current.view);

  const chip =
    "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm transition-colors";
  const toggleBtn =
    "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {/* 並び順 */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <SortIcon className="h-4 w-4" />
          並び順
        </span>
        {SORT_OPTIONS.map(({ key, label }) => {
          const active = key === activeSort;
          // 既定（新しい順）はURLから省いて短くする。
          const href =
            "/" +
            buildQuery(current, { sort: key === "new" ? undefined : key });
          return (
            <Link
              key={key}
              href={href}
              aria-current={active ? "true" : undefined}
              className={cn(
                chip,
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {/* 表示切替（グリッド / 縦の積層 / 横の積層） */}
      <div className="inline-flex overflow-hidden rounded-full border">
        {VIEW_OPTIONS.map(({ key, label, Icon }, i) => {
          const active = key === activeView;
          const href =
            "/" +
            buildQuery(current, { view: key === "grid" ? undefined : key });
          return (
            <Link
              key={key}
              href={href}
              aria-current={active ? "true" : undefined}
              aria-label={`${label}表示`}
              className={cn(
                toggleBtn,
                i > 0 && "border-l",
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-card hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
