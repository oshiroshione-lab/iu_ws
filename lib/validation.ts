// 入力チェック（バリデーション）をまとめる場所。
// ※ 文字数の上限は要件定義書では「TBD（未決定）」。下の値は暫定なので、
//   正式に決まったらここを直せば全体に反映される。

/** 用語名の最大文字数（暫定） */
export const WORD_MAX_LENGTH = 100;

/** 説明文の最大文字数（暫定。AIが作る文章の長さの上限） */
export const DESCRIPTION_MAX_LENGTH = 4000;

/** 議事録テキストの最大文字数（暫定。長すぎる入力でAI料金がふくらむのを防ぐ） */
export const MINUTES_MAX_LENGTH = 8000;

/** 議事録から1回で登録する用語の最大件数（暫定。コストと待ち時間の上限） */
export const EXTRACT_MAX_TERMS = 12;

/** 用語リクエストのメモの最大文字数（暫定） */
export const REQUEST_NOTE_MAX_LENGTH = 200;

export type ValidationResult =
  | { ok: true; value: string }
  | { ok: false; message: string };

/** 用語名のチェック。空・長すぎを弾く */
export function validateWord(raw: string): ValidationResult {
  const value = raw.trim();
  if (value.length === 0) {
    return { ok: false, message: "用語名を入力してください" };
  }
  if (value.length > WORD_MAX_LENGTH) {
    return {
      ok: false,
      message: `用語名は${WORD_MAX_LENGTH}文字以内で入力してください（今: ${value.length}文字）`,
    };
  }
  return { ok: true, value };
}

/** 議事録タイトルの最大文字数（暫定） */
export const MINUTE_TITLE_MAX_LENGTH = 200;

/** 議事録本文の最大文字数（暫定。文字起こしは長くなりうるので説明文より大きめ） */
export const MINUTE_BODY_MAX_LENGTH = 20000;

/** 議事録の各セクション（議題・決定事項・ToDo）の最大文字数（暫定） */
export const MINUTE_SECTION_MAX_LENGTH = 4000;

/** 参加者欄の最大文字数（暫定） */
export const MINUTE_ATTENDEES_MAX_LENGTH = 500;

/**
 * 任意の自由記述欄を安全に整える：前後の空白を取り、上限文字数で切る。
 * 議事録の任意項目（参加者・議題・決定事項・ToDo）に使う。
 */
export function clipText(raw: string, max: number): string {
  return raw.trim().slice(0, max);
}

/** 議事録タイトルのチェック。空・長すぎを弾く */
export function validateMinuteTitle(raw: string): ValidationResult {
  const value = raw.trim();
  if (value.length === 0) {
    return { ok: false, message: "タイトルを入力してください" };
  }
  if (value.length > MINUTE_TITLE_MAX_LENGTH) {
    return {
      ok: false,
      message: `タイトルは${MINUTE_TITLE_MAX_LENGTH}文字以内にしてください`,
    };
  }
  return { ok: true, value };
}

/** 議事録本文のチェック。空・長すぎを弾く */
export function validateMinuteBody(raw: string): ValidationResult {
  const value = raw.trim();
  if (value.length === 0) {
    return {
      ok: false,
      message: "本文が空です。先に録音して文字起こしするか、文章を入力してください",
    };
  }
  if (value.length > MINUTE_BODY_MAX_LENGTH) {
    return {
      ok: false,
      message: `本文は${MINUTE_BODY_MAX_LENGTH.toLocaleString()}文字以内にしてください`,
    };
  }
  return { ok: true, value };
}

/** 説明文のチェック（編集時に使う）。空・長すぎを弾く */
export function validateDescription(raw: string): ValidationResult {
  const value = raw.trim();
  if (value.length === 0) {
    return { ok: false, message: "説明文を入力してください" };
  }
  if (value.length > DESCRIPTION_MAX_LENGTH) {
    return {
      ok: false,
      message: `説明文は${DESCRIPTION_MAX_LENGTH}文字以内にしてください`,
    };
  }
  return { ok: true, value };
}
