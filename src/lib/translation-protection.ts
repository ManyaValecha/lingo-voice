import { randomUUID } from "node:crypto";

type ProtectedEntity = { start: number; end: number; value: string; priority: number };

const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>]+/giu;
const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu;
const DATE_RE = /(?<![\p{L}\p{N}])(?:\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}\s+(?:जनवरी|फ़रवरी|फरवरी|मार्च|अप्रैल|मई|जून|जुलाई|अगस्त|सितंबर|अक्टूबर|नवंबर|दिसंबर|January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})(?!\p{N})/giu;
const TIME_RE = /(?<!\d)(?:[01]?\d|2[0-3]):[0-5]\d(?:\s?[AP]M)?(?!\w)/giu;
const PHONE_RE = /(?<!\w)\+?\d[\d ().-]{6,}\d(?!\w)/gu;
const NUMBER_RE = /(?<![\p{L}\p{N}])(?:(?:₹|[$€£])\s?)?[+−-]?\d+(?:[,.]\d+)*(?:%|\s?(?:INR|USD|EUR|dollars?))?(?![\p{L}\p{N}])/giu;

// Protect a name only when the text explicitly introduces it. This avoids
// freezing ordinary capitalized words or guessing names from arbitrary prose.
const NAME_TOKEN = "[\\p{L}][\\p{L}\\p{M}'’]*(?:[.-][\\p{L}\\p{M}'’]+)*";
const INTRODUCED_NAME_RE = new RegExp(`(?:\\bmy\\s+name\\s+is|मेरा\\s+नाम(?:\\s+है)?)\\s+(?<value>${NAME_TOKEN}(?:\\s+${NAME_TOKEN}){0,2}?)(?=\\s+(?:है|हूँ|हैं|था|थी|थे|होगा|होगी|is|am|are|was|were|and|but|मैं|और)(?:\\s|[।.!?,;:]|$)|[।.!?,;:]|$)`, "giu");

export function protectTranslationEntities(text: string): {
  protectedText: string;
  restore: (translatedText: string) => string | null;
} {
  const entities: ProtectedEntity[] = [];
  collectMatches(text, URL_RE, entities, 5, (value) => value.replace(/[.,!?;:।]+$/u, ""));
  collectMatches(text, EMAIL_RE, entities, 6);
  collectMatches(text, DATE_RE, entities, 4);
  collectMatches(text, TIME_RE, entities, 3);
  collectMatches(text, PHONE_RE, entities, 3);
  collectMatches(text, NUMBER_RE, entities, 2);

  for (const match of text.matchAll(INTRODUCED_NAME_RE)) {
    const value = match.groups?.value;
    if (!value || match.index === undefined) continue;
    const relativeStart = match[0].lastIndexOf(value);
    if (relativeStart < 0) continue;
    entities.push({ start: match.index + relativeStart, end: match.index + relativeStart + value.length, value, priority: 1 });
  }

  const selected = selectNonOverlapping(entities);
  if (selected.length === 0) return { protectedText: text, restore: (translatedText) => translatedText };

  let nonce = randomUUID().replaceAll("-", "").toUpperCase();
  while (text.includes(`LSWP_${nonce}_`)) nonce = randomUUID().replaceAll("-", "").toUpperCase();

  const replacements = selected.map((entity, index) => ({
    start: entity.start,
    end: entity.end,
    token: `LSWP_${nonce}_${index}_END`,
    value: text.slice(entity.start, entity.end),
  }));

  let protectedText = "";
  let offset = 0;
  for (const replacement of replacements) {
    protectedText += text.slice(offset, replacement.start) + replacement.token;
    offset = replacement.end;
  }
  protectedText += text.slice(offset);

  return {
    protectedText,
    restore(translatedText: string) {
      let restored = translatedText;
      for (const replacement of replacements) {
        const occurrences = restored.split(replacement.token).length - 1;
        if (occurrences !== 1) return null;
        restored = restored.replace(replacement.token, replacement.value);
      }
      if (/LSWP_[A-F0-9]{32}_\d+_END/iu.test(restored)) return null;
      return restored;
    },
  };
}

function collectMatches(
  text: string,
  expression: RegExp,
  entities: ProtectedEntity[],
  priority: number,
  normalize: (value: string) => string = (value) => value,
) {
  expression.lastIndex = 0;
  for (const match of text.matchAll(expression)) {
    if (match.index === undefined) continue;
    const value = normalize(match[0]);
    if (!value) continue;
    const relativeStart = match[0].indexOf(value);
    entities.push({ start: match.index + relativeStart, end: match.index + relativeStart + value.length, value, priority });
  }
}

function selectNonOverlapping(entities: ProtectedEntity[]): ProtectedEntity[] {
  const ordered = [...entities].sort((a, b) => a.start - b.start || b.priority - a.priority || (b.end - b.start) - (a.end - a.start));
  const selected: ProtectedEntity[] = [];
  for (const candidate of ordered) {
    if (selected.some((existing) => candidate.start < existing.end && candidate.end > existing.start)) continue;
    selected.push(candidate);
  }
  return selected.sort((a, b) => a.start - b.start);
}
