// 並び替え（sortTerms）と、URL値→キーへの変換（toSortKey / toViewMode）のテスト。

import { describe, it, expect } from "vitest";
import { sortTerms, toSortKey, toViewMode } from "@/lib/terms";
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
    verifiedBy: partial.verifiedBy ?? null,
    verifiedAt: partial.verifiedAt ?? null,
    likedBy: partial.likedBy ?? [],
    comments: partial.comments ?? [],
    createdBy: partial.createdBy ?? "",
    createdAt: partial.createdAt ?? "2026-01-01T00:00:00.000Z",
    updatedAt: partial.updatedAt ?? "2026-01-01T00:00:00.000Z",
  };
}

const a = makeTerm({
  word: "あ",
  createdAt: "2026-01-01T00:00:00.000Z",
  likedBy: ["太郎"],
});
const b = makeTerm({
  word: "い",
  createdAt: "2026-02-01T00:00:00.000Z",
  likedBy: ["太郎", "花子", "次郎"],
});
const c = makeTerm({
  word: "う",
  createdAt: "2026-03-01T00:00:00.000Z",
  likedBy: [],
});

describe("sortTerms", () => {
  it("新しい順（new）は登録日時の新しいものが先頭", () => {
    const r = sortTerms([a, b, c], "new");
    expect(r.map((t) => t.word)).toEqual(["う", "い", "あ"]);
  });

  it("古い順（old）は登録日時の古いものが先頭", () => {
    const r = sortTerms([c, a, b], "old");
    expect(r.map((t) => t.word)).toEqual(["あ", "い", "う"]);
  });

  it("名前順（name）はあいうえお順", () => {
    const r = sortTerms([c, b, a], "name");
    expect(r.map((t) => t.word)).toEqual(["あ", "い", "う"]);
  });

  it("いいね順（likes）はいいねが多い順、同数なら新しい順", () => {
    const r = sortTerms([a, b, c], "likes");
    expect(r.map((t) => t.word)).toEqual(["い", "あ", "う"]);
  });

  it("元の配列は変更しない（純粋関数）", () => {
    const input = [a, b, c];
    const before = input.map((t) => t.word);
    sortTerms(input, "name");
    expect(input.map((t) => t.word)).toEqual(before);
  });
});

describe("toSortKey", () => {
  it("知っている値はそのまま返す", () => {
    expect(toSortKey("old")).toBe("old");
    expect(toSortKey("name")).toBe("name");
    expect(toSortKey("likes")).toBe("likes");
    expect(toSortKey("new")).toBe("new");
  });
  it("知らない値・未指定は既定（new）にする", () => {
    expect(toSortKey(undefined)).toBe("new");
    expect(toSortKey("")).toBe("new");
    expect(toSortKey("でたらめ")).toBe("new");
  });
});

describe("toViewMode", () => {
  it("縦・横はそのまま返す", () => {
    expect(toViewMode("vstack")).toBe("vstack");
    expect(toViewMode("hstack")).toBe("hstack");
  });
  it("知らない値・未指定は既定（grid）にする", () => {
    expect(toViewMode(undefined)).toBe("grid");
    expect(toViewMode("grid")).toBe("grid");
    expect(toViewMode("でたらめ")).toBe("grid");
  });
});
