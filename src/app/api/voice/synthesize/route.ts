import { NextResponse } from "next/server";
import { isTtsLanguage, isTtsVoice, MAX_TTS_CHARS } from "@/lib/voice-contract";
import { enforceVoiceRateLimit, hasPersistentRateLimitConfig } from "@/lib/voice-rate-limit";

export const maxDuration = 60;

const TIMBRE_ENDPOINT = "https://api.vachana.ai/api/v1/tts/inference";
const TIMBRE_MODEL = "timbre-v2.5";
const MAX_AUDIO_RESPONSE_BYTES = 20 * 1024 * 1024;

export async function POST(request: Request) {
  if (!(await enforceVoiceRateLimit(request))) {
    return NextResponse.json({ error: "Voice requests are temporarily limited. Configure persistent KV in production and retry." }, { status: process.env.NODE_ENV === "production" && !hasPersistentRateLimitConfig() ? 503 : 429 });
  }

  const apiKey = process.env.GNANI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Speech generation is not configured on this server yet." }, { status: 503 });
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 40 * 1024) {
    return NextResponse.json({ error: "Text request is too large." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send text and voice options as JSON." }, { status: 400 });
  }
  const input = body as { text?: unknown; language?: unknown; voice?: unknown };
  if (typeof input.text !== "string" || !input.text.trim()) {
    return NextResponse.json({ error: "There is no translated text to speak." }, { status: 400 });
  }
  if (input.text.length > MAX_TTS_CHARS) {
    return NextResponse.json({ error: `Text must be ${MAX_TTS_CHARS.toLocaleString()} characters or fewer.` }, { status: 413 });
  }
  if (typeof input.language !== "string" || !isTtsLanguage(input.language)) {
    return NextResponse.json({ error: "Choose a supported speech language." }, { status: 400 });
  }
  if (typeof input.voice !== "string" || !isTtsVoice(input.language, input.voice)) {
    return NextResponse.json({ error: "Choose a voice listed for the selected language." }, { status: 400 });
  }

  try {
    const response = await fetch(TIMBRE_ENDPOINT, {
      method: "POST",
      headers: {
        "X-API-Key-ID": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: input.text.trim(),
        model: TIMBRE_MODEL,
        voice: input.voice,
        language: input.language,
        speed: 1.0,
        audio_config: {
          sample_rate: 48_000,
          num_channels: 1,
          sample_width: 2,
          encoding: "linear_pcm",
          container: "wav",
        },
      }),
      signal: AbortSignal.timeout(45_000),
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 400) return NextResponse.json({ error: "Gnani rejected the text, language, or voice. Check the selections and retry." }, { status: 422 });
      if (response.status === 401 || response.status === 403) return NextResponse.json({ error: "Gnani credentials are not authorized for this speech request." }, { status: 503 });
      if (response.status === 429) return NextResponse.json({ error: "Speech generation is busy. Wait a moment and retry." }, { status: 429 });
      if (response.status === 503) return NextResponse.json({ error: "Speech generation is temporarily unavailable." }, { status: 503 });
      return NextResponse.json({ error: "Gnani could not generate audio. Try again shortly." }, { status: 502 });
    }

    const audio = await response.arrayBuffer();
    if (audio.byteLength === 0 || audio.byteLength > MAX_AUDIO_RESPONSE_BYTES) {
      return NextResponse.json({ error: "The speech service returned an invalid audio response." }, { status: 502 });
    }
    const contentType = response.headers.get("content-type")?.split(";")[0] || "audio/wav";
    if (contentType !== "audio/wav") {
      return NextResponse.json({ error: "The speech service returned an unexpected audio format." }, { status: 502 });
    }
    const wavHeader = Buffer.from(audio, 0, Math.min(audio.byteLength, 12));
    if (wavHeader.byteLength < 12 || wavHeader.toString("ascii", 0, 4) !== "RIFF" || wavHeader.toString("ascii", 8, 12) !== "WAVE") {
      return NextResponse.json({ error: "The speech service returned an invalid WAV file." }, { status: 502 });
    }

    return new Response(audio, {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Disposition": "inline; filename=lingoswap-timbre.wav",
        "Cache-Control": "no-store, private",
        "X-Audio-Model": TIMBRE_MODEL,
      },
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    return NextResponse.json(
      { error: timedOut ? "Audio generation took too long. Try shorter text." : "Could not reach the speech service. Check your connection and retry." },
      { status: timedOut ? 504 : 502 },
    );
  }
}
