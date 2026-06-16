"use server";

// 画面からの「データを変える操作」をまとめた Server Action 群。
// ブラウザのフォームから直接呼ばれる。中で必ずログイン確認をする。

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { requireUser, logout } from "@/lib/auth";
import { hasOpenAIKey } from "@/lib/config";
import { termRepository, requestRepository } from "@/lib/store";
import {
  researchTerm,
  generateIllustrationBase64,
  extractTermsFromText,
  suggestItTerms,
} from "@/lib/ai";
import { saveGeneratedImage, deleteGeneratedImage } from "@/lib/images";
import {
  validateWord,
  validateDescription,
  MINUTES_MAX_LENGTH,
  EXTRACT_MAX_TERMS,
  REQUEST_NOTE_MAX_LENGTH,
} from "@/lib/validation";
import { sanitizeTags } from "@/lib/tags";
import { buildWordIndex, normalizeForSearch } from "@/lib/terms";
import type { ImageStatus } from "@/lib/types";

/** フォームに返す状態（エラーメッセージを持つ） */
export type FormState = { error?: string };

/**
 * AIが整えた「正式な表記」(corrected) を採用するか決める。
 * 大文字小文字・記号・スペースなど“同じ用語の書き方”の違いのときだけ採用し、
 * 別の語へのすり替え（翻訳・言い換え）は防ぐ（normalizeForSearch で同一判定）。
 */
function canonicalizeWord(input: string, corrected: string): string {
  const c = corrected.trim();
  if (
    c &&
    normalizeForSearch(c) === normalizeForSearch(input) &&
    validateWord(c).ok
  ) {
    return c;
  }
  return input;
}

/**
 * 用語の新規登録（F-01）。
 * 1) 入力チェック → 2) AIで説明文＋関連ワード生成（F-02/F-04）→ 3) 保存して詳細へ移動。
 * イラスト（F-03）は時間がかかるので「裏で」作る（after）。ユーザーは待たずに一覧へ戻れる。
 * 完成したら imageStatus を更新し、画面側の通知（IllustrationNotifier）が知らせる。
 */
export async function createTermAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();

  const check = validateWord(String(formData.get("word") ?? ""));
  if (!check.ok) return { error: check.message };

  // 重複登録の防止：同じ用語（表記ゆれを無視して一致）がすでにあれば、
  // AIを呼ばずにその用語ページへ案内する（料金の無駄づかいも防ぐ）。
  const normalized = normalizeForSearch(check.value);
  const duplicate = (await termRepository.list()).find(
    (t) => normalizeForSearch(t.word) === normalized,
  );
  if (duplicate) redirect(`/terms/${duplicate.id}`);

  // タグは固定リストから「1つだけ」選んでもらう（AIには作らせない）。念のため最大1個に絞る。
  const tags = sanitizeTags(formData.getAll("tags").map(String)).slice(0, 1);

  // 説明文・関連ワードはAI必須。失敗したら登録せずにエラーを返す。
  let research;
  try {
    research = await researchTerm(check.value);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "AIの処理に失敗しました" };
  }

  // 用語名は、AIが整えた正式な表記（大文字小文字など）を使う（別語へのすり替えは防ぐ）。
  const word = canonicalizeWord(check.value, research.word);

  // 先にテキストを保存。イラストはこれから裏で作るので "generating"（キーが無ければ作らないので "none"）。
  const term = await termRepository.create({
    word,
    description: research.description,
    relatedWords: research.relatedWords,
    tags,
    imageUrl: null,
    imageStatus: hasOpenAIKey ? "generating" : "none",
    createdBy: user,
  });

  // 同じ用語のリクエスト（「知りたい」待ち行列）があれば、解決済みとして消す。
  const pendingRequests = await requestRepository.list();
  for (const r of pendingRequests) {
    if (normalizeForSearch(r.word) === normalized) {
      await requestRepository.delete(r.id);
    }
  }

  // イラスト生成は「おまけ」。レスポンス（リダイレクト）を返した後に裏で実行する。
  // 失敗しても登録は成功扱い。完成/失敗で imageStatus を更新し、一覧・詳細を再検証する。
  if (hasOpenAIKey) {
    after(async () => {
      let imageUrl: string | null = null;
      let imageStatus: ImageStatus = "failed";
      try {
        const base64 = await generateIllustrationBase64(
          term.word,
          term.description,
        );
        if (base64) {
          imageUrl = await saveGeneratedImage(term.id, base64);
          imageStatus = "ok";
        }
      } catch (e) {
        console.error("[actions] 裏でのイラスト生成に失敗:", e);
      }
      await termRepository.update(term.id, { imageUrl, imageStatus });
      revalidatePath("/");
      revalidatePath(`/terms/${term.id}`);
    });
  }

  revalidatePath("/");
  redirect(`/terms/${term.id}`);
}

/** イラストの進み具合の通知に使う返り値。 */
export type IllustrationPoll = {
  /** いま裏で生成中の用語 */
  generating: { id: string; word: string }[];
  /** 見張っていた用語のうち、生成が終わったもの */
  finished: { id: string; word: string; status: "ok" | "failed" }[];
};

/**
 * 画面側の通知コンポーネントから定期的に呼ばれる。
 * ・いま「生成中」の用語一覧を返す（新しく始まったものを見つけるため）。
 * ・watchedIds のうち「生成中でなくなった（=完成/失敗した）」ものを返す。
 */
