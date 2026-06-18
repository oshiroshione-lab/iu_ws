"use client";

// 用語の検索バー（F-06）＋サジェスト。
// ・土台はふつうのHTMLフォーム（GET送信）。JavaScriptが無くても /?q=... で検索できる。
// ・JavaScriptが効くときは、入力に合わせて登録済み用語の候補を出す（サジェスト）。
//   候補は手元の一覧から絞り込むだけなので、APIも待ち時間も無く、すぐ出る。
//   候補をクリック／Enterで、その用語ページへ直接ジャンプできる。

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { SearchIcon } from "@/components/ui/icons";
import { matchTerms } from "@/lib/terms";

type TermLite = { id: string; word: string; tags: string[] };

export function SearchBar({
  defaultQuery = "",
  terms = [],
  hidden = {},
}: {
  defaultQuery?: string;
  terms?: TermLite[];
  /** 検索しても消えないよう、フォーム送信時に一緒に送る今の条件（タグ・並び順・表示）。 */
  hidden?: { tags?: string; sort?: string; view?: string };
}) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultQuery);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  // 用語名・タグから候補を絞り込む（前方一致を優先）
  const matches = matchTerms(terms, query, 8, true);
  const showList = open && matches.length > 0;

  // パネルの外側をクリックしたら閉じる
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function goToTerm(id: string) {
    setOpen(false);
    router.push(`/terms/${id}`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showList) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, -1));
    } else if (e.key === "Enter" && active >= 0) {
      // 候補を選んでいるときだけジャンプ。選んでいなければ通常の全文検索（フォーム送信）。
      e.preventDefault();
      goToTerm(matches[active].id);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative" ref={boxRef}>
      <form action="/" method="get" role="search">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          name="q"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          autoComplete="off"
          role="combobox"
          aria-expanded={showList}
          aria-controls="search-suggest-list"
          aria-autocomplete="list"
          placeholder="用語・説明・関連ワード・タグから検索…"
          aria-label="用語を検索"
          className="h-11 pl-10 pr-4"
        />
        {/* 検索しても今の絞り込み・並び順・表示が消えないよう、一緒に送る。 */}
        {hidden.tags && <input type="hidden" name="tags" value={hidden.tags} />}
        {hidden.sort && <input type="hidden" name="sort" value={hidden.sort} />}
        {hidden.view && <input type="hidden" name="view" value={hidden.view} />}
      </form>

      {showList && (
        <ul
          id="search-suggest-list"
          role="listbox"
          className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          {matches.map((t, i) => (
            <li key={t.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                // mousedown だと input の blur より先に動くので、クリックが確実に効く
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => goToTerm(t.id)}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${
                  i === active ? "bg-accent text-accent-foreground" : ""
                }`}
              >
                <SearchIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{t.word}</span>
                {t.tags.length > 0 && (
                  <span className="ml-auto truncate text-xs text-muted-foreground">
                    {t.tags.slice(0, 2).join(" / ")}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
