// サジェスト用の絞り込み関数 matchTerms のテスト。
// 並び順「前方一致 → 部分一致 → タグ一致」、同点なら短い語が先、を確認する。

import { describe, it, expect } from "vitest";
import { matchTerms } from "@/lib/terms";

const terms = [
  { word: "コンテナ", tags: ["インフラ"] },
  { word: "コンテナオーケストレーション", tags: ["インフラ"] },
  { word: "Docker", tags: ["コンテナ", "インフラ"] },
  { word: "機械学習", tags: ["AI"] },
];

describe("matchTerms（サジェストの絞り込み）", () => {
  it("空の入力なら何も返さない", () => {
    expect(matchTerms(terms, "")).toEqual([]);
    expect(matchTerms(terms, "   ")).toEqual([]);
  });

  it("前方一致を先に、同点なら短い語を先に並べる", () => {
    const result = matchTerms(terms, "コンテナ").map((t) => t.word);
    expect(result.slice(0, 2)).toEqual(["コンテナ", "コンテナオーケストレーション"]);
  });

  it("大文字小文字は区別しない（部分一致）", () => {
    const result = matchTerms(terms, "dock").map((t) => t.word);
    expect(result).toContain("Docker");
  });

  it("includeTags=true のときだけタグ一致も拾う", () => {
    // 用語名に「コンテナ」を含まない Docker は、タグ「コンテナ」経由で拾える
    const withTags = matchTerms(terms, "コンテナ", 8, true).map((t) => t.word);
    expect(withTags).toContain("Docker");
    // includeTags=false（既定）ではタグだけの一致は拾わない
    const withoutTags = matchTerms(terms, "コンテナ").map((t) => t.word);
    expect(withoutTags).not.toContain("Docker");
  });

  it("limit で件数を制限する", () => {
    expect(matchTerms(terms, "コンテナ", 1, true)).toHaveLength(1);
  });

  it("一致しなければ空", () => {
    expect(matchTerms(terms, "存在しない用語")).toEqual([]);
  });
});
