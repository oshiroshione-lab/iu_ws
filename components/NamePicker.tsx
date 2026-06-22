"use client";

// ヘッダーに置く「あなたの名前」の表示＆変更ボタン。
// ログイン（壁）の代わり。クリックすると名前を入力でき、ブラウザに覚えておく。
// 登録・いいね・コメントには、ここで決めた名前が記名として使われる。

import { useState } from "react";
import { useMe } from "@/components/MeProvider";
import { cn } from "@/lib/cn";
import { Input } from "@/components/ui/Input";
import { buttonClasses } from "@/components/ui/Button";

export function NamePicker() {
  const { me, setMe, ready } = useMe();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  function open() {
    setDraft(me);
    setEditing(true);
  }

  function save() {
    setMe(draft);
    setEditing(false);
  }

  // 初回（localStorage 読み込み前）は中身を出さず、ちらつきを防ぐ。
  if (!ready) {
    return <span className="px-2 text-sm text-muted-foreground">…</span>;
  }

  if (editing) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="flex items-center gap-1.5"
      >
        <Input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setEditing(false);
          }}
          placeholder="あなたの名前"
          autoComplete="off"
          autoFocus
          className="h-8 w-28 text-sm"
        />
        <button type="submit" className={buttonClasses({ variant: "primary", size: "sm" })}>
          保存
        </button>
      </form>
    );
  }

  return (
    <button
      type="button"
      onClick={open}
      title="名前を変える"
      className={cn(buttonClasses({ variant: "ghost", size: "sm" }), "gap-1.5")}
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-medium text-secondary-foreground">
        {me ? me.slice(0, 1) : "?"}
      </span>
      <span className="text-sm text-muted-foreground">
        {me || "名前を入れる"}
      </span>
    </button>
  );
}
