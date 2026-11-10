import { NextResponse } from "next/server";
import { parseBuffer } from "music-metadata";
import {
  hasSupportedAudioExtension,
  isSttLanguage,
  isSupportedInputSampleRate,
  MAX_AUDIO_BYTES,
  MAX_AUDIO_SECONDS,
  normalizeProviderError,
} from "@/lib/voice-contract";
import { enforceVoiceRateLimit, hasPersistentRateLimitConfig } from "@/lib/voice-rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const PRISMA_ENDPOINT = "https://api.vachana.ai/stt/v3";

export async function POST(request: Request) {
  if (!(await enforceVoiceRateLimit(request))) {
    return NextResponse.json(
      { error: "Voice requests are temporarily limited. Configure persistent KV in production and try again shortly." },
      { status: process.env.NODE_ENV === "production" && !hasPersistentRateLimitConfig() ? 503 : 429 },
    );
  }

  const apiKey = process.env.GNANI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Speech transcription is not configured on this server yet." }, { status: 503 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_AUDIO_BYTES + 64 * 1024) {
    return NextResponse.json({ error: "Audio must be 15 MB or smaller." }, { status: 413 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Upload a supported audio file and try again." }, { status: 400 });
  }

  const file = formData.get("audio_file");
  const languageCode = formData.get("language_code");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose an audio file before transcribing." }, { status: 400 });
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: "Audio must be 15 MB or smaller." }, { status: 413 });
  }
  if (!hasSupportedAudioExtension(file.name)) {
    return NextResponse.json({ error: "Use a WAV, MP3, OGG, FLAC, AAC, or M4A audio file." }, { status: 415 });
  }
  if (typeof languageCode !== "string" || !isSttLanguage(languageCode)) {
    return NextResponse.json({ error: "Choose one of the supported transcription languages." }, { status: 400 });
  }

  const audioBytes = Buffer.from(await file.arrayBuffer());
  try {
    const metadata = await parseBuffer(audioBytes, file.type || undefined, { duration: true });
    if (!metadata.format.duration || !Number.isFinite(metadata.format.duration)) {
      return NextResponse.json({ error: "The audio duration could not be verified. Try a standard WAV, MP3, or M4A file." }, { status: 415 });
    }
    if (!isSupportedInputSampleRate(metadata.format.sampleRate)) {
      return NextResponse.json({ error: "Audio sample rates must be between 8 kHz and 44.1 kHz." }, { status: 415 });
    }
    if (metadata.format.duration > MAX_AUDIO_SECONDS) {
      return NextResponse.json({ error: "Prisma accepts clips up to 60 seconds. Trim the audio and try again." }, { status: 413 });
    }
  } catch {
    return NextResponse.json({ error: "This audio file could not be decoded. Check the file and try again." }, { status: 415 });
  }

  const providerForm = new FormData();
  providerForm.append("audio_file", new Blob([audioBytes], { type: file.type || "application/octet-stream" }), file.name);
  providerForm.append("language_code", languageCode);
  providerForm.append("format", "transcribe");

  try {
    const response = await fetch(PRISMA_ENDPOINT, {
      method: "POST",
      headers: { "X-API-Key-ID": apiKey },
      body: providerForm,
      signal: AbortSignal.timeout(45_000),
      cache: "no-store",
    });
    const result = await response.json().catch(() => null) as {
      success?: boolean;
      transcript?: string;
      request_id?: string;
      timestamp?: string;
      model?: string;
    } | null;

    if (!response.ok) {
      const mapped = normalizeProviderError(response.status);
      return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    }
    if (!result?.success || typeof result.transcript !== "string" || !result.transcript.trim()) {
      return NextResponse.json({ error: "No speech was recognized. Try a clearer recording." }, { status: 422 });
    }

    return NextResponse.json({
      transcript: result.transcript.trim(),
      requestId: result.request_id ?? null,
      timestamp: result.timestamp ?? null,
      model: result.model ?? null,
      endpoint: "/stt/v3",
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    return NextResponse.json(
      { error: timedOut ? "Transcription took too long. Try a shorter recording." : "Could not reach the speech service. Check your connection and retry." },
      { status: timedOut ? 504 : 502 },
    );
  }
}
