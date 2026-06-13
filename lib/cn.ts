// クラス名を組み立てる小さな道具。
//
// 例: cn("rounded-md", isActive && "bg-primary", className)
//   → false/undefined/null は無視され、残った文字列をスペースでつなぐ。
//
// 外部ライブラリ（clsx 等）を足さずに済むよう、最小限の実装にしている。

export type ClassValue = string | number | false | null | undefined;

export function cn(...values: ClassValue[]): string {
  return values
    .filter((v): v is string | number => Boolean(v))
    .join(" ")
    .trim();
}
