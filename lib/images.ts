// AIが作ったイラスト（Base64のPNG）を保存・取得する。
//
// 保存先は環境変数 ASSETS_BUCKET で切り替える:
//   - ASSETS_BUCKET あり（本番/クラウド）: Google Cloud Storage に保存。
//     Cloud Run はディスクが揮発性（再起動・スケールで消える）ため、画像はGCSに置く。
//   - ASSETS_BUCKET なし（ローカル開発・持ち帰り）: 従来どおり public/generated/ に保存。
//
// 配信は app/illustrations/[id]/route.ts が readGeneratedImage() で読んで返す。
// 画面側は term.imageUrl（/illustrations/xxx）をそのまま使う（保存先が変わっても無変更）。

import { promises as fs } from "node:fs";
import path from "node:path";
import type { Bucket } from "@google-cloud/storage";

const GENERATED_DIR = path.join(process.cwd(), "public", "generated");
const BUCKET_NAME = process.env.ASSETS_BUCKET || "";
const OBJECT_PREFIX = "knowledge_ws/illustrations";

let _bucket: Bucket | null = null;
async function getBucket(): Promise<Bucket> {
  if (!_bucket) {
    const { Storage } = await import("@google-cloud/storage");
    _bucket = new Storage().bucket(BUCKET_NAME);
  }
  return _bucket;
}

function objectName(id: string): string {
  return `${OBJECT_PREFIX}/${id}.png`;
}

export async function saveGeneratedImage(id: string, base64: string): Promise<string> {
  const buf = Buffer.from(base64, "base64");
  if (BUCKET_NAME) {
    await (await getBucket()).file(objectName(id)).save(buf, {
      contentType: "image/png",
      resumable: false,
    });
  } else {
    await fs.mkdir(GENERATED_DIR, { recursive: true });
    await fs.writeFile(path.join(GENERATED_DIR, `${id}.png`), buf);
  }
  return `/illustrations/${id}?v=${Date.now()}`;
}

export async function readGeneratedImage(id: string): Promise<Buffer | null> {
  try {
    if (BUCKET_NAME) {
      const [buf] = await (await getBucket()).file(objectName(id)).download();
      return buf;
    }
    return await fs.readFile(path.join(GENERATED_DIR, `${id}.png`));
  } catch {
    return null;
  }
}

export async function deleteGeneratedImage(id: string): Promise<void> {
  try {
    if (BUCKET_NAME) {
      await (await getBucket()).file(objectName(id)).delete({ ignoreNotFound: true });
    } else {
      await fs.unlink(path.join(GENERATED_DIR, `${id}.png`));
    }
  } catch {
    // 無い場合などは何もしない
  }
}
