"use client";

// 見た目のプリセット（クラシック⇔ワイド）をワンボタンで切り替える。
//
// しくみ（テーマ切替と同じ考え方）:
//  - 押すと選択を cookie(design) に1年保存する。
//  - そのうえで router.refresh() を呼び、サーバー側のコンポーネントを読み直す。
//    → 幅（中央寄せ／全幅）も、列数ボタンの形（数字／＋−）も一度に切り替わる。
//  - 次に開いたときも cookie を読んで最初から正しい見た目になる。

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClasses } from "@/components/ui/Button";
import { MaximizeIcon, MinimizeIcon } from "@/components/ui/icons";
import type { DesignPreset } from "@/lib/design";

export function DesignToggle({ initial }: { initial: DesignPreset }) {
  const router = useRouter();
  const [design, setDesign] = useState<DesignPreset>(initial);
  const isWide = design === "wide";

  function toggle() {
    const next: DesignPreset = isWide ? "classic" : "wide";
    setDesign(next); // ボタンの絵をすぐ切り替える（待たせない）
    document.cookie = `design=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh(); // サーバー側を読み直して、幅とボタンの形を実際に切り替える
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={
        isWide
          ? "クラシック表示（中央寄せ）に切り替える"
          : "ワイド表示（横幅いっぱい）に切り替える"
      }
      title={isWide ? "クラシック表示にする" : "ワイド表示にする"}
      className={buttonClasses({ variant: "ghost", size: "icon" })}
    >
      {isWide ? (
        <MinimizeIcon className="h-5 w-5" />
      ) : (
        <MaximizeIcon className="h-5 w-5" />
      )}
    </button>
  );
}
