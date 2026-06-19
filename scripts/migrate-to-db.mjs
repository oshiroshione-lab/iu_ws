// ナレッジWS の .data/*.json を共有DB(PostgreSQL, スキーマ=knowledge_ws)へ移行する。
// 一回限り想定だが冪等（ON CONFLICT で再実行しても重複しない）。
//
// 接続は環境変数で渡す（パスワードはこのファイルに書かない）:
//   方法A) Cloud SQL Auth Proxy 経由（推奨。127.0.0.1:5432）
//     PGHOST=127.0.0.1 PGPORT=5432 PGUSER=postgres PGPASSWORD=*** PGDATABASE=iu_platform node scripts/migrate-to-db.mjs
//   方法B) DATABASE_URL を使う
//     DATABASE_URL=postgresql://postgres:***@127.0.0.1:5432/iu_platform node scripts/migrate-to-db.mjs
//
// 事前に: npm install pg
import { readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const DATA_DIR = path.join(process.cwd(), ".data");

async function readJsonArray(name) {
  try {
    const txt = await readFile(path.join(DATA_DIR, name), "utf8");
    const v = JSON.parse(txt);
    return Array.isArray(v) ? v : [];
  } catch (e) {
    if (e && e.code === "ENOENT") return []; // ファイルが無ければ空
    throw e;
  }
}

// ISO文字列 → Date。空文字/未定義は null。
function tsOrNull(v) {
  return v ? new Date(v) : null;
}

const DDL = `
CREATE SCHEMA IF NOT EXISTS knowledge_ws;

CREATE TABLE IF NOT EXISTS knowledge_ws.terms (
  id            TEXT PRIMARY KEY,
  word          TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  related_words TEXT[] NOT NULL DEFAULT '{}',
  tags          TEXT[] NOT NULL DEFAULT '{}',
  image_url     TEXT,
  image_status  TEXT NOT NULL DEFAULT 'none',
  verified_by   TEXT,                          -- 確認した人の「名前」
  verified_at   TIMESTAMPTZ,
  liked_by      TEXT[] NOT NULL DEFAULT '{}',  -- いいねした人の「名前」
  comments      JSONB NOT NULL DEFAULT '[]',   -- [{id,by,text,at}]
  created_by    TEXT NOT NULL DEFAULT '',      -- 登録した人の「名前」
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS knowledge_ws.minutes (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL DEFAULT '',
  meeting_date TEXT NOT NULL DEFAULT '',
  attendees    TEXT NOT NULL DEFAULT '',
  summary      TEXT NOT NULL DEFAULT '',
  agenda       TEXT NOT NULL DEFAULT '',
  body         TEXT NOT NULL DEFAULT '',
  decisions    TEXT NOT NULL DEFAULT '',
  todos        TEXT NOT NULL DEFAULT '',
  created_by   TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS knowledge_ws.requests (
  id         TEXT PRIMARY KEY,
  word       TEXT NOT NULL,
  note       TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

async function main() {
  const { Client } = pg;
  // DATABASE_URL があればそれを、無ければ個別 PG* 環境変数を使用。
  const client = process.env.DATABASE_URL
    ? new Client({ connectionString: process.env.DATABASE_URL })
    : new Client();
  await client.connect();
  await client.query(DDL);

  const terms = await readJsonArray("terms.json");
  const minutes = await readJsonArray("minutes.json");
  const requests = await readJsonArray("requests.json");

  for (const x of terms) {
    await client.query(
      `INSERT INTO knowledge_ws.terms
         (id,word,description,related_words,tags,image_url,image_status,
          verified_by,verified_at,liked_by,comments,created_by,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (id) DO UPDATE SET
         word=EXCLUDED.word, description=EXCLUDED.description, related_words=EXCLUDED.related_words,
         tags=EXCLUDED.tags, image_url=EXCLUDED.image_url, image_status=EXCLUDED.image_status,
         verified_by=EXCLUDED.verified_by, verified_at=EXCLUDED.verified_at, liked_by=EXCLUDED.liked_by,
         comments=EXCLUDED.comments, created_by=EXCLUDED.created_by, updated_at=EXCLUDED.updated_at`,
      [x.id, x.word ?? "", x.description ?? "", x.relatedWords ?? [], x.tags ?? [],
       x.imageUrl ?? null, x.imageStatus ?? "none", x.verifiedBy ?? null, tsOrNull(x.verifiedAt),
       x.likedBy ?? [], JSON.stringify(x.comments ?? []), x.createdBy ?? "",
       tsOrNull(x.createdAt) ?? new Date(), tsOrNull(x.updatedAt) ?? new Date()]
    );
  }

  for (const x of minutes) {
    await client.query(
      `INSERT INTO knowledge_ws.minutes
         (id,title,meeting_date,attendees,summary,agenda,body,decisions,todos,created_by,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id) DO UPDATE SET
         title=EXCLUDED.title, meeting_date=EXCLUDED.meeting_date, attendees=EXCLUDED.attendees,
         summary=EXCLUDED.summary, agenda=EXCLUDED.agenda, body=EXCLUDED.body,
         decisions=EXCLUDED.decisions, todos=EXCLUDED.todos, created_by=EXCLUDED.created_by,
         updated_at=EXCLUDED.updated_at`,
      [x.id, x.title ?? "", x.meetingDate ?? "", x.attendees ?? "", x.summary ?? "", x.agenda ?? "",
       x.body ?? "", x.decisions ?? "", x.todos ?? "", x.createdBy ?? "",
       tsOrNull(x.createdAt) ?? new Date(), tsOrNull(x.updatedAt) ?? new Date()]
    );
  }

  for (const x of requests) {
    await client.query(
      `INSERT INTO knowledge_ws.requests (id,word,note,created_by,created_at)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (id) DO UPDATE SET word=EXCLUDED.word, note=EXCLUDED.note, created_by=EXCLUDED.created_by`,
      [x.id, x.word ?? "", x.note ?? "", x.createdBy ?? "", tsOrNull(x.createdAt) ?? new Date()]
    );
  }

  const counts = await client.query(
    `SELECT (SELECT count(*) FROM knowledge_ws.terms)    AS terms,
            (SELECT count(*) FROM knowledge_ws.minutes)  AS minutes,
            (SELECT count(*) FROM knowledge_ws.requests) AS requests`
  );
  console.log("読み込んだ件数:", { terms: terms.length, minutes: minutes.length, requests: requests.length });
  console.log("DBの現在件数 :", counts.rows[0]);
  await client.end();
}

main().catch((e) => { console.error("移行エラー:", e); process.exit(1); });
