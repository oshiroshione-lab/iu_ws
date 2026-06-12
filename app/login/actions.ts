"use server";

import { redirect } from "next/navigation";
import { tryLogin } from "@/lib/auth";

export type LoginState = { error?: string };

/** ログインフォームから呼ばれる。成功したらトップへ移動する */
export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const name = String(formData.get("name") ?? "");
  const code = String(formData.get("code") ?? "");
  const result = await tryLogin(name, code);
  if (!result.ok) return { error: result.message };
  redirect("/");
}
