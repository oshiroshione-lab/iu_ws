import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/app/actions";

export const metadata: Metadata = {
  title: "私たちの辞書 — iUナレッジWS",
  description: "iUインターン3人で専門用語を共有する辞書アプリ",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <html lang="ja" className="h-full">
      <body className="flex min-h-full flex-col">
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-bold text-gray-900">
              📚 私たちの辞書
            </Link>
            {user && (
              <nav className="flex items-center gap-4 text-sm">
                <Link
                  href="/terms/new"
                  className="rounded-md bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700"
                >
                  ＋ 用語を登録
                </Link>
                <span className="text-gray-500">👤 {user}</span>
                <form action={logoutAction}>
                  <button type="submit" className="text-gray-500 hover:underline">
                    ログアウト
                  </button>
                </form>
              </nav>
            )}
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>

        <footer className="border-t border-gray-200 py-4 text-center text-xs text-gray-400">
          iUナレッジWS — チーム3人の辞書
        </footer>
      </body>
    </html>
  );
}
