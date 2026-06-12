// 「いま使う保管庫」をここで1つだけ決めて配る。
//
// 画面やAPIは `import { termRepository } from "@/lib/store"` だけを使う。
// DB（Supabase 等）に決まったら、下の new JsonTermRepository() を
// 新しい実装（例: new SupabaseTermRepository()）に差し替えるだけでよい。

import type { TermRepository } from "./repository";
import { JsonTermRepository } from "./json-store";

export const termRepository: TermRepository = new JsonTermRepository();

export type { TermRepository };
