// AI（OpenAI）を呼び出す処理をここに集める。
//
// 画面やServer Actionは、このファイルの関数だけを使う。
// 別のAI会社に乗り換えたくなっても、ここだけ直せば済むようにしている。
//
// ここでやること:
//  - researchTerm: 用語の「比喩なし説明文」と「関連ワード」を作る（F-02 / F-04）
//  - generateIllustrationBase64: イメージイラストを作る（F-03）
//  - extractTermsFromText: ＜将来＞議事録の文章から専門用語を抜き出す
//
// ※ 失敗は握りつぶさない。説明文の生成は失敗したら例外を投げ（呼び出し側で
//   ユーザーに知らせる）、イラストは失敗したら null を返す（テキストだけ表示する）。

import OpenAI, { toFile } from "openai";
import {
  OPENAI_API_KEY,
  TEXT_MODEL,
  IMAGE_MODEL,
  IMAGE_QUALITY,
  TRANSCRIBE_MODEL,
  hasOpenAIKey,
} from "@/lib/config";

/** OpenAIクライアントは1つだけ作って使い回す */
let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!hasOpenAIKey) {
    throw new Error(
      "OpenAIのAPIキーが設定されていません。.env.local の OPENAI_API_KEY に鍵を入れてください。",
    );
  }
  if (!client) {
    client = new OpenAI({ apiKey: OPENAI_API_KEY });
  }
  return client;
}

export interface ResearchResult {
  /** 用語名の「正式な表記」（大文字小文字・記号を整えたもの。例: next.js → Next.js） */
  word: string;
  /** 比喩を使わない説明文 */
  description: string;
  /** 関連ワード（0件のこともある） */
  relatedWords: string[];
}

const RESEARCH_SYSTEM_PROMPT = [
  "あなたは、IT・ソフトウェア分野の専門用語をやさしく説明する日本語の解説者です。",
  "この辞書はIT・ソフトウェア分野の用語辞典です。次のルールを必ず守ってください:",
  "1) 比喩・たとえ話・「〜のようなもの」という表現は絶対に使わない（これは最重要ルール）。",
  "2) 用語が複数の業界・分野で使われる場合でも、必ずIT・ソフトウェア分野での意味として説明する（例:「キャッシュ」は現金ではなく、データを一時的にためる仕組みの方）。IT分野での意味が無い用語のときだけ、一般的な意味を説明してよい。",
  "3) 開発初心者にも分かる、やさしい日本語で書く。難しい言葉を使うときは短い補足を添える。",
  "4) 説明文は事実ベースで、3〜6文程度。だらだら長くしない。",
  "5) 関連ワードは、その用語とセットで覚えると役立つIT用語を最大6個。無理に出さず、無ければ空でよい。",
  "6) word には、与えられた用語の『正式な表記』を入れる。特に大文字・小文字・記号・スペースを正しく整える（例:「next.js」→「Next.js」、「github」→「GitHub」、「api」→「API」、「java script」→「JavaScript」）。ただし意味や言語は変えず、別の語に言い換えたり翻訳したりしない。すでに正しい表記ならそのまま返す。",
  "出力は必ず次の形のJSONだけにする（前後に文章をつけない）:",
  '{ "word": "正式な表記の用語名", "description": "説明文", "relatedWords": ["語1", "語2"] }',
].join("\n");

/**
 * 用語を調べて、比喩なしの説明文と関連ワードを作る（F-02 / F-04）。
 * 失敗したら例外を投げる（呼び出し側でユーザーに知らせる）。
 */
