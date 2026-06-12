// ログインページ（仮）。

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ALLOWED_MEMBERS, ACCESS_CODE } from "@/lib/config";
import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  // メンバー名も合言葉も未設定なら「だれでも入れる開発モード」
  const devMode = ALLOWED_MEMBERS.length === 0 && ACCESS_CODE === "";

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">ログイン</h1>
        <p className="mt-1 text-sm text-gray-500">チーム3人だけが使える辞書です。</p>
      </div>

      <LoginForm />

      {devMode && (
        <p className="rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-500">
          （開発モード）メンバー名・合言葉が未設定のため、いまはどんな名前でも入れます。
          本番では <code>.env.local</code> の <code>ALLOWED_MEMBERS</code> と{" "}
          <code>ACCESS_CODE</code> を設定してください。
        </p>
      )}
    </div>
  );
}
