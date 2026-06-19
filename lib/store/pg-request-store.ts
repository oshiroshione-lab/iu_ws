// 用語リクエストを共有DB(PostgreSQL, スキーマ knowledge_ws)に保存する実装。
// JsonRequestRepository と同じ RequestRepository を満たす。
import { randomUUID } from "node:crypto";
import type { TermRequest, NewTermRequestData } from "@/lib/types";
import type { RequestRepository } from "./request-repository";
import { getPool, asStr, asIso } from "./db";

function rowToRequest(r: Record<string, unknown>): TermRequest {
  return {
    id: asStr(r.id),
    word: asStr(r.word),
    note: asStr(r.note),
    createdBy: asStr(r.created_by),
    createdAt: asIso(r.created_at),
  };
}

export class PgRequestRepository implements RequestRepository {
  async list(): Promise<TermRequest[]> {
    const r = await getPool().query("SELECT * FROM knowledge_ws.requests ORDER BY created_at DESC");
    return r.rows.map(rowToRequest);
  }

  async create(data: NewTermRequestData): Promise<TermRequest> {
    const id = randomUUID();
    const r = await getPool().query(
      `INSERT INTO knowledge_ws.requests (id,word,note,created_by)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [id, data.word, data.note, data.createdBy]
    );
    return rowToRequest(r.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const r = await getPool().query("DELETE FROM knowledge_ws.requests WHERE id = $1", [id]);
    return (r.rowCount ?? 0) > 0;
  }
}
