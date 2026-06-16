"use client";

// タグの選択ボタン（チップ）。固定リスト（TAG_OPTIONS）から「1つだけ」選べる。
// もう一度押すと選択を外せる（タグなしにできる）。
// 選んだタグは hidden input（name="tags"）でフォーム送信されるので、
// Server Action 側は formData.getAll("tags") で受け取れる（0個か1個）。

import { useState } from "react";
import { TAG_OPTIONS } from "@/lib/tags";
import { cn } from "@/lib/cn";

export function TagPicker({
  name = "tags",
  defaultValue = [],
}: {
  name?: string;
  defaultValue?: string[];
}) {
  // 初期選択は、固定リストにある最初の1つだけ（大文字小文字は無視）。無ければ null。
  const [selected, setSelected] = useState<string | null>(
    () =>
      TAG_OPTIONS.find((opt) =>
        defaultValue.some((d) => d.trim().toLowerCase() === opt.toLowerCase()),
      ) ?? null,
  );

  // 同じものを押したら解除、違うものを押したら付け替え（=常に1つまで）。
  function pick(tag: string) {
    setSelected((cur) => (cur === tag ? null : tag));
  }

  return (
    <div className="flex flex-wrap gap-2">
      {/* 選んだタグをフォーム送信するための隠しフィールド（選択なしなら送らない） */}
      {selected && <input type="hidden" name={name} value={selected} />}
      {TAG_OPTIONS.map((tag) => {
        const on = selected === tag;
        return (
          <button
            key={tag}
            type="button"
            onClick={() => pick(tag)}
            aria-pressed={on}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              on
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}
