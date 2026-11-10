# Great Indian AI Internship Challenge — Readiness Checklist

**Status: Gnani routes have prior individual live checks; one authorized live Cohere translation request succeeded; complete live browser workflow remains unverified.**

See [competition readiness report](./COMPETITION_READINESS_REPORT.md) for evidence, limits, and the safe browser checklist.

## Integration and demo

- [x] Implemented server-side Prisma transcription and Timbre WAV synthesis routes.
- [x] Implemented a separate Cohere Chat v2 translation route with the documented `command-a-translate-08-2025` model identifier.
- [x] Restrict the full UI and translation route to Hindi ↔ English; other speech model languages are not claimed as translated.
- [x] Mocked route tests cover success, input validation, provider errors, missing keys, incomplete response, and timeout without provider calls.
- [x] Prior authorized checks: one Prisma request succeeded and one Timbre request returned WAV. See [integration notes](./GNANI_AI_INTEGRATION.md); not repeated here.
- [x] One authorized live Cohere translation request: HTTP 200 via the local app route, model `command-a-translate-08-2025`, 1.531 s. It translated the sentence but changed `manya` to `Many`; no retry.
- [ ] Full browser sequence with one short Hindi recording/upload, real transcript, translation, generated playback, and WAV download.
- [ ] Confirm current account model/voice permissions beyond the two prior one-off Gnani calls.
- [ ] Capture verified screenshots and record the 60-second demo after live flow succeeds.

## Safety and public deployment

- [x] Demo server should be bound to `127.0.0.1` while the routes lack authentication.
- [x] No credentials or values included in this checklist.
- [ ] Add identity/access controls and abuse protection before public deployment. Persistent KV is required for production rate limiting, but KV alone does not authenticate callers.
- [ ] Check mobile layout, keyboard accessibility, and browser console in the target browser.

## Submission materials

- [x] 60-second narration draft in [CHALLENGE_DEMO.md](./CHALLENGE_DEMO.md).
- [x] LinkedIn/X draft with `#GnaniAI` and `#GreatIndianAIInternshipChallenge` in [CHALLENGE_DEMO.md](./CHALLENGE_DEMO.md).
- [x] Submission description draft below.
- [ ] Screenshots and video: none included yet; capture only from verified output.
- [ ] Public URL: none. Do not deploy the current unauthenticated endpoints.

## Submission description draft

> LingOSwap — Voice Without Borders is a multilingual voice communication prototype. It accepts a short voice note, transcribes it through Gnani Prisma, translates Hindi and English text through a separate Cohere stage, and can synthesize translated text using Gnani Timbre. Users can inspect and edit text, listen to or download generated WAV, and keep recent text-only translations in browser-local history. Prisma and Timbre are distinct speech recognition and speech synthesis models; neither is presented as translation. Individual Prisma and Timbre app-route checks succeeded previously. Cohere translation and the complete browser flow still require live verification.

## Manual action remaining

No further live provider requests are authorized by this test. The human demo operator still needs to review/capture the app in the desired recording browser and verify the full browser journey before recording. No API keys need to be pasted into chat or source files.
