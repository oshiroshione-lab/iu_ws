// アプリで扱うデータの「形」をここで定義する。
// 画面・保存・AIの呼び出しで共通して使う。

/** イラストの状態。
 *  ok=生成できた / failed=失敗した / none=まだ作っていない / generating=いま裏で生成中 */
export type ImageStatus = "ok" | "failed" | "none" | "generating";

/** 用語へのコメント1件（説明を人の手で磨くための書き込み） */
export interface TermComment {
  /** 一意なID（UUID） */
  id: string;
  /** 書いた人の名前 */
  by: string;
  /** 本文 */
  text: string;
  /** 書いた日時（ISO文字列） */
  at: string;
}

/** 用語1件分のデータ */
export interface Term {
  /** 一意なID（UUID） */
  id: string;
  /** 用語名（必須） */
  word: string;
  /** AIが作った「比喩を使わない」説明文 */
  description: string;
  /** 関連ワード（0件のこともある） */
  relatedWords: string[];
  /** タグ（広いカテゴリ。例: AI / 統計 / Web）。0件のこともある */
  tags: string[];
  /** 生成イラストの場所（無いこともある） */
  imageUrl: string | null;
  /** イラストの状態 */
  imageStatus: ImageStatus;
  /** 内容を「確認した」人の名前（未確認なら null）。AI生成の説明の正しさを人が担保する印。 */
  verifiedBy: string | null;
  /** 確認した日時（ISO文字列。未確認なら null） */
  verifiedAt: string | null;
  /** 「いいね」した人の名前（重複なし） */
  likedBy: string[];
  /** コメント（古い順で持つ） */
  comments: TermComment[];
  /** 登録した人の名前 */
  createdBy: string;
  /** 登録日時（ISO文字列） */
  createdAt: string;
  /** 更新日時（ISO文字列） */
  updatedAt: string;
}

/** 新規登録時に渡すデータ（id・日時はリポジトリ側で付与する） */
export interface NewTermData {
  word: string;
  description: string;
  relatedWords: string[];
  tags: string[];
  imageUrl: string | null;
  imageStatus: ImageStatus;
  createdBy: string;
}

/** 用語を部分的に更新するときに渡せる項目 */
export type TermPatch = Partial<
  Pick<
    Term,
    | "word"
    | "description"
    | "relatedWords"
    | "tags"
    | "imageUrl"
    | "imageStatus"
    | "verifiedBy"
    | "verifiedAt"
    | "likedBy"
    | "comments"
  >
>;

/** 議事録1件分のデータ（録音→文字起こしで作る） */
export interface Minute {
  /** 一意なID（UUID） */
  id: string;
  /** タイトル（手入力。既定は日時） */
  title: string;
  /** 会議日（"YYYY-MM-DD"。未入力なら空文字。記録日 createdAt とは別に持てる） */
  meetingDate: string;
  /** 参加者（自由記述。例「太郎、花子」） */
  attendees: string;
  /** 議題（複数行可） */
  agenda: string;
  /** 本文＝議事内容（AIの文字起こし。手で直せる） */
  body: string;
  /** 決定事項（1行に1つ） */
  decisions: string;
  /** ToDo・ネクストアクション（1行に1つ） */
  todos: string;
  /** 作成した人の名前 */
  createdBy: string;
  /** 作成日時（ISO文字列） */
  createdAt: string;
  /** 更新日時（ISO文字列） */
  updatedAt: string;
}

/** 議事録の新規作成時に渡すデータ（id・日時はリポジトリ側で付与する） */
export interface NewMinuteData {
  title: string;
  meetingDate: string;
  attendees: string;
  agenda: string;
  body: string;
  decisions: string;
  todos: string;
  createdBy: string;
}

/** 議事録を部分的に更新するときに渡せる項目 */
export type MinutePatch = Partial<
  Pick<
    Minute,
    "title" | "meetingDate" | "attendees" | "agenda" | "body" | "decisions" | "todos"
  >
>;

/** 用語リクエスト（「この用語を知りたい」という依頼。まだ登録されていない語の待ち行列） */
export interface TermRequest {
  /** 一意なID（UUID） */
  id: string;
  /** 知りたい用語名 */
  word: string;
  /** ひとことメモ（任意。どこで見た・なぜ知りたい等） */
  note: string;
  /** リクエストした人の名前 */
  createdBy: string;
  /** リクエスト日時（ISO文字列） */
  createdAt: string;
}

/** 用語リクエストの新規作成時に渡すデータ（id・日時はリポジトリ側で付与する） */
export interface NewTermRequestData {
  word: string;
  note: string;
  createdBy: string;
}
