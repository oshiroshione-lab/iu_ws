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

import OpenAI from "openai";
import {
  OPENAI_API_KEY,
  TEXT_MODEL,
  IMAGE_MODEL,
  IMAGE_QUALITY,
  hasOpenAIKey,
} from "@/lib/config";
import { normalizeTags } from "@/lib/tags";

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
  /** 比喩を使わない説明文 */
  description: string;
  /** 関連ワード（0件のこともある） */
  relatedWords: string[];
  /** タグ＝広いカテゴリ（0件のこともある） */
  tags: string[];
}

const RESEARCH_SYSTEM_PROMPT = [
  "あなたは、専門用語をやさしく説明する日本語の解説者です。",
  "次のルールを必ず守ってください:",
  "1) 比喩・たとえ話・「〜のようなもの」という表現は絶対に使わない（これは最重要ルール）。",
  "2) 開発初心者にも分かる、やさしい日本語で書く。難しい言葉を使うときは短い補足を添える。",
  "3) 説明文は事実ベースで、3〜6文程度。だらだら長くしない。",
  "4) 関連ワードは、その用語とセットで覚えると役立つ言葉を最大6個。無理に出さず、無ければ空でよい。",
  "5) タグは、その用語が属する『広い分野・カテゴリ』を1〜4個（例: AI / 統計 / Web / ネットワーク）。短い名詞にする。無ければ空でよい。",
  "出力は必ず次の形のJSONだけにする（前後に文章をつけない）:",
  '{ "description": "説明文", "relatedWords": ["語1", "語2"], "tags": ["分野1", "分野2"] }',
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
  const description = typeof obj.description === "string" ? obj.description.trim() : "";
  const relatedWords = Array.isArray(obj.relatedWords)
    ? obj.relatedWords
        .filter((w): w is string => typeof w === "string")
        .map((w) => w.trim())
        .filter(Boolean)
        .slice(0, 6)
    : [];
  const tags = Array.isArray(obj.tags)
    ? normalizeTags(obj.tags.filter((t): t is string => typeof t === "string"))
    : [];

  if (!description) {
    throw new Error("AIが説明文を作れませんでした（もう一度お試しください）。");
  }
  return { description, relatedWords, tags };
}

// イラストの目的は「装飾」ではなく「その用語を“絵で説明する”」こと。
// そこで、まず安いテキストモデルに『概念を図解で説明する絵の設計（英語）』を書かせ、
// その設計を画像モデルに渡す（二段構え）。こうすると、ただの雰囲気イラストではなく、
// 仕組み・構造・流れが伝わる説明的な図になりやすい。
const ILLUSTRATION_BRIEF_SYSTEM_PROMPT = [
  "You design ONE clear, educational illustration that visually EXPLAINS a technical term to a beginner.",
  "You are given the term and its plain-language description. Output a concise English prompt for an image generator.",
  "The illustration you describe MUST:",
  "- Explain the concept visually: show its parts, structure, flow, or how it works, like a clean infographic or labeled diagram (but WITHOUT any written labels).",
  "- Use simple visual devices (boxes, arrows, icons, before/after, input→process→output) to make relationships and process obvious.",
  "- Be a single, uncluttered scene that a beginner can understand at a glance.",
  "- Contain NO text, letters, numbers, or written labels of any kind (image models render text incorrectly; rely on visuals only).",
  "Output ONLY the English image prompt itself. No preamble, no quotes.",
].join("\n");

// 画像モデルに必ず付ける、見た目と『文字なし』を強制するスタイル指定。
const ILLUSTRATION_STYLE_SUFFIX =
  "Style: clean flat vector educational infographic, simple bold shapes, soft modern color palette, generous white space, high clarity, centered composition. Absolutely no text, no letters, no numbers, no captions anywhere in the image.";

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
  // 代替：説明文をそのまま手がかりにして、説明的な図を描かせる
  return [
    `An educational diagram that visually explains the concept of "${word}".`,
    "Depict its structure or how it works using boxes, arrows and simple icons so a beginner understands it at a glance.",
    `Concept summary: ${description.slice(0, 300)}`,
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
// ＜将来＞ 議事録から専門用語を自動抽出する機能のための土台。
//   いまは画面につないでいないが、ここに実装を置いておけば、後で
//   「議事録ページ」を作って呼び出すだけで使える。
//   流れ（予定）: 録音 → gpt-realtime-whisper で文字起こし → 下の関数で用語抽出
//                → 各用語を researchTerm にかけて辞書へ登録
// ============================================================

const EXTRACT_SYSTEM_PROMPT = [
  "あなたは、会議の文字起こしから「辞書に登録する価値のある専門用語」を抜き出す担当です。",
  "一般的すぎる言葉や日常語は除き、専門用語・略語・固有の概念だけを選びます。",
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
