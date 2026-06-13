"use server";

// 画面からの「データを変える操作」をまとめた Server Action 群。
// ブラウザのフォームから直接呼ばれる。中で必ずログイン確認をする。

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser, logout } from "@/lib/auth";
import { termRepository } from "@/lib/store";
import {
  researchTerm,
  generateIllustrationBase64,
  extractTermsFromText,
} from "@/lib/ai";
import { saveGeneratedImage, deleteGeneratedImage } from "@/lib/images";
import {
  validateWord,
  validateDescription,
  MINUTES_MAX_LENGTH,
  EXTRACT_MAX_TERMS,
} from "@/lib/validation";
import { parseTags } from "@/lib/tags";
import { buildWordIndex } from "@/lib/terms";
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
    tags: research.tags,
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

  // タグはカンマ・読点・改行区切りで入力してもらう
  const tags = parseTags(String(formData.get("tags") ?? ""));

  const updated = await termRepository.update(id, {
    word: wordCheck.value,
    description: descCheck.value,
    relatedWords,
    tags,
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

// ============================================================
// 議事録（など長文）から専門用語を自動抽出して、まとめて辞書に登録する。
// 流れ: 貼り付けた文章 → AIが用語候補を抽出 → 1語ずつ説明・関連ワード・タグを作って登録。
// コスト配慮: 1回で作りすぎないよう件数に上限を設け、イラストはここでは作らない
//   （重く高くつくため。各用語の詳細ページから後で作れる）。
//   上限値は lib/validation.ts に置いている（"use server" ファイルは関数しか公開できないため）。
// ============================================================

export type ExtractState = {
  error?: string;
  result?: {
    /** 新しく登録できた用語 */
    added: string[];
    /** すでに辞書にあったので飛ばした用語 */
    skipped: string[];
    /** AI処理に失敗した用語 */
    failed: string[];
    /** 上限を超えて今回は見送った件数 */
    overflow: number;
  };
};

export async function extractAndCreateTermsAction(
  _prev: ExtractState,
  formData: FormData,
): Promise<ExtractState> {
  const user = await requireUser();

  const text = String(formData.get("text") ?? "").trim();
  if (!text) {
    return { error: "議事録などの文章を貼り付けてください" };
  }
  if (text.length > MINUTES_MAX_LENGTH) {
    return {
      error: `文章は${MINUTES_MAX_LENGTH}文字以内にしてください（今: ${text.length}文字）。長い場合は分けて貼り付けてください。`,
    };
  }

  // 1) 文章から用語候補を抜き出す
  let candidates: string[];
  try {
    candidates = await extractTermsFromText(text);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "AIの処理に失敗しました" };
  }

  // 2) すでにある用語は飛ばす（重複登録を防ぐ）。
  //    seen には「既存の用語名」を入れておき、登録するたびに足して、同じ文章内の重複も防ぐ。
  const seen = new Set(buildWordIndex(await termRepository.list()).keys());
  const added: string[] = [];
  const skipped: string[] = [];
  const failed: string[] = [];
  let overflow = 0;

  for (const raw of candidates) {
    const check = validateWord(raw);
    if (!check.ok) continue;
    const word = check.value;
    const key = word.toLowerCase();

    if (seen.has(key)) {
      skipped.push(word);
      continue;
    }
    if (added.length >= EXTRACT_MAX_TERMS) {
      overflow += 1;
      continue;
    }

    // 3) 1語ずつ説明・関連ワード・タグを作って登録（イラストは作らない）
    try {
      const research = await researchTerm(word);
      await termRepository.create({
        word,
        description: research.description,
        relatedWords: research.relatedWords,
        tags: research.tags,
        imageUrl: null,
        imageStatus: "none",
        createdBy: user,
      });
      seen.add(key);
      added.push(word);
    } catch {
      failed.push(word);
    }
  }

  revalidatePath("/");
  return { result: { added, skipped, failed, overflow } };
}

/** ログアウト */
export async function logoutAction(): Promise<void> {
  await logout();
  redirect("/login");
}
