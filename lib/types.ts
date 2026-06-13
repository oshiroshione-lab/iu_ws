// アプリで扱うデータの「形」をここで定義する。
// 画面・保存・AIの呼び出しで共通して使う。

/** イラストの状態。ok=生成できた / failed=失敗した / none=まだ作っていない */
export type ImageStatus = "ok" | "failed" | "none";

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
    "word" | "description" | "relatedWords" | "tags" | "imageUrl" | "imageStatus"
  >
>;
