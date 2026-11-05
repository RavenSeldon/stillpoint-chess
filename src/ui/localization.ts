import { languageTags, lessonLanguages, type LessonLanguage } from "../core/learning/languages.js";
import { chinese } from "./locales/zh.js";
import { french } from "./locales/fr.js";
import { dutch } from "./locales/nl.js";

export type LocaleReplacement = string | ((match: string, ...args: any[]) => string);
export type LocalePattern = readonly [RegExp, LocaleReplacement];
export type LocaleDictionary = {
  exact: Record<string, string>;
  patterns: readonly LocalePattern[];
};

const dictionaries: Record<Exclude<LessonLanguage, "en">, LocaleDictionary> = {
  zh: chinese,
  fr: french,
  nl: dutch,
};

const normalize = (value: string) => value.replace(/\s+/g, " ").trim();
const translationCache = {
  zh: new Map<string, string>(),
  fr: new Map<string, string>(),
  nl: new Map<string, string>(),
};
const embeddedKeys = new Map<LessonLanguage, string[]>();

/**
 * Translate known phrases inside composed feedback, then recursively translate
 * the surrounding message. This keeps English source strings stable while
 * handling explanations, scores, and activity labels without rebuilding HTML.
 */
function translateComposite(key: string, language: Exclude<LessonLanguage, "en">): string | null {
  const dictionary = dictionaries[language];
  let keys = embeddedKeys.get(language);
  if (!keys) {
    keys = Object.keys(dictionary.exact).sort((a, b) => b.length - a.length);
    embeddedKeys.set(language, keys);
  }
  for (const phrase of keys) {
    const index = key.indexOf(phrase);
    if (index < 0) continue;
    const beforeChar = key[index - 1] || "";
    const afterChar = key[index + phrase.length] || "";
    if (/^\p{L}/u.test(phrase) && /\p{L}/u.test(beforeChar)) continue;
    if (/\p{L}$/u.test(phrase) && /\p{L}/u.test(afterChar)) continue;
    const before = key.slice(0, index);
    const after = key.slice(index + phrase.length);
    return translateText(before, language) + dictionary.exact[phrase] + translateText(after, language);
  }
  const score = /[+−-]?\d+\.\d+ pawns/.exec(key);
  if (score?.index !== undefined) {
    return translateText(key.slice(0, score.index), language)
      + translateText(score[0], language)
      + translateText(key.slice(score.index + score[0].length), language);
  }
  return null;
}

/** Translate a complete visible message without allowing translated HTML. */
export function translateText(source: string, language: LessonLanguage): string {
  if (language === "en" || !source) return source;
  const leading = /^\s*/.exec(source)?.[0] || "";
  const trailing = /\s*$/.exec(source)?.[0] || "";
  const key = normalize(source);
  if (!key) return source;
  const cache = translationCache[language];
  const cached = cache.get(key);
  if (cached !== undefined) return leading + cached + trailing;
  const dictionary = dictionaries[language];
  const exact = dictionary.exact[key];
  if (exact !== undefined) {
    cache.set(key, exact);
    return leading + exact + trailing;
  }
  let translated: string | null = null;
  for (const [pattern, replacement] of dictionary.patterns) {
    if (pattern.test(key)) {
      const message = typeof replacement === "string"
        ? key.replace(pattern, replacement)
        : key.replace(pattern, (...args) => replacement(args[0], ...args.slice(1)));
      translated = translateComposite(message, language) ?? message;
      break;
    }
  }
  translated ??= translateComposite(key, language) ?? key;
  if (cache.size >= 5000) cache.clear();
  cache.set(key, translated);
  return leading + translated + trailing;
}

const translatedAttributes = ["aria-label", "title", "placeholder", "alt"] as const;
const skippedElements = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "TEXTAREA"]);

/** Translate one changed subtree while preserving elements, events, and controls. */
export function translateTree(root: Node, language: LessonLanguage) {
  if (language === "en") return;
  if (root.nodeType === Node.TEXT_NODE) {
    const parent = root.parentElement;
    if (!parent || skippedElements.has(parent.tagName) || parent.closest("[translate='no']")) return;
    root.nodeValue = translateText(root.nodeValue || "", language);
    return;
  }
  if (!(root instanceof Element)) return;
  const elements = [root, ...Array.from(root.querySelectorAll("*"))];
  for (const element of elements) {
    if (skippedElements.has(element.tagName) || element.closest("[translate='no']")) continue;
    for (const attribute of translatedAttributes) {
      const value = element.getAttribute(attribute);
      if (value) element.setAttribute(attribute, translateText(value, language));
    }
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  for (const node of nodes) {
    const parent = node.parentElement;
    if (!parent || skippedElements.has(parent.tagName) || parent.closest("[translate='no']")) continue;
    node.nodeValue = translateText(node.nodeValue || "", language);
  }
}

export function translateDocument(language: LessonLanguage) {
  document.documentElement.lang = languageTags[language];
  document.title = translateText("Stillpoint · A Chess Practice", language);
  const description = "Stillpoint: private, offline-capable chess practice with local Stockfish analysis";
  document.querySelector('meta[name="description"]')?.setAttribute("content", translateText(description, language));
}

export function storedLanguage(): LessonLanguage {
  try {
    const value = localStorage.getItem("stillpoint.language") || "";
    return (lessonLanguages as readonly string[]).includes(value) ? value as LessonLanguage : "en";
  } catch {
    return "en";
  }
}

export function rememberLanguage(language: LessonLanguage) {
  try { localStorage.setItem("stillpoint.language", language); } catch { /* IndexedDB remains authoritative. */ }
}

/**
 * App renders remain synchronous; this observer catches board-only renders,
 * clock ticks, and other small DOM updates without translating unchanged text.
 */
export class SiteLocalizer {
  private observer: MutationObserver | null = null;
  private dirty = new Set<Node>();
  private queued = false;

  constructor(private language: () => LessonLanguage) {}

  start() {
    if (this.observer) return;
    this.observer = new MutationObserver((records) => {
      if (this.language() === "en") return;
      for (const record of records) this.dirty.add(record.target);
      if (!this.queued) {
        this.queued = true;
        queueMicrotask(() => this.flush());
      }
    });
    this.observer.observe(document.body, { childList: true, characterData: true, subtree: true });
  }

  apply(root: Node = document.body) {
    if (this.language() === "en") {
      translateDocument(this.language());
      return;
    }
    this.observer?.disconnect();
    translateTree(root, this.language());
    translateDocument(this.language());
    this.observer?.takeRecords();
    this.observer?.observe(document.body, { childList: true, characterData: true, subtree: true });
  }

  private flush() {
    this.queued = false;
    if (this.language() === "en") { this.dirty.clear(); return; }
    const roots = [...this.dirty];
    this.dirty.clear();
    this.observer?.disconnect();
    for (const root of roots) {
      if (!root.isConnected) continue;
      if (roots.some((other) => other !== root && (other instanceof Element || other instanceof Text) && (other as Element | Text).contains(root))) continue;
      translateTree(root, this.language());
    }
    translateDocument(this.language());
    this.observer?.takeRecords();
    this.observer?.observe(document.body, { childList: true, characterData: true, subtree: true });
  }

  stop() {
    this.observer?.disconnect();
    this.observer = null;
    this.dirty.clear();
  }
}
