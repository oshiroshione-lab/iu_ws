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
  toGridCols,
  GRID_COLS_OPTIONS,
  DEFAULT_GRID_COLS,
  type ViewMode,
} from "@/lib/terms";
import {
  SortIcon,
  LayoutGridIcon,
  RowsIcon,
  ColumnsIcon,
  PlusIcon,
  MinusIcon,
} from "@/components/ui/icons";
import type { ReactNode } from "react";

type Params = {
  q?: string;
  tags?: string;
  sort?: string;
  view?: string;
  cols?: string;
};

const VIEW_OPTIONS: {
  key: ViewMode;
  label: string;
  Icon: typeof LayoutGridIcon;
}[] = [
  { key: "grid", label: "グリッド", Icon: LayoutGridIcon },
  { key: "vstack", label: "縦", Icon: RowsIcon },
  { key: "hstack", label: "横", Icon: ColumnsIcon },
];

// 大きさ調整の「−」「＋」1個分。
// 端まで来たら押せない見た目（うすいグレー）にして、リンクではなくただの印にする。
// 押せるときは <Link> なので JavaScript が無くても動く。divider=true で左に区切り線。
function StepButton({
  href,
  disabled,
  label,
  divider,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  divider?: boolean;
  children: ReactNode;
}) {
  const cls = cn(
    "inline-flex h-9 w-10 items-center justify-center transition-colors",
    divider && "border-l",
  );
  if (disabled) {
    return (
      <span aria-disabled="true" aria-label={label} className={cn(cls, "text-muted-foreground/30")}>
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        cls,
        "text-muted-foreground hover:bg-accent hover:text-foreground active:bg-accent/70",
      )}
    >
      {children}
    </Link>
  );
}

// 選べる列数の下限・上限（GRID_COLS_OPTIONS = [2,3,4,5,6] から取る）。
const MIN_COLS = GRID_COLS_OPTIONS[0];
const MAX_COLS = GRID_COLS_OPTIONS[GRID_COLS_OPTIONS.length - 1];

export function TermsToolbar({ current }: { current: Params }) {
  const activeSort = toSortKey(current.sort);
  const activeView = toViewMode(current.view);
  const activeCols = toGridCols(current.cols);

  const chip =
    "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm transition-colors";
  const toggleBtn =
    "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors";

  // 列数 n に切り替えるリンク先（既定の3はURLから省いて短くする）。
  const colsHref = (n: number) =>
    "/" +
    buildQuery(current, { cols: n === DEFAULT_GRID_COLS ? undefined : String(n) });

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

      <div className="flex flex-wrap items-center gap-3">
        {/* 列数（グリッド表示のときだけ）。−で列を減らす（最小2）、＋で列を増やす（最大6）。
            クラシック・ワイドどちらも同じ＋/−。 */}
        {activeView === "grid" && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center text-muted-foreground" aria-hidden="true">
              <LayoutGridIcon className="h-4 w-4" />
            </span>
            <div className="inline-flex items-center overflow-hidden rounded-full border bg-card shadow-sm">
              {/* − ＝ 列を減らす（横に並ぶ数を減らす）。2列まで。 */}
              <StepButton
                href={colsHref(activeCols - 1)}
                disabled={activeCols <= MIN_COLS}
                label="列を減らす"
              >
                <MinusIcon className="h-4 w-4" />
              </StepButton>
              {/* ＋ ＝ 列を増やす（横に並ぶ数を増やす）。6列まで。 */}
              <StepButton
                href={colsHref(activeCols + 1)}
                disabled={activeCols >= MAX_COLS}
                label="列を増やす"
                divider
              >
                <PlusIcon className="h-4 w-4" />
              </StepButton>
            </div>
          </div>
        )}

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
    </div>
  );
}
