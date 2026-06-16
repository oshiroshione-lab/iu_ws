// AIが作ったイラスト（Base64のPNG）を、ブラウザから見られる場所に保存する。
//
// 暫定対応: いまは public/generated/ に画像ファイルとして置く（このフォルダは
//   .gitignore で共有しない）。DBや画像ストレージ（Supabase Storage 等）が
//   決まったら、ここをアップロード処理に差し替える。
//
// 配信について（重要）: 本番（next start）では public/ がビルド時点で固定されるため、
//   ビルド後に保存した画像を /generated/xxx.png で直接配信すると 404 になる。
//   そこで配信は app/illustrations/[id]/route.ts のルートハンドラ経由で行い、
//   ここではそのハンドラ向けのURL（/illustrations/xxx）を返す。

import { promises as fs } from "node:fs";
import path from "node:path";

const GENERATED_DIR = path.join(process.cwd(), "public", "generated");

/**
 * Base64のPNGを保存して、ブラウザ用のURL（例: /illustrations/xxx?v=123）を返す。
 * 配信はルートハンドラ（app/illustrations/[id]）がディスクから読んで行う。
 * 末尾の ?v= は、作り直したときに古い画像がキャッシュで残らないようにするため。
 */
export async function saveGeneratedImage(id: string, base64: string): Promise<string> {
  await fs.mkdir(GENERATED_DIR, { recursive: true });
  const filePath = path.join(GENERATED_DIR, `${id}.png`);
  await fs.writeFile(filePath, Buffer.from(base64, "base64"));
  return `/illustrations/${id}?v=${Date.now()}`;
}

/** 用語を削除したときに、対応するイラストファイルも消す（無くてもエラーにしない） */
export async function deleteGeneratedImage(id: string): Promise<void> {
  try {
    await fs.unlink(path.join(GENERATED_DIR, `${id}.png`));
  } catch {
    // ファイルが無い場合などは何もしない
  }
}
