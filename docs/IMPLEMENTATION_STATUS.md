# Implementation Checklist

## Completed locally

- [x] Continued the original LingOSwap Next.js codebase; no replacement project created.
- [x] Inspected the existing Cohere slang feature and retained it separately from voice translation.
- [x] Added voice-first landing page/workspace with microphone recording, upload preview, language/voice selection, visible pipeline stages, transcript and translation editing, copy, playback, WAV download, and local text-only history.
- [x] Implemented server-side Prisma transcription, Cohere translation, and Timbre synthesis routes with validation, timeouts, normalized errors, and rate limiting.
- [x] Complete translation UI and route currently support Hindi ↔ English only.
- [x] Added `.env.example` and updated README and challenge documentation without credential values.
- [x] Added 15 mocked route tests; all passed in the latest test run. The test suite itself makes no provider requests.
- [x] Earlier individual live checks for Prisma and Timbre are documented; they were not repeated in this work.
- [x] One authorized live Cohere translation request succeeded through the local route (HTTP 200, `command-a-translate-08-2025`, 1.531 s). The output changed `manya` to `Many`; exact name preservation is a known quality issue. No retry was made.

## Remaining verification and blockers

- [ ] Run final `npm run lint`, `npx tsc --noEmit`, and `npm run build` after the latest UI/docs changes.
- [ ] Full real browser audio → Prisma → Cohere → Timbre → playback/download test.
- [ ] Mobile, keyboard, and browser-console check in the target browser.
- [ ] No public deployment until voice endpoints have authentication/authorization and production rate limiting. Missing persistent KV currently makes production voice routes fail closed with 503.
- [ ] Screenshots/video captured from verified live output.

## Existing project constraints

The original repository has no authentication system or database. History remains local browser storage, not account-backed. The unauthenticated legacy Cohere slang endpoint is preserved and should also be reviewed before public exposure.
