import type { Section } from "./types";

const pathBySection: Record<Section, string> = {
  Dashboard: "/dashboard",
  "Learning Path": "/learning-path",
  Practice: "/practice",
  "Typing Test": "/typing-test",
  "Keyboard Simulator": "/keyboard-simulator",
  "Finger Training": "/finger-training",
  "Personal Coach": "/personal-coach",
  "Weak Keys": "/weak-keys",
  Achievements: "/achievements",
  Analytics: "/analytics",
  Settings: "/settings",
};

const sectionByPath = Object.fromEntries(
  Object.entries(pathBySection).map(([section, path]) => [path, section]),
) as Record<string, Section>;

export function sectionFromPath(path: string): Section {
  return sectionByPath[path.replace(/\/$/, "") || "/dashboard"] ?? "Dashboard";
}

export function navigateToSection(section: Section): void {
  const path = pathBySection[section];
  if (window.location.pathname !== path) window.history.pushState({}, "", path);
}
