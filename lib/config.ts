// アプリ全体の設定を1か所にまとめる場所。
// すべて環境変数（.env.local）から読み込む。サーバー側だけで使う想定。

/** 用語の説明文・関連ワードを作るテキストモデル名。
 *  既定は安い gpt-5.4-nano（短い日本語説明＋JSONには十分）。料金最優先の方針。 */
export const TEXT_MODEL = process.env.OPENAI_TEXT_MODEL ?? "gpt-5.4-nano";

/** イメージイラストを作る画像モデル名 */
export const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-2";

/** 画像の品質。料金が一番動くのはここ（low ≒ 0.9円 / medium ≒ 8円 / high ≒ 32円 per枚）。
 *  既定は medium（説明的な図解がくっきり見える、料金とのバランス重視）。
 *  もっと安くするなら OPENAI_IMAGE_QUALITY=low、もっと精細にするなら =high にする。 */
const ALLOWED_IMAGE_QUALITY = ["low", "medium", "high"] as const;
export type ImageQuality = (typeof ALLOWED_IMAGE_QUALITY)[number];
const rawImageQuality = process.env.OPENAI_IMAGE_QUALITY ?? "medium";
export const IMAGE_QUALITY: ImageQuality = (
  ALLOWED_IMAGE_QUALITY as readonly string[]
).includes(rawImageQuality)
  ? (rawImageQuality as ImageQuality)
  : "medium";

/** ＜将来＞議事録の文字起こしに使うモデル。gpt-4o-mini-transcribe が安い（約$0.003/分）。 */
export const TRANSCRIBE_MODEL =
  process.env.OPENAI_TRANSCRIBE_MODEL ?? "gpt-4o-mini-transcribe";

/** OpenAI のAPIキー（未設定なら空文字） */
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";

/** キーが設定されているか。未設定ならAI機能はスキップして案内を出す */
export const hasOpenAIKey = OPENAI_API_KEY.trim().length > 0;

// --- 仮のログイン設定（DB・本認証が決まるまでの暫定） ---

/** 入れる3人の名前。空配列なら「どんな名前でも入れる」開発モード */
export const ALLOWED_MEMBERS = (process.env.ALLOWED_MEMBERS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

/** 共通の合言葉。空なら合言葉なしで入れる */
export const ACCESS_CODE = process.env.ACCESS_CODE ?? "";
