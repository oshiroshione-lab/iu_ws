<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# iUナレッジWS — プロジェクト案内（Claude/エージェント向け）

> CLAUDE.md はこのファイルを読み込む（`@AGENTS.md`）。エージェント向けの約束ごとはここに集約する。
> **唯一の信頼できる仕様は `iUナレッジWS_要件定義書.md`。** 機能・受け入れ基準・実装フェーズはそこを参照。

## これは何か
iU のインターン3人チームが、新しく学んだ専門用語を共有・保存する「私たちの辞書」Webアプリ。用語名を入力すると AI が自動でリサーチし、**比喩表現（たとえ話）を使わない**わかりやすい説明文・イメージイラスト・関連ワードを生成する。

### 設計判断に効く前提（必ず守る）
- ユーザーは開発初心者（インターン生）。説明・コメント・コミットメッセージは平易な表現で。
- 想定ユーザーはチーム3人のみ。一般公開・外部登録は非ゴール。ログイン必須。
- PCブラウザ前提。ネイティブモバイルアプリは作らない。
- **AI が生成する説明文には比喩表現を使わない**（F-02 の中核仕様。プロンプトに必ず反映。実装は `lib/ai.ts`）。
- **AI 生成の失敗を握りつぶさない**: イラスト失敗時はテキストだけ表示し「画像を生成できませんでした（後でやり直せます）」。関連ワード0件でもエラーにせず「関連ワードは見つかりませんでした」と表示。

## 技術スタック（確定）
TypeScript / Next.js 16（App Router）/ OpenAI（テキスト=`gpt-5.4-nano`・画像=`gpt-image-2`（品質 `medium` 既定）・将来の議事録文字起こし=`gpt-4o-mini-transcribe`）/ ホスティング Vercel。テキストは安い nano（料金最優先）。画像は「用語を絵で説明する」役割なので、図解がくっきり見える `medium` を既定にしている（プロンプトも“説明的な図解”を指示。実装は `lib/ai.ts`）。
**データベース・認証は未確定（保留中）** — ユーザーの確認待ち。

## アーキテクチャ上の差し替えポイント（DB・認証が未確定のため）
- **データ保存**: `lib/store/`（`TermRepository` インターフェース＋当面のローカルJSON実装 `json-store.ts`、データは `.data/terms.json`）。DB が決まったら同インターフェースの実装を作り `lib/store/index.ts` で差し替える。画面側は変更不要。
- **認証**: `lib/auth.ts`（名前＋合言葉をクッキーに入れるだけの仮実装。署名なしなので強い認証ではない）。本認証が決まったら差し替える。
- **AI 呼び出し**: `lib/ai.ts` に集約。モデル名・画質は `.env.local`（`OPENAI_TEXT_MODEL` / `OPENAI_IMAGE_MODEL` / `OPENAI_IMAGE_QUALITY` / `OPENAI_TRANSCRIBE_MODEL`）で変更可（既定値は `lib/config.ts`）。将来の議事録→用語抽出に備えた `extractTermsFromText` の土台あり。
- **生成イラスト**: `lib/images.ts` が `public/generated/` に保存（暫定。将来は画像ストレージへ）。

## 開発の流儀（project-init スキルの流儀を採用）
- **JOURNEY.md に歩みを記録する（最重要）**: ①コミット直後 ②大きな決定の直後 ③セッション終了時に、言われなくても1エントリ追記。新しい記録ほど上に。読者は非エンジニアなので平易に。
- **テストは tests/ に貯める**: 使い捨てにせず保存。`npm test`（Vitest）で動く状態を保つ。
- **使い捨ては scratch/ へ**（Git 管理外）。ルート直下を散らかさない。
- **調べものは docs/research/ に**: `YYYY-MM-DD_テーマ.md` で「結論→詳しく→出典」の順に保存。
- **秘密情報は .env.local のみ**。他のファイルに API キーを書かない。

## 主要コマンド
- 開発サーバー起動: `npm run dev`
- 本番ビルド確認: `npm run build`
- テスト: `npm test`
- 型チェック: `npm run typecheck`

## 未確定（着手前にユーザー確認が必要な TBD）
データベース／本認証の選定・用語名と説明文の最大文字数・AI 利用料の上限・「うまくいった指標」など。詳細は要件定義書末尾。
