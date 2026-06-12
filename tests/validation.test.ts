// 入力チェックの見本テスト。`npm test` で実行できる。
// 新しい確認を書いたら、使い捨てにせずこの tests/ フォルダに足していく。

import { describe, it, expect } from "vitest";
import { validateWord, WORD_MAX_LENGTH } from "@/lib/validation";

describe("validateWord（用語名のチェック）", () => {
  it("ふつうの用語名は受け入れる", () => {
    const result = validateWord("機械学習");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe("機械学習");
  });

  it("前後の空白は取り除く", () => {
    const result = validateWord("  API  ");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe("API");
  });

  it("空っぽ（空白だけ）はエラーにする", () => {
    const result = validateWord("   ");
    expect(result.ok).toBe(false);
  });

  it("長すぎる用語名はエラーにする", () => {
    const tooLong = "あ".repeat(WORD_MAX_LENGTH + 1);
    expect(validateWord(tooLong).ok).toBe(false);
  });
});
