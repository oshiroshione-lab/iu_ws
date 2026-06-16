// 用語データをまとめて扱うための“計算だけ”の関数たち（保存はしない）。
// 画面から呼ぶほか、テストもしやすいように純粋な関数にしている。

import type { Term } from "@/lib/types";

/**
 * 検索の「表記ゆれ」を吸収するための正規化（純粋関数）。
 * 「ぱす」「パス」「ＰＡＴＨ」「path」などを同じものとして扱えるようにする。
 *  ・全角の英数字・記号を半角へ（NFKC）
 *  ・英字は小文字へ
 *  ・カタカナをひらがなへ
 *  ・空白を取り除く（人は区切りを気にせず打つため）
 */
export function normalizeForSearch(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) =>
      String.fromCharCode(c.charCodeAt(0) - 0x60),
    )
    .replace(/\s+/g, "");
}

/** 「新着」とみなす日数（暫定）。登録からこの日数以内なら NEW を出す。 */
export const NEW_TERM_WINDOW_DAYS = 3;

/**
 * 登録が「最近」か（＝NEW表示を出すか）を判定する純粋関数。
 * createdAt（ISO文字列）が now から windowDays 以内なら true。
 * now はミリ秒（呼び出し側で Date.now() を渡す）。
 */
export function isRecentlyAdded(
  createdAt: string,
  now: number,
  windowDays: number = NEW_TERM_WINDOW_DAYS,
): boolean {
  const t = Date.parse(createdAt);
  if (Number.isNaN(t)) return false;
  const diff = now - t;
  if (diff < 0) return false; // 未来日時は新着扱いしない
  return diff <= windowDays * 24 * 60 * 60 * 1000;
}

/** すべての用語からタグを集計し、多い順に返す（タグ絞り込みのチップに使う） */
export function collectTags(terms: Term[]): { tag: string; count: number }[] {
  const counts = new Map<string, { tag: string; count: number }>();
  for (const t of terms) {
    for (const tag of t.tags) {
      const key = tag.toLowerCase();
      const cur = counts.get(key);
      if (cur) cur.count += 1;
      else counts.set(key, { tag, count: 1 });
    }
  }
  return [...counts.values()].sort(
    (a, b) => b.count - a.count || a.tag.localeCompare(b.tag),
  );
}

/** 指定タグを持つ用語だけに絞る（大文字小文字は区別しない） */
export function filterByTag(terms: Term[], tag: string): Term[] {
  const key = tag.trim().toLowerCase();
  if (!key) return terms;
  return terms.filter((t) => t.tags.some((x) => x.toLowerCase() === key));
}

/** 用語名 → 用語 の早引き表（大文字小文字を無視）。関連ワードの相互リンクに使う */
export function buildWordIndex(terms: Term[]): Map<string, Term> {
  const index = new Map<string, Term>();
  for (const t of terms) {
    const key = t.word.trim().toLowerCase();
    if (key && !index.has(key)) index.set(key, t);
  }
  return index;
}

/**
 * この用語を「関連ワード」に挙げている他の用語（＝被リンク）を返す。
 * Obsidian のような“つながり”を見せるために使う。自分自身は除く。
 */
export function findBacklinks(terms: Term[], word: string): Term[] {
  const key = word.trim().toLowerCase();
  if (!key) return [];
  return terms.filter(
    (t) =>
      t.word.trim().toLowerCase() !== key &&
      t.relatedWords.some((w) => w.trim().toLowerCase() === key),
  );
}

/** 文章を「ただの文字」と「用語へのリンク」に分けた一片。termId があればリンクにする。 */
export interface TextSegment {
  text: string;
  /** この一片が指す用語のID（あればリンク表示） */
  termId?: string;
}

/**
 * 文章の中に出てくる「登録済みの用語名」を見つけて、リンクできる形に分解する（純粋関数）。
 * Scrapbox のように、説明文を読みながら知らない用語へその場で飛べるようにするのが狙い。
 *
 * 約束ごと（読みやすさのため）:
 *  - 長い用語を優先する（「機械学習」を「学習」より先に当てる）。
 *  - 1つの用語につきリンクは最初の1回だけ（同じ語が何度も出てもリンクだらけにしない）。
 *  - excludeId（いま見ている用語など）はリンクにしない（自分自身への無意味なリンクを防ぐ）。
 */
