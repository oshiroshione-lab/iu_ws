// 用語の編集ページ（F-07）。

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { termRepository } from "@/lib/store";
import { TermEditForm } from "@/components/TermEditForm";

export default async function EditTermPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const term = await termRepository.get(id);
  if (!term) notFound();

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div>
        <Link href={`/terms/${term.id}`} className="text-sm text-gray-500 hover:underline">
          ← 詳細へ戻る
        </Link>
        <h1 className="mt-2 text-2xl font-bold">用語を編集</h1>
      </div>
      <TermEditForm term={term} />
    </div>
  );
}
