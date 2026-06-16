// 「用語リクエストをどう保存・取得するか」の約束ごと（インターフェース）。
//
// 用語（TermRepository）・議事録（MinutesRepository）と同じ考え方。
// 画面のコードはこの約束だけに依存し、将来 DB に決まったら同じ約束を満たす
// 別の実装に差し替えるだけでよい。

import type { TermRequest, NewTermRequestData } from "@/lib/types";

export interface RequestRepository {
  /** 全件を新しい順で返す */
  list(): Promise<TermRequest[]>;
  /** 新規作成して、作られた1件を返す */
  create(data: NewTermRequestData): Promise<TermRequest>;
  /** 削除（解決済み・取り消し）。消せたら true、対象が無ければ false */
  delete(id: string): Promise<boolean>;
}
