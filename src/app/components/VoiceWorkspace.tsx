"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  AudioLines,
  Check,
  ChevronDown,
  CircleAlert,
  Clock3,
  Copy,
  Headphones,
  LoaderCircle,
  Mic,
  MicOff,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Trash2,
  Volume2,
  Waves,
} from "lucide-react";
import { isSttLanguage, isTtsLanguage, STT_LANGUAGES, TTS_LANGUAGES, TTS_VOICES, isTranslationLanguage } from "@/lib/voice-contract";
import type { STT_LANGUAGES as SttLanguages } from "@/lib/voice-contract";

type SttLanguage = keyof typeof SttLanguages;
type TtsLanguage = keyof typeof TTS_LANGUAGES;
type Stage = "idle" | "recording" | "transcribing" | "translating" | "synthesizing" | "done" | "error";
type Conversation = {
  id: string;
  createdAt: string;
  audioLabel?: string;
  sourceLanguage: SttLanguage;
  targetLanguage: TtsLanguage;
  transcript: string;
  translation: string;
  voice?: string;
};
type RecorderCapture = {
  context: AudioContext;
  stream: MediaStream;
  source: MediaStreamAudioSourceNode;
  processor: ScriptProcessorNode;
  chunks: Float32Array[];
};

const HISTORY_KEY = "lingoswap.voice.history.v1";
const STT_FORMATS = ".wav,.mp3,.ogg,.flac,.aac,.m4a";

