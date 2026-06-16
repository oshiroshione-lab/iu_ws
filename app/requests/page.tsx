// 用語リクエスト一覧（ナレッジギャップ）。
// 「この用語を知りたい」をためておき、誰かが空き時間に登録する。
// 各リクエストから「登録する」で登録ページへ（用語名が入った状態で開く）。

import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { requestRepository } from "@/lib/store";
import { deleteRequestAction } from "@/app/actions";
import { RequestForm } from "@/components/RequestForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";
import { buttonClasses } from "@/components/ui/Button";
import { HelpCircleIcon, PlusIcon } from "@/components/ui/icons";

export default async function RequestsPage() {
  await requireUser();
  const requests = await requestRepository.list();

  return (
    <div className="flex animate-fade-in flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">用語リクエスト</h1>
        <p className="text-sm text-muted-foreground">
          「これ知りたい」をためておく場所です。誰かが登録すると、ここから自動で消えます。全{requests.length}件。
        </p>
      </header>

      <RequestForm />

      {requests.length === 0 ? (
        <EmptyState
          icon={<HelpCircleIcon className="h-6 w-6" />}
          title="リクエストはまだありません"
          description="意味が分からなかった用語を上のフォームから追加すると、チームの誰かが登録してくれます。"
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {requests.map((r) => {
            const date = r.createdAt
              ? new Date(r.createdAt).toLocaleDateString("ja-JP")
              : "";
            return (
              <li key={r.id}>
                <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold tracking-tight">{r.word}</span>
                    {r.note && (
                      <span className="text-sm text-muted-foreground">{r.note}</span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {r.createdBy}
                      {r.createdBy && date && " ・ "}
                      {date} にリクエスト
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/terms/new?word=${encodeURIComponent(r.word)}`}
                      className={buttonClasses({ variant: "primary", size: "sm" })}
                    >
                      <PlusIcon className="h-4 w-4" />
                      登録する
                    </Link>
                    <form action={deleteRequestAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <button
                        type="submit"
                        className="text-sm text-muted-foreground hover:text-destructive hover:underline"
                      >
                        消す
                      </button>
                    </form>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
