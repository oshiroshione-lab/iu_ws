// ログイン（認証）の仮実装。
//
// 暫定対応: いまは「名前＋合言葉」を確認して、合っていればクッキーに名前を保存する
//   だけの簡単な入口。DBや本格的な認証（Supabase Auth 等）が決まるまでのつなぎ。
//   ※ クッキーに署名はしていないので、強いセキュリティではない。社内3人用の
//     最小限のゲートとして使い、本番前に Supabase Auth などへ差し替える（TODO）。

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ALLOWED_MEMBERS, ACCESS_CODE } from "@/lib/config";

const COOKIE_NAME = "iukw_user";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

/** いまログインしている人の名前を返す。未ログインなら null */
export async function getCurrentUser(): Promise<string | null> {
  const store = await cookies();
  const name = store.get(COOKIE_NAME)?.value?.trim();
  return name ? name : null;
}

/** ログイン必須のページで使う。未ログインなら /login へ飛ばす */
export async function requireUser(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export type LoginResult = { ok: true } | { ok: false; message: string };

/**
 * ログインを試みる。成功ならクッキーに名前を保存して { ok: true }。
 * Server Action / Route Handler の中からのみ呼べる（クッキーを書き込むため）。
 */
export async function tryLogin(name: string, code: string): Promise<LoginResult> {
  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, message: "名前を入力してください" };
  }
  // メンバー名が設定されていれば、その3人だけに限定する
  if (ALLOWED_MEMBERS.length > 0 && !ALLOWED_MEMBERS.includes(trimmed)) {
    return { ok: false, message: "このアプリは登録されたメンバーだけが使えます" };
  }
  // 合言葉が設定されていれば、一致を確認する
  if (ACCESS_CODE && code.trim() !== ACCESS_CODE) {
    return { ok: false, message: "合言葉がちがいます" };
  }
  const store = await cookies();
  store.set(COOKIE_NAME, trimmed, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: THIRTY_DAYS,
  });
  return { ok: true };
}

/** ログアウト（クッキーを消す） */
export async function logout(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