export default function VoiceWorkspace() {
  const [sourceLanguage, setSourceLanguage] = useState<SttLanguage>("hi-IN");
  const [targetLanguage, setTargetLanguage] = useState<TtsLanguage>("en-IN");
  const [voice, setVoice] = useState(TTS_VOICES["en-IN"][0]);
  const [file, setFile] = useState<File | null>(null);
  const [transcript, setTranscript] = useState("");
  const [translation, setTranslation] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState("");
  const [history, setHistory] = useState<Conversation[]>([]);
  const [audioUrl, setAudioUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [recordingPaused, setRecordingPaused] = useState(false);
  const [inputAudioUrl, setInputAudioUrl] = useState("");
  const [transcriptCopied, setTranscriptCopied] = useState(false);
  const captureRef = useRef<RecorderCapture | null>(null);
  const recordingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedSecondsRef = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        setHistory(Array.isArray(parsed) ? parsed.filter(isConversation).slice(0, 20) : []);
      }
    } catch {
      try { localStorage.removeItem(HISTORY_KEY); } catch { /* Storage can be disabled by the browser. */ }
    }
  }, []);

  useEffect(() => () => {
    if (inputAudioUrl) URL.revokeObjectURL(inputAudioUrl);
  }, [inputAudioUrl]);

  const clearAudio = useCallback(() => {
    setAudioUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return "";
    });
  }, []);

  const stopRecording = useCallback(async () => {
    const capture = captureRef.current;
    if (!capture) return;
    captureRef.current = null;
    if (recordingTimer.current) clearTimeout(recordingTimer.current);
    capture.processor.onaudioprocess = null;
    capture.processor.disconnect();
    capture.source.disconnect();
    capture.stream.getTracks().forEach((track) => track.stop());
    setRecordingPaused(false);

    const sampleCount = capture.chunks.reduce((count, chunk) => count + chunk.length, 0);
    if (sampleCount < capture.context.sampleRate * 0.4) {
      await capture.context.close();
      setStage("error");
      setError("That recording was very short. Hold the microphone for a little longer and try again.");
      return;
    }
    const samples = new Float32Array(sampleCount);
    let offset = 0;
    capture.chunks.forEach((chunk) => {
      samples.set(chunk, offset);
      offset += chunk.length;
    });
    const wav = encodeWav(samples, capture.context.sampleRate);
    await capture.context.close();
    const recording = new File([wav], `lingoswap-${Date.now()}.wav`, { type: "audio/wav" });
    setFile(recording);
    setInputAudioUrl(URL.createObjectURL(recording));
    setTranscript("");
    setTranslation("");
    clearAudio();
    setError("");
    setElapsed(Math.min(60, Math.round(sampleCount / capture.context.sampleRate)));
    setStage("idle");
  }, [clearAudio]);

  useEffect(() => () => {
    if (recordingTimer.current) clearTimeout(recordingTimer.current);
    const capture = captureRef.current;
    if (capture) {
      capture.processor.onaudioprocess = null;
      capture.stream.getTracks().forEach((track) => track.stop());
      void capture.context.close();
    }
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  const startRecording = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
      const context = new AudioContext({ sampleRate: 44_100 });
      const source = context.createMediaStreamSource(stream);
      const processor = context.createScriptProcessor(4096, 1, 1);
      const chunks: Float32Array[] = [];
      processor.onaudioprocess = (event) => {
        chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
        event.outputBuffer.getChannelData(0).fill(0);
      };
      source.connect(processor);
      processor.connect(context.destination);
      captureRef.current = { context, stream, source, processor, chunks };
      setFile(null);
      setInputAudioUrl("");
      setTranscript("");
      setTranslation("");
      clearAudio();
      setElapsed(0);
      elapsedSecondsRef.current = 0;
      setRecordingPaused(false);
      setStage("recording");
      const tick = () => {
        if (!captureRef.current) return;
        if (captureRef.current.context.state === "running") {
          elapsedSecondsRef.current += 1;
          setElapsed(elapsedSecondsRef.current);
          if (elapsedSecondsRef.current >= 60) {
            void stopRecording();
            return;
          }
        }
        recordingTimer.current = setTimeout(tick, 1_000);
      };
      recordingTimer.current = setTimeout(tick, 1_000);
    } catch {
      setStage("error");
      setError("Microphone access was unavailable. Allow microphone access or upload an audio file instead.");
    }
  };

  const toggleRecordingPause = async () => {
    const capture = captureRef.current;
    if (!capture) return;
    try {
      if (capture.context.state === "running") {
        await capture.context.suspend();
        setRecordingPaused(true);
      } else if (capture.context.state === "suspended") {
        await capture.context.resume();
        setRecordingPaused(false);
      }
    } catch {
      setError("This browser could not pause the recording. You can stop and retry instead.");
    }
  };

  const handleFile = (selected: File | undefined) => {
    if (!selected) return;
    if (selected.size === 0) {
      setError("This audio file is empty. Choose a recording that contains speech.");
      return;
    }
    const extension = selected.name.split(".").pop()?.toLowerCase() ?? "";
    if (!STT_FORMATS.split(",").includes(`.${extension}`)) {
      setError("Choose a WAV, MP3, OGG, FLAC, AAC, or M4A file.");
      return;
    }
    if (selected.size > 15 * 1024 * 1024) {
      setError("Audio must be 15 MB or smaller.");
      return;
    }
    setFile(selected);
    setInputAudioUrl(URL.createObjectURL(selected));
    setTranscript("");
    setTranslation("");
    clearAudio();
    setElapsed(0);
    setRecordingPaused(false);
    setError("");
    setStage("idle");
  };

  const runPipeline = async () => {
    if (!file) {
      setError("Record a voice note or upload an audio file to begin.");
      setStage("error");
      return;
    }
    setError("");
    try {
      let nextTranscript = transcript;
      let nextTranslation = translation;

      if (!nextTranscript) {
        setStage("transcribing");
        const body = new FormData();
        body.append("audio_file", file, file.name);
        body.append("language_code", sourceLanguage);
        const response = await fetch("/api/voice/transcribe", { method: "POST", body });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Transcription failed.");
        nextTranscript = result.transcript;
        setTranscript(nextTranscript);
      }

      if (!nextTranslation) {
        setStage("translating");
        const response = await fetch("/api/voice/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: nextTranscript, sourceLanguage, targetLanguage }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Translation failed.");
        nextTranslation = result.translation;
        setTranslation(nextTranslation);
      }

      const speechCreated = await synthesizeText(nextTranslation);
      if (!speechCreated) return;

      const item: Conversation = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        audioLabel: file.name.startsWith("lingoswap-") ? "Microphone recording" : file.name,
        sourceLanguage,
        targetLanguage,
        transcript: nextTranscript,
        translation: nextTranslation,
        voice,
      };
      setHistory((current) => {
        const next = [item, ...current].slice(0, 20);
        try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* Storage may be disabled or full. */ }
        return next;
      });
    } catch (caught) {
      setStage("error");
      setError(caught instanceof Error ? caught.message : "Something went wrong. Retry the last step.");
    }
  };

  const synthesizeText = async (text: string): Promise<boolean> => {
    setStage("synthesizing");
    setError("");
    try {
      const response = await fetch("/api/voice/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language: targetLanguage, voice }),
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Speech generation failed.");
      }
      const audio = await response.blob();
      clearAudio();
      setAudioUrl(URL.createObjectURL(audio));
      setStage("done");
      return true;
    } catch (caught) {
      setStage("error");
      setError(caught instanceof Error ? caught.message : "Could not generate speech. Retry the last step.");
      return false;
    }
  };

  const swapLanguages = () => {
    if (sourceLanguage === targetLanguage || !isTranslationLanguage(targetLanguage) || !isTranslationLanguage(sourceLanguage)) return;
    setSourceLanguage(targetLanguage as SttLanguage);
    setTargetLanguage(sourceLanguage);
    setVoice(TTS_VOICES[sourceLanguage][0]);
    setTranscript("");
    setTranslation("");
    clearAudio();
    setStage("idle");
  };

  const clearCurrent = () => {
    const capture = captureRef.current;
    if (capture) {
      captureRef.current = null;
      if (recordingTimer.current) clearTimeout(recordingTimer.current);
      capture.processor.onaudioprocess = null;
      capture.processor.disconnect();
      capture.source.disconnect();
      capture.stream.getTracks().forEach((track) => track.stop());
      void capture.context.close();
    }
    setFile(null);
    setInputAudioUrl("");
    setTranscript("");
    setTranslation("");
    setError("");
    setElapsed(0);
    elapsedSecondsRef.current = 0;
    setRecordingPaused(false);
    setStage("idle");
    clearAudio();
    if (fileInput.current) fileInput.current.value = "";
  };

  const copyTranslation = async () => {
    if (!translation) return;
    try {
      await navigator.clipboard.writeText(translation);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Clipboard access was unavailable. Select and copy the translation manually.");
    }
  };

  const copyTranscript = async () => {
    if (!transcript) return;
    try {
      await navigator.clipboard.writeText(transcript);
      setTranscriptCopied(true);
      setTimeout(() => setTranscriptCopied(false), 1_500);
    } catch {
      setError("Clipboard access was unavailable. Select and copy the transcript manually.");
    }
  };

  const loadConversation = (item: Conversation) => {
    setSourceLanguage(item.sourceLanguage);
    setTargetLanguage(item.targetLanguage);
    setVoice(item.voice && TTS_VOICES[item.targetLanguage].includes(item.voice) ? item.voice : TTS_VOICES[item.targetLanguage][0]);
    setTranscript(item.transcript);
    setTranslation(item.translation);
    setFile(null);
    setInputAudioUrl("");
    setError("");
    clearAudio();
    setStage("idle");
  };

  const removeHistory = () => {
    setHistory([]);
    try { localStorage.removeItem(HISTORY_KEY); } catch { /* Storage may be disabled. */ }
  };

  const busy = ["transcribing", "translating", "synthesizing"].includes(stage);

  return (
    <section id="translate" className="workspace-section">
      <div className="section-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-dot" /> VOICE TRANSLATION STUDIO</div>
          <h2>Make every conversation <span>understandable.</span></h2>
          <p>Record a phrase or drop in a voice note. See each step as it happens.</p>
        </div>
        <div className="privacy-chip"><span className="privacy-dot" /> Audio is processed for this request, not saved to history</div>
      </div>

      <div className="voice-layout">
        <div className="voice-main-card glass-card">
          <div className="language-row">
            <label className="language-control">
              <span>FROM</span>
              <select aria-label="Source language" value={sourceLanguage} onChange={(event) => {
                setSourceLanguage(event.target.value as SttLanguage);
                setTranscript(""); setTranslation(""); clearAudio(); setStage("idle");
              }}>
                {Object.entries(STT_LANGUAGES).map(([code, label]) => <option key={code} value={code} disabled={!isTranslationLanguage(code)}>{label}{isTranslationLanguage(code) ? "" : " · not in translation demo"}</option>)}
              </select>
            </label>
              <button type="button" aria-label="Swap languages" className="swap-button" onClick={swapLanguages} title={targetLanguage in STT_LANGUAGES ? "Swap source and target" : "Hinglish is currently available as a speech output language only"}>
              <ArrowLeftRight size={17} />
            </button>
            <label className="language-control">
              <span>TO</span>
              <select aria-label="Target language" value={targetLanguage} onChange={(event) => {
                const nextLanguage = event.target.value as TtsLanguage;
                setTargetLanguage(nextLanguage); setVoice(TTS_VOICES[nextLanguage][0]); setTranslation(""); clearAudio(); setStage("idle");
              }}>
                {Object.entries(TTS_LANGUAGES).map(([code, label]) => <option key={code} value={code} disabled={!isTranslationLanguage(code)}>{label}{isTranslationLanguage(code) ? "" : " · not in translation demo"}</option>)}
              </select>
            </label>
          </div>
          <p className="language-availability-note">Cohere translation is enabled for Hindi ↔ English in this prototype. Other Prisma/Timbre language options are disabled until a supported translation model is configured.</p>

          <label className="voice-select-control">
            <span>VOICE</span>
            <select aria-label="Timbre voice" value={voice} onChange={(event) => { setVoice(event.target.value); clearAudio(); setStage("idle"); }}>
              {TTS_VOICES[targetLanguage].map((voiceName) => <option key={voiceName} value={voiceName}>{voiceName}</option>)}
            </select>
            <small>Recommended for {TTS_LANGUAGES[targetLanguage]}</small>
          </label>

          <div className={`recording-zone ${stage === "recording" ? "is-recording" : ""}`}>
            <div className="waveform" aria-hidden="true">
              {Array.from({ length: 41 }, (_, index) => <i key={index} style={{ "--bar": `${Math.round(10 + Math.abs(Math.sin(index * 12.41) * Math.cos(index * 2.31)) * 52)}%` } as React.CSSProperties} />)}
            </div>
            <div className="record-controls">
              <button
                type="button"
                className={`record-button ${stage === "recording" ? "record-button-active" : ""}`}
                onClick={() => stage === "recording" ? void stopRecording() : void startRecording()}
                aria-label={stage === "recording" ? "Stop recording" : "Start recording"}
              >
                {stage === "recording" ? <MicOff size={23} /> : <Mic size={23} />}
              </button>
              {stage === "recording" && <button type="button" className="pause-recording" onClick={() => void toggleRecordingPause()} aria-label={recordingPaused ? "Resume recording" : "Pause recording"}>{recordingPaused ? <Play size={14} /> : <Pause size={14} />}{recordingPaused ? "Resume" : "Pause"}</button>}
            </div>
            <div className="record-label">
              <strong>{stage === "recording" ? recordingPaused ? "Recording paused" : "Listening…" : file ? "Voice note ready" : "Tap to speak"}</strong>
              <span>{stage === "recording" ? `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")} · max 01:00` : file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB` : "Your microphone recording stays in this session"}</span>
            </div>
            <div className="audio-input-actions">
              <button type="button" className="text-action" onClick={() => fileInput.current?.click()}>
                <AudioLines size={15} /> Upload audio
              </button>
              {file && <button type="button" className="text-action subtle-action" onClick={() => { setFile(null); setInputAudioUrl(""); setElapsed(0); }}><Trash2 size={14} /> Remove</button>}
              <input ref={fileInput} type="file" accept={STT_FORMATS} className="sr-only" onChange={(event) => handleFile(event.target.files?.[0])} aria-label="Upload audio file" />
            </div>
          </div>
          {inputAudioUrl && <audio controls src={inputAudioUrl} className="audio-input-preview" aria-label="Preview input voice note" />}

          {error && <div className="error-banner" role="alert"><CircleAlert size={17} /><span>{error}</span></div>}

          <div className="pipeline-steps" aria-label="Voice translation stages">
            <Step label="Transcribe" detail="Prisma STT" active={stage === "transcribing"} complete={Boolean(transcript)} />
            <div className="step-connector" />
            <Step label="Translate" detail="Cohere Command A Translate" active={stage === "translating"} complete={Boolean(translation)} />
            <div className="step-connector" />
            <Step label="Speak" detail="Timbre TTS" active={stage === "synthesizing"} complete={Boolean(audioUrl)} />
          </div>

          <button type="button" className="primary-action" disabled={busy || stage === "recording" || !file} onClick={() => void runPipeline()}>
            {busy ? <><LoaderCircle className="spin" size={17} /> {stage === "transcribing" ? "Recognizing speech" : stage === "translating" ? "Translating meaning" : "Creating your voice"}</> : stage === "done" ? <><RotateCcw size={17} /> Run this voice note again</> : stage === "error" ? <><RotateCcw size={17} /> Retry the last step</> : <><Sparkles size={17} /> Translate this voice note</>}
          </button>
          <p className="workspace-footnote">Prisma recognizes speech · Cohere translates Hindi ↔ English · Timbre speaks the result</p>
        </div>

        <div className="results-column">
          <div className="result-card glass-card transcript-card">
            <div className="result-title"><span className="result-icon transcript-icon"><Waves size={16} /></span><div><h3>What we heard</h3><p>Transcription · {STT_LANGUAGES[sourceLanguage]}</p></div><span className={`result-state ${transcript ? "state-ready" : ""}`}>{transcript ? "READY" : "WAITING"}</span></div>
            <textarea className={`transcript-edit ${transcript ? "" : "result-empty"}`} aria-label="Recognized transcription" placeholder="Your recognized speech will appear here." value={transcript} onChange={(event) => { setTranscript(event.target.value); setTranslation(""); clearAudio(); if (event.target.value) setStage("idle"); }} rows={3} />
            <div className="result-actions"><button type="button" disabled={!transcript} onClick={() => void copyTranscript()} className="mini-action">{transcriptCopied ? <Check size={14} /> : <Copy size={14} />} {transcriptCopied ? "Copied" : "Copy transcript"}</button></div>
          </div>

          <div className="result-card glass-card translation-card">
            <div className="result-title"><span className="result-icon translation-icon"><Sparkles size={16} /></span><div><h3>In your language</h3><p>Translation · {TTS_LANGUAGES[targetLanguage]}</p></div><span className={`result-state ${translation ? "state-ready" : ""}`}>{translation ? "READY" : "WAITING"}</span></div>
            <textarea
              className={`translation-edit ${translation ? "" : "result-empty"}`}
              aria-label="Translated text; editable before speech generation"
              placeholder="Your translation will appear here. You can edit it before generating speech."
              value={translation}
              onChange={(event) => { setTranslation(event.target.value); clearAudio(); if (event.target.value) setStage("idle"); }}
              rows={3}
            />
            <div className="result-actions">
              <button type="button" disabled={!translation} onClick={() => void copyTranslation()} className="mini-action">{copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}</button>
              {translation && !audioUrl && <button type="button" onClick={() => void synthesizeText(translation)} className="mini-action"><Volume2 size={14} /> Speak translation</button>}
            </div>
          </div>

          {audioUrl ? (
            <div className="audio-result glass-card">
              <div className="result-title"><span className="result-icon audio-icon"><Headphones size={16} /></span><div><h3>Ready to listen</h3><p>Timbre · {voice} · WAV</p></div><span className="result-state state-ready">READY</span></div>
              <audio controls src={audioUrl} className="audio-player" aria-label="Generated translated speech" />
              <a className="download-link" href={audioUrl} download="lingoswap-translation.wav"><ArrowDownToLine size={15} /> Download audio</a>
            </div>
          ) : null}

          {stage === "done" && <div className="success-line"><Check size={14} /> Translation ready. Your audio is available to play or download.</div>}
        </div>
      </div>

      <div className="history-panel glass-card">
        <div className="history-heading"><div className="history-title"><Clock3 size={17} /><div><h3>Recent voice notes</h3><p>Stored locally on this device · audio is not kept</p></div></div>{history.length > 0 && <button type="button" className="text-action subtle-action" onClick={removeHistory}><Trash2 size={14} /> Clear history</button>}</div>
        {history.length === 0 ? (
          <div className="history-empty"><div className="history-empty-icon"><AudioLines size={17} /></div><div><strong>Your recent translations will live here</strong><span>Run your first voice note to create a private local history.</span></div><ChevronDown size={16} /></div>
        ) : (
          <div className="history-list">{history.map((item) => <button key={item.id} type="button" className="history-item" onClick={() => loadConversation(item)}><span className="history-item-languages">{STT_LANGUAGES[item.sourceLanguage]} <ArrowLeftRight size={12} /> {TTS_LANGUAGES[item.targetLanguage]}</span><span className="history-item-text">{item.translation}</span><span className="history-item-time">{item.audioLabel ? `${item.audioLabel} · ` : ""}{new Date(item.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span></button>)}</div>
        )}
        {file || transcript || translation ? <button type="button" className="clear-current" onClick={clearCurrent}><RotateCcw size={14} /> Clear current conversation</button> : null}
      </div>
    </section>
  );
}

function Step({ label, detail, active, complete }: { label: string; detail: string; active: boolean; complete: boolean }) {
  return <div className={`pipeline-step ${active ? "step-active" : ""} ${complete ? "step-complete" : ""}`}>
    <span className="step-icon">{active ? <LoaderCircle className="spin" size={13} /> : complete ? <Check size={13} /> : <span />}</span>
    <span className="step-label">{label}<small>{detail}</small></span>
  </div>;
}

function isConversation(value: unknown): value is Conversation {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<Conversation>;
  return typeof item.id === "string" && typeof item.createdAt === "string"
    && typeof item.sourceLanguage === "string" && isSttLanguage(item.sourceLanguage)
    && typeof item.targetLanguage === "string" && isTtsLanguage(item.targetLanguage)
    && typeof item.transcript === "string" && typeof item.translation === "string"
    && (item.voice === undefined || typeof item.voice === "string")
    && (item.audioLabel === undefined || typeof item.audioLabel === "string");
}

function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const dataBytes = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);
  const writeText = (offset: number, text: string) => { for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i)); };
  writeText(0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, "data");
  view.setUint32(40, dataBytes, true);
  let index = 44;
  for (const sample of samples) {
    const clipped = Math.max(-1, Math.min(1, sample));
    view.setInt16(index, clipped < 0 ? clipped * 0x8000 : clipped * 0x7fff, true);
    index += 2;
  }
  return buffer;
}
