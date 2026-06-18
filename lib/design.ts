// 見た目のプリセット（デザイン切替）。ヘッダーのボタンでワンタッチ切り替え。
//  - classic = 前のデザイン（中央寄せの幅 ＋ 3〜6 の数字ボタンで列数を選ぶ）
//  - wide    = 今のデザイン（横幅いっぱい ＋ ＋/− のステッパーで大きさを変える）
//
// 選択は cookie(design) に保存し、サーバー側（layout）で読んで最初から正しい見た目で描く。
// だから開いた瞬間のちらつきが出ない（テーマ切替と同じ作り）。

export type DesignPreset = "classic" | "wide";

/** 文字列を安全に DesignPreset へ。"classic" 以外は今の見た目（wide）にする。 */
export function toDesignPreset(value: string | undefined): DesignPreset {
  return value === "classic" ? "classic" : "wide";
}
