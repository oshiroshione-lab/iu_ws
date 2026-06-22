"use client";

// フォームに「誰が操作したか（名前）」を一緒に送るための隠しフィールド。
// 登録・いいね・コメントなど、記名が要るフォームの中に置く。
// 名前は MeProvider（localStorage）から取る。未設定なら空のまま送られ、
// サーバー側（actorFrom）で「ゲスト」として扱われる。

import { useMe } from "@/components/MeProvider";

export function MeField() {
  const { me } = useMe();
  return <input type="hidden" name="by" value={me} />;
}
