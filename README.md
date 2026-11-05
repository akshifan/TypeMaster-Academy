# TypeMaster Academy

A local-first touch typing academy built with React, Vite, TypeScript, Tailwind CSS, Framer Motion, Lucide React, and Recharts. Practice data stays in your browser; no account or server is required.

## Requirements

- Node.js LTS
- npm
- Windows 10 or Windows 11 (also works in current desktop browsers on macOS and Linux)

## Install and run

```powershell
npm install
npm run dev
```

Open the local address shown by Vite. For a production build:

```powershell
npm run build
npm run preview
```

Run the included unit tests with `npm test`.

## Included features

- Eleven-section responsive academy interface with dashboard and lesson navigation.
- Four sequential levels with 48 distinct, focused lessons. Lessons can be repeated and completion uses the selected accuracy threshold.
- Beginner-first progression: lessons unlock one by one, and the next level becomes available only after every lesson in the current level is completed accurately.
- Physical keyboard practice and timed tests (15 seconds through five minutes), live character feedback, backspace correction, timer, WPM, CPM, and accuracy.
- Typing tests use randomized sentence sets or long paragraph sets, refresh the text on each run, and append fresh text if a typist reaches the end before the timer.
- Light, low-clutter typing simulator with a large passage, live character tracking, QWERTY keyboard, and a hand/finger overlay inspired by the supplied reference.
- Centered virtual keyboard directly below the typing passage, with animated key presses and a finger overlay that moves with the active key.
- Spoken word prompts at the start of practice and after each completed word, with an in-practice voice toggle (uses browser speech synthesis).
- Color-coded ten-finger guidance and full keyboard simulator.
- Web Audio switch profiles with a louder mechanical tone/click, volume control, and preview; audio initializes after the user's first interaction.
- Per-key attempts, accuracy, response-time tracking, weak-key practice, and deterministic coach suggestions.
- Local session history, speed and accuracy charts, practice calendar, daily goal, streak, XP, and activity-based achievements.
- Settings for appearance, sound, finger hints, keyboard visibility, lesson target, and daily goal. Progress can be exported or reset.

## Statistics and privacy

WPM is `(characters typed / 5) / elapsed minutes`. Gross WPM uses all currently entered characters; net WPM subtracts the WPM equivalent of incorrect characters. Accuracy is correct current characters divided by all current characters. Backspace removes the last current character before final statistics are recorded, so corrected errors are not included in the final error count. Keystroke-level weak-key tracking still records each initial key attempt. Results are saved in versioned LocalStorage under `typemaster-progress-v1` and remain on this browser/device.

## Current scope

The app is a single-device learning platform. QWERTY is implemented; other layouts, accounts/cloud sync, and cross-device history are not included. Sound is synthesized through Web Audio rather than bundled recordings. Mobile users can use on-screen controls; typing exercises are optimized for a physical keyboard.
