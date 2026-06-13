// タグの整え方（バリデーション）を1か所にまとめる。
//
// ・parseTags: 入力文字列（カンマ・読点・改行区切り）をタグの配列にする
// ・normalizeTags: 前後の空白を取り、重複（大文字小文字の違いも）を消し、上限までに絞る

/** タグの最大個数（暫定） */
export const TAGS_MAX = 6;
/** タグ1個の最大文字数（暫定） */
export const TAG_MAX_LENGTH = 20;

/** 重複を消し、空・長すぎを除き、上限個数までに整える */
export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of tags) {
    const value = raw.trim();
    if (!value || value.length > TAG_MAX_LENGTH) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
    if (result.length >= TAGS_MAX) break;
  }
  return result;
}

/** 「AI, 統計、機械学習」のような入力をタグ配列にする（カンマ/読点/改行で区切る） */
export function parseTags(raw: string): string[] {
  return normalizeTags(raw.split(/[,、\n]/));
}
