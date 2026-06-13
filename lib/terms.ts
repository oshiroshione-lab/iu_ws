// 用語データをまとめて扱うための“計算だけ”の関数たち（保存はしない）。
// 画面から呼ぶほか、テストもしやすいように純粋な関数にしている。

import type { Term } from "@/lib/types";

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