export async function researchTerm(word: string): Promise<ResearchResult> {
  const completion = await getClient().chat.completions.create({
    model: TEXT_MODEL,
    messages: [
      { role: "system", content: RESEARCH_SYSTEM_PROMPT },
      { role: "user", content: `次の用語を説明してください: 「${word}」` },
    ],
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content ?? "";
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AIの返答を読み取れませんでした（もう一度お試しください）。");
  }

  const obj = (parsed ?? {}) as Record<string, unknown>;
  const canonicalWord = typeof obj.word === "string" ? obj.word.trim() : "";
  const description = typeof obj.description === "string" ? obj.description.trim() : "";
  const relatedWords = Array.isArray(obj.relatedWords)
    ? obj.relatedWords
        .filter((w): w is string => typeof w === "string")
        .map((w) => w.trim())
        .filter(Boolean)
        .slice(0, 6)
    : [];

  if (!description) {
    throw new Error("AIが説明文を作れませんでした（もう一度お試しください）。");
  }
  // word が空なら、呼び出し側で入力した用語名をそのまま使う。
  return { word: canonicalWord || word, description, relatedWords };
}

// 登録フォームの入力補助（サジェスト）。入力しかけの文字列から、登録候補になりそうな
// IT用語名をAIに挙げてもらう。料金最優先の方針に合わせ、ここは安いテキストモデル(nano)で
// 短いやり取りに留める（呼び出し側で「入力が止まったときだけ・キャッシュ付き」で呼ぶ）。
const SUGGEST_SYSTEM_PROMPT = [
  "あなたは、IT・ソフトウェア分野の用語辞典の入力補助です。",
  "ユーザーが入力しかけている文字列をもとに、登録候補になりそうなIT・ソフトウェア分野の用語名を推測して挙げます。",
  "ルール:",
  "1) IT・ソフトウェア分野で実際に使われる用語だけを挙げる（一般語・日常語・社名・人名は避ける）。",
  "2) 用語が他業界でも使われる言葉でも、IT分野での用語として解釈する。",
  "3) 入力の続き・正式名称・よくある言い換えなど、その人が探していそうな用語を推測する。",
  "4) 用語名だけを返す（説明はしない）。最大6個。思いつかなければ空配列でよい。",
  "出力は必ず次の形のJSONだけにする:",
  '{ "terms": ["用語1", "用語2"] }',
].join("\n");

/**
 * 入力中の文字列から、登録候補になりそうなIT用語名を提案する（サジェスト）。
 * best-effort: キー未設定・短すぎ・失敗時は空配列を返す（入力の邪魔をしないため例外は投げない）。
 */
export async function suggestItTerms(query: string): Promise<string[]> {
  const q = query.trim();
  if (!hasOpenAIKey || q.length < 2) return [];
  try {
    const completion = await getClient().chat.completions.create({
      model: TEXT_MODEL,
      messages: [
        { role: "system", content: SUGGEST_SYSTEM_PROMPT },
        { role: "user", content: `入力中の文字列: 「${q}」` },
      ],
      response_format: { type: "json_object" },
    });
    const raw = completion.choices[0]?.message?.content ?? "";
    const obj = JSON.parse(raw) as Record<string, unknown>;
    const terms = Array.isArray(obj.terms)
      ? obj.terms
          .filter((t): t is string => typeof t === "string")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];
    return Array.from(new Set(terms)).slice(0, 6);
  } catch (err) {
    console.error("[ai] 用語サジェストに失敗:", err);
    return [];
  }
}

// イラストの目的は「装飾」ではなく「その用語を“絵で説明する”」こと。
// そこで、まず安いテキストモデルに『概念を図解で説明する絵の設計（英語）』を書かせ、
// その設計を画像モデルに渡す（二段構え）。こうすると、ただの雰囲気イラストではなく、
// 仕組み・構造・流れが伝わる説明的な図になりやすい。
const ILLUSTRATION_BRIEF_SYSTEM_PROMPT = [
  "You write an image-generation prompt for ONE clear EDUCATIONAL DIAGRAM that explains a technical term to a beginner.",
  "Think like an instructional designer. Given the term and its plain-language Japanese description, output a single English prompt that renders a flat-vector, infographic-style diagram.",
  "Order the prompt as: (1) format and style, (2) the main concept/subject, (3) the key parts and how they relate — use boxes, arrows, icons, and patterns like input → process → output, before/after, or part-to-whole, (4) constraints.",
  "Labels: you MAY add a few SHORT labels to name the key parts. Write each label as a short Japanese word or phrase (1-3 words) inside double quotes. Use at most 4 labels. Prefer clear icons over text, and never put sentences or paragraphs inside the image.",
  "Make the relationships obvious so a beginner understands the concept at a glance. Keep it a single, uncluttered scene.",
  "Output ONLY the English image prompt. No preamble.",
].join("\n");

// 画像モデルに必ず付けるスタイル指定。図解として読みやすく、ラベルは“短く少なく”に抑える。
const ILLUSTRATION_STYLE_SUFFIX =
  "Style: clean flat vector educational infographic, bold simple shapes, clear arrows and icons, soft modern color palette, generous white space, high readability, balanced centered composition. Use only a few short labels — no sentences, no paragraphs, no watermark or signature.";

/**
 * 用語を「絵で説明する」ための、画像生成プロンプト（英語）を作る。
 * 失敗しても止まらないよう、その場合は説明文を使ったシンプルな代替プロンプトを返す。
 */
