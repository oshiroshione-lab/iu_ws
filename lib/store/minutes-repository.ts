// 「議事録データをどう保存・取得するか」の約束ごと（インターフェース）。
//
// 用語（TermRepository）と同じ考え方。画面やAIのコードはこの約束だけに依存し、
// 将来 DB（Supabase など）に決まったら、同じ約束を満たす別の実装に差し替えるだけでよい。

import type { Minute, NewMinuteData, MinutePatch } from "@/lib/types";

export interface MinutesRepository {
  /** 全件を新しい順で返す */
  list(): Promise<Minute[]>;
  /** IDで1件取得。無ければ null */
  get(id: string): Promise<Minute | null>;
  /** 新規作成して、作られた1件を返す */
  create(data: NewMinuteData): Promise<Minute>;
  /** 一部を更新して、更新後の1件を返す。対象が無ければ null */
  update(id: string, patch: MinutePatch): Promise<Minute | null>;
  /** 削除。消せたら true、対象が無ければ false */
  delete(id: string): Promise<boolean>;
}
