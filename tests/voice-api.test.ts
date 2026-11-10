import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as transcribe } from "../src/app/api/voice/transcribe/route";
import { POST as translate } from "../src/app/api/voice/translate/route";
import { POST as synthesize } from "../src/app/api/voice/synthesize/route";
import { isTtsVoice, normalizeProviderError } from "../src/lib/voice-contract";

function wavFile(durationSeconds = 1, rate = 16_000): File {
  const samples = Math.floor(rate * durationSeconds);
  const bytes = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(bytes);
  const str = (at: number, value: string) => { for (let i = 0; i < value.length; i += 1) view.setUint8(at + i, value.charCodeAt(i)); };
  str(0, "RIFF"); view.setUint32(4, 36 + samples * 2, true); str(8, "WAVE");
  str(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, 1, true); view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true); str(36, "data"); view.setUint32(40, samples * 2, true);
  return new File([bytes], "sample.wav", { type: "audio/wav" });
}

function transcriptionRequest(file = wavFile(), language = "hi-IN") {
  const body = new FormData();
  body.append("audio_file", file);
  body.append("language_code", language);
  return new Request("http://localhost/api/voice/transcribe", { method: "POST", body });
}

let translationRequestId = 0;
function translationRequest(sourceLanguage = "hi-IN", targetLanguage = "en-IN", text = "नमस्ते, आप कैसे हैं?") {
  translationRequestId += 1;
  return new Request("http://localhost/api/voice/translate", {
    method: "POST", headers: { "Content-Type": "application/json", "x-real-ip": `mock-${translationRequestId}` },
    body: JSON.stringify({ text, sourceLanguage, targetLanguage }),
  });
}

function mockTranslationResponse(createTranslation: (input: string, tokens: string[]) => string) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
    const payload = JSON.parse(String(init?.body)) as { messages: Array<{ role: string; content: string }> };
    const userMessage = payload.messages.find((message) => message.role === "user")?.content ?? "";
    const input = userMessage.split("Text to translate:\n").at(-1) ?? "";
    const tokens = [...input.matchAll(/LSWP_[A-F0-9]{32}_\d+_END/gu)].map((match) => match[0]);
    return new Response(JSON.stringify({
      finish_reason: "COMPLETE",
      message: { content: [{ type: "text", text: createTranslation(input, tokens) }] },
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  });
}

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("GNANI_API_KEY", "mock-only-credential");
  vi.stubEnv("COHERE_API_KEY", "mock-only-credential");
  vi.stubEnv("KV_REST_API_URL", "");
  vi.stubEnv("KV_REST_API_TOKEN", "");
});