export async function pollIllustrationsAction(
  watchedIds: string[],
): Promise<IllustrationPoll> {
  await requireUser();
  const all = await termRepository.list();
  const generating = all
    .filter((t) => t.imageStatus === "generating")
    .map((t) => ({ id: t.id, word: t.word }));
  const watched = new Set(watchedIds);
  const finished = all
    .filter((t) => watched.has(t.id) && t.imageStatus !== "generating")
    .map((t) => ({
      id: t.id,
      word: t.word,
      status: t.imageStatus === "ok" ? ("ok" as const) : ("failed" as const),
    }));
  return { generating, finished };
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

  // タグは固定リストから「1つだけ」選んでもらう（念のため最大1個に絞る）
  const tags = sanitizeTags(formData.getAll("tags").map(String)).slice(0, 1);

  // 内容を直したら「確認済み」は外す（また誰かが確認するまで未確認に戻す）。
  const updated = await termRepository.update(id, {
    word: wordCheck.value,
    description: descCheck.value,
    relatedWords,
    tags,
    verifiedBy: null,
    verifiedAt: null,
  });
  if (!updated) return { error: "対象の用語が見つかりませんでした" };

  revalidatePath("/");
  revalidatePath(`/terms/${id}`);
  redirect(`/terms/${id}`);
}

/**
 * 用語を「確認した」状態にする（AI生成の説明の正しさを、人が読んで担保する印）。
 * 誰が・いつ確認したかを残す。
 */
export async function verifyTermAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  await termRepository.update(id, {
    verifiedBy: user,
    verifiedAt: new Date().toISOString(),
  });
  revalidatePath("/");
  revalidatePath(`/terms/${id}`);
  redirect(`/terms/${id}`);
}

/** 「確認済み」を取り消して未確認に戻す。 */
export async function unverifyTermAction(formData: FormData): Promise<void> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  await termRepository.update(id, { verifiedBy: null, verifiedAt: null });
  revalidatePath("/");
  revalidatePath(`/terms/${id}`);
  redirect(`/terms/${id}`);
}

/** いいねの ON/OFF を切り替える（自分の名前を足す/外す）。 */
export async function toggleLikeAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const term = await termRepository.get(id);
  if (!term) redirect("/");
  const liked = term.likedBy.includes(user);
  const likedBy = liked
    ? term.likedBy.filter((u) => u !== user)
    : [...term.likedBy, user];
  await termRepository.update(id, { likedBy });
  revalidatePath("/");
  revalidatePath(`/terms/${id}`);
  redirect(`/terms/${id}`);
}

/** コメントを追加する（AIの説明を人の手で補足・修正提案する）。 */
export async function addCommentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return { error: "コメントを入力してください" };
  if (text.length > 1000) {
    return { error: "コメントは1000文字以内にしてください" };
  }
  const term = await termRepository.get(id);
  if (!term) return { error: "対象の用語が見つかりませんでした" };

  const comment = { id: randomUUID(), by: user, text, at: new Date().toISOString() };
  await termRepository.update(id, { comments: [...term.comments, comment] });
  revalidatePath(`/terms/${id}`);
  return {};
}

/** コメントを削除する（自分が書いたコメントを消す想定）。 */
export async function deleteCommentAction(formData: FormData): Promise<void> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const commentId = String(formData.get("commentId") ?? "");
  const term = await termRepository.get(id);
  if (!term) redirect("/");
  await termRepository.update(id, {
    comments: term.comments.filter((c) => c.id !== commentId),
  });
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
        word: canonicalizeWord(word, research.word), // 正式な表記に整える
        description: research.description,
        relatedWords: research.relatedWords,
        tags: [], // タグは後から固定リストで付けられる（まとめ登録では付けない）
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

/**
 * 登録フォームのサジェスト用：入力中の文字列から、登録候補になりそうなIT用語名をAIで提案する。
 * best-effort（失敗・未設定なら空配列）。入力が止まったときだけ・キャッシュ付きで呼ばれる想定。
 */
export async function suggestTermNamesAction(query: string): Promise<string[]> {
  await requireUser();
  return suggestItTerms(query);
}

// ============================================================
// 用語リクエスト（「この用語を知りたい」待ち行列）。
// 登録する人と知りたい人は分かれるので、知りたい語をためておき、空き時間に登録する。
// 同じ用語を登録すると、上の createTermAction が対応するリクエストを自動で消す。
// ============================================================

export type RequestFormState = { error?: string };

/** 用語リクエストを追加する。 */
export async function createRequestAction(
  _prev: RequestFormState,
  formData: FormData,
): Promise<RequestFormState> {
  const user = await requireUser();

  const check = validateWord(String(formData.get("word") ?? ""));
  if (!check.ok) return { error: check.message };

  const note = String(formData.get("note") ?? "")
    .trim()
    .slice(0, REQUEST_NOTE_MAX_LENGTH);

  // すでに辞書にある用語はリクエスト不要なので、その用語ページへ案内する。
  const normalized = normalizeForSearch(check.value);
  const existing = (await termRepository.list()).find(
    (t) => normalizeForSearch(t.word) === normalized,
  );
  if (existing) redirect(`/terms/${existing.id}`);

  await requestRepository.create({ word: check.value, note, createdBy: user });
  revalidatePath("/requests");
  redirect("/requests");
}

/** 用語リクエストを消す（解決済み・取り消し）。 */
export async function deleteRequestAction(formData: FormData): Promise<void> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  await requestRepository.delete(id);
  revalidatePath("/requests");
  redirect("/requests");
}

/** ログアウト */
export async function logoutAction(): Promise<void> {
  await logout();
  redirect("/login");
}
