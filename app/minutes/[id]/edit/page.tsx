// 議事録の編集ページ（タイトル・本文を直す）。

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { minutesRepository } from "@/lib/store";
import { cn } from "@/lib/cn";
import { MinutesEditForm } from "@/components/MinutesEditForm";
import { buttonClasses } from "@/components/ui/Button";
import { ArrowLeftIcon } from "@/components/ui/icons";

export default async function EditMinutePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const minute = await minutesRepository.get(id);
  if (!minute) notFound();

  return (
    <div className="mx-auto flex max-w-2xl animate-fade-in flex-col gap-6">
      <div>
        <Link
          href={`/minutes/${minute.id}`}
          className={cn(
            buttonClasses({ variant: "ghost", size: "sm" }),
            "-ml-2 text-muted-foreground",
          )}
        >
          <ArrowLeftIcon className="h-4 w-4" />
          議事録へ戻る
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">議事録を編集</h1>
      </div>

      <MinutesEditForm minute={minute} />
    </div>
  );
}
