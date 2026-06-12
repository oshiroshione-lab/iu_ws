// 用語データを「プロジェクト内のJSONファイル」に保存する実装。
//
// これは DB が決まるまでの“仮の保管庫”。プロジェクト直下の .data/terms.json に
// 全件をためる（.data は .gitignore で共有しない）。
//
// 注意（暫定対応）:
//  - 本番のクラウド（Vercel など）ではファイルが消えることがあるので、これは
//    ローカル開発・動作確認用。DB（Supabase 等）が決まったら別実装に差し替える。
//  - 同時アクセスが激しいと競合しうるが、3人の小さな辞書なので当面は十分。

import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Term, NewTermData, TermPatch } from "@/lib/types";
import type { TermRepository } from "./repository";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "terms.json");

async function readAll(): Promise<Term[]> {
  try {
    const text = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? (parsed as Term[]) : [];
  } catch {
    // ファイルがまだ無い／壊れている場合は空とみなす
    return [];
  }
}

async function writeAll(terms: Term[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(terms, null, 2), "utf8");
}

/** 新しい順（登録日時の降順）に並べる */
function sortNewest(terms: Term[]): Term[] {
  return [...terms].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export class JsonTermRepository implements TermRepository {
  async list(): Promise<Term[]> {
    return sortNewest(await readAll());
  }

  async search(query: string): Promise<Term[]> {
    const q = query.trim().toLowerCase();
    if (q === "") return this.list();
    const all = await readAll();
    const hit = all.filter((t) => {
      const haystack = [t.word, t.description, ...t.relatedWords]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
    return sortNewest(hit);
  }

  async get(id: string): Promise<Term | null> {
    const all = await readAll();
    return all.find((t) => t.id === id) ?? null;
  }

  async create(data: NewTermData): Promise<Term> {
    const all = await readAll();
    const now = new Date().toISOString();
    const term: Term = {
      id: randomUUID(),
      word: data.word,
      description: data.description,
      relatedWords: data.relatedWords,
      imageUrl: data.imageUrl,
      imageStatus: data.imageStatus,
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
    };
    all.push(term);
    await writeAll(all);
    return term;
  }

  async update(id: string, patch: TermPatch): Promise<Term | null> {
    const all = await readAll();
    const index = all.findIndex((t) => t.id === id);
    if (index === -1) return null;
    const updated: Term = {
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
    const next = all.filter((t) => t.id !== id);
    if (next.length === all.length) return false;
    await writeAll(next);
    return true;
  }
}
