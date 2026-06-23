import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import "./globals.css";
import { cn } from "@/lib/cn";
import { MeProvider } from "@/components/MeProvider";
import { NamePicker } from "@/components/NamePicker";
import { computePricingSummary } from "@/lib/pricing";
import { buttonClasses } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DesignToggle } from "@/components/DesignToggle";
import { toDesignPreset } from "@/lib/design";
import { CostMenu } from "@/components/CostMenu";
import { IllustrationNotifier } from "@/components/IllustrationNotifier";
import {
  BookIcon,
  PlusIcon,
  FileTextIcon,
  HelpCircleIcon,
} from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "IT用語集",
  description: "iUインターン3人で専門用語を共有する辞書アプリ",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  // テーマは cookie で覚えておく。ここでクラスを決めるので、開いた瞬間のちらつきが出ない。
  // 既定はダークモード。自分で「ライト」に切り替えたときだけ明るくする。
  const isDark = cookieStore.get("theme")?.value !== "light";
  // 見た目のプリセット（中央寄せのクラシック／横幅いっぱいのワイド）も cookie で覚える。
  const design = toDesignPreset(cookieStore.get("design")?.value);
  // クラシックは中央寄せ（max-w-5xl）、ワイドは横幅いっぱい＋画面幅に応じた余白。
  const headerInner =
    design === "classic"
      ? "mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4"
      : "flex h-14 w-full items-center justify-between gap-3 px-4 sm:px-6 lg:px-8";
  const mainClass =
    design === "classic"
      ? "mx-auto w-full max-w-5xl flex-1 px-4 py-8"
      : "w-full flex-1 px-4 py-8 sm:px-6 lg:px-8";

  return (
    <html lang="ja" className={cn("h-full", isDark && "dark")} suppressHydrationWarning>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <MeProvider>
        <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className={headerInner}>
            <Link
              href="/"
              className="flex items-center gap-2 font-semibold tracking-tight text-foreground"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <BookIcon className="h-4 w-4" />
              </span>
              IT用語集
            </Link>

            <nav className="flex items-center gap-1 sm:gap-2">
              <Link
                href="/requests"
                className={cn(
                  buttonClasses({ variant: "ghost", size: "sm" }),
                  "hidden text-muted-foreground sm:inline-flex",
                )}
              >
                <HelpCircleIcon className="h-4 w-4" />
                リクエスト
              </Link>
              <Link
                href="/minutes"
                className={cn(
                  buttonClasses({ variant: "ghost", size: "sm" }),
                  "hidden text-muted-foreground sm:inline-flex",
                )}
              >
                <FileTextIcon className="h-4 w-4" />
                議事録
              </Link>
              <Link
                href="/terms/new"
                className={buttonClasses({ variant: "primary", size: "sm" })}
              >
                <PlusIcon className="h-4 w-4" />
                用語を登録
              </Link>
              <CostMenu summary={computePricingSummary()} />
              <DesignToggle initial={design} />
              <ThemeToggle />
              <NamePicker />
            </nav>
          </div>
        </header>

        <main className={mainClass}>
          {children}
        </main>

        <footer className="border-t py-5 text-center text-xs text-muted-foreground">
          IT用語集 — チーム3人の辞書
        </footer>

        {/* 裏で作っているイラストの完成を通知する */}
        <IllustrationNotifier />
        </MeProvider>
      </body>
    </html>
  );
}
