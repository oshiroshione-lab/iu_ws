"use client";

// 用語の新規登録フォーム（F-01）＋サジェスト。
// 送信すると Server Action(createTermAction) が動き、AIが説明文・関連ワード・タグ・イラストを作る。
//
// サジェスト（入力補助）:
//  - 既存の辞書に一致する用語を出す（重複登録の防止。クリックでその用語ページへ）。
//  - 入力が止まったら、AIが「登録候補になりそうなIT用語名」を出す（クリックで入力欄に入る）。
//    料金最優先の方針に合わせ、AI呼び出しは「2文字以上・入力が止まってから・同じ語はキャッシュ」で抑える。
//
// 待ち時間のUX:
//  - 生成中は、完成後のレイアウト（イラスト・説明・関連ワード）を「スケルトン」で先に見せる。
//  - いま何をしているかの手順メッセージも順番に出す。

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createTermAction,
  suggestTermNamesAction,
  type FormState,
} from "@/app/actions";
import { matchTerms } from "@/lib/terms";
import { MeField } from "@/components/MeField";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { SparklesIcon, SearchIcon } from "@/components/ui/icons";

// 登録時に待つのは「説明文の作成」まで（イラストは登録後に裏で作る）。
// 進み具合の目安として順に表示する。
const STEPS = [
  "用語の意味を調べています…",
  "関連ワードを整理しています…",
  "比喩を使わないやさしい説明にまとめています…",
];

type TermLite = { id: string; word: string };

export function TermRegisterForm({
  defaultWord = "",
  existingTerms = [],
}: {
  defaultWord?: string;
  existingTerms?: TermLite[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    createTermAction,
    {},
  );
  const [step, setStep] = useState(0);

  // 用語名の入力（サジェストのため、状態として持つ）
  const [word, setWord] = useState(defaultWord);
  const [open, setOpen] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);
  const cacheRef = useRef<Map<string, string[]>>(new Map());
  const boxRef = useRef<HTMLDivElement>(null);

  const q = word.trim();
  const lower = q.toLowerCase();

  // 既存の辞書から一致する用語（重複防止）
  const existingMatches = matchTerms(existingTerms, q, 5);
  const exactExists = existingTerms.some((t) => t.word.toLowerCase() === lower);

  // 生成中だけ、手順メッセージを数秒ごとに進める
  useEffect(() => {
    if (!pending) {
      setStep(0);
      return;
    }
    const id = setInterval(
      () => setStep((s) => Math.min(s + 1, STEPS.length - 1)),
      4000,
    );
    return () => clearInterval(id);
  }, [pending]);

  // AI候補：入力が止まってから（600ms）呼ぶ。2文字未満・完全一致済みは呼ばない。同じ語はキャッシュ。
  useEffect(() => {
    if (q.length < 2 || exactExists) {
      setAiSuggestions([]);
      setLoadingAi(false);
      return;
    }
    const cached = cacheRef.current.get(lower);
    if (cached) {
      setAiSuggestions(cached);
      setLoadingAi(false);
      return;
    }
    let cancelled = false;
    setLoadingAi(true);
    const id = setTimeout(async () => {
      try {
        const res = await suggestTermNamesAction(q);
        if (cancelled) return;
        cacheRef.current.set(lower, res);
        setAiSuggestions(res);
      } finally {
        if (!cancelled) setLoadingAi(false);
      }
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [q, lower, exactExists]);

  // 外側クリックで閉じる
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  // AI候補は、既存の辞書に出ているもの・入力中の語そのものを除く
  const existingSet = new Set(existingTerms.map((t) => t.word.toLowerCase()));
  const aiList = aiSuggestions
    .filter((s) => s.toLowerCase() !== lower && !existingSet.has(s.toLowerCase()))
    .slice(0, 6);

  const showList =
    open && (existingMatches.length > 0 || aiList.length > 0 || loadingAi);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <MeField />
      {pending ? (
        <GeneratingPreview message={STEPS[step]} word={word.trim()} />
      ) : (
        <Card className="flex flex-col gap-4 p-6">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">用語名</span>
            <div className="relative" ref={boxRef}>
              <Input
                type="text"
                name="word"
                value={word}
                onChange={(e) => {
                  setWord(e.target.value);
                  setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setOpen(false);
                }}
                autoComplete="off"
                placeholder="例：機械学習"
                autoFocus
              />

              {showList && (
                <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg">
                  {existingMatches.length > 0 && (
                    <div>
                      <p className="px-3 pb-1 pt-2 text-xs font-medium text-muted-foreground">
                        すでに辞書にあります（開く）
                      </p>
                      {existingMatches.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setOpen(false);
                            router.push(`/terms/${t.id}`);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                        >
                          <SearchIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="truncate">{t.word}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {(aiList.length > 0 || loadingAi) && (
                    <div>
                      <p className="px-3 pb-1 pt-2 text-xs font-medium text-muted-foreground">
                        AIのIT用語候補（クリックで入力）
                      </p>
                      {loadingAi && aiList.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-muted-foreground">
                          候補を考えています…
                        </p>
                      ) : (
                        aiList.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setWord(s);
                              setOpen(false);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                          >
                            <SparklesIcon className="h-4 w-4 shrink-0 text-primary" />
                            <span className="truncate">{s}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">タグ（分野）</span>
            <span className="text-xs text-muted-foreground">
              タグはAIが内容に合わせて、決まった分野（AI / Web / データベース など）の中から
              自動で1つ付けます。あとで編集ページから変更できます。
            </span>
          </div>

          {exactExists && (
            <p className="text-sm text-muted-foreground">
              「{q}」はすでに登録済みのようです。候補から開けます。
            </p>
          )}

          {state.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" className={buttonClasses({ variant: "primary" })}>
              <SparklesIcon className="h-4 w-4" />
              登録する
            </button>
            <span className="text-sm text-muted-foreground">
              比喩を使わない説明・関連ワード・イラストを自動で作ります
            </span>
          </div>
        </Card>
      )}
    </form>
  );
}

/** 生成中に見せる“完成形の下書き”（スケルトン）。入力した用語名も見せる。 */
function GeneratingPreview({ message, word }: { message: string; word: string }) {
  return (
    <Card className="flex flex-col gap-5 p-6" aria-live="polite" aria-busy="true">
      <div className="flex items-center gap-2 text-sm font-medium text-primary">
        <SparklesIcon className="h-4 w-4 animate-shimmer" />
        AIが作成しています
      </div>

      {/* いま登録しようとしている用語名（自分が入力したもの）を表示する */}
      {word && (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">登録中の用語</span>
          <h2 className="text-2xl font-bold tracking-tight">{word}</h2>
        </div>
      )}

      <p className="text-sm text-muted-foreground">{message}</p>

      {/* イラストの枠 */}
      <Skeleton className="h-40 w-full" />

      {/* 説明文（行の長さをバラして自然に見せる） */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-10/12" />
        <Skeleton className="h-4 w-7/12" />
      </div>

      {/* 関連ワードの枠 */}
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-7 w-20 rounded-full" />
        <Skeleton className="h-7 w-24 rounded-full" />
        <Skeleton className="h-7 w-16 rounded-full" />
      </div>

      <p className="text-xs text-muted-foreground">
        説明文ができたら用語ページへ進みます。イラストはその後に裏で作り、できあがったらお知らせします。
      </p>
    </Card>
  );
}
