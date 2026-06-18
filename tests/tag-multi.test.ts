// 複数タグの絞り込み（filterByTags）・選択トグル（toggleTag）・
// URLパラメータの読み取り（parseTagsParam）のテスト。

import { describe, it, expect } from "vitest";
import { filterByTags, toggleTag, parseTagsParam } from "@/lib/terms";
import type { Term } from "@/lib/types";

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

const ai = makeTerm({ word: "機械学習", tags: ["AI"] });
const web = makeTerm({ word: "PWA", tags: ["Web"] });
const db = makeTerm({ word: "NoSQL", tags: ["データベース"] });
const terms = [ai, web, db];

describe("filterByTags（複数タグ＝いずれかに一致）", () => {
  it("1つ選ぶとそのタグの用語だけ", () => {
    expect(filterByTags(terms, ["AI"]).map((t) => t.word)).toEqual(["機械学習"]);
  });

  it("2つ選ぶと、どちらかを持つ用語をすべて出す（和集合）", () => {
    expect(filterByTags(terms, ["AI", "Web"]).map((t) => t.word)).toEqual([
      "機械学習",
      "PWA",
    ]);
  });

  it("空なら全件をそのまま返す（絞り込みなし）", () => {
    expect(filterByTags(terms, [])).toHaveLength(3);
  });

  it("大文字小文字は区別しない", () => {
    expect(filterByTags(terms, ["web"]).map((t) => t.word)).toEqual(["PWA"]);
  });
});

describe("toggleTag（選択のON/OFF）", () => {
  it("入っていなければ足す", () => {
    expect(toggleTag(["AI"], "Web")).toEqual(["AI", "Web"]);
  });

  it("入っていれば外す", () => {
    expect(toggleTag(["AI", "Web"], "AI")).toEqual(["Web"]);
  });

  it("最後の1つを外すと空になる（＝「すべて」に戻る合図）", () => {
    expect(toggleTag(["AI"], "AI")).toEqual([]);
  });

  it("大文字小文字を無視して外せる", () => {
    expect(toggleTag(["AI", "Web"], "web")).toEqual(["AI"]);
  });
});

describe("parseTagsParam（?tags= の読み取り）", () => {
  it("カンマ区切りを配列にする", () => {
    expect(parseTagsParam("AI,Web")).toEqual(["AI", "Web"]);
  });

  it("空白を取り除き、空要素は無視する", () => {
    expect(parseTagsParam(" AI , , Web ")).toEqual(["AI", "Web"]);
  });

  it("重複（大文字小文字を無視）は1つにまとめる", () => {
    expect(parseTagsParam("AI,ai,Web")).toEqual(["AI", "Web"]);
  });

  it("未指定・空文字は空配列", () => {
    expect(parseTagsParam(undefined)).toEqual([]);
    expect(parseTagsParam("")).toEqual([]);
  });
});
