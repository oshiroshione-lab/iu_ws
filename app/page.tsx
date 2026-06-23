// トップページ：用語の一覧・検索・タグ絞り込み・並び替え・表示切替（F-05 / F-06）。

import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { termRepository } from "@/lib/store";
import {
  collectTags,
  filterByTags,
  parseTagsParam,
  sortTerms,
  toSortKey,
  toViewMode,
  toGridCols,
  DEFAULT_GRID_COLS,
  isRecentlyAdded,
  type GridCols,
} from "@/lib/terms";
import { buildQuery } from "@/lib/url";
import { TermCard } from "@/components/TermCard";
import { TaikoSelector, type PlateTerm } from "@/components/TaikoSelector";
import { SearchBar } from "@/components/SearchBar";
import { TagFilter } from "@/components/TagFilter";
import { TermsToolbar } from "@/components/TermsToolbar";
import { EmptyState } from "@/components/ui/EmptyState";
import { buttonClasses } from "@/components/ui/Button";
import { BookIcon, PlusIcon, SearchIcon } from "@/components/ui/icons";

// 列数ごとのグリッドのクラス。Tailwind は“完全な文字列”でしかクラスを拾わないので、
// `lg:grid-cols-${n}` のような組み立てはせず、ここに決め打ちで全部書いておく。
// スマホ・中くらいの画面では詰めすぎないよう列数を抑え、広い画面で選んだ列数にする。
const GRID_COLS_CLASS: Record<GridCols, string> = {
  2: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-2 lg:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
  6: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    tag?: string;
    tags?: string;
    sort?: string;
    view?: string;
    cols?: string;
  }>;
}) {
  await requireUser();
  const { q, tag, tags: tagsParam, sort, view, cols } = await searchParams;
  const query = (q ?? "").trim();
  // タグは複数選べる（?tags=AI,Web）。旧 ?tag= も読めるようにして後方互換を保つ。
  const activeTags = parseTagsParam(tagsParam ?? tag);
  const sortKey = toSortKey(sort);
  const viewMode = toViewMode(view);
  const gridCols = toGridCols(cols);

  // タグのチップは常に全件から作る。表示する用語は検索とタグで絞り込み、並び替える。
  const all = await termRepository.list();
  const tags = collectTags(all);
  let terms = query ? await termRepository.search(query) : all;
  if (activeTags.length > 0) terms = filterByTags(terms, activeTags);
  terms = sortTerms(terms, sortKey);

  const filtering = Boolean(query || activeTags.length > 0);

  // ツールバー・タグ・検索が互いの条件を引き継げるよう、今の条件をまとめて渡す。
  // 既定値（新しい順・グリッド）はURLに入れないので undefined にしておく。
  const current = {
    q: query || undefined,
    tags: activeTags.length > 0 ? activeTags.join(",") : undefined,
    sort: sortKey === "new" ? undefined : sortKey,
    view: viewMode === "grid" ? undefined : viewMode,
    cols: gridCols === DEFAULT_GRID_COLS ? undefined : String(gridCols),
  };

  // 太鼓UI（縦／横の積層）に渡す軽い形に変換する。日付や「新着」はここ（サーバー）で決める。
  const now = Date.now();
  const plates: PlateTerm[] = terms.map((t) => ({
    id: t.id,
    word: t.word,
    description: t.description,
    tags: t.tags,
    imageUrl: t.imageUrl,
    verified: Boolean(t.verifiedBy),
    likeCount: t.likedBy.length,
    createdBy: t.createdBy,
    dateLabel: t.createdAt
      ? new Date(t.createdAt).toLocaleDateString("ja-JP")
      : "",
    isNew: isRecentlyAdded(t.createdAt, now),
  }));

  return (
    <div className="flex animate-fade-in flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">用語一覧</h1>
        <p className="text-sm text-muted-foreground">
          チーム3人で共有している「IT用語集」です。全{all.length}件。
        </p>
      </header>

      <SearchBar
        defaultQuery={query}
        terms={all.map((t) => ({ id: t.id, word: t.word, tags: t.tags }))}
        hidden={{
          tags: current.tags,
          sort: current.sort,
          view: current.view,
          cols: current.cols,
        }}
      />

      <TagFilter tags={tags} activeTags={activeTags} current={current} />

      {all.length > 0 && <TermsToolbar current={current} />}

      {filtering && terms.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {query && <>「{query}」</>}
          {activeTags.length > 0 && <>タグ「{activeTags.join("・")}」</>}
          の結果: {terms.length}件
        </p>
      )}

      {terms.length === 0 ? (
        all.length === 0 ? (
          <EmptyState
            icon={<BookIcon className="h-6 w-6" />}
            title="まだ用語がありません"
            description="新しく覚えた専門用語を登録すると、AIが比喩を使わない説明・関連ワード・イラストを自動で作ります。"
            action={
              <Link
                href="/terms/new"
                className={buttonClasses({ variant: "primary" })}
              >
                <PlusIcon className="h-4 w-4" />
                最初の用語を登録する
              </Link>
            }
          />
        ) : (
          <EmptyState
            icon={<SearchIcon className="h-6 w-6" />}
            title="該当する用語がありません"
            description={
              query
                ? `「${query}」に一致する用語は見つかりませんでした。別の言葉で検索してみてください。`
                : `タグ「${activeTags.join("・")}」の用語は見つかりませんでした。`
            }
            action={
              <Link
                href={"/" + buildQuery({ sort: current.sort, view: current.view })}
                className={buttonClasses({ variant: "outline" })}
              >
                すべての用語を見る
              </Link>
            }
          />
        )
      ) : viewMode === "grid" ? (
        <div className={`grid gap-4 ${GRID_COLS_CLASS[gridCols]}`}>
          {terms.map((t) => (
            <TermCard key={t.id} term={t} />
          ))}
        </div>
      ) : (
        <TaikoSelector
          terms={plates}
          orientation={viewMode === "hstack" ? "horizontal" : "vertical"}
        />
      )}
    </div>
  );
}
