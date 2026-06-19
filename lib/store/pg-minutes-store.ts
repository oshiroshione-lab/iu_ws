// 議事録データを共有DB(PostgreSQL, スキーマ knowledge_ws)に保存する実装。
// JsonMinutesRepository と同じ MinutesRepository を満たす。
import { randomUUID } from "node:crypto";
import type { Minute, NewMinuteData, MinutePatch } from "@/lib/types";
import type { MinutesRepository } from "./minutes-repository";
import { getPool, asStr, asIso } from "./db";

function rowToMinute(r: Record<string, unknown>): Minute {
  return {
    id: asStr(r.id),
    title: asStr(r.title),
    meetingDate: asStr(r.meeting_date),
    attendees: asStr(r.attendees),
    summary: asStr(r.summary),
    agenda: asStr(r.agenda),
    body: asStr(r.body),
    decisions: asStr(r.decisions),
    todos: asStr(r.todos),
    createdBy: asStr(r.created_by),
    createdAt: asIso(r.created_at),
    updatedAt: asIso(r.updated_at),
  };
}

export class PgMinutesRepository implements MinutesRepository {
  async list(): Promise<Minute[]> {
    const r = await getPool().query("SELECT * FROM knowledge_ws.minutes ORDER BY created_at DESC");
    return r.rows.map(rowToMinute);
  }

  async get(id: string): Promise<Minute | null> {
    const r = await getPool().query("SELECT * FROM knowledge_ws.minutes WHERE id = $1", [id]);
    return r.rows[0] ? rowToMinute(r.rows[0]) : null;
  }

  async create(data: NewMinuteData): Promise<Minute> {
    const id = randomUUID();
    const r = await getPool().query(
      `INSERT INTO knowledge_ws.minutes
         (id,title,meeting_date,attendees,summary,agenda,body,decisions,todos,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [id, data.title, data.meetingDate, data.attendees, data.summary,
       data.agenda, data.body, data.decisions, data.todos, data.createdBy]
    );
    return rowToMinute(r.rows[0]);
  }

  async update(id: string, patch: MinutePatch): Promise<Minute | null> {
    const cur = await this.get(id);
    if (!cur) return null;
    const m: Minute = { ...cur, ...patch };
    const r = await getPool().query(
      `UPDATE knowledge_ws.minutes SET
         title=$2, meeting_date=$3, attendees=$4, summary=$5, agenda=$6, body=$7,
         decisions=$8, todos=$9, updated_at=now()
       WHERE id=$1 RETURNING *`,
      [id, m.title, m.meetingDate, m.attendees, m.summary, m.agenda, m.body, m.decisions, m.todos]
    );
    return r.rows[0] ? rowToMinute(r.rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const r = await getPool().query("DELETE FROM knowledge_ws.minutes WHERE id = $1", [id]);
    return (r.rowCount ?? 0) > 0;
  }
}
