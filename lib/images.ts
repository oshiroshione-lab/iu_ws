// AIが作ったイラスト（Base64のPNG）を、ブラウザから見られる場所に保存する。
//
// 暫定対応: いまは public/generated/ に画像ファイルとして置く（このフォルダは
//   .gitignore で共有しない）。DBや画像ストレージ（Supabase Storage 等）が
//   決まったら、ここをアップロード処理に差し替える。

import { promises as fs } from "node:fs";
import path from "node:path";

const GENERATED_DIR = path.join(process.cwd(), "public", "generated");

/**
 * Base64のPNGを保存して、ブラウザ用のURL（例: /generated/xxx.png?v=123）を返す。
 * 末尾の ?v= は、作り直したときに古い画像がキャッシュで残らないようにするため。
 */
export async function saveGeneratedImage(id: string, base64: string): Promise<string> {
  await fs.mkdir(GENERATED_DIR, { recursive: true });
  const filePath = path.join(GENERATED_DIR, `${id}.png`);
  await fs.writeFile(filePath, Buffer.from(base64, "base64"));
  return `/generated/${id}.png?v=${Date.now()}`;
}

/** 用語を削除したときに、対応するイラストファイルも消す（無くてもエラーにしない） */
export async function deleteGeneratedImage(id: string): Promise<void> {
  try {
    await fs.unlink(path.join(GENERATED_DIR, `${id}.png`));
  } catch {
    // ファイルが無い場合などは何もしない
  }
}
