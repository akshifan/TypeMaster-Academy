export type Section =
  | "Dashboard"
  | "Learning Path"
  | "Practice"
  | "Typing Test"
  | "Keyboard Simulator"
  | "Finger Training"
  | "Personal Coach"
  | "Weak Keys"
  | "Achievements"
  | "Analytics"
  | "Settings";
export type Result = {
  date: string;
  wpm: number;
  accuracy: number;
  minutes: number;
  correct: number;
  incorrect: number;
  mode: string;
};
export type KeyStat = {
  attempts: number;
  correct: number;
  time: number;
  last: string;
};
export type Lesson = {
  id: number;
  title: string;
  level: number;
  duration: number;
  text: string;
  focus: string;
  objective: string;
};
export type Preferences = {
  sound: boolean;
  profile: string;
  volume: number;
  speakWords: boolean;
  showKeyboard: boolean;
  fingerHints: boolean;
  colors: boolean;
  reducedMotion: boolean;
  light: boolean;
  dailyGoal: number;
  accuracyTarget: number;
  duration: number;
};
export type Progress = {
  version: number;
  xp: number;
  streak: number;
  lastDay: string;
  completed: number[];
  results: Result[];
  keys: Record<string, KeyStat>;
  prefs: Preferences;
  dailyMinutes: number;
  missions: Record<string, boolean>;
};
