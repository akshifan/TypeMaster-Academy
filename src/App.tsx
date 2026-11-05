import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AudioLines,
  Award,
  BarChart3,
  BookOpen,
  ChevronRight,
  ChevronsLeft,
  CircleHelp,
  Clock3,
  Flame,
  Gauge,
  GraduationCap,
  Keyboard,
  LayoutDashboard,
  Lightbulb,
  Mail,
  Menu,
  Moon,
  Play,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  Trophy,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Progress, Section, Lesson, Result } from "./types";
import {
  achievements,
  fingerColors,
  fingerFor,
  keyboardRows,
  lessons,
  levels,
} from "./data";
import {
  calculateStats,
  emptyProgress,
  loadProgress,
  readKey,
  recordResult,
  saveProgress,
} from "./engine";
import { playKey } from "./sound";
import { speakCharacter } from "./speech";
import { makeTypingTestText, type TestStyle } from "./testContent";
import { navigateToSection, sectionFromPath } from "./navigation";
import { practiceTextFor, practiceTexts } from "./practiceContent";

const nav: { name: Section; icon: typeof LayoutDashboard }[] = [
  { name: "Dashboard", icon: LayoutDashboard },
  { name: "Learning Path", icon: BookOpen },
  { name: "Practice", icon: Zap },
  { name: "Typing Test", icon: Gauge },
  { name: "Keyboard Simulator", icon: Keyboard },
  { name: "Finger Training", icon: Activity },
  { name: "Personal Coach", icon: Lightbulb },
  { name: "Weak Keys", icon: Target },
  { name: "Achievements", icon: Trophy },
  { name: "Analytics", icon: BarChart3 },
  { name: "Settings", icon: SettingsIcon },
];
const practiceModes = [
  "Character practice",
  "Word practice",
  "Sentence practice",
  "Paragraph practice",
  "Random text",
  "Custom text",
  "Timed practice",
  "Free typing",
  "Weak-key practice",
  "Programming practice",
];
const simulatorText =
  "How much time do you spend thinking about the communities you belong to? If you are like most of us, probably not enough. That is because we take them for granted. Whether it is our family, friends, or neighbors, connection begins with attention.";
const today = () => new Date().toISOString().slice(0, 10);

function IconButton({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button className="btn !p-2" onClick={onClick} title={title}>
      {children}
    </button>
  );
}
function Stat({
  label,
  value,
  sub,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: typeof Zap;
  accent?: boolean;
}) {
  return (
    <div className="panel p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <span className="muted text-xs sm:text-sm">{label}</span>
        <Icon
          size={17}
          className={accent ? "text-blue-300" : "text-slate-500"}
        />
      </div>
      <div className="display mt-3 text-2xl sm:text-[28px] font-semibold">
        {value}
      </div>
      <div className="muted mt-1 text-xs">{sub}</div>
    </div>
  );
}

