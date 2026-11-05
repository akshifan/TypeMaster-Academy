import type { KeyStat, Lesson } from "./types";

export const practiceTexts = [
  "asdf jkl; asdf jkl; fj dk sl a;",
  "steady rhythm makes accurate typing feel natural.",
  "The quiet keyboard clicked as rain tapped the window.",
  "function greet(name) { return `Hello, ${name}!`; }",
  "practice with care, then let your speed grow.",
];

export function practiceTextFor(
  mode: string,
  custom: string,
  keys: Record<string, KeyStat>,
  lesson: Lesson,
) {
  if (mode === "Custom text")
    return custom || "Write or paste your own practice text here.";
  if (mode === "Weak-key practice") {
    const weak = Object.entries(keys)
      .sort(
        (a, b) =>
          a[1].correct / Math.max(a[1].attempts, 1) -
          b[1].correct / Math.max(b[1].attempts, 1),
      )
      .slice(0, 5)
      .map(([key]) => key)
      .join("");
    return weak
      ? `${weak} ${weak.split("").reverse().join(" ")} ${weak} ${weak}`
      : practiceTexts[0];
  }
  if (mode === "Programming practice") return practiceTexts[3];
  if (mode === "Character practice") return "asdf jkl; qwer uiop zxcv nm,. ";
  if (mode === "Word practice")
    return "calm rhythm focus practice steady progress accuracy";
  if (mode === "Paragraph practice")
    return `${practiceTexts[2]} ${practiceTexts[1]}`;
  if (mode === "Random text")
    return practiceTexts[Math.floor(Math.random() * practiceTexts.length)];
  if (mode === "Timed practice")
    return `${practiceTexts[1]} ${practiceTexts[2]}`;
  return mode.startsWith("Lesson:") ? lesson.text.trim() : practiceTexts[1];
}