describe("Prisma route contract", () => {
  it("transcribes a short supported WAV with the documented multipart fields", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      success: true, request_id: "req_test", timestamp: "20261109_120000.000", transcript: "नमस्ते", model: "gnani-prisma-v2.5",
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const response = await transcribe(transcriptionRequest());
    const data = await response.json();
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const providerForm = init.body as FormData;
    expect(response.status).toBe(200);
    expect(data.transcript).toBe("नमस्ते");
    expect(data.requestId).toBe("req_test");
    expect(init.headers).toEqual({ "X-API-Key-ID": "mock-only-credential" });
    expect(providerForm.get("language_code")).toBe("hi-IN");
    expect(providerForm.get("format")).toBe("transcribe");
    expect(providerForm.get("audio_file")).toBeInstanceOf(Blob);
  });

  it("rejects unsupported audio before calling Gnani", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const response = await transcribe(transcriptionRequest(new File(["bad"], "recording.webm", { type: "audio/webm" })));
    expect(response.status).toBe(415);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects empty and unsupported language fields", async () => {
    const empty = await transcribe(transcriptionRequest(new File([], "empty.wav", { type: "audio/wav" })));
    const invalidLanguage = await transcribe(transcriptionRequest(wavFile(), "xx-XX"));
    expect(empty.status).toBe(400);
    expect(invalidLanguage.status).toBe(400);
  });

  it("rejects clips longer than 60 seconds and sample rates above 44.1 kHz", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const longClip = await transcribe(transcriptionRequest(wavFile(61)));
    const highSampleRate = await transcribe(transcriptionRequest(wavFile(1, 48_000)));
    expect(longClip.status).toBe(413);
    expect(highSampleRate.status).toBe(415);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps an invalid API key response to a safe configuration error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("unauthorized", { status: 401 }));
    const response = await transcribe(transcriptionRequest());
    expect(response.status).toBe(503);
    expect((await response.json()).error).not.toContain("unauthorized");
  });

  it("handles provider timeouts without exposing audio or credentials", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new DOMException("timeout", "TimeoutError"));
    const response = await transcribe(transcriptionRequest());
    expect(response.status).toBe(504);
    expect(await response.json()).toMatchObject({ error: expect.stringContaining("too long") });
  });

  it("does not send a request when the server key is missing", async () => {
    vi.stubEnv("GNANI_API_KEY", "");
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const response = await synthesize(new Request("http://localhost/api/voice/synthesize", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: "नमस्ते", language: "hi-IN", voice: "Nalini" }),
    }));
    expect(response.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("translation and Timbre routes", () => {
  it("translates through the separate configured translation layer", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      finish_reason: "COMPLETE",
      message: { content: [{ type: "text", text: "Hello, how are you?" }] },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const response = await translate(translationRequest());
    const payload = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ translation: "Hello, how are you?", provider: "Cohere", model: "command-a-translate-08-2025" });
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.cohere.com/v2/chat");
    expect((fetchMock.mock.calls[0][1]?.headers as Record<string, string>).Authorization).toBe("Bearer mock-only-credential");
    expect(payload.model).toBe("command-a-translate-08-2025");
    expect(payload.messages[0].role).toBe("system");
    expect(payload.messages[0].content).toContain("Translate");
  });

  it("protects and exactly restores an explicitly introduced Latin-script name", async () => {
    const fetchMock = mockTranslationResponse((_input, tokens) => `My name is ${tokens[0]}.`);
    const response = await translate(translationRequest("hi-IN", "en-IN", "मेरा नाम Manya है।"));
    const data = await response.json();
    const providerInput = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)).messages[1].content;
    expect(response.status).toBe(200);
    expect(data.translation).toBe("My name is Manya.");
    expect(providerInput).not.toContain("Manya");
    expect(providerInput).toMatch(/LSWP_[A-F0-9]{32}_0_END/u);
  });

  it("protects a Devanagari name in an explicit Hindi name introduction", async () => {
    const fetchMock = mockTranslationResponse((_input, tokens) => `My name is ${tokens[0]}.`);
    const response = await translate(translationRequest("hi-IN", "en-IN", "मेरा नाम मान्या है।"));
    expect(response.status).toBe(200);
    expect((await response.json()).translation).toBe("My name is मान्या.");
    const providerInput = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)).messages[1].content;
    expect(providerInput).not.toContain("मान्या");
  });

  it("protects dates, times, and currency values and restores exact formatting", async () => {
    const fetchMock = mockTranslationResponse((_input, tokens) => `Meeting on ${tokens[0]} at ${tokens[1]}; amount ${tokens[2]}.`);
    const response = await translate(translationRequest("hi-IN", "en-IN", "बैठक 15 अगस्त 2025 को 10:30 बजे है और राशि ₹2,500 है।"));
    expect(response.status).toBe(200);
    expect((await response.json()).translation).toBe("Meeting on 15 अगस्त 2025 at 10:30; amount ₹2,500.");
    const providerInput = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)).messages[1].content;
    expect(providerInput).not.toContain("15 अगस्त 2025");
    expect(providerInput).not.toContain("10:30");
    expect(providerInput).not.toContain("₹2,500");
  });

  it("protects names, email, and numeric dates in mixed Hindi-English text", async () => {
    const fetchMock = mockTranslationResponse((_input, tokens) => `My name is ${tokens[0]}; write to ${tokens[1]} using ${tokens[2]} by ${tokens[3]}.`);
    const response = await translate(translationRequest("hi-IN", "en-IN", "मेरा नाम Manya है और email manya@example.com पर https://example.com/docs लिंक 25/12/2026 तक भेजें।"));
    expect(response.status).toBe(200);
    expect((await response.json()).translation).toBe("My name is Manya; write to manya@example.com using https://example.com/docs by 25/12/2026.");
    const providerInput = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)).messages[1].content;
    expect(providerInput).not.toContain("Manya");
    expect(providerInput).not.toContain("manya@example.com");
    expect(providerInput).not.toContain("https://example.com/docs");
    expect(providerInput).not.toContain("25/12/2026");
  });

  it("fails safely if the model drops a protected token", async () => {
    mockTranslationResponse(() => "My name is Many.");
    const response = await translate(translationRequest("hi-IN", "en-IN", "मेरा नाम Manya है।"));
    expect(response.status).toBe(502);
    expect((await response.json()).error).toContain("did not preserve a protected name or value");
  });

  it("keeps ordinary Hindi words visible for translation and preserves English-to-Hindi support", async () => {
    const fetchMock = mockTranslationResponse(() => "I like mangoes.");
    const ordinary = await translate(translationRequest("hi-IN", "en-IN", "मुझे आम पसंद हैं।"));
    expect(ordinary.status).toBe(200);
    expect((await ordinary.json()).translation).toBe("I like mangoes.");
    const ordinaryInput = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)).messages[1].content;
    expect(ordinaryInput).toContain("मुझे आम पसंद हैं।");
    expect(ordinaryInput).not.toContain("LSWP_");

    mockTranslationResponse((_input, tokens) => `मेरा नाम ${tokens[0]} है।`);
    const reverse = await translate(translationRequest("en-IN", "hi-IN", "My name is Manya."));
    expect(reverse.status).toBe(200);
    expect((await reverse.json()).translation).toBe("मेरा नाम Manya है।");
  });

  it("rejects unsupported translation locales without calling Cohere", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const response = await translate(translationRequest("gu-IN", "en-IN"));
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requires the server-side Cohere key without making a provider call", async () => {
    vi.stubEnv("COHERE_API_KEY", "");
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const response = await translate(translationRequest());
    expect(response.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps Cohere throttling and invalid credentials to safe errors", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    fetchMock.mockResolvedValueOnce(new Response("provider details", { status: 429 }));
    let response = await translate(translationRequest());
    expect(response.status).toBe(429);
    expect((await response.json()).error).not.toContain("provider details");
    fetchMock.mockResolvedValueOnce(new Response("provider details", { status: 498 }));
    response = await translate(translationRequest());
    expect(response.status).toBe(503);
  });

  it("rejects incomplete Cohere responses and maps a provider timeout", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ finish_reason: "MAX_TOKENS", message: { content: [{ type: "text", text: "Hello" }] } }), { status: 200 }));
    let response = await translate(translationRequest());
    expect(response.status).toBe(502);
    fetchMock.mockRejectedValueOnce(new DOMException("timeout", "TimeoutError"));
    response = await translate(translationRequest());
    expect(response.status).toBe(504);
  });

  it("returns a binary WAV for a valid Timbre voice and language", async () => {
    const validWav = await wavFile().arrayBuffer();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(validWav, {
      status: 200, headers: { "Content-Type": "audio/wav" },
    }));
    const response = await synthesize(new Request("http://localhost/api/voice/synthesize", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: "Hello", language: "en-IN", voice: "Kaveri" }),
    }));
    const payload = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("audio/wav");
    expect(payload.model).toBe("timbre-v2.5");
    expect(payload.voice).toBe("Kaveri");
    expect((await response.arrayBuffer()).byteLength).toBe(validWav.byteLength);
  });

  it("rejects a voice that does not belong to the chosen language", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const response = await synthesize(new Request("http://localhost/api/voice/synthesize", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: "Hello", language: "en-IN", voice: "Nalini" }),
    }));
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(isTtsVoice("hi-IN", "Nalini")).toBe(true);
    expect(isTtsVoice("en-IN", "Nalini")).toBe(false);
  });

  it("maps documented provider error classes without returning provider content", () => {
    expect(normalizeProviderError(429).status).toBe(429);
    expect(normalizeProviderError(503).status).toBe(503);
    expect(normalizeProviderError(500).status).toBe(502);
    expect(normalizeProviderError(400).message).not.toContain("<");
  });
});
