// ログインページ（仮）。

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ALLOWED_MEMBERS, ACCESS_CODE } from "@/lib/config";
import { LoginForm } from "@/components/LoginForm";
import { Card } from "@/components/ui/Card";
import { BookIcon } from "@/components/ui/icons";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  // メンバー名も合言葉も未設定なら「だれでも入れる開発モード」
  const devMode = ALLOWED_MEMBERS.length === 0 && ACCESS_CODE === "";

  return (
    <div className="mx-auto flex max-w-sm animate-fade-in flex-col gap-6 py-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <BookIcon className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">私たちの辞書</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            チーム3人だけが使える辞書です。
          </p>
        </div>
      </div>

      <Card className="p-6">
        <LoginForm />
      </Card>

      {devMode && (
        <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          （開発モード）メンバー名・合言葉が未設定のため、いまはどんな名前でも入れます。
          本番では <code>.env.local</code> の <code>ALLOWED_MEMBERS</code> と{" "}
          <code>ACCESS_CODE</code> を設定してください。
        </p>
      )}
    </div>
  );
}
