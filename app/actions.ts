"use server";

// 画面からの「データを変える操作」をまとめた Server Action 群。
// ブラウザのフォームから直接呼ばれる。中で必ずログイン確認をする。

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser, logout } from "@/lib/auth";
import { termRepository } from "@/lib/store";
import { researchTerm, generateIllustrationBase64 } from "@/lib/ai";
import { saveGeneratedImage, deleteGeneratedImage } from "@/lib/images";
import { validateWord, validateDescription } from "@/lib/validation";
import type { ImageStatus } from "@/lib/types";

/** フォームに返す状態（エラーメッセージを持つ） */
export type FormState = { error?: string };

/**
 * 用語の新規登録（F-01）。
 * 1) 入力チェック → 2) AIで説明文＋関連ワード生成（F-02/F-04）
 * → 3) 保存 → 4) イラスト生成（F-03。失敗してもテキストは残す）→ 詳細へ移動
 */
export async function createTermAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();

  const check = validateWord(String(formData.get("word") ?? ""));
  if (!check.ok) return { error: check.message };

  // 説明文・関連ワードはAI必須。失敗したら登録せずにエラーを返す。
  let research;
  try {
    research = await researchTerm(check.value);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "AIの処理に失敗しました" };
  }

  // 先にテキストを保存（イラストは後で付ける）
  const term = await termRepository.create({
    word: check.value,
    description: research.description,
    relatedWords: research.relatedWords,
    imageUrl: null,
    imageStatus: "none",
    createdBy: user,
  });

  // イラスト生成は「おまけ」。失敗しても登録は成功扱いにする。
  const base64 = await generateIllustrationBase64(check.value, research.description);
  let imageUrl: string | null = null;
  let imageStatus: ImageStatus = "failed";
  if (base64) {
    imageUrl = await saveGeneratedImage(term.id, base64);
    imageStatus = "ok";
  }
  await termRepository.update(term.id, { imageUrl, imageStatus });

  revalidatePath("/");
  redirect(`/terms/${term.id}`);
}

/** 用語の編集（F-07）。用語名・説明文・関連ワードを手で直せる */
export async function updateTermAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();

  const id = String(formData.get("id") ?? "");
  const wordCheck = validateWord(String(formData.get("word") ?? ""));
  if (!wordCheck.ok) return { error: wordCheck.message };
  const descCheck = validateDescription(String(formData.get("description") ?? ""));
  if (!descCheck.ok) return { error: descCheck.message };

  // 関連ワードは1行に1つ入力してもらう
  const relatedWords = String(formData.get("relatedWords") ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12);

  const updated = await termRepository.update(id, {
    word: wordCheck.value,
    description: descCheck.value,
    relatedWords,
  });
  if (!updated) return { error: "対象の用語が見つかりませんでした" };

  revalidatePath("/");
  revalidatePath(`/terms/${id}`);
  redirect(`/terms/${id}`);
}

/** 用語の削除（F-07）。イラストファイルも一緒に消す */
export async function deleteTermAction(formData: FormData): Promise<void> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  await deleteGeneratedImage(id);
  await termRepository.delete(id);
  revalidatePath("/");
  redirect("/");
}

/** イラストの作り直し（F-03 の「後でやり直せます」） */
export async function retryIllustrationAction(formData: FormData): Promise<void> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const term = await termRepository.get(id);
  if (!term) redirect("/");

  const base64 = await generateIllustrationBase64(term.word, term.description);
  if (base64) {
    const imageUrl = await saveGeneratedImage(term.id, base64);
    await termRepository.update(id, { imageUrl, imageStatus: "ok" });
  } else {
    await termRepository.update(id, { imageStatus: "failed" });
  }
  revalidatePath(`/terms/${id}`);
  redirect(`/terms/${id}`);
}

/** ログアウト */
export async function logoutAction(): Promise<void> {
  await logout();
  redirect("/login");
}
