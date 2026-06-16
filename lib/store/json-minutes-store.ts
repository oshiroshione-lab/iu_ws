// 議事録データを「プロジェクト内のJSONファイル」に保存する実装。
//
// 用語の json-store.ts と同じく、DB が決まるまでの“仮の保管庫”。
// プロジェクト直下の .data/minutes.json に全件をためる（.data は .gitignore で共有しない）。
// 本番のクラウドではファイルが消えることがあるので、ローカル開発・動作確認用。

import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Minute, NewMinuteData, MinutePatch } from "@/lib/types";
import type { MinutesRepository } from "./minutes-repository";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "minutes.json");

/** 保存ファイルの1件を、いまの Minute の形に整える（欠けた項目は既定値で補う＝後方互換）。 */
function normalizeMinute(raw: unknown): Minute {
  const m = (raw ?? {}) as Record<string, unknown>;
  return {
    id: String(m.id ?? ""),
    title: String(m.title ?? ""),
    meetingDate: typeof m.meetingDate === "string" ? m.meetingDate : "",
    attendees: typeof m.attendees === "string" ? m.attendees : "",
    agenda: typeof m.agenda === "string" ? m.agenda : "",
    body: String(m.body ?? ""),
    decisions: typeof m.decisions === "string" ? m.decisions : "",
    todos: typeof m.todos === "string" ? m.todos : "",
    createdBy: String(m.createdBy ?? ""),
    createdAt: String(m.createdAt ?? ""),
    updatedAt: String(m.updatedAt ?? ""),
  };
}

async function readAll(): Promise<Minute[]> {
  try {
    const text = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed.map(normalizeMinute) : [];
  } catch {
    return [];
  }
}

async function writeAll(minutes: Minute[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(minutes, null, 2), "utf8");
}

function sortNewest(minutes: Minute[]): Minute[] {
  return [...minutes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export class JsonMinutesRepository implements MinutesRepository {
  async list(): Promise<Minute[]> {
    return sortNewest(await readAll());
  }

  async get(id: string): Promise<Minute | null> {
    const all = await readAll();
    return all.find((m) => m.id === id) ?? null;
  }

  async create(data: NewMinuteData): Promise<Minute> {
    const all = await readAll();
    const now = new Date().toISOString();
    const minute: Minute = {
      id: randomUUID(),
      title: data.title,
      meetingDate: data.meetingDate,
      attendees: data.attendees,
      agenda: data.agenda,
      body: data.body,
      decisions: data.decisions,
      todos: data.todos,
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
    };
    all.push(minute);
    await writeAll(all);
    return minute;
  }

  async update(id: string, patch: MinutePatch): Promise<Minute | null> {
    const all = await readAll();
    const index = all.findIndex((m) => m.id === id);
    if (index === -1) return null;
    const updated: Minute = {
      ...all[index],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    all[index] = updated;
    await writeAll(all);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const all = await readAll();
    const next = all.filter((m) => m.id !== id);
    if (next.length === all.length) return false;
    await writeAll(next);
    return true;
  }
}
