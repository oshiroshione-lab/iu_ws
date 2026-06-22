"use server";

// 議事録（音声→文字起こし→保存）に関する Server Action 群。
// 中で必ずログイン確認をする。AI（文字起こし）は lib/ai.ts に集約。

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser, actorFrom } from "@/lib/auth";
import { minutesRepository } from "@/lib/store";
import {
  transcribeAudio,
  createRealtimeTranscriptionSecret,
  organizeMinute,
} from "@/lib/ai";
import {
  validateMinuteTitle,
  validateMinuteBody,
  clipText,
  MINUTE_SECTION_MAX_LENGTH,
  MINUTE_ATTENDEES_MAX_LENGTH,
} from "@/lib/validation";
import type { NewMinuteData } from "@/lib/types";

/**
 * フォームから議事録の任意項目（会議日・参加者・議題・決定事項・ToDo）を読み取って整える。
 * タイトル・本文は別途バリデーションするので、ここでは扱わない。
 */
function readMinuteFields(formData: FormData) {
  return {
    meetingDate: clipText(String(formData.get("meetingDate") ?? ""), 10),
    attendees: clipText(
      String(formData.get("attendees") ?? ""),
      MINUTE_ATTENDEES_MAX_LENGTH,
    ),
    summary: clipText(String(formData.get("summary") ?? ""), MINUTE_SECTION_MAX_LENGTH),
    agenda: clipText(String(formData.get("agenda") ?? ""), MINUTE_SECTION_MAX_LENGTH),
    decisions: clipText(
      String(formData.get("decisions") ?? ""),
      MINUTE_SECTION_MAX_LENGTH,
    ),
    todos: clipText(String(formData.get("todos") ?? ""), MINUTE_SECTION_MAX_LENGTH),
  } satisfies Partial<NewMinuteData>;
}

/** 文字起こしの上限（OpenAI の制限に合わせる。25MB） */
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

export type TranscribeState = { text?: string; error?: string };

/**
 * 録音/アップロードした音声を文字起こしして返す（保存はしない）。
 * 画面の「文字起こしする」ボタンから直接呼ばれる。
 */
export async function transcribeAudioAction(
  formData: FormData,
): Promise<TranscribeState> {
  await requireUser();

  const audio = formData.get("audio");
  if (!(audio instanceof File) || audio.size === 0) {
    return { error: "音声が見つかりません。録音するか、音声ファイルを選んでください。" };
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return {
      error:
        "音声が大きすぎます（25MBまで）。短く区切って文字起こししてください。",
    };
  }

  try {
    const text = await transcribeAudio(audio);
    if (!text) {
      return { error: "音声から文字を聞き取れませんでした。もう一度お試しください。" };
    }
    return { text };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "文字起こしに失敗しました" };
  }
}

export type RealtimeTokenState = { value?: string; error?: string };

/**
 * リアルタイム文字起こし用の一時トークンを発行して返す。
 * 画面（ブラウザ）はこのトークンで OpenAI に直接つなぐ（本物の鍵はサーバー側のまま）。
 */
export async function createTranscriptionTokenAction(): Promise<RealtimeTokenState> {
  await requireUser();
  try {
    const value = await createRealtimeTranscriptionSecret();
    return { value };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "リアルタイム接続の準備に失敗しました",
    };
  }
}

export type MinuteFormState = { error?: string };

/** 議事録を新規保存して、その詳細ページへ移動する。 */
export async function createMinuteAction(
  _prev: MinuteFormState,
  formData: FormData,
): Promise<MinuteFormState> {
  const user = actorFrom(formData);

  const titleCheck = validateMinuteTitle(String(formData.get("title") ?? ""));
  if (!titleCheck.ok) return { error: titleCheck.message };
  const bodyCheck = validateMinuteBody(String(formData.get("body") ?? ""));
  if (!bodyCheck.ok) return { error: bodyCheck.message };

  const minute = await minutesRepository.create({
    title: titleCheck.value,
    body: bodyCheck.value,
    ...readMinuteFields(formData),
    createdBy: user,
  });

  revalidatePath("/minutes");
  redirect(`/minutes/${minute.id}`);
}

/** 議事録の編集（タイトル・本文を直す）。 */
export async function updateMinuteAction(
  _prev: MinuteFormState,
  formData: FormData,
): Promise<MinuteFormState> {
  await requireUser();

  const id = String(formData.get("id") ?? "");
  const titleCheck = validateMinuteTitle(String(formData.get("title") ?? ""));
  if (!titleCheck.ok) return { error: titleCheck.message };
  const bodyCheck = validateMinuteBody(String(formData.get("body") ?? ""));
  if (!bodyCheck.ok) return { error: bodyCheck.message };

  const updated = await minutesRepository.update(id, {
    title: titleCheck.value,
    body: bodyCheck.value,
    ...readMinuteFields(formData),
  });
  if (!updated) return { error: "対象の議事録が見つかりませんでした" };

  revalidatePath("/minutes");
  revalidatePath(`/minutes/${id}`);
  redirect(`/minutes/${id}`);
}

export type OrganizeState = { error?: string };

/**
 * 「AIで整える」：本文（文字起こし）から要約・決定事項・ToDo を作り、議事録に保存する。
 * 要約・決定事項・ToDo の3つだけを置き換える（会議日・参加者・議題・本文はそのまま）。
 */
export async function organizeMinuteAction(
  _prev: OrganizeState,
  formData: FormData,
): Promise<OrganizeState> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const minute = await minutesRepository.get(id);
  if (!minute) return { error: "対象の議事録が見つかりませんでした" };
  if (!minute.body.trim()) {
    return { error: "本文が空です。先に録音/文字起こしか、本文の入力をしてください。" };
  }

  let result;
  try {
    result = await organizeMinute(minute.body);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "AIの整理に失敗しました" };
  }

  await minutesRepository.update(id, {
    summary: result.summary,
    decisions: result.decisions.join("\n"),
    todos: result.todos.join("\n"),
  });
  revalidatePath("/minutes");
  revalidatePath(`/minutes/${id}`);
  redirect(`/minutes/${id}`);
}

/** 議事録の削除。 */
export async function deleteMinuteAction(formData: FormData): Promise<void> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  await minutesRepository.delete(id);
  revalidatePath("/minutes");
  redirect("/minutes");
}
