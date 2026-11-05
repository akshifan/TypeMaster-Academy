import type { Progress, Result } from "./types";
export const emptyProgress = (): Progress => ({
  version: 2,
  xp: 0,
  streak: 0,
  lastDay: "",
  completed: [],
  results: [],
  keys: {},
  prefs: {
    sound: true,
    profile: "Brown Switch",
    volume: 0.8,
    speakWords: true,
    showKeyboard: true,
    fingerHints: true,
    colors: true,
    reducedMotion: false,
    light: true,
    dailyGoal: 10,
    accuracyTarget: 90,
    duration: 60,
  },
  dailyMinutes: 0,
  missions: {},
});
const KEY = "typemaster-progress-v2";
export function loadProgress(): Progress {
  try {
    const raw =
      localStorage.getItem(KEY) ??
      localStorage.getItem("typemaster-progress-v1");
    if (!raw) return emptyProgress();
    const val = JSON.parse(raw) as Partial<Progress>;
    if (val.version !== 1 && val.version !== 2) return emptyProgress();
    return {
      ...emptyProgress(),
      ...val,
      version: 2,
      prefs: {
        ...emptyProgress().prefs,
        ...val.prefs,
        light: val.version === 1 ? true : (val.prefs?.light ?? true),
      },
      keys: val.keys && typeof val.keys === "object" ? val.keys : {},
      results: Array.isArray(val.results) ? val.results : [],
      completed: Array.isArray(val.completed) ? val.completed : [],
    };
  } catch {
    return emptyProgress();
  }
}
export function saveProgress(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage can be disabled; current session remains usable */
  }
}
export function calculateStats(
  chars: number,
  correct: number,
  incorrect: number,
  seconds: number,
) {
  const minutes = Math.max(seconds, 1) / 60;
  return {
    gross: Math.round(chars / 5 / minutes),
    net: Math.max(
      0,
      Math.round(chars / 5 / minutes) - Math.round(incorrect / 5 / minutes),
    ),
    accuracy: chars ? Math.round((correct / chars) * 100) : 100,
    cpm: Math.round(chars / minutes),
  };
}
export function recordResult(p: Progress, r: Result) {
  const day = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  return {
    ...p,
    results: [...p.results, r].slice(-300),
    xp: p.xp + Math.max(5, Math.round(r.wpm * 2 + r.accuracy / 2)),
    streak:
      p.lastDay === day ? p.streak : p.lastDay === yesterday ? p.streak + 1 : 1,
    lastDay: day,
    dailyMinutes: p.lastDay === day ? p.dailyMinutes + r.minutes : r.minutes,
  };
}
export const readKey = (p: Progress, key: string) =>
  p.keys[key.toLowerCase()] ?? { attempts: 0, correct: 0, time: 0, last: "" };
