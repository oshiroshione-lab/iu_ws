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
