// API料金の「目安」を計算する場所（参考表示用）。
//
// ・実際の請求はトークン量や画像サイズで変わるので、ここで出すのはあくまで概算。
// ・単価は docs/research の調査値（2026年）に基づく。モデルを変えたら、この表に足す。
// ・いま使っているモデル（lib/config.ts）から自動で計算するので、設定を変えれば表示も変わる。

import {
  TEXT_MODEL,
  IMAGE_MODEL,
  IMAGE_QUALITY,
  TRANSCRIBE_MODEL,
  type ImageQuality,
} from "@/lib/config";

/** 円換算の固定レート（概算用） */
export const USD_TO_JPY = 150;

/** テキストモデルの単価（USD / 100万トークン）[入力, 出力] */
const TEXT_RATES: Record<string, { in: number; out: number }> = {
  "gpt-5.4-nano": { in: 0.2, out: 1.25 },
  "gpt-5.4-mini": { in: 0.75, out: 4.5 },
  "gpt-5.4": { in: 2.5, out: 15 },
};

/** 画像1枚（1024x1024）の単価（USD）。品質で決まる。 */
const IMAGE_RATES: Record<ImageQuality, number> = {
  low: 0.006,
  medium: 0.053,
  high: 0.211,
};

/** 文字起こしの単価（USD / 分） */
const TRANSCRIBE_RATES: Record<string, number> = {
  "gpt-4o-mini-transcribe": 0.003,
  "gpt-4o-transcribe": 0.006,
  "whisper-1": 0.006,
};

/** 1操作あたりの“だいたいのトークン数”（目安。実際は内容で変わる） */
const TOKENS = {
  // 用語1件登録：説明生成＋イラスト設計（2回のテキスト呼び出し）の合計目安
  termTextIn: 900,
  termTextOut: 650,
  // 議事録から1用語：説明生成のみ
  extractTextIn: 500,
  extractTextOut: 500,
};

function yen(usd: number): number {
  return usd * USD_TO_JPY;
}

export interface PricingSummary {
  exchangeRate: number;
  perAction: { label: string; yen: number | null; note: string }[];
  rates: { name: string; detail: string }[];
}

/** いまの設定モデルから、料金の目安をまとめて返す。 */
export function computePricingSummary(): PricingSummary {
  const text = TEXT_RATES[TEXT_MODEL] ?? null;
  const imageUsd = IMAGE_RATES[IMAGE_QUALITY];
  const transcribeUsd = TRANSCRIBE_RATES[TRANSCRIBE_MODEL] ?? null;

  const termTextUsd = text
    ? (TOKENS.termTextIn / 1e6) * text.in + (TOKENS.termTextOut / 1e6) * text.out
    : null;
  const extractTextUsd = text
    ? (TOKENS.extractTextIn / 1e6) * text.in +
      (TOKENS.extractTextOut / 1e6) * text.out
    : null;
  const termTotalUsd = termTextUsd != null ? termTextUsd + imageUsd : null;

  return {
    exchangeRate: USD_TO_JPY,
    perAction: [
      {
        label: "用語を1件登録",
        yen: termTotalUsd != null ? yen(termTotalUsd) : null,
        note: "説明・タグ＋イラスト",
      },
      { label: "イラスト1枚", yen: yen(imageUsd), note: `画質 ${IMAGE_QUALITY}` },
      {
        label: "議事録から1用語",
        yen: extractTextUsd != null ? yen(extractTextUsd) : null,
        note: "説明のみ・画像なし",
      },
    ],
    rates: [
      {
        name: `テキスト ${TEXT_MODEL}`,
        detail: text
          ? `$${text.in} / $${text.out}（入力/出力・100万トークン）`
          : "料金表に未登録",
      },
      {
        name: `画像 ${IMAGE_MODEL}（${IMAGE_QUALITY}）`,
        detail: `約 $${imageUsd} / 枚`,
      },
      {
        name: `文字起こし ${TRANSCRIBE_MODEL}`,
        detail: transcribeUsd != null ? `約 $${transcribeUsd} / 分` : "料金表に未登録",
      },
    ],
  };
}
