// AIが生成したイラスト画像を「配信」するためのルートハンドラ。
//
// なぜ必要か（重要）:
//   本番モード（next start）の Next.js は、public/ フォルダの中身を「ビルドした時点の状態」で
//   配信する。そのため、ビルドより後にAIが作って public/generated/ に保存した画像は、
//   ファイルはディスクにあるのに配信されず 404 になってしまう。
//   （開発モード next dev では毎回ディスクから配信されるので、この問題に気づきにくい。）
//
//   そこで画像は public/ の静的配信に頼らず、この「リクエストのたびにディスクから読んで返す」
//   ハンドラ経由で配信する。これならビルドの前後に関係なく、いつ作った画像でも表示できる。
//   将来、画像の保存先がストレージ（Supabase 等）に変わっても、ここと lib/images.ts を
//   直すだけで済む（画面側は term.imageUrl をそのまま使うだけ）。

import { promises as fs } from "node:fs";
import path from "node:path";

// 画像の保存場所（lib/images.ts の保存先と必ず一致させる）。
const GENERATED_DIR = path.join(process.cwd(), "public", "generated");

// ビルド時に固定（プリレンダリング）させず、必ずリクエスト時に実行する。
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await ctx.params;

  // 「../」などでフォルダの外のファイルを読まれないよう、想定外の文字を含むidは弾く。
  // 画像idは用語のUUID（英数字とハイフン）なので、それ以外が混じっていたら 404。
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    return new Response("Not found", { status: 404 });
  }

  const filePath = path.join(GENERATED_DIR, `${id}.png`);
  try {
    const data = await fs.readFile(filePath);
    return new Response(new Uint8Array(data), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        // URL末尾の ?v=（作り直すたびに変わる）が違えば別物扱いになるので、長めにキャッシュしてよい。
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    // まだ生成中・生成に失敗した等でファイルが無いときは 404 を返す。
    return new Response("Not found", { status: 404 });
  }
}
