// 共有DB(PostgreSQL)への接続プールと、行→オブジェクト変換の小道具。
// 接続文字列は環境変数 DATABASE_URL（ローカル=Auth Proxy / 本番=Cloud Run のソケット）。
// DATABASE_URL が無い環境では使わない（index.ts が JSON 実装を選ぶ＝持ち帰り/オフライン対応）。
import { Pool } from "pg";

let pool: Pool | null = null;

/** 接続プール（1プロセスで使い回す） */
export function getPool(): Pool {
  if (!pool) {
    // DATABASE_URL があればそれを、無ければ PGHOST/PGUSER/PGPASSWORD/PGDATABASE 等の
    // 個別の環境変数を使う（記号の多いパスワードを URL エンコードせずに済む）。
    pool = new Pool(
      process.env.DATABASE_URL ? { connectionString: process.env.DATABASE_URL } : {}
    );
  }
  return pool;
}

// --- DB行の値を、アプリの型に合わせて安全に変換する小道具 ---
export function asStr(v: unknown): string {
  return v == null ? "" : String(v);
}
export function asStrArray(v: unknown): string[] {
  return Array.isArray(v) ? (v.filter((x) => typeof x === "string") as string[]) : [];
}
/** timestamptz(Date) → ISO文字列。空なら ""。 */
export function asIso(v: unknown): string {
  return v ? new Date(v as string | Date).toISOString() : "";
}
/** timestamptz(Date) → ISO文字列 or null。 */
export function asIsoOrNull(v: unknown): string | null {
  return v ? new Date(v as string | Date).toISOString() : null;
}