async function buildIllustrationPrompt(
  word: string,
  description: string,
): Promise<string> {
  try {
    const completion = await getClient().chat.completions.create({
      model: TEXT_MODEL,
      messages: [
        { role: "system", content: ILLUSTRATION_BRIEF_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Term: ${word}\nDescription (Japanese): ${description.slice(0, 500)}`,
        },
      ],
    });
    const brief = completion.choices[0]?.message?.content?.trim();
    if (brief) return `${brief} ${ILLUSTRATION_STYLE_SUFFIX}`;
  } catch (err) {
    console.error("[ai] イラスト設計の作成に失敗（代替プロンプトを使用）:", err);
  }
  // 代替：説明文をそのまま手がかりにして、ラベル付きの説明図を描かせる
  return [
    `An educational infographic-style diagram that explains the concept of "${word}" to a beginner.`,
    "Show its key parts and how they relate using labeled boxes, arrows and simple icons (for example input to process to output).",
    `You may add up to 4 very short Japanese labels in double quotes to name the parts. Concept summary: ${description.slice(0, 300)}`,
    ILLUSTRATION_STYLE_SUFFIX,
  ].join(" ");
}

/**
 * 用語のイメージイラストを作り、PNG画像をBase64文字列で返す（F-03）。
 * 失敗したら null を返す（テキストだけ表示するため、例外は投げない）。
 */
export async function generateIllustrationBase64(
  word: string,
  description: string,
): Promise<string | null> {
  if (!hasOpenAIKey) return null;
  try {
    const prompt = await buildIllustrationPrompt(word, description);

    const result = await getClient().images.generate({
      model: IMAGE_MODEL,
      prompt,
      size: "1024x1024",
      quality: IMAGE_QUALITY, // 既定は medium（config の IMAGE_QUALITY で変更可）
    });

    const first = result.data?.[0];
    if (first?.b64_json) return first.b64_json;

    // モデルによっては画像URLが返ることがあるので、その場合は取得してBase64化する
    if (first?.url) {
      const res = await fetch(first.url);
      const buf = Buffer.from(await res.arrayBuffer());
      return buf.toString("base64");
    }
    return null;
  } catch (err) {
    console.error("[ai] イラスト生成に失敗:", err);
    return null;
  }
}

// ============================================================
// 議事録づくり：録音した音声を文字に起こす（OpenAI の文字起こし）。
//   料金最優先の方針で、既定は安い gpt-4o-mini-transcribe（config の TRANSCRIBE_MODEL）。
//   音声は呼び出し側（Server Action）がサーバーで受け取ってからここに渡す（鍵はサーバー側のまま）。
// ============================================================

/**
 * 音声ファイルを文字起こしして、テキストを返す（議事録の本文に使う）。
 * 失敗したら例外を投げる（呼び出し側でユーザーに知らせる）。
 */
export async function transcribeAudio(file: File): Promise<string> {
  if (!hasOpenAIKey) {
    throw new Error(
      "OpenAIのAPIキーが設定されていません。.env.local の OPENAI_API_KEY に鍵を入れてください。",
    );
  }
  // OpenAI SDK が確実に読める形に整える（Buffer 経由でファイル名・種類を明示）。
  const buffer = Buffer.from(await file.arrayBuffer());
  const upload = await toFile(buffer, file.name || "audio.webm", {
    type: file.type || "audio/webm",
  });

  const result = await getClient().audio.transcriptions.create({
    file: upload,
    model: TRANSCRIBE_MODEL,
  });

  return (result.text ?? "").trim();
}

/**
 * リアルタイム文字起こし用の一時トークン（client secret）を作る。
 * これをブラウザに渡し、ブラウザが OpenAI に直接つないで「話しながら文字起こし」する。
 * 本物のAPIキーはサーバー側に置いたまま（このトークンは短命）。料金最優先のため
 * モデルは config の TRANSCRIBE_MODEL（既定 gpt-4o-mini-transcribe）を使う。
 * 失敗したら例外を投げる（呼び出し側でユーザーに知らせる）。
 */
export async function createRealtimeTranscriptionSecret(): Promise<string> {
  if (!hasOpenAIKey) {
    throw new Error(
      "OpenAIのAPIキーが設定されていません。.env.local の OPENAI_API_KEY に鍵を入れてください。",
    );
  }
  const secret = await getClient().realtime.clientSecrets.create({
    session: {
      type: "transcription",
      audio: {
        input: {
          // 日本語を明示すると精度と速さが上がる
          transcription: { model: TRANSCRIBE_MODEL, language: "ja" },
          // 話の区切り（無音）を自動検出して、文ごとに確定させる
          turn_detection: { type: "server_vad" },
        },
      },
    },
  });
  return secret.value;
}

// ============================================================
// 議事録を「整える」：本文（文字起こし）から、要約・決定事項・ToDo を作る。
//   料金最優先のため安いテキストモデル（TEXT_MODEL）で1回にまとめて行う。
//   文字起こしに無いことは作らない（推測で水増ししない）。
// ============================================================

export interface MinuteOrganizeResult {
  /** 会議の要点（やさしい日本語・比喩なし） */
  summary: string;
  /** 決まったこと（1項目1文） */
  decisions: string[];
  /** 次にやること（分かれば「誰が・いつまでに」を含める） */
  todos: string[];
}

const ORGANIZE_SYSTEM_PROMPT = [
  "あなたは会議の文字起こしを読み、議事録として整理する担当です。次のルールを必ず守ってください:",
  "1) summary: 会議の要点を、やさしい日本語で3〜5文にまとめる。比喩・たとえ話は使わない。",
  "2) decisions: 会議で『決まったこと』を短い箇条書き（1項目1文）。無ければ空配列。",
  "3) todos: 『次にやること』を短い箇条書き。担当者や期限が分かれば含める（例:「太郎が資料を用意（今週中）」）。無ければ空配列。",
  "4) 文字起こしに書かれていないことは作らない（推測で水増ししない）。",
  "出力は必ず次の形のJSONだけにする（前後に文章をつけない）:",
  '{ "summary": "要約", "decisions": ["決定1"], "todos": ["やること1"] }',
].join("\n");

/**
 * 議事録の本文（文字起こし）から、要約・決定事項・ToDo を作る。
 * 失敗したら例外を投げる（呼び出し側でユーザーに知らせる）。
 */
export async function organizeMinute(body: string): Promise<MinuteOrganizeResult> {
  if (!hasOpenAIKey) {
    throw new Error(
      "OpenAIのAPIキーが設定されていません。.env.local の OPENAI_API_KEY に鍵を入れてください。",
    );
  }
  const completion = await getClient().chat.completions.create({
    model: TEXT_MODEL,
    messages: [
      { role: "system", content: ORGANIZE_SYSTEM_PROMPT },
      // 長すぎる本文は頭から一定量だけ渡す（料金と安定性のため）。
      { role: "user", content: body.slice(0, 12000) },
    ],
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content ?? "";
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AIの返答を読み取れませんでした（もう一度お試しください）。");
  }
  const obj = (parsed ?? {}) as Record<string, unknown>;
  const summary = typeof obj.summary === "string" ? obj.summary.trim() : "";
  const toList = (v: unknown): string[] =>
    Array.isArray(v)
      ? v
          .filter((x): x is string => typeof x === "string")
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 20)
      : [];
  return { summary, decisions: toList(obj.decisions), todos: toList(obj.todos) };
}

// ============================================================
// ＜将来＞ 議事録から専門用語を自動抽出する機能のための土台。
//   いまは画面につないでいないが、ここに実装を置いておけば、後で
//   「議事録ページ」を作って呼び出すだけで使える。
//   流れ（予定）: 録音 → gpt-realtime-whisper で文字起こし → 下の関数で用語抽出
//                → 各用語を researchTerm にかけて辞書へ登録
// ============================================================

const EXTRACT_SYSTEM_PROMPT = [
  "あなたは、会議の文字起こしから「IT・ソフトウェア分野の辞書に登録する価値のある専門用語」を抜き出す担当です。",
  "IT・ソフトウェア分野の専門用語・略語・固有の概念だけを選びます。一般的すぎる言葉・日常語・社名・人名は除きます。",
  "出力は必ず次の形のJSONだけにする:",
  '{ "terms": ["用語1", "用語2"] }',
].join("\n");

/**
 * ＜将来用＞議事録などの文章から専門用語の候補を抜き出す。
 * 返り値は用語名の配列（重複は取り除く）。
 */
export async function extractTermsFromText(text: string): Promise<string[]> {
  const completion = await getClient().chat.completions.create({
    model: TEXT_MODEL,
    messages: [
      { role: "system", content: EXTRACT_SYSTEM_PROMPT },
      { role: "user", content: text },
    ],
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content ?? "";
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    const terms = Array.isArray(obj.terms)
      ? obj.terms.filter((t): t is string => typeof t === "string").map((t) => t.trim())
      : [];
    return Array.from(new Set(terms.filter(Boolean)));
  } catch {
    return [];
  }
}
