"use client";

// ヘッダーの「API料金の目安」メニュー。
// 普段は閉じていて（＝見えない）、コインのボタンを押すと料金の目安パネルが開く。
// 表示する数値は lib/pricing.ts が今の設定モデルから計算したもの（概算・参考）。

import { useEffect, useRef, useState } from "react";
import { buttonClasses } from "@/components/ui/Button";
import { CoinIcon } from "@/components/ui/icons";
import type { PricingSummary } from "@/lib/pricing";

function formatYen(value: number | null): string {
  if (value == null) return "—";
  return value < 10 ? `約${value.toFixed(1)}円` : `約${Math.round(value)}円`;
}

export function CostMenu({ summary }: { summary: PricingSummary }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // パネルの外側をクリックしたら閉じる
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="API料金の目安を表示"
        title="API料金の目安"
        className={buttonClasses({ variant: "ghost", size: "icon" })}
      >
        <CoinIcon className="h-5 w-5" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border bg-popover p-4 text-popover-foreground shadow-lg">
          <h3 className="text-sm font-semibold">API料金の目安</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            概算・¥{summary.exchangeRate}/$換算。実際の請求はAIの利用量で変わります。
          </p>

          <div className="mt-3 flex flex-col gap-1.5">
            {summary.perAction.map((a) => (
              <div
                key={a.label}
                className="flex items-baseline justify-between gap-2"
              >
                <span className="text-sm">
                  {a.label}
                  <span className="ml-1 text-xs text-muted-foreground">
                    {a.note}
                  </span>
                </span>
                <span className="text-sm font-semibold tabular-nums">
                  {formatYen(a.yen)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-col gap-2 border-t pt-3">
            <h4 className="text-xs font-medium text-muted-foreground">
              使用モデルと単価
            </h4>
            {summary.rates.map((r) => (
              <div key={r.name} className="text-xs">
                <div className="font-medium">{r.name}</div>
                <div className="text-muted-foreground">{r.detail}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
