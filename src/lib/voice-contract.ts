export const STT_LANGUAGES = {
  "bn-IN": "Bengali",
  "en-IN": "English",
  "gu-IN": "Gujarati",
  "hi-IN": "Hindi",
  "kn-IN": "Kannada",
  "ml-IN": "Malayalam",
  "mr-IN": "Marathi",
  "pa-IN": "Punjabi",
  "ta-IN": "Tamil",
  "te-IN": "Telugu",
} as const;

export const TTS_LANGUAGES = {
  ...STT_LANGUAGES,
  "hi-en": "Hinglish",
} as const;

/** Translation is enabled for all configured speech-recognition languages. */
export const TRANSLATION_LANGUAGES = STT_LANGUAGES;

export const TTS_VOICES: Record<keyof typeof TTS_LANGUAGES, readonly string[]> = {
  "bn-IN": ["Kirra", "Dhruva"],
  "en-IN": ["Kaveri", "Trupti", "Devika", "Pranav", "Shlok", "Girish"],
  "gu-IN": ["Falak", "Veera"],
  "hi-IN": [
    "Nalini", "Bhavna", "Yashvi", "Urmila", "Jwala", "Chitra", "Ambuja",
    "Deepak", "Roopesh", "Vikrant", "Hemraj", "Jalaj", "Omkar",
  ],
  "kn-IN": ["Saanvi", "Kavin"],
  "ml-IN": ["Reshma", "Riyaan"],
  "mr-IN": ["Zahira", "Ishaan"],
  "pa-IN": ["Mehuli", "Zayan"],
  "ta-IN": ["Asmita", "Trisha", "Brinda", "Vedika", "Noopur"],
  "te-IN": ["Suhana", "Lehara", "Lavanya", "Yukti", "Varuni"],
  "hi-en": ["Poorvi"],
};

export const AUDIO_EXTENSIONS = new Set(["wav", "mp3", "ogg", "flac", "aac", "m4a"]);
export const MAX_AUDIO_BYTES = 15 * 1024 * 1024;
export const MAX_AUDIO_SECONDS = 60;
export const MAX_TRANSLATION_CHARS = 5_000;
export const MAX_TTS_CHARS = 4_000;

export function isSttLanguage(value: string): value is keyof typeof STT_LANGUAGES {
  return Object.hasOwn(STT_LANGUAGES, value);
}

export function isTtsLanguage(value: string): value is keyof typeof TTS_LANGUAGES {
  return Object.hasOwn(TTS_LANGUAGES, value);
}

export function isTranslationLanguage(value: string): value is keyof typeof TRANSLATION_LANGUAGES {
  return Object.hasOwn(TRANSLATION_LANGUAGES, value);
}

export function isTtsVoice(language: string, voice: string): boolean {
  return isTtsLanguage(language) && TTS_VOICES[language].includes(voice);
}

export function hasSupportedAudioExtension(filename: string): boolean {
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  return AUDIO_EXTENSIONS.has(extension);
}

export function isSupportedInputSampleRate(sampleRate: number | undefined): boolean {
  return typeof sampleRate === "number" && Number.isFinite(sampleRate) && sampleRate >= 8_000 && sampleRate <= 44_100;
}

export function normalizeProviderError(status: number): { status: number; message: string } {
  if (status === 400) return { status: 422, message: "Gnani could not process this audio or request. Check the format and try again." };
  if (status === 401 || status === 403) return { status: 503, message: "Gnani credentials are not authorized for this request. Check the server configuration and model access." };
  if (status === 429) return { status: 429, message: "The speech service is busy. Wait a moment and try again." };
  if (status === 503) return { status: 503, message: "The speech service is temporarily unavailable. Try again shortly." };
  return { status: 502, message: "The speech service could not complete the request. Try again shortly." };
}
