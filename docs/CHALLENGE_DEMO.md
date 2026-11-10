# Great Indian AI Internship Challenge Demo

## 60-second demo narration

**0:00–0:08 — The problem**
“India speaks in many languages, and everyday conversations cross those boundaries. LingOSwap helps a spoken phrase travel while keeping the speech, translation, and voice stages visible.”

**0:08–0:19 — Record and choose languages**
“I’ll select Hindi as the source and English as the target, then choose a Timbre voice. I can record a short voice note or upload an audio clip. LingOSwap prepares a WAV recording for Prisma.”

**0:19–0:31 — Show recognition**
“Gnani Prisma turns the audio into a transcript. This is speech recognition only; it does not translate the words. The transcription appears separately so the user can see what was heard.”

**0:31–0:43 — Show translation**
“Cohere Command A Translate carries the text from Hindi to English. Translation is a separate stage, and I can review or edit it before speech generation.”

**0:43–0:54 — Hear the result**
“Gnani Timbre generates the selected English voice. I can play or download the WAV, and recent text-only translations stay in this browser.”

**0:54–1:00 — Close**
“LingOSwap combines Gnani Prisma for listening and Gnani Timbre for speaking, with Cohere translation in between. Every language deserves a voice. Every voice deserves to be understood.”

## Recording status and truthful narration

Prisma and Timbre each succeeded once through the local app routes in the earlier authorized check. One live Cohere Hindi-to-English request through the local app route also succeeded (HTTP 200, model `command-a-translate-08-2025`, route latency 1.531 s). Its meaning was preserved overall, but it changed the test name `manya` to `Many`; exact name preservation needs improvement. The complete browser flow remains unverified. Record only after testing the full browser flow, including playback and download. Do not make another provider call without authorization.

## LinkedIn / X announcement draft

> I’m building LingOSwap — Voice Without Borders for the Great Indian AI Internship Challenge.
>
> The voice workflow uses Gnani Prisma for speech recognition, Cohere for a distinct translation step, and Gnani Timbre to generate speech. Each stage is visible, and users can review the translation before listening.
>
> Every language deserves a voice. Every voice deserves to be understood.
>
> #GnaniAI #GreatIndianAIInternshipChallenge

Publish only after the completed flow is tested. Add a public demo link only after authentication, rate limiting, and deployment security are reviewed. No performance figures are claimed.
