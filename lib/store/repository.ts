// 「用語データをどう保存・取得するか」の約束ごと（インターフェース）。
//
// ねらい: 画面やAIのコードは、この約束だけに依存する。
//   いまは下の json-store.ts（ローカルのJSONファイル）が中身を担当しているが、
//   将来 DB（Supabase など）に決まったら、この同じ約束を満たす別の実装に
//   差し替えるだけでよい。画面側のコードは一切変えなくて済む。

import type { Term, NewTermData, TermPatch } from "@/lib/types";

export interface TermRepository {
  /** 全件を新しい順で返す */
  list(): Promise<Term[]>;
  /** キーワードで絞り込む（用語名・説明・関連ワードを対象） */
  search(query: string): Promise<Term[]>;
  /** IDで1件取得。無ければ null */
  get(id: string): Promise<Term | null>;
  /** 新規作成して、作られた1件を返す */
  create(data: NewTermData): Promise<Term>;
  /** 一部を更新して、更新後の1件を返す。対象が無ければ null */
  update(id: string, patch: TermPatch): Promise<Term | null>;
  /** 削除。消せたら true、対象が無ければ false */
  delete(id: string): Promise<boolean>;
}
