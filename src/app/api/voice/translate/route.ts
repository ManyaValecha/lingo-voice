import { NextResponse } from "next/server";
import { isTranslationLanguage, MAX_TRANSLATION_CHARS } from "@/lib/voice-contract";
import { enforceVoiceRateLimit, hasPersistentRateLimitConfig } from "@/lib/voice-rate-limit";
import { protectTranslationEntities } from "@/lib/translation-protection";

export const runtime = "nodejs";
export const maxDuration = 40;

const SARVAM_TRANSLATE_ENDPOINT = "https://api.sarvam.ai/translate";
const SARVAM_TRANSLATION_MODEL = "mayura:v1";

export async function POST(request: Request) {
  if (!(await enforceVoiceRateLimit(request))) {
    return NextResponse.json(
      { error: "Voice requests are temporarily limited. Configure persistent KV in production and retry." },
      { status: process.env.NODE_ENV === "production" && !hasPersistentRateLimitConfig() ? 503 : 429 },
    );
  }

  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "The Sarvam translation service is not configured on this server yet." }, { status: 503 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_TRANSLATION_CHARS * 8) {
    return NextResponse.json({ error: "Translation request is too large." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send text and language selections as JSON." }, { status: 400 });
  }

  const input = body as { text?: unknown; sourceLanguage?: unknown; targetLanguage?: unknown };

  if (typeof input.text !== "string" || !input.text.trim()) {
    return NextResponse.json({ error: "There is no transcribed text to translate." }, { status: 400 });
  }

  if (input.text.length > MAX_TRANSLATION_CHARS) {
    return NextResponse.json(
      { error: `Text must be ${MAX_TRANSLATION_CHARS.toLocaleString()} characters or fewer.` },
      { status: 413 },
    );
  }

  if (typeof input.sourceLanguage !== "string" || !isTranslationLanguage(input.sourceLanguage)) {
    return NextResponse.json({ error: "Choose a supported source language." }, { status: 400 });
  }

  if (typeof input.targetLanguage !== "string" || !isTranslationLanguage(input.targetLanguage)) {
    return NextResponse.json({ error: "Choose a supported target language." }, { status: 400 });
  }

  if (input.sourceLanguage === input.targetLanguage) {
    return NextResponse.json({ error: "Choose a different target language to translate." }, { status: 400 });
  }

  const protectedInput = protectTranslationEntities(input.text.trim());

  try {
    const response = await fetch(SARVAM_TRANSLATE_ENDPOINT, {
      method: "POST",
      headers: {
        "api-subscription-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: protectedInput.protectedText,
        source_language_code: input.sourceLanguage,
        target_language_code: input.targetLanguage,
        model: SARVAM_TRANSLATION_MODEL,
        mode: "modern-colloquial",
        numerals_format: "international",
      }),
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 429) {
        return NextResponse.json({ error: "Sarvam translation is busy. Wait a moment and try again." }, { status: 429 });
      }

      if (response.status === 401 || response.status === 403) {
        return NextResponse.json({ error: "Sarvam credentials are not authorized for translation. Check your server configuration." }, { status: 503 });
      }

      if (response.status === 402) {
        return NextResponse.json({ error: "Sarvam translation credits are unavailable. Check your Sarvam account." }, { status: 503 });
      }

      if (response.status === 400 || response.status === 422) {
        return NextResponse.json({ error: "Sarvam could not accept this translation request. Check the language selections and text length." }, { status: 422 });
      }

      if (response.status >= 500) {
        return NextResponse.json({ error: "Sarvam translation is temporarily unavailable. Try again shortly." }, { status: 503 });
      }

      return NextResponse.json({ error: "The translation service could not complete this request." }, { status: 502 });
    }

    const result = await response.json().catch(() => null) as {
      translated_text?: unknown;
    } | null;

    if (typeof result?.translated_text !== "string" || !result.translated_text.trim()) {
      return NextResponse.json({ error: "Sarvam returned an empty translation. Please try again." }, { status: 502 });
    }

    const translation = protectedInput.restore(result.translated_text.trim());

    if (!translation) {
      return NextResponse.json(
        { error: "The translation service did not preserve a protected name or value. Try rephrasing the text." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      translation,
      provider: "Sarvam AI",
      model: SARVAM_TRANSLATION_MODEL,
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";

    return NextResponse.json(
      { error: timedOut ? "Translation took too long. Try again." : "Could not reach the translation service. Check your connection and retry." },
      { status: timedOut ? 504 : 502 },
    );
  }
}
