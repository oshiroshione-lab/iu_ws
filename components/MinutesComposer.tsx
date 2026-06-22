"use client";

// 議事録の新規作成：マイクで話すと、その場で文字が出てくる（リアルタイム文字起こし）。
//
// しくみ（リアルタイム）:
//  1) サーバーから一時トークンを受け取る（本物のAPIキーはサーバー側のまま）。
//  2) ブラウザが WebRTC で OpenAI に直接つなぎ、マイク音声を流す。
//  3) 認識中の文字は「認識中」として流れ、文の区切りで本文に確定していく。
//  停止すると、本文（編集できる）に文字起こしがそろう。タイトルを整えて保存する。
//
// 音声ファイルからの文字起こし（その場ではなく1回まとめて）も下に用意している。

import { useActionState, useEffect, useRef, useState } from "react";
import {
  createMinuteAction,
  createTranscriptionTokenAction,
  transcribeAudioAction,
  type MinuteFormState,
} from "@/app/minutes/actions";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { SubmitButton } from "@/components/SubmitButton";
import { MeField } from "@/components/MeField";
import { useMe } from "@/components/MeProvider";
import { buttonClasses } from "@/components/ui/Button";
import { MicIcon, StopIcon } from "@/components/ui/icons";

// ブラウザから WebRTC で接続する先（SDP を送ると応答が返る）
const CALLS_URL = "https://api.openai.com/v1/realtime/calls";

// 入力途中の議事録（下書き）を一時的にしまっておく場所のキー。
// 別画面にうっかり移動しても消えないよう、ブラウザの localStorage に置く。
const DRAFT_KEY = "minutes-draft:new";

