// タグの整え方（バリデーション）を1か所にまとめる。
//
// タグは「AIが自由に作る」のをやめ、決まった最小限の選択肢（TAG_OPTIONS）から
// 選んでもらう方式にした。表記ゆれや増えすぎを防ぎ、絞り込みが安定する。
//
// ・TAG_OPTIONS: 選べるタグの固定リスト（ここを増減すれば全体に反映される）
// ・sanitizeTags: 受け取ったタグを、固定リストにあるものだけに整える（順序も統一）
// ・normalizeTags / parseTags: 旧・自由入力用の整え方（後方互換のため残す）

/** 選べるタグの固定リスト（最小限）。ここを編集すれば選択肢が変わる。 */
export const TAG_OPTIONS = [
  "AI",
  "Web",
  "データベース",
  "ネットワーク",
  "セキュリティ",
  "インフラ・クラウド",
  "開発・設計",
  "その他",
] as const;

export type TagOption = (typeof TAG_OPTIONS)[number];

/**
 * 受け取ったタグを「固定リストにあるものだけ」に整える（大文字小文字は無視）。
 * 並び順は TAG_OPTIONS の順にそろえ、重複や表記ゆれを正規形に直す。
 */
export function sanitizeTags(tags: string[]): string[] {
  const picked = new Set(
    tags.map((t) => t.trim().toLowerCase()).filter(Boolean),
  );
  return TAG_OPTIONS.filter((opt) => picked.has(opt.toLowerCase()));
}

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