export default function App() {
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const [section, setSection] = useState<Section>(() =>
    sectionFromPath(window.location.pathname),
  );
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [lesson, setLesson] = useState<Lesson>(
    () =>
      lessons.find((candidate) => !progress.completed.includes(candidate.id)) ??
      lessons[lessons.length - 1],
  );
  const [lessonSession, setLessonSession] = useState<number | null>(null);
  const [lessonPassed, setLessonPassed] = useState(false);
  const [mode, setMode] = useState(() => {
    if (section !== "Practice") return "Sentence practice";
    const currentLesson =
      lessons.find((candidate) => !progress.completed.includes(candidate.id)) ??
      lessons[lessons.length - 1];
    return `Lesson: ${currentLesson.title}`;
  });
  const [testStyle, setTestStyle] = useState<TestStyle>("sentences");
  const [passageMinutes, setPassageMinutes] = useState(1);
  const [duration, setDuration] = useState(60);
  const [custom, setCustom] = useState("");
  const [source, setSource] = useState(() => {
    const initialSection = sectionFromPath(window.location.pathname);
    if (initialSection === "Typing Test")
      return makeTypingTestText("sentences", 700);
    if (initialSection === "Keyboard Simulator") return simulatorText;
    if (initialSection === "Learning Path") return lesson.text.trim();
    if (initialSection === "Practice") return lesson.text.trim();
    if (initialSection === "Finger Training") return practiceTexts[0];
    return "";
  });
  const [typed, setTyped] = useState<string[]>([]);
  const [remaining, setRemaining] = useState(60);
  const [active, setActive] = useState(false);
  const [complete, setComplete] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(0);
  const [lastKey, setLastKey] = useState("");
  const [pressedKey, setPressedKey] = useState("");
  const [showInstructions, setShowInstructions] = useState(false);
  const typingRef = useRef<HTMLDivElement>(null);
  const typingPromptRef = useRef<HTMLDivElement>(null);
  const currentCharacterRef = useRef<HTMLSpanElement>(null);
  const ended = useRef(false);
  const releaseTimer = useRef<number | undefined>(undefined);
  useEffect(() => saveProgress(progress), [progress]);
  useEffect(() => {
    document.documentElement.dataset.theme = progress.prefs.light
      ? "light"
      : "dark";
  }, [progress.prefs.light]);
  const selectedSource = useMemo(() => {
    if (mode === "Custom text")
      return custom || "Write or paste your own practice text here.";
    if (mode === "Weak-key practice") {
      const weak = Object.entries(progress.keys)
        .sort(
          (a, b) =>
            a[1].correct / Math.max(a[1].attempts, 1) -
            b[1].correct / Math.max(b[1].attempts, 1),
        )
        .slice(0, 5)
        .map(([k]) => k)
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
      return practiceTexts[2] + " " + practiceTexts[1];
    if (mode === "Random text")
      return practiceTexts[Math.floor(Math.random() * practiceTexts.length)];
    if (mode === "Timed practice")
      return practiceTexts[1] + " " + practiceTexts[2];
    return mode.startsWith("Lesson:") ? lesson.text.trim() : practiceTexts[1];
  }, [mode, custom, progress.keys, lesson]);
  useEffect(() => {
    if (section !== "Typing Test") return;
    const container = typingPromptRef.current;
    const current = currentCharacterRef.current;
    if (!container || !current) return;
    const viewport = container.getBoundingClientRect();
    const character = current.getBoundingClientRect();
    const margin = 40;
    if (character.bottom > viewport.bottom - margin) {
      container.scrollTo({
        top: container.scrollTop + character.bottom - viewport.bottom + margin,
        behavior: "smooth",
      });
    } else if (character.top < viewport.top + margin) {
      container.scrollTo({
        top: container.scrollTop + character.top - viewport.top - margin,
        behavior: "smooth",
      });
    }
  }, [section, typed.length, source]);
  const flashKey = useCallback((key: string) => {
    setPressedKey(key);
    window.clearTimeout(releaseTimer.current);
    releaseTimer.current = window.setTimeout(() => setPressedKey(""), 150);
  }, []);
  const start = useCallback(
    (text = selectedSource, seconds = duration) => {
      setSource(text);
      setTyped([]);
      setRemaining(seconds);
      setDuration(seconds);
      setActive(true);
      setComplete(false);
      setLessonPassed(false);
      ended.current = false;
      setSessionStarted(Date.now());
      typingRef.current?.focus();
      if (progress.prefs.speakWords && text[0]) speakCharacter(text[0], true);
    },
    [duration, selectedSource, progress.prefs.speakWords],
  );
  const selectedTestText = useCallback(
    (style = testStyle, minutes = passageMinutes) =>
      makeTypingTestText(style, minutes * 700),
    [testStyle, passageMinutes],
  );
  const loadSection = useCallback(
    (nextSection: Section) => {
      const nextLesson =
        lessons.find(
          (candidate) => !progress.completed.includes(candidate.id),
        ) ?? lessons[lessons.length - 1];
      setSection(nextSection);
      setActive(false);
      setTyped([]);
      setRemaining(duration);
      setComplete(false);
      setLessonPassed(false);
      setLessonSession(null);
      setLastKey("");
      setPressedKey("");
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      setLesson(nextLesson);
      if (nextSection === "Typing Test") setSource(selectedTestText());
      else if (nextSection === "Keyboard Simulator") setSource(simulatorText);
      else if (nextSection === "Learning Path")
        setSource(nextLesson.text.trim());
      else if (nextSection === "Practice") {
        setMode(`Lesson: ${nextLesson.title}`);
        setSource(nextLesson.text.trim());
      } else if (nextSection === "Finger Training") setSource(practiceTexts[0]);
      else setSource("");
    },
    [progress.completed, selectedTestText, duration],
  );
  useEffect(() => {
    const onPopState = () =>
      loadSection(sectionFromPath(window.location.pathname));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [loadSection]);
  const startCurrent = useCallback(() => {
    start(
      section === "Typing Test" ? selectedTestText() : source || selectedSource,
      duration,
    );
  }, [start, section, selectedTestText, source, selectedSource, duration]);
  const finish = useCallback(
    (finalTyped = typed) => {
      if (ended.current) return;
      ended.current = true;
      setActive(false);
      setComplete(true);
      const elapsed = Math.max(1, (Date.now() - sessionStarted) / 1000);
      const stats = calculateStats(
        finalTyped.length,
        finalTyped.filter((v, i) => v === source[i]).length,
        finalTyped.filter((v, i) => v !== source[i]).length,
        elapsed,
      );
      const result: Result = {
        date: new Date().toISOString(),
        wpm: stats.net,
        accuracy: stats.accuracy,
        minutes: Math.max(elapsed / 60, 0.1),
        correct: finalTyped.filter((v, i) => v === source[i]).length,
        incorrect: finalTyped.filter((v, i) => v !== source[i]).length,
        mode:
          section === "Typing Test"
            ? `${testStyle === "sentences" ? "Random sentences" : "Long paragraphs"} test`
            : mode,
      };
      setProgress((p) => recordResult(p, result));
      const passed =
        lessonSession !== null &&
        finalTyped.length >= source.length &&
        stats.accuracy >= progress.prefs.accuracyTarget;
      setLessonPassed(passed);
      if (lessonSession !== null && passed)
        setProgress((p) => ({
          ...p,
          completed: p.completed.includes(lessonSession)
            ? p.completed
            : [...p.completed, lessonSession],
        }));
      setLessonSession(null);
    },
    [
      sessionStarted,
      source,
      typed,
      mode,
      lessonSession,
      progress.prefs.accuracyTarget,
      section,
      testStyle,
    ],
  );
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(
      () =>
        setRemaining((v) => {
          if (v <= 1) {
            window.clearInterval(timer);
            return 0;
          }
          return v - 1;
        }),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [active]);
  useEffect(() => {
    if (active && remaining === 0) finish();
  }, [active, remaining, finish]);
  const inputKey = useCallback(
    (key: string) => {
      if (!active || complete) return;
      if (key === "Backspace") {
        setLastKey("Backspace");
        flashKey(key);
        playKey(
          progress.prefs.sound ? progress.prefs.profile : "Silent Keyboard",
          progress.prefs.volume,
          key,
        );
        setTyped((t) => t.slice(0, -1));
        if (progress.prefs.speakWords && typed.length > 0)
          speakCharacter(source[typed.length - 1], true);
        return;
      }
      if (key === "Escape") {
        setActive(false);
        return;
      }
      const value = key === "Enter" ? "\n" : key;
      if (value.length !== 1) return;
      const idx = typed.length;
      if (idx >= source.length) {
        if (section === "Typing Test") {
          const addition = makeTypingTestText(testStyle);
          setSource((s) => `${s} ${addition}`);
        } else {
          setActive(false);
          setComplete(true);
        }
        return;
      }
      const nextTyped = [...typed, value];
      setTyped(nextTyped);
      setLastKey(key);
      flashKey(key);
      const correct = value === source[idx];
      if (value !== "\n")
        setProgress((p) => {
          const prev = readKey(p, value),
            stat = {
              attempts: prev.attempts + 1,
              correct: prev.correct + (correct ? 1 : 0),
              time:
                prev.time + Math.max(100, Date.now() - sessionStarted) / 1000,
              last: today(),
            };
          return {
            ...p,
            keys: { ...p.keys, [value.toLowerCase()]: stat },
            xp: p.xp + 1,
            dailyMinutes: p.dailyMinutes,
          };
        });
      playKey(
        progress.prefs.sound ? progress.prefs.profile : "Silent Keyboard",
        progress.prefs.volume,
        key,
      );
      if (progress.prefs.speakWords) {
        const nextTarget = correct ? source[idx + 1] : source[idx];
        if (nextTarget) speakCharacter(nextTarget, true);
      }
      if (idx + 1 >= source.length) {
        if (section === "Typing Test") {
          const addition = makeTypingTestText(testStyle);
          setSource((s) => `${s} ${addition}`);
          if (progress.prefs.speakWords && addition[0])
            speakCharacter(addition[0], true);
        } else {
          setActive(false);
          setComplete(true);
          window.setTimeout(() => finish(nextTyped), 30);
        }
      }
    },
    [
      active,
      complete,
      typed,
      source,
      progress.prefs,
      sessionStarted,
      finish,
      flashKey,
      section,
      testStyle,
    ],
  );
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        section !== "Practice" &&
        section !== "Typing Test" &&
        section !== "Learning Path" &&
        section !== "Finger Training" &&
        section !== "Keyboard Simulator"
      )
        return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Tab") {
        e.preventDefault();
        return;
      }
      if (
        e.key === " " ||
        e.key === "Enter" ||
        e.key.length === 1 ||
        e.key === "Backspace"
      ) {
        e.preventDefault();
        if (!active && e.key.length === 1) {
          start(
            section === "Learning Path"
              ? lesson.text.trim()
              : section === "Keyboard Simulator"
                ? simulatorText
                : section === "Typing Test"
                  ? selectedTestText()
                  : selectedSource,
            section === "Keyboard Simulator" ? 300 : duration,
          );
          return;
        }
        inputKey(e.key);
      }
    };
    const release = () => {
      setPressedKey("");
      window.clearTimeout(releaseTimer.current);
    };
    window.addEventListener("keydown", handler);
    window.addEventListener("keyup", release);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("keyup", release);
    };
  }, [
    section,
    active,
    inputKey,
    start,
    lesson,
    selectedSource,
    selectedTestText,
    duration,
  ]);
  const updatePref = <K extends keyof Progress["prefs"]>(
    key: K,
    value: Progress["prefs"][K],
  ) => setProgress((p) => ({ ...p, prefs: { ...p.prefs, [key]: value } }));
  const completed = progress.completed.length;
  const level = Math.min(3, Math.floor(completed / 12));
  const latest = progress.results[progress.results.length - 1];
  const best = progress.results.reduce((m, r) => Math.max(m, r.wpm), 0);
  const avgAccuracy = progress.results.length
    ? Math.round(
        progress.results.reduce((s, r) => s + r.accuracy, 0) /
          progress.results.length,
      )
    : 0;
  const chartData = progress.results
    .slice(-12)
    .map((r, i) => ({ name: `${i + 1}`, wpm: r.wpm, accuracy: r.accuracy }));
  const todayMins = progress.lastDay === today() ? progress.dailyMinutes : 0;
  const nextCourseLesson = lessons.find(
    (l) => !progress.completed.includes(l.id),
  );
  const weak = Object.entries(progress.keys)
    .map(([key, s]) => ({
      key,
      ...s,
      accuracy: Math.round((s.correct / Math.max(s.attempts, 1)) * 100),
      avg: Math.round((s.time / Math.max(s.attempts, 1)) * 1000),
    }))
    .filter((x) => x.attempts >= 3)
    .sort((a, b) => a.accuracy - b.accuracy || b.avg - a.avg);
  const unlocked = (id: string) => {
    if (id === "first-session") return progress.results.length > 0;
    if (id.startsWith("speed-")) return best >= Number(id.split("-")[1]);
    if (id.startsWith("accuracy-"))
      return progress.results.some(
        (r) => r.accuracy >= Number(id.split("-")[1]),
      );
    if (id === "lessons-12") return completed >= 12;
    if (id === "streak-7") return progress.streak >= 7;
    if (id === "streak-30") return progress.streak >= 30;
    return false;
  };
  const navTo = (name: Section) => {
    navigateToSection(name);
    loadSection(name);
    setMobileNav(false);
  };

  return (
    <div
      className={`min-h-screen text-slate-100 ${progress.prefs.light ? "light-theme" : ""}`}
    >
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden border-r border-[#202631] bg-[#0b0e13] transition-all md:flex md:flex-col ${collapsed ? "w-[76px]" : "w-[246px]"}`}
      >
        <div className="flex h-[72px] items-center gap-3 border-b border-[#202631] px-5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg shadow-blue-900/30">
            <Keyboard size={20} />
          </div>
          {!collapsed && (
            <div>
              <div className="display text-sl font-bold tracking-tight">
                TypeMaster
              </div>
              <div className="text-[10px] tracking-[.35em] text-slate-500">
                ACADEMY
              </div>
              <div className="text-[11px] tracking-[.1em] text-slate-500">By A.K. Shifan</div>
            </div>
          )}
        </div>
        <nav className="scrollbar flex-1 overflow-y-auto px-3 py-5">
          {nav.map(({ name, icon: Icon }) => (
            <button
              key={name}
              onClick={() => navTo(name)}
              title={collapsed ? name : ""}
              className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] transition ${section === name ? "bg-blue-500/15 text-blue-200 shadow-inner shadow-blue-500/10" : "text-slate-400 hover:bg-white/[.04] hover:text-slate-200"}`}
            >
              <Icon size={17} />
              {!collapsed && <span>{name}</span>}
              {!collapsed && name === "Learning Path" && (
                <span className="ml-auto text-[10px] text-slate-600">
                  {completed}/48
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="border-t border-[#202631] p-3">
          <div
            className={`mb-3 rounded-xl bg-[#131821] p-3 ${collapsed ? "hidden" : ""}`}
          >
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Daily goal</span>
              <span className="text-blue-300">
                {Math.floor(todayMins)}/{progress.prefs.dailyGoal} min
              </span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-[#282f3c]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500"
                style={{
                  width: `${Math.min(100, (todayMins / progress.prefs.dailyGoal) * 100)}%`,
                }}
              />
            </div>
          </div>
          <button
            className="flex w-full items-center gap-3 px-3 py-2 text-slate-500 hover:text-slate-200"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <ChevronRight size={17} />
            ) : (
              <ChevronsLeft size={17} />
            )}{" "}
            {!collapsed && <span className="text-xs">Collapse sidebar</span>}
          </button>
        </div>
      </aside>
      {mobileNav && (
        <div
          className="fixed inset-0 z-50 bg-black/60 md:hidden"
          onClick={() => setMobileNav(false)}
        >
          <div
            className="h-full w-[280px] bg-[#0b0e13] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex h-[72px] w-full items-center justify-between gap-3 border-b border-[#202631] px-1">
  <div className="flex min-w-0 items-center gap-3">
    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg shadow-blue-900/30">
      <Keyboard size={20} />
    </div>
    <div>
              <div className="display text-sl font-bold tracking-tight">
                TypeMaster
              </div>
              <div className="text-[10px] tracking-[.35em] text-slate-500">
                ACADEMY
              </div>
              <div className="text-[11px] tracking-[.1em] text-slate-500">By A.K. Shifan</div>
            </div>
  </div>

  <div className="shrink-0">
    <IconButton title="Close menu" onClick={() => setMobileNav(false)}>
      <X size={18} />
    </IconButton>
  </div>
</div>
            {nav.map(({ name, icon: Icon }) => (
              <button
                key={name}
                onClick={() => navTo(name)}
                className={`flex w-full gap-3 rounded-lg px-3 py-3 text-sm ${section === name ? "bg-blue-500/15 text-blue-200" : "text-slate-400"}`}
              >
                <Icon size={17} />
                {name}
              </button>
            ))}
          </div>
        </div>
      )}
      <main
        className={`min-h-screen transition-all ${collapsed ? "md:ml-[76px]" : "md:ml-[246px]"}`}
      >
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-[#202631]/90 bg-[#090b0f]/85 px-4 backdrop-blur-xl sm:px-7">
          <div className="flex items-center gap-3">
            <button
              className="btn !p-2 md:hidden"
              onClick={() => setMobileNav(true)}
            >
              <Menu size={18} />
            </button>
            <div>
              <div className="display text-lg font-semibold">{section}</div>
              <div className="hidden text-xs text-slate-500 sm:block">
                {section === "Dashboard"
                  ? "Your practice, progress, and next steps"
                  : section === "Practice"
                    ? "Build fluency one focused minute at a time"
                    : section === "Typing Test"
                      ? "Measure your typing with a focused timed test"
                      : "Your personal typing workspace"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-[#232a36] bg-[#11151c] px-3 py-1.5 text-xs sm:flex">
              <Flame size={14} className="text-orange-400" />
              {progress.streak} day streak
            </div>
            <div className="flex items-center gap-1 rounded-full border border-[#232a36] bg-[#11151c] px-3 py-1.5 text-xs">
              <Sparkles size={14} className="text-violet-300" />
              {progress.xp} XP
            </div>
            <IconButton
              title={
                progress.prefs.light
                  ? "Switch to dark theme"
                  : "Switch to light theme"
              }
              onClick={() => updatePref("light", !progress.prefs.light)}
            >
              {progress.prefs.light ? <Moon size={16} /> : <Sun size={16} />}
            </IconButton>
            <IconButton
              title="Quick help"
              onClick={() => setShowInstructions(!showInstructions)}
            >
              <CircleHelp size={17} />
            </IconButton>
          </div>
        </header>
        <div className="mobile-wrap mx-auto max-w-[1450px] p-5 sm:p-7 lg:p-9">
          <AnimatePresence mode="wait">
            <motion.div
              key={section}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.18 }}
            >
              {section === "Dashboard" && (
                <>
                  <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                    <div>
                      <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[.17em] text-blue-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                        YOUR TRAINING OVERVIEW
                      </div>
                      <h1 className="display text-3xl font-semibold sm:text-[38px]">
                        Good{" "}
                        {new Date().getHours() < 12
                          ? "morning"
                          : new Date().getHours() < 18
                            ? "afternoon"
                            : "evening"}
                        .
                      </h1>
                      <p className="mt-2 max-w-xl text-sm text-slate-400">
                        Every accurate keystroke builds a stronger habit. Ready
                        for today's session?
                      </p>
                    </div>
                    <button
                      className="btn btn-primary flex items-center justify-center gap-2"
                      onClick={() => {
                        navTo("Practice");
                        start(
                          "steady rhythm makes accurate typing feel natural.",
                        );
                      }}
                    >
                      <Play size={15} fill="currentColor" />
                      Start practicing
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <Stat
                      label="Current speed"
                      value={`${latest?.wpm ?? 0} WPM`}
                      sub="Most recent session"
                      icon={Gauge}
                      accent
                    />
                    <Stat
                      label="Personal best"
                      value={`${best} WPM`}
                      sub="Net words per minute"
                      icon={Zap}
                    />
                    <Stat
                      label="Average accuracy"
                      value={`${avgAccuracy}%`}
                      sub="Across completed sessions"
                      icon={ShieldCheck}
                    />
                    <Stat
                      label="Practice time"
                      value={`${Math.round(progress.results.reduce((s, r) => s + r.minutes, 0))} min`}
                      sub={`${completed} lessons completed`}
                      icon={Clock3}
                    />
                  </div>
                  <div className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
                    <div className="panel p-5 sm:p-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <h2 className="display font-semibold">
                            Your progress
                          </h2>
                          <p className="muted mt-1 text-xs">
                            Speed across your recent sessions
                          </p>
                        </div>
                        <button
                          className="btn text-xs"
                          onClick={() => navTo("Analytics")}
                        >
                          View analytics{" "}
                          <ChevronRight size={13} className="ml-1 inline" />
                        </button>
                      </div>
                      {chartData.length ? (
                        <div className="mt-4 h-[220px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                              <defs>
                                <linearGradient
                                  id="wpmFill"
                                  x1="0"
                                  y1="0"
                                  x2="0"
                                  y2="1"
                                >
                                  <stop
                                    offset="0%"
                                    stopColor="#6586ff"
                                    stopOpacity={0.27}
                                  />
                                  <stop
                                    offset="100%"
                                    stopColor="#6586ff"
                                    stopOpacity={0}
                                  />
                                </linearGradient>
                              </defs>
                              <CartesianGrid
                                stroke="#232a35"
                                strokeDasharray="4 4"
                                vertical={false}
                              />
                              <XAxis
                                dataKey="name"
                                tick={{ fill: "#667085", fontSize: 11 }}
                                axisLine={false}
                                tickLine={false}
                              />
                              <YAxis
                                tick={{ fill: "#667085", fontSize: 11 }}
                                axisLine={false}
                                tickLine={false}
                                width={30}
                              />
                              <Tooltip
                                contentStyle={{
                                  background: "#141923",
                                  border: "1px solid #303849",
                                  borderRadius: 10,
                                  color: "#e5e7eb",
                                }}
                              />
                              <Area
                                type="monotone"
                                dataKey="wpm"
                                stroke="#7894ff"
                                strokeWidth={2.5}
                                fill="url(#wpmFill)"
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="grid h-[220px] place-items-center text-center">
                          <div>
                            <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-blue-500/10 text-blue-300">
                              <BarChart3 />
                            </div>
                            <p className="text-sm">
                              Your chart will grow with every session.
                            </p>
                            <p className="muted mt-1 text-xs">
                              Start a practice to see your real results here.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="panel p-5 sm:p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="display font-semibold">
                            Learning path
                          </h2>
                          <p className="muted mt-1 text-xs">
                            Level {level + 1} · {levels[level]}
                          </p>
                        </div>
                        <GraduationCap className="text-violet-300" />
                      </div>
                      <div className="mt-5 flex items-center gap-4">
                        <div
                          className="relative grid h-16 w-16 shrink-0 place-items-center rounded-full"
                          style={{
                            background: `conic-gradient(#8b74ff ${((completed % 12) / 12) * 100}%,#252936 0)`,
                          }}
                        >
                          <div className="grid h-[52px] w-[52px] place-items-center rounded-full bg-[#12151d]">
                            <span className="display text-sm font-bold">
                              {completed}
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">
                            {levels[level]} track
                          </div>
                          <div className="muted mt-1 text-xs">
                            {completed} of 48 lessons done
                          </div>
                          <div className="mt-2 text-xs text-violet-300">
                            Next:{" "}
                            {lessons.find(
                              (l) => !progress.completed.includes(l.id),
                            )?.title ?? "Mastery achieved"}
                          </div>
                        </div>
                      </div>
                      <div className="mt-5 border-t border-[#252b36] pt-4">
                        <div className="mb-3 flex justify-between text-xs">
                          <span className="text-slate-400">
                            Today's mission
                          </span>
                          <span className="text-emerald-300">
                            {todayMins >= progress.prefs.dailyGoal
                              ? "Complete"
                              : "In progress"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 rounded-xl bg-[#171b24] p-3">
                          <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500/10 text-emerald-300">
                            <Target size={17} />
                          </div>
                          <div className="flex-1">
                            <div className="text-xs font-medium">
                              Practice {progress.prefs.dailyGoal} minutes
                            </div>
                            <div className="muted mt-1 text-[11px]">
                              {Math.floor(todayMins)} /{" "}
                              {progress.prefs.dailyGoal} min · +50 XP
                            </div>
                          </div>
                          {todayMins >= progress.prefs.dailyGoal && (
                            <ShieldCheck
                              size={16}
                              className="text-emerald-300"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.2fr]">
                    <div className="panel p-5">
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <h2 className="display font-semibold">
                            Quick practice
                          </h2>
                          <p className="muted mt-1 text-xs">
                            Pick up where you left off
                          </p>
                        </div>
                        <Zap size={17} className="text-blue-300" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          "Home row",
                          "Common words",
                          "Accuracy focus",
                          "Weak keys",
                        ].map((t, i) => (
                          <button
                            key={t}
                            className="rounded-xl border border-[#272e3a] bg-[#141821] p-3 text-left transition hover:border-blue-500/60"
                            onClick={() => {
                              setMode(
                                i === 3
                                  ? "Weak-key practice"
                                  : i === 0
                                    ? "Character practice"
                                    : "Word practice",
                              );
                              navTo("Practice");
                              start(
                                i === 0
                                  ? "asdf jkl; asdf jkl; fj dk sl a;"
                                  : i === 3
                                    ? selectedSource
                                    : practiceTexts[i],
                              );
                            }}
                          >
                            <span className="text-xs font-medium">{t}</span>
                            <span className="muted mt-1 block text-[10px]">
                              {
                                [
                                  "Finger placement",
                                  "Build natural rhythm",
                                  "Slow down and get it right",
                                  "Target your misses",
                                ][i]
                              }
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="panel p-5">
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <h2 className="display font-semibold">
                            Recent sessions
                          </h2>
                          <p className="muted mt-1 text-xs">
                            Your latest practice activity
                          </p>
                        </div>
                        <button
                          onClick={() => navTo("Analytics")}
                          className="text-xs text-blue-300"
                        >
                          History <ChevronRight size={13} className="inline" />
                        </button>
                      </div>
                      {progress.results.length ? (
                        <div className="space-y-2">
                          {progress.results
                            .slice(-3)
                            .reverse()
                            .map((r, i) => (
                              <div
                                key={r.date + i}
                                className="flex items-center justify-between rounded-lg bg-[#151922] px-3 py-2.5"
                              >
                                <div>
                                  <div className="text-xs font-medium">
                                    {r.mode}
                                  </div>
                                  <div className="muted mt-1 text-[10px]">
                                    {new Date(r.date).toLocaleDateString()} ·{" "}
                                    {Math.round(r.minutes * 60)} sec
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-semibold text-blue-200">
                                    {r.wpm} WPM
                                  </div>
                                  <div className="muted text-[10px]">
                                    {r.accuracy}% accuracy
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <p className="muted rounded-lg bg-[#151922] p-4 text-sm">
                          No sessions yet. Your real activity will appear here.
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
              {section === "Learning Path" && (
                <>
                  <PageHeading
                    title="A path to confident typing"
                    subtitle="Build accuracy and touch-typing habits one lesson at a time."
                  />
                  <div className="mb-5 flex flex-wrap gap-2">
                    {levels.map((l, i) => (
                      <button
                        key={l}
                        disabled={i > level}
                        onClick={() =>
                          document
                            .getElementById(`level-${i}`)
                            ?.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            })
                        }
                        className={`rounded-lg border px-3 py-2 text-xs ${i === level ? "border-violet-500/50 bg-violet-500/10 text-violet-200" : "border-[#252b36] text-slate-500"} ${i > level ? "cursor-not-allowed opacity-60" : ""}`}
                      >
                        Level {i + 1} · {l}{" "}
                        <span className="ml-2 opacity-60">
                          {Math.max(0, Math.min(12, completed - i * 12))}/12
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="grid gap-5 xl:grid-cols-[1fr_350px]">
                    <div className="space-y-5">
                      {levels.map((lvl, li) => (
                        <section
                          id={`level-${li}`}
                          key={lvl}
                          className="panel scroll-mt-24 overflow-hidden"
                        >
                          <div className="flex items-center justify-between border-b border-[#272e39] px-5 py-4">
                            <div>
                              <h2 className="display font-semibold">
                                Level {li + 1}: {lvl}
                              </h2>
                              <p className="muted mt-1 text-xs">
                                {["10–25", "30–50", "50–80", "80–120+"][li]} WPM
                                · suggested milestone
                              </p>
                            </div>
                            <div className="text-xs text-slate-500">
                              {Math.min(12, Math.max(0, completed - li * 12))}
                              /12
                            </div>
                          </div>
                          <div className="divide-y divide-[#222833]">
                            {lessons
                              .filter((l) => l.level === li)
                              .map((l) => {
                                const done = progress.completed.includes(l.id),
                                  open =
                                    l.id === 1 ||
                                    progress.completed.includes(l.id - 1);
                                return (
                                  <button
                                    disabled={!open}
                                    key={l.id}
                                    onClick={() => setLesson(l)}
                                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${lesson.id === l.id ? "bg-blue-500/[.08]" : ""} ${open ? "hover:bg-white/[.025]" : "opacity-60"}`}
                                  >
                                    <div
                                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs ${done ? "bg-emerald-500/15 text-emerald-300" : lesson.id === l.id ? "bg-blue-500/15 text-blue-200" : "bg-[#202631] text-slate-500"}`}
                                    >
                                      {done ? <ShieldCheck size={15} /> : l.id}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="truncate text-sm">
                                        {l.title}
                                      </div>
                                      <div className="muted mt-1 text-[10px]">
                                        {l.focus} · {l.duration} min
                                      </div>
                                    </div>
                                    <ChevronRight
                                      size={15}
                                      className="text-slate-600"
                                    />
                                  </button>
                                );
                              })}
                          </div>
                        </section>
                      ))}
                    </div>
                    <div className="panel h-fit p-5 xl:sticky xl:top-24">
                      <div className="text-xs uppercase tracking-widest text-blue-300">
                        LESSON {lesson.id}
                      </div>
                      <h2 className="display mt-2 text-xl font-semibold">
                        {lesson.title}
                      </h2>
                      <p className="muted mt-2 text-sm">{lesson.objective}</p>
                      <div className="mt-4 rounded-xl border border-[#282f3b] bg-[#10141b] p-3">
                        <div className="mb-2 text-[10px] uppercase tracking-wider text-slate-500">
                          Lesson objectives
                        </div>
                        <div className="text-xs leading-5 text-slate-300">
                          Practice {lesson.focus} keys while keeping your hands
                          relaxed. Aim for {progress.prefs.accuracyTarget}%
                          accuracy before moving on.
                        </div>
                      </div>
                      <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                        <Clock3 size={14} />
                        {lesson.duration} minutes{" "}
                        <span className="ml-auto">
                          Recommended{" "}
                          {["10–25", "30–50", "50–80", "80–120+"][lesson.level]}{" "}
                          WPM
                        </span>
                      </div>
                      <button
                        className="btn btn-primary mt-5 w-full"
                        onClick={() => {
                          navTo("Practice");
                          setLessonSession(lesson.id);
                          setMode(`Lesson: ${lesson.title}`);
                          start(lesson.text.trim(), 600);
                        }}
                      >
                        Start lesson{" "}
                        <ChevronRight size={15} className="ml-1 inline" />
                      </button>
                      {nextCourseLesson &&
                        nextCourseLesson.level > 0 &&
                        nextCourseLesson.id % 12 === 1 && (
                          <button
                            className="btn mt-2 w-full"
                            onClick={() =>
                              document
                                .getElementById(
                                  `level-${nextCourseLesson.level}`,
                                )
                                ?.scrollIntoView({
                                  behavior: "smooth",
                                  block: "start",
                                })
                            }
                          >
                            Continue to Level {nextCourseLesson.level + 1}:{" "}
                            {levels[nextCourseLesson.level]}{" "}
                            <ChevronRight size={14} className="ml-1 inline" />
                          </button>
                        )}
                      {nextCourseLesson &&
                        nextCourseLesson.level < 3 &&
                        nextCourseLesson.id % 12 !== 1 && (
                          <button
                            className="btn course-locked mt-2 w-full"
                            disabled
                          >
                            Level {nextCourseLesson.level + 2}:{" "}
                            {levels[nextCourseLesson.level + 1]} unlocks after{" "}
                            {levels[nextCourseLesson.level]} reaches 12/12
                          </button>
                        )}
                      <p className="muted mt-3 text-center text-[10px]">
                        Complete the exercise at your accuracy target to mark
                        this lesson done.
                      </p>
                    </div>
                  </div>
                </>
              )}
              {(section === "Practice" ||
                section === "Typing Test" ||
                section === "Finger Training") && (
                <>
                  <PageHeading
                    title={
                      section === "Practice"
                        ? "Focused practice"
                        : section === "Typing Test"
                          ? "Typing speed test"
                          : "Finger training"
                    }
                    subtitle={
                      section === "Typing Test"
                        ? "A clear measure of speed, accuracy, and consistency."
                        : "Relax your hands. Watch the prompt. Let accuracy lead."
                    }
                  />
                  {section === "Typing Test" && (
                    <div className="test-options mb-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-slate-500">
                          Practice text
                        </span>
                        <button
                          className={`btn text-xs ${testStyle === "sentences" ? "btn-primary" : ""}`}
                          onClick={() => {
                            setTestStyle("sentences");
                            setSource(selectedTestText("sentences"));
                            setTyped([]);
                            setActive(false);
                            setComplete(false);
                          }}
                        >
                          Random sentences
                        </button>
                        <button
                          className={`btn text-xs ${testStyle === "paragraphs" ? "btn-primary" : ""}`}
                          onClick={() => {
                            setTestStyle("paragraphs");
                            setSource(selectedTestText("paragraphs"));
                            setTyped([]);
                            setActive(false);
                            setComplete(false);
                          }}
                        >
                          Long paragraphs
                        </button>
                        <label className="ml-2 flex items-center gap-2 text-xs text-slate-500">
                          Passage length
                          <select
                            className="setting-input !py-1.5"
                            value={passageMinutes}
                            onChange={(e) => {
                              const minutes = Number(e.target.value);
                              setPassageMinutes(minutes);
                              setSource(selectedTestText(testStyle, minutes));
                              setTyped([]);
                              setActive(false);
                              setComplete(false);
                            }}
                          >
                            {[1, 3, 5, 10].map((minutes) => (
                              <option value={minutes} key={minutes}>
                                {minutes} min of text
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          className="btn text-xs"
                          onClick={() =>
                            updatePref("sound", !progress.prefs.sound)
                          }
                        >
                          {progress.prefs.sound ? (
                            <Volume2 size={13} className="mr-1 inline" />
                          ) : (
                            <VolumeX size={13} className="mr-1 inline" />
                          )}
                          Key sounds {progress.prefs.sound ? "on" : "off"}
                        </button>
                        <button
                          className="btn text-xs"
                          onClick={() => {
                            if (
                              progress.prefs.speakWords &&
                              "speechSynthesis" in window
                            )
                              window.speechSynthesis.cancel();
                            updatePref(
                              "speakWords",
                              !progress.prefs.speakWords,
                            );
                          }}
                        >
                          {progress.prefs.speakWords ? (
                            <Volume2 size={13} className="mr-1 inline" />
                          ) : (
                            <VolumeX size={13} className="mr-1 inline" />
                          )}
                          Letter voice{" "}
                          {progress.prefs.speakWords ? "on" : "off"}
                        </button>
                        <span className="muted ml-auto text-[11px]">
                          New passage appears as soon as you choose
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {[15, 30, 60, 120, 300, 600].map((s) => (
                          <button
                            key={s}
                            onClick={() => {
                              setDuration(s);
                              setRemaining(s);
                            }}
                            className={`btn text-xs ${duration === s ? "!border-blue-500 !bg-blue-500/15 !text-blue-200" : ""}`}
                          >
                            {s < 60 ? `${s} sec` : `${s / 60} min`}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {section === "Practice" && (
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <select
                        value={mode}
                        onChange={(e) => {
                          const nextMode = e.target.value;
                          setMode(nextMode);
                          setSource(
                            practiceTextFor(
                              nextMode,
                              custom,
                              progress.keys,
                              lesson,
                            ),
                          );
                          setTyped([]);
                          setActive(false);
                          setComplete(false);
                        }}
                        className="rounded-lg border border-[#303849] bg-[#141923] px-3 py-2 text-xs text-slate-200"
                      >
                        {mode.startsWith("Lesson:") && (
                          <option value={mode}>
                            Current lesson · {lesson.title}
                          </option>
                        )}
                        {practiceModes.map((m) => (
                          <option key={m}>{m}</option>
                        ))}
                      </select>
                      {mode === "Custom text" && (
                        <input
                          value={custom}
                          onChange={(e) => {
                            const nextText = e.target.value;
                            setCustom(nextText);
                            setSource(
                              practiceTextFor(
                                "Custom text",
                                nextText,
                                progress.keys,
                                lesson,
                              ),
                            );
                            setTyped([]);
                            setActive(false);
                            setComplete(false);
                          }}
                          placeholder="Enter text to practice"
                          className="min-w-[180px] flex-1 rounded-lg border border-[#303849] bg-[#141923] px-3 py-2 text-xs outline-none focus:border-blue-500"
                        />
                      )}
                      <div className="ml-auto flex items-center gap-2">
                        <button
                          className="btn !px-2 !py-1.5 text-[11px]"
                          onClick={() =>
                            updatePref("sound", !progress.prefs.sound)
                          }
                        >
                          {progress.prefs.sound ? (
                            <Volume2 size={13} className="mr-1 inline" />
                          ) : (
                            <VolumeX size={13} className="mr-1 inline" />
                          )}
                          Key sounds {progress.prefs.sound ? "on" : "off"}
                        </button>
                        <button
                          className="btn !px-2 !py-1.5 text-[11px]"
                          onClick={() => {
                            if (
                              progress.prefs.speakWords &&
                              "speechSynthesis" in window
                            )
                              window.speechSynthesis.cancel();
                            updatePref(
                              "speakWords",
                              !progress.prefs.speakWords,
                            );
                          }}
                        >
                          <Volume2 size={13} className="mr-1 inline" />
                          {progress.prefs.speakWords
                            ? "Letter voice on"
                            : "Letter voice off"}
                        </button>
                        <span className="muted text-xs">
                          {progress.prefs.profile}
                        </span>
                      </div>
                    </div>
                  )}
                  {section === "Practice" && (
                    <div className="course-continue panel mb-4">
                      <div>
                        <div className="course-eyebrow">YOUR LEARNING PATH</div>
                        <strong>
                          {nextCourseLesson
                            ? `Lesson ${nextCourseLesson.id} · ${nextCourseLesson.title}`
                            : "Course complete"}
                        </strong>
                        <span>
                          {nextCourseLesson
                            ? `Level ${nextCourseLesson.level + 1} · ${levels[nextCourseLesson.level]} · `
                            : "All levels complete · "}
                          {nextCourseLesson ? completed % 12 : 12} of 12 lessons
                          in this level complete · {completed}/48 overall
                          {nextCourseLesson &&
                            nextCourseLesson.level < 3 &&
                            nextCourseLesson.id % 12 !== 1 && (
                              <small>
                                Complete all 12 {levels[nextCourseLesson.level]}{" "}
                                lessons to unlock{" "}
                                {levels[nextCourseLesson.level + 1]}.
                              </small>
                            )}
                        </span>
                        {nextCourseLesson &&
                          nextCourseLesson.level < 3 &&
                          nextCourseLesson.id % 12 !== 1 && (
                            <button className="btn course-locked" disabled>
                              Continue to Level {nextCourseLesson.level + 2}:{" "}
                              {levels[nextCourseLesson.level + 1]}{" "}
                              <span>unlocks at 12/12</span>
                            </button>
                          )}
                      </div>
                      <button
                        className="btn btn-primary"
                        onClick={() => {
                          if (nextCourseLesson) {
                            setLesson(nextCourseLesson);
                            navTo("Learning Path");
                            window.setTimeout(
                              () =>
                                document
                                  .getElementById(
                                    `level-${nextCourseLesson.level}`,
                                  )
                                  ?.scrollIntoView({
                                    behavior: "smooth",
                                    block: "start",
                                  }),
                              180,
                            );
                          } else navTo("Learning Path");
                        }}
                      >
                        {nextCourseLesson
                          ? nextCourseLesson.id > 1 &&
                            nextCourseLesson.id % 12 === 1
                            ? `Continue to next level: ${levels[nextCourseLesson.level]}`
                            : `Continue lesson ${nextCourseLesson.id}`
                          : "Review learning path"}{" "}
                        <ChevronRight size={14} className="ml-1 inline" />
                      </button>
                    </div>
                  )}
                  {section === "Finger Training" && (
                    <div className="mb-4 flex flex-wrap gap-2">
                      {[
                        "Home row",
                        "Left hand",
                        "Right hand",
                        "Alternating hands",
                        "Thumbs & space",
                      ].map((x, i) => (
                        <button
                          key={x}
                          onClick={() =>
                            start(
                              [
                                "asdf jkl; asdf jkl;",
                                "qaz wsx edc rfvt",
                                "yhn ujm ik, ol.",
                                "f j d k s l a ;",
                                "space makes rhythm",
                              ][i],
                            )
                          }
                          className="btn text-xs"
                        >
                          {x}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="grid gap-4 xl:grid-cols-[1fr_270px]">
                    <div className="panel p-4 sm:p-6">
                      <div className="mb-5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full ${active ? "animate-pulse bg-emerald-400" : "bg-slate-600"}`}
                          />
                          <span className="text-xs text-slate-400">
                            {active
                              ? "Session in progress"
                              : complete
                                ? "Session complete"
                                : "Ready when you are"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            className="btn !px-2 !py-1.5"
                            onClick={() =>
                              setShowInstructions(!showInstructions)
                            }
                          >
                            <CircleHelp size={15} />
                          </button>
                          <select
                            className="rounded-md border border-[#303849] bg-[#141923] px-2 py-1.5 text-xs"
                            value={duration}
                            onChange={(e) => {
                              setDuration(Number(e.target.value));
                              setRemaining(Number(e.target.value));
                            }}
                          >
                            {[15, 30, 60, 120, 300, 600].map((s) => (
                              <option value={s} key={s}>
                                {s < 60 ? `${s}s` : `${s / 60}m`}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {showInstructions && (
                        <div className="mb-4 rounded-lg border border-blue-500/20 bg-blue-500/[.07] p-3 text-xs text-blue-100">
                          Click Start, then type on your physical keyboard.
                          Backspace corrects a mistake; Escape pauses. The
                          cursor shows where you are. Use the finger guide to
                          train the standard home-row positions.
                        </div>
                      )}
                      <div className="mb-5 grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {[
                          [
                            "Net WPM",
                            active
                              ? calculateStats(
                                  typed.length,
                                  typed.filter((v, i) => v === source[i])
                                    .length,
                                  typed.filter((v, i) => v !== source[i])
                                    .length,
                                  Math.max(
                                    1,
                                    (Date.now() - sessionStarted) / 1000,
                                  ),
                                ).net
                              : (latest?.wpm ?? 0),
                          ],
                          [
                            "Accuracy",
                            `${typed.length ? Math.round((typed.filter((v, i) => v === source[i]).length / typed.length) * 100) : 100}%`,
                          ],
                          [
                            "Time",
                            `${Math.floor(remaining / 60)
                              .toString()
                              .padStart(
                                2,
                                "0",
                              )}:${(remaining % 60).toString().padStart(2, "0")}`,
                          ],
                          [
                            "Errors",
                            typed.filter((v, i) => v !== source[i]).length,
                          ],
                        ].map(([k, v]) => (
                          <div key={k} className="rounded-lg bg-[#10141b] p-3">
                            <div className="muted text-[10px]">{k}</div>
                            <div className="display mt-1 text-lg font-semibold">
                              {v}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div
                        ref={typingPromptRef}
                        className="typing-prompt relative min-h-[175px] rounded-xl border border-[#262d39] bg-[#0c0f14] p-5 sm:p-7"
                        onClick={() => typingRef.current?.focus()}
                      >
                        <div
                          ref={typingRef}
                          tabIndex={0}
                          className="absolute inset-0 z-0 outline-none"
                          aria-label="Typing exercise input"
                        />
                        <div className="typing-prompt-text relative z-10 whitespace-pre-wrap break-words font-mono text-lg leading-[2.15] tracking-wide sm:text-xl">
                          {source.split("").map((ch, i) => {
                            const got = typed[i],
                              isCurrent = i === typed.length;
                            return (
                              <span
                                key={i}
                                ref={
                                  isCurrent ? currentCharacterRef : undefined
                                }
                                data-typing-character
                                className={`${got === undefined ? (isCurrent ? "rounded bg-blue-500/20 text-blue-100 underline decoration-blue-400 decoration-2 underline-offset-4" : "text-slate-500") : got === ch ? "text-emerald-300" : "rounded bg-rose-500/20 text-rose-300"}`}
                              >
                                {ch}
                              </span>
                            );
                          })}
                          {typed.length >= source.length && (
                            <span className="text-emerald-300"> ✓</span>
                          )}
                        </div>
                        <div className="pointer-events-none absolute bottom-3 right-4 z-0 text-[10px] text-slate-600">
                          {typed.length} / {source.length} characters
                        </div>
                      </div>
                      {progress.prefs.showKeyboard && (
                        <div className="practice-keyboard">
                          <div className="practice-keyboard-heading">
                            <h3>Virtual keyboard</h3>
                            <div className="flex items-center gap-3">
                              <button
                                className="btn !px-2 !py-1 text-[11px]"
                                onClick={() =>
                                  updatePref("sound", !progress.prefs.sound)
                                }
                              >
                                {progress.prefs.sound ? (
                                  <Volume2 size={13} className="mr-1 inline" />
                                ) : (
                                  <VolumeX size={13} className="mr-1 inline" />
                                )}
                                Key sounds {progress.prefs.sound ? "on" : "off"}
                              </button>
                              <span>Centered · ten-finger guidance</span>
                            </div>
                          </div>
                          <div className="practice-keyboard-wrap">
                            <KeyboardView
                              active={pressedKey}
                              target={source[typed.length] ?? ""}
                              colors={progress.prefs.colors}
                              compact
                              onPress={(k) => inputKey(k)}
                            />
                          </div>
                        </div>
                      )}
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="rounded border border-[#333b48] px-1.5 py-0.5 font-mono">
                            {lastKey || "⌨"}
                          </span>
                          {lastKey
                            ? `Next finger: ${fingerFor(source[typed.length] ?? lastKey)}`
                            : "Click start, then type to begin"}
                        </div>
                        <div className="flex gap-2">
                          <button className="btn" onClick={startCurrent}>
                            Restart
                          </button>
                          {active ? (
                            <button
                              className="btn"
                              onClick={() => {
                                setActive(false);
                              }}
                            >
                              Pause
                            </button>
                          ) : (
                            <button
                              className="btn btn-primary"
                              onClick={startCurrent}
                            >
                              <Play size={14} className="mr-1 inline" />
                              Start
                            </button>
                          )}
                        </div>
                      </div>
                      {complete && (
                        <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[.06] p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-emerald-200">
                                Nice work. Session recorded.
                              </div>
                              <div className="muted mt-1 text-xs">
                                {latest?.wpm ??
                                  calculateStats(
                                    typed.length,
                                    typed.filter((v, i) => v === source[i])
                                      .length,
                                    typed.filter((v, i) => v !== source[i])
                                      .length,
                                    duration - remaining || 1,
                                  ).net}{" "}
                                WPM ·{" "}
                                {typed.length
                                  ? Math.round(
                                      (typed.filter((v, i) => v === source[i])
                                        .length /
                                        typed.length) *
                                        100,
                                    )
                                  : 100}
                                % accuracy · +XP earned
                              </div>
                            </div>
                            {lessonPassed && mode.startsWith("Lesson:") ? (
                              <button
                                className="btn btn-primary text-xs"
                                onClick={() => {
                                  const next = lessons.find(
                                    (l) => l.id === lesson.id + 1,
                                  );
                                  if (next) {
                                    setLesson(next);
                                    navTo("Learning Path");
                                    window.setTimeout(
                                      () =>
                                        document
                                          .getElementById(`level-${next.level}`)
                                          ?.scrollIntoView({
                                            behavior: "smooth",
                                            block: "start",
                                          }),
                                      180,
                                    );
                                  }
                                }}
                              >
                                {lesson.id % 12 === 0
                                  ? "Continue to next level"
                                  : "Continue to next lesson"}{" "}
                                <ChevronRight
                                  size={14}
                                  className="ml-1 inline"
                                />
                              </button>
                            ) : (
                              <button
                                className="btn text-xs"
                                onClick={() => navTo("Analytics")}
                              >
                                See progress
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-4">
                      <div className="panel p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="display text-sm font-semibold">
                            Finger guide
                          </h3>
                          <span className="text-[10px] text-slate-500">
                            {progress.prefs.fingerHints ? "ON" : "OFF"}
                          </span>
                        </div>
                        <HandIllustration
                          active={fingerFor(source[typed.length] ?? "f")}
                        />
                        <div className="mt-3 rounded-lg bg-[#10141b] p-3">
                          <div className="text-[10px] uppercase tracking-wide text-slate-500">
                            Next finger
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-sm">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{
                                background:
                                  fingerColors[
                                    fingerFor(source[typed.length] ?? "f")
                                  ],
                              }}
                            />
                            {fingerFor(source[typed.length] ?? "f")}
                          </div>
                          <div className="muted mt-1 text-xs">
                            Target key{" "}
                            <b className="ml-1 text-slate-200">
                              {source[typed.length] ?? "✓"}
                            </b>
                          </div>
                        </div>
                      </div>
                      <div className="panel p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="display text-sm font-semibold">
                            Keyboard
                          </h3>
                          <span className="text-[10px] text-slate-500">
                            QWERTY
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {["a", "s", "d", "f", "j", "k", "l", ";"].map((k) => (
                            <span
                              key={k}
                              className={`grid h-8 w-8 place-items-center rounded border text-xs font-mono ${k.toLowerCase() === lastKey.toLowerCase() ? "border-blue-400 bg-blue-500/20 text-blue-200" : "border-[#2b323f] bg-[#11151c] text-slate-500"}`}
                            >
                              {k}
                            </span>
                          ))}
                        </div>
                        <div className="muted mt-2 text-[10px]">
                          Home row · fingers curve gently
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
              {section === "Keyboard Simulator" && (
                <>
                  <PageHeading
                    title="Typing simulator"
                    subtitle="Learn by typing a passage with your hands in the right place."
                  />
                  <div className="sim-passage panel">
                    <button
                      className="sim-start"
                      onClick={() => {
                        setMode("Keyboard simulator");
                        start(simulatorText, 300);
                      }}
                    >
                      {active ? "TYPING…" : "START TYPING"}
                    </button>
                    <div className="sim-passage-body">
                      {simulatorText.split("").map((ch, i) => (
                        <span
                          key={i}
                          className={
                            i < typed.length
                              ? typed[i] === ch
                                ? "sim-correct"
                                : "sim-wrong"
                              : i === typed.length
                                ? "sim-current"
                                : "sim-future"
                          }
                        >
                          {ch}
                        </span>
                      ))}
                    </div>
                    <div className="sim-progress">
                      {active
                        ? "Type the highlighted character · Backspace corrects a key"
                        : complete
                          ? "Passage complete — start again for another round"
                          : "Click START TYPING, then follow the highlighted text"}
                      <span>
                        {typed.length} / {simulatorText.length}
                      </span>
                    </div>
                  </div>
                  <div className="panel sim-keyboard-card">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div>
                        <h2 className="display font-semibold">
                          QWERTY keyboard
                        </h2>
                        <p className="muted mt-1 text-xs">
                          The highlighted finger shows which finger should reach
                          the next key.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="btn text-xs"
                          onClick={() =>
                            updatePref("colors", !progress.prefs.colors)
                          }
                        >
                          {progress.prefs.colors ? "Hide" : "Show"} finger
                          colors
                        </button>
                        <button
                          className="btn text-xs"
                          onClick={() =>
                            updatePref("sound", !progress.prefs.sound)
                          }
                        >
                          {progress.prefs.sound ? (
                            <Volume2 size={13} className="mr-1 inline" />
                          ) : (
                            <VolumeX size={13} className="mr-1 inline" />
                          )}
                          Key sounds {progress.prefs.sound ? "on" : "off"}
                        </button>
                      </div>
                    </div>
                    <div className="sim-keyboard-wrap">
                      <KeyboardView
                        active={pressedKey}
                        target={source[typed.length] ?? ""}
                        colors={progress.prefs.colors}
                        compact
                        onPress={(k) => {
                          if (active) inputKey(k);
                          else {
                            setLastKey(k);
                            flashKey(k);
                            playKey(
                              progress.prefs.profile,
                              progress.prefs.volume,
                              k,
                            );
                          }
                        }}
                      />
                    </div>
                    <div className="sim-footer">
                      <div className="flex flex-wrap gap-x-3 gap-y-2">
                        {Object.entries(fingerColors).map(([f, c]) => (
                          <span
                            key={f}
                            className="flex items-center gap-1.5 text-[10px] text-slate-500"
                          >
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ background: c }}
                            />
                            {f}
                          </span>
                        ))}
                      </div>
                      <div className="sim-key-info">
                        <span className="font-mono text-lg">
                          {simulatorText[typed.length] ?? "✓"}
                        </span>
                        <span>
                          {fingerFor(simulatorText[typed.length] ?? "f")}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
              {section === "Personal Coach" && (
                <>
                  <PageHeading
                    title="Your personal coach"
                    subtitle="Practical recommendations from your own practice history."
                  />
                  <div className="grid gap-4 md:grid-cols-2">
                    <CoachCard
                      icon={Lightbulb}
                      title="Focus for your next session"
                      text={
                        !progress.results.length
                          ? "Start with a short home-row practice. Your coach will use your real sessions to make specific recommendations."
                          : avgAccuracy < 95
                            ? `Your average accuracy is ${avgAccuracy}%. Slow down slightly and aim for ${progress.prefs.accuracyTarget}% before pushing speed.`
                            : weak.length
                              ? `Your ${weak
                                  .slice(0, 3)
                                  .map((x) => x.key.toUpperCase())
                                  .join(
                                    ", ",
                                  )} keys need attention. Try a targeted weak-key drill.`
                              : "Your accuracy is strong. Keep a steady rhythm and gradually increase your practice duration."
                      }
                    />
                    <CoachCard
                      icon={Activity}
                      title="Finger pattern"
                      text={
                        weak.length
                          ? (() => {
                              const map: Record<string, number> = {};
                              weak.slice(0, 8).forEach((x) => {
                                const f = fingerFor(x.key);
                                map[f] = (map[f] ?? 0) + (100 - x.accuracy);
                              });
                              const f = Object.entries(map).sort(
                                (a, b) => b[1] - a[1],
                              )[0]?.[0];
                              return f
                                ? `Your ${f.toLowerCase()} shows the most missed-key opportunities. Short, relaxed repetitions can build confidence.`
                                : "Practice a range of keys to reveal finger-level trends.";
                            })()
                          : "As you practice more keys, this space will identify finger patterns from your real typing."
                      }
                    />
                    <CoachCard
                      icon={Clock3}
                      title="Consistency"
                      text={
                        progress.streak
                          ? `You have practiced ${progress.streak} day${progress.streak === 1 ? "" : "s"} in a row. A brief daily session is more useful than one long session now and then.`
                          : "A short daily routine makes it easier to form a lasting habit."
                      }
                    />
                    <CoachCard
                      icon={BarChart3}
                      title="Speed trend"
                      text={
                        progress.results.length > 1
                          ? `Your latest speed is ${latest?.wpm} WPM against a best of ${best} WPM. Compare several sessions to spot your natural trend.`
                          : "Complete at least two sessions to see how your speed is changing."
                      }
                    />
                  </div>
                  <div className="panel mt-4 p-5">
                    <div className="flex items-center gap-2">
                      <Sparkles size={17} className="text-violet-300" />
                      <h2 className="display font-semibold">
                        Suggested next step
                      </h2>
                    </div>
                    <p className="muted mt-2 text-sm">
                      {weak.length
                        ? `Spend five minutes with a ${weak
                            .slice(0, 4)
                            .map((x) => x.key.toUpperCase())
                            .join(
                              " ",
                            )} targeted drill, then finish with a comfortable sentence.`
                        : "Choose a lesson in your learning path or complete a sentence practice. Every session makes your recommendations more personal."}
                    </p>
                    <button
                      className="btn btn-primary mt-4"
                      onClick={() => {
                        setMode("Weak-key practice");
                        navTo("Practice");
                        start(selectedSource);
                      }}
                    >
                      Start a targeted exercise{" "}
                      <ChevronRight size={14} className="ml-1 inline" />
                    </button>
                  </div>
                </>
              )}
              {section === "Weak Keys" && (
                <>
                  <PageHeading
                    title="Weak keys"
                    subtitle="See which keys challenge you, then turn them into targeted practice."
                  />
                  <div className="grid gap-4 md:grid-cols-3">
                    <Stat
                      label="Keys tracked"
                      value={Object.keys(progress.keys).length}
                      sub="From real keystrokes"
                      icon={Keyboard}
                    />
                    <Stat
                      label="Needs practice"
                      value={weak.filter((x) => x.accuracy < 90).length}
                      sub="Keys below 90% accuracy"
                      icon={Target}
                      accent
                    />
                    <Stat
                      label="Total attempts"
                      value={Object.values(progress.keys).reduce(
                        (n, s) => n + s.attempts,
                        0,
                      )}
                      sub="Tracked key presses"
                      icon={Activity}
                    />
                  </div>
                  <div className="panel mt-5 p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h2 className="display font-semibold">Key accuracy</h2>
                        <p className="muted mt-1 text-xs">
                          Only keys you have actually practiced appear here.
                        </p>
                      </div>
                      <button
                        className="btn btn-primary text-xs"
                        onClick={() => {
                          setMode("Weak-key practice");
                          navTo("Practice");
                          start(selectedSource);
                        }}
                      >
                        Practice weak keys
                      </button>
                    </div>
                    {Object.keys(progress.keys).length ? (
                      <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-13">
                        {Object.entries(progress.keys)
                          .sort((a, b) => a[0].localeCompare(b[0]))
                          .map(([k, s]) => {
                            const a = Math.round(
                              (s.correct / Math.max(s.attempts, 1)) * 100,
                            );
                            return (
                              <div
                                key={k}
                                className="rounded-lg border p-2 text-center"
                                style={{
                                  background: `rgba(${a < 70 ? "244,63,94" : a < 90 ? "245,158,11" : "52,211,153"},.09)`,
                                  borderColor:
                                    a < 70
                                      ? "rgba(244,63,94,.25)"
                                      : a < 90
                                        ? "rgba(245,158,11,.25)"
                                        : "rgba(52,211,153,.2)",
                                }}
                              >
                                <div className="font-mono text-sm uppercase">
                                  {k}
                                </div>
                                <div className="mt-1 text-[10px] text-slate-400">
                                  {a}%
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <Empty
                        icon={Target}
                        title="Your key map is waiting"
                        text="Complete a practice session to track key accuracy, response time, and finger performance."
                      />
                    )}
                  </div>
                  <div className="panel mt-4 overflow-hidden">
                    <div className="border-b border-[#252b36] p-4">
                      <h2 className="display font-semibold">
                        Practice priorities
                      </h2>
                    </div>
                    {weak.length ? (
                      <div className="divide-y divide-[#252b36]">
                        {weak.slice(0, 10).map((x) => (
                          <div
                            key={x.key}
                            className="flex items-center gap-4 px-4 py-3"
                          >
                            <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#202631] font-mono uppercase">
                              {x.key}
                            </div>
                            <div className="flex-1">
                              <div className="text-xs">{fingerFor(x.key)}</div>
                              <div className="muted mt-1 text-[10px]">
                                {x.attempts} attempts · last practiced{" "}
                                {x.last || "—"}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm">{x.accuracy}%</div>
                              <div className="muted text-[10px]">
                                {x.avg} ms avg
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="muted p-4 text-sm">
                        Your weak-key report appears after three attempts per
                        key.
                      </p>
                    )}
                  </div>
                </>
              )}
              {section === "Achievements" && (
                <>
                  <PageHeading
                    title="Achievements"
                    subtitle="Milestones unlock as your real practice and results grow."
                  />
                  <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Stat
                      label="Unlocked"
                      value={achievements.filter((a) => unlocked(a[0])).length}
                      sub={`of ${achievements.length} milestones`}
                      icon={Trophy}
                      accent
                    />
                    <Stat
                      label="Total XP"
                      value={progress.xp}
                      sub="Earned from sessions and practice"
                      icon={Sparkles}
                    />
                    <Stat
                      label="Current streak"
                      value={`${progress.streak} days`}
                      sub="Keep your momentum going"
                      icon={Flame}
                    />
                    <Stat
                      label="Lessons"
                      value={completed}
                      sub="Completed at your accuracy goal"
                      icon={BookOpen}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {achievements.map(([id, title, desc]) => {
                      const yes = unlocked(id);
                      return (
                        <div
                          key={id}
                          className={`panel flex items-center gap-4 p-4 ${yes ? "border-amber-500/20" : "opacity-65"}`}
                        >
                          <div
                            className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${yes ? "bg-amber-400/10 text-amber-300" : "bg-[#202631] text-slate-600"}`}
                          >
                            <Award size={21} />
                          </div>
                          <div>
                            <div className="text-sm font-medium">{title}</div>
                            <div className="muted mt-1 text-xs">{desc}</div>
                            <div
                              className={`mt-2 text-[10px] ${yes ? "text-amber-300" : "text-slate-600"}`}
                            >
                              {yes ? "UNLOCKED" : "LOCKED"}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
              {section === "Analytics" && (
                <>
                  <PageHeading
                    title="Performance analytics"
                    subtitle="A clear picture of your progress, built from your saved sessions."
                  />
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <Stat
                      label="Personal best"
                      value={`${best} WPM`}
                      sub="Net WPM"
                      icon={Zap}
                      accent
                    />
                    <Stat
                      label="Average accuracy"
                      value={`${avgAccuracy}%`}
                      sub="Recorded sessions"
                      icon={ShieldCheck}
                    />
                    <Stat
                      label="Total practice"
                      value={`${Math.round(progress.results.reduce((s, r) => s + r.minutes, 0))} min`}
                      sub="Across all sessions"
                      icon={Clock3}
                    />
                    <Stat
                      label="Total sessions"
                      value={progress.results.length}
                      sub="Recorded locally"
                      icon={Activity}
                    />
                  </div>
                  <div className="panel mt-5 p-5">
                    <h2 className="display font-semibold">
                      Speed & accuracy history
                    </h2>
                    <p className="muted mt-1 text-xs">
                      Real session results · latest 12
                    </p>
                    {chartData.length ? (
                      <div className="mt-4 h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData}>
                            <CartesianGrid
                              stroke="#232a35"
                              strokeDasharray="4 4"
                              vertical={false}
                            />
                            <XAxis
                              dataKey="name"
                              tick={{ fill: "#667085", fontSize: 11 }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              tick={{ fill: "#667085", fontSize: 11 }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <Tooltip
                              contentStyle={{
                                background: "#141923",
                                border: "1px solid #303849",
                                borderRadius: 10,
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="wpm"
                              stroke="#7894ff"
                              fill="#6586ff22"
                            />
                            <Area
                              type="monotone"
                              dataKey="accuracy"
                              stroke="#43d6ae"
                              fill="#43d6ae15"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <Empty
                        icon={BarChart3}
                        title="No performance data yet"
                        text="Complete a lesson, practice session, or typing test to see your trends."
                      />
                    )}
                  </div>
                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <div className="panel p-5">
                      <h2 className="display font-semibold">
                        Practice calendar
                      </h2>
                      <p className="muted mt-1 text-xs">
                        Recent days with recorded practice
                      </p>
                      <div className="mt-4 grid grid-cols-7 gap-2">
                        {Array.from({ length: 28 }, (_, i) => {
                          const d = new Date();
                          d.setDate(d.getDate() - (27 - i));
                          const day = d.toISOString().slice(0, 10);
                          const count = progress.results.filter(
                            (r) => r.date.slice(0, 10) === day,
                          ).length;
                          return (
                            <div
                              key={day}
                              title={`${day}: ${count} sessions`}
                              className="aspect-square rounded-md border border-[#252b36]"
                              style={{
                                background: count
                                  ? "rgba(82,115,246," +
                                    Math.min(0.18 + count * 0.2, 0.85) +
                                    ")"
                                  : "#12161e",
                              }}
                            />
                          );
                        })}
                      </div>
                      <div className="muted mt-2 flex justify-between text-[10px]">
                        <span>28 days ago</span>
                        <span>Today</span>
                      </div>
                    </div>
                    <div className="panel p-5">
                      <h2 className="display font-semibold">
                        Finger performance
                      </h2>
                      <p className="muted mt-1 text-xs">
                        Accuracy from your typed keys
                      </p>
                      <div className="mt-4 space-y-3">
                        {Object.entries(fingerColors).map(([finger, color]) => {
                          const keys = Object.entries(progress.keys).filter(
                            ([k]) => fingerFor(k) === finger,
                          );
                          const total = keys.reduce(
                              (n, [, s]) => n + s.attempts,
                              0,
                            ),
                            correct = keys.reduce(
                              (n, [, s]) => n + s.correct,
                              0,
                            ),
                            acc = total
                              ? Math.round((correct / total) * 100)
                              : 0;
                          return (
                            <div
                              key={finger}
                              className="flex items-center gap-2 text-xs"
                            >
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ background: color }}
                              />
                              <span className="w-24 text-slate-400">
                                {finger
                                  .replace("Left ", "L. ")
                                  .replace("Right ", "R. ")}
                              </span>
                              <div className="h-1.5 flex-1 rounded bg-[#262d38]">
                                <div
                                  className="h-full rounded"
                                  style={{
                                    width: `${acc}%`,
                                    background: color,
                                  }}
                                />
                              </div>
                              <span className="w-9 text-right text-slate-400">
                                {total ? `${acc}%` : "—"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </>
              )}
              {section === "Settings" && (
                <>
                  <PageHeading
                    title="Settings"
                    subtitle="Tune your typing environment and training preferences."
                  />
                  <div className="grid gap-4 xl:grid-cols-2">
                    <SettingsCard title="Practice preferences" icon={Target}>
                      <SettingRow
                        label="Daily practice goal"
                        detail="Minutes of practice per day"
                      >
                        <select
                          className="setting-input"
                          value={progress.prefs.dailyGoal}
                          onChange={(e) =>
                            updatePref("dailyGoal", Number(e.target.value))
                          }
                        >
                          {[5, 10, 15, 20, 30, 45].map((x) => (
                            <option value={x} key={x}>
                              {x} min
                            </option>
                          ))}
                        </select>
                      </SettingRow>
                      <SettingRow
                        label="Lesson accuracy target"
                        detail="Required to complete a lesson"
                      >
                        <select
                          className="setting-input"
                          value={progress.prefs.accuracyTarget}
                          onChange={(e) =>
                            updatePref("accuracyTarget", Number(e.target.value))
                          }
                        >
                          {[85, 90, 92, 95, 98].map((x) => (
                            <option value={x} key={x}>
                              {x}%
                            </option>
                          ))}
                        </select>
                      </SettingRow>
                      <SettingRow
                        label="Default test length"
                        detail="Starting duration for timed tests"
                      >
                        <select
                          className="setting-input"
                          value={progress.prefs.duration}
                          onChange={(e) =>
                            updatePref("duration", Number(e.target.value))
                          }
                        >
                          {[15, 30, 60, 120, 300].map((x) => (
                            <option value={x} key={x}>
                              {x < 60 ? `${x} seconds` : `${x / 60} minutes`}
                            </option>
                          ))}
                        </select>
                      </SettingRow>
                    </SettingsCard>
                    <SettingsCard title="Keyboard & display" icon={Keyboard}>
                      <ToggleRow
                        label="Show virtual keyboard"
                        detail="Display the key layout during practice"
                        value={progress.prefs.showKeyboard}
                        onChange={(v) => updatePref("showKeyboard", v)}
                      />
                      <ToggleRow
                        label="Finger color hints"
                        detail="Use ten-finger colors on keycaps"
                        value={progress.prefs.colors}
                        onChange={(v) => updatePref("colors", v)}
                      />
                      <ToggleRow
                        label="Finger guidance"
                        detail="Show the hands and next finger"
                        value={progress.prefs.fingerHints}
                        onChange={(v) => updatePref("fingerHints", v)}
                      />
                      <ToggleRow
                        label="Light appearance"
                        detail="Use the lighter color theme"
                        value={progress.prefs.light}
                        onChange={(v) => updatePref("light", v)}
                      />
                      <ToggleRow
                        label="Reduce animation"
                        detail="Limit motion effects"
                        value={progress.prefs.reducedMotion}
                        onChange={(v) => updatePref("reducedMotion", v)}
                      />
                    </SettingsCard>
                    <SettingsCard title="Keyboard sound" icon={AudioLines}>
                      <ToggleRow
                        label="Mechanical key sounds"
                        detail="Sound begins after your first interaction"
                        value={progress.prefs.sound}
                        onChange={(v) => updatePref("sound", v)}
                      />
                      <SettingRow
                        label="Sound profile"
                        detail="Choose the character of your key clicks"
                      >
                        <select
                          className="setting-input"
                          value={progress.prefs.profile}
                          onChange={(e) =>
                            updatePref("profile", e.target.value)
                          }
                        >
                          {[
                            "Blue Switch",
                            "Red Switch",
                            "Brown Switch",
                            "Silent Keyboard",
                            "Typewriter",
                          ].map((x) => (
                            <option key={x}>{x}</option>
                          ))}
                        </select>
                      </SettingRow>
                      <SettingRow
                        label="Master volume"
                        detail={`${Math.round(progress.prefs.volume * 100)}%`}
                      >
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step=".05"
                          value={progress.prefs.volume}
                          onChange={(e) =>
                            updatePref("volume", Number(e.target.value))
                          }
                          className="w-28 accent-blue-500"
                        />
                      </SettingRow>
                      <button
                        className="btn mt-3"
                        onClick={() =>
                          playKey(
                            progress.prefs.profile,
                            progress.prefs.volume,
                            "a",
                          )
                        }
                      >
                        <Volume2 size={14} className="mr-2 inline" />
                        Preview sound
                      </button>
                    </SettingsCard>
                    <SettingsCard title="Your data" icon={ShieldCheck}>
                      <p className="muted text-sm leading-6">
                        Progress is stored in this browser using versioned local
                        storage. Your practice remains on this device and is
                        never sent to a server.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          className="btn"
                          onClick={() => {
                            const blob = new Blob(
                              [JSON.stringify(progress, null, 2)],
                              { type: "application/json" },
                            );
                            const a = document.createElement("a");
                            a.href = URL.createObjectURL(blob);
                            a.download = "typemaster-progress.json";
                            a.click();
                            URL.revokeObjectURL(a.href);
                          }}
                        >
                          Export progress
                        </button>
                        <button
                          className="btn"
                          onClick={() => {
                            if (
                              confirm(
                                "Reset all saved TypeMaster progress and preferences?",
                              )
                            ) {
                              localStorage.removeItem("typemaster-progress-v1");
                              localStorage.removeItem("typemaster-progress-v2");
                              setProgress(emptyProgress());
                            }
                          }}
                        >
                          Reset progress
                        </button>
                      </div>
                    </SettingsCard>
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
          <footer className="muted mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-[#202631] pt-4 text-[10px]">
  <div className="flex flex-col gap-1">
    <span>
      TypeMaster Academy · Learn with accuracy. Grow with practice.
    </span>
    <span>Developed by Abdul Khader Shifan</span>
    <a
      href="mailto:akshifan234@gmail.com"
      className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
      aria-label="Email Abdul Khader Shifan"
    >
      <Mail size={12} aria-hidden="true" />
      <span>akshifan234@gmail.com</span>
    </a>
  </div>
  <span>Data saved on this device · QWERTY layout</span>
</footer>
        </div>
      </main>
    </div>
  );
}

function PageHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <div className="mb-2 text-[10px] font-medium uppercase tracking-[.18em] text-blue-300">
        TYPEMASTER ACADEMY
      </div>
      <h1 className="display text-2xl font-semibold sm:text-3xl">{title}</h1>
      <p className="muted mt-2 text-sm">{subtitle}</p>
    </div>
  );
}
function Empty({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Target;
  title: string;
  text: string;
}) {
  return (
    <div className="grid min-h-[180px] place-items-center text-center">
      <div>
        <Icon className="mx-auto mb-3 text-slate-600" size={24} />
        <div className="text-sm text-slate-300">{title}</div>
        <p className="muted mx-auto mt-1 max-w-sm text-xs">{text}</p>
      </div>
    </div>
  );
}
function CoachCard({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Lightbulb;
  title: string;
  text: string;
}) {
  return (
    <div className="panel p-5">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-blue-500/10 text-blue-300">
          <Icon size={17} />
        </div>
        <h2 className="display text-sm font-semibold">{title}</h2>
      </div>
      <p className="muted mt-4 text-sm leading-6">{text}</p>
    </div>
  );
}
function HandIllustration({ active }: { active: string }) {
  const fingers = [
    "Left pinky",
    "Left ring",
    "Left middle",
    "Left index",
    "Thumbs",
    "Right index",
    "Right middle",
    "Right ring",
    "Right pinky",
  ];
  return (
    <div className="flex h-28 items-end justify-center gap-1 rounded-lg bg-[#10141b] px-2 pb-3 pt-2">
      {fingers.map((f, i) => (
        <div key={f} className="relative flex flex-col items-center">
          <div
            className={`hand-finger rounded-full border border-white/10 ${f === active ? "active" : ""}`}
            style={{
              height: `${i === 4 ? 33 : i === 3 || i === 5 ? 53 : i === 2 || i === 6 ? 49 : i === 1 || i === 7 ? 41 : 34}px`,
              width: i === 4 ? 17 : 14,
              background: `${fingerColors[f]}40`,
              color: fingerColors[f],
              borderColor: `${fingerColors[f]}90`,
              transform: i === 4 ? "rotate(-34deg) translateY(9px)" : undefined,
            }}
          />
          <div className="mt-2 h-5 w-5 rounded-full border border-[#39404d] bg-[#202630] text-center font-mono text-[8px] leading-5 text-slate-400">
            {["a", "s", "d", "f", " ", "j", "k", "l", ";"][i]}
          </div>
        </div>
      ))}
    </div>
  );
}
function KeyboardView({
  active,
  target,
  colors,
  onPress,
  compact = false,
}: {
  active: string;
  target: string;
  colors: boolean;
  onPress: (k: string) => void;
  compact?: boolean;
}) {
  const rows = compact ? keyboardRows.slice(1) : keyboardRows;
  const upperSymbols: Record<string, string> = {
    "`": "~",
    "1": "!",
    "2": "@",
    "3": "#",
    "4": "$",
    "5": "%",
    "6": "^",
    "7": "&",
    "8": "*",
    "9": "(",
    "0": ")",
    "-": "_",
    "=": "+",
  };
  return (
    <div className="kbd-scroll scrollbar">
      <div className="min-w-[780px] space-y-2">
        {rows.map((row, ri) => (
          <div key={ri} className="flex justify-center gap-1">
            {row.map((key, i) => {
              const special = key.length > 1;
              const cls =
                key === "Space"
                  ? "flex-[6]"
                  : special
                    ? key === "Backspace" || key === "Enter" || key === "Shift"
                      ? "flex-[1.8]"
                      : "flex-[1.25]"
                    : "flex-1";
              const shown =
                key === "Space"
                  ? ""
                  : key === "Backspace"
                    ? "⌫"
                    : key === "Caps"
                      ? "Caps"
                      : key === "Shift"
                        ? "⇧"
                        : key === "Enter"
                          ? "↵"
                          : key;
              const isSpace = key === "Space";
              const isActive = isSpace
                ? active === " "
                : active.toLowerCase() === key.toLowerCase() && (active || "");
              const isTarget = isSpace
                ? target === " "
                : key === "Enter" && target === "\n"
                  ? true
                  : key.toLowerCase() === target.toLowerCase();
              const finger =
                key.length === 1
                  ? fingerFor(key)
                  : key === "Space"
                    ? "Thumbs"
                    : undefined;
              return (
                <button
                  key={`${key}-${i}`}
                  className={`keycap ${cls} ${isActive ? "pressed" : ""} ${isTarget && target ? "target" : ""}`}
                  style={{
                    height: ri === 0 ? 35 : 41,
                    minWidth: 26,
                    position: "relative",
                    ...(colors && finger
                      ? { borderBottomColor: fingerColors[finger] }
                      : {}),
                  }}
                  onClick={() =>
                    onPress(
                      key === "Space"
                        ? " "
                        : key === "Backspace"
                          ? "Backspace"
                          : key,
                    )
                  }
                  title={finger ? `${key} · ${finger}` : key}
                >
                  {isTarget && target && finger && (
                    <span
                      className="finger-reach"
                      aria-hidden="true"
                      style={{ backgroundColor: fingerColors[finger] }}
                    />
                  )}
                  {compact && ri === 0 && upperSymbols[key] && (
                    <span className="block text-center text-[8px] leading-none opacity-75">
                      {upperSymbols[key]}
                    </span>
                  )}
                  <span className="block text-center text-[10px] sm:text-xs">
                    {shown}
                  </span>
                  {colors && finger && (
                    <span
                      className="mx-auto mt-1 block h-1 w-3 rounded-full"
                      style={{ background: fingerColors[finger] }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        ))}
        {!compact && (
          <div className="mt-3 flex justify-center gap-1">
            {[
              "Num",
              "/",
              "*",
              "-",
              "7",
              "8",
              "9",
              "+",
              "4",
              "5",
              "6",
              "1",
              "2",
              "3",
              "Enter",
              "0",
              ".",
            ].map((key, i) => (
              <button
                key={i}
                className="keycap min-w-[33px] px-2 py-2 text-[10px]"
              >
                {key}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
function SettingsCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Target;
  children: React.ReactNode;
}) {
  return (
    <div className="panel p-5">
      <div className="mb-3 flex items-center gap-2 border-b border-[#252b36] pb-3">
        <Icon size={16} className="text-blue-300" />
        <h2 className="display text-sm font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}
function SettingRow({
  label,
  detail,
  children,
}: {
  label: string;
  detail: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#202631] py-3 last:border-0">
      <div>
        <div className="text-xs">{label}</div>
        <div className="muted mt-1 text-[10px]">{detail}</div>
      </div>
      {children}
    </div>
  );
}
function ToggleRow({
  label,
  detail,
  value,
  onChange,
}: {
  label: string;
  detail: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#202631] py-3 last:border-0">
      <div>
        <div className="text-xs">{label}</div>
        <div className="muted mt-1 text-[10px]">{detail}</div>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative h-5 w-9 rounded-full transition ${value ? "bg-blue-500" : "bg-[#353c48]"}`}
        aria-label={`${label}: ${value ? "on" : "off"}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${value ? "left-[18px]" : "left-0.5"}`}
        />
      </button>
    </div>
  );
}
