// 用語リクエストを「プロジェクト内のJSONファイル」に保存する実装。
//
// 用語・議事録の json-store と同じく、DB が決まるまでの“仮の保管庫”。
// プロジェクト直下の .data/requests.json に全件をためる（.data は .gitignore で共有しない）。
// 本番のクラウドではファイルが消えることがあるので、ローカル開発・動作確認用。

import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { TermRequest, NewTermRequestData } from "@/lib/types";
import type { RequestRepository } from "./request-repository";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "requests.json");

/** 保存ファイルの1件を、いまの TermRequest の形に整える（欠けた項目は既定値で補う）。 */
function normalizeRequest(raw: unknown): TermRequest {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    id: String(r.id ?? ""),
    word: String(r.word ?? ""),
    note: String(r.note ?? ""),
    createdBy: String(r.createdBy ?? ""),
    createdAt: String(r.createdAt ?? ""),
  };
}

async function readAll(): Promise<TermRequest[]> {
  try {
    const text = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed.map(normalizeRequest) : [];
  } catch {
    return [];
  }
}

async function writeAll(requests: TermRequest[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(requests, null, 2), "utf8");
}

function sortNewest(requests: TermRequest[]): TermRequest[] {
  return [...requests].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export class JsonRequestRepository implements RequestRepository {
  async list(): Promise<TermRequest[]> {
    return sortNewest(await readAll());
  }

  async create(data: NewTermRequestData): Promise<TermRequest> {
    const all = await readAll();
    const now = new Date().toISOString();
    const request: TermRequest = {
      id: randomUUID(),
      word: data.word,
      note: data.note,
      createdBy: data.createdBy,
      createdAt: now,
    };
    all.push(request);
    await writeAll(all);
    return request;
  }

  async delete(id: string): Promise<boolean> {
    const all = await readAll();
    const next = all.filter((r) => r.id !== id);
    if (next.length === all.length) return false;
    await writeAll(next);
    return true;
  }
}
