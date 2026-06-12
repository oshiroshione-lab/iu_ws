// 一覧に並べる用語カード（F-05）。クリックで詳細ページへ。

import Link from "next/link";
import type { Term } from "@/lib/types";

export function TermCard({ term }: { term: Term }) {
  return (
    <Link
      href={`/terms/${term.id}`}
      className="group flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-4 transition hover:border-blue-400 hover:shadow-sm"
    >
      {term.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={term.imageUrl}
          alt={`${term.word}のイラスト`}
          className="h-32 w-full rounded-md object-cover"
        />
      ) : (
        <div className="flex h-32 w-full items-center justify-center rounded-md bg-gray-100 text-sm text-gray-400">
          {term.imageStatus === "failed" ? "画像なし" : "🖼"}
        </div>
      )}
      <h3 className="font-bold text-gray-900 group-hover:text-blue-700">{term.word}</h3>
      <p className="line-clamp-2 text-sm text-gray-600">{term.description}</p>
    </Link>
  );
}
