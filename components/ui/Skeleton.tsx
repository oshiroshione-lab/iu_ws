// スケルトン（読み込み中の“仮の四角”）。
// AIが生成している間、完成後のレイアウトを先に薄く見せて「これから出てくる」と予感させる。

import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Skeleton({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-shimmer rounded-md bg-muted", className)}
      {...rest}
    />
  );
}
