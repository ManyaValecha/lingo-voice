import { ArrowDown, ArrowRight, AudioLines, Globe2, Languages, LockKeyhole, Mic2, Sparkles } from "lucide-react";
import VoiceWorkspace from "./components/VoiceWorkspace";
import LegacyTool from "./components/LegacyTool";
import { STT_LANGUAGES } from "@/lib/voice-contract";

export default function Home() {
  return (
    <main className="site-shell">
      <header className="topbar">
        <a href="#top" className="brand" aria-label="Lingo Voice home"><span className="brand-mark"><AudioLines size={19} strokeWidth={2.25} /></span><span>Lingo <span>Voice</span></span></a>
        <nav className="top-nav" aria-label="Main navigation"><a href="#translate">Translate</a><a href="#languages">Languages</a><a href="#how-it-works">How it works</a></nav>
        <a href="#translate" className="top-cta">Open studio <ArrowRight size={14} /></a>
      </header>

      <section className="hero-section" id="top">
        <div className="hero-copy">
          <div className="hero-kicker"><span className="hero-kicker-pulse" /> MADE FOR THE WAY INDIA SPEAKS</div>
          <h1>Voice without<br /><span>borders.</span></h1>
          <p className="hero-lede">Say it in your language. Hear it in theirs. Lingo Voice turns spoken words into a conversation both sides can understand.</p>
          <div className="hero-actions"><a href="#translate" className="hero-button">Start speaking <ArrowRight size={16} /></a><a href="#how-it-works" className="hero-secondary"><span className="play-small"><ArrowDown size={13} /></span> See how it works</a></div>
          <div className="hero-proof"><div className="proof-avatars"><span>हि</span><span>த</span><span>ಕ</span><span>અ</span></div><span>Regional speech recognition, language-matched voice output</span></div>
        </div>
        <div className="hero-art" aria-label="Prisma, translation, and Timbre voice pipeline">
          <div className="hero-orb orb-one" /><div className="hero-orb orb-two" />
          <div className="hero-art-label"><span className="live-dot" /> YOUR WORDS, IN MOTION</div>
          <div className="floating-card source-float"><div className="float-label"><span className="flag-dot flag-saffron" /> SPOKEN · HINDI</div><p>नमस्ते, आप कैसे हैं?</p><div className="mini-wave"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div></div>
          <div className="flow-line flow-a"><span /></div>
          <div className="pipeline-node node-listen"><span className="node-icon"><Mic2 size={17} /></span><div><b>Prisma</b><small>listens</small></div></div>
          <div className="pipeline-node node-translate"><span className="node-icon"><Languages size={17} /></span><div><b>Meaning</b><small>translates</small></div></div>
          <div className="pipeline-node node-speak"><span className="node-icon"><AudioLines size={17} /></span><div><b>Timbre</b><small>speaks</small></div></div>
          <div className="flow-line flow-b"><span /></div>
          <div className="floating-card target-float"><div className="float-label"><span className="flag-dot flag-blue" /> UNDERSTOOD · ENGLISH</div><p>Hello, how are you?</p><div className="voice-play"><span><AudioLines size={13} /></span><div className="voice-track"><i /></div><small>0:03</small></div></div>
          <div className="hero-caption"><Sparkles size={13} /> Recognition, translation, and speech — each step stays clear.</div>
        </div>
        <a href="#translate" className="hero-scroll" aria-label="Scroll to voice studio"><span /><small>SCROLL TO SPEAK</small></a>
      </section>

      <div className="model-ribbon"><span>THE VOICE STACK</span><b>Gnani <em>Prisma</em></b><i /> <b>Sarvam <em>Translation</em></b><i /> <b>Gnani <em>Timbre</em></b><span className="ribbon-note">SPEECH IN · MEANING ACROSS · SPEECH OUT</span></div>
      <VoiceWorkspace />

      <section id="how-it-works" className="how-section">
        <div className="section-heading compact-heading"><div><div className="eyebrow"><span className="eyebrow-dot" /> THREE CLEAR STEPS</div><h2>A voice note becomes <span>a bridge.</span></h2><p>Every layer has one job. You can see what happened to your words.</p></div></div>
        <div className="how-grid">
          <article className="how-card"><span className="how-number">01</span><span className="how-icon"><Mic2 size={19} /></span><h3>Speak naturally</h3><p>Gnani Prisma converts speech to text across ten configured Indian language options.</p><span className="how-model">GNANI PRISMA · SPEECH TO TEXT</span></article>
          <article className="how-card"><span className="how-number">02</span><span className="how-icon"><Globe2 size={19} /></span><h3>Carry the meaning</h3><p>Sarvam Mayura translates between the ten configured Indian languages. Review or edit the result before speech generation.</p><span className="how-model">SARVAM MAYURA · MULTILINGUAL TRANSLATION</span></article>
          <article className="how-card"><span className="how-number">03</span><span className="how-icon"><AudioLines size={19} /></span><h3>Hear it understood</h3><p>Choose a language-matched Timbre voice, listen to the generated speech, and download the WAV.</p><span className="how-model">GNANI TIMBRE V2.5 · TEXT TO SPEECH</span></article>
        </div>
      </section>

      <section id="languages" className="languages-section">
        <div className="language-intro"><div className="eyebrow"><span className="eyebrow-dot" /> DOCUMENTED MODEL COVERAGE</div><h2>Many tongues.<br /><span>One conversation.</span></h2><p>Lingo Voice connects speech recognition, multilingual translation with Sarvam Mayura, and speech generation across ten configured Indian language options.</p></div>
        <div className="language-list" aria-label="Supported languages">{Object.entries(STT_LANGUAGES).map(([code, name], index) => <span className="language-pill" key={code}><i>{String(index + 1).padStart(2, "0")}</i>{name}</span>)}<span className="language-pill hinglish-pill"><i>+</i>Hinglish speech output</span></div>
      </section>

      <section className="privacy-section"><div className="privacy-icon"><LockKeyhole size={20} /></div><div><div className="eyebrow">BUILT WITH TRANSPARENCY</div><h2>Your voice has a clear route.</h2><p>Lingo Voice does not save raw recordings. Audio is sent to Gnani for transcription; transcript text is sent to the configured translation provider; translated text is sent to Gnani for speech generation. Recent text history stays in this browser only. This version has no sign-in or cloud conversation storage.</p></div><a href="https://github.com/ManyaValecha/lingo-voice" target="_blank" rel="noreferrer" className="privacy-link">Integration notes <ArrowRight size={14} /></a></section>

      <LegacyTool />

      <footer className="site-footer"><a href="#top" className="brand"><span className="brand-mark"><AudioLines size={17} /></span><span>Lingo <span>Voice</span></span></a><p>Every language deserves a voice. Every voice deserves to be understood.</p><div><a href="https://github.com/ManyaValecha/lingo-voice" target="_blank" rel="noreferrer">Open source on GitHub</a><span>Built for the Great Indian AI Internship Challenge</span></div></footer>
    </main>
  );
}
