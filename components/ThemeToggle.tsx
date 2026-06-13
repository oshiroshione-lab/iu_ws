"use client";

// ライト⇄ダークの切替ボタン。
//
// しくみ:
//  - <html> に dark クラスが付いているかで今のテーマを判断する。
//  - 押すと dark クラスを付け外しし、選択を cookie（theme）に1年保存する。
//  - 次に開いたときは layout.tsx が cookie を読んで最初から正しいテーマで表示する
//    （= サーバー側で決めるので、画面のちらつきが出ない）。

import { useEffect, useState } from "react";
import { buttonClasses } from "@/components/ui/Button";
import { MoonIcon, SunIcon } from "@/components/ui/icons";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    document.cookie = `theme=${next ? "dark" : "light"}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "ライトモードに切り替える" : "ダークモードに切り替える"}
      title={isDark ? "ライトモードにする" : "ダークモードにする"}
      className={buttonClasses({ variant: "ghost", size: "icon" })}
    >
      {/* マウント前は1つに固定（サーバーとクライアントで表示を合わせ、警告を防ぐ） */}
      {mounted && isDark ? (
        <SunIcon className="h-5 w-5" />
      ) : (
        <MoonIcon className="h-5 w-5" />
      )}
    </button>
  );
}
