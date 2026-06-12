// 用語の新規登録ページ（F-01）。
// 関連ワードから飛んできた場合は ?word=... で用語名を最初から入れておく（F-08）。

import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { hasOpenAIKey } from "@/lib/config";
import { TermRegisterForm } from "@/components/TermRegisterForm";

export default async function NewTermPage({
  searchParams,
}: {
  searchParams: Promise<{ word?: string }>;
}) {
  await requireUser();
  const { word } = await searchParams;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div>
        <Link href="/" className="text-sm text-gray-500 hover:underline">
          ← 一覧へ戻る
        </Link>
        <h1 className="mt-2 text-2xl font-bold">用語を登録</h1>
      </div>

      {!hasOpenAIKey && (
        <p className="rounded-md bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
          ⚠ OpenAIのAPIキーが未設定です。<code>.env.local</code> の{" "}
          <code>OPENAI_API_KEY</code> に鍵を入れて、開発サーバーを再起動してください。
        </p>
      )}

      <TermRegisterForm defaultWord={word ?? ""} />
    </div>
  );
}
