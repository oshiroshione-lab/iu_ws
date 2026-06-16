"use client";

// アプリ内通知：裏で作っているイラストが完成（または失敗）したら、画面の右下に知らせる。
//
// しくみ:
//  - 数秒ごとにサーバーへ「いま生成中の用語」と「見張っている用語のうち終わったもの」を聞く。
//  - 生成中の用語は自動で見張りリストに足す（登録直後のものも拾える）。
//  - 終わったものはトースト（小さな通知）で知らせ、見張りリストから外す。
//  - 完成したら router.refresh() で、いま開いている画面のデータも最新（イラスト表示）に更新する。
//  - 見張りリストは localStorage に保存。ページを再読み込みしても通知を取りこぼさない。

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { pollIllustrationsAction } from "@/app/actions";
import { CheckCircleIcon, ImageIcon, XIcon } from "@/components/ui/icons";

const STORAGE_KEY = "iukw:watch-illustrations";
const POLL_INTERVAL_MS = 5000;
const TOAST_TTL_MS = 9000;

type Toast = { id: string; word: string; status: "ok" | "failed" };

function loadWatched(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

export function IllustrationNotifier() {
  const router = useRouter();
  const watchedRef = useRef<Set<string>>(new Set());
  const inFlightRef = useRef(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((cur) => cur.filter((t) => t.id !== id));
  }, []);

  const persist = useCallback(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([...watchedRef.current]),
      );
    } catch {
      // localStorage が使えない環境でも通知の主機能は動くので、保存失敗は無視
    }
  }, []);

  useEffect(() => {
    watchedRef.current = loadWatched();

    let cancelled = false;

    async function poll() {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        const { generating, finished } = await pollIllustrationsAction([
          ...watchedRef.current,
        ]);
        if (cancelled) return;

        // 生成中の用語は見張りに加える（登録直後のものも拾う）
        for (const g of generating) watchedRef.current.add(g.id);

        if (finished.length > 0) {
          for (const f of finished) watchedRef.current.delete(f.id);
          setToasts((cur) => {
            const exists = new Set(cur.map((t) => t.id));
            const add = finished
              .filter((f) => !exists.has(f.id))
              .map((f) => ({ id: f.id, word: f.word, status: f.status }));
            return [...cur, ...add].slice(-4);
          });
          // 完成したイラストを、いま開いている画面にも反映する
          router.refresh();
        }
        persist();
      } catch {
        // 通信エラーなどは次回のポーリングで取り戻すので、ここでは黙って待つ
      } finally {
        inFlightRef.current = false;
      }
    }

    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [router, persist]);

  // 各トーストは一定時間で自動的に消える
  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((t) =>
      setTimeout(() => dismiss(t.id), TOAST_TTL_MS),
    );
    return () => timers.forEach(clearTimeout);
  }, [toasts, dismiss]);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
      role="region"
      aria-label="お知らせ"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          aria-live="polite"
          className="flex animate-fade-in items-start gap-3 rounded-xl border bg-popover p-3 text-popover-foreground shadow-lg"
        >
          {t.status === "ok" ? (
            <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          ) : (
            <ImageIcon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          )}
          <div className="min-w-0 flex-1">
            {t.status === "ok" ? (
              <p className="text-sm">
                <Link
                  href={`/terms/${t.id}`}
                  onClick={() => dismiss(t.id)}
                  className="font-semibold text-foreground underline-offset-2 hover:underline"
                >
                  {t.word}
                </Link>
                {" "}のイラストができました。
              </p>
            ) : (
              <p className="text-sm">
                「{t.word}」のイラストを作れませんでした（後でやり直せます）。
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            aria-label="閉じる"
            className="-mr-1 -mt-1 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
