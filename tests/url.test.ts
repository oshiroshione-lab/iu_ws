// クエリ文字列を組み立てる buildQuery のテスト。
// 「いまの条件を保ったまま、1つだけ切り替える」が正しく効くかを確かめる。

import { describe, it, expect } from "vitest";
import { buildQuery } from "@/lib/url";

describe("buildQuery", () => {
  it("何も無ければ空文字を返す", () => {
    expect(buildQuery({})).toBe("");
    expect(buildQuery({ q: "", tag: undefined })).toBe("");
  });

  it("今の条件を保ったまま1つだけ変える", () => {
    // 検索とタグはそのままに、並び順だけ name にする。
    expect(buildQuery({ q: "ai", tags: "統計" }, { sort: "name" })).toBe(
      "?q=ai&tags=%E7%B5%B1%E8%A8%88&sort=name",
    );
  });

  it("undefined を渡したキーはURLから消える（既定に戻す用）", () => {
    expect(buildQuery({ q: "ai", sort: "name" }, { sort: undefined })).toBe(
      "?q=ai",
    );
  });

  it("キーは決まった順（q, tags, sort, view）で並ぶ", () => {
    expect(
      buildQuery({ view: "hstack", sort: "old", tags: "web", q: "x" }),
    ).toBe("?q=x&tags=web&sort=old&view=hstack");
  });
});
