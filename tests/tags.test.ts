// タグの整え方（normalizeTags / parseTags）のテスト。

import { describe, it, expect } from "vitest";
import {
  normalizeTags,
  parseTags,
  sanitizeTags,
  TAGS_MAX,
  TAG_OPTIONS,
} from "@/lib/tags";

describe("normalizeTags（タグの正規化）", () => {
  it("前後の空白を取り、空は除く", () => {
    expect(normalizeTags(["  AI  ", "", "  ", "統計"])).toEqual(["AI", "統計"]);
  });

  it("大文字小文字ちがいの重複を1つにまとめる（最初の表記を残す）", () => {
    expect(normalizeTags(["Web", "web", "WEB"])).toEqual(["Web"]);
  });

  it("上限個数までに絞る", () => {
    const many = Array.from({ length: TAGS_MAX + 3 }, (_, i) => `tag${i}`);
    expect(normalizeTags(many)).toHaveLength(TAGS_MAX);
  });

  it("長すぎるタグは除く", () => {
    const tooLong = "あ".repeat(50);
    expect(normalizeTags([tooLong, "短い"])).toEqual(["短い"]);
  });
});

describe("parseTags（入力文字列をタグ配列にする）", () => {
  it("カンマ・読点・改行で区切れる", () => {
    expect(parseTags("AI, 統計、機械学習\nWeb")).toEqual([
      "AI",
      "統計",
      "機械学習",
      "Web",
    ]);
  });

  it("空文字なら空配列", () => {
    expect(parseTags("   ")).toEqual([]);
  });
});

describe("sanitizeTags（固定リストのタグだけに整える）", () => {
  it("固定リストにあるものだけを残す", () => {
    expect(sanitizeTags(["AI", "勝手なタグ", "Web"])).toEqual(["AI", "Web"]);
  });

  it("大文字小文字のゆれを正規形に直す", () => {
    expect(sanitizeTags(["ai", "WEB"])).toEqual(["AI", "Web"]);
  });

  it("並び順は TAG_OPTIONS の順にそろえ、重複は消す", () => {
    const result = sanitizeTags(["Web", "AI", "Web"]);
    expect(result).toEqual(["AI", "Web"]);
    // すべて固定リストに含まれる
    expect(result.every((t) => (TAG_OPTIONS as readonly string[]).includes(t))).toBe(
      true,
    );
  });

  it("固定リスト外だけなら空配列", () => {
    expect(sanitizeTags(["なんとか", "かんとか"])).toEqual([]);
  });
});
