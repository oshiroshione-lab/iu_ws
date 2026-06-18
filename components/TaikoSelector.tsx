"use client";

// 「太鼓の達人」の曲選び画面のような、用語の選択UI（F-05 の表示切替）。
// ・札（ふだ）を並べ、選んでいる札だけが大きく開いて説明などを見せる。
// ・orientation="horizontal" … 縦長の札を横一列に（札の文字は縦書き）。
//   orientation="vertical"   … 横長の帯を縦に積む（文字は横書き）。
// ・操作: 札をクリックで開く／開いている札をもう一度クリックで閉じる。
//   矢印キー（←→ または ↑↓）や左右(上下)の矢印ボタンでも移動できる。
//   開いている札の「開く →」または Enter で、その用語の詳細ページへ。
//
// 開閉のなめらかさ: 各札は「常に1つの要素」として置き、詳細部分だけを
//   ・縦並び … 高さ（CSSグリッドの 0fr→1fr）でなめらかに開閉
//   ・横並び … 幅（w-14→w-80）でなめらかに開閉
//   する。要素を作り替えないので、開くときも閉じるときもスッと動く。
// 色はアプリ共通のテーマ色だけを使う（選択中＝メインカラー／それ以外＝カードのグレー）。

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/Badge";
import {
  CheckCircleIcon,
  HeartIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "@/components/ui/icons";

/** 太鼓UIの札1枚に必要なぶんだけ用語データを軽くしたもの（画面に渡す形）。 */
export type PlateTerm = {
  id: string;
  word: string;
  description: string;
  tags: string[];
  imageUrl: string | null;
  verified: boolean;
  likeCount: number;
  createdBy: string;
  dateLabel: string;
  isNew: boolean;
};

// 札の見た目（テーマ色のみ）。選択中はメインカラーで目立たせ、それ以外は落ち着いたカード色。
const SELECTED_PLATE = "bg-primary text-primary-foreground shadow-lg";
const PLATE =
  "bg-card text-card-foreground border shadow-sm hover:bg-accent hover:text-accent-foreground";
// 開閉アニメの長さ（ミリ秒に合わせたTailwindクラス）。
const ANIM = "duration-300 ease-out";

export function TaikoSelector({
  terms,
  orientation,
}: {
  terms: PlateTerm[];
  orientation: "vertical" | "horizontal";
}) {
  const router = useRouter();
  const horizontal = orientation === "horizontal";
  // 開いている札の位置。null は「どれも開いていない（すべて閉じている）」状態。
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  // 並び替え・絞り込みで件数が変わったとき、開いている位置がはみ出さないようにする。
  useEffect(() => {
    setOpenIndex((i) =>
      i === null ? null : Math.min(i, Math.max(terms.length - 1, 0)),
    );
  }, [terms.length]);

  // 開いた札を中央へスクロールして見せる（閉じているときは何もしない）。
  useEffect(() => {
    if (openIndex === null) return;
    const el = itemRefs.current[openIndex];
    if (!el) return;
    el.scrollIntoView({
      behavior: "smooth",
      inline: horizontal ? "center" : "nearest",
      block: horizontal ? "nearest" : "center",
    });
  }, [openIndex, horizontal]);

  if (terms.length === 0) return null;

  // 矢印で移動するときは、移動先を必ず開く（閉じている状態からはまず先頭を開く）。
  const move = (delta: number) =>
    setOpenIndex((i) =>
      i === null ? 0 : Math.min(Math.max(i + delta, 0), terms.length - 1),
    );
  const open = (id: string) => router.push(`/terms/${id}`);
  // 同じ札をクリックしたら閉じる（null）、違う札なら開く。
  const toggle = (i: number) => setOpenIndex((cur) => (cur === i ? null : i));

  function onKeyDown(e: React.KeyboardEvent) {
    const prevKey = horizontal ? "ArrowLeft" : "ArrowUp";
    const nextKey = horizontal ? "ArrowRight" : "ArrowDown";
    if (e.key === prevKey) {
      e.preventDefault();
      move(-1);
    } else if (e.key === nextKey) {
      e.preventDefault();
      move(1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (openIndex === null) setOpenIndex(0);
      else open(terms[openIndex].id);
    }
  }

  const setRef = (i: number) => (el: HTMLElement | null) => {
    itemRefs.current[i] = el;
  };

  // 「開く →」ボタン（開いている札に付く。クリックしても札は閉じず、詳細ページへ進む）。
  function openLink(id: string, extra?: string) {
    return (
      <Link
        href={`/terms/${id}`}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "rounded-full bg-background px-3 py-1 text-xs font-bold text-foreground shadow transition-colors hover:bg-accent hover:text-accent-foreground",
          extra,
        )}
      >
        開く →
      </Link>
    );
  }

  // 説明の白いカード（画像＋説明文＋タグ）。dense=横並び用に少し小さく。
  function descCard(plate: PlateTerm, dense: boolean) {
    return (
      <div
        className={cn(
          "flex gap-3 rounded-xl bg-background p-3 text-foreground",
          dense && "gap-2 p-2",
        )}
      >
        {plate.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={plate.imageUrl}
            alt={`${plate.word}のイラスト`}
            className={cn(
              "shrink-0 rounded-lg object-cover",
              dense ? "h-14 w-14" : "h-16 w-16 sm:h-20 sm:w-20",
            )}
          />
        )}
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "leading-relaxed text-muted-foreground",
              dense ? "line-clamp-4 text-xs" : "line-clamp-3 text-sm",
            )}
          >
            {plate.description || "（説明はまだありません）"}
          </p>
          {plate.tags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {plate.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="accent">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 登録者・いいね・日付の小さな行。
  function metaRow(plate: PlateTerm) {
    return (
      <div className="mt-2 flex items-center gap-3 px-1 text-xs text-primary-foreground/80">
        {plate.likeCount > 0 && (
          <span className="inline-flex items-center gap-0.5">
            <HeartIcon className="h-3.5 w-3.5" />
            {plate.likeCount}
          </span>
        )}
        {plate.createdBy && <span>{plate.createdBy}</span>}
        {plate.dateLabel && <span>{plate.dateLabel}</span>}
      </div>
    );
  }

  function newBadge(selected: boolean) {
    return (
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
          selected
            ? "bg-primary-foreground text-primary"
            : "bg-primary text-primary-foreground",
        )}
      >
        NEW
      </span>
    );
  }

  const arrowBtn =
    "absolute z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border bg-background/90 text-foreground shadow-md backdrop-blur transition-colors hover:bg-accent disabled:opacity-40 disabled:hover:bg-background/90";

  // ── 横並び（縦長の札を横に。幅でなめらかに開閉） ───────────────
  if (horizontal) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => move(-1)}
          disabled={openIndex === 0}
          aria-label="前の用語へ"
          className={cn(arrowBtn, "left-1 top-1/2 -translate-y-1/2")}
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>

        <div
          tabIndex={0}
          onKeyDown={onKeyDown}
          role="listbox"
          aria-label="用語を横に並べた選択リスト"
          aria-orientation="horizontal"
          className="flex items-stretch gap-2 overflow-x-auto rounded-2xl border bg-muted/40 px-12 py-6 outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {terms.map((plate, i) => {
            const selected = i === openIndex;
            return (
              <div
                key={plate.id}
                ref={setRef(i)}
                role="option"
                aria-selected={selected}
                onClick={() => toggle(i)}
                title={selected ? "クリックで閉じる" : plate.word}
                className={cn(
                  "flex h-64 shrink-0 cursor-pointer overflow-hidden rounded-2xl transition-[width,background-color,color,box-shadow]",
                  ANIM,
                  selected ? cn(SELECTED_PLATE, "w-72 sm:w-80") : cn(PLATE, "w-14"),
                )}
              >
                {/* 縦書きの背表紙（常に見える＝札のタイトル） */}
                <div className="flex w-14 shrink-0 items-center justify-center">
                  <span className="max-h-56 overflow-hidden whitespace-nowrap text-base font-bold tracking-wide [writing-mode:vertical-rl]">
                    {plate.word}
                  </span>
                </div>

                {/* 詳細（開くと幅が広がって見える。閉じるときはスッと消える） */}
                <div
                  className={cn(
                    "flex min-w-0 flex-1 flex-col py-3 pr-3 transition-opacity",
                    ANIM,
                    selected ? "opacity-100" : "opacity-0",
                  )}
                >
                  <div className="flex items-center gap-1.5 px-1">
                    {plate.verified && (
                      <CheckCircleIcon className="h-5 w-5 shrink-0" aria-label="確認済み" />
                    )}
                    {plate.isNew && newBadge(true)}
                    {openLink(plate.id, "ml-auto")}
                  </div>
                  <div className="mt-2 flex-1 overflow-hidden">
                    {descCard(plate, true)}
                  </div>
                  {metaRow(plate)}
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => move(1)}
          disabled={openIndex === terms.length - 1}
          aria-label="次の用語へ"
          className={cn(arrowBtn, "right-1 top-1/2 -translate-y-1/2")}
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>

        <p className="mt-2 text-center text-xs text-muted-foreground">
          札をクリックで開く／もう一度クリックで閉じる。← → キーでも移動できます。
          {openIndex !== null && `（${openIndex + 1} / ${terms.length}）`}
        </p>
      </div>
    );
  }

  // ── 縦並び（横長の帯を縦に。高さでなめらかに開閉） ───────────────
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => move(-1)}
        disabled={openIndex === 0}
        aria-label="前の用語へ"
        className={cn(arrowBtn, "left-1/2 top-1 -translate-x-1/2")}
      >
        <ChevronUpIcon className="h-5 w-5" />
      </button>

      <div
        tabIndex={0}
        onKeyDown={onKeyDown}
        role="listbox"
        aria-label="用語を縦に積んだ選択リスト"
        aria-orientation="vertical"
        className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto rounded-2xl border bg-muted/40 px-3 py-10 outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {terms.map((plate, i) => {
          const selected = i === openIndex;
          return (
            <div
              key={plate.id}
              ref={setRef(i)}
              role="option"
              aria-selected={selected}
              onClick={() => toggle(i)}
              title={selected ? "クリックで閉じる" : plate.word}
              className={cn(
                "shrink-0 cursor-pointer overflow-hidden rounded-xl transition-[background-color,color,box-shadow]",
                ANIM,
                selected ? SELECTED_PLATE : PLATE,
              )}
            >
              {/* 見出し行（常に見える） */}
              <div className="flex items-center gap-2 px-4 py-3">
                <span className="truncate font-bold">{plate.word}</span>
                {plate.verified && (
                  <CheckCircleIcon className="h-4 w-4 shrink-0" aria-label="確認済み" />
                )}
                {plate.isNew && newBadge(selected)}
                {selected ? (
                  openLink(plate.id, "ml-auto")
                ) : plate.likeCount > 0 ? (
                  <span className="ml-auto inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                    <HeartIcon className="h-3.5 w-3.5" />
                    {plate.likeCount}
                  </span>
                ) : null}
              </div>

              {/* 詳細（開いたときだけ高さが出る。grid 0fr→1fr でなめらかに） */}
              <div
                className={cn(
                  "grid transition-[grid-template-rows]",
                  ANIM,
                  selected ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                )}
              >
                <div className="overflow-hidden">
                  <div
                    className={cn(
                      "px-3 pb-3 transition-opacity",
                      ANIM,
                      selected ? "opacity-100" : "opacity-0",
                    )}
                  >
                    {descCard(plate, false)}
                    {metaRow(plate)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => move(1)}
        disabled={openIndex === terms.length - 1}
        aria-label="次の用語へ"
        className={cn(arrowBtn, "bottom-1 left-1/2 -translate-x-1/2")}
      >
        <ChevronDownIcon className="h-5 w-5" />
      </button>

      <p className="mt-2 text-center text-xs text-muted-foreground">
        帯をクリックで開く／もう一度クリックで閉じる。↑ ↓ キーでも移動できます。
        {openIndex !== null && `（${openIndex + 1} / ${terms.length}）`}
      </p>
    </div>
  );
}
