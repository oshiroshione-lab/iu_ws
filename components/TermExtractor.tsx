"use client";

// 議事録などの文章から、AIが専門用語の「候補」を挙げ、選んだものだけ登録する。
// ① 文章を入れて「用語の候補を出す」（安いAI1回。登録はまだしない）
// ② 候補をチェックで選ぶ（すでに辞書にある語は「登録済み」として開けるだけ）
// ③ 「選んだ用語を登録」で、選んだ分だけ説明・関連ワードを作って登録する

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import {
  suggestTermsFromTextAction,
  createSelectedTermsAction,
  type TermCandidate,
  type ExtractState,
} from "@/app/actions";
import { MINUTES_MAX_LENGTH, EXTRACT_MAX_TERMS } from "@/lib/validation";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import { SubmitButton } from "@/components/SubmitButton";
import { MeField } from "@/components/MeField";
import { buttonClasses } from "@/components/ui/Button";
import { SparklesIcon } from "@/components/ui/icons";

export function TermExtractor({ defaultText = "" }: { defaultText?: string }) {
  const [text, setText] = useState(defaultText);
  const [candidates, setCandidates] = useState<TermCandidate[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [isSuggesting, startSuggest] = useTransition();
  const [createState, createAction] = useActionState<ExtractState, FormData>(
    createSelectedTermsAction,
    {},
  );

  function runSuggest() {
    setSuggestError(null);
    startSuggest(async () => {
      const res = await suggestTermsFromTextAction(text);
      if (res.error) {
        setSuggestError(res.error);
        setCandidates(null);
        return;
      }
      setCandidates(res.candidates);
      // 未登録の候補を既定でチェック状態にする
      setSelected(res.candidates.filter((c) => !c.existingId).map((c) => c.word));
    });
  }

  function toggle(word: string) {
    setSelected((cur) =>
      cur.includes(word) ? cur.filter((w) => w !== word) : [...cur, word],
    );
  }

  // 登録が済んだ語（追加/スキップ）は候補から消して、二重登録の混乱を防ぐ。
  useEffect(() => {
    const res = createState.result;
    if (!res) return;
    const done = new Set([...res.added, ...res.skipped].map((w) => w.toLowerCase()));
    if (done.size === 0) return;
    setCandidates((cur) =>
      cur ? cur.filter((c) => !done.has(c.word.toLowerCase())) : cur,
    );
    setSelected((cur) => cur.filter((w) => !done.has(w.toLowerCase())));
  }, [createState]);

  const r = createState.result;
  const newCandidates = candidates?.filter((c) => !c.existingId) ?? [];
  const existingCandidates = candidates?.filter((c) => c.existingId) ?? [];

  return (
    <div className="flex flex-col gap-4">
      {/* ① 文章 → 候補を出す */}
      <Card className="flex flex-col gap-4 p-6">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">議事録などの文章</span>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            maxLength={MINUTES_MAX_LENGTH}
            placeholder="会議の文字起こしやメモ。ここからAIが専門用語の候補を挙げます。"
          />
          <span className="text-xs text-muted-foreground">
            最大{MINUTES_MAX_LENGTH.toLocaleString()}文字。まず候補を出してから、登録したい用語だけ選べます。
          </span>
        </label>
        <div>
          <button
            type="button"
            onClick={runSuggest}
            disabled={isSuggesting || !text.trim()}
            aria-busy={isSuggesting}
            className={buttonClasses({ variant: "primary" })}
          >
            {isSuggesting ? (
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                aria-hidden="true"
              />
            ) : (
              <SparklesIcon className="h-4 w-4" />
            )}
            {isSuggesting ? "候補を探しています…" : "用語の候補を出す"}
          </button>
        </div>
        {suggestError && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {suggestError}
          </p>
        )}
      </Card>

      {/* ② 候補から選んで登録 */}
      {candidates && (
        <Card className="flex flex-col gap-4 p-6">
          {candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              登録できそうな専門用語は見つかりませんでした。文章を増やすか、用語を直接登録してみてください。
            </p>
          ) : (
            <form action={createAction} className="flex flex-col gap-4">
              <MeField />
              {/* 選んだ語をフォーム送信するための隠しフィールド */}
              {selected.map((w) => (
                <input key={w} type="hidden" name="words" value={w} />
              ))}

              {newCandidates.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium">
                    見つかった候補（押して選ぶ／もう一度押すと外す）
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {newCandidates.map((c) => {
                      const on = selected.includes(c.word);
                      return (
                        <button
                          key={c.word}
                          type="button"
                          onClick={() => toggle(c.word)}
                          aria-pressed={on}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-sm transition-colors",
                            on
                              ? "border-primary bg-primary text-primary-foreground"
                              : "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                          )}
                        >
                          {on && <span aria-hidden>✓ </span>}
                          {c.word}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {existingCandidates.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    すでに辞書にあります（開く）
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {existingCandidates.map((c) => (
                      <Link key={c.word} href={`/terms/${c.existingId}`}>
                        <Badge variant="outline" className="hover:opacity-80">
                          {c.word}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {newCandidates.length > 0 && (
                <div className="flex flex-wrap items-center gap-3">
                  <SubmitButton
                    idle={`選んだ用語を登録（${selected.length}件）`}
                    pending="登録しています…（数十秒〜数分かかることがあります）"
                    disabled={selected.length === 0}
                  />
                  <span className="text-xs text-muted-foreground">
                    1回で最大{EXTRACT_MAX_TERMS}件。比喩なし説明で登録（イラストは各ページから後で）。
                  </span>
                </div>
              )}
            </form>
          )}
        </Card>
      )}

      {/* 登録結果 */}
      {createState.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {createState.error}
        </p>
      )}
      {r && (
        <Card className="flex flex-col gap-4 p-6" aria-live="polite">
          <h2 className="text-base font-semibold">登録の結果</h2>

          {r.added.length > 0 && (
            <ResultBlock title={`新しく登録した用語（${r.added.length}件）`}>
              {r.added.map((w) => (
                <Link key={w} href={`/?q=${encodeURIComponent(w)}`}>
                  <Badge variant="accent" className="hover:opacity-80">
                    {w}
                  </Badge>
                </Link>
              ))}
            </ResultBlock>
          )}

          {r.skipped.length > 0 && (
            <ResultBlock title={`すでに登録済みで飛ばした用語（${r.skipped.length}件）`}>
              {r.skipped.map((w) => (
                <Badge key={w} variant="outline">
                  {w}
                </Badge>
              ))}
            </ResultBlock>
          )}

          {r.failed.length > 0 && (
            <ResultBlock title={`作成に失敗した用語（${r.failed.length}件）`}>
              {r.failed.map((w) => (
                <span
                  key={w}
                  className="inline-flex items-center rounded-full border border-destructive/40 px-2.5 py-0.5 text-xs font-medium text-destructive"
                >
                  {w}
                </span>
              ))}
            </ResultBlock>
          )}

          {r.overflow > 0 && (
            <p className="text-sm text-muted-foreground">
              他にも{r.overflow}件は今回の上限のため見送りました。もう一度「選んだ用語を登録」で続きを登録できます。
            </p>
          )}

          {r.added.length > 0 && (
            <Link href="/" className="text-sm font-medium text-primary hover:underline">
              一覧で確認する →
            </Link>
          )}
        </Card>
      )}
    </div>
  );
}

function ResultBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}
