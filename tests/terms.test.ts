// 用語データの“計算だけ”の関数（タグ集計・絞り込み・相互リンク・被リンク）のテスト。

import { describe, it, expect } from "vitest";
import {
  collectTags,
  filterByTag,
  buildWordIndex,
  findBacklinks,
  linkifyText,
  findRelatedBySharedWords,
  isRecentlyAdded,
  normalizeForSearch,
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
    verifiedBy: partial.verifiedBy ?? null,
    verifiedAt: partial.verifiedAt ?? null,
    likedBy: partial.likedBy ?? [],
    comments: partial.comments ?? [],
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

describe("linkifyText（説明文の中の用語名を自動リンク）", () => {
  it("登録済みの用語をリンク片に分け、それ以外は文字のまま返す", () => {
    const segs = linkifyText("機械学習はニューラルネットと関係が深い。", terms);
    // 用語の所だけ termId が付く
    const linked = segs.filter((s) => s.termId);
    expect(linked.map((s) => s.text)).toEqual(["機械学習", "ニューラルネット"]);
    // つなぎ直すと元の文章に戻る（欠落や重複がない）
    expect(segs.map((s) => s.text).join("")).toBe(
      "機械学習はニューラルネットと関係が深い。",
    );
  });

  it("長い用語を優先する（「機械学習」を「学習」より先に当てる）", () => {
    const ts = [
      makeTerm({ id: "ml", word: "機械学習" }),
      makeTerm({ id: "study", word: "学習" }),
    ];
    const segs = linkifyText("機械学習の話", ts);
    const linked = segs.filter((s) => s.termId);
    expect(linked).toEqual([{ text: "機械学習", termId: "ml" }]);
  });

  it("同じ用語が何度出てもリンクは最初の1回だけ", () => {
    const ts = [makeTerm({ id: "api", word: "API" })];
    const segs = linkifyText("APIとAPIをつなぐAPI", ts);
    expect(segs.filter((s) => s.termId)).toHaveLength(1);
  });

  it("excludeId に渡した用語（自分自身）はリンクにしない", () => {
    const segs = linkifyText("機械学習の説明", terms, "機械学習");
    expect(segs.some((s) => s.termId)).toBe(false);
  });
});

describe("findRelatedBySharedWords（同じ関連ワードでつながる用語）", () => {
  const ts = [
    makeTerm({ id: "react", word: "React", relatedWords: ["仮想DOM", "JSX"] }),
    makeTerm({ id: "vue", word: "Vue", relatedWords: ["仮想DOM", "SPA"] }),
    makeTerm({ id: "stat", word: "正規分布", relatedWords: ["平均"] }),
  ];

  it("共通の関連ワードを持つ用語を、共通語つきで返す", () => {
    const react = ts[0];
    const result = findRelatedBySharedWords(ts, react);
    expect(result.map((r) => r.term.word)).toEqual(["Vue"]);
    expect(result[0].shared).toEqual(["仮想DOM"]);
  });

  it("excludeIds に入れた用語は除く", () => {
    const react = ts[0];
    const result = findRelatedBySharedWords(ts, react, new Set(["vue"]));
    expect(result).toEqual([]);
  });
});

describe("isRecentlyAdded（新着判定）", () => {
  const now = Date.parse("2026-06-16T12:00:00.000Z");

  it("既定（3日以内）なら新着", () => {
    expect(isRecentlyAdded("2026-06-15T12:00:00.000Z", now)).toBe(true);
  });

  it("3日より前なら新着ではない", () => {
    expect(isRecentlyAdded("2026-06-10T12:00:00.000Z", now)).toBe(false);
  });

  it("未来日時は新着扱いしない", () => {
    expect(isRecentlyAdded("2026-06-20T12:00:00.000Z", now)).toBe(false);
  });

  it("日付として読めない文字列は false", () => {
    expect(isRecentlyAdded("", now)).toBe(false);
  });
});

describe("normalizeForSearch（検索の表記ゆれ吸収）", () => {
  it("カタカナとひらがなを同じにする", () => {
    expect(normalizeForSearch("パス")).toBe(normalizeForSearch("ぱす"));
  });

  it("全角英数字を半角・小文字にする", () => {
    expect(normalizeForSearch("ＰＡＴＨ")).toBe("path");
  });

  it("英字の大文字小文字をそろえ、空白を取り除く", () => {
    expect(normalizeForSearch("A P I")).toBe("api");
  });
});
