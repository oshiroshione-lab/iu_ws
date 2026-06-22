// 「誰が操作したか（名前）」の扱い。
//
// 変更（2026-06-22）: ログイン（入口の壁）を廃止した。
//   理由: プラットフォーム上で別ドメインの枠(iframe)に埋め込むと、ログイン用クッキーが
//   「第三者クッキー」としてブラウザにブロックされ、名前が保存できずログインがループしたため。
//   いまは名前を「ブラウザ(localStorage)」に持ち、登録・いいね・コメントなどの操作のたびに
//   フォームの隠しフィールド "by" でサーバへ渡す（components/MeField.tsx が入れる）。
//   → クッキーに頼らないので、埋め込み(iframe)でも確実に動く。
//
// requireUser / getCurrentUser は「壁」をやめたので、もう何もしない（互換のため残す）。

const DEFAULT_ACTOR = "ゲスト";

/** フォームの隠しフィールド "by"（MeField が入れる）から操作者名を取り出す。空なら「ゲスト」。 */
export function actorFrom(formData: FormData): string {
  const v = String(formData.get("by") ?? "").trim();
  return v || DEFAULT_ACTOR;
}

/** 旧ログインの名残。壁は廃止したので、もう飛ばさない（呼ばれても素通り）。 */
export async function requireUser(): Promise<string> {
  return DEFAULT_ACTOR;
}

/** 旧ログインの名残。クッキーは使わないので常に null（互換のため残す）。 */
export async function getCurrentUser(): Promise<string | null> {
  return null;
}
