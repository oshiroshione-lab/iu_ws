// 「いま使う保管庫」をここで1つだけ決めて配る。
//
// 画面やAPIは `import { termRepository, minutesRepository } from "@/lib/store"` だけを使う。
// DB（Supabase 等）に決まったら、下の new Json... を新しい実装に差し替えるだけでよい。

import type { TermRepository } from "./repository";
import { JsonTermRepository } from "./json-store";
import { PgTermRepository } from "./pg-store";
import type { MinutesRepository } from "./minutes-repository";
import { JsonMinutesRepository } from "./json-minutes-store";
import { PgMinutesRepository } from "./pg-minutes-store";
import type { RequestRepository } from "./request-repository";
import { JsonRequestRepository } from "./json-request-store";
import { PgRequestRepository } from "./pg-request-store";

// DATABASE_URL か、個別の PG* 接続変数(PGDATABASE/PGHOST)があれば共有DB(PostgreSQL)を、
// どちらも無ければローカルJSONを使う。
// → 本番(Cloud Run)やDB接続時はDB、手元のオフライン/持ち帰り時はJSON、と自動で切り替わる。
const useDb = !!(
  process.env.DATABASE_URL ||
  process.env.PGDATABASE ||
  process.env.PGHOST
);

export const termRepository: TermRepository = useDb
  ? new PgTermRepository()
  : new JsonTermRepository();
export const minutesRepository: MinutesRepository = useDb
  ? new PgMinutesRepository()
  : new JsonMinutesRepository();
export const requestRepository: RequestRepository = useDb
  ? new PgRequestRepository()
  : new JsonRequestRepository();

export type { TermRepository };
export type { MinutesRepository };
export type { RequestRepository };
