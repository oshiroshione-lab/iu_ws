import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import "./globals.css";
import { cn } from "@/lib/cn";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/app/actions";
import { computePricingSummary } from "@/lib/pricing";
import { buttonClasses } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CostMenu } from "@/components/CostMenu";
import { IllustrationNotifier } from "@/components/IllustrationNotifier";
import {
  BookIcon,
  PlusIcon,
  FileTextIcon,
  HelpCircleIcon,
} from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "私たちの辞書 — iUナレッジWS",
  description: "iUインターン3人で専門用語を共有する辞書アプリ",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [user, cookieStore] = await Promise.all([getCurrentUser(), cookies()]);
  // テーマは cookie で覚えておく。ここでクラスを決めるので、開いた瞬間のちらつきが出ない。
  const isDark = cookieStore.get("theme")?.value === "dark";

  return (
    <html lang="ja" className={cn("h-full", isDark && "dark")} suppressHydrationWarning>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
            <Link
              href="/"
              className="flex items-center gap-2 font-semibold tracking-tight text-foreground"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <BookIcon className="h-4 w-4" />
              </span>
              私たちの辞書
            </Link>

            <nav className="flex items-center gap-1 sm:gap-2">
              {user ? (
                <>
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
                  <ThemeToggle />
                  <span className="hidden items-center gap-1.5 px-2 text-sm text-muted-foreground md:inline-flex">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-medium text-secondary-foreground">
                      {user.slice(0, 1)}
                    </span>
                    {user}
                  </span>
                  <form action={logoutAction}>
                    <button
                      type="submit"
                      className={buttonClasses({ variant: "ghost", size: "sm" })}
                    >
                      ログアウト
                    </button>
                  </form>
                </>
              ) : (
                <ThemeToggle />
              )}
            </nav>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
          {children}
        </main>

        <footer className="border-t py-5 text-center text-xs text-muted-foreground">
          iUナレッジWS — チーム3人の辞書
        </footer>

        {/* ログイン中だけ、裏で作っているイラストの完成を通知する */}
        {user && <IllustrationNotifier />}
      </body>
    </html>
  );
}
