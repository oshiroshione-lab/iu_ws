// トップページ：用語の一覧・検索・タグ絞り込み（F-05 / F-06）。

import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { termRepository } from "@/lib/store";
import { collectTags, filterByTag } from "@/lib/terms";
import { TermCard } from "@/components/TermCard";
import { SearchBar } from "@/components/SearchBar";
import { TagFilter } from "@/components/TagFilter";
import { EmptyState } from "@/components/ui/EmptyState";
import { buttonClasses } from "@/components/ui/Button";
import { BookIcon, PlusIcon, SearchIcon } from "@/components/ui/icons";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string }>;
}) {
  await requireUser();
  const { q, tag } = await searchParams;
  const query = (q ?? "").trim();
  const activeTag = (tag ?? "").trim();

  // タグのチップは常に全件から作る。表示する用語は検索とタグで絞り込む。
  const all = await termRepository.list();
  const tags = collectTags(all);
  let terms = query ? await termRepository.search(query) : all;
  if (activeTag) terms = filterByTag(terms, activeTag);

  const filtering = Boolean(query || activeTag);

  return (
    <div className="flex animate-fade-in flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">用語一覧</h1>
        <p className="text-sm text-muted-foreground">
          チーム3人で共有している「私たちの辞書」です。全{all.length}件。
        </p>
      </header>

      <SearchBar defaultQuery={query} />

      <TagFilter tags={tags} activeTag={activeTag || undefined} />

      {filtering && terms.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {query && <>「{query}」</>}
          {activeTag && <>タグ「{activeTag}」</>}
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
                : `タグ「${activeTag}」の用語は見つかりませんでした。`
            }
            action={
              <Link href="/" className={buttonClasses({ variant: "outline" })}>
                すべての用語を見る
              </Link>
            }
          />
        )
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {terms.map((t) => (
            <TermCard key={t.id} term={t} />
          ))}
        </div>
      )}
    </div>
  );
}
