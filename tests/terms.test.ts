// 用語データの“計算だけ”の関数（タグ集計・絞り込み・相互リンク・被リンク）のテスト。

import { describe, it, expect } from "vitest";
import {
  collectTags,
  filterByTag,
  buildWordIndex,
  findBacklinks,
} from "@/lib/terms";
import type { Term } from "@/lib/types";

/** テスト用の用語を手早く作るヘルパー */
function makeTerm(partial: Partial<Term> & { word: string }): Term {
  return {
    id: partial.id ?? partial.word,
    word: partial.word,
    description: partial.description ?? "",
    relatedWords: partial.relatedWords ?? [],
    tags: partial.tags ?? [],
    imageUrl: partial.imageUrl ?? null,
    imageStatus: partial.imageStatus ?? "none",
    createdBy: partial.createdBy ?? "テスト",
    createdAt: partial.createdAt ?? "2026-06-13T00:00:00.000Z",
    updatedAt: partial.updatedAt ?? "2026-06-13T00:00:00.000Z",
  };
}

const terms: Term[] = [
  makeTerm({ word: "機械学習", tags: ["AI", "統計"], relatedWords: ["ニューラルネット"] }),
  makeTerm({ word: "ニューラルネット", tags: ["AI"], relatedWords: ["機械学習"] }),
  makeTerm({ word: "正規分布", tags: ["統計"], relatedWords: ["平均"] }),
];

describe("collectTags（タグ集計）", () => {
  it("件数の多い順に並べる", () => {
    const result = collectTags(terms);
    expect(result[0]).toEqual({ tag: "AI", count: 2 });
    expect(result.find((t) => t.tag === "統計")?.count).toBe(2);
  });
});

describe("filterByTag（タグで絞り込み）", () => {
  it("そのタグを持つ用語だけを返す（大文字小文字は無視）", () => {
    const result = filterByTag(terms, "ai");
    expect(result.map((t) => t.word)).toEqual(["機械学習", "ニューラルネット"]);
  });

  it("空タグなら全件そのまま", () => {
    expect(filterByTag(terms, "")).toHaveLength(3);
  });
});

describe("buildWordIndex（用語名→用語の早引き表）", () => {
  it("用語名（小文字化）で引ける", () => {
    const index = buildWordIndex(terms);
    expect(index.get("機械学習")?.word).toBe("機械学習");
    expect(index.get("せいきぶんぷ")).toBeUndefined();
  });
});

describe("findBacklinks（この用語を関連ワードに挙げている用語）", () => {
  it("自分を参照している用語を返し、自分自身は含めない", () => {
    const result = findBacklinks(terms, "機械学習");
    expect(result.map((t) => t.word)).toEqual(["ニューラルネット"]);
  });

  it("だれからも参照されていなければ空", () => {
    expect(findBacklinks(terms, "正規分布")).toEqual([]);
  });
});
