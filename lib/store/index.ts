// 「いま使う保管庫」をここで1つだけ決めて配る。
//
// 画面やAPIは `import { termRepository, minutesRepository } from "@/lib/store"` だけを使う。
// DB（Supabase 等）に決まったら、下の new Json... を新しい実装に差し替えるだけでよい。

import type { TermRepository } from "./repository";
import { JsonTermRepository } from "./json-store";
import type { MinutesRepository } from "./minutes-repository";
import { JsonMinutesRepository } from "./json-minutes-store";
import type { RequestRepository } from "./request-repository";
import { JsonRequestRepository } from "./json-request-store";

export const termRepository: TermRepository = new JsonTermRepository();
export const minutesRepository: MinutesRepository = new JsonMinutesRepository();
export const requestRepository: RequestRepository = new JsonRequestRepository();

export type { TermRepository };
export type { MinutesRepository };
export type { RequestRepository };