export function linkifyText(
  text: string,
  terms: Term[],
  excludeId?: string,
): TextSegment[] {
  if (!text) return [];
  // 長い順に並べておくと、ある位置から始まる「最長の用語」を最初の一致で取れる。
  const entries = terms
    .filter((t) => t.id !== excludeId && t.word.trim().length > 0)
    .map((t) => ({ id: t.id, word: t.word.trim(), lower: t.word.trim().toLowerCase() }))
    .sort((a, b) => b.word.length - a.word.length);
  if (entries.length === 0) return [{ text }];

  const lowerText = text.toLowerCase();
  const linked = new Set<string>(); // すでにリンクにした用語（最初の1回だけにするため）
  const segments: TextSegment[] = [];
  let buf = ""; // まだリンクになっていない文字をためておく
  let i = 0;

  while (i < text.length) {
    // この位置から始まる、まだリンクしていない最長の用語を探す
    let match: { id: string; len: number } | null = null;
    for (const e of entries) {
      if (linked.has(e.id)) continue;
      if (lowerText.startsWith(e.lower, i)) {
        match = { id: e.id, len: e.word.length };
        break; // entries は長い順なので、最初の一致が最長
      }
    }
    if (match) {
      if (buf) {
        segments.push({ text: buf });
        buf = "";
      }
      segments.push({ text: text.slice(i, i + match.len), termId: match.id });
      linked.add(match.id);
      i += match.len;
    } else {
      buf += text[i];
      i += 1;
    }
  }
  if (buf) segments.push({ text: buf });
  return segments;
}

/**
 * 2-hop リンク：この用語と「同じ関連ワード」を持つ“兄弟”の用語を返す（純粋関数）。
 * 直接つながっていなくても、共通の関連ワードを通じてゆるくつながる用語を見つける。
 * shared には、つながりの理由になった共通の関連ワードを入れる。
 * excludeIds（すでに直接リンク／被リンクで表示済みの用語）は重複を避けるため除く。
 */
export function findRelatedBySharedWords(
  terms: Term[],
  term: Term,
  excludeIds: Set<string> = new Set(),
): { term: Term; shared: string[] }[] {
  const mine = new Set(
    term.relatedWords.map((w) => w.trim().toLowerCase()).filter(Boolean),
  );
  if (mine.size === 0) return [];

  const results: { term: Term; shared: string[] }[] = [];
  for (const t of terms) {
    if (t.id === term.id || excludeIds.has(t.id)) continue;
    const shared = [
      ...new Set(
        t.relatedWords
          .map((w) => w.trim())
          .filter((w) => mine.has(w.toLowerCase())),
      ),
    ];
    if (shared.length > 0) results.push({ term: t, shared });
  }
  results.sort(
    (a, b) => b.shared.length - a.shared.length || a.term.word.localeCompare(b.term.word),
  );
  return results;
}

/**
 * サジェスト用：入力 query に一致する用語を、見つけやすい順に返す（純粋関数）。
 * 並び順は「前方一致 → 部分一致 →（任意で）タグ一致」、同点なら短い語・名前順。
 * 検索バーと登録フォームの両方で使う。
 */
export function matchTerms<T extends { word: string; tags?: string[] }>(
  terms: T[],
  query: string,
  limit = 8,
  includeTags = false,
): T[] {
  const q = normalizeForSearch(query);
  if (!q) return [];
  const scored: { t: T; score: number; len: number }[] = [];
  for (const t of terms) {
    const w = normalizeForSearch(t.word);
    let score = -1;
    if (w.startsWith(q)) score = 0;
    else if (w.includes(q)) score = 1;
    else if (
      includeTags &&
      (t.tags ?? []).some((tag) => normalizeForSearch(tag).includes(q))
    )
      score = 2;
    if (score >= 0) scored.push({ t, score, len: t.word.length });
  }
  scored.sort(
    (a, b) => a.score - b.score || a.len - b.len || a.t.word.localeCompare(b.t.word),
  );
  return scored.slice(0, limit).map((s) => s.t);
}
