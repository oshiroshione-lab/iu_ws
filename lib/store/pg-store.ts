// 用語データを共有DB(PostgreSQL, スキーマ knowledge_ws)に保存する実装。
// JsonTermRepository と同じ TermRepository を満たす。index.ts が DATABASE_URL の有無で選ぶ。
import { randomUUID } from "node:crypto";
import type { Term, NewTermData, TermPatch, TermComment, ImageStatus } from "@/lib/types";
import { normalizeForSearch } from "@/lib/terms";
import type { TermRepository } from "./repository";
import { getPool, asStr, asStrArray, asIso, asIsoOrNull } from "./db";

function rowToTerm(r: Record<string, unknown>): Term {
  return {
    id: asStr(r.id),
    word: asStr(r.word),
    description: asStr(r.description),
    relatedWords: asStrArray(r.related_words),
    tags: asStrArray(r.tags),
    imageUrl: r.image_url == null ? null : asStr(r.image_url),
    imageStatus: (asStr(r.image_status) || "none") as ImageStatus,
    verifiedBy: r.verified_by == null ? null : asStr(r.verified_by),
    verifiedAt: asIsoOrNull(r.verified_at),
    likedBy: asStrArray(r.liked_by),
    comments: Array.isArray(r.comments) ? (r.comments as TermComment[]) : [],
    createdBy: asStr(r.created_by),
    createdAt: asIso(r.created_at),
    updatedAt: asIso(r.updated_at),
  };
}

/** 新しい順（登録日時の降順） */
function sortNewest(terms: Term[]): Term[] {
  return [...terms].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export class PgTermRepository implements TermRepository {
  async list(): Promise<Term[]> {
    const r = await getPool().query("SELECT * FROM knowledge_ws.terms ORDER BY created_at DESC");
    return r.rows.map(rowToTerm);
  }

  async search(query: string): Promise<Term[]> {
    const q = normalizeForSearch(query);
    if (q === "") return this.list();
    const all = await this.list();
    const hit = all.filter((t) => {
      const fields = [t.word, t.description, ...t.relatedWords, ...t.tags];
      return fields.some((f) => normalizeForSearch(f).includes(q));
    });
    return sortNewest(hit);
  }

  async get(id: string): Promise<Term | null> {
    const r = await getPool().query("SELECT * FROM knowledge_ws.terms WHERE id = $1", [id]);
    return r.rows[0] ? rowToTerm(r.rows[0]) : null;
  }

  async create(data: NewTermData): Promise<Term> {
    const id = randomUUID();
    const r = await getPool().query(
      `INSERT INTO knowledge_ws.terms
         (id,word,description,related_words,tags,image_url,image_status,verified_by,verified_at,liked_by,comments,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NULL,NULL,'{}','[]'::jsonb,$8)
       RETURNING *`,
      [id, data.word, data.description, data.relatedWords, data.tags, data.imageUrl, data.imageStatus, data.createdBy]
    );
    return rowToTerm(r.rows[0]);
  }

  async update(id: string, patch: TermPatch): Promise<Term | null> {
    const cur = await this.get(id);
    if (!cur) return null;
    const m: Term = { ...cur, ...patch };
    const r = await getPool().query(
      `UPDATE knowledge_ws.terms SET
         word=$2, description=$3, related_words=$4, tags=$5, image_url=$6, image_status=$7,
         verified_by=$8, verified_at=$9, liked_by=$10, comments=$11::jsonb, updated_at=now()
       WHERE id=$1 RETURNING *`,
      [id, m.word, m.description, m.relatedWords, m.tags, m.imageUrl, m.imageStatus,
       m.verifiedBy, m.verifiedAt, m.likedBy, JSON.stringify(m.comments)]
    );
    return r.rows[0] ? rowToTerm(r.rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const r = await getPool().query("DELETE FROM knowledge_ws.terms WHERE id = $1", [id]);
    return (r.rowCount ?? 0) > 0;
  }
}
