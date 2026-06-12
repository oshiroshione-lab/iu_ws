// トップページ：用語の一覧と検索（F-05 / F-06）。

import { requireUser } from "@/lib/auth";
import { termRepository } from "@/lib/store";
import { TermCard } from "@/components/TermCard";
import { SearchBar } from "@/components/SearchBar";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireUser();
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const terms = query
    ? await termRepository.search(query)
    : await termRepository.list();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">用語一覧</h1>
        <p className="text-sm text-gray-500">チーム3人で共有している辞書です。</p>
      </div>

      <SearchBar defaultQuery={query} />

      {query && (
        <p className="text-sm text-gray-500">
          「{query}」の検索結果: {terms.length}件
        </p>
      )}

      {terms.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center text-gray-500">
          {query
            ? "該当する用語がありません。"
            : "まだ用語がありません。右上の「＋ 用語を登録」から最初の用語を登録してみましょう。"}
        </div>
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
