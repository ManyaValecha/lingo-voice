# LingOSwap Competition Readiness Report

**Status: local prototype with prior individual live checks recorded; full end-to-end provider workflow is not verified.** This update improves translation input protection and makes no provider calls. No deployment was performed.

## Verified implementation

- The existing Next.js application now has a voice workspace for recording mono WAV through the browser, uploading supported audio, previewing the input, selecting language and voice, and showing separate STT, translation, and TTS stages.
- The server route `POST /api/voice/transcribe` calls Gnani Prisma; `POST /api/voice/translate` calls Cohere Chat v2 using `command-a-translate-08-2025`; `POST /api/voice/synthesize` calls Gnani Timbre and returns binary WAV.
- Translation is restricted to Hindi (`hi-IN`) ↔ English (`en-IN`). Other documented speech model choices are visibly disabled for the complete conversion flow; this does not claim that translation covers those languages.
- History is text-only, local to the current browser, and limited to recent items. Raw audio is not saved by LingOSwap. A history item can be reopened and its translation spoken again.
- `COHERE_API_KEY` is read in the server route only. Existing `/api/cohere` slang rewriting remains separate. No key values were inspected, printed, or added to files.
- Official Cohere contract references: [Chat API v2](https://docs.cohere.com/reference/chat) and [Command A Translate](https://docs.cohere.com/v2/docs/command-a-translate). The route uses `POST https://api.cohere.com/v2/chat`, Bearer authentication, `model` + `messages`, and reads `message.content` text only when `finish_reason` is `COMPLETE`.

## Translation quality guard

Before sending text to Cohere, the route substitutes unique opaque tokens for clearly recognizable URLs, email addresses, common date forms, times, phone-like strings, numbers/currency values, and names immediately following “my name is” or “मेरा नाम”. It restores the original substrings exactly after translation. If a protected token is missing or duplicated, the route returns HTTP 502 rather than returning a result with a lost value. API request and response shapes are unchanged.

This is a conservative heuristic, not named-entity recognition. It does not identify arbitrary names in prose, and a phrase after a name-introduction cue may still be ambiguous. Mock tests verify Hindi and English name cues, mixed-language text, names in Devanagari, identifiers, dates/numbers, an ordinary translatable word, and safe failure if a token is omitted. No live request was made to evaluate model behavior with these changes. The earlier live example where “Manya” became “Many” predates the protection change; preservation is not claimed perfect.

## Test results

| Area | Outcome | Evidence / limit |
|---|---|---|
| Prisma endpoint | Previously passed one live short request | Recorded in `GNANI_AI_INTEGRATION.md`; not repeated in this work. |
| Timbre endpoint | Previously passed one live short WAV generation request | Recorded in `GNANI_AI_INTEGRATION.md`; not repeated in this work. |
| Cohere translation route | One earlier live request succeeded; current protection changes mock-tested | Earlier Hindi → English request via local route returned HTTP 200, model `command-a-translate-08-2025`, in 1.531 s. Output rendered `Manya` as `Many`. The new protection logic has not been evaluated against live Cohere. |
| Combined browser audio → transcript → translation → speech → playback | Not verified end to end | Browser UI was not submitted through a full real-provider workflow. |
| Local persistence/history | Implemented, browser behavior not fully exercised in this pass | Text only in localStorage; not authenticated or synced. |
| Desktop rendering | Previously visually inspected | No live API submission. |
| Mobile viewport / browser console | Not verified in available browser controls | Must check in a real browser/device before judging. |
| Tests / lint / TypeScript / production build | Passed | `npm test` (21 tests), `npm run lint`, `npx tsc --noEmit`, and `npm run build` passed. `git diff --check` passed. Current protection logic is mock-tested only. |
| Production endpoint security | Blocked | Voice routes have no authentication. Production rate limiting fails closed with 503 unless persistent KV is configured, but KV alone does not provide user authorization. Do not deploy publicly. |

## Environment and API call policy

Environment variable presence was checked without reading values: `COHERE_API_KEY` is present locally; `GNANI_API_KEY`, `OPENAI_API_KEY`, `KV_REST_API_URL`, and `KV_REST_API_TOKEN` are absent. No credentials are recorded here. The voice translation route does not require OpenAI. The Cohere credential is shared with the existing slang tool, which remains a separate integration.

Exactly one live Cohere translation request was made in the preceding authorized check; no live provider requests were made for this protection change. The previously authorized two Gnani checks were not repeated. No retries, direct Cohere calls, OpenAI calls, or deployments occurred in this change. Test-suite provider interactions are mocked and consume no provider credits.

The local environment was checked by variable presence only: `COHERE_API_KEY` is configured; `GNANI_API_KEY`, `OPENAI_API_KEY`, `KV_REST_API_URL`, and `KV_REST_API_TOKEN` are absent. No values were read or printed. The single Cohere request verified current account access for this model once. The earlier Gnani success cannot be repeated with the current local configuration. OpenAI is not required by the updated voice translation route.

## Reliability and security findings

- Production without both KV variables rejects voice API calls with HTTP 503 before contacting a provider. In local development/test, the limiter uses a per-process in-memory allowance of 15 requests per IP per minute. It is not shared across processes and resets at restart.
- KV does not secure these unauthenticated routes. Add authentication/authorization and provider-appropriate abuse controls before public deployment.
- Conversation text is stored in browser localStorage. It is not user-account isolated, encrypted, or backed up; users sharing a browser profile share its local history.
- The Cohere translation result is treated as complete only when the response reports `finish_reason: COMPLETE`. Provider errors are normalized and their bodies are not returned to clients.
- File validation and rate limiting exist, but this is not a security review or production readiness certification.

## Safe local browser checklist

Run the Next.js development server bound to loopback (`npm run dev -- --hostname 127.0.0.1`). Do not press submit in the workspace while local provider credentials are configured unless you have separately authorized that live request. To rehearse without provider calls, use mocked route responses/test harness only.

1. Open `/` at desktop width, inspect layout, links, selectors, and browser console.
2. Repeat at a mobile viewport; check for horizontal overflow, readable stage indicators, keyboard focus, and usable audio controls.
3. Confirm source/target choices expose only Hindi ↔ English as available in the full translation demo.
4. Test upload selection and input preview, empty file, unsupported extension, and over-size rejection without submitting to providers.
5. With explicitly authorized live calls only, record/upload a short Hindi clip and verify the distinct Prisma transcript, Cohere translation, Timbre WAV playback, and WAV download. Record per-stage latency from the browser/network timing and the provider/model response metadata; do not infer E2E timing from separate calls.
6. Check history persistence/reopen, text-only behavior, clear actions, and browser console.
7. Try microphone denial and network failures using mocks or browser permission controls; do not trigger additional live calls.

## Remaining blockers

1. Full browser pipeline test with one short Hindi sample, including Prisma, translation, Timbre playback, and WAV download. The route-level Cohere check alone does not verify the browser journey.
2. Improve name preservation: the one live response rendered `manya` as `Many`. Do not make another live call without authorization.
3. Mobile viewport, keyboard accessibility, and browser console verification.
4. Production design: authenticated endpoints, per-user history policy, persistent rate limiter, secrets configured at host, and a security review.
5. A secure public demo URL and screenshot/video capture after verification.

**Readiness decision:** suitable for a clearly labeled local prototype walkthrough and mock API tests. Not ready to claim a complete live multilingual service, broad language translation, authenticated conversation history, or public production deployment.
