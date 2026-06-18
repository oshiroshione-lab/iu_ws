// URLの「?key=value」（クエリ文字列）を組み立てる小さなヘルパー。
//
// ねらい: 検索・タグ・並び順・表示などの条件を、別の条件に切り替えても
// 他の条件が消えないようにする。「いまの条件 + 変更したい条件」をまとめて
// 1本のクエリ文字列にする。例: 検索したまま並び順だけ変える、など。

/** URLに並べるキーの順番（読みやすいURLにするため決め打ちで並べる）。 */
const KEY_ORDER = ["q", "tags", "sort", "view", "cols"] as const;

/**
 * いまの条件 base に changes を上書きして混ぜ、"?a=1&b=2" を返す純粋関数。
 *  - 値が空文字 / undefined のキーはURLに入れない（既定値は省いて短いURLにする）。
 *  - 何も無ければ空文字 "" を返す（呼び出し側で `"/" + buildQuery(...)` と使える）。
 */
export function buildQuery(
  base: Record<string, string | undefined>,
  changes: Record<string, string | undefined> = {},
): string {
  const merged: Record<string, string | undefined> = { ...base, ...changes };
  const params = new URLSearchParams();
  // まず決め打ちのキーを順番どおりに。
  for (const k of KEY_ORDER) {
    const v = merged[k];
    if (v != null && v !== "") params.set(k, v);
  }
  // 念のため、知らないキーがあれば末尾に足す。
  for (const [k, v] of Object.entries(merged)) {
    if ((KEY_ORDER as readonly string[]).includes(k)) continue;
    if (v != null && v !== "") params.set(k, v);
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}
