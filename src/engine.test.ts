import { describe, expect, it } from "vitest";
import { calculateStats, emptyProgress, recordResult } from "./engine";
import { fingerFor, lessons } from "./data";
import { makeTypingTestText } from "./testContent";
import { sectionFromPath } from "./navigation";
import { practiceTextFor } from "./practiceContent";

describe("typing statistics", () => {
  it("calculates gross and net WPM using five characters per word", () => {
    expect(calculateStats(300, 290, 10, 60)).toEqual({
      gross: 60,
      net: 58,
      accuracy: 97,
      cpm: 300,
    });
  });
  it("handles empty input without dividing by zero", () => {
    expect(calculateStats(0, 0, 0, 0)).toEqual({
      gross: 0,
      net: 0,
      accuracy: 100,
      cpm: 0,
    });
  });
});
describe("curriculum and finger guidance", () => {
  it("provides 48 sequential lessons across four levels", () => {
    expect(lessons).toHaveLength(48);
    expect(lessons[0].title).toContain("Introduction");
    expect(lessons[47].level).toBe(3);
    expect(lessons.every((l) => l.text.trim().length > 10)).toBe(true);
  });
  it("maps standard QWERTY keys to their home-row fingers", () => {
    expect(fingerFor("a")).toBe("Left pinky");
    expect(fingerFor("f")).toBe("Left index");
    expect(fingerFor("j")).toBe("Right index");
    expect(fingerFor("q")).toBe("Left pinky");
    expect(fingerFor("g")).toBe("Left index");
    expect(fingerFor("m")).toBe("Right index");
    expect(fingerFor(",")).toBe("Right middle");
    expect(fingerFor(";")).toBe("Right pinky");
    expect(fingerFor(" ")).toBe("Thumbs");
  });
});
describe("typing test content", () => {
  it("builds long randomized sentence and paragraph passages for timed sessions", () => {
    const sentences = makeTypingTestText("sentences");
    const paragraphs = makeTypingTestText("paragraphs");
    expect(sentences.length).toBeGreaterThan(4000);
    expect(sentences).not.toContain("\n\n");
    expect(paragraphs.length).toBeGreaterThan(4500);
    expect(paragraphs).toContain("\n\n");
  });
  it("honors a selected passage length", () => {
    const brief = makeTypingTestText("sentences", 700);
    const extended = makeTypingTestText("sentences", 2800);
    expect(brief.length).toBeLessThan(extended.length);
    expect(extended.length).toBeGreaterThanOrEqual(2800);
    expect(brief.length).toBeLessThan(1400);
  });
});
describe("page navigation", () => {
  it("restores the selected section from its URL after refresh", () => {
    expect(sectionFromPath("/typing-test")).toBe("Typing Test");
    expect(sectionFromPath("/keyboard-simulator")).toBe("Keyboard Simulator");
    expect(sectionFromPath("/learning-path/")).toBe("Learning Path");
    expect(sectionFromPath("/")).toBe("Dashboard");
  });
});
describe("practice categories", () => {
  it("returns category-specific content immediately", () => {
    const lesson = lessons[8];
    const keys = {};
    expect(practiceTextFor("Character practice", "", keys, lesson)).toContain(
      "asdf",
    );
    expect(practiceTextFor("Word practice", "", keys, lesson)).toContain(
      "rhythm",
    );
    expect(practiceTextFor("Paragraph practice", "", keys, lesson)).toContain(
      "keyboard clicked",
    );
    expect(practiceTextFor("Custom text", "my own passage", keys, lesson)).toBe(
      "my own passage",
    );
  });
});
describe("progress updates", () => {
  it("awards XP and stores a result", () => {
    const p = recordResult(emptyProgress(), {
      date: "2026-11-03T10:00:00.000Z",
      wpm: 30,
      accuracy: 96,
      minutes: 1,
      correct: 145,
      incorrect: 6,
      mode: "Practice",
    });
    expect(p.results).toHaveLength(1);
    expect(p.xp).toBeGreaterThan(0);
    expect(p.streak).toBe(1);
  });
});
