// 議事録の一覧ページ。録音から新しく作るか、過去の議事録を開ける。

import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { minutesRepository } from "@/lib/store";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { FileTextIcon, MicIcon, PlusIcon } from "@/components/ui/icons";

export default async function MinutesPage() {
  await requireUser();
  const minutes = await minutesRepository.list();

  return (
    <div className="flex animate-fade-in flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <FileTextIcon className="h-6 w-6 text-primary" />
            議事録
          </h1>
          <p className="text-sm text-muted-foreground">
            録音して文字起こしし、議事録として保存できます。全{minutes.length}件。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/terms/extract"
            className={buttonClasses({ variant: "outline", size: "sm" })}
          >
            テキストから登録
          </Link>
          <Link
            href="/minutes/new"
            className={buttonClasses({ variant: "primary", size: "sm" })}
          >
            <MicIcon className="h-4 w-4" />
            録音して作成
          </Link>
        </div>
      </header>

      {minutes.length === 0 ? (
        <EmptyState
          icon={<MicIcon className="h-6 w-6" />}
          title="まだ議事録がありません"
          description="会議を録音すると、AIが文字に起こして議事録にします。保存した議事録からは、専門用語をまとめて辞書に登録できます。"
          action={
            <Link href="/minutes/new" className={buttonClasses({ variant: "primary" })}>
              <PlusIcon className="h-4 w-4" />
              最初の議事録を作る
            </Link>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {minutes.map((m) => {
            const date = m.createdAt
              ? new Date(m.createdAt).toLocaleString("ja-JP")
              : "";
            return (
              <li key={m.id}>
                <Link href={`/minutes/${m.id}`}>
                  <Card
                    className={cn(
                      "flex flex-col gap-1 p-4 transition-all",
                      "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
                    )}
                  >
                    <h2 className="font-semibold tracking-tight">{m.title}</h2>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {m.body}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      {m.createdBy && <span>{m.createdBy}</span>}
                      {m.createdBy && date && <span aria-hidden>·</span>}
                      {date && <span>{date}</span>}
                    </div>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