type Status = "idle" | "connecting" | "live";

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// タイトルの初期値「議事録 日付 時刻」を作る（クライアントでだけ呼ぶ）。
function defaultTitle(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `議事録 ${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export function MinutesComposer({ canTranscribe = true }: { canTranscribe?: boolean }) {
  const [state, formAction, isPending] = useActionState<MinuteFormState, FormData>(
    createMinuteAction,
    {},
  );
  const { me } = useMe();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [interim, setInterim] = useState(""); // 認識中（まだ確定していない）の文字
  const [status, setStatus] = useState<Status>("idle");
  const [seconds, setSeconds] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false); // 下書きの読み込みが終わったか
  const [restored, setRestored] = useState(false); // 前回の下書きを復元したか

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const interimRef = useRef(""); // 停止時に確定させるため、最新の認識中テキストを持っておく
  const savingRef = useRef(false); // 保存に進んでいる間は、下書きの自動保存を止める

  // 初回マウント時：前回の下書きが残っていれば復元する。なければタイトルに「議事録 日付 時刻」を入れる。
  // （Date はクライアントで入れる＝ちらつき回避のため mount 後）
  useEffect(() => {
    let savedTitle = "";
    let savedBody = "";
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw) as { title?: string; body?: string };
        savedTitle = typeof d.title === "string" ? d.title : "";
        savedBody = typeof d.body === "string" ? d.body : "";
      }
    } catch {
      // 壊れた下書きは無視して、まっさらから始める
    }

    if (savedBody.trim()) {
      setTitle(savedTitle || defaultTitle());
      setBody(savedBody);
      setRestored(true); // 「復元しました」のお知らせを出す
    } else {
      setTitle(defaultTitle());
    }
    setDraftLoaded(true);
  }, []);

  // 入力が変わるたびに下書きを保存する（別画面に移動しても消えないように）。
  // 本文が空のときは下書きを消す。保存に進んでいる間（savingRef）は触らない。
  useEffect(() => {
    if (!draftLoaded || savingRef.current) return;
    try {
      if (body.trim()) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, body }));
      } else {
        localStorage.removeItem(DRAFT_KEY);
      }
    } catch {
      // localStorage が使えない環境でも、画面は普通に使えるようにする
    }
  }, [title, body, draftLoaded]);

  // 保存に進み始めたら（isPending）、自動保存を止めて下書きを消す。
  // 保存に成功すれば詳細ページへ移動するので、下書きは残らない。
  useEffect(() => {
    if (isPending) {
      savingRef.current = true;
      clearDraft();
    }
  }, [isPending]);

  // 保存に失敗（入力チェックで弾かれた等）したら、下書きを書き戻して消えないようにする。
  useEffect(() => {
    if (!state.error) return;
    savingRef.current = false; // また自動保存できるようにする
    try {
      if (body.trim()) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, body }));
      }
    } catch {}
    // title / body は保存時点の値で十分なので依存に入れない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // 録音中の経過時間
  useEffect(() => {
    if (status !== "live") return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [status]);

  // 画面を離れるときは接続を片付ける
  useEffect(() => () => teardown(), []);

  function teardown() {
    try {
      dcRef.current?.close();
    } catch {}
    try {
      pcRef.current?.close();
    } catch {}
    streamRef.current?.getTracks().forEach((t) => t.stop());
    dcRef.current = null;
    pcRef.current = null;
    streamRef.current = null;
  }

  function appendFinal(text: string) {
    const t = text.trim();
    if (!t) return;
    setBody((b) => (b.trim() ? `${b}\n${t}` : t));
  }

  // 下書きを消す（localStorage から削除）。
  function clearDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {}
  }

  // 「下書きを消して最初から」を押したとき：下書きを消して入力を初期状態に戻す。
  function discardDraft() {
    clearDraft();
    setRestored(false);
    setBody("");
    setTitle(defaultTitle());
  }

  async function startLive() {
    setError(null);
    setStatus("connecting");
    try {
      // 1) サーバーから一時トークンを受け取る
      const tok = await createTranscriptionTokenAction();
      if (tok.error || !tok.value) {
        setError(tok.error ?? "接続の準備に失敗しました");
        setStatus("idle");
        return;
      }

      // 2) マイクを取得して WebRTC でつなぐ
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const pc = new RTCPeerConnection();
      pcRef.current = pc;
      pc.addTrack(stream.getAudioTracks()[0]);

      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;
      dc.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === "conversation.item.input_audio_transcription.delta") {
            interimRef.current += msg.delta ?? "";
            setInterim(interimRef.current);
          } else if (
            msg.type === "conversation.item.input_audio_transcription.completed"
          ) {
            appendFinal(msg.transcript ?? interimRef.current);
            interimRef.current = "";
            setInterim("");
          }
        } catch {
          // イベント以外のメッセージは無視
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const resp = await fetch(CALLS_URL, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${tok.value}`,
          "Content-Type": "application/sdp",
        },
      });
      if (!resp.ok) throw new Error(`接続に失敗しました (${resp.status})`);

      await pc.setRemoteDescription({ type: "answer", sdp: await resp.text() });
      setSeconds(0);
      setStatus("live");
    } catch {
      teardown();
      setError(
        "マイクまたはリアルタイム接続を開始できませんでした。マイクの許可とネット接続を確認してください（localhost で開いている必要があります）。",
      );
      setStatus("idle");
    }
  }

  // 停止と同時に保存する（保存の手間を省くため）。保存できたら詳細ページへ移動する。
  function stopAndSave() {
    // 認識中の文字が残っていれば本文に足してから止める
    const extra = interimRef.current.trim();
    const finalBody = extra
      ? body.trim()
        ? `${body}\n${extra}`
        : extra
      : body;
    interimRef.current = "";
    setInterim("");
    teardown();
    setStatus("idle");

    if (!finalBody.trim()) {
      setError("まだ文字起こしがありません。少し話してから停止してください。");
      return;
    }
    setBody(finalBody);
    const fd = new FormData();
    fd.set("title", title.trim() || "議事録");
    fd.set("body", finalBody);
    fd.set("by", me.trim() || "ゲスト");
    formAction(fd);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("audio", file, file.name);
      const res = await transcribeAudioAction(fd);
      if (res.error) setError(res.error);
      else if (res.text) appendFinal(res.text);
    } catch {
      setError("文字起こしに失敗しました。もう一度お試しください。");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 前回の下書きを復元したときのお知らせ */}
      {restored && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          <span className="text-foreground/80">
            前回の入力途中の議事録を復元しました。続きから書けます。
          </span>
          <button
            type="button"
            onClick={discardDraft}
            className="font-medium text-muted-foreground hover:text-destructive hover:underline"
          >
            下書きを消して最初から
          </button>
        </div>
      )}

      {/* ① リアルタイム文字起こし */}
      <Card className="flex flex-col gap-4 p-6">
        <div className="flex flex-wrap items-center gap-3">
          {status === "live" ? (
            <button
              type="button"
              onClick={stopAndSave}
              className={buttonClasses({ variant: "destructive" })}
            >
              <StopIcon className="h-4 w-4" />
              停止して保存
            </button>
          ) : (
            <button
              type="button"
              onClick={startLive}
              disabled={status === "connecting" || isPending || !canTranscribe}
              aria-busy={status === "connecting" || isPending}
              className={buttonClasses({ variant: "primary" })}
            >
              {status === "connecting" || isPending ? (
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                  aria-hidden="true"
                />
              ) : (
                <MicIcon className="h-4 w-4" />
              )}
              {status === "connecting"
                ? "接続しています…"
                : isPending
                  ? "保存しています…"
                  : "録音して文字起こしを開始"}
            </button>
          )}

          {status === "live" && (
            <span className="inline-flex items-center gap-2 text-sm font-medium text-destructive">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-destructive" />
              録音中 {formatTime(seconds)}
            </span>
          )}
        </div>

        {/* 認識中の文字（リアルタイムに流れる） */}
        {status === "live" && (
          <div className="rounded-lg border bg-muted/40 p-3 text-sm" aria-live="polite">
            <span className="text-xs font-medium text-muted-foreground">認識中</span>
            <p className="mt-1 min-h-5 text-foreground/90">
              {interim || <span className="text-muted-foreground">（話してください…）</span>}
            </p>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          話すと、その場で文字に変換されます。「停止して保存」を押すと、そのまま保存して議事録ページへ進みます（タイトルは自動入力。あとで編集できます）。
        </p>

        {/* 音声ファイルからの文字起こし（その場ではなく1回まとめて） */}
        <div className="flex flex-wrap items-center gap-2 border-t pt-3 text-sm text-muted-foreground">
          <span>録音済みの音声から:</span>
          <label className={buttonClasses({ variant: "outline", size: "sm" })}>
            {uploading ? "文字起こし中…" : "音声ファイルを選ぶ"}
            <input
              type="file"
              accept="audio/*"
              onChange={onFile}
              disabled={uploading || !canTranscribe}
              className="hidden"
            />
          </label>
        </div>

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </Card>

      {/* ② タイトル・本文を整えて保存 */}
      <form action={formAction}>
        <MeField />
        <Card className="flex flex-col gap-4 p-6">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">タイトル</span>
            <Input
              type="text"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例：6/15 定例ミーティング"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">議事内容（本文）</span>
            <Textarea
              name="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={14}
              placeholder="ここに文字起こしの結果が入ります。手で直すこともできます。"
            />
            <span className="text-xs text-muted-foreground">
              保存後、編集画面で「会議日・参加者・議題・決定事項・ToDo」を足せます。専門用語の抽出もできます。
            </span>
          </label>

          {state.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}

          {status !== "live" && (
            <div>
              <SubmitButton idle="議事録を保存" pending="保存中…" />
            </div>
          )}
        </Card>
      </form>
    </div>
  );
}
