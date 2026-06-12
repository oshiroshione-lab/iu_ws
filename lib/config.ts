// アプリ全体の設定を1か所にまとめる場所。
// すべて環境変数（.env.local）から読み込む。サーバー側だけで使う想定。

/** 用語の説明文・関連ワードを作るテキストモデル名 */
export const TEXT_MODEL = process.env.OPENAI_TEXT_MODEL ?? "gpt-5.4-mini";

/** イメージイラストを作る画像モデル名 */
export const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-2";

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
