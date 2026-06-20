// AIが生成したイラスト画像を「配信」するためのルートハンドラ。
//
// 画像の実体は lib/images.ts が保存（ASSETS_BUCKET があれば Cloud Storage、無ければローカル）。
// ここはリクエストのたびに readGeneratedImage() で読んで返すだけ。保存先が変わっても
// 画面側（term.imageUrl=/illustrations/xxx）は無変更で済む。

import { readGeneratedImage } from "@/lib/images";

// ビルド時に固定（プリレンダリング）させず、必ずリクエスト時に実行する。
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await ctx.params;

  // 「../」などで想定外の場所を読まれないよう、用語のUUID（英数字とハイフン）以外は弾く。
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    return new Response("Not found", { status: 404 });
  }

  const data = await readGeneratedImage(id);
  if (!data) {
    // まだ生成中・生成に失敗した等で画像が無いときは 404。
    return new Response("Not found", { status: 404 });
  }

  return new Response(new Uint8Array(data), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      // URL末尾の ?v=（作り直すたびに変わる）が違えば別物扱いになるので、長めにキャッシュしてよい。
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
