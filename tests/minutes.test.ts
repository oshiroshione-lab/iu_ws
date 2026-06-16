// 議事録の入力チェック（タイトル・本文）のテスト。

import { describe, it, expect } from "vitest";
import {
  validateMinuteTitle,
  validateMinuteBody,
  MINUTE_TITLE_MAX_LENGTH,
  MINUTE_BODY_MAX_LENGTH,
} from "@/lib/validation";

describe("validateMinuteTitle（タイトルのチェック）", () => {
  it("前後の空白を取り除いて通す", () => {
    expect(validateMinuteTitle("  定例MTG  ")).toEqual({
      ok: true,
      value: "定例MTG",
    });
  });

  it("空はエラー", () => {
    expect(validateMinuteTitle("   ").ok).toBe(false);
  });

  it("長すぎるとエラー", () => {
    expect(validateMinuteTitle("あ".repeat(MINUTE_TITLE_MAX_LENGTH + 1)).ok).toBe(
      false,
    );
  });
});

describe("validateMinuteBody（本文のチェック）", () => {
  it("中身があれば通す", () => {
    expect(validateMinuteBody("今日の議題は…").ok).toBe(true);
  });

  it("空はエラー（先に文字起こしが必要）", () => {
    expect(validateMinuteBody("").ok).toBe(false);
  });

  it("長すぎるとエラー", () => {
    expect(validateMinuteBody("x".repeat(MINUTE_BODY_MAX_LENGTH + 1)).ok).toBe(
      false,
    );
  });
});
